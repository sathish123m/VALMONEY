import { cn } from '../../lib/cn';
import { useCountUp } from '../../hooks';

/**
 * Headline metric. The value animates once on mount; `format` receives the
 * animated number so currency and compact notations both work.
 */
export function StatCard({
  label,
  value,
  format = (v) => v,
  delta,
  hint,
  icon: Icon,
  tone = 'brand',
  animate = true,
  className,
}) {
  const numeric = Number(value);
  const animated = useCountUp(Number.isFinite(numeric) ? numeric : 0, { enabled: animate && Number.isFinite(numeric) });
  const shown = Number.isFinite(numeric) ? animated : value;

  const tones = {
    brand: 'bg-brand/10 text-brand',
    accent: 'bg-accent/10 text-accent',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
  };

  return (
    <div className={cn('card p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
        {Icon ? (
          <span className={cn('grid h-9 w-9 place-items-center rounded-xl', tones[tone] ?? tones.brand)}>
            <Icon size={17} />
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-2xl font-bold tabular-nums text-ink sm:text-[28px]">{format(shown)}</p>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        {delta ? <span className="text-xs font-semibold">{delta}</span> : null}
        {hint ? <span className="text-xs text-ink-muted">{hint}</span> : null}
      </div>
    </div>
  );
}
