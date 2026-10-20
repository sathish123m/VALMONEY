'use strict';

// `quiet: true` suppresses dotenv's banner — the API already logs what it needs.
require('dotenv').config({ quiet: true });
const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required (PostgreSQL connection string)'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters — generate one with `node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"`'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  // Outbound email: an HTTPS API (`resend` | `sendgrid` | `brevo`) works on
  // hosts that block SMTP ports, such as Render's free plan. SMTP stays
  // supported for self-hosted setups and local Mailhog-style catchers.
  MAIL_PROVIDER: z.enum(['smtp', 'resend', 'sendgrid', 'brevo']).optional(),
  MAIL_API_KEY: z.string().optional(),
  MAIL_HOST: z.string().optional(),
  MAIL_PORT: z.coerce.number().int().positive().default(587),
  MAIL_SECURE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  MAIL_USER: z.string().optional(),
  MAIL_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(10),
  AUTO_SEED: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.') || 'env'}: ${i.message}`).join('\n');
  // Fail loudly on boot rather than shipping a half-configured API.
  console.error(`\n✖ Invalid environment configuration:\n${issues}\n`);
  console.error('  Copy server/.env.example to server/.env and fill it in.\n');
  process.exit(1);
}

const env = parsed.data;

env.isProduction = env.NODE_ENV === 'production';
env.isTest = env.NODE_ENV === 'test';
env.clientOrigins = env.CLIENT_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean);
const apiProvider = ['resend', 'sendgrid', 'brevo'].includes(env.MAIL_PROVIDER) ? env.MAIL_PROVIDER : null;
const smtpReady = Boolean(env.MAIL_HOST && env.MAIL_USER && env.MAIL_PASS);

if (apiProvider && env.MAIL_API_KEY && env.MAIL_FROM) {
  env.mailProvider = apiProvider;
} else if (apiProvider) {
  env.mailProvider = 'log';
  const missing = [!env.MAIL_API_KEY && 'MAIL_API_KEY', !env.MAIL_FROM && 'MAIL_FROM'].filter(Boolean);
  console.warn(`⚠  ${env.MAIL_PROVIDER} is selected but ${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} unset — email will only be logged.`);
} else if (smtpReady && env.MAIL_FROM) {
  env.mailProvider = 'smtp';
} else {
  env.mailProvider = 'log';
}
env.mailEnabled = env.mailProvider !== 'log';

if (env.isProduction && !env.mailEnabled) {
  console.warn('⚠  Email is not configured — verification and reset codes will only be logged.');
  console.warn('   Free hosts block SMTP ports; set MAIL_PROVIDER/MAIL_API_KEY/MAIL_FROM to send over HTTPS.');
}

module.exports = { env };
