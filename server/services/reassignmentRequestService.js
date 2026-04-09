import { PrismaClient } from '@prisma/client';
import { createAuditLog } from '../utils/auditLog.js';
import { notifyFromTemplate } from '../utils/notifications.js';
import { broadcastTicketListUpdated } from './wsTicketEvents.js';

const prisma = new PrismaClient();

const ELIGIBLE_ENGINEER_ROLES = new Set(['TECHNICIAN', 'IT_ADMIN', 'SOFTWARE_ENGINEER']);
const AUTO_APPROVAL_MINUTES = Number(process.env.REASSIGNMENT_AUTO_APPROVAL_MINUTES || 15);
const ticketLocks = new Map();

const requestInclude = {
  requestedBy: { select: { id: true, name: true, email: true, role: true } },
  fromEngineer: { select: { id: true, name: true, email: true, role: true } },
  toEngineer: { select: { id: true, name: true, email: true, role: true } },
  decidedBy: { select: { id: true, name: true, email: true, role: true } }
};

const requestWithTicketInclude = {
  ...requestInclude,
  ticket: {
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      specialization: { select: { id: true, name: true } }
    }
  }
};

const fail = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000);

const statusLabel = (status) => status.replace(/_/g, ' ').toLowerCase();

const withTicketLock = async (ticketId, fn) => {
  const prev = ticketLocks.get(ticketId) || Promise.resolve();
  let release;
  const next = new Promise((resolve) => {
    release = resolve;
  });
  ticketLocks.set(ticketId, prev.then(() => next));
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (ticketLocks.get(ticketId) === next) {
      ticketLocks.delete(ticketId);
    }
  }
};

const getRequestOrFail = async (tx, requestId) => {
  const request = await tx.ticketReassignmentRequest.findUnique({
    where: { id: requestId },
    include: requestInclude
  });
  if (!request) {
    fail(404, 'Reassignment request not found');
  }
  return request;
};

const ensureEngineerTarget = async (tx, engineerId) => {
  const user = await tx.user.findUnique({
    where: { id: engineerId },
    select: { id: true, name: true, email: true, role: true, specializationId: true }
  });
  if (!user || !ELIGIBLE_ENGINEER_ROLES.has(user.role)) {
    fail(400, 'Invalid target engineer');
  }
  return user;
};

const fetchSuperAdminIds = async () => {
  const users = await prisma.user.findMany({
    where: { role: 'SUPER_ADMIN' },
    select: { id: true }
  });
  return users.map((u) => u.id);
};

export const listReassignmentRequestsForTicket = async ({ ticketId }) => {
  return prisma.ticketReassignmentRequest.findMany({
    where: { ticketId },
    include: requestInclude,
    orderBy: { createdAt: 'desc' }
  });
};

export const listReassignmentRequestsForSuperAdmin = async ({
  status = 'PENDING',
  limit = 200
} = {}) => {
  const normalizedStatus = String(status || 'PENDING').trim().toUpperCase();
  const allowedStatuses = new Set([
    'ALL',
    'PENDING',
    'APPROVED',
    'REJECTED',
    'AUTO_APPROVED'
  ]);

  if (!allowedStatuses.has(normalizedStatus)) {
    fail(400, 'Invalid reassignment request status filter');
  }

  const safeLimit = Math.max(1, Math.min(Number(limit) || 200, 500));
  const where =
    normalizedStatus === 'ALL' ? {} : { status: normalizedStatus };

  return prisma.ticketReassignmentRequest.findMany({
    where,
    include: requestWithTicketInclude,
    orderBy: { createdAt: 'desc' },
    take: safeLimit
  });
};

export const createReassignmentRequest = async ({
  ticket,
  actor,
  toEngineerId,
  reason = null
}) => {
  if (!ticket?.id) {
    fail(400, 'Ticket is required');
  }
  if (!actor?.id) {
    fail(401, 'Unauthorized');
  }
  const normalizedTargetEngineerId = String(toEngineerId || '').trim();
  if (!normalizedTargetEngineerId) {
    fail(400, 'toEngineerId is required');
  }

  return withTicketLock(ticket.id, async () => {
    const now = new Date();
    const autoApproveAt = addMinutes(now, AUTO_APPROVAL_MINUTES);

    let created;
    try {
      created = await prisma.$transaction(async (tx) => {
        if (ticket.assignedToId && ticket.assignedToId === normalizedTargetEngineerId) {
          fail(400, 'Target engineer is already assigned to this ticket');
        }

        await ensureEngineerTarget(tx, normalizedTargetEngineerId);

        const pending = await tx.ticketReassignmentRequest.findFirst({
          where: { ticketId: ticket.id, status: 'PENDING' },
          select: { id: true }
        });
        if (pending) {
          fail(409, 'There is already a pending reassignment request for this ticket');
        }

        return tx.ticketReassignmentRequest.create({
          data: {
            ticketId: ticket.id,
            requestedById: actor.id,
            fromEngineerId: ticket.assignedToId || null,
            toEngineerId: normalizedTargetEngineerId,
            reason: reason?.trim() || null,
            status: 'PENDING',
            autoApproveAt
          },
          include: requestInclude
        });
      });
    } catch (error) {
      if (error?.code === 'P2002') {
        fail(409, 'There is already a pending reassignment request for this ticket');
      }
      throw error;
    }

    await createAuditLog(
      'TICKET_REASSIGN_REQUEST_CREATED',
      `Reassignment request created for ticket "${ticket.title}"`,
      actor.id,
      ticket.id,
      {
        requestId: created.id,
        fromEngineerId: created.fromEngineerId,
        toEngineerId: created.toEngineerId,
        createdAt: created.createdAt,
        autoApproveAt: created.autoApproveAt,
        reason: created.reason
      }
    );

    const superAdminIds = await fetchSuperAdminIds();
    for (const superAdminId of superAdminIds) {
      await notifyFromTemplate(
        superAdminId,
        'REASSIGN_REQUEST_CREATED',
        {
          title: ticket.title,
          requester: actor.name,
          targetEngineer: created.toEngineer?.name || 'Unknown',
          minutes: AUTO_APPROVAL_MINUTES
        },
        'warning',
        ticket.id
      );
    }

    return created;
  });
};

const transitionRequest = async ({
  requestId,
  targetStatus,
  actor = null,
  rejectionReason = null,
  strict = true
}) => {
  const now = new Date();
  const decidedById = actor?.id || null;

  const result = await prisma.$transaction(async (tx) => {
    const existing = await getRequestOrFail(tx, requestId);

    if (existing.status !== 'PENDING') {
      if (strict) {
        fail(409, `Request already ${statusLabel(existing.status)}`);
      }
      return { applied: false, existing };
    }

    const updateResult = await tx.ticketReassignmentRequest.updateMany({
      where: { id: requestId, status: 'PENDING' },
      data: {
        status: targetStatus,
        decidedById,
        decidedAt: now,
        processedAt: now,
        autoApprovedAt: targetStatus === 'AUTO_APPROVED' ? now : null,
        rejectionReason:
          targetStatus === 'REJECTED' ? (rejectionReason?.trim() || null) : null
      }
    });

    if (updateResult.count !== 1) {
      const latest = await getRequestOrFail(tx, requestId);
      if (strict) {
        fail(409, `Request already ${statusLabel(latest.status)}`);
      }
      return { applied: false, existing: latest };
    }

    const updatedRequest = await getRequestOrFail(tx, requestId);

    if (targetStatus === 'REJECTED') {
      return {
        applied: true,
        request: updatedRequest,
        updatedTicket: null,
        oldTicket: null
      };
    }

    const targetEngineer = await ensureEngineerTarget(tx, updatedRequest.toEngineerId);
    const currentTicket = await tx.ticket.findUnique({
      where: { id: updatedRequest.ticketId },
      select: {
        id: true,
        title: true,
        createdById: true,
        assignedToId: true,
        specializationId: true
      }
    });
    if (!currentTicket) {
      fail(404, 'Ticket not found');
    }

    const updatedTicket = await tx.ticket.update({
      where: { id: currentTicket.id },
      data: {
        assignedToId: targetEngineer.id,
        assignedAt: now,
        status: 'ASSIGNED',
        specializationId: targetEngineer.specializationId || currentTicket.specializationId
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { include: { specialization: true } },
        specialization: true
      }
    });

    return {
      applied: true,
      request: updatedRequest,
      updatedTicket,
      oldTicket: currentTicket
    };
  });

  return result;
};

const notifyDecision = async ({ request, ticket, action }) => {
  if (!request || !ticket) return;

  const templateKeyByAction = {
    APPROVED: 'REASSIGN_REQUEST_APPROVED',
    AUTO_APPROVED: 'REASSIGN_REQUEST_AUTO_APPROVED',
    REJECTED: 'REASSIGN_REQUEST_REJECTED'
  };
  const templateKey = templateKeyByAction[action];
  if (!templateKey) return;

  const recipients = new Set([
    request.requestedById,
    request.fromEngineerId,
    request.toEngineerId
  ]);

  for (const userId of recipients) {
    if (!userId) continue;
    await notifyFromTemplate(
      userId,
      templateKey,
      {
        title: ticket.title,
        requester: request.requestedBy?.name || 'Unknown',
        targetEngineer: request.toEngineer?.name || 'Unknown',
        reason: request.reason || '',
        rejectionReason: request.rejectionReason || ''
      },
      action === 'REJECTED' ? 'warning' : 'info',
      ticket.id
    );
  }
};

export const approveReassignmentRequest = async ({
  requestId,
  actor,
  source = 'MANUAL',
  strict = true
}) => {
  const targetStatus = source === 'AUTO' ? 'AUTO_APPROVED' : 'APPROVED';
  const result = await transitionRequest({
    requestId,
    targetStatus,
    actor,
    strict
  });

  if (!result.applied) return result;

  const elapsedMs =
    new Date(result.request.decidedAt).getTime() -
    new Date(result.request.createdAt).getTime();
  const actionSource = source === 'AUTO' ? 'SYSTEM' : 'MANUAL';

  await createAuditLog(
    source === 'AUTO'
      ? 'TICKET_REASSIGN_REQUEST_AUTO_APPROVED'
      : 'TICKET_REASSIGN_REQUEST_APPROVED',
    `Reassignment request ${source === 'AUTO' ? 'auto-approved' : 'approved'} for ticket "${result.oldTicket?.title || result.request.ticketId}"`,
    actor?.id || null,
    result.request.ticketId,
    {
      requestId: result.request.id,
      fromEngineerId: result.request.fromEngineerId,
      toEngineerId: result.request.toEngineerId,
      actionSource,
      createdAt: result.request.createdAt,
      decidedAt: result.request.decidedAt,
      elapsedMs
    }
  );

  if (result.updatedTicket) {
    await broadcastTicketListUpdated({
      ticketId: result.updatedTicket.id,
      event:
        source === 'AUTO'
          ? 'TICKET_REASSIGN_REQUEST_AUTO_APPROVED'
          : 'TICKET_REASSIGNED',
      ticket: result.updatedTicket,
      oldTicket: result.oldTicket
    });
  }

  if (result.oldTicket) {
    await notifyDecision({
      request: result.request,
      ticket: result.oldTicket,
      action: targetStatus
    });
  }

  return result;
};

export const rejectReassignmentRequest = async ({
  requestId,
  actor,
  reason = null,
  strict = true
}) => {
  const result = await transitionRequest({
    requestId,
    targetStatus: 'REJECTED',
    actor,
    rejectionReason: reason,
    strict
  });

  if (!result.applied) return result;

  const elapsedMs =
    new Date(result.request.decidedAt).getTime() -
    new Date(result.request.createdAt).getTime();

  await createAuditLog(
    'TICKET_REASSIGN_REQUEST_REJECTED',
    `Reassignment request rejected for ticket ${result.request.ticketId}`,
    actor?.id || null,
    result.request.ticketId,
    {
      requestId: result.request.id,
      fromEngineerId: result.request.fromEngineerId,
      toEngineerId: result.request.toEngineerId,
      actionSource: 'MANUAL',
      createdAt: result.request.createdAt,
      decidedAt: result.request.decidedAt,
      elapsedMs,
      rejectionReason: result.request.rejectionReason
    }
  );

  const ticket = await prisma.ticket.findUnique({
    where: { id: result.request.ticketId },
    select: { id: true, title: true }
  });
  if (ticket) {
    await notifyDecision({
      request: result.request,
      ticket,
      action: 'REJECTED'
    });
  }

  return result;
};

export const processDueReassignmentRequests = async ({ limit = 20 } = {}) => {
  const dueRequests = await prisma.ticketReassignmentRequest.findMany({
    where: {
      status: 'PENDING',
      autoApproveAt: { lte: new Date() }
    },
    select: { id: true },
    orderBy: { autoApproveAt: 'asc' },
    take: limit
  });

  const summary = {
    due: dueRequests.length,
    autoApproved: 0,
    skipped: 0,
    failed: 0
  };

  for (const req of dueRequests) {
    try {
      const result = await approveReassignmentRequest({
        requestId: req.id,
        actor: null,
        source: 'AUTO',
        strict: false
      });
      if (result.applied) summary.autoApproved += 1;
      else summary.skipped += 1;
    } catch (error) {
      summary.failed += 1;
      console.error('Auto-approve reassignment request failed:', req.id, error?.message || error);
    }
  }

  return summary;
};
