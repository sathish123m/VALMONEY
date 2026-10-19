import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from './Button';

export function Spinner({ size = 18, className }) {
  return <Loader2 size={size} className={cn('animate-spin text-ink-subtle', className)} aria-label="Loading" />;
}

export function Skeleton({ className }) {
  return <div className={cn('skeleton h-4 w-full', className)} aria-hidden />;
}

/** Skeleton shaped like a stat card, for dashboard loading states. */
export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card p-5" aria-hidden>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-7 w-32" />
      {Array.from({ length: lines - 2 }).map((_, index) => (
        <Skeleton key={index} className="mt-3 h-3 w-full" />
      ))}
    </div>
  );
}

export function ProgressBar({ value = 0, tone = 'brand', className, label }) {
  const tones = {
    brand: 'bg-brand',
    accent: 'bg-accent',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
  };
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-muted', className)}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-700 ease-out', tones[tone] ?? tones.brand)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/** Circular gauge used by the financial health score. */
export function ScoreRing({ score = 0, size = 132, label, sublabel }) {
  const radius = (size - 14) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Number(score) || 0));
  const offset = circumference * (1 - clamped / 100);

  const color =
    clamped >= 85 ? 'rgb(var(--success))' : clamped >= 55 ? 'rgb(var(--brand))' : clamped >= 40 ? 'rgb(var(--warning))' : 'rgb(var(--danger))';

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth="10" stroke="rgb(var(--surface-muted))" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-bold tabular-nums text-ink">{Math.round(clamped)}</div>
        {label ? <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</div> : null}
        {sublabel ? <div className="mt-0.5 text-[11px] text-ink-subtle">{sublabel}</div> : null}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      {Icon ? (
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-muted text-ink-muted">
          <Icon size={24} />
        </span>
      ) : null}
      <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
      {description ? <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }) {
  return (
    <div className={cn('card p-6 text-center', className)} role="alert">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-danger/10 text-danger">
        <AlertTriangle size={22} />
      </span>
      <h3 className="mt-3 text-base font-semibold text-ink">Something went wrong</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-muted">{error?.message ?? 'Unexpected error.'}</p>
      {onRetry ? (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          <RefreshCw size={15} /> Try again
        </Button>
      ) : null}
    </div>
  );
}
