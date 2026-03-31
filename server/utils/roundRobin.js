import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// In-memory pointer for round-robin within each specialization.
// Note: not shared across multiple server instances; for multi-instance deployments
// you should persist the pointer in the database.
const nextIndexBySpecialization = new Map();
const rrLocks = new Map();

const withRoundRobinLock = async (specializationId, fn) => {
  const prev = rrLocks.get(specializationId) || Promise.resolve();
  let release;
  const next = new Promise((resolve) => {
    release = resolve;
  });
  rrLocks.set(specializationId, prev.then(() => next));
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (rrLocks.get(specializationId) === next) rrLocks.delete(specializationId);
  }
};

export const assignTicketRoundRobin = async (specializationId, excludeTechnicianId = null) => {
  if (!specializationId) return null;

  return withRoundRobinLock(specializationId, async () => {
    const technicians = await prisma.user.findMany({
      where: {
        role: { in: ['TECHNICIAN', 'IT_ADMIN'] },
        specializationId,
        isOnline: true,
        ...(excludeTechnicianId ? { id: { not: excludeTechnicianId } } : {})
      },
      orderBy: { createdAt: 'asc' }
    });

    if (technicians.length === 0) return null;

    const currentIndex = nextIndexBySpecialization.get(specializationId) ?? 0;
    const picked = technicians[currentIndex % technicians.length];

    // Advance pointer for next assignment.
    nextIndexBySpecialization.set(specializationId, currentIndex + 1);
    return picked;
  });
};

