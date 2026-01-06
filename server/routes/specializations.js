import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, checkPermission } from '../middleware/auth.js';
import { createAuditLog } from '../utils/auditLog.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all specializations
router.get('/', authenticate, async (req, res) => {
  try {
    const specializations = await prisma.specialization.findMany({
      include: {
        _count: {
          select: {
            technicians: true,
            tickets: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ specializations });
  } catch (error) {
    console.error('Get specializations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create specialization (IT Manager and Super Admin only)
router.post('/', authenticate, authorize('IT_MANAGER', 'SUPER_ADMIN'), [
  body('name').trim().notEmpty(),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;

    const existing = await prisma.specialization.findUnique({
      where: { name }
    });

    if (existing) {
      return res.status(400).json({ error: 'Specialization already exists' });
    }

    const specialization = await prisma.specialization.create({
      data: { name, description }
    });

    await createAuditLog(
      'SPECIALIZATION_CREATED',
      `Specialization ${name} created by ${req.user.name}`,
      req.user.id,
      null,
      { specializationId: specialization.id }
    );

    res.status(201).json({ specialization });
  } catch (error) {
    console.error('Create specialization error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update specialization (IT Manager and Super Admin only)
router.patch('/:id', authenticate, authorize('IT_MANAGER', 'SUPER_ADMIN'), [
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const specialization = await prisma.specialization.findUnique({
      where: { id: req.params.id }
    });

    if (!specialization) {
      return res.status(404).json({ error: 'Specialization not found' });
    }

    const updateData = {};
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.description !== undefined) updateData.description = req.body.description;

    const updated = await prisma.specialization.update({
      where: { id: req.params.id },
      data: updateData
    });

    await createAuditLog(
      'SPECIALIZATION_UPDATED',
      `Specialization ${updated.name} updated by ${req.user.name}`,
      req.user.id,
      null,
      { specializationId: updated.id }
    );

    res.json({ specialization: updated });
  } catch (error) {
    console.error('Update specialization error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

