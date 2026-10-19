'use strict';

const { prisma } = require('../lib/prisma');
const { HttpError } = require('../lib/http-error');
const { serializeDebt, serializeProjection, dollarsToCents, percentToBps } = require('../serializers');
const { compareStrategies, extraPaymentSensitivity, simulatePayoff } = require('../services/payoff');

/** Shape a Prisma Debt row into what the payoff engine expects. */
const toEngineInput = (debts) =>
  debts.map((d) => ({
    id: d.id,
    name: d.name,
    type: d.type,
    balanceCents: d.balanceCents,
    aprBps: d.aprBps,
    minPaymentCents: d.minPaymentCents,
  }));

const engineInputFromBody = (body) => ({
  name: body.name,
  type: body.type,
  balanceCents: dollarsToCents(body.balance),
  aprBps: percentToBps(body.apr),
  minPaymentCents: dollarsToCents(body.minPayment),
  ...(body.creditLimit === undefined || body.creditLimit === null
    ? {}
    : { creditLimitCents: dollarsToCents(body.creditLimit) }),
});

// ---------------------------------------------------------------------------
// GET /api/debts
// ---------------------------------------------------------------------------
async function listDebts(req, res, next) {
  try {
    const debts = await prisma.debt.findMany({
      where: { userId: req.userId },
      orderBy: [{ aprBps: 'desc' }, { balanceCents: 'desc' }],
    });

    const totals = debts.reduce(
      (acc, d) => ({
        balanceCents: acc.balanceCents + d.balanceCents,
        minPaymentCents: acc.minPaymentCents + d.minPaymentCents,
        creditLimitCents: acc.creditLimitCents + (d.creditLimitCents ?? 0),
      }),
      { balanceCents: 0, minPaymentCents: 0, creditLimitCents: 0 },
    );

    res.json({
      debts: debts.map(serializeDebt),
      count: debts.length,
      totals: {
        balance: totals.balanceCents / 100,
        minPayment: totals.minPaymentCents / 100,
        creditLimit: totals.creditLimitCents / 100,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// POST /api/debts
// ---------------------------------------------------------------------------
async function createDebt(req, res, next) {
  try {
    const debt = await prisma.debt.create({
      data: { userId: req.userId, ...engineInputFromBody(req.body) },
    });
    res.status(201).json({ debt: serializeDebt(debt) });
  } catch (error) {
    next(error);
  }
}

/** Loads a debt the caller actually owns, or throws 404 (never 403 — no existence leaks). */
async function findOwnedDebt(userId, debtId) {
  const debt = await prisma.debt.findFirst({ where: { id: debtId, userId } });
  if (!debt) throw HttpError.notFound('That account does not exist.');
  return debt;
}

// ---------------------------------------------------------------------------
// GET /api/debts/:id
// ---------------------------------------------------------------------------
async function getDebt(req, res, next) {
  try {
    const debt = await findOwnedDebt(req.userId, req.params.id);
    res.json({ debt: serializeDebt(debt) });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/debts/:id
// ---------------------------------------------------------------------------
async function updateDebt(req, res, next) {
  try {
    await findOwnedDebt(req.userId, req.params.id);

    const body = req.body;
    const data = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.type !== undefined) data.type = body.type;
    if (body.balance !== undefined) data.balanceCents = dollarsToCents(body.balance);
    if (body.apr !== undefined) data.aprBps = percentToBps(body.apr);
    if (body.minPayment !== undefined) data.minPaymentCents = dollarsToCents(body.minPayment);
    if (body.creditLimit !== undefined) {
      data.creditLimitCents = body.creditLimit === null ? null : dollarsToCents(body.creditLimit);
    }
    if (body.dueDay !== undefined) data.dueDay = body.dueDay;
    if (body.notes !== undefined) data.notes = body.notes;

    const debt = await prisma.debt.update({ where: { id: req.params.id }, data });
    res.json({ debt: serializeDebt(debt) });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/debts/:id
// ---------------------------------------------------------------------------
async function deleteDebt(req, res, next) {
  try {
    await findOwnedDebt(req.userId, req.params.id);
    await prisma.debt.delete({ where: { id: req.params.id } });
    res.json({ message: 'Account removed.' });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// GET /api/debts/strategy
// ---------------------------------------------------------------------------
/**
 * The payoff projection. Returns:
 *   • `avalanche` / `snowball` projections (or a single one via ?strategy=)
 *   • `comparison` — what each strategy is worth versus minimum payments only
 *   • `scenarios`  — "what if I paid $X more?" sensitivity rows (?scenarios=true)
 *
 * `?extra=` overrides the user's saved budget so the dashboard slider can
 * preview a plan without writing to the database.
 */
async function getStrategy(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { extraMonthlyPaymentCents: true, currency: true },
    });
    if (!user) throw HttpError.notFound('Account not found.');

    const debts = await prisma.debt.findMany({ where: { userId: req.userId } });
    const debtsForEngine = toEngineInput(debts);

    const extraCents =
      req.query.extra !== undefined ? dollarsToCents(req.query.extra) : user.extraMonthlyPaymentCents;

    const startDate = new Date();
    const strategy = req.query.strategy ?? 'both';

    let projections;
    if (strategy === 'both') {
      const compared = compareStrategies({ debts: debtsForEngine, extraMonthlyPaymentCents: extraCents, startDate });
      projections = {
        avalanche: serializeProjection(compared.avalanche),
        snowball: serializeProjection(compared.snowball),
        comparison: compared.comparison,
        recommendation: compared.recommendation,
        recommendationReason: compared.recommendationReason,
      };
    } else {
      const single = simulatePayoff({ debts: debtsForEngine, extraMonthlyPaymentCents: extraCents, strategy, startDate });
      projections = { [strategy]: serializeProjection(single) };
    }

    const payload = {
      currency: user.currency,
      extraMonthlyPayment: extraCents / 100,
      extraMonthlyPaymentCents: extraCents,
      debtCount: debts.length,
      debts: debts.map(serializeDebt),
      ...projections,
    };

    if (req.query.scenarios) {
      payload.scenarios = extraPaymentSensitivity({
        debts: debtsForEngine,
        baseExtraCents: extraCents,
        strategy: strategy === 'snowball' ? 'snowball' : 'avalanche',
        startDate,
      }).map((row) => ({
        extraMonthlyPayment: row.extraMonthlyPaymentCents / 100,
        additional: row.additionalCents / 100,
        months: row.months,
        debtFreeLabel: row.debtFreeLabel,
        totalInterest: row.totalInterestCents / 100,
      }));
    }

    res.json(payload);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listDebts,
  createDebt,
  getDebt,
  updateDebt,
  deleteDebt,
  getStrategy,
  toEngineInput,
};
