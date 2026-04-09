import express from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, checkPermission, authorize } from '../middleware/auth.js';
import { createAuditLog } from '../utils/auditLog.js';
import { assignTicketRoundRobin } from '../utils/roundRobin.js';
import { routeByIssueType } from '../utils/issueRouting.js';
import { calculateSLADeadline, getSLAHours, getSLAStatus } from '../utils/sla.js';
import { notifyTicketStatusChange, notifyFromTemplate } from '../utils/notifications.js';
import { broadcastToUser } from '../services/wsTicketMessages.js';
import { broadcastTicketListUpdated } from '../services/wsTicketEvents.js';
import { createResolvedTicketComment } from '../services/ticketResolvedCommentService.js';
import { getInternalRequestIp } from '../utils/requestIp.js';
import {
  createReassignmentRequest,
  listReassignmentRequestsForTicket,
  listReassignmentRequestsForSuperAdmin,
  approveReassignmentRequest,
  rejectReassignmentRequest
} from '../services/reassignmentRequestService.js';

const router = express.Router();
const prisma = new PrismaClient();
const SELF_ASSIGN_SPECIALIZATIONS = new Set([
  'Help Desk',
  'IT Admin',
  'Network',
  'Server/Admin',
  'Software Engineering'
]);
const DIRECT_ENGINEER_ROLES = new Set(['TECHNICIAN', 'SOFTWARE_ENGINEER']);
const ELIGIBLE_ENGINEER_ROLES = new Set(['TECHNICIAN', 'IT_ADMIN', 'SOFTWARE_ENGINEER']);

const getItAdminSpecializationId = async () => {
  const itAdminSpec = await prisma.specialization.findUnique({
    where: { name: 'IT Admin' },
    select: { id: true }
  });
  return itAdminSpec?.id || null;
};

const canAccessTicket = async (user, ticket) => {
  if (!user || !ticket) return false;
  if (user.role === 'SUPER_ADMIN' || user.role === 'IT_MANAGER') return true;
  if (user.role === 'USER') return ticket.createdById === user.id;
  if (DIRECT_ENGINEER_ROLES.has(user.role)) return ticket.assignedToId === user.id;
  if (user.role === 'IT_ADMIN') {
    const itAdminSpecializationId = await getItAdminSpecializationId();
    return Boolean(itAdminSpecializationId && ticket.specializationId === itAdminSpecializationId);
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

    const {
      title,
      description,
      anydeskNumber,
      problemType,
      issueType,
      specializationId,
      assignedToId: requestedAssignedToId
    } = req.body;
    const deviceIp = getInternalRequestIp(req);

    console.log('Creating ticket with:', {
      title,
      issueType,
      problemType,
      specializationId,
      deviceIp
    });

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

    const userSpecializationName = req.user.specialization?.name;
    const canEngineerCreateSelfAssignedTicket =
      DIRECT_ENGINEER_ROLES.has(req.user.role) &&
      SELF_ASSIGN_SPECIALIZATIONS.has(userSpecializationName || '');
    const canCreateSelfAssignedTicket =
      req.user.role === 'IT_ADMIN' || canEngineerCreateSelfAssignedTicket;

    if (canCreateSelfAssignedTicket) {
      const fallbackSpecializationId =
        req.user.role === 'IT_ADMIN' ? await getItAdminSpecializationId() : null;
      assignedToId = req.user.id;
      finalSpecializationId =
        req.user.specializationId || fallbackSpecializationId || finalSpecializationId;
      status = 'ASSIGNED';
      assignedAt = new Date();
    } else if (issueType === 'CUSTOM') {
      // CUSTOM PROBLEM: Route to IT Admin team and assign to an online engineer (round-robin)
      const itAdminSpec = await prisma.specialization.findUnique({
        where: { name: 'IT Admin' }
      });
      if (itAdminSpec) {
        finalSpecializationId = itAdminSpec.id;
        const technician = await assignTicketRoundRobin(itAdminSpec.id);
        if (technician) {
          assignedToId = technician.id;
          assignedAt = new Date();
          status = 'ASSIGNED';
        }
        console.log(`Custom ticket routed to IT Admin team (specialization: ${itAdminSpec.name})`);
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
        // CUSTOM PROBLEM: Assign to IT Admin team and assign to an online engineer (round-robin)
        const itAdminSpec = await prisma.specialization.findUnique({
          where: { name: 'IT Admin' }
        });
        if (itAdminSpec) {
          finalSpecializationId = itAdminSpec.id;
          const technician = await assignTicketRoundRobin(itAdminSpec.id);
          if (technician) {
            assignedToId = technician.id;
            assignedAt = new Date();
            status = 'ASSIGNED';
          }
          console.log(`Custom ticket routed to IT Admin team (specialization: ${itAdminSpec.name})`);
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
      if (!canCreateSelfAssignedTicket || requestedAssignedToId !== req.user.id) {
        return res.status(403).json({
          error: 'Manual assignee is not allowed. Ticket will be auto-routed by issue type.'
        });
      }
    }

    const ticket = await prisma.ticket.create({
      data: {
        title,
        description,
        anydeskNumber: anydeskNumber || null,
        deviceIp,
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
      { anydeskNumber, problemType, issueType, status, deviceIp }
    );

    // Notify if assigned
    if (assignedToId) {
      await notifyFromTemplate(assignedToId, 'NEW_ASSIGNED_TICKET', { title }, 'info', ticket.id);
    }

    // Ticket assignment is handled at creation time using round-robin.
    // Do NOT run a full redistribution here; partial balancing happens only
    // when engineers come online.

    // Re-fetch fresh assignee/specialization data after any internal auto-routing/rebalance.
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
    } else if (DIRECT_ENGINEER_ROLES.has(req.user.role)) {
      // Engineer sees assigned tickets
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

      if (DIRECT_ENGINEER_ROLES.has(req.user.role) && ticket.assignedToId !== req.user.id) {
        return res.status(403).json({ error: 'Engineer can request reassignment only for their assigned tickets' });
      }

      if (req.user.role === 'IT_ADMIN') {
        const itAdminSpecializationId = await getItAdminSpecializationId();
        if (!itAdminSpecializationId || ticket.specializationId !== itAdminSpecializationId) {
          return res.status(403).json({ error: 'Forbidden' });
        }
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

    if (DIRECT_ENGINEER_ROLES.has(req.user.role) && ticket.assignedToId !== req.user.id) {
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

    const { status } = req.body;

    // Check permissions
    if (req.user.role === 'USER' && ticket.createdById !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.user.role === 'USER' && status !== 'CLOSED') {
      return res.status(403).json({ error: 'Users can only close their own tickets' });
    }

    // Engineers can only update tickets assigned to them
    if (DIRECT_ENGINEER_ROLES.has(req.user.role) && ticket.assignedToId !== req.user.id) {
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

    // Permission: only technicians (assigned) and IT Admin (IT Admin team tickets)
    // Engineers are also allowed to perform this action; SUPER_ADMIN is allowed for all.
    if (req.user.role === 'USER') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (DIRECT_ENGINEER_ROLES.has(req.user.role) && ticket.assignedToId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.user.role === 'IT_ADMIN') {
      const itAdminSpec = await prisma.specialization.findUnique({
        where: { name: 'IT Admin' }
      });

      if (!itAdminSpec || ticket.specializationId !== itAdminSpec.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
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

    // Same access control as ticket detail:
    if (req.user.role === 'USER' && ticket.createdById !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (DIRECT_ENGINEER_ROLES.has(req.user.role) && ticket.assignedToId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.user.role === 'IT_ADMIN') {
      const itAdminSpec = await prisma.specialization.findUnique({
        where: { name: 'IT Admin' }
      });

      if (!itAdminSpec || ticket.specializationId !== itAdminSpec.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const fullThreadRoles = ['SUPER_ADMIN', 'IT_MANAGER', 'IT_ADMIN', 'USER'];
    const messageWhere = fullThreadRoles.includes(req.user.role)
      ? { ticketId: req.params.id }
      : {
          ticketId: req.params.id,
          OR: [{ authorId: req.user.id }, { toUserId: req.user.id }]
        };

    const messages = await prisma.ticketMessage.findMany({
      where: messageWhere,
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
      await notifyFromTemplate(
        technician.id,
        'NEW_TICKET',
        { title: ticket.title },
        'info',
        ticket.id
      );
    } else {
      // Notify all online-capable engineers in the specialization
      const teamMembers = await prisma.user.findMany({
        where: {
          specializationId: specializationId,
          role: { in: Array.from(ELIGIBLE_ENGINEER_ROLES) }
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
        await notifyFromTemplate(
          technician.id,
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

    if (!technician || !ELIGIBLE_ENGINEER_ROLES.has(technician.role)) {
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

