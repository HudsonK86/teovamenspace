import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import prisma from '../prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Setup multer for wishlist image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
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
async function handleFileUpload(file) {
  const fileExt = path.extname(file.originalname).toLowerCase();
  const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;

  if (s3Configured && s3Client) {
    try {
      const uploader = new Upload({
        client: s3Client,
        params: {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: `wishlist/${fileName}`,
          Body: file.buffer,
          ContentType: file.mimetype,
        },
      });
      await uploader.done();
      return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/wishlist/${fileName}`;
    } catch (err) {
      console.error('S3 upload failed, falling back to local:', err);
    }
  }

  // Fallback local filesystem
  const UPLOADS_DIR = './uploads';
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  const localPath = path.join(UPLOADS_DIR, fileName);
  fs.writeFileSync(localPath, file.buffer);
  return `/uploads/${fileName}`;
}

// GET all wishlist items
router.get('/', authenticateToken, async (req, res) => {
  try {
    const items = await prisma.wishlistItem.findMany({
      include: {
        owner: {
          select: { id: true, name: true, avatar: true, role: true }
        },
        boughtBy: {
          select: { id: true, name: true, avatar: true, role: true }
        },
        images: true
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST a new wishlist item (with optional multiple image uploads)
router.post('/', authenticateToken, upload.array('images', 10), async (req, res) => {
  const { title, description, price, url, currency, priority } = req.body;
  const ownerId = req.user.id;

  if (!title) {
    return res.status(400).json({ error: 'title is required' });
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
    const parsedPrice = price ? parseFloat(price) : null;
    const parsedPriority = priority ? parseInt(priority) : 5;

    const item = await prisma.wishlistItem.create({
      data: {
        title,
        description,
        price: parsedPrice,
        currency: currency || 'USD',
        priority: parsedPriority,
        url,
        imageUrl: firstImageUrl,
        ownerId,
        images: {
          create: uploadedUrls.map(url => ({ url }))
        }
      },
      include: {
        owner: {
          select: { id: true, name: true, avatar: true }
        },
        images: true
      }
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Create wishlist item error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH a wishlist item (e.g. mark as purchased or edit details)
router.patch('/:id', authenticateToken, upload.array('images', 10), async (req, res) => {
  const { id } = req.params;
  const { isPurchased, title, description, price, url, currency, priority } = req.body;
  const userId = req.user.id;

  try {
    const item = await prisma.wishlistItem.findUnique({
      where: { id },
      include: { images: true }
    });

    if (!item) {
      return res.status(404).json({ error: 'Wishlist item not found' });
    }

    // If it's already purchased, prevent modifying details (unless toggling purchase status itself)
    if (item.isPurchased) {
      const isModifyingDetails = title !== undefined || description !== undefined || price !== undefined || url !== undefined || currency !== undefined || priority !== undefined;
      if (isModifyingDetails) {
        return res.status(400).json({ error: 'Cannot edit details of a purchased wishlist item' });
      }
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
      const imagesToDelete = item.images.filter(img => !existingImageIds.includes(img.id));

      if (imagesToDelete.length > 0) {
        await prisma.wishlistImage.deleteMany({
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
      ? item.images.filter(img => existingImageIds.includes(img.id))
      : item.images;
    const allImagesAfterUpdate = [
      ...remainingImages.map(img => img.url),
      ...uploadedUrls
    ];
    const firstImageUrl = allImagesAfterUpdate.length > 0 ? allImagesAfterUpdate[0] : null;

    const updateData = {};

    // If marking as purchased
    if (isPurchased !== undefined) {
      const isPurchasedBool = isPurchased === 'true' || isPurchased === true;
      updateData.isPurchased = isPurchasedBool;
      updateData.boughtById = isPurchasedBool ? userId : null;
    }

    // Owner can edit other details
    if (item.ownerId === userId) {
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (price !== undefined) {
        updateData.price = (price === '' || price === null || price === 'null') ? null : parseFloat(price);
      }
      if (currency !== undefined) updateData.currency = currency;
      if (priority !== undefined) {
        updateData.priority = priority ? parseInt(priority) : 5;
      }
      if (url !== undefined) updateData.url = url;

      // Update imageUrl and images relation
      updateData.imageUrl = firstImageUrl;
      updateData.images = {
        create: uploadedUrls.map(url => ({ url }))
      };
    }

    const updatedItem = await prisma.wishlistItem.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: { id: true, name: true, avatar: true, role: true }
        },
        boughtBy: {
          select: { id: true, name: true, avatar: true, role: true }
        },
        images: true
      }
    });

    res.json(updatedItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a wishlist item
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const item = await prisma.wishlistItem.findUnique({
      where: { id },
      include: { images: true }
    });

    if (!item) {
      return res.status(404).json({ error: 'Wishlist item not found' });
    }

    // Only allow the owner of the item to delete it from their wishlist
    if (item.ownerId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own wishlist items' });
    }

    if (item.isPurchased) {
      return res.status(400).json({ error: 'Cannot delete a purchased wishlist item' });
    }

    await prisma.wishlistItem.delete({
      where: { id },
    });

    // Clean up local files if they exist
    const allImageUrls = [...(item.images.map(img => img.url) || [])];
    if (item.imageUrl && !allImageUrls.includes(item.imageUrl)) {
      allImageUrls.push(item.imageUrl);
    }

    for (const url of allImageUrls) {
      if (url && url.startsWith('/uploads/')) {
        const localFilePath = path.join('.', url);
        if (fs.existsSync(localFilePath)) {
          fs.unlinkSync(localFilePath);
        }
      }
    }

    res.json({ message: 'Wishlist item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
