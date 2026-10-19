import { test } from 'node:test';
import assert from 'node:assert/strict';

import { compareStrategies, monthlyInterestCents, simulatePayoff, toAccounts } from './payoff.js';
import { SAMPLE_DEBTS, SAMPLE_EXTRA_MONTHLY } from './samplePortfolio.js';

/**
 * Parity test.
 *
 * The expected numbers were produced by the server engine (`server/src/services/payoff.js`)
 * for the seeded demo portfolio. If this test breaks, the client mirror has
 * drifted from the API and the landing page would be lying about the numbers.
 */
const DEMO = {
  debts: SAMPLE_DEBTS,
  extraMonthlyPaymentCents: SAMPLE_EXTRA_MONTHLY * 100,
  startDate: new Date('2026-10-19T00:00:00Z'),
};

test('monthly interest is rounded to whole cents from basis points', () => {
  // $4,823.00 at 23.99% APR -> 482300 * 2399 / 10000 / 12 = 9641.98 cents
  assert.equal(monthlyInterestCents(482_300, 2399), 9642);
  // $21,450.00 at 6.49% APR -> 11600.875 cents
  assert.equal(monthlyInterestCents(2_145_000, 649), 11601);
  assert.equal(monthlyInterestCents(187_500, 0), 0);
});

test('toAccounts normalises both dollars/percent and cents/bps input', () => {
  const [account] = toAccounts([{ id: 'a', name: 'Card', balance: 4823, apr: 23.99, minPayment: 125 }]);
  assert.deepEqual(account, { id: 'a', name: 'Card', balanceCents: 482_300, aprBps: 2399, minPaymentCents: 12_500 });

  const [cents] = toAccounts([{ id: 'b', name: 'Card', balanceCents: 482_300, aprBps: 2399, minPaymentCents: 12_500 }]);
  assert.deepEqual(cents, account ? { ...account, id: 'b' } : null);
});

test('toAccounts drops cleared accounts', () => {
  assert.equal(toAccounts([{ balance: 0, apr: 10, minPayment: 5 }]).length, 0);
});

test('avalanche projection matches the server engine on the demo portfolio', () => {
  const plan = simulatePayoff({ ...DEMO, strategy: 'avalanche' });

  assert.equal(plan.months, 45);
  assert.equal(plan.totalInterestCents, 555_559);
  assert.equal(plan.totalStartingBalanceCents, 4_134_800);
  assert.equal(plan.monthlyOutlayCents, 105_000); // 750 minimums + 300 extra
  assert.equal(plan.debtFreeLabel, 'Jul 2030');
  assert.equal(plan.debtFreeDate, '2030-07-01');
  assert.equal(plan.stalled, false);
  assert.equal(plan.timeline.length, 46); // month 0 plus 45 payments
  assert.equal(plan.timeline.at(-1).totalBalanceCents, 0);
});

test('snowball costs more interest but clears its first account sooner', () => {
  const avalanche = simulatePayoff({ ...DEMO, strategy: 'avalanche' });
  const snowball = simulatePayoff({ ...DEMO, strategy: 'snowball' });

  assert.equal(snowball.months, 46);
  assert.equal(snowball.totalInterestCents, 602_062);
  assert.equal(avalanche.payoffOrder[0].debtName, 'Visa Platinum');
  assert.equal(snowball.payoffOrder[0].debtName, 'Medical — City Hospital');
  assert.ok(snowball.payoffOrder[0].payoffMonth < avalanche.payoffOrder[0].payoffMonth);
});

test('compareStrategies prices both strategies and the minimums-only baseline', () => {
  const { comparison, recommendation } = compareStrategies(DEMO);

  assert.equal(recommendation, 'avalanche');
  assert.equal(comparison.interestSavedByAvalancheCents, 46_503); // $465.03
  assert.equal(comparison.avalancheVsMinimumOnly.interestSavedCents, 505_630); // $5,056.30
  assert.equal(comparison.avalancheVsMinimumOnly.monthsSaved, 25);
  assert.equal(comparison.snowballVsMinimumOnly.interestSavedCents, 459_127); // $4,591.27
  assert.equal(comparison.snowballVsMinimumOnly.monthsSaved, 24);
});

test('paying only the minimums is slower and dearer than the extra-budget plan', () => {
  const minimumsOnly = simulatePayoff({ debts: SAMPLE_DEBTS, extraMonthlyPaymentCents: 0, strategy: 'avalanche' });
  const withExtra = simulatePayoff(DEMO);

  assert.equal(minimumsOnly.months, 70);
  assert.ok(minimumsOnly.totalInterestCents > withExtra.totalInterestCents);
});

test('an under-water minimum payment is flagged, and the plan can stall', () => {
  const plan = simulatePayoff({
    debts: [{ id: 'sink', name: 'Store card', balance: 10_000, apr: 29.99, minPayment: 20 }],
    strategy: 'avalanche',
  });

  assert.equal(plan.stalled, true);
  assert.ok(plan.warnings.some((warning) => warning.code === 'MIN_PAYMENT_BELOW_INTEREST'));
  assert.ok(plan.warnings.some((warning) => warning.code === 'STALLED'));
});

test('an empty portfolio produces no schedule and a clear warning', () => {
  const plan = simulatePayoff({ debts: [] });

  assert.equal(plan.months, 0);
  assert.equal(plan.debtFreeLabel, null);
  assert.equal(plan.totalInterestCents, 0);
  assert.deepEqual(
    plan.warnings.map((warning) => warning.code),
    ['NO_DEBTS'],
  );
});
