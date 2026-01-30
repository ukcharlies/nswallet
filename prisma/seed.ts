import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../src/common/utils/password.utils';

const prisma = new PrismaClient();

/**
 * Database seed script
 * Creates initial test data for development
 *
 * Run: npx prisma db seed
 */
async function main() {
  console.log('🌱 Seeding database...');

  // Create test admin user
  const adminPassword = await hashPassword('AdminPassword123!');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@nswallet.com' },
    update: {},
    create: {
      email: 'admin@nswallet.com',
      passwordHash: adminPassword,
      name: 'Admin User',
      roles: [Role.USER, Role.ADMIN],
      isEmailVerified: true,
    },
  });
  console.log(`✅ Created admin user: ${admin.email}`);

  // Create test regular user
  const userPassword = await hashPassword('UserPassword123!');
  const user = await prisma.user.upsert({
    where: { email: 'user@nswallet.com' },
    update: {},
    create: {
      email: 'user@nswallet.com',
      passwordHash: userPassword,
      name: 'Test User',
      roles: [Role.USER],
      isEmailVerified: true,
    },
  });
  console.log(`✅ Created test user: ${user.email}`);

  // Create wallets for test user
  const ngnWallet = await prisma.wallet.upsert({
    where: {
      userId_name_currency: {
        userId: user.id,
        name: 'Primary NGN Wallet',
        currency: 'NGN',
      },
    },
    update: {},
    create: {
      name: 'Primary NGN Wallet',
      currency: 'NGN',
      balance: 100000, // 100,000 NGN initial balance
      userId: user.id,
    },
  });
  console.log(`✅ Created NGN wallet with balance: ${ngnWallet.balance}`);

  const usdWallet = await prisma.wallet.upsert({
    where: {
      userId_name_currency: {
        userId: user.id,
        name: 'USD Savings',
        currency: 'USD',
      },
    },
    update: {},
    create: {
      name: 'USD Savings',
      currency: 'USD',
      balance: 500, // $500 initial balance
      userId: user.id,
    },
  });
  console.log(`✅ Created USD wallet with balance: ${usdWallet.balance}`);

  // Create some sample transactions
  await prisma.transaction.createMany({
    data: [
      {
        walletId: ngnWallet.id,
        type: 'CREDIT',
        amount: 50000,
        balanceBefore: 50000,
        balanceAfter: 100000,
        reference: 'SEED-TXN-001',
        description: 'Initial deposit',
        performedByUserId: user.id,
      },
      {
        walletId: usdWallet.id,
        type: 'CREDIT',
        amount: 500,
        balanceBefore: 0,
        balanceAfter: 500,
        reference: 'SEED-TXN-002',
        description: 'Initial deposit',
        performedByUserId: user.id,
      },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Created sample transactions');

  console.log('');
  console.log('🎉 Database seeded successfully!');
  console.log('');
  console.log('Test Credentials:');
  console.log('-------------------');
  console.log('Admin: admin@nswallet.com / AdminPassword123!');
  console.log('User:  user@nswallet.com / UserPassword123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
