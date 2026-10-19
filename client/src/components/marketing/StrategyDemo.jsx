import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Info, RotateCcw, Sparkles, TriangleAlert } from 'lucide-react';
import { compareStrategies } from '../../lib/payoff';
import { currency, duration } from '../../lib/format';
import { SAMPLE_DEBTS, SAMPLE_EXTRA_MONTHLY } from '../../lib/samplePortfolio';
import { Button } from '../ui/Button';
import { Input } from '../ui/Field';
import { Segmented } from '../ui/Segmented';
import { Section } from './Section';
import { Sparkline } from './Sparkline';

const STRATEGY_OPTIONS = [
  { value: 'avalanche', label: 'Avalanche' },
  { value: 'snowball', label: 'Snowball' },
];

const toRows = (debts) =>
  debts.map((debt) => ({
    id: debt.id,
    name: debt.name,
    balance: String(debt.balance),
    apr: String(debt.apr),
    minPayment: String(debt.minPayment),
  }));

/**
 * Interactive what-if panel. Everything below runs in the browser through the
 * client mirror of the payoff engine, so dragging the budget slider or editing
 * a balance re-prices both strategies instantly with no round trip.
 */
export function StrategyDemo() {
  const [rows, setRows] = useState(() => toRows(SAMPLE_DEBTS));
  const [extra, setExtra] = useState(SAMPLE_EXTRA_MONTHLY);
  const [strategy, setStrategy] = useState('avalanche');

  const updateRow = (id, patch) => setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const result = useMemo(() => {
    const debts = rows
      .map((row) => ({
        id: row.id,
        name: row.name,
        balance: Number(row.balance) || 0,
        apr: Number(row.apr) || 0,
        minPayment: Number(row.minPayment) || 0,
      }))
      .filter((row) => row.balance > 0);

    const plan = compareStrategies({ debts, extraMonthlyPaymentCents: Math.round((Number(extra) || 0) * 100) });

    return {
      ...plan,
      debts,
      totalBalance: debts.reduce((sum, row) => sum + row.balance, 0),
    };
  }, [rows, extra]);

  const active = result[strategy];
  const other = result[strategy === 'avalanche' ? 'snowball' : 'avalanche'];
  const balances = active.timeline.map((point) => point.totalBalanceCents / 100);
  const interestGap = Math.abs(result.avalanche.totalInterestCents - result.snowball.totalInterestCents) / 100;

  const isSample =
    extra === SAMPLE_EXTRA_MONTHLY && rows.every((row) => row.balance === String(SAMPLE_DEBTS.find((d) => d.id === row.id)?.balance));

  return (
    <Section
      id="strategy-demo"
      eyebrow="Strategy engine"
      title="Price your own portfolio — right here, right now"
      description="Edit the balances below or move the monthly budget. Both strategies are recalculated on the spot with the same integer-cent engine the API runs, so what you see is what you get."
      className="border-y border-line bg-surface/40"
    >
      <div className="reveal grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* Inputs */}
        <div className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-ink">Your accounts</h3>
              <p className="text-sm text-ink-muted">Dollars and annual percentage rate.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setRows(toRows(SAMPLE_DEBTS))} disabled={isSample}>
              <RotateCcw size={14} /> Reset
            </Button>
          </div>

          <div className="mt-5 space-y-4">
            {rows.map((row) => (
              <div key={row.id} className="rounded-2xl border border-line p-3.5">
                <p className="text-sm font-semibold text-ink">{row.name}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Balance</span>
                    <Input
                      type="number"
                      min="0"
                      step="50"
                      prefix="$"
                      value={row.balance}
                      onChange={(event) => updateRow(row.id, { balance: event.target.value })}
                      aria-label={`${row.name} balance`}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">APR</span>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      suffix="%"
                      value={row.apr}
                      onChange={(event) => updateRow(row.id, { apr: event.target.value })}
                      aria-label={`${row.name} interest rate`}
                    />
                  </label>
                  <label className="col-span-2 block sm:col-span-1">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Minimum</span>
                    <Input
                      type="number"
                      min="0"
                      step="5"
                      prefix="$"
                      value={row.minPayment}
                      onChange={(event) => updateRow(row.id, { minPayment: event.target.value })}
                      aria-label={`${row.name} minimum payment`}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-surface-muted p-4">
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="demo-extra" className="text-sm font-semibold text-ink">
                Extra every month
              </label>
              <span className="text-sm font-bold tabular-nums text-brand">
                {currency(Number(extra) || 0, 'USD', { decimals: 0 })}
              </span>
            </div>
            <input
              id="demo-extra"
              type="range"
              min="0"
              max="1500"
              step="25"
              value={extra}
              onChange={(event) => setExtra(Number(event.target.value))}
              className="mt-3 w-full accent-[rgb(var(--brand))]"
            />
            <p className="mt-2 text-xs text-ink-subtle">
              Freed-up minimums roll onto the next target automatically — that is why the plan beats paying minimums alone.
            </p>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
              <Segmented
                options={STRATEGY_OPTIONS}
                value={strategy}
                onChange={setStrategy}
                size="sm"
                ariaLabel="Payoff strategy"
              />
              <span className="text-xs font-semibold text-ink-muted">
                {currency(result.totalBalance, 'USD', { decimals: 0 })} total · {result.debts.length} accounts
              </span>
            </div>

            <div className="p-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Debt-free</p>
                  <p className="mt-1 text-3xl font-extrabold text-ink">{active.debtFreeLabel ?? '—'}</p>
                  <p className="mt-0.5 text-sm text-ink-muted">{duration(active.months)} from today</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Total interest</p>
                  <p className="mt-1 text-3xl font-extrabold tabular-nums text-warning">
                    {currency(active.totalInterestCents / 100, 'USD', { decimals: 0 })}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-muted">on {currency(active.totalPaidCents / 100, 'USD', { decimals: 0 })} paid</p>
                </div>
              </div>

              <div className="mt-5 h-40">
                <Sparkline
                  values={balances}
                  stroke={strategy === 'avalanche' ? 'rgb(var(--brand))' : 'rgb(var(--accent))'}
                  fill={strategy === 'avalanche' ? 'rgb(var(--brand) / 0.22)' : 'rgb(var(--accent) / 0.22)'}
                  ariaLabel={`${strategy} balance over time`}
                />
              </div>

              {active.stalled ? (
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-danger/10 p-3 text-sm text-danger">
                  <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                  These payments never clear the balance — the minimums do not outpace interest. Raise the monthly budget.
                </p>
              ) : (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-line p-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">First account clear</p>
                    <p className="mt-1 text-sm font-bold text-ink">
                      {active.payoffOrder[0]?.debtName ?? '—'}
                      {active.payoffOrder[0]?.payoffLabel ? (
                        <span className="ml-1.5 font-medium text-ink-muted">{active.payoffOrder[0].payoffLabel}</span>
                      ) : null}
                    </p>
                  </div>
                  <div className="rounded-xl border border-line p-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
                      {strategy === 'avalanche' ? 'Snowball would cost' : 'Avalanche would save'}
                    </p>
                    <p className="mt-1 text-sm font-bold text-ink">
                      {currency(interestGap, 'USD', { decimals: 0 })}
                      <span className="ml-1.5 font-medium text-ink-muted">
                        ({other.months} mo vs {active.months} mo)
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-success/12 text-success">
                <Sparkles size={17} />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">
                  Against minimums alone this saves{' '}
                  {currency(result.comparison.avalancheVsMinimumOnly.interestSavedCents / 100, 'USD', { decimals: 0 })} and{' '}
                  {result.comparison.avalancheVsMinimumOnly.monthsSaved} months
                </p>
                <p className="mt-1 text-sm text-ink-muted">
                  Minimums-only is the baseline VALMONEY computes internally: same balances, no extra budget, no rollover.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
              <Button as={Link} to="/register">
                Run this on my real accounts <ArrowRight size={15} />
              </Button>
              <p className="flex items-center gap-1.5 text-xs text-ink-subtle">
                <Info size={13} /> Demo numbers only — nothing is saved until you sign up.
              </p>
            </div>
          </div>

          {result.debts.some((debt) => debt.minPayment > 0 && debt.minPayment * 100 <= (debt.balance * 100 * debt.apr) / 1200) ? (
            <p className="flex items-start gap-2 text-xs text-warning">
              <TriangleAlert size={14} className="mt-0.5 shrink-0" />
              At least one minimum payment does not cover its own monthly interest — that account can never be cleared at the minimum.
            </p>
          ) : null}
        </div>
      </div>
    </Section>
  );
}
