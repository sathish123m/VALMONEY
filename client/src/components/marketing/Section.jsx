import { cn } from '../../lib/cn';

/** Shared section shell so every marketing band has the same rhythm. */
export function Section({ id, eyebrow, title, description, action, className, contentClassName, children }) {
  return (
    <section id={id} className={cn('scroll-mt-20 py-16 sm:py-20', className)}>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        {title ? (
          <div className="reveal mx-auto max-w-2xl text-center">
            {eyebrow ? (
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">{eyebrow}</p>
            ) : null}
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h2>
            {description ? <p className="mt-4 text-base leading-relaxed text-ink-muted">{description}</p> : null}
            {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
          </div>
        ) : null}

        <div className={cn(title ? 'mt-12' : '', contentClassName)}>{children}</div>
      </div>
    </section>
  );
}
