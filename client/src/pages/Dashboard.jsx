import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CircleDollarSign,
  CreditCard,
  Landmark,
  MapPin,
  Plus,
  Receipt,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, query } from '../lib/api';
import { currency, duration, percent, relativeTime, shortDate } from '../lib/format';
import { useAsync, useDocumentTitle } from '../hooks';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { EmptyState, ErrorState, SkeletonCard, Spinner } from '../components/ui/Feedback';
import { StatCard } from '../components/ui/StatCard';
import { PayoffChart } from '../components/charts';
import { AccountFormModal } from '../components/accounts/AccountFormModal';
import { InterestBreakdown, StrategyPanel } from '../components/dashboard/StrategyPanel';
import { ExtraBudgetPanel } from '../components/dashboard/ExtraBudgetPanel';
import { HealthPanel } from '../components/dashboard/HealthPanel';
import { useShell } from '../components/layout/AppShell';

export default function Dashboard() {
  useDocumentTitle('Overview');
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const shell = useShell();

  const [strategy, setStrategy] = useState('avalanche');
  const [extraOverride, setExtraOverride] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const summary = useAsync(() => api.get('/api/dashboard'));

  // The plan re-runs server-side whenever the strategy or the extra budget
  // changes, so the dashboard and the Accounts page never disagree.
  const planDeps = [strategy, extraOverride];
  const plan = useAsync(
    () =>
      api.get(
        `/api/debts/strategy${query({
          strategy: 'both',
          scenarios: 'true',
          ...(extraOverride === null ? {} : { extra: extraOverride }),
        })}`,
      ),
    planDeps,
  );

  const currencyCode = summary.data?.currency ?? user?.currency ?? 'USD';
  const projections = plan.data ?? null;
  const active = projections?.[strategy] ?? null;
  const other = projections?.[strategy === 'avalanche' ? 'snowball' : 'avalanche'] ?? null;

  const chartData = useMemo(() => {
    if (!projections) return [];
    const avalanche = projections.avalanche?.timeline ?? [];
    const snowball = projections.snowball?.timeline ?? [];
    return avalanche.map((point, index) => ({
      label: point.label,
      balance: point.totalBalance,
      snowball: snowball[index]?.totalBalance ?? null,
    }));
  }, [projections]);

  const persistExtra = useCallback(
    async (value) => {
      setExtraOverride(value);
      try {
        await api.patch('/api/user/me', { extraMonthlyPayment: value });
        await refreshUser();
        toast.success('Plan updated', `Extra monthly payment set to ${currency(value, currencyCode, { decimals: 0 })}.`);
      } catch (error) {
        toast.error('Could not save that budget', error.message);
      }
    },
    [currencyCode, refreshUser, toast],
  );

  const notifications = useMemo(() => {
    const notes = [];
    const summaryData = summary.data;

    if (summaryData?.dueSoon?.length) {
      const next = summaryData.dueSoon[0];
      notes.push({
        id: `due-${next.debtId}`,
        title: `${next.debtName} payment due`,
        description: `${currency(next.amount, currencyCode, { decimals: 0 })} on ${shortDate(next.nextDueDate)}`,
        tone: 'warning',
      });
    }

    if (summaryData?.onboarding && !summaryData.onboarding.emailVerified) {
      notes.push({
        id: 'verify',
        title: 'Verify your email',
        description: 'Secure password recovery by confirming your address in Settings.',
        tone: 'accent',
      });
    }

    if (active?.stalled) {
      notes.push({
        id: 'stalled',
        title: 'Your plan never finishes',
        description: 'Minimums do not outpace interest — raise the monthly budget.',
        tone: 'danger',
      });
    }

    return notes;
  }, [summary.data, currencyCode, active?.stalled]);

  // Publish the alerts to the shell so the topbar's bell can show them.
  useEffect(() => {
    shell.setNotifications?.(notifications);
    return () => shell.setNotifications?.([]);
  }, [notifications, shell]);

  if (summary.loading && !summary.data) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
        <Card className="p-10">
          <div className="flex items-center justify-center gap-3 text-sm text-ink-muted">
            <Spinner /> Building your payoff plan…
          </div>
        </Card>
      </div>
    );
  }

  if (summary.error) {
    return <ErrorState error={summary.error} onRetry={summary.reload} />;
  }

  const data = summary.data;
  const hasAccounts = data.portfolio.accountCount > 0;

  if (!hasAccounts) {
    return (
      <>
        <OnboardingCard onAdd={() => setFormOpen(true)} />
        <AccountFormModal
          open={formOpen || Boolean(shell.quickAddOpen)}
          onClose={() => {
            setFormOpen(false);
            shell.closeQuickAdd?.();
          }}
          onSaved={() => {
            summary.reload();
            plan.reload();
          }}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* How the plan is doing */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total debt"
          value={data.portfolio.totalBalance}
          format={(value) => currency(value, currencyCode, { decimals: 0 })}
          hint={`${data.portfolio.accountCount} account${data.portfolio.accountCount === 1 ? '' : 's'}`}
          icon={Landmark}
          tone="danger"
        />
        <StatCard
          label="Monthly outlay"
          value={data.portfolio.monthlyOutlay}
          format={(value) => currency(value, currencyCode, { decimals: 0 })}
          hint={`${currency(data.portfolio.monthlyMinimums, currencyCode, { decimals: 0 })} minimums + ${currency(
            data.portfolio.extraMonthlyPayment,
            currencyCode,
            { decimals: 0 },
          )} extra`}
          icon={CircleDollarSign}
          tone="brand"
        />
        <StatCard
          label="Debt-free"
          value={active?.debtFreeLabel ?? '—'}
          animate={false}
          hint={active ? `${duration(active.months)} from today` : 'Add accounts to project'}
          icon={CalendarClock}
          tone="success"
        />
        <StatCard
          label="Interest on the table"
          value={active?.totalInterest ?? 0}
          format={(value) => currency(value, currencyCode, { decimals: 0 })}
          hint={
            projections?.comparison
              ? `${currency(projections.comparison.avalancheVsMinimumOnly.interestSavedCents / 100, currencyCode, {
                  decimals: 0,
                })} saved vs minimums only`
              : `Weighted APR ${percent(data.portfolio.weightedApr, { decimals: 2, fromRatio: false })}`
          }
          icon={TrendingDown}
          tone="warning"
        />
      </div>

      {/* Detail-panel row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              icon={TrendingDown}
              title="Balance over time"
              description="Avalanche versus snowball on your current balances."
              action={
                <Badge tone="brand">
                  <Sparkles size={12} /> {active?.months ?? 0} months to zero
                </Badge>
              }
            />
            <CardBody>
              {plan.loading && !projections ? (
                <div className="grid h-[300px] place-items-center">
                  <Spinner />
                </div>
              ) : (
                <PayoffChart data={chartData} currencyCode={currencyCode} showSnowball height={300} />
              )}
            </CardBody>
          </Card>

          {plan.error ? (
            <ErrorState error={plan.error} onRetry={plan.reload} />
          ) : active && projections ? (
            <StrategyPanel
              strategy={strategy}
              onStrategyChange={setStrategy}
              projection={active}
              otherProjection={other}
              comparison={projections.comparison}
              recommendation={projections.recommendation}
              recommendationReason={projections.recommendationReason}
              currencyCode={currencyCode}
            />
          ) : null}
        </div>

        <div className="space-y-4">
          {plan.data ? (
            <ExtraBudgetPanel
              extraMonthlyPayment={extraOverride ?? data.portfolio.extraMonthlyPayment}
              onExtraChange={persistExtra}
              scenarios={plan.data.scenarios ?? []}
              currencyCode={currencyCode}
            />
          ) : null}

          <HealthPanel health={data.health} />
        </div>
      </div>

      {/* Cash flow + accounts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            icon={BookOpen}
            title="This month"
            description={`${currency(data.cashFlow.income, currencyCode, { decimals: 0 })} in, ${currency(
              data.cashFlow.expenses + data.cashFlow.payments,
              currencyCode,
              { decimals: 0 },
            )} out`}
            action={
              <Button as={Link} to="/ledger" variant="ghost" size="sm">
                Open ledger <ArrowRight size={14} />
              </Button>
            }
          />

          {data.recentTransactions.length ? (
            <ul className="divide-y divide-line">
              {data.recentTransactions.map((transaction) => (
                <li key={transaction.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-muted text-ink-muted">
                      <Receipt size={15} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{transaction.description}</p>
                      <p className="text-xs text-ink-muted">
                        {transaction.category} · {relativeTime(transaction.occurredAt)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold tabular-nums ${
                      transaction.amount > 0 ? 'text-success' : 'text-ink'
                    }`}
                  >
                    {transaction.amount > 0 ? '+' : ''}
                    {currency(transaction.amount, currencyCode)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="No activity logged"
              description="Record income and spending to see how much you can safely throw at debt."
              action={
                <Button as={Link} to="/ledger">
                  Add a transaction
                </Button>
              }
            />
          )}
        </Card>

        <Card>
          <CardHeader
            icon={CreditCard}
            title="Accounts"
            action={
              <Button variant="ghost" size="sm" onClick={() => setFormOpen(true)}>
                <Plus size={14} /> Add
              </Button>
            }
          />
          <CardBody className="space-y-3">
            {data.debts.slice(0, 5).map((debt) => (
              <div key={debt.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{debt.name}</p>
                  <p className="text-xs text-ink-muted">
                    {Number(debt.apr).toFixed(2)}% APR · min {currency(debt.minPayment, currencyCode, { decimals: 0 })}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                  {currency(debt.balance, currencyCode, { decimals: 0 })}
                </span>
              </div>
            ))}

            <Button as={Link} to="/debts" variant="secondary" className="w-full">
              Manage accounts <ArrowRight size={14} />
            </Button>
          </CardBody>
        </Card>
      </div>

      {active?.interestByDebt?.length ? (
        <InterestBreakdown rows={active.interestByDebt} currencyCode={currencyCode} />
      ) : null}

      {data.dueSoon.length ? (
        <Card>
          <CardHeader icon={MapPin} title="Coming up" description="Your next scheduled minimum payments." />
          <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.dueSoon.map((due) => (
              <div key={due.debtId} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{due.debtName}</p>
                  <p className="text-xs text-ink-muted">{shortDate(due.nextDueDate)}</p>
                </div>
                <Badge tone="warning">{currency(due.amount, currencyCode, { decimals: 0 })}</Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}

      <AccountFormModal
        open={formOpen || Boolean(shell.quickAddOpen)}
        onClose={() => {
          setFormOpen(false);
          shell.closeQuickAdd?.();
        }}
        onSaved={() => {
          summary.reload();
          plan.reload();
        }}
      />
    </div>
  );
}

/** Shown until the first account exists — the whole plan depends on that data. */
function OnboardingCard({ onAdd }) {
  const steps = [
    { done: true, label: 'Account created' },
    { done: false, label: 'Add your first account' },
    { done: false, label: 'Log your income' },
    { done: false, label: 'Compare strategies' },
  ];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="border-b border-line bg-gradient-to-r from-brand/12 to-accent/10 p-6 sm:p-8">
          <Badge tone="brand">
            <Sparkles size={12} /> Welcome aboard
          </Badge>
          <h2 className="mt-3 text-2xl font-bold text-ink">Let&apos;s build your payoff plan</h2>
          <p className="mt-2 max-w-xl text-sm text-ink-muted">
            Add each account once — the balance, the interest rate and the minimum payment. VALMONEY will then show you the
            fastest way out and exactly what each strategy costs you in interest.
          </p>
          <Button className="mt-5" onClick={onAdd}>
            <Plus size={16} /> Add your first account
          </Button>
        </div>

        <CardBody>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <li key={step.label} className="flex items-center gap-3 rounded-xl border border-line p-3.5">
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    step.done ? 'bg-success/15 text-success' : 'bg-surface-muted text-ink-muted'
                  }`}
                >
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-ink">{step.label}</span>
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { title: 'Avalanche', body: 'Highest interest rate first. Cheapest overall, slowest first win.' },
          { title: 'Snowball', body: 'Smallest balance first. A little more interest, a much faster first win.' },
          { title: 'Both, always', body: 'Every projection is computed both ways so you can choose with real numbers.' },
        ].map((item) => (
          <Card key={item.title} className="p-5">
            <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
            <p className="mt-1.5 text-sm text-ink-muted">{item.body}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
