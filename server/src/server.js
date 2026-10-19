'use strict';

const { createApp } = require('./app');
const { env } = require('./config/env');
const { prisma } = require('./lib/prisma');
const { verifyTransport } = require('./lib/mailer');

async function main() {
  // Fail fast with a clear message if the database is unreachable, rather than
  // accepting traffic and throwing on the first query.
  await prisma.$connect();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`✅ VALMONEY API listening on port ${env.PORT} (${env.NODE_ENV})`);
    console.log(`   allowed origins: ${env.clientOrigins.join(', ')}`);
  });

  void verifyTransport();

  const shutdown = (signal) => {
    console.log(`\n${signal} received — shutting down gracefully…`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    // Don't hang forever on a stuck connection.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  console.error('✖ Failed to start VALMONEY API:', error.message);
  if (error.message.includes('DATABASE_URL')) {
    console.error('  Set DATABASE_URL in server/.env — see server/.env.example.');
  }
  process.exit(1);
});
