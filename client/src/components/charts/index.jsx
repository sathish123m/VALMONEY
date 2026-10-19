import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { compactCurrency, currency } from '../../lib/format';

const AXIS = { fill: 'rgb(var(--ink-subtle))', fontSize: 11 };
const GRID = 'rgb(var(--line))';

const tooltipStyle = {
  backgroundColor: 'rgb(var(--surface))',
  border: `1px solid ${GRID}`,
  borderRadius: '0.75rem',
  boxShadow: '0 18px 40px -18px rgb(var(--shadow) / 0.35)',
  color: 'rgb(var(--ink))',
  fontSize: '12px',
  padding: '0.6rem 0.75rem',
};

/**
 * Balance-over-time projection. Two series when both strategies are shown so
 * the crossover is visible at a glance.
 */
export function PayoffChart({ data, currencyCode = 'USD', showSnowball = false, height = 300 }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--brand))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="rgb(var(--brand))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="snowballFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity={0.18} />
              <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke={GRID} vertical={false} strokeDasharray="3 6" />
          <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
          <YAxis
            tick={AXIS}
            axisLine={false}
            tickLine={false}
            width={62}
            tickFormatter={(value) => compactCurrency(value, currencyCode)}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, name) => [currency(value, currencyCode, { decimals: 0 }), name]}
            labelStyle={{ color: 'rgb(var(--ink-muted))', marginBottom: 4 }}
          />

          {showSnowball ? (
            <Area
              type="monotone"
              dataKey="snowball"
              name="Snowball"
              stroke="rgb(var(--accent))"
              strokeWidth={2}
              strokeDasharray="5 4"
              fill="url(#snowballFill)"
            />
          ) : null}

          <Area
            type="monotone"
            dataKey="balance"
            name="Avalanche"
            stroke="rgb(var(--brand))"
            strokeWidth={2.5}
            fill="url(#balanceFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Income vs expenses per month. */
export function TrendChart({ data, currencyCode = 'USD', height = 260 }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid stroke={GRID} vertical={false} strokeDasharray="3 6" />
          <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis
            tick={AXIS}
            axisLine={false}
            tickLine={false}
            width={62}
            tickFormatter={(value) => compactCurrency(value, currencyCode)}
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [currency(value, currencyCode, { decimals: 0 }), name]} />
          <Legend wrapperStyle={{ fontSize: 12, color: 'rgb(var(--ink-muted))' }} iconType="circle" iconSize={8} />
          <Bar dataKey="income" name="Income" fill="rgb(var(--success))" radius={[6, 6, 0, 0]} maxBarSize={26} />
          <Bar dataKey="expenses" name="Expenses" fill="rgb(var(--danger))" radius={[6, 6, 0, 0]} maxBarSize={26} />
          <Bar dataKey="payments" name="Debt payments" fill="rgb(var(--brand))" radius={[6, 6, 0, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const PIE_COLORS = [
  'rgb(var(--brand))',
  'rgb(var(--accent))',
  'rgb(var(--success))',
  'rgb(var(--warning))',
  'rgb(var(--danger))',
  'rgb(var(--ink-subtle))',
];

/** Spend by category for the current month. */
export function CategoryDonut({ data, currencyCode = 'USD', height = 240 }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="category"
            innerRadius="58%"
            outerRadius="86%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={entry.category} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [currency(value, currencyCode), name]} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
