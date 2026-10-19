import { CalendarCheck, CircleDollarSign, Clock, Target, TrendingDown, TriangleAlert } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { ProgressBar } from '../ui/Feedback';
import { Segmented } from '../ui/Segmented';
import { currency, duration } from '../../lib/format';
import { STRATEGIES } from '../../lib/constants';
import { cn } from '../../lib/cn';

/** Headline numbers for the selected plan. */
function ProjectionStats({ projection, currencyCode }) {
  const stats = [
    {
      label: 'Debt-free',
      value: projection.debtFreeLabel ?? '—',
      hint: duration(projection.months),
      icon: CalendarCheck,
      tone: 'success',
    },
    {
      label: 'Monthly outlay',
      value: currency(projection.monthlyOutlay, currencyCode, { decimals: 0 }),
      hint: 'Minimums + extra',
      icon: CircleDollarSign,
      tone: 'brand',
    },
    {
      label: 'Interest remaining',
      value: currency(projection.totalInterest, currencyCode, { decimals: 0 }),
      hint: 'If you stay on plan',
      icon: TrendingDown,
      tone: 'warning',
    },
    {
      label: 'Total to repay',
      value: currency(projection.totalPaid, currencyCode, { decimals: 0 }),
      hint: 'Principal + interest',
      icon: Target,
      tone: 'accent',
    },
  ];

  const tones = {
    success: 'bg-success/10 text-success',
    brand: 'bg-brand/10 text-brand',
    warning: 'bg-warning/10 text-warning',
    accent: 'bg-accent/10 text-accent',
  };

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-xl border border-line bg-surface-muted/50 p-3.5">
          <div className="flex items-center gap-2">
            <span className={cn('grid h-7 w-7 place-items-center rounded-lg', tones[stat.tone])}>
              <stat.icon size={14} />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">{stat.label}</span>
          </div>
          <p className="mt-2 text-lg font-bold tabular-nums text-ink">{stat.value}</p>
          <p className="text-[11px] text-ink-subtle">{stat.hint}</p>
        </div>
      ))}
    </div>
  );
}

export function StrategyPanel({
  strategy,
  onStrategyChange,
  projection,
  otherProjection,
  comparison,
  recommendation,
  recommendationReason,
  currencyCode = 'USD',
}) {
  const active = STRATEGIES[strategy];
  const other = STRATEGIES[strategy === 'avalanche' ? 'snowball' : 'avalanche'];

  const interestDelta = otherProjection
    ? Math.abs(otherProjection.totalInterest - projection.totalInterest)
    : 0;
  const monthDelta = otherProjection ? Math.abs(otherProjection.months - projection.months) : 0;

  return (
    <Card>
      <CardHeader
        icon={Target}
        title="Payoff plan"
        description={active.description}
        action={
          <Segmented
            ariaLabel="Payoff strategy"
            value={strategy}
            onChange={onStrategyChange}
            options={[
              { value: 'avalanche', label: 'Avalanche' },
              { value: 'snowball', label: 'Snowball' },
            ]}
          />
        }
      />

      <CardBody className="space-y-5">
        <ProjectionStats projection={projection} currencyCode={currencyCode} />

        {projection.stalled ? (
          <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4">
            <TriangleAlert size={18} className="mt-0.5 shrink-0 text-danger" />
            <div>
              <p className="text-sm font-semibold text-ink">This plan never finishes</p>
              <p className="mt-0.5 text-sm text-ink-muted">
                The current payments do not outpace interest. Increase the monthly budget below, or raise the minimums.
              </p>
            </div>
          </div>
        ) : null}

        {otherProjection ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-surface-muted p-3.5 text-sm">
            <Badge tone={recommendation === strategy ? 'success' : 'neutral'}>
              {recommendation === strategy ? 'Recommended' : `Try ${other.label}`}
            </Badge>
            <span className="text-ink-muted">
              {recommendation === strategy
                ? recommendationReason
                : `${other.label} would cost ${currency(interestDelta, currencyCode, { decimals: 0 })} ${
                    otherProjection.totalInterest > projection.totalInterest ? 'more' : 'less'
                  } in interest${monthDelta ? ` and finish ${monthDelta} month${monthDelta === 1 ? '' : 's'} ${otherProjection.months > projection.months ? 'later' : 'sooner'}` : ''}.`}
            </span>
          </div>
        ) : null}

        {comparison ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-line p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Versus minimums only</p>
              <p className="mt-1.5 text-sm text-ink">
                You save{' '}
                <span className="font-bold text-success">
                  {currency(comparison.avalancheVsMinimumOnly.interestSavedCents / 100, currencyCode, { decimals: 0 })}
                </span>{' '}
                in interest and finish{' '}
                <span className="font-bold text-ink">{comparison.avalancheVsMinimumOnly.monthsSaved} months</span> sooner.
              </p>
            </div>

            <div className="rounded-xl border border-line p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Avalanche vs snowball</p>
              <p className="mt-1.5 text-sm text-ink">
                {comparison.interestSavedByAvalancheCents > 0 ? (
                  <>
                    Avalanche is{' '}
                    <span className="font-bold text-brand">
                      {currency(comparison.interestSavedByAvalancheCents / 100, currencyCode, { decimals: 0 })}
                    </span>{' '}
                    cheaper
                    {comparison.monthsSavedByAvalanche > 0 ? ` and ${comparison.monthsSavedByAvalanche} month(s) faster` : ''}.
                  </>
                ) : (
                  <>Both strategies cost the same on your current balances — pick whichever keeps you motivated.</>
                )}
              </p>
            </div>
          </div>
        ) : null}

        {/* Payoff order */}
        {projection.payoffOrder?.length ? (
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
              <Clock size={15} className="text-ink-muted" />
              Order of attack
            </h4>
            <ol className="space-y-2">
              {projection.payoffOrder.map((row, index) => (
                <li key={row.debtId ?? row.debtName} className="flex items-center gap-3 rounded-xl border border-line p-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/12 text-xs font-bold text-brand">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{row.debtName}</p>
                    <p className="text-xs text-ink-muted">
                      Cleared {row.payoffLabel ?? 'beyond the horizon'} · {currency(row.interest ?? 0, currencyCode, { decimals: 0 })} interest
                    </p>
                  </div>

                  {index === 0 ? <Badge tone="brand">Next target</Badge> : null}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

/** Interest split per account, so it is obvious where the money is going. */
export function InterestBreakdown({ rows, currencyCode = 'USD' }) {
  if (!rows?.length) return null;

  return (
    <Card>
      <CardHeader title="Where your interest goes" description="Projected interest per account under this plan." />
      <CardBody className="space-y-4">
        {rows.map((row) => (
          <div key={row.debtId ?? row.debtName}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-medium text-ink">{row.debtName}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                {currency(row.interest, currencyCode, { decimals: 0 })}
              </span>
            </div>
            <ProgressBar value={row.share * 100} tone={row.apr >= 20 ? 'danger' : 'brand'} label={`${row.debtName} interest share`} />
            <p className="mt-1 text-xs text-ink-subtle">
              {Number(row.apr).toFixed(2)}% APR · {(row.share * 100).toFixed(1)}% of all interest
            </p>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
