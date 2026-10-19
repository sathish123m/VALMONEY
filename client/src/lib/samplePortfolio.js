/**
 * A representative portfolio used by the marketing pages.
 *
 * These are the same four accounts the API seed creates for the demo login, so
 * the numbers a visitor plays with on the landing page match what they see in
 * the product afterwards. Amounts are in dollars / percent — the shape the REST
 * API accepts.
 */

export const SAMPLE_DEBTS = [
  { id: 'visa', name: 'Visa Platinum', balance: 4823, apr: 23.99, minPayment: 125 },
  { id: 'student', name: 'Federal Student Loan', balance: 21450, apr: 6.49, minPayment: 240 },
  { id: 'auto', name: 'Honda Civic Auto Loan', balance: 13200, apr: 5.89, minPayment: 310 },
  { id: 'medical', name: 'Medical — City Hospital', balance: 1875, apr: 0, minPayment: 75 },
];

export const SAMPLE_EXTRA_MONTHLY = 300;

export const SAMPLE_TOTAL_BALANCE = SAMPLE_DEBTS.reduce((sum, d) => sum + d.balance, 0);
