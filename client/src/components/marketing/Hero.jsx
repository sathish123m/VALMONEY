import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, CheckCircle2, Percent, ShieldCheck, TrendingDown } from 'lucide-react';
import heroPoster from '../../assets/videos/hero-poster.jpg';
import heroWebm from '../../assets/videos/hero-web.webm';
import heroMp4 from '../../assets/videos/hero-web.mp4';
import { compactCurrency, currency, duration } from '../../lib/format';
import { compareStrategies } from '../../lib/payoff';
import { SAMPLE_DEBTS, SAMPLE_EXTRA_MONTHLY } from '../../lib/samplePortfolio';
import { Button } from '../ui/Button';
import { Sparkline } from './Sparkline';

const TRUST = [
  { icon: ShieldCheck, label: 'JWT sessions, hashed passwords' },
  { icon: Percent, label: 'Integer-cent maths, no rounding drift' },
  { icon: CheckCircle2, label: 'Free — no cards, no credit checks' },
];

/**
 * Hero with a live projection: the numbers in the preview card come from the
 * same payoff engine the API runs, evaluated in the browser on the demo
 * portfolio. Nothing here is a screenshot.
 */
export function Hero() {
  const plan = useMemo(
    () => compareStrategies({ debts: SAMPLE_DEBTS, extraMonthlyPaymentCents: SAMPLE_EXTRA_MONTHLY * 100 }),
    [],
  );

  const { avalanche, comparison } = plan;
  const balances = avalanche.timeline.map((point) => point.totalBalanceCents / 100);

  return (
    <section className="marketing-surface relative isolate overflow-hidden">
      <video
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.22]"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={heroPoster}
        aria-hidden
      >
        <source src={heroWebm} type="video/webm" />
        <source src={heroMp4} type="video/mp4" />
      </video>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#05070f]/70 via-[#05070f]/80 to-[#05070f]" aria-hidden />
      <div className="grid-noise pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative mx-auto grid w-full max-w-6xl gap-14 px-4 pb-20 pt-28 sm:px-6 sm:pt-36 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-28">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white/80 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-success" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Payoff engine online — avalanche vs snowball, to the cent
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Every debt, one dated
            <span className="gradient-text"> plan to zero</span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
            VALMONEY turns a stack of balances into a month-by-month schedule. It shows the debt-free date, the interest each
            strategy costs, and exactly which account to attack next — updated as your numbers change.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button as={Link} to="/register" size="lg">
              Build my plan — free <ArrowRight size={17} />
            </Button>
            <Button
              as="a"
              href="#strategy-demo"
              size="lg"
              variant="secondary"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10"
            >
              Try the strategy engine
            </Button>
          </div>

          <ul className="mt-9 grid gap-3 sm:grid-cols-1">
            {TRUST.map((item) => (
              <li key={item.label} className="flex items-center gap-2.5 text-sm text-white/60">
                <item.icon size={16} className="shrink-0 text-success" />
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        {/* Live preview card */}
        <div className="animate-fade-up [animation-delay:120ms]">
          <div className="glass p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Demo portfolio · avalanche</p>
                <p className="mt-1.5 text-3xl font-extrabold tabular-nums text-white">
                  {currency(avalanche.totalStartingBalanceCents / 100, 'USD', { decimals: 0 })}
                </p>
                <p className="text-sm text-white/50">across {SAMPLE_DEBTS.length} accounts, minimums + {currency(SAMPLE_EXTRA_MONTHLY, 'USD', { decimals: 0 })}/mo</p>
              </div>
              <span className="rounded-full bg-success/15 px-3 py-1.5 text-xs font-bold text-success ring-1 ring-inset ring-success/30">
                Debt-free {avalanche.debtFreeLabel}
              </span>
            </div>

            <div className="mt-5 h-32 sm:h-40">
              <Sparkline values={balances} stroke="rgb(129 132 255)" fill="rgb(99 102 241 / 0.35)" ariaLabel="Demo portfolio balance over time" />
            </div>

            <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-center">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Months</dt>
                <dd className="mt-1 text-lg font-bold tabular-nums text-white">{avalanche.months}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Interest</dt>
                <dd className="mt-1 text-lg font-bold tabular-nums text-white">
                  {compactCurrency(avalanche.totalInterestCents / 100)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Saved vs minimums</dt>
                <dd className="mt-1 text-lg font-bold tabular-nums text-success">
                  {compactCurrency(comparison.avalancheVsMinimumOnly.interestSavedCents / 100)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { icon: CalendarClock, label: 'Debt-free', value: avalanche.debtFreeLabel ?? '—' },
              { icon: TrendingDown, label: 'Plan length', value: duration(avalanche.months) },
              { icon: Percent, label: 'Vs snowball', value: `+${currency(comparison.interestSavedByAvalancheCents / 100, 'USD', { decimals: 0 })} saved` },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur">
                <item.icon size={15} className="text-accent" />
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">{item.label}</p>
                <p className="mt-0.5 text-sm font-bold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
