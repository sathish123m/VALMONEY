import { Activity, BellRing, Calculator, FileSpreadsheet, Mail, ShieldCheck } from 'lucide-react';
import { Section } from './Section';

const FEATURES = [
  {
    icon: Calculator,
    title: 'Cents-precise engine',
    body: 'Balances are stored as integer cents and rates as basis points. Interest is rounded once per account per month — the schedule never drifts from reality.',
  },
  {
    icon: Activity,
    title: 'Financial health score',
    body: 'Four weighted factors — debt-to-income, interest burden, minimum coverage and payoff progress — rolled into one 0–100 number with the tips that would move it.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Ledger with CSV export',
    body: 'Log income, spending and payments against an account, then export the whole ledger. RFC 4180 quoting, BOM included so Excel reads it correctly.',
  },
  {
    icon: BellRing,
    title: 'Due-soon reminders',
    body: 'Every account carries its statement day. The dashboard lists what is coming up and how much, before the date rather than after it.',
  },
  {
    icon: Mail,
    title: 'SMTP that actually sends',
    body: 'Welcome mail, six-digit verification codes and password resets go out over Nodemailer. In development they are logged instead of sent.',
  },
  {
    icon: ShieldCheck,
    title: 'Real account security',
    body: 'bcrypt password hashing, JWT bearer sessions, per-route rate limiting on auth and mail endpoints, and a zod-validated contract on every request.',
  },
];

export function Features() {
  return (
    <Section
      id="features"
      eyebrow="Features"
      title="The parts that make the plan trustworthy"
      description="Nothing here is a mock-up: each feature below maps to a route, a service or a database constraint in the API."
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <article key={feature.title} className="reveal card-interactive p-6">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand/15 to-accent/10 text-brand">
              <feature.icon size={20} />
            </span>
            <h3 className="mt-4 text-base font-bold text-ink">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{feature.body}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
