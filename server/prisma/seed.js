'use strict';

/**
 * Seed script — `npm run db:seed`
 *
 * Creates (or refreshes) the demo portfolio so the dashboard has something
 * meaningful to show on a fresh database:
 *
 *   email:    demo@valmoney.app
 *   password: Demo1234
 *
 * Idempotent: re-running replaces the demo user's data rather than duplicating.
 * The data and the work itself live in src/services/demoSeed.js because the API
 * also seeds itself on first boot when AUTO_SEED is enabled.
 */

const { seedDemo } = require('../src/services/demoSeed');
const { prisma } = require('../src/lib/prisma');

async function main() {
  try {
    const result = await seedDemo();
    if (!result.seeded) console.log(`ℹ Demo seed skipped — ${result.reason}.`);
  } catch (error) {
    console.error('✖ Seed failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
