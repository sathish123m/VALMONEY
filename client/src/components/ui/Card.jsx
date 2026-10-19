import { cn } from '../../lib/cn';

export function Card({ as: Component = 'div', interactive = false, className, children, ...props }) {
  return (
    <Component className={cn(interactive ? 'card-interactive' : 'card', className)} {...props}>
      {children}
    </Component>
  );
}

export function CardHeader({ title, description, action, icon: Icon, className, children }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4 border-b border-line p-5', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
            <Icon size={18} />
          </span>
        ) : null}
        <div className="min-w-0">
          {title ? <h3 className="truncate text-base font-semibold text-ink">{title}</h3> : null}
          {description ? <p className="mt-0.5 text-sm text-ink-muted">{description}</p> : null}
          {children}
        </div>
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, children }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}

export function CardFooter({ className, children }) {
  return <div className={cn('flex flex-wrap items-center gap-3 border-t border-line p-5', className)}>{children}</div>;
}
