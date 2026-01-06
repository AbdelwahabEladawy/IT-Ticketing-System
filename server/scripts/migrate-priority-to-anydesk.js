import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
  try {
    console.log('Starting migration...');
    
    // Check if priority column exists by trying to query it
    const tickets = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Ticket' AND column_name = 'priority'
    `;
    
    if (tickets.length > 0) {
      console.log('Priority column exists. Migrating...');
      
      // Add anydeskNumber column if it doesn't exist
      await prisma.$executeRaw`
        ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "anydeskNumber" TEXT
      `;
      
      console.log('Added anydeskNumber column');
      
      // Drop priority column
      await prisma.$executeRaw`
        ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "priority"
      `;
      
      console.log('Dropped priority column');
      
      // Try to drop enum (might fail if still referenced)
      try {
        await prisma.$executeRaw`DROP TYPE IF EXISTS "TicketPriority"`;
        console.log('Dropped TicketPriority enum');
      } catch (e) {
        console.log('Could not drop enum (might be in use):', e.message);
      }
    } else {
      console.log('Priority column does not exist. Checking anydeskNumber...');
      
      // Check if anydeskNumber exists
      const anydeskCheck = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'Ticket' AND column_name = 'anydeskNumber'
      `;
      
      if (anydeskCheck.length === 0) {
        await prisma.$executeRaw`
          ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "anydeskNumber" TEXT
        `;
        console.log('Added anydeskNumber column');
      } else {
        console.log('anydeskNumber column already exists');
      }
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrate();

