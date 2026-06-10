import { Router } from 'express';
import prisma from '../prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Get all preferences for side-by-side view
router.get('/', authenticateToken, async (req, res) => {
  try {
    const preferences = await prisma.preference.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(preferences);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create or update a preference
router.post('/', authenticateToken, async (req, res) => {
  const { category, item, value } = req.body;
  const userId = req.user.id;

  if (!category || !item || !value) {
    return res.status(400).json({ error: 'category, item, and value are required' });
  }

  try {
    // Check if the preference item already exists for this user in this category
    const existing = await prisma.preference.findFirst({
      where: {
        userId,
        category,
        item,
      },
    });

    let preference;
    if (existing) {
      // Update
      preference = await prisma.preference.update({
        where: { id: existing.id },
        data: { value },
      });
    } else {
      // Create
      preference = await prisma.preference.create({
        data: {
          userId,
          category,
          item,
          value,
        },
      });
    }

    res.status(201).json(preference);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update preference
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { category, item, value } = req.body;
  const userId = req.user.id;

  if (!category || !item || !value) {
    return res.status(400).json({ error: 'category, item, and value are required' });
  }

  try {
    const preference = await prisma.preference.findUnique({
      where: { id },
    });

    if (!preference) {
      return res.status(404).json({ error: 'Preference not found' });
    }

    if (preference.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this preference' });
    }

    const updated = await prisma.preference.update({
      where: { id },
      data: { category, item, value },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete preference
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const preference = await prisma.preference.findUnique({
      where: { id },
    });

    if (!preference) {
      return res.status(404).json({ error: 'Preference not found' });
    }

    if (preference.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this preference' });
    }

    await prisma.preference.delete({
      where: { id },
    });

    res.json({ message: 'Preference deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
