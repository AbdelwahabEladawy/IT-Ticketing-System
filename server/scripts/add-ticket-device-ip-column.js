import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addTicketDeviceIpColumn() {
  try {
    console.log('Ensuring deviceIp column exists on Ticket table...');

    const columnCheck = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'Ticket' AND column_name = 'deviceIp'
    `;

    if (columnCheck.length === 0) {
      await prisma.$executeRaw`
        ALTER TABLE "Ticket" ADD COLUMN "deviceIp" TEXT
      `;
      console.log('Added deviceIp column successfully');
    } else {
      console.log('deviceIp column already exists');
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addTicketDeviceIpColumn();
