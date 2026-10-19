'use strict';

/**
 * Request schemas.
 *
 * Convention: the REST API speaks in *human units* — dollars as decimals and
 * rates as percentages — because that is what a client, a cURL user or a
 * Postman user actually types. Storage is integer cents and basis points, and
 * the conversion happens in the controllers:
 *
 *     dollars -> cents : Math.round(value * 100)
 *     percent -> bps   : Math.round(value * 100)
 *
 * Every response that carries money or rates also returns the converted
 * `...Cents` / `...Bps` fields so clients never have to guess the rounding.
 */

const { z } = require('zod');

const DEBT_TYPES = ['CREDIT_CARD', 'STUDENT_LOAN', 'AUTO_LOAN', 'MORTGAGE', 'PERSONAL_LOAN', 'MEDICAL', 'OTHER'];
const TX_TYPES = ['INCOME', 'EXPENSE', 'PAYMENT'];
const TX_STATUSES = ['COMPLETED', 'PENDING'];

const money = (label) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number` })
    .finite(`${label} must be a finite number`)
    .min(0, `${label} cannot be negative`)
    .max(1_000_000_000, `${label} is unrealistically large`);

const positiveMoney = (label) => money(label).gt(0, `${label} must be greater than zero`);

const rate = (label) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number` })
    .finite()
    .min(0, `${label} cannot be negative`)
    .max(100, `${label} cannot exceed 100%`);

const optionalText = (max) => z.string().trim().max(max).optional().nullable();

// --- auth ------------------------------------------------------------------
const registerSchema = z.object({
  username: z.string().trim().min(2, 'Username must be at least 2 characters').max(60, 'Username is too long'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), {
      message: 'Password must contain at least one letter and one number',
    }),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
});

const resetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  code: z.string().trim().length(6, 'Enter the 6-digit code').regex(/^\d+$/, 'Enter the 6-digit code'),
  newPassword: registerSchema.shape.password,
});

const verifyEmailSchema = z.object({
  code: z.string().trim().length(6, 'Enter the 6-digit code').regex(/^\d+$/, 'Enter the 6-digit code'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: registerSchema.shape.password,
});

const updateProfileSchema = z
  .object({
    username: z.string().trim().min(2).max(60).optional(),
    mobile: optionalText(30),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .length(3, 'Use a 3-letter currency code')
      .regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code')
      .optional(),
    extraMonthlyPayment: money('Extra monthly payment').max(100_000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'No changes were provided' });

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required to confirm deletion'),
});

// --- debts -----------------------------------------------------------------
const createDebtSchema = z.object({
  name: z.string().trim().min(1, 'Give the account a name').max(80),
  type: z.enum(DEBT_TYPES).default('OTHER'),
  balance: positiveMoney('Balance'),
  apr: rate('Interest rate'),
  minPayment: positiveMoney('Minimum payment'),
  creditLimit: money('Credit limit').optional().nullable(),
  dueDay: z.coerce.number().int().min(1).max(31).optional().nullable(),
  notes: optionalText(500),
});

const updateDebtSchema = createDebtSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: 'No changes were provided',
});

const strategyQuerySchema = z.object({
  strategy: z.enum(['avalanche', 'snowball', 'both']).default('both'),
  extra: money('Extra monthly payment').max(100_000).optional(),
  scenarios: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

// --- transactions ----------------------------------------------------------
const createTransactionSchema = z.object({
  description: z.string().trim().min(1, 'Add a description').max(140),
  amount: z.coerce
    .number({ invalid_type_error: 'Amount must be a number' })
    .finite()
    .refine((v) => v !== 0, { message: 'Amount cannot be zero' }),
  category: z.string().trim().min(1, 'Add a category').max(60),
  type: z.enum(TX_TYPES).optional(),
  status: z.enum(TX_STATUSES).default('COMPLETED'),
  occurredAt: z.coerce.date().optional(),
  debtId: z.string().uuid('Unknown account reference').optional().nullable(),
});

const updateTransactionSchema = createTransactionSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: 'No changes were provided',
});

const listTransactionsQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
  category: z.string().trim().max(60).optional(),
  type: z.enum(TX_TYPES).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sort: z.enum(['newest', 'oldest', 'largest']).default('newest'),
});

const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

module.exports = {
  DEBT_TYPES,
  TX_TYPES,
  TX_STATUSES,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  changePasswordSchema,
  updateProfileSchema,
  deleteAccountSchema,
  createDebtSchema,
  updateDebtSchema,
  strategyQuerySchema,
  createTransactionSchema,
  updateTransactionSchema,
  listTransactionsQuerySchema,
  paginationQuerySchema,
};
