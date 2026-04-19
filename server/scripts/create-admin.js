import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🔧 Creating Super Admin manually...\n');

    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Delete existing admin if exists
    await prisma.user.deleteMany({
      where: { email: 'admin@ticketing.com' }
    });

    // Create new admin
    const admin = await prisma.user.create({
      data: {
        email: 'admin@ticketing.com',
        password: hashedPassword,
        name: 'Super Admin',
        role: 'SUPER_ADMIN'
      }
    });

    console.log('✅ Super Admin created successfully!');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Password: admin123`);
    console.log('\n✅ You can now login with:');
    console.log('   Email: admin@ticketing.com');
    console.log('   Password: admin123\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'P1001') {
      console.error('   Database connection failed. Check your SERVER_DATABASE_URL in .env');
    }
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();

