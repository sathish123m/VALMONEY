import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

const VARIANTS = {
  primary:
    'bg-brand text-white shadow-glow hover:bg-brand-strong active:translate-y-px disabled:bg-brand/50 disabled:shadow-none',
  secondary:
    'border border-line bg-surface text-ink hover:bg-surface-muted active:translate-y-px',
  ghost: 'text-ink-muted hover:bg-surface-muted hover:text-ink',
  danger: 'bg-danger text-white hover:brightness-110 active:translate-y-px',
  outlineBrand: 'border border-brand/40 text-brand hover:bg-brand/10',
};

const SIZES = {
  sm: 'h-9 gap-1.5 px-3 text-sm',
  md: 'h-11 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2 px-6 text-base',
  icon: 'h-10 w-10 justify-center',
};

export const Button = forwardRef(function Button(
  { as: Component = 'button', variant = 'primary', size = 'md', loading = false, className, children, disabled, ...props },
  ref,
) {
  const isButton = Component === 'button';

  return (
    <Component
      ref={ref}
      {...(isButton ? { type: props.type ?? 'button', disabled: disabled || loading } : {})}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center rounded-xl font-semibold transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-app',
        'disabled:pointer-events-none disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
      {children}
    </Component>
  );
});

export function IconButton({ label, className, children, variant = 'ghost', ...props }) {
  return (
    <Button variant={variant} size="icon" aria-label={label} title={label} className={className} {...props}>
      {children}
    </Button>
  );
}
