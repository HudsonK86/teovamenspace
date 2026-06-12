import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import prisma from '../prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Helper: Sanitize and validate file path to prevent path traversal
function sanitizePath(baseDir, userPath) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedPath = path.resolve(baseDir, userPath);
  
  if (!resolvedPath.startsWith(resolvedBase)) {
    throw new Error('Invalid file path: Path traversal detected');
  }
  return resolvedPath;
}

// Ensure uploads folder exists for local fallback
const UPLOADS_DIR = './uploads';
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer in-memory storage (used for both S3 & local upload flows)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
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

// S3 Client configuration
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

// Helper: Handle file upload and return URL
async function handleFileUpload(file) {
  const fileExt = path.extname(file.originalname).toLowerCase();
  const fileName = `couple-${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;

  if (s3Configured && s3Client) {
    try {
      const uploader = new Upload({
        client: s3Client,
        params: {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: `couple/${fileName}`,
          Body: file.buffer,
          ContentType: file.mimetype,
        },
      });
      await uploader.done();
      return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/couple/${fileName}`;
    } catch (err) {
      console.error('S3 upload failed, falling back to local storage:', err);
    }
  }

  // Local filesystem fallback
  const localPath = path.join(UPLOADS_DIR, fileName);
  fs.writeFileSync(localPath, file.buffer);
  
  return `/uploads/${fileName}`;
}

// Get or initialize couple settings
async function getOrInitCoupleSettings() {
  let settings = await prisma.coupleSettings.findFirst();
  if (!settings) {
    // Set a sensible default anniversary start date (e.g. 1 year ago, or current date)
    const defaultDate = new Date();
    defaultDate.setFullYear(defaultDate.getFullYear() - 1); // default to 1 year ago
    
    settings = await prisma.coupleSettings.create({
      data: {
        startDate: defaultDate,
        pictures: []
      }
    });
  }
  return settings;
}

// GET couple settings
router.get('/', authenticateToken, async (req, res) => {
  try {
    const settings = await getOrInitCoupleSettings();
    res.json(settings);
  } catch (error) {
    console.error('GET couple settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper to parse date string robustly (supports YYYY-MM-DD, DD/MM/YYYY, ISO, etc.)
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // Try standard ISO parsing first
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  // Try parsing DD/MM/YYYY or DD-MM-YYYY
  const dmRef = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmRef) {
    const day = parseInt(dmRef[1], 10);
    const month = parseInt(dmRef[2], 10) - 1; // 0-indexed
    const year = parseInt(dmRef[3], 10);
    // Use UTC or local depending on intention. Since we store dates timezone-agnostically, 
    // we instantiate as UTC to align with ISO date format.
    date = new Date(Date.UTC(year, month, day));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Try parsing YYYY/MM/DD or YYYY-MM-DD manually
  const ymRef = dateStr.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymRef) {
    const year = parseInt(ymRef[1], 10);
    const month = parseInt(ymRef[2], 10) - 1; // 0-indexed
    const day = parseInt(ymRef[3], 10);
    date = new Date(Date.UTC(year, month, day));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  return null;
}

// PUT update couple start date
router.put('/', authenticateToken, async (req, res) => {
  const { startDate } = req.body;
  if (!startDate) {
    return res.status(400).json({ error: 'startDate is required' });
  }

  const parsedDate = parseDate(startDate);
  if (!parsedDate) {
    return res.status(400).json({ error: 'Invalid date format. Please use YYYY-MM-DD or DD/MM/YYYY.' });
  }

  try {
    const settings = await getOrInitCoupleSettings();
    const updated = await prisma.coupleSettings.update({
      where: { id: settings.id },
      data: {
        startDate: parsedDate
      }
    });
    res.json(updated);
  } catch (error) {
    console.error('PUT couple settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST upload couple pictures (supports multiple files)
router.post('/pictures', authenticateToken, upload.any(), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No image files uploaded' });
  }

  try {
    const settings = await getOrInitCoupleSettings();
    const uploadedUrls = [];
    
    for (const file of req.files) {
      const url = await handleFileUpload(file);
      uploadedUrls.push(url);
    }
    
    const updatedPictures = [...settings.pictures, ...uploadedUrls];
    
    const updated = await prisma.coupleSettings.update({
      where: { id: settings.id },
      data: {
        pictures: updatedPictures
      }
    });
    
    res.status(201).json(updated);
  } catch (error) {
    console.error('POST couple pictures error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE couple picture
router.delete('/pictures', authenticateToken, async (req, res) => {
  // Can be passed in body or query params
  const url = req.body.url || req.query.url;
  
  if (!url) {
    return res.status(400).json({ error: 'url is required to delete picture' });
  }

  try {
    const settings = await getOrInitCoupleSettings();
    if (!settings.pictures.includes(url)) {
      return res.status(404).json({ error: 'Picture not found in settings' });
    }

    const updatedPictures = settings.pictures.filter(pic => pic !== url);
    
    const updated = await prisma.coupleSettings.update({
      where: { id: settings.id },
      data: {
        pictures: updatedPictures
      }
    });

    // Clean up local file if stored locally (with path traversal protection)
    if (url.startsWith('/uploads/')) {
      try {
        const localFilePath = sanitizePath('.', url);
        if (fs.existsSync(localFilePath)) {
          fs.unlinkSync(localFilePath);
        }
      } catch (err) {
        console.error('Path traversal blocked or file delete failed:', err.message);
      }
    }

    res.json(updated);
  } catch (error) {
    console.error('DELETE couple pictures error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
