import { NavLink, Link } from 'react-router-dom';
import {
  BookOpen,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings,
  Sun,
  Target,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { initials } from '../../lib/format';

const ICONS = { LayoutDashboard, CreditCard, BookOpen, FileText, Settings };

const NAV = [
  { to: '/dashboard', label: 'Overview', icon: 'LayoutDashboard' },
  { to: '/debts', label: 'Accounts', icon: 'CreditCard' },
  { to: '/ledger', label: 'Ledger', icon: 'BookOpen' },
  { to: '/receipts', label: 'Documents', icon: 'FileText' },
  { to: '/profile', label: 'Settings', icon: 'Settings' },
];

export function Logo({ compact = false, className, to = '/dashboard' }) {
  return (
    <Link
      to={to}
      className={cn('group flex items-center gap-2.5 rounded-xl px-1 py-1', className)}
      aria-label="VALMONEY home"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand to-accent text-white shadow-glow">
        <Target size={18} />
      </span>
      {!compact ? (
        <span className="text-[15px] font-extrabold tracking-tight text-ink">
          VAL<span className="text-ink-muted">MONEY</span>
        </span>
      ) : null}
    </Link>
  );
}

function NavItem({ item, compact = false, onNavigate }) {
  const Icon = ICONS[item.icon];
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      title={compact ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150',
          compact && 'justify-center px-0',
          isActive
            ? 'bg-brand/12 text-brand'
            : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand" aria-hidden />
          ) : null}
          <Icon size={18} className="shrink-0" />
          {!compact ? <span className="truncate">{item.label}</span> : null}
        </>
      )}
    </NavLink>
  );
}

/** Desktop rail. `compact` collapses it to icons on tablets. */
export function Sidebar({ compact = false, onNavigate }) {
  const { isDark, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();

  return (
    <aside
      className={cn(
        'hidden h-full shrink-0 flex-col border-r border-line bg-surface md:flex',
        compact ? 'w-[76px] px-3' : 'w-[248px] px-4',
      )}
    >
      <div className={cn('flex h-16 items-center', compact && 'justify-center')}>
        <Logo compact={compact} />
      </div>

      <nav className="mt-2 flex flex-1 flex-col gap-1 overflow-y-auto scrollbar-none" aria-label="Main">
        {NAV.map((item) => (
          <NavItem key={item.to} item={item} compact={compact} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="space-y-1 border-t border-line py-3">
        <button
          type="button"
          onClick={toggleTheme}
          title={compact ? (isDark ? 'Switch to light mode' : 'Switch to dark mode') : undefined}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink',
            compact && 'justify-center px-0',
          )}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
          {!compact ? <span>{isDark ? 'Light mode' : 'Dark mode'}</span> : null}
        </button>

        <button
          type="button"
          onClick={signOut}
          title={compact ? 'Sign out' : undefined}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-danger/10 hover:text-danger',
            compact && 'justify-center px-0',
          )}
        >
          <LogOut size={18} />
          {!compact ? <span>Sign out</span> : null}
        </button>

        {!compact && user ? (
          <div className="mt-2 flex items-center gap-3 rounded-xl bg-surface-muted p-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">
              {initials(user.username)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{user.username}</p>
              <p className="truncate text-xs text-ink-muted">{user.email}</p>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

export { NAV };
