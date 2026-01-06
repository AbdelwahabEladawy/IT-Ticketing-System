import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createAuditLog = async (action, description, userId = null, ticketId = null, metadata = null) => {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        description,
        userId,
        ticketId,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
};

