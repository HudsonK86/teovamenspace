import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import prisma from '../prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Setup multer for avatar photo uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  },
});

const s3Configured = 
  process.env.AWS_ACCESS_KEY_ID && 
  process.env.AWS_SECRET_ACCESS_KEY && 
  process.env.AWS_S3_BUCKET_NAME &&
  !process.env.AWS_ACCESS_KEY_ID.startsWith('YOUR_');

let s3Client = null;
if (s3Configured) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

// Upload file helper
async function handleAvatarUpload(file) {
  const fileExt = path.extname(file.originalname).toLowerCase();
  const fileName = `avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;

  if (s3Configured && s3Client) {
    try {
      const uploader = new Upload({
        client: s3Client,
        params: {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: `avatars/${fileName}`,
          Body: file.buffer,
          ContentType: file.mimetype,
        },
      });
      await uploader.done();
      return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/avatars/${fileName}`;
    } catch (err) {
      console.error('S3 avatar upload failed, falling back to local:', err);
    }
  }

  // Local filesystem fallback
  const UPLOADS_DIR = './uploads';
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  const localPath = path.join(UPLOADS_DIR, fileName);
  fs.writeFileSync(localPath, file.buffer);
  return `/uploads/${fileName}`;
}
// JWT_SECRET is validated at startup by middleware/auth.js — reuse the same var here
if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set. Refusing to start.');
}
const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Helper to generate JWT
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Helper to assign partner role (max 2 users)
async function getOrAssignRole(email) {
  // 1. Strict whitelist check if ALLOWED_EMAILS environment variable is set
  const allowedEmailsStr = process.env.ALLOWED_EMAILS;
  if (allowedEmailsStr) {
    const allowed = allowedEmailsStr.split(',').map(e => e.trim().toLowerCase());
    if (!allowed.includes(email.toLowerCase())) {
      throw new Error('Access denied: This email is not authorized for this private space.');
    }
  }

  // 2. Strict limit of maximum 2 users
  const usersCount = await prisma.user.count();
  if (usersCount === 0) {
    return 'partner_1';
  } else if (usersCount === 1) {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst();
    if (existingUser.email === email) {
      return existingUser.role;
    }
    return 'partner_2';
  } else {
    // Check if the user is already one of the two registered partners
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return existing.role;
    }
    throw new Error('Access denied: This is a private app capped at two partners.');
  }
}

// Google Login Route
router.post('/google', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: 'idToken is required' });
  }

  try {
    let payload;
    
    // In local development, if client id is not configured, we allow mock parsing or error gracefully
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.startsWith('YOUR_GOOGLE_CLIENT_ID')) {
      return res.status(400).json({ 
        error: 'Google Client ID is not configured on the backend. Please use Mock Login for testing.' 
      });
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();

    const { email, name, picture, sub: googleId } = payload;

    let role;
    try {
      role = await getOrAssignRole(email);
    } catch (err) {
      return res.status(403).json({ error: err.message });
    }

    let user = await prisma.user.findUnique({ where: { googleId } });
    if (!user) {
      // Fallback check by email to handle transitioning from mock login to Google login
      const existingUserByEmail = await prisma.user.findUnique({ where: { email } });
      if (existingUserByEmail) {
        user = await prisma.user.update({
          where: { id: existingUserByEmail.id },
          data: { googleId, name, avatar: picture }
        });
      } else {
        user = await prisma.user.create({
          data: {
            email,
            name,
            avatar: picture,
            googleId,
            role,
          },
        });
      }
    } else {
      // Update avatar/name if changed
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name, avatar: picture },
      });
    }

    const token = generateToken(user);
    res.json({ token, user });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// Mock Login Route (local testing ONLY — disabled in production)
router.post('/mock', async (req, res) => {
  // Block this endpoint entirely in production to prevent bypass of real Google auth
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  const { email, name, role } = req.body; // e.g. "partner_1" or "partner_2"

  if (!email || !name || !role) {
    return res.status(400).json({ error: 'email, name, and role are required' });
  }

  try {
    const allowedEmailsStr = process.env.ALLOWED_EMAILS;
    if (allowedEmailsStr) {
      const allowed = allowedEmailsStr.split(',').map(e => e.trim().toLowerCase());
      if (!allowed.includes(email.toLowerCase())) {
        return res.status(403).json({ error: 'Access denied: This email is not authorized.' });
      }
    }

    const googleId = `mock-google-id-${email}`;
    const avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`;

    let user = await prisma.user.findUnique({ where: { googleId } });
    if (!user) {
      // Double check the database user limit (max 2)
      const count = await prisma.user.count();
      if (count >= 2 && !await prisma.user.findUnique({ where: { email } })) {
        return res.status(403).json({ error: 'Private space is full! (Max 2 users)' });
      }

      user = await prisma.user.create({
        data: {
          email,
          name,
          avatar,
          googleId,
          role,
        },
      });
    }

    const token = generateToken(user);
    res.json({ token, user });
  } catch (error) {
    console.error('Mock Login Error:', error);
    res.status(500).json({ error: 'Mock login failed' });
  }
});

// Get Current User Profile info
router.get('/me', async (req, res) => {
  // If authorization header matches mock or auth middleware passed
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Get both partner profiles (for widgets, showing avatars, names, etc.)
// Requires authentication — partner info should not be publicly readable
router.get('/partners', authenticateToken, async (req, res) => {
  try {
    const partners = await prisma.user.findMany({
      orderBy: { role: 'asc' }
    });
    res.json(partners);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/avatar (Update current user avatar)
router.post('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }

  try {
    const avatarUrl = await handleAvatarUpload(req.file);

    // Update user in DB
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: avatarUrl }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/auth/profile (Update current user profile name)
router.patch('/profile', authenticateToken, async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { name: name.trim() }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
