import { cn } from '../../lib/cn';

/**
 * Segmented control. Implemented as a radiogroup so arrow keys and screen
 * readers behave the way users expect from a set of mutually exclusive options.
 */
export function Segmented({ options, value, onChange, size = 'md', className, ariaLabel }) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('inline-flex rounded-xl border border-line bg-surface-muted p-1', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg font-semibold transition-all duration-150',
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
              active
                ? 'bg-surface text-ink shadow-soft'
                : 'text-ink-muted hover:text-ink',
            )}
          >
            {option.icon ? <option.icon size={14} /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
