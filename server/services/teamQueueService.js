import { PrismaClient } from '@prisma/client';
import { createAuditLog } from '../utils/auditLog.js';
import { notifyFromTemplate } from '../utils/notifications.js';
import { broadcastTicketListUpdated } from './wsTicketEvents.js';

const prisma = new PrismaClient();

export const ENGINEER_ROLES = new Set(['TECHNICIAN', 'IT_ADMIN']);
export const ACTIVE_ENGINEER_TICKET_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'USER_ACTION_NEEDED'];

const claimLocks = new Map();

const queueTicketInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  assignedTo: { include: { specialization: true } },
  specialization: true
};

const fail = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const withQueueLock = async (specializationId, fn) => {
  const prev = claimLocks.get(specializationId) || Promise.resolve();
  let release;
  const next = new Promise((resolve) => {
    release = resolve;
  });

  claimLocks.set(specializationId, prev.then(() => next));
  await prev;

  try {
    return await fn();
  } finally {
    release();
    if (claimLocks.get(specializationId) === next) {
      claimLocks.delete(specializationId);
    }
  }
};

const countActiveTicketsForEngineer = async (engineerId) =>
  prisma.ticket.count({
    where: {
      assignedToId: engineerId,
      status: { in: ACTIVE_ENGINEER_TICKET_STATUSES }
    }
  });

const findClaimCandidates = async (specializationId) =>
  prisma.ticket.findMany({
    where: {
      specializationId,
      status: 'OPEN',
      assignedToId: null
    },
    select: { id: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: 25
  });

const loadQueueTicket = async (ticketId) =>
  prisma.ticket.findUnique({
    where: { id: ticketId },
    include: queueTicketInclude
  });

export const isEngineerRole = (role) => ENGINEER_ROLES.has(role);

export const canEngineerAccessSpecializationTicket = (user, ticket) =>
  Boolean(
    user &&
      ticket &&
      isEngineerRole(user.role) &&
      user.specializationId &&
      ticket.specializationId &&
      user.specializationId === ticket.specializationId
  );

export const buildEngineerQueueWhere = (user) => {
  if (!isEngineerRole(user?.role) || !user?.specializationId) {
    return null;
  }

  return { specializationId: user.specializationId };
};

export const claimNextTicketForEngineer = async ({
  engineer,
  actorUserId = null,
  trigger = 'MANUAL',
  allowWhenBusy = true
}) => {
  if (!engineer?.id || !engineer?.specializationId || !isEngineerRole(engineer.role)) {
    fail(400, 'Only engineers with a specialization can claim tickets');
  }

  return withQueueLock(engineer.specializationId, async () => {
    if (!allowWhenBusy) {
      const activeCount = await countActiveTicketsForEngineer(engineer.id);
      if (activeCount > 0) {
        return { ticket: null, reason: 'ENGINEER_BUSY' };
      }
    }

    const candidates = await findClaimCandidates(engineer.specializationId);
    if (candidates.length === 0) {
      return { ticket: null, reason: 'EMPTY_QUEUE' };
    }

    const now = new Date();
    let claimedTicketId = null;

    for (const candidate of candidates) {
      const result = await prisma.ticket.updateMany({
        where: {
          id: candidate.id,
          specializationId: engineer.specializationId,
          status: 'OPEN',
          assignedToId: null
        },
        data: {
          assignedToId: engineer.id,
          assignedAt: now,
          status: 'ASSIGNED'
        }
      });

      if (result.count === 1) {
        claimedTicketId = candidate.id;
        break;
      }
    }

    if (!claimedTicketId) {
      return { ticket: null, reason: 'EMPTY_QUEUE' };
    }

    const ticket = await loadQueueTicket(claimedTicketId);
    if (!ticket) {
      return { ticket: null, reason: 'CLAIM_FAILED' };
    }

    await createAuditLog(
      'TICKET_CLAIMED',
      `Ticket "${ticket.title}" claimed by ${engineer.name} from the team queue`,
      actorUserId || engineer.id,
      ticket.id,
      {
        trigger,
        engineerId: engineer.id,
        specializationId: engineer.specializationId
      }
    );

    await notifyFromTemplate(
      engineer.id,
      'NEW_ASSIGNED_TICKET',
      { title: ticket.title },
      'info',
      ticket.id
    );

    await broadcastTicketListUpdated({
      ticketId: ticket.id,
      event: trigger === 'AUTO_AFTER_CLOSE' ? 'TICKET_AUTO_CLAIMED' : 'TICKET_CLAIMED',
      ticket,
      oldTicket: {
        assignedToId: null,
        createdById: ticket.createdById,
        specializationId: ticket.specializationId
      }
    });

    return { ticket, reason: null };
  });
};

export const claimNextTicketIfIdle = async ({
  engineerId,
  trigger = 'AUTO_AFTER_CLOSE'
}) => {
  const engineer = await prisma.user.findUnique({
    where: { id: engineerId },
    select: {
      id: true,
      name: true,
      role: true,
      specializationId: true,
      isOnline: true
    }
  });

  if (
    !engineer ||
    !engineer.isOnline ||
    !engineer.specializationId ||
    !isEngineerRole(engineer.role)
  ) {
    return null;
  }

  const result = await claimNextTicketForEngineer({
    engineer,
    actorUserId: engineer.id,
    trigger,
    allowWhenBusy: false
  });

  return result.ticket || null;
};
