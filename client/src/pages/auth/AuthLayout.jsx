import { Link } from 'react-router-dom';
import { AlertCircle, CalendarClock, LineChart, Moon, ShieldCheck, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Logo } from '../../components/layout/Sidebar';
import { IconButton } from '../../components/ui/Button';
import { cn } from '../../lib/cn';

const HIGHLIGHTS = [
  { icon: CalendarClock, text: 'A dated debt-free month, not a vague “stay the course”.' },
  { icon: LineChart, text: 'Avalanche and snowball priced side by side to the cent.' },
  { icon: ShieldCheck, text: 'bcrypt passwords, JWT sessions, your data never sold or shared.' },
];

/** Split-screen shell shared by sign in, sign up and password recovery. */
export function AuthLayout({ title, description, children, footer }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="relative grid min-h-dvh bg-app lg:grid-cols-[1.05fr_1fr]">
      {/* Product story — desktop only. */}
      <aside className="marketing-surface relative hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
        <div className="grid-noise pointer-events-none absolute inset-0" aria-hidden />

        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2.5" aria-label="VALMONEY home">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-accent text-sm font-extrabold text-white">
              V
            </span>
            <span className="text-[15px] font-extrabold tracking-tight text-white">
              VAL<span className="text-white/50">MONEY</span>
            </span>
          </Link>

          <h2 className="mt-14 max-w-md text-3xl font-extrabold leading-tight text-white xl:text-4xl">
            Debt is a maths problem. VALMONEY shows you the answer.
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-white/65">
            Enter your balances once and get the payoff order, the interest each strategy costs and the month you are free.
          </p>

          <ul className="mt-10 space-y-4">
            {HIGHLIGHTS.map((item) => (
              <li key={item.text} className="flex items-start gap-3 text-sm text-white/70">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-accent">
                  <item.icon size={16} />
                </span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="glass relative mt-12 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/45">Try it without signing up</p>
          <p className="mt-2 font-mono text-sm text-white">demo@valmoney.app</p>
          <p className="font-mono text-sm text-white">Demo1234</p>
          <p className="mt-2 text-xs text-white/50">
            Seeded with four accounts, seven months of history and a $300 monthly accelerator.
          </p>
        </div>
      </aside>

      {/* Form column */}
      <div className="relative flex flex-col justify-center px-4 py-12 sm:px-8">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <IconButton label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggleTheme}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </IconButton>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo to="/" />
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
          {description ? <p className="mt-2 text-sm leading-relaxed text-ink-muted">{description}</p> : null}

          <div className="mt-8">{children}</div>

          {footer ? <div className="mt-8 text-center text-sm text-ink-muted">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

/** Form-level error banner. */
export function FormAlert({ children, className }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className={cn(
        'flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3.5 text-sm font-medium text-danger',
        className,
      )}
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      {children}
    </p>
  );
}

/** Small print shared by the auth forms. */
export function PasswordHint() {
  return <p className="text-xs text-ink-subtle">At least 8 characters with one letter and one number.</p>;
}
