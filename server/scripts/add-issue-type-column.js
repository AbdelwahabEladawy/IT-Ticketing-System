import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addIssueTypeColumn() {
  try {
    console.log('Adding issueType column to Ticket table...');
    
    // Check if column exists
    const columnCheck = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Ticket' AND column_name = 'issueType'
    `;
    
    if (columnCheck.length === 0) {
      await prisma.$executeRaw`
        ALTER TABLE "Ticket" ADD COLUMN "issueType" TEXT
      `;
      console.log('Added issueType column successfully');
    } else {
      console.log('issueType column already exists');
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addIssueTypeColumn();

