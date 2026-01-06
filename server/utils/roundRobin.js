import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const assignTicketRoundRobin = async (specializationId, excludeTechnicianId = null) => {
  // Get all available technicians for this specialization
  // Include both TECHNICIAN and IT_ADMIN roles (IT_ADMIN can also handle tickets)
  const whereClause = {
    role: { in: ['TECHNICIAN', 'IT_ADMIN'] },
    specializationId: specializationId,
    status: 'AVAILABLE'
  };
  
  if (excludeTechnicianId) {
    whereClause.id = { not: excludeTechnicianId };
  }
  
  const technicians = await prisma.user.findMany({
    where: whereClause,
    orderBy: {
      createdAt: 'asc' // Simple round-robin based on creation order
    }
  });

  if (technicians.length === 0) {
    // If no available technicians, try busy ones
    const busyWhereClause = {
      role: { in: ['TECHNICIAN', 'IT_ADMIN'] },
      specializationId: specializationId,
      status: 'BUSY'
    };
    
    if (excludeTechnicianId) {
      busyWhereClause.id = { not: excludeTechnicianId };
    }
    
    const busyTechnicians = await prisma.user.findMany({
      where: busyWhereClause,
      orderBy: {
        createdAt: 'asc'
      }
    });

    if (busyTechnicians.length === 0) {
      return null; // No technicians available
    }

    // Get the technician with the least assigned tickets
    const technicianWithCounts = await Promise.all(
      busyTechnicians.map(async (tech) => {
        const count = await prisma.ticket.count({
          where: {
            assignedToId: tech.id,
            status: { not: 'CLOSED' }
          }
        });
        return { ...tech, ticketCount: count };
      })
    );

    technicianWithCounts.sort((a, b) => a.ticketCount - b.ticketCount);
    return technicianWithCounts[0];
  }

  // Get ticket counts for available technicians
  const technicianWithCounts = await Promise.all(
    technicians.map(async (tech) => {
      const count = await prisma.ticket.count({
        where: {
          assignedToId: tech.id,
          status: { not: 'CLOSED' }
        }
      });
      return { ...tech, ticketCount: count };
    })
  );

  // Sort by ticket count (round-robin with load balancing)
  technicianWithCounts.sort((a, b) => a.ticketCount - b.ticketCount);
  return technicianWithCounts[0];
};

