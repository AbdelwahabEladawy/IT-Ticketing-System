import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, checkPermission } from '../middleware/auth.js';
import { createAuditLog } from '../utils/auditLog.js';
import { assignTicketRoundRobin } from '../utils/roundRobin.js';
import { createNotification } from '../utils/notifications.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all users (IT Manager, IT Admin and Super Admin only)
router.get('/', authenticate, authorize('IT_MANAGER', 'IT_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        specialization: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        specialization: true,
        createdAt: true
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
    const { specializationId, status } = req.query;

    const where = {
      role: { in: ['TECHNICIAN', 'IT_ADMIN'] } // Include both TECHNICIAN and IT_ADMIN
    };

    if (specializationId) {
      where.specializationId = specializationId;
    }

    if (status) {
      where.status = status;
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

// Create user (IT Manager and Super Admin only)
router.post('/', authenticate, authorize('IT_MANAGER', 'SUPER_ADMIN'), [
  body('email').isEmail().withMessage('البريد الإلكتروني غير صحيح'),
  body('password').isLength({ min: 6 }).withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  body('name').trim().notEmpty().withMessage('الاسم مطلوب'),
  body('role').isIn(['USER', 'TECHNICIAN', 'IT_ADMIN', 'IT_MANAGER', 'SUPER_ADMIN']).withMessage('الدور غير صحيح'),
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
        status: (role === 'TECHNICIAN' || role === 'IT_ADMIN') ? 'AVAILABLE' : null
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

// Update technician status
router.patch('/:id/status', authenticate, checkPermission('change_technician_status'), [
  body('status').isIn(['AVAILABLE', 'BUSY', 'OFFLINE'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'TECHNICIAN' && user.role !== 'IT_ADMIN') {
      return res.status(400).json({ error: 'User is not a technician or IT admin' });
    }

    const { status } = req.body;
    const oldStatus = user.status;

    // If changing to BUSY or OFFLINE, reassign active tickets
    if ((status === 'BUSY' || status === 'OFFLINE') && oldStatus === 'AVAILABLE') {
      // Get all active tickets assigned to this technician
      const activeTickets = await prisma.ticket.findMany({
        where: {
          assignedToId: user.id,
          status: { notIn: ['CLOSED', 'RESOLVED'] }
        },
        include: {
          specialization: true
        }
      });

      // Reassign each ticket to another available technician in the same specialization
      for (const ticket of activeTickets) {
        if (ticket.specializationId) {
          // Find another available technician in the same specialization (excluding current technician)
          const newTechnician = await assignTicketRoundRobin(ticket.specializationId, user.id);
          
          if (newTechnician && newTechnician.id !== user.id) {
            // Reassign the ticket
            await prisma.ticket.update({
              where: { id: ticket.id },
              data: {
                assignedToId: newTechnician.id,
                assignedAt: new Date(),
                status: 'ASSIGNED'
              }
            });

            // Create audit log
            await createAuditLog(
              'TICKET_REASSIGNED',
              `Ticket reassigned from ${user.name} to ${newTechnician.name} due to technician status change`,
              req.user.id,
              ticket.id,
              { oldTechnicianId: user.id, newTechnicianId: newTechnician.id, reason: 'TECHNICIAN_STATUS_CHANGE' }
            );

            // Notify the new technician
            await createNotification(
              newTechnician.id,
              'Ticket Reassigned',
              `Ticket "${ticket.title}" has been reassigned to you`,
              'info',
              ticket.id
            );

            // Notify ticket creator
            if (ticket.createdById) {
              await createNotification(
                ticket.createdById,
                'Ticket Reassigned',
                `Ticket "${ticket.title}" has been reassigned to ${newTechnician.name}`,
                'info',
                ticket.id
              );
            }
          } else {
            // No available technician found, unassign the ticket
            await prisma.ticket.update({
              where: { id: ticket.id },
              data: {
                assignedToId: null,
                status: 'OPEN'
              }
            });

            await createAuditLog(
              'TICKET_UNASSIGNED',
              `Ticket unassigned from ${user.name} due to technician status change (no available technicians)`,
              req.user.id,
              ticket.id,
              { technicianId: user.id, reason: 'TECHNICIAN_STATUS_CHANGE_NO_AVAILABLE' }
            );
          }
        }
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        specialization: true
      }
    });

    // Return only selected fields
    const userData = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      status: updatedUser.status,
      specialization: updatedUser.specialization
    };

    await createAuditLog(
      'TECHNICIAN_STATUS_CHANGED',
      `Technician ${user.name} status changed from ${oldStatus} to ${status} by ${req.user.name}`,
      req.user.id,
      null,
      { technicianId: user.id, oldStatus, newStatus: status }
    );

    res.json({ user: userData });
  } catch (error) {
    console.error('Update technician status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

