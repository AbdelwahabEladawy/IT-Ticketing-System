import { PrismaClient } from '@prisma/client';
import { broadcastToUser } from './wsTicketMessages.js';

const prisma = new PrismaClient();

const IT_ADMIN_SPECIALIZATION_NAME = 'IT Admin';
const DASHBOARD_EVENT_TYPE = 'ticket_list_updated';

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

  // SUPER_ADMIN and IT_MANAGER see all tickets.
  const [globalAdmins, itAdminSpec] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ['SUPER_ADMIN', 'IT_MANAGER'] } },
      select: { id: true }
    }),
    prisma.specialization.findUnique({
      where: { name: IT_ADMIN_SPECIALIZATION_NAME },
      select: { id: true }
    })
  ]);

  for (const u of globalAdmins) push(u.id);

  // IT_ADMIN sees only tickets assigned to IT Admin team (specializationId).
  if (itAdminSpec && ticket?.specializationId && ticket.specializationId === itAdminSpec.id) {
    const itAdmins = await prisma.user.findMany({
      where: { role: 'IT_ADMIN', specializationId: itAdminSpec.id },
      select: { id: true }
    });
    for (const u of itAdmins) push(u.id);
  }

  broadcastToMany(recipients, {
    type: DASHBOARD_EVENT_TYPE,
    ticketId,
    event,
    t: Date.now()
  });
};

