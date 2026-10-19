import { Upload, SlidersHorizontal, GitCompareArrows, LineChart } from 'lucide-react';
import { Section } from './Section';

const STEPS = [
  {
    icon: Upload,
    title: 'Add every account once',
    body: 'Balance, interest rate and minimum payment. That is all the engine needs — no bank connection, no credit check.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Set what you can spare',
    body: 'Turn a monthly budget into an accelerator. Every projection re-runs in milliseconds, server-side, so the numbers are always consistent.',
  },
  {
    icon: GitCompareArrows,
    title: 'Compare both strategies',
    body: 'Avalanche is the cheapest, snowball wins the first account sooner. VALMONEY prices both to the cent and tells you the difference.',
  },
  {
    icon: LineChart,
    title: 'Follow it to zero',
    body: 'A month-by-month schedule, the accounts to attack in order, due-soon reminders and a health score that moves as you progress.',
  },
];

export function HowItWorks() {
  return (
    <Section
      id="how-it-works"
      eyebrow="How it works"
      title="From a stack of balances to a dated payoff order"
      description="Four steps, no spreadsheets. The planner is deterministic — the same inputs always produce the same schedule, and you can audit every dollar."
      className="border-y border-line bg-surface/40"
    >
      <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <li key={step.title} className="reveal card-interactive relative p-6">
            <span className="absolute right-5 top-5 text-4xl font-extrabold tabular-nums text-ink/5">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand/10 text-brand">
              <step.icon size={20} />
            </span>
            <h3 className="mt-4 text-base font-bold text-ink">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
