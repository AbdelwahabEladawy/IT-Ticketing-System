import { PrismaClient } from '@prisma/client';
import { createAuditLog } from '../utils/auditLog.js';
import { features } from '../config/features.js';
import { broadcastTicketListUpdated } from './wsTicketEvents.js';
import { notifyFromTemplate } from '../utils/notifications.js';

const prisma = new PrismaClient();
const teamLocks = new Map();
// Rebalance must only move pending tickets. IN_PROGRESS, USER_ACTION_NEEDED, etc
// are handled by the ticket detail flow, not by the balancer.
const ACTIVE_STATUSES = ['ASSIGNED'];
const ELIGIBLE_ROLES = ['TECHNICIAN', 'IT_ADMIN', 'SOFTWARE_ENGINEER'];
const ENGINEER_ROLES = ['TECHNICIAN', 'IT_ADMIN', 'SOFTWARE_ENGINEER'];

const isPrivateEngineerTicket = (ticket) =>
  ticket.createdById &&
  ticket.assignedToId &&
  ticket.createdById === ticket.assignedToId &&
  ENGINEER_ROLES.includes(ticket.createdBy?.role);

const withTeamLock = async (specializationId, fn) => {
  const prev = teamLocks.get(specializationId) || Promise.resolve();
  let release;
  const next = new Promise((resolve) => {
    release = resolve;
  });
  teamLocks.set(specializationId, prev.then(() => next));
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (teamLocks.get(specializationId) === next) {
      teamLocks.delete(specializationId);
    }
  }
};

export const buildTargetMap = (users, ticketCount) => {
  const base = Math.floor(ticketCount / users.length);
  let extra = ticketCount % users.length;
  const sorted = [...users].sort((a, b) => (a.id > b.id ? 1 : -1));
  const map = new Map();
  for (const user of sorted) {
    const cap = extra > 0 ? base + 1 : base;
    map.set(user.id, cap);
    if (extra > 0) extra -= 1;
  }
  return map;
};

export const assignLeastLoadedOnline = async (specializationId) => {
  if (!specializationId) return null;
  const users = await prisma.user.findMany({
    where: {
      specializationId,
      role: { in: ELIGIBLE_ROLES },
      isOnline: true
    },
    include: {
      _count: {
        select: {
          assignedTickets: {
            where: { status: { in: ACTIVE_STATUSES } }
          }
        }
      }
    }
  });

  if (users.length === 0) return null;
  users.sort((a, b) => {
    if (a._count.assignedTickets !== b._count.assignedTickets) {
      return a._count.assignedTickets - b._count.assignedTickets;
    }
    return a.id > b.id ? 1 : -1;
  });
  return users[0];
};

export const rebalanceTeam = async ({ specializationId, trigger, actorUserId = null }) => {
  if (!features.presenceRebalanceEnabled || !specializationId) return { moved: 0 };

  return withTeamLock(specializationId, async () => {
    const batchId = `rebalance_${Date.now()}_${specializationId}`;
    await prisma.rebalanceJob.create({
      data: { specializationId, trigger, status: 'RUNNING' }
    });

    const onlineUsers = await prisma.user.findMany({
      where: {
        specializationId,
        role: { in: ELIGIBLE_ROLES },
        isOnline: true
      }
    });

    const activeTickets = await prisma.ticket.findMany({
      where: {
        specializationId,
        status: { in: ACTIVE_STATUSES }
      },
      include: {
        createdBy: {
          select: { id: true, role: true }
        }
      },
      orderBy: { assignedAt: 'asc' }
    });

    if (onlineUsers.length === 0) {
      // No eligible assignees => do not reassign anything.
      await prisma.rebalanceJob.updateMany({
        where: { specializationId, status: 'RUNNING' },
        data: { status: 'DONE', processedAt: new Date() }
      });
      return { moved: 0 };
    }

    // Group ONLY ASSIGNED tickets.
    // Tickets whose assignedToId is offline/unset go into a pool, then are assigned
    // to the most underloaded online engineers.
    const onlineIds = new Set(onlineUsers.map((u) => u.id));
    const ticketsByAssignee = new Map(onlineUsers.map((u) => [u.id, []]));
    const unassignedPool = [];
    const ticketById = new Map(activeTickets.map((t) => [t.id, t]));

    for (const ticket of activeTickets) {
      const assigneeId = ticket.assignedToId;
      if (assigneeId && onlineIds.has(assigneeId)) {
        ticketsByAssignee.get(assigneeId).push(ticket); // already FIFO (assignedAt asc)
      } else {
        unassignedPool.push(ticket); // also FIFO (activeTickets ordered by assignedAt asc)
      }
    }

    const totalTickets = activeTickets.length;
    const totalEngineers = onlineUsers.length;
    const desiredMax = Math.ceil(totalTickets / totalEngineers); // keeps difference <= 1

    const getReceivers = () =>
      onlineUsers
        .map((u) => ({ id: u.id, count: ticketsByAssignee.get(u.id).length }))
        .filter((x) => x.count < desiredMax)
        .sort((a, b) => (a.count - b.count !== 0 ? a.count - b.count : a.id > b.id ? 1 : -1));

    const getDonors = () =>
      onlineUsers
        .map((u) => ({ id: u.id, count: ticketsByAssignee.get(u.id).length }))
        .filter((x) => x.count > desiredMax)
        .sort((a, b) => (b.count - a.count !== 0 ? b.count - a.count : a.id > b.id ? 1 : -1));

    const moves = [];
    // 1) Assign from unassigned/offline-owned pool into underloaded engineers.
    while (unassignedPool.length > 0) {
      const receiver = getReceivers()[0];
      if (!receiver) break;
      if (receiver.count >= desiredMax) break;

      const ticket = unassignedPool.shift();
      if (!ticket) break;

      ticketsByAssignee.get(receiver.id).push(ticket);
      moves.push({
        ticketId: ticket.id,
        oldAssigneeId: ticket.assignedToId ?? null,
        newAssigneeId: receiver.id
      });
    }

    // 2) Move oldest ASSIGNED tickets from overloaded -> underloaded until balanced.
    while (true) {
      const donor = getDonors()[0];
      const receiver = getReceivers()[0];
      if (!donor || !receiver) break;
      if (donor.count <= desiredMax) break;
      if (receiver.count >= desiredMax) break;

      const donorTickets = ticketsByAssignee.get(donor.id);
      const ticket = donorTickets.shift(); // FIFO: oldest first
      if (!ticket) break;

      ticketsByAssignee.get(receiver.id).push(ticket);
      moves.push({
        ticketId: ticket.id,
        oldAssigneeId: donor.id,
        newAssigneeId: receiver.id
      });
    }

    let movedCount = 0;

    if (moves.length > 0) {
      const successfulMoves = [];
      const now = new Date();

      await prisma.$transaction(async (tx) => {
        for (const move of moves) {
          const fromId = move.oldAssigneeId ?? null;
          const result = await tx.ticket.updateMany({
            where: {
              id: move.ticketId,
              status: 'ASSIGNED',
              assignedToId: fromId
            },
            data: {
              assignedToId: move.newAssigneeId,
              assignedAt: now,
              status: 'ASSIGNED'
            }
          });

          if (result.count === 1) successfulMoves.push(move);
        }
      });

      if (successfulMoves.length > 0) {
        for (const move of successfulMoves) {
          const t = ticketById.get(move.ticketId);
          const createdById = t?.createdById ?? null;
          const title = t?.title ?? null;

          await createAuditLog(
            'TICKET_REASSIGNED',
            `Automatic rebalance moved ticket from ${move.oldAssigneeId || 'UNASSIGNED'} to ${move.newAssigneeId}`,
            actorUserId,
            move.ticketId,
            {
              oldAssigneeId: move.oldAssigneeId,
              newAssigneeId: move.newAssigneeId,
              reason: 'AUTO_REBALANCE',
              trigger,
              rebalanceBatchId: batchId
            }
          );

          if (move.newAssigneeId && title) {
            await notifyFromTemplate(
              move.newAssigneeId,
              'REBALANCE_NEW',
              { title },
              'info',
              move.ticketId
            );
          }

          if (move.oldAssigneeId && move.oldAssigneeId !== move.newAssigneeId && title) {
            await notifyFromTemplate(
              move.oldAssigneeId,
              'REBALANCE_REMOVED',
              { title },
              'info',
              move.ticketId
            );
          }

          const freshTicket = await prisma.ticket.findUnique({
            where: { id: move.ticketId },
            select: { id: true, createdById: true, assignedToId: true, specializationId: true }
          });

          await broadcastTicketListUpdated({
            ticketId: move.ticketId,
            event: 'TICKET_REBALANCED',
            ticket: freshTicket,
            oldTicket:
              move.oldAssigneeId != null
                ? {
                    assignedToId: move.oldAssigneeId,
                    createdById: createdById ?? undefined,
                    specializationId: t?.specializationId ?? undefined
                  }
                : null
          });
        }
      }

      movedCount = successfulMoves.length;
    }

    await prisma.rebalanceJob.updateMany({
      where: { specializationId, status: 'RUNNING' },
      data: { status: 'DONE', processedAt: new Date() }
    });
    return { moved: movedCount };
  });
};

