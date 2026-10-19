'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  simulatePayoff,
  compareStrategies,
  extraPaymentSensitivity,
  monthlyInterestCents,
  normaliseDebts,
  WARNING,
} = require('../src/services/payoff');

const START = new Date('2026-01-15T00:00:00.000Z');

const debt = (over = {}) => ({
  id: over.id ?? 'd1',
  name: over.name ?? 'Card',
  balanceCents: over.balanceCents ?? 100_000,
  aprBps: over.aprBps ?? 1200,
  minPaymentCents: over.minPaymentCents ?? 10_000,
});

test('monthly interest rounds to the nearest cent', () => {
  assert.equal(monthlyInterestCents(100_000, 1200), 1000); // $1000 @ 12% -> $10.00
  assert.equal(monthlyInterestCents(100_000, 1999), 1666); // $1000 @ 19.99% -> $16.66
  assert.equal(monthlyInterestCents(0, 2400), 0);
  assert.equal(monthlyInterestCents(123_45, 0), 0);
});

test('an empty portfolio projects nothing and does not throw', () => {
  const result = simulatePayoff({ debts: [], strategy: 'avalanche', startDate: START });
  assert.equal(result.months, 0);
  assert.equal(result.debtFreeDate, null);
  assert.equal(result.totalInterestCents, 0);
  assert.deepEqual(result.payoffOrder, []);
  assert.equal(result.warnings[0].code, WARNING.NO_DEBTS);
});

test('the ledger balances: payments always equal principal plus interest', () => {
  const result = simulatePayoff({
    debts: [debt(), debt({ id: 'd2', name: 'Loan', balanceCents: 250_000, aprBps: 749, minPaymentCents: 15_000 })],
    extraMonthlyPaymentCents: 5000,
    strategy: 'avalanche',
    startDate: START,
  });

  assert.equal(
    result.totalPaidCents,
    result.totalStartingBalanceCents + result.totalInterestCents,
    'total paid must reconcile with principal + interest',
  );
  assert.equal(result.timeline.at(-1).totalBalanceCents, 0);
  assert.equal(result.months, result.timeline.length - 1);
  assert.equal(result.months, result.payoffOrder.at(-1).payoffMonth);
});

test('the projection is deterministic', () => {
  const input = { debts: [debt(), debt({ id: 'd2', balanceCents: 55_000, aprBps: 2200, minPaymentCents: 3000 })], extraMonthlyPaymentCents: 2500, startDate: START };
  const a = simulatePayoff(input);
  const b = simulatePayoff(input);
  assert.deepEqual(a, b);
});

test('balance only ever falls and interest is tracked per account', () => {
  const result = simulatePayoff({
    debts: [debt({ balanceCents: 500_000, aprBps: 1899, minPaymentCents: 12_000 })],
    extraMonthlyPaymentCents: 10_000,
    startDate: START,
  });

  const totals = result.timeline.map((t) => t.totalBalanceCents);
  for (let i = 1; i < totals.length; i += 1) {
    assert.ok(totals[i] <= totals[i - 1], `month ${i} balance must not increase`);
  }
  assert.ok(result.totalInterestCents > 0);
  assert.equal(result.months > 0, true);
  assert.match(result.debtFreeDate, /^\d{4}-\d{2}-\d{2}$/);
});

test('avalanche never costs more interest than snowball on a mixed portfolio', () => {
  // The small balance carries a minimum payment so low that it cannot retire
  // itself — so the strategy, not the minimum, decides which account clears first.
  const debts = [
    debt({ id: 'small-low', name: 'Store Card', balanceCents: 30_000, aprBps: 599, minPaymentCents: 1000 }),
    debt({ id: 'big-high', name: 'Visa', balanceCents: 400_000, aprBps: 2499, minPaymentCents: 10_000 }),
  ];

  const { avalanche, snowball } = compareStrategies({ debts, extraMonthlyPaymentCents: 20_000, startDate: START });

  assert.ok(
    avalanche.totalInterestCents <= snowball.totalInterestCents,
    `avalanche (${avalanche.totalInterestCents}) should not cost more than snowball (${snowball.totalInterestCents})`,
  );
  assert.equal(snowball.payoffOrder[0].debtName, 'Store Card', 'snowball clears the smallest balance first');
  assert.equal(avalanche.payoffOrder[0].debtName, 'Visa', 'avalanche clears the highest APR first');
});

test('retired minimum payments roll onto the next target instead of shrinking the plan', () => {
  const debts = [
    debt({ id: 'a', name: 'A', balanceCents: 50_000, aprBps: 900, minPaymentCents: 20_000 }),
    debt({ id: 'b', name: 'B', balanceCents: 900_000, aprBps: 900, minPaymentCents: 20_000 }),
  ];

  const withRollover = simulatePayoff({ debts, strategy: 'snowball', startDate: START });
  // Same portfolio, but the second account never gets the freed-up minimum.
  const noRollover = simulatePayoff({
    debts: [debts[1]],
    extraMonthlyPaymentCents: 0,
    strategy: 'snowball',
    startDate: START,
  });

  assert.ok(
    withRollover.months < noRollover.months,
    'a $900 debt cleared with rolled-over minimums should finish sooner',
  );
  assert.equal(withRollover.monthlyOutlayCents, 40_000);
});

test('minimum payments that do not cover interest are flagged, not silently ignored', () => {
  const result = simulatePayoff({
    debts: [debt({ balanceCents: 500_000, aprBps: 2599, minPaymentCents: 500 })], // $5 min on 25.99% APR
    strategy: 'avalanche',
    startDate: START,
  });

  const warning = result.warnings.find((w) => w.code === WARNING.MIN_PAYMENT_BELOW_INTEREST);
  assert.ok(warning, 'expected a MIN_PAYMENT_BELOW_INTEREST warning');
  assert.equal(warning.debtName, 'Card');
  assert.equal(result.stalled, true);
  assert.ok(result.warnings.some((w) => w.code === WARNING.STALLED));
});

test('extra payments monotonically shorten the plan and cut interest', () => {
  const debts = [debt({ balanceCents: 800_000, aprBps: 2199, minPaymentCents: 18_000 })];
  const rows = extraPaymentSensitivity({ debts, baseExtraCents: 0, startDate: START });

  for (let i = 1; i < rows.length; i += 1) {
    assert.ok(rows[i].additionalCents > rows[i - 1].additionalCents);
    assert.ok(rows[i].months <= rows[i - 1].months, 'more money must never take longer');
    assert.ok(rows[i].totalInterestCents <= rows[i - 1].totalInterestCents, 'more money must never cost more interest');
  }
});

test('compareStrategies quantifies the value of not paying minimums only', () => {
  const debts = [debt({ balanceCents: 600_000, aprBps: 1999, minPaymentCents: 15_000 }), debt({ id: 'd2', balanceCents: 200_000, aprBps: 1499, minPaymentCents: 6000 })];
  const { comparison, recommendation } = compareStrategies({ debts, extraMonthlyPaymentCents: 30_000, startDate: START });

  assert.ok(comparison.avalancheVsMinimumOnly.interestSavedCents > 0);
  assert.ok(comparison.avalancheVsMinimumOnly.monthsSaved > 0);
  assert.ok(['avalanche', 'snowball'].includes(recommendation));
});

test('unknown strategies are rejected loudly', () => {
  assert.throws(() => simulatePayoff({ debts: [debt()], strategy: 'vibes' }), /Unknown strategy/);
});

test('input normalisation tolerates ids, strings and junk rows', () => {
  const normalised = normaliseDebts([
    { _id: 'mongo-id', name: 'Card', balanceCents: '100000', aprBps: '1999', minPaymentCents: '5000' },
    { name: 'Zero balance', balanceCents: 0, aprBps: 1200, minPaymentCents: 1000 },
    null,
  ]);

  assert.equal(normalised.length, 1, 'zero-balance and null rows are dropped');
  assert.equal(normalised[0].id, 'mongo-id');
  assert.equal(normalised[0].balanceCents, 100_000);
  assert.equal(normalised[0].aprBps, 1999);
});

test('a debt-free date is derived for a plan that completes', () => {
  const result = simulatePayoff({ debts: [debt({ balanceCents: 120_000, aprBps: 0, minPaymentCents: 10_000 })], startDate: START });
  assert.equal(result.months, 12);
  assert.equal(result.totalInterestCents, 0);
  assert.equal(result.debtFreeDate, '2027-01-01');
});
