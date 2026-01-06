import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...\n');

    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected\n');

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    if (users.length === 0) {
      console.log('❌ No users found in database!');
      console.log('   Run: cd server && npm run seed\n');
    } else {
      console.log(`✅ Found ${users.length} user(s):\n`);
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Created: ${user.createdAt}\n`);
      });
    }

    // Check specifically for admin
    console.log('🔍 Checking for admin user...');
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@ticketing.com' }
    });

    if (admin) {
      console.log('✅ Admin user exists!');
      console.log(`   Email: ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Name: ${admin.name}`);
      console.log(`   Has password: ${admin.password ? 'Yes (hashed)' : 'No'}`);
      console.log(`   Created: ${admin.createdAt}\n`);
    } else {
      console.log('❌ Admin user NOT found!');
      console.log('   Expected email: admin@ticketing.com');
      console.log('   Run: cd server && npm run seed\n');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'P1001') {
      console.error('   Database connection failed. Check your DATABASE_URL in .env');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
