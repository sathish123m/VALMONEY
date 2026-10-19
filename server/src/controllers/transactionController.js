'use strict';

const { prisma } = require('../lib/prisma');
const { HttpError } = require('../lib/http-error');
const { serializeTransaction, dollarsToCents, centsToDollars } = require('../serializers');
const { toCsv } = require('../services/csv');

const TX_TYPE = { INCOME: 'INCOME', EXPENSE: 'EXPENSE', PAYMENT: 'PAYMENT' };

/** Pick the transaction type that matches the sign of the amount. */
function inferType(amount) {
  return amount >= 0 ? TX_TYPE.INCOME : TX_TYPE.EXPENSE;
}

// ---------------------------------------------------------------------------
// GET /api/transactions
// ---------------------------------------------------------------------------
async function listTransactions(req, res, next) {
  try {
    const { search, category, type, from, to, limit, offset, sort } = req.query;

    const where = {
      userId: req.userId,
      ...(category ? { category } : {}),
      ...(type ? { type } : {}),
      ...(search
        ? {
            OR: [
              { description: { contains: search, mode: 'insensitive' } },
              { category: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(from || to
        ? {
            occurredAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };

    const orderBy =
      sort === 'oldest'
        ? [{ occurredAt: 'asc' }]
        : sort === 'largest'
          ? [{ amountCents: 'asc' }]
          : [{ occurredAt: 'desc' }];

    const [transactions, total, aggregates] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        include: { debt: { select: { name: true } } },
      }),
      prisma.transaction.count({ where }),
      prisma.transaction.groupBy({
        by: ['type'],
        where,
        _sum: { amountCents: true },
        _count: { _all: true },
      }),
    ]);

    const totals = aggregates.reduce(
      (acc, row) => {
        const sum = row._sum.amountCents ?? 0;
        if (row.type === TX_TYPE.INCOME) acc.incomeCents += sum;
        if (row.type === TX_TYPE.EXPENSE) acc.expenseCents += Math.abs(sum);
        if (row.type === TX_TYPE.PAYMENT) acc.paymentCents += Math.abs(sum);
        return acc;
      },
      { incomeCents: 0, expenseCents: 0, paymentCents: 0 },
    );

    res.json({
      transactions: transactions.map(serializeTransaction),
      pagination: { total, limit, offset, hasMore: offset + transactions.length < total },
      totals: {
        income: centsToDollars(totals.incomeCents),
        expenses: centsToDollars(totals.expenseCents),
        payments: centsToDollars(totals.paymentCents),
        net: centsToDollars(totals.incomeCents - totals.expenseCents - totals.paymentCents),
      },
    });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// POST /api/transactions
// ---------------------------------------------------------------------------
async function createTransaction(req, res, next) {
  try {
    const body = req.body;

    if (body.debtId) {
      const owned = await prisma.debt.findFirst({ where: { id: body.debtId, userId: req.userId }, select: { id: true } });
      if (!owned) throw HttpError.badRequest('That account does not belong to you.');
    }

    const amountCents = dollarsToCents(body.amount);

    const transaction = await prisma.transaction.create({
      data: {
        userId: req.userId,
        description: body.description,
        amountCents,
        category: body.category,
        type: body.type ?? inferType(amountCents),
        status: body.status ?? 'COMPLETED',
        occurredAt: body.occurredAt ?? new Date(),
        debtId: body.debtId ?? null,
      },
      include: { debt: { select: { name: true } } },
    });

    // A completed payment against an account reduces that account's balance,
    // which is what keeps the payoff projection honest.
    if (transaction.type === TX_TYPE.PAYMENT && transaction.debtId && transaction.status === 'COMPLETED') {
      const debt = await prisma.debt.findUnique({ where: { id: transaction.debtId } });
      if (debt) {
        const nextBalance = Math.max(0, debt.balanceCents - Math.abs(transaction.amountCents));
        await prisma.debt.update({ where: { id: debt.id }, data: { balanceCents: nextBalance } });
      }
    }

    res.status(201).json({ transaction: serializeTransaction(transaction) });
  } catch (error) {
    next(error);
  }
}

async function findOwnedTransaction(userId, id) {
  const transaction = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!transaction) throw HttpError.notFound('That transaction does not exist.');
  return transaction;
}

// ---------------------------------------------------------------------------
// PATCH /api/transactions/:id
// ---------------------------------------------------------------------------
async function updateTransaction(req, res, next) {
  try {
    await findOwnedTransaction(req.userId, req.params.id);
    const body = req.body;

    const data = {};
    if (body.description !== undefined) data.description = body.description;
    if (body.amount !== undefined) data.amountCents = dollarsToCents(body.amount);
    if (body.category !== undefined) data.category = body.category;
    if (body.status !== undefined) data.status = body.status;
    if (body.occurredAt !== undefined) data.occurredAt = body.occurredAt;
    if (body.debtId !== undefined) data.debtId = body.debtId;
    if (body.type !== undefined) data.type = body.type;
    else if (body.amount !== undefined) data.type = inferType(data.amountCents);

    const transaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data,
      include: { debt: { select: { name: true } } },
    });

    res.json({ transaction: serializeTransaction(transaction) });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/transactions/:id
// ---------------------------------------------------------------------------
async function deleteTransaction(req, res, next) {
  try {
    await findOwnedTransaction(req.userId, req.params.id);
    await prisma.transaction.delete({ where: { id: req.params.id } });
    res.json({ message: 'Transaction deleted.' });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// GET /api/transactions/summary
// ---------------------------------------------------------------------------
async function getSummary(req, res, next) {
  try {
    // First instant of the current month, built with UTC accessors only — see
    // the note in dashboardController.monthStart for why local setters are wrong here.
    const now = new Date();
    const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));

    const [byCategory, byType, monthly] = await Promise.all([
      prisma.transaction.groupBy({
        by: ['category', 'type'],
        where: { userId: req.userId, occurredAt: { gte: since } },
        _sum: { amountCents: true },
        _count: { _all: true },
      }),
      prisma.transaction.groupBy({
        by: ['type'],
        where: { userId: req.userId },
        _sum: { amountCents: true },
      }),
      prisma.$queryRaw`
        SELECT to_char(date_trunc('month', "occurredAt"), 'YYYY-MM') AS month,
               COALESCE(SUM(CASE WHEN type = 'INCOME' THEN "amountCents" ELSE 0 END), 0)::int  AS income,
               COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN ABS("amountCents") ELSE 0 END), 0)::int AS expenses,
               COALESCE(SUM(CASE WHEN type = 'PAYMENT' THEN ABS("amountCents") ELSE 0 END), 0)::int AS payments
        FROM transactions
        WHERE "userId" = ${req.userId}::uuid
          AND "occurredAt" >= date_trunc('month', now()) - interval '5 months'
        GROUP BY 1
        ORDER BY 1 ASC
      `,
    ]);

    res.json({
      month: since.toISOString().slice(0, 7),
      byCategory: byCategory
        .map((row) => ({
          category: row.category,
          type: row.type,
          total: centsToDollars(Math.abs(row._sum.amountCents ?? 0)),
          count: row._count._all,
        }))
        .sort((a, b) => b.total - a.total),
      byType: byType.reduce((acc, row) => {
        acc[row.type.toLowerCase()] = centsToDollars(Math.abs(row._sum.amountCents ?? 0));
        return acc;
      }, {}),
      trend: monthly.map((row) => ({
        month: row.month,
        income: centsToDollars(Number(row.income)),
        expenses: centsToDollars(Number(row.expenses)),
        payments: centsToDollars(Number(row.payments)),
      })),
    });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// GET /api/transactions/export
// ---------------------------------------------------------------------------
async function exportTransactions(req, res, next) {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.userId },
      orderBy: { occurredAt: 'desc' },
      include: { debt: { select: { name: true } } },
    });

    const csv = toCsv(
      ['Date', 'Description', 'Category', 'Type', 'Status', 'Amount', 'Account'],
      transactions.map((t) => [
        t.occurredAt.toISOString().slice(0, 10),
        t.description,
        t.category,
        t.type,
        t.status,
        (t.amountCents / 100).toFixed(2),
        t.debt?.name ?? '',
      ]),
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="valmoney-ledger-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getSummary,
  exportTransactions,
};
