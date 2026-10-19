import { Link } from 'react-router-dom';
import { Code2, Target } from 'lucide-react';

const REPO_URL = 'https://github.com/sathish123m/VALMONEY';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Strategy engine', href: '/#strategy-demo' },
      { label: 'Features', href: '/#features' },
      { label: 'FAQ', href: '/#faq' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign in', to: '/login' },
      { label: 'Create account', to: '/register' },
      { label: 'Forgot password', to: '/forgot-password' },
    ],
  },
  {
    title: 'Developers',
    links: [
      { label: 'Source on GitHub', href: REPO_URL },
      { label: 'REST API reference', href: `${REPO_URL}#api-reference` },
      { label: 'Database schema', href: `${REPO_URL}/blob/main/server/prisma/schema.prisma` },
    ],
  },
];

const STACK = ['React', 'Vite', 'Tailwind CSS', 'Node.js', 'Express', 'PostgreSQL', 'Prisma', 'Nodemailer'];

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link to="/" className="flex items-center gap-2.5" aria-label="VALMONEY home">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-accent text-white shadow-glow">
                <Target size={18} />
              </span>
              <span className="text-[15px] font-extrabold tracking-tight text-ink">
                VAL<span className="text-ink-muted">MONEY</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">
              A debt payoff planner that answers one question properly: given these balances and this monthly budget, when am I
              free — and what does each strategy cost me?
            </p>
            <a
              href={REPO_URL}
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-ink-muted transition-colors hover:text-ink"
            >
              <Code2 size={16} /> sathish123m/VALMONEY
            </a>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink">{column.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.to ? (
                      <Link to={link.to} className="text-sm text-ink-muted transition-colors hover:text-ink">
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        {...(link.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
                        className="text-sm text-ink-muted transition-colors hover:text-ink"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-2 border-t border-line pt-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Built with</span>
          {STACK.map((item) => (
            <span
              key={item}
              className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-muted"
            >
              {item}
            </span>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 text-xs text-ink-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} VALMONEY. An educational planning tool, not financial advice.</p>
          <p>Projections assume a flat monthly rate and that your budget stays committed until the last account closes.</p>
        </div>
      </div>
    </footer>
  );
}
