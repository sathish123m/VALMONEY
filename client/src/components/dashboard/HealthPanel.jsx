import { Lightbulb, ShieldCheck } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { ProgressBar, ScoreRing } from '../ui/Feedback';
import { Badge } from '../ui/Badge';

/**
 * Surfaces the server's transparent health score: the headline number plus the
 * exact factors that produced it, so the user can see what to change.
 */
export function HealthPanel({ health }) {
  if (!health) return null;

  const toneFor = (score) => (score >= 85 ? 'success' : score >= 55 ? 'brand' : score >= 40 ? 'warning' : 'danger');

  return (
    <Card>
      <CardHeader
        icon={ShieldCheck}
        title="Financial health"
        description="A weighted read on utilisation, interest burden, payoff pace and cash flow."
        action={<Badge tone={toneFor(health.score)}>{health.label}</Badge>}
      />

      <CardBody className="space-y-5">
        {!health.hasData ? (
          <div className="rounded-xl bg-surface-muted p-4 text-sm text-ink-muted">
            Add an account and log some income to generate a score. VALMONEY deliberately shows nothing rather than
            guessing.
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
              <ScoreRing score={health.score} label={`Grade ${health.grade}`} sublabel={`${health.factors.length} factors`} />

              <div className="w-full flex-1 space-y-3">
                {health.factors.map((factor) => (
                  <div key={factor.key}>
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium text-ink">{factor.label}</span>
                      <span className="text-xs text-ink-subtle">
                        {factor.score}/100 · {factor.weight}% weight
                      </span>
                    </div>
                    <ProgressBar value={factor.score} tone={toneFor(factor.score)} label={`${factor.label} score`} />
                    <p className="mt-1 text-xs text-ink-muted">{factor.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {health.tips?.length ? (
              <div className="space-y-2 rounded-xl border border-line bg-surface-muted/50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Lightbulb size={15} className="text-warning" /> What would move the needle
                </p>
                <ul className="space-y-1.5">
                  {health.tips.map((tip) => (
                    <li key={tip.key} className="text-sm text-ink-muted">
                      {tip.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </CardBody>
    </Card>
  );
}
