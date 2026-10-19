import { useId, useMemo } from 'react';
import { cn } from '../../lib/cn';

/**
 * Dependency-free balance-over-time curve.
 *
 * The marketing pages must paint instantly, so they never pull in the charting
 * bundle: this draws the same series with a plain SVG path instead.
 */
export function Sparkline({
  values,
  width = 520,
  height = 160,
  stroke = 'rgb(var(--brand))',
  fill = 'rgb(var(--brand) / 0.18)',
  className,
  ariaLabel = 'Balance over time',
}) {
  const gradientId = useId();

  const { line, area, max } = useMemo(() => {
    const series = (values ?? []).map((v) => Number(v) || 0);
    if (series.length === 0) return { line: '', area: '', max: 0 };

    const peak = Math.max(...series, 1);
    const step = series.length > 1 ? width / (series.length - 1) : width;
    const toY = (value) => height - (value / peak) * (height - 12) - 6;

    const points = series.map((value, index) => [index * step, toY(Math.max(0, value))]);
    const path = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
    const closed = `${path} L${width},${height} L0,${height} Z`;

    return { line: path, area: closed, max: peak };
  }, [values, width, height]);

  if (!line) return null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn('h-full w-full', className)}
      role="img"
      aria-label={`${ariaLabel}. Starts at ${Math.round(max).toLocaleString()} and falls to zero.`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
