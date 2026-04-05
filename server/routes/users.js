import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth.js';
import { createAuditLog } from '../utils/auditLog.js';
import multer from 'multer';
import * as XLSX from 'xlsx';

const router = express.Router();
const prisma = new PrismaClient();
const ELEVATED_ROLES = new Set([
  'TECHNICIAN',
  'IT_ADMIN',
  'IT_MANAGER',
  'SUPER_ADMIN',
  'SOFTWARE_ENGINEER'
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Get all users
router.get('/', authenticate, authorize('IT_MANAGER', 'IT_ADMIN', 'SUPER_ADMIN', 'HELP_DESK', 'TECHNICIAN', 'SOFTWARE_ENGINEER'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        isOnline: true,
        lastSeenAt: true,
        specialization: true,
        createdAt: true,
        _count: {
          select: {
            assignedTickets: true,
          },
        },
      }
    });

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get technicians (for assignment)
// Includes both TECHNICIAN role and IT_ADMIN role (as they can also handle tickets)
router.get('/technicians', authenticate, async (req, res) => {
  try {
    const { specializationId } = req.query;

    const where = {
      role: { in: ['TECHNICIAN', 'IT_ADMIN'] } // Include both TECHNICIAN and IT_ADMIN
    };

    if (specializationId) {
      where.specializationId = specializationId;
    }

    const technicians = await prisma.user.findMany({
      where,
      include: {
        specialization: true,
        _count: {
          select: {
            assignedTickets: {
              where: {
                status: { not: 'CLOSED' }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc' // Order by newest first
      }
    });

    console.log(`📋 GET /users/technicians - Found ${technicians.length} technicians`);
    if (technicians.length > 0) {
      technicians.forEach((tech, index) => {
        console.log(`  ${index + 1}. ${tech.name} (${tech.email})`);
        console.log(`     Specialization: ${tech.specialization?.name || 'No specialization'}`);
        console.log(`     Status: ${tech.status || 'N/A'}`);
        console.log(`     Presence: ${tech.isOnline ? 'ONLINE' : 'OFFLINE'}`);
        console.log(`     Active Tickets: ${tech._count?.assignedTickets || 0}`);
      });
    } else {
      console.log('  ⚠️  No technicians found');
    }

    res.json({ technicians });
  } catch (error) {
    console.error('Get technicians error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create user
router.post('/', authenticate, authorize('IT_MANAGER', 'SUPER_ADMIN', 'HELP_DESK', 'TECHNICIAN', 'SOFTWARE_ENGINEER'), [
  body('email').isEmail().withMessage('البريد الإلكتروني غير صحيح'),
  body('password').isLength({ min: 6 }).withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  body('name').trim().notEmpty().withMessage('الاسم مطلوب'),
  body('role').isIn(['USER', 'TECHNICIAN', 'IT_ADMIN', 'IT_MANAGER', 'SUPER_ADMIN', 'SOFTWARE_ENGINEER']).withMessage('الدور غير صحيح'),
  body('specializationId').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      return res.status(400).json({
        error: 'Validation error',
        errors: errors.array()
      });
    }

    const { email, password, name, role, specializationId } = req.body;

    console.log('Creating user:', { email, name, role, specializationId });

    if (req.user.role !== 'SUPER_ADMIN' && ELEVATED_ROLES.has(role)) {
      return res.status(403).json({ error: 'Only SUPER_ADMIN can create users with elevated roles' });
    }

    // Validate specialization for technician and IT_ADMIN
    if ((role === 'TECHNICIAN' || role === 'IT_ADMIN') && !specializationId) {
      return res.status(400).json({ error: 'Specialization is required for technicians and IT admins' });
    }

    // Validate specialization exists if provided
    if (specializationId) {
      const specialization = await prisma.specialization.findUnique({
        where: { id: specializationId }
      });
      if (!specialization) {
        return res.status(400).json({ error: 'Specialization not found' });
      }
    }

    // Use normalized email for lookup
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: name.trim(),
        role,
        specializationId: (role === 'TECHNICIAN' || role === 'IT_ADMIN') ? specializationId : null,
        status: (role === 'TECHNICIAN' || role === 'IT_ADMIN') ? 'AVAILABLE' : null,
        isOnline: false
      },
      include: {
        specialization: true
      }
    });

    console.log(`✅ Created user: ${user.name} (${user.email})`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Specialization: ${user.specialization?.name || 'None'}`);
    console.log(`   Status: ${user.status || 'None'}`);

    console.log(`✅ Created user: ${user.name} (${user.email})`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Specialization: ${user.specialization?.name || 'None'}`);
    console.log(`   Status: ${user.status || 'None'}`);

    // Return only selected fields
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      isOnline: user.isOnline,
      specialization: user.specialization
    };

    await createAuditLog(
      'USER_CREATED',
      `User ${name} created by ${req.user.name}`,
      req.user.id,
      null,
      { userId: user.id, role }
    );

    res.status(201).json({ user: userData });
  } catch (error) {
    console.error('Create user error:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      meta: error.meta
    });

    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already in use' });
    }

    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Specialization not found or invalid' });
    }

    res.status(500).json({
      error: error.message || 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.patch('/:id/password', authenticate, authorize('IT_MANAGER', 'SUPER_ADMIN', 'HELP_DESK', 'TECHNICIAN', 'SOFTWARE_ENGINEER'), [
  body('newPassword').trim().isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { newPassword } = req.body;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Cannot reset password for SUPER_ADMIN' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });

    await createAuditLog(
      'USER_PASSWORD_RESET',
      `Password reset for user ${targetUser.email}`,
      req.user.id,
      targetUser.id
    );

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', authenticate, authorize('IT_MANAGER', 'SUPER_ADMIN', 'HELP_DESK', 'TECHNICIAN', 'SOFTWARE_ENGINEER'), [
  body('name').optional().trim().notEmpty().withMessage('Name is required'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(['USER', 'TECHNICIAN', 'IT_ADMIN', 'IT_MANAGER', 'SUPER_ADMIN', 'SOFTWARE_ENGINEER']).withMessage('Invalid role'),
  body('specializationId').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, email, role, specializationId } = req.body;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Cannot update SUPER_ADMIN' });
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existingUser && existingUser.id !== id) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      updateData.email = normalizedEmail;
    }

    if (role) {
      if (targetUser.role === 'SUPER_ADMIN' && role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Cannot change SUPER_ADMIN role' });
      }
      if (role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Cannot assign SUPER_ADMIN role' });
      }
      if (role !== targetUser.role && req.user.role !== 'SUPER_ADMIN' && ELEVATED_ROLES.has(role)) {
        return res.status(403).json({ error: 'Only SUPER_ADMIN can assign elevated roles' });
      }
      updateData.role = role;
    }

    if (specializationId) {
      const specialization = await prisma.specialization.findUnique({ where: { id: specializationId } });
      if (!specialization) {
        return res.status(400).json({ error: 'Specialization not found' });
      }
      updateData.specializationId = specializationId;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { specialization: true }
    });

    await createAuditLog(
      'USER_UPDATED',
      `User ${targetUser.email} updated by ${req.user.email}`,
      req.user.id,
      updatedUser.id,
      { before: targetUser, after: updatedUser }
    );

    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticate, authorize('IT_MANAGER', 'SUPER_ADMIN', 'HELP_DESK', 'TECHNICIAN', 'SOFTWARE_ENGINEER'), async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id === id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Cannot delete SUPER_ADMIN' });
    }

    await prisma.user.delete({ where: { id } });

    await createAuditLog(
      'USER_DELETED',
      `User ${targetUser.email} deleted by ${req.user.email}`,
      req.user.id,
      targetUser.id
    );

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/status', authenticate, authorize('IT_MANAGER', 'IT_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  res.status(410).json({
    error: 'Manual technician status is deprecated. Presence is now automatic.'
  });
});

// Bulk create technicians from an Excel file containing emails
// Request: multipart/form-data { file, role (USER|TECHNICIAN), specializationId? }
router.post(
  '/bulk-technicians',
  authenticate,
  authorize('IT_MANAGER', 'SUPER_ADMIN', 'HELP_DESK', 'TECHNICIAN', 'SOFTWARE_ENGINEER'),
  upload.single('file'),
  [
    body('role').optional().isIn(['USER', 'TECHNICIAN']).withMessage('role must be USER or TECHNICIAN'),
    body('specializationId').optional().isString().withMessage('specializationId must be a string')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: 'Excel file is required' });
      }

      const { specializationId, role } = req.body;
      const normalizedRole = role === 'USER' ? 'USER' : 'TECHNICIAN';

      if (req.user.role !== 'SUPER_ADMIN' && normalizedRole !== 'USER') {
        return res.status(403).json({ error: 'Only SUPER_ADMIN can create users with elevated roles' });
      }

      let specialization = null;
      if (normalizedRole === 'TECHNICIAN') {
        if (!specializationId) {
          return res.status(400).json({ error: 'specializationId is required for TECHNICIAN role' });
        }

        specialization = await prisma.specialization.findUnique({
          where: { id: specializationId }
        });

        if (!specialization) {
          return res.status(400).json({ error: 'Specialization not found' });
        }
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // Collect emails from any cell (robust against headers / empty rows)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const emails = [];
      for (const row of rows) {
        if (!Array.isArray(row)) continue;
        for (const cell of row) {
          if (typeof cell !== 'string') continue;
          const v = cell.trim();
          if (emailRegex.test(v)) emails.push(v.toLowerCase());
        }
      }

      const uniqueEmails = Array.from(new Set(emails));
      if (uniqueEmails.length === 0) {
        return res.status(400).json({ error: 'No valid emails found in the Excel file' });
      }

      const existingUsers = await prisma.user.findMany({
        where: { email: { in: uniqueEmails } },
        select: { email: true }
      });
      const existingSet = new Set(existingUsers.map((u) => u.email.toLowerCase()));

      const defaultPassword = '123456';
      const hashedDefaultPassword = await bcrypt.hash(defaultPassword, 10);

      const missingEmails = uniqueEmails.filter((e) => !existingSet.has(e));
      const createdCount = missingEmails.length;
      const skippedCount = uniqueEmails.length - createdCount;

      if (createdCount > 0) {
        const data = missingEmails.map((email) => {
          const name = email.split('@')[0] || email;
          return {
            email,
            password: hashedDefaultPassword,
            name,
            role: normalizedRole,
            specializationId: normalizedRole === 'TECHNICIAN' ? specialization.id : null,
            status: normalizedRole === 'TECHNICIAN' ? 'AVAILABLE' : null,
            isOnline: false,
            mustChangePassword: true
          };
        });

        await prisma.user.createMany({
          data
        });
      }

      await createAuditLog(
        'BULK_IMPORT_USERS',
        `Bulk import role=${normalizedRole}: total=${uniqueEmails.length}, created=${createdCount}, skipped=${skippedCount}`,
        req.user.id,
        null,
        {
          specializationId:
            normalizedRole === 'TECHNICIAN' ? specialization.id : null,
          emailsCount: uniqueEmails.length
        }
      );

      res.json({
        result: {
          total: uniqueEmails.length,
          created: createdCount,
          skipped: skippedCount
        }
      });
    } catch (error) {
      console.error('Bulk import error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

export default router;

