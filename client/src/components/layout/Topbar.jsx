import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  CreditCard,
  FileText,
  LayoutDashboard,
  Menu,
  Moon,
  Plus,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { initials } from '../../lib/format';
import { Button, IconButton } from '../ui/Button';
import { Logo, NAV } from './Sidebar';

const ICONS = { LayoutDashboard, CreditCard, BookOpen, FileText, Settings };

export function Topbar({ onAddAccount, onOpenMenu, notifications = [] }) {
  const { isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [bellOpen, setBellOpen] = useState(false);
  const location = useLocation();

  // Close the popover whenever the route changes.
  useEffect(() => setBellOpen(false), [location.pathname]);

  const current = NAV.find((item) => location.pathname.startsWith(item.to));

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-app/85 px-4 backdrop-blur-lg sm:px-6">
      <IconButton label="Open navigation" onClick={onOpenMenu} className="md:hidden">
        <Menu size={18} />
      </IconButton>

      <div className="md:hidden">
        <Logo compact />
      </div>

      <h1 className="hidden truncate text-base font-semibold text-ink md:block">{current?.label ?? 'Overview'}</h1>

      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" onClick={onAddAccount} className="hidden sm:inline-flex">
          <Plus size={15} /> Add account
        </Button>

        <div className="relative">
          <IconButton
            label="Notifications"
            onClick={() => setBellOpen((open) => !open)}
            aria-expanded={bellOpen}
            className="relative"
          >
            <Bell size={18} />
            {notifications.length > 0 ? (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger ring-2 ring-app" />
            ) : null}
          </IconButton>

          {bellOpen ? (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setBellOpen(false)} aria-hidden />
              <div className="absolute right-0 top-12 z-20 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-surface p-2 shadow-lifted animate-scale-in">
                <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">Notifications</p>
                {notifications.length === 0 ? (
                  <p className="px-3 pb-3 text-sm text-ink-muted">Nothing needs your attention right now.</p>
                ) : (
                  notifications.map((note) => (
                    <div key={note.id} className="flex gap-3 rounded-xl p-3 hover:bg-surface-muted">
                      <span
                        className={cn(
                          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                          note.tone === 'warning' ? 'bg-warning' : note.tone === 'danger' ? 'bg-danger' : 'bg-accent',
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">{note.title}</p>
                        {note.description ? <p className="text-xs text-ink-muted">{note.description}</p> : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : null}
        </div>

        <IconButton label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggleTheme}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </IconButton>

        <Link
          to="/profile"
          className="grid h-10 w-10 place-items-center rounded-full bg-brand text-xs font-bold text-white ring-2 ring-transparent transition hover:ring-brand/40"
          title={user?.username ?? 'Profile'}
        >
          {initials(user?.username ?? '')}
        </Link>
      </div>
    </header>
  );
}

/** Slide-in navigation for phones; the sidebar is hidden below the `md` breakpoint. */
export function MobileNav({ open, onClose, onAddAccount }) {
  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm transition-opacity md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-[80] flex w-[272px] flex-col border-r border-line bg-surface transition-transform duration-300 md:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <Logo />
          <IconButton label="Close navigation" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2" aria-label="Main">
          {NAV.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors',
                    isActive ? 'bg-brand/12 text-brand' : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
                  )
                }
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-line p-4">
          <Button
            className="w-full"
            onClick={() => {
              onClose();
              onAddAccount();
            }}
          >
            <Plus size={16} /> Add account
          </Button>
        </div>
      </div>
    </>
  );
}
