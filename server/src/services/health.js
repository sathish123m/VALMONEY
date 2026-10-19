'use strict';

/**
 * VALMONEY financial health score
 * ===============================
 *
 * A transparent, deterministic 0-100 score built from four factors that map to
 * things a person can actually change. Every factor returns its own score, a
 * weight share and a human-readable explanation, so the UI can show *why* the
 * number moved instead of presenting an opaque verdict.
 *
 *   1. Credit utilisation   (35) — revolving balances against limits
 *   2. Interest burden      (25) — how much of your income interest eats
 *   3. Payoff velocity      (25) — how close the plan is to finishing
 *   4. Cash-flow discipline (15) — what is left after expenses and payments
 *
 * Weights are re-normalised over whichever factors have data, so a user with no
 * credit limits or no logged income is scored on what is actually known rather
 * than being penalised for missing data.
 */

const FACTOR_WEIGHTS = Object.freeze({
  utilisation: 35,
  interestBurden: 25,
  payoffVelocity: 25,
  cashFlow: 15,
});

/** Piecewise-linear interpolation across `[input, score]` control points. */
function interpolate(value, points) {
  if (value <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i += 1) {
    const [x1, y1] = points[i - 1];
    const [x2, y2] = points[i];
    if (value <= x2) {
      const ratio = x2 === x1 ? 0 : (value - x1) / (x2 - x1);
      return Math.round(y1 + ratio * (y2 - y1));
    }
  }
  return points.at(-1)[1];
}

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Math.round(value)));

function gradeFor(score) {
  if (score >= 85) return { grade: 'A', label: 'Excellent' };
  if (score >= 70) return { grade: 'B', label: 'Strong' };
  if (score >= 55) return { grade: 'C', label: 'Healthy' };
  if (score >= 40) return { grade: 'D', label: 'Needs work' };
  return { grade: 'E', label: 'At risk' };
}

/**
 * @param {object} input
 * @param {number} input.totalBalanceCents
 * @param {number} input.revolvingBalanceCents   balances on accounts with a known limit
 * @param {number} input.revolvingLimitCents
 * @param {number} input.monthlyInterestCents    interest accruing this month
 * @param {number} input.monthlyIncomeCents      this month's logged income (0 when unknown)
 * @param {number} input.monthlyExpenseCents
 * @param {number} input.monthlyPaymentCents
 * @param {number} input.payoffMonths            months to debt-free under the current plan
 * @param {boolean} input.stalled
 */
function scoreFinancialHealth(input) {
  const factors = [];
  const tips = [];

  const {
    revolvingBalanceCents = 0,
    revolvingLimitCents = 0,
    monthlyInterestCents = 0,
    monthlyIncomeCents = 0,
    monthlyExpenseCents = 0,
    monthlyPaymentCents = 0,
    payoffMonths = 0,
    stalled = false,
    totalBalanceCents = 0,
  } = input;

  // 1. Credit utilisation ---------------------------------------------------
  if (revolvingLimitCents > 0) {
    const utilisation = revolvingBalanceCents / revolvingLimitCents;
    const score = interpolate(utilisation, [
      [0.0, 100],
      [0.1, 100],
      [0.3, 75],
      [0.5, 50],
      [0.75, 25],
      [1.0, 5],
      [1.5, 0],
    ]);
    factors.push({
      key: 'utilisation',
      label: 'Credit utilisation',
      score,
      weight: FACTOR_WEIGHTS.utilisation,
      detail: `${Math.round(utilisation * 100)}% of your available credit is in use.`,
    });
    if (utilisation > 0.3) {
      tips.push({
        key: 'utilisation',
        message:
          'Bringing revolving balances under 30% of your limits is usually the single fastest way to lift a credit score.',
      });
    }
  }

  // 2. Interest burden ------------------------------------------------------
  const income = monthlyIncomeCents > 0 ? monthlyIncomeCents : 0;
  if (income > 0) {
    const burden = monthlyInterestCents / income;
    const score = interpolate(burden, [
      [0.0, 100],
      [0.02, 95],
      [0.05, 75],
      [0.1, 45],
      [0.2, 15],
      [0.35, 0],
    ]);
    factors.push({
      key: 'interestBurden',
      label: 'Interest burden',
      score,
      weight: FACTOR_WEIGHTS.interestBurden,
      detail: `${(burden * 100).toFixed(1)}% of this month's income goes to interest alone.`,
    });
    if (burden > 0.05) {
      tips.push({
        key: 'interestBurden',
        message: 'Interest is eating a large share of your income. Avalanche — highest APR first — is the fastest way to cut that.',
      });
    }
  } else if (monthlyPaymentCents > 0) {
    // Without income data, fall back to how much of the monthly commitment is interest.
    const burden = monthlyInterestCents / monthlyPaymentCents;
    const score = interpolate(burden, [
      [0.0, 100],
      [0.2, 90],
      [0.4, 65],
      [0.6, 35],
      [0.8, 10],
    ]);
    factors.push({
      key: 'interestBurden',
      label: 'Interest burden',
      score,
      weight: FACTOR_WEIGHTS.interestBurden,
      detail: `${Math.round(burden * 100)}% of every payment currently goes to interest rather than principal.`,
    });
    if (burden > 0.4) {
      tips.push({
        key: 'interestBurden',
        message: 'Most of each payment is being consumed by interest. Log your income to get a sharper picture.',
      });
    }
  }

  // 3. Payoff velocity ------------------------------------------------------
  // Only scored when there is actually debt to project: a brand-new account
  // with nothing entered has no velocity to measure, and awarding it 100 would
  // be a lie. With no debt at all the factor is dropped and `hasData` reflects
  // whether anything else is known.
  if (totalBalanceCents > 0) {
    if (stalled) {
      factors.push({
        key: 'payoffVelocity',
        label: 'Payoff progress',
        score: 5,
        weight: FACTOR_WEIGHTS.payoffVelocity,
        detail: 'The current payments do not clear the balance — the plan never finishes.',
      });
      tips.push({ key: 'payoffVelocity', message: 'Current minimums do not outpace interest. Adding even a small extra monthly amount restarts the clock.' });
    } else if (payoffMonths > 0) {
      const score = interpolate(payoffMonths, [
        [6, 100],
        [24, 90],
        [60, 65],
        [120, 35],
        [240, 10],
        [600, 0],
      ]);
      factors.push({
        key: 'payoffVelocity',
        label: 'Payoff progress',
        score,
        weight: FACTOR_WEIGHTS.payoffVelocity,
        detail: `The current plan clears everything in ${payoffMonths} months.`,
      });
      if (payoffMonths > 60) {
        tips.push({
          key: 'payoffVelocity',
          message: 'Your plan runs longer than five years. Compare the extra-payment scenarios to see how much a small increase shortens it.',
        });
      }
    }
  }

  // 4. Cash-flow discipline -------------------------------------------------
  if (income > 0) {
    const outflow = monthlyExpenseCents + monthlyPaymentCents;
    const savingsRate = (income - outflow) / income;
    const score = interpolate(savingsRate, [
      [-0.25, 0],
      [0.0, 35],
      [0.1, 65],
      [0.2, 85],
      [0.35, 100],
    ]);
    factors.push({
      key: 'cashFlow',
      label: 'Cash-flow discipline',
      score,
      weight: FACTOR_WEIGHTS.cashFlow,
      detail:
        savingsRate >= 0
          ? `You keep ${Math.round(savingsRate * 100)}% of this month's income after outgoings.`
          : `You are spending ${Math.round(Math.abs(savingsRate) * 100)}% more than you earn this month.`,
    });
    if (savingsRate < 0.1) {
      tips.push({ key: 'cashFlow', message: 'Little or nothing is left after outgoings — trimming recurring expenses frees money for debt.' });
    }
  }

  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const score = totalWeight === 0 ? 0 : clamp(factors.reduce((sum, f) => sum + f.score * f.weight, 0) / totalWeight);

  const detail = factors.map((f) => ({
    ...f,
    weight: Math.round((f.weight / (totalWeight || 1)) * 100),
  }));

  const weakest = [...detail].sort((a, b) => a.score - b.score)[0] ?? null;

  return {
    score,
    ...gradeFor(score),
    factors: detail,
    weakestFactor: weakest?.key ?? null,
    tips: tips.slice(0, 3),
    hasData: totalWeight > 0,
  };
}

module.exports = { scoreFinancialHealth, FACTOR_WEIGHTS };
