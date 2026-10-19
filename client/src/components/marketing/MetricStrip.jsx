import { useEffect, useRef, useState } from 'react';
import { useCountUp } from '../../hooks';
import { cn } from '../../lib/cn';

/** Counts up the first time the strip scrolls into view, then stops. */
export function MetricStrip({ metrics, className }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {metrics.map((metric) => (
        <Metric key={metric.label} {...metric} />
      ))}
    </div>
  );
}

function Metric({ value, format = (v) => Math.round(v).toLocaleString('en-US'), suffix, label, hint }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(() => typeof window === 'undefined' || !('IntersectionObserver' in window));

  useEffect(() => {
    const node = ref.current;
    if (!node || seen) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setSeen(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    // Never leave a headline metric reading zero if the observer stays silent.
    const fallback = setTimeout(() => setSeen(true), 1600);

    return () => {
      clearTimeout(fallback);
      observer.disconnect();
    };
  }, [seen]);

  const animated = useCountUp(Number(value) || 0, { enabled: seen });

  return (
    <div ref={ref} className="card p-5 text-center sm:text-left">
      <p className="text-3xl font-extrabold tabular-nums text-ink">
        {format(animated)}
        {suffix ? <span className="text-brand">{suffix}</span> : null}
      </p>
      <p className="mt-1.5 text-sm font-semibold text-ink">{label}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}
