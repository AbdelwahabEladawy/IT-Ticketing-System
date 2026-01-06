import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get user notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const { unread } = req.query;

    const where = { userId: req.user.id };
    if (unread === 'true') {
      where.read = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark notification as read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id }
    });

    if (!notification || notification.userId !== req.user.id) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true }
    });

    res.json({ notification: updated });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark all as read
router.patch('/read-all', authenticate, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true }
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

