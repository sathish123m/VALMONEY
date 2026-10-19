import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDocumentTitle, useReveal } from '../hooks';
import { currency } from '../lib/format';
import { Nav } from '../components/marketing/Nav';
import { Hero } from '../components/marketing/Hero';
import { MetricStrip } from '../components/marketing/MetricStrip';
import { HowItWorks } from '../components/marketing/HowItWorks';
import { StrategyDemo } from '../components/marketing/StrategyDemo';
import { StrategyCompare } from '../components/marketing/StrategyCompare';
import { Features } from '../components/marketing/Features';
import { Faq } from '../components/marketing/Faq';
import { FinalCta } from '../components/marketing/FinalCta';
import { Footer } from '../components/marketing/Footer';

const METRICS = [
  { value: 41348, format: (v) => currency(v, 'USD', { decimals: 0 }), label: 'Demo portfolio', hint: '4 accounts, minimums + $300/mo' },
  { value: 45, suffix: ' mo', label: 'Debt-free in', hint: 'avalanche strategy, from today' },
  { value: 5556, format: (v) => currency(v, 'USD', { decimals: 0 }), label: 'Interest on the table', hint: 'rounded once per account, per month' },
  { value: 5056, format: (v) => currency(v, 'USD', { decimals: 0 }), label: 'Saved vs minimums only', hint: 'and 25 months sooner' },
];

export default function Landing() {
  useDocumentTitle(null);
  useReveal();
  const { hash } = useLocation();

  // Deep links like /#strategy-demo arrive from the nav, the footer and other
  // pages; scroll them into view once the section exists.
  useEffect(() => {
    if (!hash) return;
    const target = document.querySelector(hash);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);

  return (
    <div className="min-h-dvh bg-app">
      <Nav />

      <main>
        <Hero />

        <div className="border-b border-line bg-app py-12 sm:py-14">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="reveal mb-8 flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-xl font-bold text-ink">Numbers from the seeded demo account</h2>
              <p className="text-sm text-ink-muted">
                Not marketing figures — the output of the engine that ships with this app.
              </p>
            </div>
            <MetricStrip metrics={METRICS} />
          </div>
        </div>

        <HowItWorks />
        <StrategyDemo />
        <StrategyCompare />
        <Features />
        <Faq />
        <FinalCta />
      </main>

      <Footer />
    </div>
  );
}
