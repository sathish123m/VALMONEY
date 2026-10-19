/**
 * Client-side mirror of the server's payoff engine.
 *
 * The server remains the source of truth for anything persisted, but the
 * landing-page demo and the dashboard's "what if I paid more?" slider need
 * instant feedback with no round trip. This module therefore implements the
 * same algorithm with the same rounding rules (integer cents, interest rounded
 * once per month per account) so the numbers match the API exactly.
 *
 * A unit test asserts this parity for a representative portfolio.
 */

const BASIS_POINTS = 10000;
const MONTHS_PER_YEAR = 12;
export const MAX_MONTHS = 600;

export const STRATEGIES = ['avalanche', 'snowball'];

export function monthlyInterestCents(balanceCents, aprBps) {
  return Math.round((balanceCents * aprBps) / BASIS_POINTS / MONTHS_PER_YEAR);
}

function orderAccounts(accounts, strategy) {
  const active = accounts.filter((a) => a.balanceCents > 0);
  if (strategy === 'snowball') {
    return active.sort((a, b) => a.balanceCents - b.balanceCents || b.aprBps - a.aprBps || a.id.localeCompare(b.id));
  }
  return active.sort((a, b) => b.aprBps - a.aprBps || a.balanceCents - b.balanceCents || a.id.localeCompare(b.id));
}

function addMonths(date, months) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function monthLabel(month, startDate = new Date()) {
  if (month === 0) return 'Now';
  return addMonths(startDate, month).toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Accepts the API's dollar/percent shape as well as raw cents. */
export function toAccounts(debts = []) {
  return debts
    .filter(Boolean)
    .map((d, index) => ({
      id: String(d.id ?? d._id ?? `debt-${index + 1}`),
      name: String(d.name ?? `Account ${index + 1}`),
      balanceCents: Math.max(
        0,
        Math.round(Number(d.balanceCents ?? (d.balance !== undefined ? Number(d.balance) * 100 : 0))),
      ),
      aprBps: Math.max(0, Math.round(Number(d.aprBps ?? (d.apr !== undefined ? Number(d.apr) * 100 : 0)))),
      minPaymentCents: Math.max(
        0,
        Math.round(Number(d.minPaymentCents ?? (d.minPayment !== undefined ? Number(d.minPayment) * 100 : 0))),
      ),
    }))
    .filter((d) => d.balanceCents > 0);
}

/**
 * @returns {{months:number, stalled:boolean, debtFreeDate:string|null,
 *   debtFreeLabel:string|null, totalInterestCents:number, totalPaidCents:number,
 *   totalStartingBalanceCents:number, monthlyOutlayCents:number,
 *   timeline:Array<{month:number,label:string,totalBalanceCents:number}>,
 *   payoffOrder:Array<{order:number,debtId:string,debtName:string,payoffMonth:number|null,
 *     payoffLabel:string|null,interestCents:number,paidCents:number}>,
 *   warnings:Array<{code:string,message:string,debtName?:string}>}}
 */
export function simulatePayoff({
  debts = [],
  extraMonthlyPaymentCents = 0,
  strategy = 'avalanche',
  startDate = new Date(),
  maxMonths = MAX_MONTHS,
} = {}) {
  const accounts = toAccounts(debts);
  const extra = Math.max(0, Math.round(Number(extraMonthlyPaymentCents) || 0));
  const startedAt = new Date(startDate);

  const warnings = [];
  const totalStartingBalanceCents = accounts.reduce((sum, a) => sum + a.balanceCents, 0);
  const monthlyOutlayCents = accounts.reduce((sum, a) => sum + a.minPaymentCents, 0) + extra;

  const state = accounts.map((a) => ({
    ...a,
    balanceCents: a.balanceCents,
    interestCents: 0,
    paidCents: 0,
    payoffMonth: null,
  }));

  if (state.length === 0) {
    warnings.push({ code: 'NO_DEBTS', message: 'Add an account to see a projection.' });
  }

  for (const account of state) {
    if (account.minPaymentCents <= monthlyInterestCents(account.balanceCents, account.aprBps)) {
      warnings.push({
        code: 'MIN_PAYMENT_BELOW_INTEREST',
        debtName: account.name,
        message: `The minimum payment on "${account.name}" does not cover its monthly interest.`,
      });
    }
  }

  const timeline = [
    {
      month: 0,
      label: 'Now',
      totalBalanceCents: totalStartingBalanceCents,
      accounts: state.map((a) => ({ id: a.id, name: a.name, balanceCents: a.balanceCents })),
    },
  ];

  let months = 0;
  let totalInterestCents = 0;
  let totalPaidCents = 0;

  while (months < maxMonths) {
    if (state.reduce((sum, a) => sum + a.balanceCents, 0) <= 0) break;
    months += 1;

    for (const account of state) {
      if (account.balanceCents <= 0) continue;
      const interest = monthlyInterestCents(account.balanceCents, account.aprBps);
      account.balanceCents += interest;
      account.interestCents += interest;
      totalInterestCents += interest;
    }

    let paidToMinimums = 0;
    for (const account of state) {
      if (account.balanceCents <= 0) continue;
      const payment = Math.min(account.minPaymentCents, account.balanceCents);
      account.balanceCents -= payment;
      account.paidCents += payment;
      paidToMinimums += payment;
    }

    let discretionary = monthlyOutlayCents - paidToMinimums;
    for (const account of orderAccounts(state, strategy)) {
      if (discretionary <= 0) break;
      const payment = Math.min(account.balanceCents, discretionary);
      account.balanceCents -= payment;
      account.paidCents += payment;
      discretionary -= payment;
    }

    totalPaidCents += monthlyOutlayCents - Math.max(0, discretionary);

    for (const account of state) {
      if (account.balanceCents <= 0 && account.payoffMonth === null) account.payoffMonth = months;
    }

    timeline.push({
      month: months,
      label: monthLabel(months, startedAt),
      totalBalanceCents: state.reduce((sum, a) => sum + Math.max(0, a.balanceCents), 0),
      accounts: state.map((a) => ({ id: a.id, name: a.name, balanceCents: Math.max(0, a.balanceCents) })),
    });
  }

  const remaining = state.reduce((sum, a) => sum + Math.max(0, a.balanceCents), 0);
  const stalled = remaining > 0 && months >= maxMonths;
  if (stalled) {
    warnings.push({
      code: 'STALLED',
      message: 'These payments never clear the balance. Increase the monthly budget.',
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
    }));

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
    timeline,
    payoffOrder,
    warnings,
  };
}

/** Both strategies plus the "minimums only" baseline. */
export function compareStrategies({ debts = [], extraMonthlyPaymentCents = 0, startDate = new Date() } = {}) {
  const avalanche = simulatePayoff({ debts, extraMonthlyPaymentCents, strategy: 'avalanche', startDate });
  const snowball = simulatePayoff({ debts, extraMonthlyPaymentCents, strategy: 'snowball', startDate });
  const minimumOnly = simulatePayoff({ debts, extraMonthlyPaymentCents: 0, strategy: 'avalanche', startDate });

  return {
    avalanche,
    snowball,
    minimumOnly,
    comparison: {
      interestSavedByAvalancheCents: Math.max(0, snowball.totalInterestCents - avalanche.totalInterestCents),
      monthsSavedByAvalanche: Math.max(0, snowball.months - avalanche.months),
      avalancheVsMinimumOnly: {
        interestSavedCents: Math.max(0, minimumOnly.totalInterestCents - avalanche.totalInterestCents),
        monthsSaved: Math.max(0, minimumOnly.months - avalanche.months),
      },
      snowballVsMinimumOnly: {
        interestSavedCents: Math.max(0, minimumOnly.totalInterestCents - snowball.totalInterestCents),
        monthsSaved: Math.max(0, minimumOnly.months - snowball.months),
      },
    },
    recommendation: avalanche.totalInterestCents <= snowball.totalInterestCents ? 'avalanche' : 'snowball',
  };
}
