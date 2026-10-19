'use strict';

const { prisma } = require('../lib/prisma');
const { HttpError } = require('../lib/http-error');
const { serializeTransaction, serializeDebt, centsToDollars } = require('../serializers');
const { compareStrategies: compare } = require('../services/payoff');
const { scoreFinancialHealth } = require('../services/health');

/**
 * First instant of the current month, in UTC.
 *
 * Built entirely with UTC accessors on purpose: mixing `Date.UTC(...)` with the
 * local-time setters (`setHours`) shifts the boundary by the timezone offset and
 * makes "this month" leak into the last day of the previous one.
 */
const monthStart = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
};

/** Next calendar occurrence of a monthly due day, relative to today. */
function nextDueDate(dueDay, from = new Date()) {
  if (!dueDay) return null;
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();
  const candidate = new Date(Date.UTC(year, month, Math.min(dueDay, 28)));
  if (candidate.getUTCDate() >= from.getUTCDate()) return candidate;
  return new Date(Date.UTC(year, month + 1, Math.min(dueDay, 28)));
}

// ---------------------------------------------------------------------------
// GET /api/dashboard
// ---------------------------------------------------------------------------
/**
 * One round trip for the whole overview: portfolio totals, both projections,
 * this month's cash flow, upcoming due dates, a spending breakdown and the
 * financial health score.
 */
async function getDashboard(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { username: true, currency: true, extraMonthlyPaymentCents: true, emailVerified: true },
    });
    if (!user) throw HttpError.notFound('Account not found.');

    const since = monthStart();

    const [debts, monthByType, recentTransactions, trendRows] = await Promise.all([
      prisma.debt.findMany({ where: { userId: req.userId }, orderBy: { aprBps: 'desc' } }),
      prisma.transaction.groupBy({
        by: ['type'],
        where: { userId: req.userId, occurredAt: { gte: since } },
        _sum: { amountCents: true },
      }),
      prisma.transaction.findMany({
        where: { userId: req.userId },
        orderBy: { occurredAt: 'desc' },
        take: 6,
        include: { debt: { select: { name: true } } },
      }),
      prisma.$queryRaw`
        SELECT to_char(date_trunc('month', "occurredAt"), 'YYYY-MM') AS month,
               COALESCE(SUM(CASE WHEN type = 'INCOME'  THEN "amountCents" ELSE 0 END), 0)::int AS income,
               COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN ABS("amountCents") ELSE 0 END), 0)::int AS expenses,
               COALESCE(SUM(CASE WHEN type = 'PAYMENT' THEN ABS("amountCents") ELSE 0 END), 0)::int AS payments
        FROM transactions
        WHERE "userId" = ${req.userId}::uuid
          AND "occurredAt" >= date_trunc('month', now()) - interval '5 months'
        GROUP BY 1
        ORDER BY 1 ASC
      `,
    ]);

    const totals = debts.reduce(
      (acc, d) => ({
        balanceCents: acc.balanceCents + d.balanceCents,
        minPaymentCents: acc.minPaymentCents + d.minPaymentCents,
        revolvingBalanceCents: acc.revolvingBalanceCents + (d.creditLimitCents ? d.balanceCents : 0),
        revolvingLimitCents: acc.revolvingLimitCents + (d.creditLimitCents ?? 0),
      }),
      { balanceCents: 0, minPaymentCents: 0, revolvingBalanceCents: 0, revolvingLimitCents: 0 },
    );

    const weightedAprBps = totals.balanceCents
      ? Math.round(debts.reduce((sum, d) => sum + d.aprBps * d.balanceCents, 0) / totals.balanceCents)
      : 0;

    const engineDebts = debts.map((d) => ({
      id: d.id,
      name: d.name,
      balanceCents: d.balanceCents,
      aprBps: d.aprBps,
      minPaymentCents: d.minPaymentCents,
    }));

    const monthTotals = monthByType.reduce(
      (acc, row) => {
        const sum = Math.abs(row._sum.amountCents ?? 0);
        if (row.type === 'INCOME') acc.incomeCents += sum;
        if (row.type === 'EXPENSE') acc.expenseCents += sum;
        if (row.type === 'PAYMENT') acc.paymentCents += sum;
        return acc;
      },
      { incomeCents: 0, expenseCents: 0, paymentCents: 0 },
    );

    const projections =
      engineDebts.length > 0
        ? compare({ debts: engineDebts, extraMonthlyPaymentCents: user.extraMonthlyPaymentCents, startDate: new Date() })
        : null;

    // Interest accruing this month across the portfolio (for the health score).
    const monthlyInterestCents = engineDebts.reduce(
      (sum, d) => sum + Math.round((d.balanceCents * d.aprBps) / 10000 / 12),
      0,
    );

    const health = scoreFinancialHealth({
      totalBalanceCents: totals.balanceCents,
      revolvingBalanceCents: totals.revolvingBalanceCents,
      revolvingLimitCents: totals.revolvingLimitCents,
      monthlyInterestCents,
      monthlyIncomeCents: monthTotals.incomeCents,
      monthlyExpenseCents: monthTotals.expenseCents,
      monthlyPaymentCents: monthTotals.paymentCents,
      payoffMonths: projections?.avalanche.months ?? 0,
      stalled: projections?.avalanche.stalled ?? false,
    });

    const dueSoon = debts
      .filter((d) => d.dueDay)
      .map((d) => ({
        debtId: d.id,
        debtName: d.name,
        dueDay: d.dueDay,
        nextDueDate: nextDueDate(d.dueDay)?.toISOString().slice(0, 10) ?? null,
        amount: centsToDollars(d.minPaymentCents),
      }))
      .sort((a, b) => String(a.nextDueDate).localeCompare(String(b.nextDueDate)))
      .slice(0, 5);

    res.json({
      currency: user.currency,
      portfolio: {
        totalBalance: centsToDollars(totals.balanceCents),
        totalBalanceCents: totals.balanceCents,
        accountCount: debts.length,
        weightedApr: Number((weightedAprBps / 100).toFixed(2)),
        monthlyMinimums: centsToDollars(totals.minPaymentCents),
        extraMonthlyPayment: centsToDollars(user.extraMonthlyPaymentCents),
        monthlyOutlay: centsToDollars(totals.minPaymentCents + user.extraMonthlyPaymentCents),
        monthlyInterest: centsToDollars(monthlyInterestCents),
        creditUtilisation:
          totals.revolvingLimitCents > 0
            ? Number((totals.revolvingBalanceCents / totals.revolvingLimitCents).toFixed(4))
            : null,
      },
      projection: projections
        ? {
            avalanche: {
              months: projections.avalanche.months,
              stalled: projections.avalanche.stalled,
              debtFreeDate: projections.avalanche.debtFreeDate,
              debtFreeLabel: projections.avalanche.debtFreeLabel,
              totalInterest: centsToDollars(projections.avalanche.totalInterestCents),
              totalPaid: centsToDollars(projections.avalanche.totalPaidCents),
              timeline: projections.avalanche.timeline.map((p) => ({ month: p.month, label: p.label, totalBalance: centsToDollars(p.totalBalanceCents) })),
            },
            snowball: {
              months: projections.snowball.months,
              debtFreeLabel: projections.snowball.debtFreeLabel,
              totalInterest: centsToDollars(projections.snowball.totalInterestCents),
            },
            comparison: projections.comparison,
            recommendation: projections.recommendation,
            recommendationReason: projections.recommendationReason,
            payoffOrder: projections.avalanche.payoffOrder.map((row) => ({
              order: row.order,
              debtName: row.debtName,
              payoffLabel: row.payoffLabel,
              interest: centsToDollars(row.interestCents),
            })),
            nextTarget: projections.avalanche.payoffOrder[0]?.debtName ?? null,
            warnings: projections.avalanche.warnings,
          }
        : null,
      cashFlow: {
        month: since.toISOString().slice(0, 7),
        income: centsToDollars(monthTotals.incomeCents),
        expenses: centsToDollars(monthTotals.expenseCents),
        payments: centsToDollars(monthTotals.paymentCents),
        net: centsToDollars(monthTotals.incomeCents - monthTotals.expenseCents - monthTotals.paymentCents),
        trend: trendRows.map((row) => ({
          month: row.month,
          income: centsToDollars(Number(row.income)),
          expenses: centsToDollars(Number(row.expenses)),
          payments: centsToDollars(Number(row.payments)),
        })),
      },
      dueSoon,
      recentTransactions: recentTransactions.map(serializeTransaction),
      debts: debts.map(serializeDebt),
      health,
      onboarding: {
        hasDebts: debts.length > 0,
        hasTransactions: recentTransactions.length > 0 || monthTotals.incomeCents > 0,
        emailVerified: user.emailVerified,
        setExtraBudget: user.extraMonthlyPaymentCents > 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getDashboard };
