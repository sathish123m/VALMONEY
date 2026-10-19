import { cn } from '../../lib/cn';

const TONES = {
  neutral: 'bg-surface-muted text-ink-muted ring-line',
  brand: 'bg-brand/12 text-brand ring-brand/25',
  accent: 'bg-accent/12 text-accent ring-accent/25',
  success: 'bg-success/12 text-success ring-success/25',
  warning: 'bg-warning/12 text-warning ring-warning/25',
  danger: 'bg-danger/12 text-danger ring-danger/25',
  muted: 'bg-surface-muted text-ink-subtle ring-line',
};

export function Badge({ tone = 'neutral', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        TONES[tone] ?? TONES.neutral,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusDot({ tone = 'success', className }) {
  const colors = {
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    brand: 'bg-brand',
  };
  return <span className={cn('h-2 w-2 rounded-full', colors[tone] ?? colors.success, className)} aria-hidden />;
}

/** Compact +/- amount, coloured by direction. */
export function Amount({ value, currency = 'USD', className }) {
  const positive = Number(value) > 0;
  return (
    <span
      className={cn(
        'tnum font-semibold',
        positive ? 'text-success' : 'text-ink',
        className,
      )}
    >
      {positive ? '+' : ''}
      {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(value) || 0)}
    </span>
  );
}
