import { Router } from 'express';
import prisma from '../prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Helper to parse date strings robustly
function parseDate(dateStr) {
  if (!dateStr) return new Date();
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  // Try parsing DD/MM/YYYY or DD-MM-YYYY
  const dmRef = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmRef) {
    const day = parseInt(dmRef[1], 10);
    const month = parseInt(dmRef[2], 10) - 1; // 0-indexed
    const year = parseInt(dmRef[3], 10);
    const dateParsed = new Date(Date.UTC(year, month, day));
    if (!isNaN(dateParsed.getTime())) {
      return dateParsed;
    }
  }
  return new Date();
}

// GET all diary entries
router.get('/', authenticateToken, async (req, res) => {
  try {
    const entries = await prisma.diary.findMany({
      include: {
        author: {
          select: { id: true, name: true, avatar: true, role: true },
        },
      },
      orderBy: { date: 'desc' },
    });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST a new diary entry
router.post('/', authenticateToken, async (req, res) => {
  const { title, content, date } = req.body;
  const authorId = req.user.id;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  try {
    const entry = await prisma.diary.create({
      data: {
        title,
        content,
        date: parseDate(date),
        authorId,
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true, role: true },
        },
      },
    });

    res.status(201).json(entry);
  } catch (error) {
    console.error('Create diary entry error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT/edit a diary entry
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, content, date } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  try {
    const entry = await prisma.diary.findUnique({
      where: { id },
    });

    if (!entry) {
      return res.status(404).json({ error: 'Diary entry not found' });
    }

    // Both partners can edit entries in their private shared space
    const updatedEntry = await prisma.diary.update({
      where: { id },
      data: {
        title,
        content,
        date: parseDate(date),
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true, role: true },
        },
      },
    });

    res.json(updatedEntry);
  } catch (error) {
    console.error('Update diary entry error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE a diary entry
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const entry = await prisma.diary.findUnique({
      where: { id },
    });

    if (!entry) {
      return res.status(404).json({ error: 'Diary entry not found' });
    }

    await prisma.diary.delete({
      where: { id },
    });

    res.json({ message: 'Diary entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
