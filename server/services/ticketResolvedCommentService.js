import { PrismaClient } from '@prisma/client';
import { createAuditLog } from '../utils/auditLog.js';
import { notifyFromTemplate } from '../utils/notifications.js';
import { broadcastToUser } from './wsTicketMessages.js';

const prisma = new PrismaClient();

/**
 * USER follow-up comment on a RESOLVED ticket; delivered to assigned engineer via DB + WebSocket.
 * Stored as TicketMessage (thread) with type RESOLVED_COMMENT.
 */
export async function createResolvedTicketComment({ ticketId, userId, body }) {
  const trimmed = body.trim();
  if (!trimmed) {
    const err = new Error('Comment body is required');
    err.statusCode = 400;
    throw err;
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId }
  });

  if (!ticket) {
    const err = new Error('Ticket not found');
    err.statusCode = 404;
    throw err;
  }

  if (ticket.status !== 'RESOLVED') {
    const err = new Error('Comments are only allowed when the ticket status is RESOLVED');
    err.statusCode = 400;
    throw err;
  }

  if (ticket.createdById !== userId) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }

  if (!ticket.assignedToId) {
    const err = new Error('No assigned engineer on this ticket');
    err.statusCode = 400;
    throw err;
  }

  const message = await prisma.ticketMessage.create({
    data: {
      ticketId,
      authorId: userId,
      toUserId: ticket.assignedToId,
      parentId: null,
      type: 'RESOLVED_COMMENT',
      body: trimmed
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
      toUser: { select: { id: true, name: true, email: true } }
    }
  });

  await createAuditLog(
    'TICKET_RESOLVED_COMMENT',
    `User added a follow-up comment on resolved ticket "${ticket.title}"`,
    userId,
    ticket.id,
    { body: trimmed }
  );

  await notifyFromTemplate(
    ticket.assignedToId,
    'RESOLVED_COMMENT',
    { title: ticket.title },
    'info',
    ticket.id,
    null
  );

  broadcastToUser(ticket.assignedToId, {
    type: 'ticket_message_created',
    ticketId: ticket.id,
    message
  });

  return message;
}
