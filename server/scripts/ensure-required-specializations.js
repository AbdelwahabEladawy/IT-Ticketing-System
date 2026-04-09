import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Ensure required specializations exist for issue type routing
 * These specializations are mapped in issueTypeMapping.js:
 * - Help Desk (for IT_HELP_DESK issues)
 * - IT Admin (for IT_ADMIN issues)
 * - Network (for NETWORK_ENGINEER issues)
 * - Software Engineering (for SOFTWARE / PROGRAMMING issues)
 */
async function ensureSpecializations() {
  try {
    const requiredSpecializations = [
      { name: 'Help Desk', description: 'IT Help Desk support for access, software, licenses, and device issues' },
      { name: 'IT Admin', description: 'IT Administration for hardware requests, asset management, and employee setup' },
      { name: 'Network', description: 'Network engineering for internet, WiFi, LAN, and router issues' },
      { name: 'Software Engineering', description: 'Software engineering support for application issues, bugs, and programming-related requests' }
    ];

    console.log('Ensuring required specializations exist...');

    for (const spec of requiredSpecializations) {
      const existing = await prisma.specialization.findUnique({
        where: { name: spec.name }
      });

      if (!existing) {
        await prisma.specialization.create({
          data: spec
        });
        console.log(`Created specialization: ${spec.name}`);
      } else {
        console.log(`Specialization already exists: ${spec.name}`);
      }
    }

    console.log('All required specializations are available!');
  } catch (error) {
    console.error('Error ensuring specializations:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

ensureSpecializations();

