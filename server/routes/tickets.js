import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, checkPermission, authorize } from '../middleware/auth.js';
import { createAuditLog } from '../utils/auditLog.js';
import { assignTicketRoundRobin } from '../utils/roundRobin.js';
import { routeByIssueType } from '../utils/issueRouting.js';
import { calculateSLADeadline, getSLAHours, getSLAStatus } from '../utils/sla.js';
import { notifyTicketStatusChange, createNotification } from '../utils/notifications.js';

const router = express.Router();
const prisma = new PrismaClient();

// Create ticket
router.post('/', authenticate, checkPermission('create_ticket'), [
  body('title').trim().notEmpty(),
  body('description').trim().notEmpty(),
  body('anydeskNumber').optional().isString(),
  body('problemType').isIn(['PREDEFINED', 'CUSTOM']),
  body('issueType').optional().isString(), // New: Optional issue type for direct routing
  body('specializationId').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, anydeskNumber, problemType, issueType, specializationId } = req.body;

    console.log('Creating ticket with:', { title, issueType, problemType, specializationId });

    const slaHours = getSLAHours();
    const slaDeadline = calculateSLADeadline(new Date());

    let assignedToId = null;
    let assignedAt = null;
    let status = 'OPEN';
    let finalSpecializationId = specializationId || null;

    // ROUTING PRIORITY:
    // 1. If issueType is "CUSTOM" → Route to IT Admin team
    // 2. If issueType is provided (not CUSTOM) → Route directly to mapped specialization
    // 3. Otherwise → Use existing routing logic (backward compatibility)
    
    if (issueType === 'CUSTOM') {
      // CUSTOM PROBLEM: Assign to IT Admin team (specialization) without individual assignment
      const itAdminSpec = await prisma.specialization.findUnique({
        where: { name: 'IT Admin' }
      });
      if (itAdminSpec) {
        finalSpecializationId = itAdminSpec.id;
        // Don't assign to individual technician - assign to team only
        // Status remains OPEN so IT Admin can review and assign to specific team
        console.log(`Custom ticket assigned to IT Admin team (specialization: ${itAdminSpec.name})`);
      }
    } else if (issueType) {
      // Issue type selected (not CUSTOM) - route directly to mapped specialization
      const issueRouting = await routeByIssueType(issueType, specializationId);
      if (issueRouting) {
        // Always set specializationId even if no technician is available
        finalSpecializationId = issueRouting.specializationId;
        if (issueRouting.technician) {
          assignedToId = issueRouting.technician.id;
          assignedAt = new Date();
          status = 'ASSIGNED';
          console.log(`Ticket routed via issue type "${issueType}" to technician ${issueRouting.technician.name}`);
        } else {
          // No technician available, but ticket is assigned to the team
          status = 'OPEN';
          console.log(`Issue type "${issueType}" routed to specialization "${issueRouting.specializationId}" but no technician available. Ticket assigned to team and will remain OPEN.`);
        }
      } else {
        // Issue type not found in mapping, log warning
        console.warn(`Issue type "${issueType}" not found in mapping. Ticket will be created without automatic routing.`);
      }
    } else {
      // EXISTING LOGIC: Backward compatibility (for old tickets without issueType)
      // If predefined problem, assign automatically
      if (problemType === 'PREDEFINED' && specializationId) {
        const technician = await assignTicketRoundRobin(specializationId);
        if (technician) {
          assignedToId = technician.id;
          assignedAt = new Date();
          status = 'ASSIGNED';
        }
      } else if (problemType === 'CUSTOM') {
        // CUSTOM PROBLEM: Assign to IT Admin team
        const itAdminSpec = await prisma.specialization.findUnique({
          where: { name: 'IT Admin' }
        });
        if (itAdminSpec) {
          finalSpecializationId = itAdminSpec.id;
          console.log(`Custom ticket assigned to IT Admin team (specialization: ${itAdminSpec.name})`);
        }
      }
    }

    console.log('Final ticket data:', { 
      finalSpecializationId, 
      assignedToId, 
      status, 
      issueType 
    });

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        anydeskNumber: anydeskNumber || null,
        problemType,
        issueType: issueType || null, // Store issue type for tracking
        status,
        specializationId: finalSpecializationId,
        createdById: req.user.id,
        assignedToId,
        assignedAt,
        slaHours,
        slaDeadline
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        assignedTo: {
          include: { specialization: true }
        },
        specialization: true
      }
    });

    await createAuditLog(
      'TICKET_CREATED',
      `Ticket "${title}" created by ${req.user.name}`,
      req.user.id,
      ticket.id,
      { anydeskNumber, problemType, issueType, status }
    );

    // Notify if assigned
    if (assignedToId) {
      await createNotification(
        assignedToId,
        'مهمة جديدة',
        `تم تعيين تذكرة جديدة: ${title}`,
        'info',
        ticket.id
      );
    }

    res.status(201).json({ ticket });
  } catch (error) {
    console.error('Create ticket error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
    res.status(500).json({ 
      error: 'Server error',
      details: error.message,
      code: error.code
    });
  }
});

// Get all tickets (filtered by role)
router.get('/', authenticate, async (req, res) => {
  try {
    let tickets;

    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'IT_MANAGER') {
      // IT Manager and Super Admin see all tickets
      tickets = await prisma.ticket.findMany({
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          assignedTo: { 
            include: { specialization: true }
          },
          specialization: true
        },
        orderBy: { createdAt: 'desc' }
      });
    } else if (req.user.role === 'IT_ADMIN') {
      // IT Admin sees only tickets assigned to IT Admin team
      const itAdminSpec = await prisma.specialization.findUnique({
        where: { name: 'IT Admin' }
      });

      tickets = await prisma.ticket.findMany({
        where: {
          specializationId: itAdminSpec ? itAdminSpec.id : null
        },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          assignedTo: { 
            include: { specialization: true }
          },
          specialization: true
        },
        orderBy: { createdAt: 'desc' }
      });
    } else if (req.user.role === 'TECHNICIAN') {
      // Technician sees assigned tickets
      tickets = await prisma.ticket.findMany({
        where: { assignedToId: req.user.id },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          assignedTo: { 
            include: { specialization: true }
          },
          specialization: true
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // User sees only their tickets
      tickets = await prisma.ticket.findMany({
        where: { createdById: req.user.id },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          assignedTo: { 
            include: { specialization: true }
          },
          specialization: true
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    // Add SLA status to each ticket
    tickets = tickets.map(ticket => ({
      ...ticket,
      slaStatus: getSLAStatus(ticket.slaDeadline)
    }));

    res.json({ tickets });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single ticket
router.get('/:id', authenticate, async (req, res) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { 
          include: { specialization: true }
        },
        specialization: true
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check permissions
    if (req.user.role === 'USER' && ticket.createdById !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.user.role === 'TECHNICIAN' && ticket.assignedToId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.user.role === 'IT_ADMIN') {
      // IT Admin can only see tickets assigned to IT Admin team
      const itAdminSpec = await prisma.specialization.findUnique({
        where: { name: 'IT Admin' }
      });
      
      if (!itAdminSpec || ticket.specializationId !== itAdminSpec.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    res.json({ 
      ticket: {
        ...ticket,
        slaStatus: getSLAStatus(ticket.slaDeadline)
      }
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update ticket status
router.patch('/:id/status', authenticate, [
  body('status').isIn(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check permissions
    if (req.user.role === 'USER' && ticket.createdById !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Technician can only update tickets assigned to them
    if (req.user.role === 'TECHNICIAN' && ticket.assignedToId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // IT Admin can update tickets assigned to IT Admin team
    if (req.user.role === 'IT_ADMIN') {
      const itAdminSpec = await prisma.specialization.findUnique({
        where: { name: 'IT Admin' }
      });
      
      if (!itAdminSpec || ticket.specializationId !== itAdminSpec.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const oldStatus = ticket.status;
    const { status } = req.body;

    const updateData = { status };
    
    if (status === 'RESOLVED' && !ticket.resolvedAt) {
      updateData.resolvedAt = new Date();
    }
    
    if (status === 'CLOSED' && !ticket.closedAt) {
      updateData.closedAt = new Date();
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { 
          include: { specialization: true }
        },
        specialization: true
      }
    });

    await createAuditLog(
      'TICKET_STATUS_CHANGED',
      `Ticket status changed from ${oldStatus} to ${status}`,
      req.user.id,
      ticket.id,
      { oldStatus, newStatus: status }
    );

    await notifyTicketStatusChange(updatedTicket, oldStatus, status);

    res.json({ 
      ticket: {
        ...updatedTicket,
        slaStatus: getSLAStatus(updatedTicket.slaDeadline)
      }
    });
  } catch (error) {
    console.error('Update ticket status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Assign custom ticket to team (IT Admin only)
// For CUSTOM tickets only: Assigns to specialization (team) not individual technician
router.post('/:id/assign', authenticate, checkPermission('assign_custom_ticket'), [
  body('specializationId').isString().withMessage('Specialization ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.problemType !== 'CUSTOM') {
      return res.status(400).json({ error: 'Only custom tickets can be assigned to teams' });
    }

    const { specializationId } = req.body;

    // Validate specialization exists
    const specialization = await prisma.specialization.findUnique({
      where: { id: specializationId }
    });

    if (!specialization) {
      return res.status(400).json({ error: 'Invalid specialization' });
    }

    // Assign to team (specialization) only, not individual technician
    // Round-robin will assign to available technician in that team
    const technician = await assignTicketRoundRobin(specializationId);

    const updatedTicket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: {
        specializationId: specializationId,
        assignedToId: technician ? technician.id : null, // Assign to technician if available, otherwise team only
        assignedAt: technician ? new Date() : null,
        status: technician ? 'ASSIGNED' : 'OPEN' // If no technician available, keep OPEN for team
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { 
          include: { specialization: true }
        },
        specialization: true
      }
    });

    await createAuditLog(
      'TICKET_ASSIGNED',
      `Ticket assigned to ${specialization.name} team${technician ? ` (${technician.name})` : ''} by ${req.user.name}`,
      req.user.id,
      ticket.id,
      { specializationId, technicianId: technician?.id || null }
    );

    // Notify technician if assigned, otherwise notify all IT_ADMIN in the team
    if (technician) {
      await createNotification(
        technician.id,
        'New Ticket',
        `New ticket assigned: ${ticket.title}`,
        'info',
        ticket.id
      );
    } else {
      // Notify all IT_ADMIN in the specialization
      const teamMembers = await prisma.user.findMany({
        where: {
          specializationId: specializationId,
          role: { in: ['TECHNICIAN', 'IT_ADMIN'] }
        }
      });
      for (const member of teamMembers) {
        await createNotification(
          member.id,
          'New Ticket',
          `New ticket assigned to ${specialization.name} team: ${ticket.title}`,
          'info',
          ticket.id
        );
      }
    }

    res.json({ 
      ticket: {
        ...updatedTicket,
        slaStatus: getSLAStatus(updatedTicket.slaDeadline)
      }
    });
  } catch (error) {
    console.error('Assign ticket error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reassign ticket (IT Manager and IT Admin only)
// For CUSTOM tickets: Reassigns to specialization (team)
// For other tickets: Reassigns to individual technician (existing behavior)
router.post('/:id/reassign', authenticate, authorize('IT_MANAGER', 'IT_ADMIN', 'SUPER_ADMIN'), [
  body('specializationId').optional().isString(),
  body('technicianId').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const { specializationId, technicianId } = req.body;

    // For CUSTOM tickets: Reassign to team (specialization) only
    if (ticket.problemType === 'CUSTOM') {
      if (!specializationId) {
        return res.status(400).json({ error: 'Specialization ID is required for custom tickets' });
      }

      const specialization = await prisma.specialization.findUnique({
        where: { id: specializationId }
      });

      if (!specialization) {
        return res.status(400).json({ error: 'Invalid specialization' });
      }

      const oldSpecializationId = ticket.specializationId;
      
      // Assign to team using round-robin
      const technician = await assignTicketRoundRobin(specializationId);

      const updatedTicket = await prisma.ticket.update({
        where: { id: req.params.id },
        data: {
          specializationId: specializationId,
          assignedToId: technician ? technician.id : null,
          assignedAt: technician ? new Date() : null,
          status: technician ? 'ASSIGNED' : 'OPEN'
        },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          assignedTo: { 
            include: { specialization: true }
          },
          specialization: true
        }
      });

      await createAuditLog(
        'TICKET_REASSIGNED',
        `Custom ticket reassigned from ${oldSpecializationId} to ${specialization.name} team${technician ? ` (${technician.name})` : ''} by ${req.user.name}`,
        req.user.id,
        ticket.id,
        { oldSpecializationId, newSpecializationId: specializationId, technicianId: technician?.id || null }
      );

      // Notify team members
      if (technician) {
        await createNotification(
          technician.id,
          'Ticket Reassigned',
          `Ticket reassigned to ${specialization.name} team: ${ticket.title}`,
          'info',
          ticket.id
        );
      }

      res.json({ 
        ticket: {
          ...updatedTicket,
          slaStatus: getSLAStatus(updatedTicket.slaDeadline)
        }
      });
      return;
    }

    // For non-CUSTOM tickets: Existing behavior - reassign to individual technician
    if (!technicianId) {
      return res.status(400).json({ error: 'Technician ID is required for non-custom tickets' });
    }

    const technician = await prisma.user.findUnique({
      where: { id: technicianId }
    });

    if (!technician || (technician.role !== 'TECHNICIAN' && technician.role !== 'IT_ADMIN')) {
      return res.status(400).json({ error: 'Invalid technician' });
    }

    const oldTechnicianId = ticket.assignedToId;

    const updatedTicket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: {
        assignedToId: technicianId,
        assignedAt: new Date(),
        status: 'ASSIGNED'
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { 
          include: { specialization: true }
        },
        specialization: true
      }
    });

    await createAuditLog(
      'TICKET_REASSIGNED',
      `Ticket reassigned from ${oldTechnicianId} to ${technician.name} by ${req.user.name}`,
      req.user.id,
      ticket.id,
      { oldTechnicianId, newTechnicianId: technicianId }
    );

    await createNotification(
      technicianId,
      'إعادة تعيين مهمة',
      `تم إعادة تعيين التذكرة: ${ticket.title}`,
      'info',
      ticket.id
    );

    res.json({ 
      ticket: {
        ...updatedTicket,
        slaStatus: getSLAStatus(updatedTicket.slaDeadline)
      }
    });
  } catch (error) {
    console.error('Reassign ticket error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

