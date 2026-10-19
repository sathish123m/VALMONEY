'use strict';

/**
 * VALMONEY payoff engine
 * ======================
 *
 * A deterministic, dependency-free simulation of debt repayment under the two
 * classic strategies:
 *
 *   • avalanche — attack the highest APR first (mathematically optimal)
 *   • snowball  — attack the smallest balance first (behaviourally optimal)
 *
 * Design notes
 * ------------
 * 1. Every value is an integer number of CENTS. Floating point money math is a
 *    bug factory; rounding happens exactly once per month per account, the same
 *    way a real statement rounds interest.
 * 2. APR is carried in basis points (1 bp = 0.01%). `1999` === 19.99% APR.
 * 3. The monthly outlay is treated as a standing commitment: it equals
 *    (sum of every account's minimum payment) + the user's extra budget, and it
 *    does not shrink when an account is retired. Freed-up minimums are rolled
 *    onto the next target, which is precisely why both strategies beat
 *    "minimum payments forever".
 * 4. The simulation is pure: no I/O, no clock reads beyond an injected start
 *    date, no randomness. That makes it trivially unit-testable and safe to run
 *    on every request.
 */

const BASIS_POINTS = 10000;
const MONTHS_PER_YEAR = 12;
const MAX_MONTHS = 600; // 50 years — a sane upper bound for a runaway simulation

const STRATEGIES = Object.freeze(['avalanche', 'snowball']);

const WARNING = Object.freeze({
  MIN_PAYMENT_BELOW_INTEREST: 'MIN_PAYMENT_BELOW_INTEREST',
  STALLED: 'STALLED',
  NO_DEBTS: 'NO_DEBTS',
});

/** Interest charged on a balance for a single month, rounded like a statement. */
function monthlyInterestCents(balanceCents, aprBps) {
  return Math.round((balanceCents * aprBps) / BASIS_POINTS / MONTHS_PER_YEAR);
}

/** Order in which discretionary money is thrown at accounts. */
function orderAccounts(accounts, strategy) {
  const active = accounts.filter((a) => a.balanceCents > 0);
  if (strategy === 'snowball') {
    return active.sort(
      (a, b) => a.balanceCents - b.balanceCents || b.aprBps - a.aprBps || a.id.localeCompare(b.id),
    );
  }
  return active.sort(
    (a, b) => b.aprBps - a.aprBps || a.balanceCents - b.balanceCents || a.id.localeCompare(b.id),
  );
}

function addMonths(date, months) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function monthLabel(month, startDate) {
  if (month === 0) return 'Now';
  const d = addMonths(startDate, month);
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Normalise loosely-typed inputs (API payloads, client demo state) into accounts. */
function normaliseDebts(debts = []) {
  return debts
    .filter(Boolean)
    .map((d, index) => ({
      id: String(d.id ?? d._id ?? `debt-${index + 1}`),
      name: String(d.name ?? `Account ${index + 1}`),
      type: d.type ?? 'OTHER',
      balanceCents: Math.max(0, Math.round(Number(d.balanceCents ?? 0))),
      aprBps: Math.max(0, Math.round(Number(d.aprBps ?? 0))),
      minPaymentCents: Math.max(0, Math.round(Number(d.minPaymentCents ?? 0))),
    }))
    .filter((d) => d.balanceCents > 0);
}

/**
 * Simulate repayment of `debts` at a fixed monthly outlay.
 *
 * @param {object}   options
 * @param {Array}    options.debts                     accounts to repay
 * @param {number}   options.extraMonthlyPaymentCents  extra budget on top of minimums
 * @param {string}   options.strategy                  'avalanche' | 'snowball'
 * @param {Date}     [options.startDate]               simulation start (defaults to today)
 * @param {number}   [options.maxMonths]               hard stop, default 600
 * @returns {object} full projection: timeline, per-account payoff order, interest paid, warnings
 */
function simulatePayoff({
  debts = [],
  extraMonthlyPaymentCents = 0,
  strategy = 'avalanche',
  startDate = new Date(),
  maxMonths = MAX_MONTHS,
} = {}) {
  if (!STRATEGIES.includes(strategy)) {
    throw new Error(`Unknown strategy "${strategy}" — expected one of ${STRATEGIES.join(', ')}`);
  }

  const accounts = normaliseDebts(debts);
  const extra = Math.max(0, Math.round(Number(extraMonthlyPaymentCents) || 0));
  const startedAt = new Date(startDate);

  const warnings = [];
  const totalStartingBalanceCents = accounts.reduce((sum, a) => sum + a.balanceCents, 0);
  const baseMinimumCents = accounts.reduce((sum, a) => sum + a.minPaymentCents, 0);
  const monthlyOutlayCents = baseMinimumCents + extra;

  const state = accounts.map((a) => ({
    ...a,
    balanceCents: a.balanceCents,
    interestCents: 0,
    paidCents: 0,
    payoffMonth: null,
  }));

  if (state.length === 0) {
    warnings.push({ code: WARNING.NO_DEBTS, message: 'No active debt accounts to project.' });
  }

  for (const account of state) {
    const firstMonthInterest = monthlyInterestCents(account.balanceCents, account.aprBps);
    if (account.minPaymentCents <= firstMonthInterest) {
      warnings.push({
        code: WARNING.MIN_PAYMENT_BELOW_INTEREST,
        debtId: account.id,
        debtName: account.name,
        message: `The minimum payment on "${account.name}" does not cover its monthly interest, so the balance grows until you pay extra.`,
      });
    }
  }

  const timeline = [
    {
      month: 0,
      label: 'Now',
      date: toIsoDate(addMonths(startedAt, 0)),
      totalBalanceCents: totalStartingBalanceCents,
      accounts: state.map((a) => ({ id: a.id, name: a.name, balanceCents: a.balanceCents })),
    },
  ];

  const milestones = [];
  let months = 0;
  let totalInterestCents = 0;
  let totalPaidCents = 0;
  let stalled = false;

  while (months < maxMonths) {
    const outstanding = state.reduce((sum, a) => sum + a.balanceCents, 0);
    if (outstanding <= 0) break;

    months += 1;

    // 1. Interest accrues on every open account.
    for (const account of state) {
      if (account.balanceCents <= 0) continue;
      const interest = monthlyInterestCents(account.balanceCents, account.aprBps);
      account.balanceCents += interest;
      account.interestCents += interest;
      totalInterestCents += interest;
    }

    // 2. Every open account is paid its minimum (capped at what is owed).
    let paidToMinimums = 0;
    for (const account of state) {
      if (account.balanceCents <= 0) continue;
      const payment = Math.min(account.minPaymentCents, account.balanceCents);
      account.balanceCents -= payment;
      account.paidCents += payment;
      paidToMinimums += payment;
    }

    // 3. Anything left of the standing monthly outlay — the extra budget plus
    //    the minimums freed up by retired accounts — is aimed at one target at
    //    a time, fully clearing it before the next.
    let discretionary = monthlyOutlayCents - paidToMinimums;
    for (const account of orderAccounts(state, strategy)) {
      if (discretionary <= 0) break;
      const payment = Math.min(account.balanceCents, discretionary);
      account.balanceCents -= payment;
      account.paidCents += payment;
      discretionary -= payment;
    }

    totalPaidCents += monthlyOutlayCents - Math.max(0, discretionary);

    // 4. Bookkeeping / milestone capture.
    for (const account of state) {
      if (account.balanceCents <= 0 && account.payoffMonth === null) {
        account.payoffMonth = months;
        milestones.push({
          debtId: account.id,
          debtName: account.name,
          payoffMonth: months,
          payoffLabel: monthLabel(months, startedAt),
          payoffDate: toIsoDate(addMonths(startedAt, months)),
          interestCents: account.interestCents,
        });
      }
    }

    const totalBalanceCents = state.reduce((sum, a) => sum + Math.max(0, a.balanceCents), 0);
    timeline.push({
      month: months,
      label: monthLabel(months, startedAt),
      date: toIsoDate(addMonths(startedAt, months)),
      totalBalanceCents,
      accounts: state.map((a) => ({
        id: a.id,
        name: a.name,
        balanceCents: Math.max(0, a.balanceCents),
      })),
    });
  }

  const remainingCents = state.reduce((sum, a) => sum + Math.max(0, a.balanceCents), 0);
  if (remainingCents > 0 && months >= maxMonths) {
    stalled = true;
    warnings.push({
      code: WARNING.STALLED,
      message: `The plan does not clear the balance within ${maxMonths} months at the current payments. Increase the monthly budget or the minimum payments.`,
    });
  }

  const payoffOrder = [...state]
    .sort((a, b) => (a.payoffMonth ?? Infinity) - (b.payoffMonth ?? Infinity) || b.aprBps - a.aprBps)
    .map((account, index) => ({
      order: index + 1,
      debtId: account.id,
      debtName: account.name,
      payoffMonth: account.payoffMonth,
      payoffLabel: account.payoffMonth === null ? null : monthLabel(account.payoffMonth, startedAt),
      interestCents: account.interestCents,
      paidCents: account.paidCents,
      startingBalanceCents: account.balanceCents + account.paidCents - account.interestCents,
    }));

  const interestByDebt = state.map((a) => ({
    debtId: a.id,
    debtName: a.name,
    aprBps: a.aprBps,
    balanceCents: Math.max(0, a.balanceCents),
    interestCents: a.interestCents,
    share: totalInterestCents > 0 ? a.interestCents / totalInterestCents : 0,
  }));

  // When every account clears, the ledger balances exactly:
  //   totalPaid = principal repaid + interest charged
  return {
    strategy,
    months,
    stalled,
    debtFreeDate: months > 0 ? toIsoDate(addMonths(startedAt, months)) : null,
    debtFreeLabel: months > 0 ? monthLabel(months, startedAt) : null,
    totalStartingBalanceCents,
    totalInterestCents,
    totalPaidCents,
    monthlyOutlayCents,
    baseMinimumCents,
    extraMonthlyPaymentCents: extra,
    timeline,
    milestones,
    payoffOrder,
    interestByDebt,
    warnings,
    accounts: state.map((a) => ({
      id: a.id,
      name: a.name,
      startingBalanceCents: Math.max(0, a.balanceCents + a.paidCents - a.interestCents),
      endingBalanceCents: Math.max(0, a.balanceCents),
      interestCents: a.interestCents,
      payoffMonth: a.payoffMonth,
    })),
  };
}

/**
 * Run both strategies plus a "minimum payments only" baseline, then quantify
 * what each strategy is worth to the user.
 */
function compareStrategies({ debts = [], extraMonthlyPaymentCents = 0, startDate = new Date() } = {}) {
  const avalanche = simulatePayoff({ debts, extraMonthlyPaymentCents, strategy: 'avalanche', startDate });
  const snowball = simulatePayoff({ debts, extraMonthlyPaymentCents, strategy: 'snowball', startDate });
  const minimumOnly = simulatePayoff({ debts, extraMonthlyPaymentCents: 0, strategy: 'avalanche', startDate });

  const interestDeltaVsSnowball = snowball.totalInterestCents - avalanche.totalInterestCents;
  const monthsDeltaVsSnowball = snowball.months - avalanche.months;

  let recommendation = 'avalanche';
  let recommendationReason = 'Avalanche targets the highest APR first, so it always costs the least in interest.';

  if (interestDeltaVsSnowball <= 0) {
    // Equal cost: snowball wins on motivation because the first win arrives sooner.
    const firstWin =
      (avalanche.payoffOrder[0]?.payoffMonth ?? Infinity) - (snowball.payoffOrder[0]?.payoffMonth ?? Infinity);
    if (firstWin > 0) {
      recommendation = 'snowball';
      recommendationReason = 'Both cost the same here, and Snowball clears your first account sooner — a faster first win.';
    }
  }

  return {
    avalanche,
    snowball,
    minimumOnly,
    comparison: {
      interestSavedByAvalancheCents: Math.max(0, interestDeltaVsSnowball),
      monthsSavedByAvalanche: Math.max(0, monthsDeltaVsSnowball),
      avalancheVsMinimumOnly: {
        interestSavedCents: Math.max(0, minimumOnly.totalInterestCents - avalanche.totalInterestCents),
        monthsSaved: Math.max(0, minimumOnly.months - avalanche.months),
      },
      snowballVsMinimumOnly: {
        interestSavedCents: Math.max(0, minimumOnly.totalInterestCents - snowball.totalInterestCents),
        monthsSaved: Math.max(0, minimumOnly.months - snowball.months),
      },
    },
    recommendation,
    recommendationReason,
  };
}

/**
 * "What if I paid a bit more?" — sensitivity table for the dashboard.
 * Returns one row per additional monthly amount.
 */
function extraPaymentSensitivity({
  debts = [],
  baseExtraCents = 0,
  strategy = 'avalanche',
  stepsCents = [0, 2500, 5000, 10000, 25000],
  startDate = new Date(),
} = {}) {
  const amounts = [...new Set(stepsCents.map((s) => Math.round(s)))].sort((a, b) => a - b);
  return amounts.map((step) => {
    const projection = simulatePayoff({
      debts,
      extraMonthlyPaymentCents: baseExtraCents + step,
      strategy,
      startDate,
    });
    return {
      extraMonthlyPaymentCents: baseExtraCents + step,
      additionalCents: step,
      months: projection.months,
      debtFreeLabel: projection.debtFreeLabel,
      totalInterestCents: projection.totalInterestCents,
    };
  });
}

module.exports = {
  simulatePayoff,
  compareStrategies,
  extraPaymentSensitivity,
  monthlyInterestCents,
  normaliseDebts,
  STRATEGIES,
  WARNING,
  MAX_MONTHS,
};
