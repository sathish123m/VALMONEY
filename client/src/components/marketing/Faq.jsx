import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Section } from './Section';

const QUESTIONS = [
  {
    q: 'How is the debt-free date worked out?',
    a: 'Every month the engine adds one month of interest to each remaining balance, applies the minimum payments, then throws the entire surplus at the target account — the highest rate for avalanche, the smallest balance for snowball. When an account hits zero its minimum joins the surplus, which is why the schedule accelerates near the end.',
  },
  {
    q: 'Avalanche or snowball — which should I pick?',
    a: 'Avalanche always costs the least interest; snowball clears your first account sooner, which many people find easier to stick with. VALMONEY prices both on your real numbers and tells you the difference in dollars and months, so it is a decision you make with evidence rather than a rule of thumb.',
  },
  {
    q: 'Does it connect to my bank?',
    a: 'No. You enter each account once — balance, rate and minimum payment. That keeps the app free, keeps you in control of your credentials, and means the projection is based on the numbers you can verify against a statement.',
  },
  {
    q: 'Where does my data live?',
    a: 'In a PostgreSQL database behind a REST API: Express, Prisma and zod on the server, React on the client. Passwords are bcrypt-hashed, sessions are signed JWTs, and every account-scoped query is filtered by the authenticated user id.',
  },
  {
    q: 'Why does the interest total differ slightly from my lender?',
    a: 'The engine uses one interest calculation per account per month, at the flat monthly rate implied by the APR — the same simplification most payoff calculators use. Lenders compound daily. The plan is a decision tool, not a statement reconciliation.',
  },
  {
    q: 'Can I export my data?',
    a: 'Yes. The ledger exports to CSV from the API with correct quote escaping and a byte-order mark, so Excel and Numbers both open it cleanly. Deleting your account removes your debts, transactions and documents for good.',
  },
];

export function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <Section
      id="faq"
      eyebrow="FAQ"
      title="Questions worth asking before you trust a calculator"
      description="Short answers, no hedging. If something here is wrong, the code is the source of truth."
    >
      <div className="mx-auto max-w-3xl divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {QUESTIONS.map((item, index) => {
          const expanded = open === index;
          return (
            <div key={item.q} className="reveal">
              <h3>
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? -1 : index)}
                  aria-expanded={expanded}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-muted"
                >
                  <span className="text-sm font-semibold text-ink sm:text-base">{item.q}</span>
                  <ChevronDown
                    size={18}
                    className={cn('shrink-0 text-ink-subtle transition-transform duration-200', expanded && 'rotate-180')}
                  />
                </button>
              </h3>
              {expanded ? (
                <p className="px-5 pb-5 text-sm leading-relaxed text-ink-muted animate-fade-in">{item.a}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </Section>
  );
}
