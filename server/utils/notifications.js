import { PrismaClient } from '@prisma/client';
import { getSLAStatus } from './sla.js';
import { broadcastToUser } from '../services/wsTicketMessages.js';
import { getNotificationStrings } from './notificationTemplates.js';

const prisma = new PrismaClient();

export async function getPreferredLocale(userId) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferredLocale: true }
  });
  return u?.preferredLocale === 'ar' ? 'ar' : 'en';
}

/**
 * Create a notification using bilingual templates (recipient locale from DB).
 */
export async function notifyFromTemplate(
  userId,
  templateKey,
  params,
  type = 'info',
  ticketId = null,
  suggestionId = null
) {
  const locale = await getPreferredLocale(userId);
  const { title, message } = getNotificationStrings(templateKey, locale, params);
  return createNotificationRaw(userId, title, message, type, ticketId, suggestionId);
}

async function createNotificationRaw(
  userId,
  title,
  message,
  type = 'info',
  ticketId = null,
  suggestionId = null
) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        ticketId,
        suggestionId
      }
    });
    broadcastToUser(userId, {
      type: 'notification_created',
      notification
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

/** @deprecated Prefer notifyFromTemplate; kept for rare direct strings */
export const createNotification = async (
  userId,
  title,
  message,
  type = 'info',
  ticketId = null,
  suggestionId = null
) => {
  return createNotificationRaw(userId, title, message, type, ticketId, suggestionId);
};

export const notifyTicketStatusChange = async (ticket, oldStatus, newStatus) => {
  const statusMessagesEn = {
    ASSIGNED: 'Your ticket has been assigned to a technician',
    IN_PROGRESS: 'Work has started on your ticket',
    RESOLVED: 'Your ticket has been resolved',
    CLOSED: 'Your ticket has been closed'
  };
  const statusMessagesAr = {
    ASSIGNED: 'تم تعيين تذكرتك على فني',
    IN_PROGRESS: 'بدأ العمل على تذكرتك',
    RESOLVED: 'تم حل تذكرتك',
    CLOSED: 'تم إغلاق تذكرتك'
  };

  const msgEn = statusMessagesEn[newStatus] || `Ticket status changed to ${newStatus}`;
  const msgAr = statusMessagesAr[newStatus] || `تغيّرت حالة التذكرة إلى ${newStatus}`;

  if (ticket.createdById) {
    await notifyFromTemplate(
      ticket.createdById,
      'STATUS_UPDATED',
      { message: msgEn, messageAr: msgAr },
      'info',
      ticket.id
    );
  }

  if (ticket.assignedToId && ticket.assignedToId !== ticket.createdById) {
    await notifyFromTemplate(
      ticket.assignedToId,
      'STATUS_UPDATED_ASSIGNEE',
      { title: ticket.title, status: newStatus },
      'info',
      ticket.id
    );
  }
};

export const notifySLAWarning = async (ticket) => {
  if (!ticket.slaDeadline) return;

  const slaStatus = getSLAStatus(ticket.slaDeadline);

  if (slaStatus === 'URGENT' || slaStatus === 'WARNING') {
    const deadline = new Date(ticket.slaDeadline);
    const hoursRemaining = (deadline - new Date()) / (1000 * 60 * 60);
    const hours = Math.round(hoursRemaining);

    if (ticket.assignedToId) {
      await notifyFromTemplate(
        ticket.assignedToId,
        'SLA_WARNING',
        { title: ticket.title, hours },
        slaStatus === 'URGENT' ? 'error' : 'warning',
        ticket.id
      );
    }

    if (ticket.createdById) {
      await notifyFromTemplate(
        ticket.createdById,
        'SLA_WARNING',
        { title: ticket.title, hours },
        slaStatus === 'URGENT' ? 'error' : 'warning',
        ticket.id
      );
    }
  }
};
