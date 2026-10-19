import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 configuration.
 *
 * The CLI reads its connection details from here (the `url` property is no
 * longer allowed in schema.prisma). At runtime the API passes the same URL to
 * the `@prisma/adapter-pg` driver adapter — see src/lib/prisma.js.
 *
 * The datasource block is added only when DATABASE_URL is present: `prisma
 * generate` (which runs on every `npm ci` via postinstall) needs no database,
 * so a fresh checkout or a CI runner without secrets still works. Migrate and
 * seed commands will surface Prisma's own "missing DATABASE_URL" error instead.
 */
const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.js',
  },
  ...(databaseUrl ? { datasource: { url: databaseUrl } } : {}),
});
