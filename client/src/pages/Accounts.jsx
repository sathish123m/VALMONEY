import { useCallback, useMemo, useState } from 'react';
import { CreditCard, Info, Plus, Sparkles } from 'lucide-react';
import { api, query } from '../lib/api';
import { currency, percent, duration } from '../lib/format';
import { useAsync, useDocumentTitle } from '../hooks';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/Modal';
import { ErrorState, SkeletonCard } from '../components/ui/Feedback';
import { StatCard } from '../components/ui/StatCard';
import { AccountCards, AccountTable } from '../components/accounts/AccountList';
import { AccountFormModal } from '../components/accounts/AccountFormModal';
import { InterestBreakdown, StrategyPanel } from '../components/dashboard/StrategyPanel';

export default function Accounts() {
  useDocumentTitle('Accounts');
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [strategy, setStrategy] = useState('avalanche');
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [extra, setExtra] = useState(null);

  const accounts = useAsync(() => api.get('/api/debts'));
  const plan = useAsync(
    () => api.get(`/api/debts/strategy${query({ strategy: 'both', ...(extra === null ? {} : { extra }) })}`),
    [extra],
  );

  const currencyCode = user?.currency ?? 'USD';

  const totals = useMemo(() => {
    const list = accounts.data?.debts ?? [];
    return {
      balance: list.reduce((sum, d) => sum + Number(d.balance), 0),
      minimums: list.reduce((sum, d) => sum + Number(d.minPayment), 0),
      weightedApr:
        list.length > 0
          ? list.reduce((sum, d) => sum + Number(d.apr) * Number(d.balance), 0) /
            Math.max(
              1,
              list.reduce((sum, d) => sum + Number(d.balance), 0),
            )
          : 0,
      highest: list.reduce((worst, d) => (Number(d.apr) > Number(worst?.apr ?? -1) ? d : worst), null),
    };
  }, [accounts.data]);

  const refreshAll = useCallback(() => {
    accounts.reload();
    plan.reload();
  }, [accounts, plan]);

  const remove = async () => {
    if (!pendingDelete) return;
    try {
      setDeleting(true);
      await api.delete(`/api/debts/${pendingDelete.id}`);
      toast.success('Account removed', `${pendingDelete.name} is no longer part of your plan.`);
      setPendingDelete(null);
      refreshAll();
    } catch (error) {
      toast.error('Could not remove that account', error.message);
    } finally {
      setDeleting(false);
    }
  };

  const persistExtra = async (value) => {
    setExtra(value);
    try {
      await api.patch('/api/user/me', { extraMonthlyPayment: value });
      await refreshUser();
    } catch (error) {
      toast.error('Could not save that budget', error.message);
    }
  };

  if (accounts.loading && !accounts.data) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
        <SkeletonCard lines={6} />
      </div>
    );
  }

  if (accounts.error) return <ErrorState error={accounts.error} onRetry={accounts.reload} />;

  const list = accounts.data.debts;
  const active = plan.data?.[strategy] ?? null;
  const other = plan.data?.[strategy === 'avalanche' ? 'snowball' : 'avalanche'] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-ink">Your accounts</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Every balance, rate and minimum here feeds directly into the payoff projection.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus size={16} /> Add account
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total debt"
          value={totals.balance}
          format={(value) => currency(value, currencyCode, { decimals: 0 })}
          hint={`${list.length} account${list.length === 1 ? '' : 's'}`}
          icon={CreditCard}
          tone="danger"
        />
        <StatCard
          label="Minimums"
          value={totals.minimums}
          format={(value) => currency(value, currencyCode, { decimals: 0 })}
          hint="Committed every month"
          tone="brand"
        />
        <StatCard
          label="Weighted APR"
          value={totals.weightedApr}
          format={(value) => `${Number(value).toFixed(2)}%`}
          animate={false}
          hint="Across all balances"
          tone="warning"
        />
        <StatCard
          label="Debt-free"
          value={active?.debtFreeLabel ?? '—'}
          animate={false}
          hint={active ? duration(active.months) : 'Add an account'}
          tone="success"
        />
      </div>

      {totals.highest && Number(totals.highest.apr) > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-brand/25 bg-brand/8 p-4">
          <Info size={17} className="mt-0.5 shrink-0 text-brand" />
          <p className="text-sm text-ink-muted">
            <span className="font-semibold text-ink">{totals.highest.name}</span> carries your highest rate at{' '}
            {percent(totals.highest.apr, { decimals: 2, fromRatio: false })} APR. Under avalanche it is targeted first —
            that is where extra money earns the most.
          </p>
        </div>
      ) : null}

      <Card>
        <CardHeader title="All accounts" description="Edit any value inline to see the plan update immediately." />
        <AccountTable
          accounts={list}
          onEdit={(account) => {
            setEditing(account);
            setFormOpen(true);
          }}
          onDelete={setPendingDelete}
        />
        <AccountCards
          accounts={list}
          onEdit={(account) => {
            setEditing(account);
            setFormOpen(true);
          }}
          onDelete={setPendingDelete}
        />
      </Card>

      {plan.data && active ? (
        <>
          <StrategyPanel
            strategy={strategy}
            onStrategyChange={setStrategy}
            projection={active}
            otherProjection={other}
            comparison={plan.data.comparison}
            recommendation={plan.data.recommendation}
            recommendationReason={plan.data.recommendationReason}
            currencyCode={currencyCode}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Extra monthly payment" description="Tune the accelerator for this plan." />
              <CardBody>
                <p className="text-3xl font-bold tabular-nums text-ink">
                  {currency(extra ?? user?.extraMonthlyPayment ?? 0, currencyCode, { decimals: 0 })}
                  <span className="ml-1 text-sm font-medium text-ink-muted">/mo</span>
                </p>
                <input
                  type="range"
                  min={0}
                  max={2000}
                  step={25}
                  value={extra ?? user?.extraMonthlyPayment ?? 0}
                  onChange={(event) => setExtra(Number(event.target.value))}
                  onPointerUp={() => persistExtra(extra ?? user?.extraMonthlyPayment ?? 0)}
                  onKeyUp={() => persistExtra(extra ?? user?.extraMonthlyPayment ?? 0)}
                  aria-label="Extra monthly payment"
                  className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-muted accent-[rgb(var(--brand))]"
                />
                <p className="mt-3 text-xs text-ink-subtle">
                  Saved to your settings when you release the slider.
                </p>
              </CardBody>
            </Card>

            {active.interestByDebt?.length ? (
              <InterestBreakdown rows={active.interestByDebt} currencyCode={currencyCode} />
            ) : null}
          </div>
        </>
      ) : null}

      {list.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
            <Badge tone="brand">
              <Sparkles size={12} /> Tip
            </Badge>
            <p className="max-w-md text-sm text-ink-muted">
              Add accounts one at a time — you can always refine the numbers later. The projection is only as good as the
              balances and rates behind it.
            </p>
          </CardBody>
        </Card>
      ) : null}

      <AccountFormModal open={formOpen} onClose={() => setFormOpen(false)} account={editing} onSaved={refreshAll} />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title={`Remove ${pendingDelete?.name ?? 'account'}?`}
        description="This removes the account and its projection. Transactions you logged against it are kept but unlinked."
        confirmLabel="Remove account"
      />
    </div>
  );
}
