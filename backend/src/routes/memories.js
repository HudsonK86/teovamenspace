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
  const relativePath = userPath.startsWith('/') ? userPath.slice(1) : userPath;
  const resolvedBase = path.resolve(baseDir);
  const resolvedPath = path.resolve(resolvedBase, relativePath);
  
  if (!resolvedPath.startsWith(resolvedBase)) {
    throw new Error('Invalid file path: Path traversal detected');
  }
  return resolvedPath;
}
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
        images: { orderBy: { createdAt: 'asc' } },
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
        images: { orderBy: { createdAt: 'asc' } }
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
  const userId = req.user.id;

  if (!title || !date) {
    return res.status(400).json({ error: 'title and date are required' });
  }

  try {
    const memory = await prisma.memory.findUnique({
      where: { id },
      include: { images: { orderBy: { createdAt: 'asc' } } }
    });

    if (!memory) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    // Parse existingImageIds that the client wants to keep (robust implementation)
    let existingImageIds = null;
    if (req.body.existingImageIds !== undefined && req.body.existingImageIds !== null) {
      const rawValue = req.body.existingImageIds;
      if (Array.isArray(rawValue)) {
        existingImageIds = rawValue;
      } else if (typeof rawValue === 'string') {
        const trimmed = rawValue.trim();
        if (trimmed) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              existingImageIds = parsed;
            } else if (typeof parsed === 'string') {
              try {
                const doubleParsed = JSON.parse(parsed);
                if (Array.isArray(doubleParsed)) {
                  existingImageIds = doubleParsed;
                } else {
                  existingImageIds = [parsed];
                }
              } catch {
                existingImageIds = [parsed];
              }
            } else {
              existingImageIds = [String(parsed)];
            }
          } catch (e) {
            if (trimmed.includes(',')) {
              existingImageIds = trimmed.split(',').map(s => s.trim()).filter(Boolean);
            } else {
              existingImageIds = [trimmed];
            }
          }
        } else {
          existingImageIds = [];
        }
      } else {
        existingImageIds = [String(rawValue)];
      }
    }

    // Determine the images to keep in their exact new order
    const imagesToKeep = existingImageIds !== null
      ? existingImageIds.map(imgId => memory.images.find(img => img.id === imgId)).filter(Boolean)
      : memory.images;

    // Identify images to delete from disk (present in memory.images but NOT in imagesToKeep)
    const keptUrls = imagesToKeep.map(img => img.url);
    const imagesToDelete = memory.images.filter(img => !keptUrls.includes(img.url));

    // Delete those from disk
    for (const img of imagesToDelete) {
      if (img.url && img.url.startsWith('/uploads/')) {
        try {
          const localFilePath = sanitizePath('.', img.url);
          if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
          }
        } catch (err) {
          console.error('Path traversal blocked or file delete failed:', err.message);
        }
      }
    }

    // Delete ALL image records for this memory from database
    await prisma.memoryImage.deleteMany({ where: { memoryId: id } });

    // Handle new file uploads
    const uploadedUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await handleFileUpload(file);
        uploadedUrls.push(url);
      }
    }

    // Build final list of urls in the exact new order
    const finalUrls = [
      ...imagesToKeep.map(img => img.url),
      ...uploadedUrls
    ];
    const firstImageUrl = finalUrls.length > 0 ? finalUrls[0] : null;

    // Update memory details and recreate image records in the exact order
    const updatedMemory = await prisma.memory.update({
      where: { id },
      data: {
        title,
        description,
        date: new Date(date),
        imageUrl: firstImageUrl,
        images: {
          create: finalUrls.map(url => ({ url }))
        }
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true, role: true },
        },
        images: {
          orderBy: { createdAt: 'asc' }
        }
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
      include: { images: { orderBy: { createdAt: 'asc' } } }
    });

    if (!memory) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    // For shared couple memories, we allow both partners to delete
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
        try {
          const localFilePath = sanitizePath('.', url);
          if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
          }
        } catch (err) {
          console.error('Path traversal blocked or file delete failed:', err.message);
        }
      }
    }

    res.json({ message: 'Memory deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
