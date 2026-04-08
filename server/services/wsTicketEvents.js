import { PrismaClient } from '@prisma/client';
import { broadcastToUser } from './wsTicketMessages.js';

const prisma = new PrismaClient();
const DASHBOARD_EVENT_TYPE = 'ticket_list_updated';
const ENGINEER_ROLES = ['TECHNICIAN', 'IT_ADMIN'];

const broadcastToMany = (userIds, payload) => {
  for (const userId of userIds) {
    if (!userId) continue;
    broadcastToUser(userId, payload);
  }
};

/**
 * Sends a lightweight "dashboard needs refresh" event to the users that can see this ticket.
 * Dashboard client will re-fetch `/api/dashboard` on receipt.
 */
export const broadcastTicketListUpdated = async ({ ticketId, event, ticket, oldTicket = null }) => {
  const recipients = new Set();
  const push = (id) => {
    if (id) recipients.add(id);
  };

  if (ticket) {
    push(ticket.createdById);
    push(ticket.assignedToId);
  }

  // If the assignee changed, make sure the previous assignee dashboard refreshes too.
  if (oldTicket) {
    push(oldTicket.assignedToId);
    push(oldTicket.createdById);
  }

  const globalAdmins = await prisma.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'IT_MANAGER'] } },
    select: { id: true }
  });

  for (const u of globalAdmins) push(u.id);

  const specializationIds = [...new Set([ticket?.specializationId, oldTicket?.specializationId])].filter(Boolean);
  if (specializationIds.length > 0) {
    const teamMembers = await prisma.user.findMany({
      where: {
        role: { in: ENGINEER_ROLES },
        specializationId: { in: specializationIds }
      },
      select: { id: true }
    });
    for (const u of teamMembers) push(u.id);
  }

  broadcastToMany(recipients, {
    type: DASHBOARD_EVENT_TYPE,
    ticketId,
    event,
    t: Date.now()
  });
};

