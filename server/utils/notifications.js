import { PrismaClient } from '@prisma/client';
import { getSLAStatus } from './sla.js';

const prisma = new PrismaClient();

export const createNotification = async (userId, title, message, type = 'info', ticketId = null) => {
  try {
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        ticketId
      }
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

export const notifyTicketStatusChange = async (ticket, oldStatus, newStatus) => {
  const statusMessages = {
    ASSIGNED: 'Your ticket has been assigned to a technician',
    IN_PROGRESS: 'Work has started on your ticket',
    RESOLVED: 'Your ticket has been resolved',
    CLOSED: 'Your ticket has been closed'
  };

  if (ticket.createdById) {
    await createNotification(
      ticket.createdById,
      'Ticket Status Updated',
      statusMessages[newStatus] || `Ticket status changed to ${newStatus}`,
      'info',
      ticket.id
    );
  }

  if (ticket.assignedToId && ticket.assignedToId !== ticket.createdById) {
    await createNotification(
      ticket.assignedToId,
      'Ticket Status Updated',
      `Ticket "${ticket.title}" status changed to ${newStatus}`,
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
    
    if (ticket.assignedToId) {
      await createNotification(
        ticket.assignedToId,
        'SLA Warning',
        `Ticket "${ticket.title}" will expire in ${Math.round(hoursRemaining)} hours`,
        slaStatus === 'URGENT' ? 'error' : 'warning',
        ticket.id
      );
    }

    if (ticket.createdById) {
      await createNotification(
        ticket.createdById,
        'SLA Warning',
        `Ticket "${ticket.title}" will expire in ${Math.round(hoursRemaining)} hours`,
        slaStatus === 'URGENT' ? 'error' : 'warning',
        ticket.id
      );
    }
  }
};
