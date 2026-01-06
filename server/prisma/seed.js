import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');
    console.log('📡 Connecting to database...\n');

    try {
        // Test database connection
        await prisma.$connect();
        console.log('✅ Database connected successfully\n');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('   Please check your DATABASE_URL in .env file');
        process.exit(1);
    }

    // Create Super Admin
    console.log('👤 Creating Super Admin...');
    const superAdminPassword = await bcrypt.hash('admin123', 10);

    try {
        const superAdmin = await prisma.user.upsert({
            where: { email: 'admin@ticketing.com' },
            update: {
                password: superAdminPassword,
                role: 'SUPER_ADMIN'
            },
            create: {
                email: 'admin@ticketing.com',
                password: superAdminPassword,
                name: 'Super Admin',
                role: 'SUPER_ADMIN'
            }
        });

        console.log('✅ Super Admin created/updated:', superAdmin.email);
        console.log('   Email: admin@ticketing.com');
        console.log('   Password: admin123');
        console.log('   Role: SUPER_ADMIN');
        console.log('   ⚠️  Please change the password after first login!\n');
    } catch (error) {
        console.error('❌ Error creating Super Admin:', error.message);
        throw error;
    }

    // Create default specializations
    const specializations = [
        {
            name: 'Help Desk',
            description: 'مشاكل الكمبيوتر/إيميل/برمجيات بسيطة'
        },
        {
            name: 'Network',
            description: 'مشاكل السيرفر، الإنترنت، VPN'
        },
        {
            name: 'Server/Admin',
            description: 'قواعد البيانات، السيرفرات، إعدادات النظام'
        }
    ];

    for (const spec of specializations) {
        const specialization = await prisma.specialization.upsert({
            where: { name: spec.name },
            update: {},
            create: spec
        });
        console.log(`✅ Specialization created: ${specialization.name}`);
    }

    // Create sample IT Manager
    const managerPassword = await bcrypt.hash('manager123', 10);
    const manager = await prisma.user.upsert({
        where: { email: 'manager@ticketing.com' },
        update: {},
        create: {
            email: 'manager@ticketing.com',
            password: managerPassword,
            name: 'IT Manager',
            role: 'IT_MANAGER'
        }
    });
    console.log('✅ IT Manager created:', manager.email);
    console.log('   Email: manager@ticketing.com');
    console.log('   Password: manager123');

    // Create sample IT Admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'itadmin@ticketing.com' },
        update: {},
        create: {
            email: 'itadmin@ticketing.com',
            password: adminPassword,
            name: 'IT Admin',
            role: 'IT_ADMIN'
        }
    });
    console.log('✅ IT Admin created:', admin.email);
    console.log('   Email: itadmin@ticketing.com');
    console.log('   Password: admin123');

    // Get specializations for technicians
    const helpDeskSpec = await prisma.specialization.findUnique({
        where: { name: 'Help Desk' }
    });
    const networkSpec = await prisma.specialization.findUnique({
        where: { name: 'Network' }
    });

    // Create sample Technicians
    const technicians = [
        {
            email: 'technician1@ticketing.com',
            name: 'Technician 1',
            specializationId: helpDeskSpec?.id,
            password: await bcrypt.hash('tech123', 10)
        },
        {
            email: 'technician2@ticketing.com',
            name: 'Technician 2',
            specializationId: networkSpec?.id,
            password: await bcrypt.hash('tech123', 10)
        }
    ];

    for (const tech of technicians) {
        const technician = await prisma.user.upsert({
            where: { email: tech.email },
            update: {},
            create: {
                email: tech.email,
                password: tech.password,
                name: tech.name,
                role: 'TECHNICIAN',
                specializationId: tech.specializationId,
                status: 'AVAILABLE'
            }
        });
        console.log(`✅ Technician created: ${technician.email}`);
    }

    console.log('\n📋 Summary:');
    console.log('   Super Admin: admin@ticketing.com / admin123');
    console.log('   IT Manager: manager@ticketing.com / manager123');
    console.log('   IT Admin: itadmin@ticketing.com / admin123');
    console.log('   Technician 1: technician1@ticketing.com / tech123');
    console.log('   Technician 2: technician2@ticketing.com / tech123');
    console.log('\n✅ Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

