'use strict';

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const { env } = require('../config/env');

/**
 * Prisma 7 no longer reads a connection URL from schema.prisma — the runtime
 * gets its connection through a driver adapter instead. `pg` pools the sockets
 * for us, so a single PrismaClient instance is shared process-wide.
 */
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  // TLS is negotiated from the connection string (`?sslmode=require`), which is
  // what every hosted Postgres provider hands out.
  max: env.isTest ? 2 : 10,
  connectionTimeoutMillis: 10_000,
});

const prisma = new PrismaClient({
  adapter,
  log: env.isProduction ? ['warn', 'error'] : ['warn', 'error'],
});

module.exports = { prisma };
