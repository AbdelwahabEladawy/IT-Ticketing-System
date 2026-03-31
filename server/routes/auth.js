import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { createAuditLog } from '../utils/auditLog.js';
import { markOnline } from '../services/presenceService.js';

const router = express.Router();
const prisma = new PrismaClient();

// Signup
router.post('/signup', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'USER'
      }
    });

    await createAuditLog('USER_SIGNUP', `User ${name} signed up`, user.id);

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Normalize email (express-validator already does this, but let's be safe)
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { specialization: true }
    });

    if (!user) {
      console.error(`Login failed: User not found - ${normalizedEmail}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      console.error(`Login failed: Invalid password for ${normalizedEmail}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await createAuditLog('USER_LOGIN', `User ${user.name} logged in`, user.id);
    await markOnline(user.id, null, true);

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        specialization: user.specialization,
        status: user.status,
        mustChangePassword: user.mustChangePassword,
        isOnline: true,
        preferredLocale: user.preferredLocale || 'en'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { specialization: true }
    });

    // Return only selected fields
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      specialization: user.specialization,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      isOnline: user.isOnline,
      createdAt: user.createdAt,
      preferredLocale: user.preferredLocale || 'en'
    };

    res.json({ user: userData });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch(
  '/locale',
  authenticate,
  [body('locale').isIn(['en', 'ar']).withMessage('locale must be en or ar')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { locale } = req.body;
      await prisma.user.update({
        where: { id: req.user.id },
        data: { preferredLocale: locale }
      });
      res.json({ preferredLocale: locale });
    } catch (error) {
      console.error('Locale update error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Force password change (used by bulk-imported accounts)
router.patch('/change-password', authenticate, [
  body('newPassword').trim().isLength({ min: 6 }).withMessage('New password must be at least 6 chars')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        password: hashedPassword,
        mustChangePassword: false
      },
      include: { specialization: true }
    });

    await createAuditLog(
      'USER_PASSWORD_CHANGED',
      `User ${updated.name} changed password (forced flow).`,
      updated.id
    );

    res.json({
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        specialization: updated.specialization,
        status: updated.status,
        mustChangePassword: updated.mustChangePassword,
        isOnline: updated.isOnline,
        preferredLocale: updated.preferredLocale || 'en'
      }
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

