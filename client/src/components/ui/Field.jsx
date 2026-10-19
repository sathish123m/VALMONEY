import { forwardRef, useId } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

const controlClass = cn(
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink',
  'placeholder:text-ink-subtle transition-colors',
  'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25',
  'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted',
);

/** Label + hint + error wrapper. Wire it to a control with a matching `htmlFor`. */
export function Field({ label, hint, error, required, className, children }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {label}
          {required ? <span className="ml-1 text-danger">*</span> : null}
        </label>
      ) : null}

      {children}

      {error ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-danger">
          <AlertCircle size={13} aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ className, error, prefix, suffix, ...props }, ref) {
  return (
    <div className="relative">
      {prefix ? (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-subtle">{prefix}</span>
      ) : null}
      <input
        ref={ref}
        aria-invalid={error ? 'true' : undefined}
        className={cn(
          controlClass,
          prefix && 'pl-8',
          suffix && 'pr-12',
          error && 'border-danger focus:border-danger focus:ring-danger/25',
          className,
        )}
        {...props}
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-ink-subtle">{suffix}</span>
      ) : null}
    </div>
  );
});

export const Select = forwardRef(function Select({ className, error, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={error ? 'true' : undefined}
      className={cn(
        controlClass,
        'appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-10',
        // Inline chevron so the control needs no icon dependency.
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2394a3b8%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')]",
        error && 'border-danger',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export const Textarea = forwardRef(function Textarea({ className, error, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={error ? 'true' : undefined}
      className={cn(controlClass, 'min-h-[90px] resize-y', error && 'border-danger', className)}
      {...props}
    />
  );
});

/** Search input with the icon baked in — used across Ledger and Documents. */
export function SearchInput({ value, onChange, placeholder = 'Search…', className }) {
  const id = useId();
  return (
    <div className={cn('relative', className)}>
      <svg
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(controlClass, 'pl-10')}
      />
    </div>
  );
}
