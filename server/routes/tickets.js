import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, checkPermission, authorize } from '../middleware/auth.js';
import { createAuditLog } from '../utils/auditLog.js';
import { routeByIssueType } from '../utils/issueRouting.js';
import { calculateSLADeadline, getSLAHours, getSLAStatus } from '../utils/sla.js';
import { notifyTicketStatusChange, notifyFromTemplate } from '../utils/notifications.js';
import { broadcastToUser } from '../services/wsTicketMessages.js';
import { broadcastTicketListUpdated } from '../services/wsTicketEvents.js';
import { createResolvedTicketComment } from '../services/ticketResolvedCommentService.js';
import {
  buildEngineerQueueWhere,
  canEngineerAccessSpecializationTicket,
  claimNextTicketForEngineer,
  claimNextTicketIfIdle,
  isEngineerRole
} from '../services/teamQueueService.js';
import {
  createReassignmentRequest,
  listReassignmentRequestsForTicket,
  listReassignmentRequestsForSuperAdmin,
  approveReassignmentRequest,
  rejectReassignmentRequest
} from '../services/reassignmentRequestService.js';

const router = express.Router();
const prisma = new PrismaClient();

const canAccessTicket = async (user, ticket) => {
  if (!user || !ticket) return false;
  if (user.role === 'SUPER_ADMIN' || user.role === 'IT_MANAGER') return true;
  if (user.role === 'USER') return ticket.createdById === user.id;
  if (isEngineerRole(user.role)) {
    return canEngineerAccessSpecializationTicket(user, ticket);
  }
  return false;
};

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

    const { title, description, anydeskNumber, problemType, issueType, specializationId, assignedToId: requestedAssignedToId } = req.body;

    console.log('Creating ticket with:', { title, issueType, problemType, specializationId });

    const slaHours = getSLAHours();
    const slaDeadline = calculateSLADeadline(new Date());

    const assignedToId = null;
    const assignedAt = null;
    const status = 'OPEN';
    let finalSpecializationId = specializationId || null;

    // ROUTING PRIORITY:
    // 1. If issueType is "CUSTOM" → Route to IT Admin team
    // 2. If issueType is provided (not CUSTOM) → Route directly to mapped specialization
    // 3. Otherwise → Use existing routing logic (backward compatibility)

    if (issueType === 'CUSTOM') {
      // CUSTOM PROBLEM: Route to IT Admin team and assign to an online engineer (round-robin)
      const itAdminSpec = await prisma.specialization.findUnique({
        where: { name: 'IT Admin' }
      });
      if (itAdminSpec) {
        finalSpecializationId = itAdminSpec.id;
        console.log(`Custom ticket routed to IT Admin team queue (specialization: ${itAdminSpec.name})`);
      }
    } else if (issueType) {
      // Issue type selected (not CUSTOM) - route directly to mapped specialization queue
      const issueRouting = await routeByIssueType(issueType, specializationId);
      if (issueRouting) {
        finalSpecializationId = issueRouting.specializationId;
        console.log(`Issue type "${issueType}" routed to specialization queue "${issueRouting.specializationId}".`);
      } else {
        console.warn(`Issue type "${issueType}" not found in mapping. Ticket will be created without automatic routing.`);
      }
    } else {
      if (problemType === 'CUSTOM') {
        const itAdminSpec = await prisma.specialization.findUnique({
          where: { name: 'IT Admin' }
        });
        if (itAdminSpec) {
          finalSpecializationId = itAdminSpec.id;
          console.log(`Custom ticket routed to IT Admin team queue (specialization: ${itAdminSpec.name})`);
        }
      }
    }

    console.log('Final ticket data:', {
      finalSpecializationId,
      assignedToId,
      status,
      issueType
    });

    if (requestedAssignedToId && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'Manual assignee is not allowed. Tickets now enter the specialization queue first.'
      });
    }

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

    if (finalSpecializationId) {
      const teamMembers = await prisma.user.findMany({
        where: {
          specializationId: finalSpecializationId,
          role: { in: ['TECHNICIAN', 'IT_ADMIN'] }
        },
        select: { id: true }
      });

      for (const member of teamMembers) {
        await notifyFromTemplate(
          member.id,
          'NEW_TICKET_TEAM',
          {
            teamName: ticket.specialization?.name || 'Team',
            title
          },
          'info',
          ticket.id
        );
      }
    }

    const freshTicket = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      select: { id: true, createdById: true, assignedToId: true, specializationId: true }
    });
    await broadcastTicketListUpdated({
      ticketId: ticket.id,
      event: 'TICKET_CREATED',
      ticket: freshTicket
    });

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
    } else if (isEngineerRole(req.user.role)) {
      // Engineers see only tickets in their specialization queue
      tickets = await prisma.ticket.findMany({
        where: buildEngineerQueueWhere(req.user) || { id: '__never__' },
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
      // User sees all tickets they created
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

// List reassignment requests across tickets (Super Admin)
router.get('/reassignment-requests', authenticate, authorize('SUPER_ADMIN'), async (req, res) => {
  try {
    const requests = await listReassignmentRequestsForSuperAdmin({
      status: req.query.status || 'PENDING',
      limit: req.query.limit || 200
    });

    res.json({
      requests,
      autoApprovalMinutes: Number(process.env.REASSIGNMENT_AUTO_APPROVAL_MINUTES || 15)
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('List reassignment requests (super admin) error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// List reassignment requests for a single ticket
router.get('/:id/reassignment-requests', authenticate, async (req, res) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        title: true,
        createdById: true,
        assignedToId: true,
        specializationId: true
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const allowed = await canAccessTicket(req.user, ticket);
    if (!allowed) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const requests = await listReassignmentRequestsForTicket({
      ticketId: req.params.id
    });

    res.json({
      requests,
      autoApprovalMinutes: Number(process.env.REASSIGNMENT_AUTO_APPROVAL_MINUTES || 15)
    });
  } catch (error) {
    console.error('List reassignment requests error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Engineer creates reassignment request
router.post(
  '/:id/reassignment-requests',
  authenticate,
  [
    body('toEngineerId')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('toEngineerId is required'),
    body('reason').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const ticket = await prisma.ticket.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          title: true,
          createdById: true,
          assignedToId: true,
          specializationId: true
        }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      if (!ELIGIBLE_ENGINEER_ROLES.has(req.user.role)) {
        return res.status(403).json({ error: 'Only engineers can create reassignment requests' });
      }

      const allowed = await canAccessTicket(req.user, ticket);
      if (!allowed) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      if (!ticket.assignedToId) {
        return res.status(400).json({ error: 'Ticket must have an assigned engineer first' });
      }

      if (isEngineerRole(req.user.role) && ticket.assignedToId !== req.user.id) {
        return res.status(403).json({ error: 'Only the assigned engineer can request reassignment' });
      }

      const request = await createReassignmentRequest({
        ticket,
        actor: req.user,
        toEngineerId: req.body.toEngineerId,
        reason: req.body.reason
      });

      res.status(201).json({ request });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error('Create reassignment request error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Super Admin approves reassignment request
router.post('/reassignment-requests/:requestId/approve', authenticate, authorize('SUPER_ADMIN'), async (req, res) => {
  try {
    const result = await approveReassignmentRequest({
      requestId: req.params.requestId,
      actor: req.user,
      source: 'MANUAL',
      strict: true
    });

    res.json({
      request: result.request,
      ticket: result.updatedTicket
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Approve reassignment request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Super Admin rejects reassignment request
router.post(
  '/reassignment-requests/:requestId/reject',
  authenticate,
  authorize('SUPER_ADMIN'),
  [body('reason').optional().isString()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await rejectReassignmentRequest({
        requestId: req.params.requestId,
        actor: req.user,
        reason: req.body.reason,
        strict: true
      });

      res.json({ request: result.request });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error('Reject reassignment request error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Engineer claims the oldest waiting ticket in their specialization queue
router.post('/claim-next', authenticate, async (req, res) => {
  try {
    if (!isEngineerRole(req.user.role) || !req.user.specializationId) {
      return res.status(403).json({ error: 'Only engineers with a specialization can claim queue tickets' });
    }

    const result = await claimNextTicketForEngineer({
      engineer: req.user,
      actorUserId: req.user.id,
      trigger: 'MANUAL',
      allowWhenBusy: true
    });

    if (!result.ticket) {
      return res.json({
        ticket: null,
        message: 'No waiting tickets are available in your team queue.'
      });
    }

    return res.json({
      ticket: {
        ...result.ticket,
        slaStatus: getSLAStatus(result.ticket.slaDeadline)
      }
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Claim-next ticket error:', error);
    return res.status(500).json({ error: 'Server error' });
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

    const allowed = await canAccessTicket(req.user, ticket);
    if (!allowed) {
      return res.status(403).json({ error: 'Forbidden' });
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

    const { status } = req.body;

    // Check permissions
    if (req.user.role === 'USER' && ticket.createdById !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.user.role === 'USER' && status !== 'CLOSED') {
      return res.status(403).json({ error: 'Users can only close their own tickets' });
    }

    if (isEngineerRole(req.user.role) && ticket.assignedToId !== req.user.id) {
      return res.status(403).json({ error: 'Only the assigned engineer can update this ticket' });
    }

    const oldStatus = ticket.status;

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

    await broadcastTicketListUpdated({
      ticketId: updatedTicket.id,
      event: 'TICKET_STATUS_CHANGED',
      ticket: updatedTicket
    });

    let nextTicket = null;
    if (status === 'CLOSED' && isEngineerRole(req.user.role) && ticket.assignedToId === req.user.id) {
      nextTicket = await claimNextTicketIfIdle({
        engineerId: req.user.id,
        trigger: 'AUTO_AFTER_CLOSE'
      });
    }

    res.json({
      ticket: {
        ...updatedTicket,
        slaStatus: getSLAStatus(updatedTicket.slaDeadline)
      },
      nextTicket: nextTicket
        ? {
            ...nextTicket,
            slaStatus: getSLAStatus(nextTicket.slaDeadline)
          }
        : null
    });
  } catch (error) {
    console.error('Update ticket status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create an "action request" message and set ticket status to USER_ACTION_NEEDED
router.post('/:id/action-needed', authenticate, [
  body('comment').trim().notEmpty().withMessage('Comment is required when requesting user action')
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

    if (req.user.role === 'USER') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (isEngineerRole(req.user.role) && ticket.assignedToId !== req.user.id) {
      return res.status(403).json({ error: 'Only the assigned engineer can request user action' });
    }

    const { comment } = req.body;
    const trimmedComment = comment.trim();

    const ticketCreatorId = ticket.createdById;

    const [updatedTicket, actionMessage] = await prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { id: req.params.id },
        data: { status: 'USER_ACTION_NEEDED' },
      });

      const msg = await tx.ticketMessage.create({
        data: {
          ticketId: req.params.id,
          authorId: req.user.id,
          toUserId: ticketCreatorId,
          parentId: null,
          type: 'ACTION_REQUEST',
          body: trimmedComment
        },
        include: {
          author: { select: { id: true, name: true, email: true } },
          toUser: { select: { id: true, name: true, email: true } }
        }
      });

      return [updated, msg];
    });

    await createAuditLog(
      'TICKET_USER_ACTION_NEEDED',
      `Engineer requested user action for ticket "${ticket.title}"`,
      req.user.id,
      ticket.id,
      { comment: trimmedComment }
    );

    await notifyFromTemplate(
      ticketCreatorId,
      'ACTION_REQUIRED',
      { title: ticket.title },
      'info',
      ticket.id
    );

    broadcastToUser(ticketCreatorId, {
      type: 'ticket_message_created',
      ticketId: ticket.id,
      message: actionMessage
    });

    await broadcastTicketListUpdated({
      ticketId: updatedTicket.id,
      event: 'TICKET_STATUS_CHANGED',
      ticket: updatedTicket,
      oldTicket: ticket
    });

    res.json({
      ticket: updatedTicket,
      message: actionMessage
    });
  } catch (error) {
    console.error('Action-needed error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a user reply to a specific action request message
router.post('/:id/replies', authenticate, [
  body('requestMessageId').isString().withMessage('requestMessageId is required'),
  body('reply').trim().notEmpty().withMessage('Reply is required')
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

    const { requestMessageId, reply } = req.body;
    const trimmedReply = reply.trim();

    const requestMessage = await prisma.ticketMessage.findUnique({
      where: { id: requestMessageId }
    });

    if (!requestMessage || requestMessage.ticketId !== req.params.id) {
      return res.status(404).json({ error: 'Action request not found' });
    }

    if (requestMessage.type !== 'ACTION_REQUEST') {
      return res.status(400).json({ error: 'Invalid request message type' });
    }

    // Only the recipient of the request can reply (the ticket creator)
    if (requestMessage.toUserId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const [replyMessage] = await prisma.$transaction(async (tx) => {
      const msg = await tx.ticketMessage.create({
        data: {
          ticketId: req.params.id,
          authorId: req.user.id,
          toUserId: requestMessage.authorId,
          parentId: requestMessage.id,
          type: 'USER_REPLY',
          body: trimmedReply
        },
        include: {
          author: { select: { id: true, name: true, email: true } },
          toUser: { select: { id: true, name: true, email: true } },
          parent: { select: { id: true, type: true } }
        }
      });
      return [msg];
    });

    await createAuditLog(
      'TICKET_USER_REPLIED',
      `User replied to action request for ticket "${ticket.title}"`,
      req.user.id,
      ticket.id,
      { reply: trimmedReply, requestMessageId: requestMessage.id }
    );

    await notifyFromTemplate(
      requestMessage.authorId,
      'USER_CONFIRMED',
      { title: ticket.title },
      'info',
      ticket.id
    );

    broadcastToUser(requestMessage.authorId, {
      type: 'ticket_message_created',
      ticketId: ticket.id,
      message: replyMessage
    });

    res.json({ message: replyMessage });
  } catch (error) {
    console.error('Reply error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get messages (requests + replies) for a ticket, filtered by access
router.get('/:id/messages', authenticate, async (req, res) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const allowed = await canAccessTicket(req.user, ticket);
    if (!allowed) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const messages = await prisma.ticketMessage.findMany({
      where: { ticketId: req.params.id },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } }
      }
    });

    res.json({ messages });
  } catch (error) {
    console.error('Ticket messages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// USER follow-up comment on a RESOLVED ticket (stored as TicketMessage RESOLVED_COMMENT; WS to assignee)
router.post(
  '/:id/resolved-comments',
  authenticate,
  [body('body').trim().notEmpty().withMessage('Comment is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      if (req.user.role !== 'USER') {
        return res.status(403).json({ error: 'Only users can add follow-up comments on resolved tickets' });
      }
      const message = await createResolvedTicketComment({
        ticketId: req.params.id,
        userId: req.user.id,
        body: req.body.body
      });
      res.status(201).json({ message });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error('Resolved comment error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Assign custom ticket to team (IT Admin only)
// For CUSTOM tickets only: Assigns to specialization (team) not individual technician
router.post('/:id/assign', authenticate, authorize('SUPER_ADMIN'), [
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

    const updatedTicket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: {
        specializationId: specializationId,
        assignedToId: null,
        assignedAt: null,
        status: 'OPEN'
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
      `Ticket assigned to ${specialization.name} team queue by ${req.user.name}`,
      req.user.id,
      ticket.id,
      { specializationId, technicianId: null }
    );

    const teamMembers = await prisma.user.findMany({
      where: {
        specializationId: specializationId,
        role: { in: ['TECHNICIAN', 'IT_ADMIN'] }
      }
    });
    for (const member of teamMembers) {
      await notifyFromTemplate(
        member.id,
        'NEW_TICKET_TEAM',
        { teamName: specialization.name, title: ticket.title },
        'info',
        ticket.id
      );
    }

    await broadcastTicketListUpdated({
      ticketId: updatedTicket.id,
      event: 'TICKET_ASSIGNED',
      ticket: updatedTicket,
      oldTicket: ticket
    });

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
router.post('/:id/reassign', authenticate, authorize('SUPER_ADMIN'), [
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

      const updatedTicket = await prisma.ticket.update({
        where: { id: req.params.id },
        data: {
          specializationId: specializationId,
          assignedToId: null,
          assignedAt: null,
          status: 'OPEN'
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
        `Custom ticket reassigned from ${oldSpecializationId} to ${specialization.name} team queue by ${req.user.name}`,
        req.user.id,
        ticket.id,
        { oldSpecializationId, newSpecializationId: specializationId, technicianId: null }
      );

      const teamMembers = await prisma.user.findMany({
        where: {
          specializationId,
          role: { in: ['TECHNICIAN', 'IT_ADMIN'] }
        },
        select: { id: true }
      });
      for (const member of teamMembers) {
        await notifyFromTemplate(
          member.id,
          'TICKET_REASSIGNED_TEAM',
          { teamName: specialization.name, title: ticket.title },
          'info',
          ticket.id
        );
      }

      await broadcastTicketListUpdated({
        ticketId: updatedTicket.id,
        event: 'TICKET_REASSIGNED',
        ticket: updatedTicket,
        oldTicket: ticket
      });

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

    const oldSpecializationId = ticket.specializationId;
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

    await notifyFromTemplate(
      technicianId,
      'TICKET_REASSIGNED_TECH',
      { title: ticket.title },
      'info',
      ticket.id
    );

    await broadcastTicketListUpdated({
      ticketId: updatedTicket.id,
      event: 'TICKET_REASSIGNED',
      ticket: updatedTicket,
      oldTicket: ticket
    });

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

