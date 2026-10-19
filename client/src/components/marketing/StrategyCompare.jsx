import { useMemo } from 'react';
import { Check, Minus } from 'lucide-react';
import { compareStrategies } from '../../lib/payoff';
import { currency } from '../../lib/format';
import { SAMPLE_DEBTS, SAMPLE_EXTRA_MONTHLY } from '../../lib/samplePortfolio';
import { Section } from './Section';

/** Side-by-side pricing of both strategies on the demo portfolio. */
export function StrategyCompare() {
  const plan = useMemo(
    () => compareStrategies({ debts: SAMPLE_DEBTS, extraMonthlyPaymentCents: SAMPLE_EXTRA_MONTHLY * 100 }),
    [],
  );

  const rows = [
    {
      label: 'Debt-free',
      avalanche: plan.avalanche.debtFreeLabel,
      snowball: plan.snowball.debtFreeLabel,
    },
    {
      label: 'Months of payments',
      avalanche: plan.avalanche.months,
      snowball: plan.snowball.months,
    },
    {
      label: 'Total interest',
      avalanche: currency(plan.avalanche.totalInterestCents / 100, 'USD', { decimals: 0 }),
      snowball: currency(plan.snowball.totalInterestCents / 100, 'USD', { decimals: 0 }),
      better: 'snowball',
      higherIsWorse: true,
    },
    {
      label: 'First account cleared',
      avalanche: `${plan.avalanche.payoffOrder[0]?.debtName} · ${plan.avalanche.payoffOrder[0]?.payoffLabel}`,
      snowball: `${plan.snowball.payoffOrder[0]?.debtName} · ${plan.snowball.payoffOrder[0]?.payoffLabel}`,
      better: 'snowball',
    },
    {
      label: 'Interest saved vs minimums only',
      avalanche: currency(plan.comparison.avalancheVsMinimumOnly.interestSavedCents / 100, 'USD', { decimals: 0 }),
      snowball: currency(plan.comparison.snowballVsMinimumOnly.interestSavedCents / 100, 'USD', { decimals: 0 }),
      better: 'tie',
    },
  ];

  const winner = plan.avalanche.totalInterestCents <= plan.snowball.totalInterestCents ? 'avalanche' : 'snowball';

  return (
    <Section
      id="compare"
      eyebrow="Avalanche vs snowball"
      title="Two honest numbers instead of one opinion"
      description="Both columns are computed from the same portfolio — the seeded demo account, minimums plus $300 a month."
    >
      <div className="reveal overflow-hidden rounded-2xl border border-line bg-surface">
        <table className="w-full text-sm">
          <caption className="sr-only">Avalanche versus snowball on the demo portfolio</caption>
          <thead>
            <tr className="border-b border-line bg-surface-muted/60">
              <th scope="col" className="p-4 text-left text-xs font-bold uppercase tracking-wider text-ink-muted">
                Metric
              </th>
              {['avalanche', 'snowball'].map((key) => (
                <th key={key} scope="col" className="p-4 text-left">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-bold capitalize text-ink">{key}</span>
                    {winner === key ? (
                      <span className="rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-bold text-success ring-1 ring-inset ring-success/25">
                        Cheapest
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-xs font-medium text-ink-muted">
                    {key === 'avalanche' ? 'Highest rate first' : 'Smallest balance first'}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-line last:border-0">
                <th scope="row" className="p-4 text-left font-medium text-ink-muted">
                  {row.label}
                </th>
                {['avalanche', 'snowball'].map((key) => (
                  <td key={key} className="p-4">
                    <span className="flex items-center gap-2 font-semibold tabular-nums text-ink">
                      {row.better === key ? (
                        <Check size={15} className="shrink-0 text-success" />
                      ) : row.better && row.better !== 'tie' ? (
                        <Minus size={15} className="shrink-0 text-ink-subtle" />
                      ) : null}
                      {row[key]}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="reveal mx-auto mt-6 max-w-2xl text-center text-sm text-ink-muted">
        Avalanche saves {currency(plan.comparison.interestSavedByAvalancheCents / 100, 'USD', { decimals: 0 })} in interest over
        snowball on this portfolio; snowball clears its first account{' '}
        {Math.max(0, (plan.avalanche.payoffOrder[0]?.payoffMonth ?? 0) - (plan.snowball.payoffOrder[0]?.payoffMonth ?? 0))} month(s)
        sooner. Both beat minimums-only by {currency(plan.comparison.avalancheVsMinimumOnly.interestSavedCents / 100, 'USD', { decimals: 0 })}.
      </p>
    </Section>
  );
}
