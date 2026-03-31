import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Assign IT Admin specialization to IT_ADMIN users who don't have a specialization
 * This script helps fix existing IT_ADMIN users who should have the "IT Admin" specialization
 */
async function assignSpecialization() {
  try {
    console.log('🔍 Finding IT Admin specialization...');

    const itAdminSpec = await prisma.specialization.findUnique({
      where: { name: 'IT Admin' }
    });

    if (!itAdminSpec) {
      console.error('❌ IT Admin specialization not found!');
      console.log('Creating IT Admin specialization...');
      const newSpec = await prisma.specialization.create({
        data: {
          name: 'IT Admin',
          description: 'IT Administration for hardware requests, asset management, and employee setup'
        }
      });
      console.log('✅ Created IT Admin specialization');

      // Update IT_ADMIN users
      const result = await prisma.user.updateMany({
        where: {
          role: 'IT_ADMIN',
          specializationId: null
        },
        data: {
          specializationId: newSpec.id,
          status: 'AVAILABLE'
        }
      });

      console.log(`✅ Updated ${result.count} IT_ADMIN users with IT Admin specialization`);
    } else {
      console.log('✅ Found IT Admin specialization (ID: ' + itAdminSpec.id + ')');

      // Update IT_ADMIN users without specialization
      const result = await prisma.user.updateMany({
        where: {
          role: 'IT_ADMIN',
          specializationId: null
        },
        data: {
          specializationId: itAdminSpec.id,
          status: 'AVAILABLE'
        }
      });

      console.log(`✅ Updated ${result.count} IT_ADMIN users with IT Admin specialization`);
    }

    // Show updated users
    const updatedUsers = await prisma.user.findMany({
      where: {
        role: 'IT_ADMIN',
        specializationId: { not: null }
      },
      include: {
        specialization: true
      }
    });

    console.log('\n📋 IT_ADMIN users with specialization:');
    updatedUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email})`);
      console.log(`     Specialization: ${user.specialization?.name || 'None'}`);
      console.log(`     Status: ${user.status || 'None'}`);
    });

    console.log('\n✅ Script completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

assignSpecialization();

