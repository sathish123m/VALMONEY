import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, BookOpen, Download, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { api, downloadFile, query } from '../lib/api';
import { currency, shortDate } from '../lib/format';
import { CATEGORIES } from '../lib/constants';
import { useAsync, useDebounce, useDocumentTitle } from '../hooks';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button, IconButton } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Field, Input, SearchInput, Select } from '../components/ui/Field';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { EmptyState, ErrorState, Spinner } from '../components/ui/Feedback';
import { StatCard } from '../components/ui/StatCard';
import { TrendChart } from '../components/charts';

const PAGE_SIZE = 25;

const emptyDraft = () => ({
  description: '',
  amount: '',
  category: 'Food',
  status: 'COMPLETED',
  type: 'EXPENSE',
  occurredAt: new Date().toISOString().slice(0, 10),
  debtId: '',
});

export default function Ledger() {
  useDocumentTitle('Ledger');
  const { user } = useAuth();
  const toast = useToast();
  const currencyCode = user?.currency ?? 'USD';

  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebounce(search, 350);

  // Reset to the first page whenever the filters change.
  useEffect(() => setPage(0), [debouncedSearch, type, category]);

  const listQuery = useMemo(
    () =>
      query({
        search: debouncedSearch,
        type,
        category,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
    [debouncedSearch, type, category, page],
  );

  const ledger = useAsync(() => api.get(`/api/transactions${listQuery}`), [listQuery]);
  const summary = useAsync(() => api.get('/api/transactions/summary'));
  const accounts = useAsync(() => api.get('/api/debts'));

  const transactions = ledger.data?.transactions ?? [];
  const pagination = ledger.data?.pagination;
  const totals = ledger.data?.totals;

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (transaction) => {
    setEditing(transaction);
    setDraft({
      description: transaction.description,
      amount: String(transaction.amount),
      category: transaction.category,
      status: transaction.status,
      type: transaction.type,
      occurredAt: transaction.occurredAt.slice(0, 10),
      debtId: transaction.debtId ?? '',
    });
    setErrors({});
    setFormOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();

    const amount = Number(draft.amount);
    const found = {};
    if (!draft.description.trim()) found.description = 'Add a short description.';
    if (!Number.isFinite(amount) || amount === 0) found.amount = 'Enter an amount (negative for spending).';
    if (!draft.category.trim()) found.category = 'Pick a category.';

    if (Object.keys(found).length) {
      setErrors(found);
      return;
    }

    const payload = {
      description: draft.description.trim(),
      amount,
      category: draft.category,
      status: draft.status,
      type: draft.type,
      occurredAt: new Date(`${draft.occurredAt}T12:00:00`).toISOString(),
      debtId: draft.debtId || null,
    };

    try {
      setSaving(true);
      if (editing) await api.patch(`/api/transactions/${editing.id}`, payload);
      else await api.post('/api/transactions', payload);

      toast.success(editing ? 'Transaction updated' : 'Transaction added');
      setFormOpen(false);
      ledger.reload();
      summary.reload();
    } catch (error) {
      if (error.details?.length) setErrors(Object.fromEntries(error.details.map((d) => [d.field, d.message])));
      toast.error('Could not save that transaction', error.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    try {
      setDeleting(true);
      await api.delete(`/api/transactions/${pendingDelete.id}`);
      toast.success('Transaction deleted');
      setPendingDelete(null);
      ledger.reload();
      summary.reload();
    } catch (error) {
      toast.error('Could not delete that transaction', error.message);
    } finally {
      setDeleting(false);
    }
  };

  const exportCsv = useCallback(async () => {
    try {
      setExporting(true);
      await downloadFile('/api/transactions/export', 'valmoney-ledger.csv');
      toast.success('Export downloaded');
    } catch (error) {
      toast.error('Export failed', error.message);
    } finally {
      setExporting(false);
    }
  }, [toast]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink">Ledger</h2>
          <p className="mt-1 text-sm text-ink-muted">Every movement in and out, with the exports you actually need.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportCsv} loading={exporting}>
            <Download size={16} /> Export CSV
          </Button>
          <Button onClick={openCreate}>
            <Plus size={16} /> Add transaction
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Income"
          value={totals?.income ?? 0}
          format={(value) => currency(value, currencyCode, { decimals: 0 })}
          hint="Matching the filters"
          icon={ArrowUpCircle}
          tone="success"
        />
        <StatCard
          label="Expenses"
          value={totals?.expenses ?? 0}
          format={(value) => currency(value, currencyCode, { decimals: 0 })}
          hint="Money out"
          icon={ArrowDownCircle}
          tone="danger"
        />
        <StatCard
          label="Debt payments"
          value={totals?.payments ?? 0}
          format={(value) => currency(value, currencyCode, { decimals: 0 })}
          hint="Reduces your balances"
          icon={Wallet}
          tone="brand"
        />
        <StatCard
          label="Net"
          value={totals?.net ?? 0}
          format={(value) => currency(value, currencyCode, { decimals: 0 })}
          hint="Income − expenses − payments"
          icon={BookOpen}
          tone={Number(totals?.net ?? 0) >= 0 ? 'success' : 'danger'}
        />
      </div>

      {summary.data?.trend?.length ? (
        <Card>
          <CardHeader title="Last six months" description="How much of your income is available for debt." />
          <CardBody>
            <TrendChart data={summary.data.trend} currencyCode={currencyCode} />
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Transactions"
          description={pagination ? `${pagination.total} matching record${pagination.total === 1 ? '' : 's'}` : undefined}
        />

        <div className="grid gap-3 border-b border-line p-5 sm:grid-cols-[1fr_auto_auto]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search descriptions and categories…" />
          <Select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter by type">
            <option value="">All types</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
            <option value="PAYMENT">Debt payment</option>
          </Select>
          <Select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">
            <option value="">All categories</option>
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </div>

        {ledger.loading && !ledger.data ? (
          <div className="grid place-items-center py-16">
            <Spinner size={22} />
          </div>
        ) : ledger.error ? (
          <ErrorState className="m-5" error={ledger.error} onRetry={ledger.reload} />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={search || type || category ? 'Nothing matches those filters' : 'No transactions yet'}
            description={
              search || type || category
                ? 'Try widening the search or clearing the filters.'
                : 'Log your income and spending so the plan knows what you can afford.'
            }
            action={
              search || type || category ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch('');
                    setType('');
                    setCategory('');
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button onClick={openCreate}>Add a transaction</Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-muted">
                  <th className="px-5 py-3 font-semibold">Description</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Amount</th>
                  <th className="px-5 py-3 text-right font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-line/70 last:border-0 hover:bg-surface-muted/60">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-ink">{transaction.description}</p>
                      {transaction.debtName ? (
                        <p className="text-xs text-ink-subtle">Applied to {transaction.debtName}</p>
                      ) : null}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={transaction.type === 'INCOME' ? 'success' : transaction.type === 'PAYMENT' ? 'brand' : 'muted'}>
                        {transaction.category}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-ink-muted">{shortDate(transaction.occurredAt)}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-semibold text-ink-muted">{transaction.status.toLowerCase()}</span>
                    </td>
                    <td
                      className={`px-5 py-3.5 text-right font-semibold tabular-nums ${
                        transaction.amount > 0 ? 'text-success' : 'text-ink'
                      }`}
                    >
                      {transaction.amount > 0 ? '+' : ''}
                      {currency(transaction.amount, currencyCode)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        <IconButton label="Edit transaction" onClick={() => openEdit(transaction)}>
                          <Pencil size={15} />
                        </IconButton>
                        <IconButton
                          label="Delete transaction"
                          onClick={() => setPendingDelete(transaction)}
                          className="hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 size={15} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.total > PAGE_SIZE ? (
          <div className="flex items-center justify-between gap-3 border-t border-line p-4">
            <p className="text-sm text-ink-muted">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={!pagination.hasMore} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit transaction' : 'Add transaction'}
        description="Negative amounts are spending, positive amounts are income."
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button form="txn-form" type="submit" loading={saving}>
              {editing ? 'Save changes' : 'Add transaction'}
            </Button>
          </>
        }
      >
        <form id="txn-form" onSubmit={submit} className="space-y-4">
          <Field label="Description" required error={errors.description}>
            <Input
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              error={errors.description}
              placeholder="Groceries"
              autoFocus
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount" required error={errors.amount} hint="Use a minus sign for spending.">
              <Input
                type="number"
                step="0.01"
                value={draft.amount}
                onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
                error={errors.amount}
                placeholder="-58.40"
              />
            </Field>

            <Field label="Date" required>
              <Input
                type="date"
                value={draft.occurredAt}
                onChange={(event) => setDraft({ ...draft, occurredAt: event.target.value })}
              />
            </Field>

            <Field label="Category" required error={errors.category}>
              <Select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Type">
              <Select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}>
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
                <option value="PAYMENT">Debt payment</option>
              </Select>
            </Field>
          </div>

          {draft.type === 'PAYMENT' ? (
            <Field label="Applied to account" hint="Paying an account updates its balance automatically.">
              <Select value={draft.debtId} onChange={(event) => setDraft({ ...draft, debtId: event.target.value })}>
                <option value="">Not linked</option>
                {(accounts.data?.debts ?? []).map((debt) => (
                  <option key={debt.id} value={debt.id}>
                    {debt.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <Field label="Status">
            <Select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
            </Select>
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="Delete this transaction?"
        description={`"${pendingDelete?.description ?? ''}" will be removed from your ledger. This cannot be undone.`}
        confirmLabel="Delete transaction"
      />
    </div>
  );
}
