import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function fixAdmin() {
  try {
    console.log('🔍 Checking for admin user...\n');

    // Check if admin exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@ticketing.com' }
    });

    if (existingAdmin) {
      console.log('✅ Admin user found!');
      console.log(`   ID: ${existingAdmin.id}`);
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Name: ${existingAdmin.name}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log(`   Has password: ${existingAdmin.password ? 'Yes (hashed)' : 'No'}\n`);

      // Test password
      const testPassword = 'admin123';
      const isValid = await bcrypt.compare(testPassword, existingAdmin.password);
      
      if (isValid) {
        console.log('✅ Password is correct!');
        console.log('   You should be able to login with:');
        console.log('   Email: admin@ticketing.com');
        console.log('   Password: admin123\n');
      } else {
        console.log('❌ Password is INCORRECT!');
        console.log('   Resetting password...\n');
        
        const newPassword = await bcrypt.hash('admin123', 10);
        await prisma.user.update({
          where: { id: existingAdmin.id },
          data: { password: newPassword }
        });
        
        console.log('✅ Password reset successfully!');
        console.log('   You can now login with:');
        console.log('   Email: admin@ticketing.com');
        console.log('   Password: admin123\n');
      }
    } else {
      console.log('❌ Admin user NOT found!');
      console.log('   Creating new admin user...\n');

      const password = 'admin123';
      const hashedPassword = await bcrypt.hash(password, 10);

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
      console.log('\n✅ You can now login with:');
      console.log('   Email: admin@ticketing.com');
      console.log('   Password: admin123\n');
    }

    // Also check all users
    console.log('\n📋 All users in database:');
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      },
      orderBy: { createdAt: 'asc' }
    });

    if (allUsers.length === 0) {
      console.log('   No users found!');
    } else {
      allUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name} (${user.email}) - ${user.role}`);
      });
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'P1001') {
      console.error('   Database connection failed. Check your DATABASE_URL in .env');
    } else {
      console.error('   Full error:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

fixAdmin();

