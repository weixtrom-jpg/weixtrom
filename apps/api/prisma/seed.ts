import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Super Admin
  const hashedPassword = await bcrypt.hash('Admin123!', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@weixtrom.com' },
    update: {},
    create: {
      email: 'admin@weixtrom.com',
      passwordHash: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });

  console.log(`Super Admin created: ${superAdmin.email}`);

  // Demo Client
  const demoClient = await prisma.user.upsert({
    where: { email: 'cliente@demo.com' },
    update: {},
    create: {
      email: 'cliente@demo.com',
      passwordHash: hashedPassword,
      firstName: 'Carlos',
      lastName: 'Demo',
      phone: '3001234567',
      role: Role.CLIENT,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });

  console.log(`Demo Client created: ${demoClient.email}`);

  // Demo Workshop Admin
  const workshopAdmin = await prisma.user.upsert({
    where: { email: 'taller@demo.com' },
    update: {},
    create: {
      email: 'taller@demo.com',
      passwordHash: hashedPassword,
      firstName: 'Laura',
      lastName: 'Taller',
      role: Role.WORKSHOP_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });

  // Demo Workshop
  await prisma.workshop.upsert({
    where: { adminId: workshopAdmin.id },
    update: {},
    create: {
      name: 'Taller Demo Bucaramanga',
      address: 'Calle 45 #23-10, Bucaramanga',
      phone: '3109876543',
      city: 'Bucaramanga',
      isVerified: true,
      adminId: workshopAdmin.id,
    },
  });

  console.log(`Demo Workshop Admin created: ${workshopAdmin.email}`);

  // Demo Supplier Admin
  const supplierAdmin = await prisma.user.upsert({
    where: { email: 'proveedor@demo.com' },
    update: {},
    create: {
      email: 'proveedor@demo.com',
      passwordHash: hashedPassword,
      firstName: 'Miguel',
      lastName: 'Repuestos',
      role: Role.SUPPLIER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });

  // Demo Supplier
  await prisma.supplier.upsert({
    where: { adminId: supplierAdmin.id },
    update: {},
    create: {
      name: 'Repuestos Demo SAS',
      address: 'Av 33 #15-20, Bucaramanga',
      phone: '3201112233',
      city: 'Bucaramanga',
      isVerified: true,
      adminId: supplierAdmin.id,
    },
  });

  console.log(`Demo Supplier Admin created: ${supplierAdmin.email}`);

  // Demo Technician
  const technician = await prisma.user.upsert({
    where: { email: 'tecnico@demo.com' },
    update: {},
    create: {
      email: 'tecnico@demo.com',
      passwordHash: hashedPassword,
      firstName: 'Andres',
      lastName: 'Tecnico',
      role: Role.TECHNICIAN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });

  console.log(`Demo Technician created: ${technician.email}`);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
