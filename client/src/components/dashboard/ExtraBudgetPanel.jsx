import { useEffect, useState } from 'react';
import { Sparkles, Wallet } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { currency } from '../../lib/format';
import { cn } from '../../lib/cn';
import { useDebounce } from '../../hooks';

const PRESETS = [0, 50, 100, 250, 500, 1000];

/**
 * The "what if I paid a bit more?" control.
 *
 * Changing the slider re-runs the server projection (debounced) so the numbers
 * come from the authoritative engine, while the local engine keeps the slider
 * physically responsive.
 */
export function ExtraBudgetPanel({ extraMonthlyPayment, onExtraChange, scenarios = [], currencyCode = 'USD', max = 2000 }) {
  const [draft, setDraft] = useState(Math.min(Number(extraMonthlyPayment) || 0, max));
  const debounced = useDebounce(draft, 450);

  // Keep the slider in sync when the value changes from outside (e.g. profile).
  useEffect(() => {
    setDraft(Math.min(Number(extraMonthlyPayment) || 0, max));
  }, [extraMonthlyPayment, max]);

  const baseline = scenarios[0];
  const current = scenarios.find((row) => row.extraMonthlyPayment === debounced) ?? null;

  const compare = (row) => {
    if (!baseline || !row || row === baseline) return null;
    const monthSaving = baseline.months - row.months;
    const interestSaving = baseline.totalInterest - row.totalInterest;
    if (monthSaving <= 0 && interestSaving <= 0) return null;
    return { monthSaving, interestSaving };
  };

  const currentDelta = compare(current);

  return (
    <Card>
      <CardHeader
        icon={Wallet}
        title="Extra monthly payment"
        description="Anything above your minimums is what actually accelerates the plan."
      />
      <CardBody className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-3xl font-bold tabular-nums text-ink">
              {currency(draft, currencyCode, { decimals: 0 })}
              <span className="ml-1 text-sm font-medium text-ink-muted">/mo</span>
            </p>
            <p className="mt-1 text-xs text-ink-subtle">Saved to your profile when you release the slider.</p>
          </div>

          {currentDelta ? (
            <div className="text-right">
              <Badge tone="success">
                <Sparkles size={12} /> {currentDelta.monthSaving} months sooner
              </Badge>
              <p className="mt-1.5 text-xs text-ink-muted">
                {currency(currentDelta.interestSaving, currencyCode, { decimals: 0 })} less interest
              </p>
            </div>
          ) : null}
        </div>

        <input
          type="range"
          min={0}
          max={max}
          step={25}
          value={draft}
          onChange={(event) => setDraft(Number(event.target.value))}
          onPointerUp={() => onExtraChange(debounced)}
          onKeyUp={() => onExtraChange(debounced)}
          aria-label="Extra monthly payment"
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-muted accent-[rgb(var(--brand))]"
        />

        <div className="flex flex-wrap gap-2">
          {PRESETS.filter((preset) => preset <= max).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setDraft(preset);
                onExtraChange(preset);
              }}
              className={cn(
                'rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors',
                draft === preset
                  ? 'border-brand/40 bg-brand/12 text-brand'
                  : 'border-line text-ink-muted hover:bg-surface-muted hover:text-ink',
              )}
            >
              {preset === 0 ? 'None' : `+$${preset}`}
            </button>
          ))}
        </div>

        {scenarios.length > 1 ? (
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold">Extra / month</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Debt-free</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Interest</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((row) => (
                  <tr
                    key={row.extraMonthlyPayment}
                    className={cn(
                      'border-t border-line',
                      row.extraMonthlyPayment === debounced && 'bg-brand/8',
                    )}
                  >
                    <td className="px-4 py-2.5 font-medium text-ink">
                      {row.extraMonthlyPayment === 0 ? 'Minimums only' : currency(row.extraMonthlyPayment, currencyCode, { decimals: 0 })}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink-muted">
                      {row.months >= 600 ? 'never' : `${row.months} mo`}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink-muted">
                      {currency(row.totalInterest, currencyCode, { decimals: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
