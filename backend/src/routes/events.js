import { Router } from 'express';
import prisma from '../prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// GET all events with checklists
router.get('/', authenticateToken, async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        checklist: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true, role: true }
            }
          },
          orderBy: { id: 'asc' }
        }
      },
      orderBy: { date: 'asc' },
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST a new event
router.post('/', authenticateToken, async (req, res) => {
  const { title, date, description, checklistItems } = req.body;

  if (!title || !date) {
    return res.status(400).json({ error: 'title and date are required' });
  }

  try {
    // We can optionally create checklist items in the same transaction
    const event = await prisma.event.create({
      data: {
        title,
        date: new Date(date),
        description,
        checklist: checklistItems && checklistItems.length > 0 ? {
          create: checklistItems.map(itemText => ({
            itemText,
          }))
        } : undefined
      },
      include: {
        checklist: true
      }
    });

    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update an event
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, date, description } = req.body;

  if (!title || !date) {
    return res.status(400).json({ error: 'title and date are required' });
  }

  try {
    const event = await prisma.event.update({
      where: { id },
      data: {
        title,
        date: new Date(date),
        description
      },
      include: {
        checklist: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true, role: true }
            }
          },
          orderBy: { id: 'asc' }
        }
      }
    });

    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE an event
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.event.delete({
      where: { id },
    });
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADD a checklist item to an event
router.post('/:eventId/checklist', authenticateToken, async (req, res) => {
  const { eventId } = req.params;
  const { itemText, assignedTo } = req.body;

  if (!itemText) {
    return res.status(400).json({ error: 'itemText is required' });
  }

  try {
    const checklistItem = await prisma.checklistItem.create({
      data: {
        eventId,
        itemText,
        assignedTo: assignedTo || null,
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true }
        }
      }
    });
    res.status(201).json(checklistItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE a checklist item (toggle completed, assign to user)
router.patch('/checklist/:itemId', authenticateToken, async (req, res) => {
  const { itemId } = req.params;
  const { isCompleted, assignedTo } = req.body;

  try {
    const updateData = {};
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo || null;

    const updatedItem = await prisma.checklistItem.update({
      where: { id: itemId },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, avatar: true }
        }
      }
    });

    res.json(updatedItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE a checklist item
router.delete('/checklist/:itemId', authenticateToken, async (req, res) => {
  const { itemId } = req.params;

  try {
    await prisma.checklistItem.delete({
      where: { id: itemId }
    });
    res.json({ message: 'Checklist item deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
