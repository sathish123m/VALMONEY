'use strict';

/**
 * API-level tests.
 *
 * These mount the real Express app but never touch the database: every case here
 * is about contract and guard behaviour (status codes, error shapes, auth,
 * validation, CORS) which must hold even when Postgres is unreachable.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://valmoney:valmoney@localhost:5433/valmoney';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-that-is-definitely-long-enough-1234567890';

const { createApp } = require('../src/app');
const { signAccessToken } = require('../src/utils/tokens');
const { toCsv, escapeField } = require('../src/services/csv');
const { parseReceiptName } = require('../src/services/receiptParser');
const { scoreFinancialHealth } = require('../src/services/health');

const app = createApp();

test('health endpoint reports service status without auth', async () => {
  const res = await request(app).get('/api/health').expect(200);
  assert.equal(res.body.status, 'ok');
  assert.match(res.body.time, /^\d{4}-\d{2}-\d{2}T/);
});

test('unknown routes return a structured 404, not an HTML page', async () => {
  const res = await request(app).get('/api/does-not-exist').expect(404);
  assert.match(res.body.error, /No route matches GET \/api\/does-not-exist/);
});

test('a protected route without a token is rejected', async () => {
  const res = await request(app).get('/api/dashboard').expect(401);
  assert.match(res.body.error, /Authentication required/i);
});

test('a tampered token is rejected', async () => {
  const valid = signAccessToken('11111111-1111-4111-8111-111111111111');
  const res = await request(app)
    .get('/api/dashboard')
    .set('Authorization', `Bearer ${valid.slice(0, -3)}xyz`)
    .expect(401);
  assert.match(res.body.error, /Invalid authentication token/i);
});

test('the legacy auth-token header still authenticates', async () => {
  const token = signAccessToken('11111111-1111-4111-8111-111111111111');
  // Reaches the controller, which then fails on the (absent) database rather
  // than on authentication — proving the header was accepted.
  const res = await request(app).get('/api/dashboard').set('auth-token', token);
  assert.notEqual(res.status, 401);
});

test('registration rejects a weak password with field-level detail', async () => {
  const res = await request(app)
    .post('/api/user/register')
    .send({ username: 'A', email: 'not-an-email', password: 'short' })
    .expect(422);

  assert.equal(res.body.error, 'Validation failed.');
  const fields = res.body.details.map((d) => d.field);
  assert.ok(fields.includes('username'));
  assert.ok(fields.includes('email'));
  assert.ok(fields.includes('password'));
});

test('registration requires a letter and a number in the password', async () => {
  const res = await request(app)
    .post('/api/user/register')
    .send({ username: 'Planner', email: 'person@example.com', password: 'alllowercase' })
    .expect(422);

  assert.ok(res.body.details.some((d) => /letter and one number/.test(d.message)));
});

test('login rejects an unknown payload shape before hitting the database', async () => {
  const res = await request(app).post('/api/user/login').send({ email: 'nope' }).expect(422);
  assert.equal(res.body.details[0].field, 'email');
});

test('debt creation validates money fields without touching the database', async () => {
  const token = signAccessToken('11111111-1111-4111-8111-111111111111');
  const res = await request(app)
    .post('/api/debts')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Card', balance: -5, apr: 400, minPayment: 0 })
    .expect(422);

  const fields = res.body.details.map((d) => d.field);
  assert.ok(fields.includes('balance'));
  assert.ok(fields.includes('apr'));
  assert.ok(fields.includes('minPayment'));
});

test('the strategy endpoint rejects an unknown strategy', async () => {
  const token = signAccessToken('11111111-1111-4111-8111-111111111111');
  const res = await request(app)
    .get('/api/debts/strategy?strategy=guesswork')
    .set('Authorization', `Bearer ${token}`)
    .expect(422);
  assert.equal(res.body.details[0].field, 'strategy');
});

test('CORS allows the configured SPA origin and blocks others', async () => {
  const allowed = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
  assert.equal(allowed.headers['access-control-allow-origin'], 'http://localhost:5173');

  const blocked = await request(app).get('/api/health').set('Origin', 'https://evil.example.com');
  assert.notEqual(blocked.headers['access-control-allow-origin'], 'https://evil.example.com');
});

// --- services --------------------------------------------------------------

test('CSV output escapes commas, quotes and newlines', () => {
  const csv = toCsv(['Name', 'Amount'], [['Salary, June', '120.00'], ['He said "hi"', '5.00'], ['Line\nbreak', '1.00']]);
  assert.ok(csv.includes('"Salary, June"'));
  assert.ok(csv.includes('"He said ""hi"""'));
  assert.ok(csv.includes('"Line\nbreak"'));
  assert.ok(csv.startsWith('\uFEFF'));
});

test('CSV escapeField leaves simple values untouched', () => {
  assert.equal(escapeField('Groceries'), 'Groceries');
  assert.equal(escapeField(12.5), '12.5');
  assert.equal(escapeField(null), '');
});

test('receipt parser extracts vendor, total and date from a descriptive name', () => {
  const parsed = parseReceiptName('2026-01-14-starbucks-12.50.jpg');
  assert.equal(parsed.vendor, 'Starbucks');
  assert.equal(parsed.totalCents, 1250);
  assert.equal(parsed.confidence, 'high');
  assert.equal(parsed.occurredOn.toISOString().slice(0, 10), '2026-01-14');
});

test('receipt parser handles comma decimals and invent no data', () => {
  assert.equal(parseReceiptName('receipt-lidl-8,75.png').totalCents, 875);
  const unknown = parseReceiptName('scan.pdf');
  assert.equal(unknown.totalCents, null);
  assert.equal(unknown.vendor, null);
  assert.equal(unknown.confidence, 'low');
});

test('receipt parser drops amounts and "total" from the vendor name', () => {
  const parsed = parseReceiptName('Staples Receipt 2026-10-04 total 148.90.jpg');
  assert.equal(parsed.vendor, 'Staples');
  assert.equal(parsed.totalCents, 14_890);
  assert.equal(parsed.occurredOn.toISOString().slice(0, 10), '2026-10-04');
  assert.equal(parseReceiptName('invoice-shell-amount-52.40.pdf').vendor, 'Shell');
});

test('health score rewards paying debt down and penalises a stalled plan', () => {
  const healthy = scoreFinancialHealth({
    totalBalanceCents: 200_000,
    revolvingBalanceCents: 20_000,
    revolvingLimitCents: 800_000,
    monthlyInterestCents: 3_000,
    monthlyIncomeCents: 600_000,
    monthlyExpenseCents: 250_000,
    monthlyPaymentCents: 60_000,
    payoffMonths: 18,
    stalled: false,
  });

  const struggling = scoreFinancialHealth({
    totalBalanceCents: 5_000_000,
    revolvingBalanceCents: 900_000,
    revolvingLimitCents: 1_000_000,
    monthlyInterestCents: 90_000,
    monthlyIncomeCents: 400_000,
    monthlyExpenseCents: 380_000,
    monthlyPaymentCents: 20_000,
    payoffMonths: 600,
    stalled: true,
  });

  assert.ok(healthy.score > struggling.score, 'a healthier position must score higher');
  assert.ok(healthy.score >= 60 && healthy.score <= 100);
  assert.ok(struggling.score < 50);
  assert.ok(struggling.tips.length > 0, 'a struggling position should produce actionable tips');
  assert.equal(struggling.factors.reduce((sum, f) => sum + f.weight, 0), 100, 'factor weights normalise to 100%');
});

test('health score reports no data instead of inventing a score', () => {
  const empty = scoreFinancialHealth({});
  assert.equal(empty.hasData, false);
  assert.equal(empty.score, 0);
});
