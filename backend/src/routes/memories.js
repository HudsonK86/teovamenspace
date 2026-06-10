import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import prisma from '../prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Ensure uploads folder exists for local fallback
const UPLOADS_DIR = './uploads';
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer in-memory storage (used for both S3 & local upload flows)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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
  const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;

  if (s3Configured && s3Client) {
    try {
      const uploader = new Upload({
        client: s3Client,
        params: {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: `memories/${fileName}`,
          Body: file.buffer,
          ContentType: file.mimetype,
        },
      });
      await uploader.done();
      return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/memories/${fileName}`;
    } catch (err) {
      console.error('S3 upload failed, falling back to local storage:', err);
    }
  }

  // Local filesystem fallback
  const localPath = path.join(UPLOADS_DIR, fileName);
  fs.writeFileSync(localPath, file.buffer);
  
  // Return local URL (relative to server backend url)
  return `/uploads/${fileName}`;
}

// GET all memories
router.get('/', authenticateToken, async (req, res) => {
  try {
    const memories = await prisma.memory.findMany({
      include: {
        author: {
          select: { id: true, name: true, avatar: true, role: true },
        },
        images: true,
      },
      orderBy: { date: 'desc' },
    });
    res.json(memories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST a new memory (with optional multiple image uploads)
router.post('/', authenticateToken, upload.array('images', 10), async (req, res) => {
  const { title, description, date } = req.body;
  const authorId = req.user.id;

  if (!title || !date) {
    return res.status(400).json({ error: 'title and date are required' });
  }

  try {
    const uploadedUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await handleFileUpload(file);
        uploadedUrls.push(url);
      }
    }

    const firstImageUrl = uploadedUrls.length > 0 ? uploadedUrls[0] : null;

    const memory = await prisma.memory.create({
      data: {
        title,
        description,
        date: new Date(date),
        imageUrl: firstImageUrl,
        authorId,
        images: {
          create: uploadedUrls.map(url => ({ url }))
        }
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true, role: true },
        },
        images: true
      },
    });

    res.status(201).json(memory);
  } catch (error) {
    console.error('Create memory error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT/edit a memory
router.put('/:id', authenticateToken, upload.array('images', 10), async (req, res) => {
  const { id } = req.params;
  const { title, description, date } = req.body;

  if (!title || !date) {
    return res.status(400).json({ error: 'title and date are required' });
  }

  try {
    const memory = await prisma.memory.findUnique({
      where: { id },
      include: { images: true }
    });

    if (!memory) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    // Parse existingImageIds that the client wants to keep
    let existingImageIds = null;
    if (req.body.existingImageIds !== undefined) {
      try {
        existingImageIds = JSON.parse(req.body.existingImageIds);
      } catch (e) {
        if (Array.isArray(req.body.existingImageIds)) {
          existingImageIds = req.body.existingImageIds;
        } else {
          existingImageIds = [req.body.existingImageIds];
        }
      }
    }

    // Determine images to delete if existingImageIds is provided
    if (existingImageIds !== null) {
      const imagesToDelete = memory.images.filter(img => !existingImageIds.includes(img.id));

      // Delete removed images from database and filesystem
      if (imagesToDelete.length > 0) {
        await prisma.memoryImage.deleteMany({
          where: {
            id: { in: imagesToDelete.map(img => img.id) }
          }
        });

        for (const img of imagesToDelete) {
          if (img.url && img.url.startsWith('/uploads/')) {
            const localFilePath = path.join('.', img.url);
            if (fs.existsSync(localFilePath)) {
              fs.unlinkSync(localFilePath);
            }
          }
        }
      }
    }

    // Handle new file uploads
    const uploadedUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await handleFileUpload(file);
        uploadedUrls.push(url);
      }
    }

    // Calculate new imageUrl
    const remainingImages = existingImageIds !== null
      ? memory.images.filter(img => existingImageIds.includes(img.id))
      : memory.images;
    const allImagesAfterUpdate = [
      ...remainingImages.map(img => img.url),
      ...uploadedUrls
    ];
    const firstImageUrl = allImagesAfterUpdate.length > 0 ? allImagesAfterUpdate[0] : null;

    // Update memory details
    const updatedMemory = await prisma.memory.update({
      where: { id },
      data: {
        title,
        description,
        date: new Date(date),
        imageUrl: firstImageUrl,
        images: {
          create: uploadedUrls.map(url => ({ url }))
        }
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true, role: true },
        },
        images: true
      }
    });

    res.json(updatedMemory);
  } catch (error) {
    console.error('Update memory error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE a memory
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const memory = await prisma.memory.findUnique({
      where: { id },
      include: { images: true }
    });

    if (!memory) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    await prisma.memory.delete({
      where: { id },
    });

    // Clean up local files if they exist
    const allImageUrls = [...(memory.images.map(img => img.url) || [])];
    if (memory.imageUrl && !allImageUrls.includes(memory.imageUrl)) {
      allImageUrls.push(memory.imageUrl);
    }

    for (const url of allImageUrls) {
      if (url && url.startsWith('/uploads/')) {
        const localFilePath = path.join('.', url);
        if (fs.existsSync(localFilePath)) {
          fs.unlinkSync(localFilePath);
        }
      }
    }

    res.json({ message: 'Memory deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
