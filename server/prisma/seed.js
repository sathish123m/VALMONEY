'use strict';

/**
 * Seed script — `npm run db:seed`
 *
 * Creates (or refreshes) a demo account with a realistic mixed portfolio so the
 * dashboard has something meaningful to show on a fresh database.
 *
 *   email:    demo@valmoney.app
 *   password: Demo1234
 *
 * Idempotent: re-running replaces the demo user's data rather than duplicating.
 */

const bcrypt = require('bcryptjs');
// Reuse the app's client so the seed picks up the same driver adapter config.
const { prisma } = require('../src/lib/prisma');

const DEMO_EMAIL = 'demo@valmoney.app';

const DEBTS = [
  { name: 'Visa Platinum', type: 'CREDIT_CARD', balanceCents: 482_300, aprBps: 2399, minPaymentCents: 12_500, creditLimitCents: 800_000, dueDay: 14 },
  { name: 'Federal Student Loan', type: 'STUDENT_LOAN', balanceCents: 2_145_000, aprBps: 649, minPaymentCents: 24_000, dueDay: 1 },
  { name: 'Honda Civic Auto Loan', type: 'AUTO_LOAN', balanceCents: 1_320_000, aprBps: 589, minPaymentCents: 31_000, dueDay: 22 },
  { name: 'Medical — City Hospital', type: 'MEDICAL', balanceCents: 187_500, aprBps: 0, minPaymentCents: 7_500, dueDay: 5 },
];

const MONTHS_OF_HISTORY = 6;

/** Build a believable transaction history so the trend charts are not flat. */
function buildTransactions(userId, debtIds) {
  const rows = [];
  const now = new Date();

  // Includes the current month so the dashboard's "this month" panel is not empty.
  for (let back = MONTHS_OF_HISTORY; back >= 0; back -= 1) {
    const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));

    rows.push({
      userId,
      description: 'Salary — Northwind Systems',
      amountCents: 640_000,
      category: 'Salary',
      type: 'INCOME',
      occurredAt: new Date(base.getTime() + 2 * 86_400_000),
    });

    rows.push({
      userId,
      description: 'Rent',
      amountCents: -195_000,
      category: 'Housing',
      type: 'EXPENSE',
      occurredAt: new Date(base.getTime() + 3 * 86_400_000),
    });

    rows.push({
      userId,
      description: 'Groceries',
      amountCents: -58_000 - back * 1_100,
      category: 'Food',
      type: 'EXPENSE',
      occurredAt: new Date(base.getTime() + 8 * 86_400_000),
    });

    rows.push({
      userId,
      description: 'Utilities',
      amountCents: -14_500,
      category: 'Utilities',
      type: 'EXPENSE',
      occurredAt: new Date(base.getTime() + 11 * 86_400_000),
    });

    rows.push({
      userId,
      description: 'Visa Platinum minimum',
      amountCents: -12_500,
      category: 'Debt payment',
      type: 'PAYMENT',
      debtId: debtIds[0],
      occurredAt: new Date(base.getTime() + 14 * 86_400_000),
    });

    rows.push({
      userId,
      description: 'Student loan payment',
      amountCents: -24_000,
      category: 'Debt payment',
      type: 'PAYMENT',
      debtId: debtIds[1],
      occurredAt: new Date(base.getTime() + 1 * 86_400_000),
    });
  }

  return rows;
}

async function main() {
  const passwordHash = await bcrypt.hash('Demo1234', 10);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash, emailVerified: true },
    create: {
      email: DEMO_EMAIL,
      username: 'Demo Planner',
      passwordHash,
      currency: 'USD',
      emailVerified: true,
      extraMonthlyPaymentCents: 30_000, // $300/month on top of minimums
    },
  });

  // Start from a clean slate for this user so the script is re-runnable.
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.debt.deleteMany({ where: { userId: user.id } });

  const debtIds = [];
  for (const debt of DEBTS) {
    const created = await prisma.debt.create({ data: { ...debt, userId: user.id } });
    debtIds.push(created.id);
  }

  await prisma.transaction.createMany({ data: buildTransactions(user.id, debtIds) });

  const totals = DEBTS.reduce((sum, d) => sum + d.balanceCents, 0);
  console.log('✅ Seeded demo account');
  console.log(`   email:    ${DEMO_EMAIL}`);
  console.log('   password: Demo1234');
  console.log(`   ${DEBTS.length} accounts · $${(totals / 100).toLocaleString('en-US')} total debt`);
}

main()
  .catch((error) => {
    console.error('✖ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
