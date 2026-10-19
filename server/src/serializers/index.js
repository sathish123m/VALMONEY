'use strict';

/**
 * Database rows are stored in cents/basis points; API responses speak dollars
 * and percentages. These helpers are the single place that conversion happens,
 * so the two representations can never drift apart between endpoints.
 */

const centsToDollars = (cents) => Number((cents / 100).toFixed(2));
const dollarsToCents = (dollars) => Math.round(Number(dollars) * 100);
const bpsToPercent = (bps) => Number((bps / 100).toFixed(2));
const percentToBps = (percent) => Math.round(Number(percent) * 100);

function serializeUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    mobile: user.mobile ?? null,
    currency: user.currency,
    emailVerified: user.emailVerified,
    extraMonthlyPayment: centsToDollars(user.extraMonthlyPaymentCents),
    extraMonthlyPaymentCents: user.extraMonthlyPaymentCents,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt ?? null,
  };
}

function serializeDebt(debt) {
  return {
    id: debt.id,
    name: debt.name,
    type: debt.type,
    balance: centsToDollars(debt.balanceCents),
    balanceCents: debt.balanceCents,
    apr: bpsToPercent(debt.aprBps),
    aprBps: debt.aprBps,
    minPayment: centsToDollars(debt.minPaymentCents),
    minPaymentCents: debt.minPaymentCents,
    creditLimit: debt.creditLimitCents === null || debt.creditLimitCents === undefined ? null : centsToDollars(debt.creditLimitCents),
    creditLimitCents: debt.creditLimitCents ?? null,
    dueDay: debt.dueDay ?? null,
    notes: debt.notes ?? null,
    createdAt: debt.createdAt,
    updatedAt: debt.updatedAt,
  };
}

function serializeTransaction(transaction) {
  return {
    id: transaction.id,
    description: transaction.description,
    amount: centsToDollars(transaction.amountCents),
    amountCents: transaction.amountCents,
    category: transaction.category,
    type: transaction.type,
    status: transaction.status,
    occurredAt: transaction.occurredAt,
    debtId: transaction.debtId ?? null,
    debtName: transaction.debt?.name ?? null,
    createdAt: transaction.createdAt,
  };
}

function serializeReceipt(receipt) {
  return {
    id: receipt.id,
    originalName: receipt.originalName,
    mimeType: receipt.mimeType,
    sizeBytes: receipt.sizeBytes,
    status: receipt.status,
    vendor: receipt.vendor ?? null,
    total: receipt.totalCents === null || receipt.totalCents === undefined ? null : centsToDollars(receipt.totalCents),
    totalCents: receipt.totalCents ?? null,
    notes: receipt.notes ?? null,
    createdAt: receipt.createdAt,
    fileUrl: `/api/receipts/${receipt.id}/file`,
  };
}

/** Convert an engine projection (cents) into the API's dollar representation. */
function serializeProjection(projection) {
  return {
    strategy: projection.strategy,
    months: projection.months,
    stalled: projection.stalled,
    debtFreeDate: projection.debtFreeDate,
    debtFreeLabel: projection.debtFreeLabel,
    monthlyOutlay: centsToDollars(projection.monthlyOutlayCents),
    baseMinimum: centsToDollars(projection.baseMinimumCents),
    extraMonthlyPayment: centsToDollars(projection.extraMonthlyPaymentCents),
    totalStartingBalance: centsToDollars(projection.totalStartingBalanceCents),
    totalInterest: centsToDollars(projection.totalInterestCents),
    totalPaid: centsToDollars(projection.totalPaidCents),
    timeline: projection.timeline.map((point) => ({
      month: point.month,
      label: point.label,
      date: point.date,
      totalBalance: centsToDollars(point.totalBalanceCents),
      accounts: point.accounts.map((a) => ({ id: a.id, name: a.name, balance: centsToDollars(a.balanceCents) })),
    })),
    milestones: projection.milestones.map((m) => ({
      debtId: m.debtId,
      debtName: m.debtName,
      payoffMonth: m.payoffMonth,
      payoffLabel: m.payoffLabel,
      payoffDate: m.payoffDate,
      interest: centsToDollars(m.interestCents),
    })),
    payoffOrder: projection.payoffOrder.map((row) => ({
      order: row.order,
      debtId: row.debtId,
      debtName: row.debtName,
      payoffMonth: row.payoffMonth,
      payoffLabel: row.payoffLabel,
      interest: centsToDollars(row.interestCents),
      paid: centsToDollars(row.paidCents),
    })),
    interestByDebt: projection.interestByDebt.map((row) => ({
      debtId: row.debtId,
      debtName: row.debtName,
      apr: bpsToPercent(row.aprBps),
      balance: centsToDollars(row.balanceCents),
      interest: centsToDollars(row.interestCents),
      share: Number(row.share.toFixed(4)),
    })),
    warnings: projection.warnings,
    // Cents preserved for clients that want exact arithmetic.
    totalInterestCents: projection.totalInterestCents,
    totalPaidCents: projection.totalPaidCents,
    monthlyOutlayCents: projection.monthlyOutlayCents,
  };
}

module.exports = {
  centsToDollars,
  dollarsToCents,
  bpsToPercent,
  percentToBps,
  serializeUser,
  serializeDebt,
  serializeTransaction,
  serializeReceipt,
  serializeProjection,
};
