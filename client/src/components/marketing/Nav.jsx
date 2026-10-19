import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Menu, Moon, Sun, Target, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button, IconButton } from '../ui/Button';

const LINKS = [
  { hash: '#how-it-works', label: 'How it works' },
  { hash: '#strategy-demo', label: 'Strategy engine' },
  { hash: '#features', label: 'Features' },
  { hash: '#faq', label: 'FAQ' },
];

/** Sticky marketing header: transparent over the hero, solid once scrolled. */
export function Nav() {
  const { isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled ? 'border-b border-line bg-app/85 backdrop-blur-xl' : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" aria-label="VALMONEY home">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-accent text-white shadow-glow">
            <Target size={18} />
          </span>
          <span className="text-[15px] font-extrabold tracking-tight">
            VAL<span className="text-ink-muted">MONEY</span>
          </span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Marketing">
          {LINKS.map((link) => (
            <a
              key={link.hash}
              href={`/${link.hash}`}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <IconButton label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggleTheme}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </IconButton>

          {isAuthenticated ? (
            <Button as={Link} to="/dashboard" size="sm">
              Open dashboard <ArrowRight size={15} />
            </Button>
          ) : (
            <>
              <Button as={Link} to="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                Sign in
              </Button>
              <Button as={Link} to="/register" size="sm" className="hidden sm:inline-flex">
                Get started
              </Button>
            </>
          )}

          <IconButton label="Open menu" onClick={() => setMenuOpen((open) => !open)} className="lg:hidden">
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </IconButton>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-line bg-app/95 backdrop-blur-xl lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6" aria-label="Marketing">
            {LINKS.map((link) => (
              <a
                key={link.hash}
                href={`/${link.hash}`}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
              >
                {link.label}
              </a>
            ))}

            <div className="mt-2 flex gap-2 border-t border-line pt-3">
              <Button as={Link} to="/login" variant="secondary" className="flex-1" onClick={() => setMenuOpen(false)}>
                Sign in
              </Button>
              <Button as={Link} to="/register" className="flex-1" onClick={() => setMenuOpen(false)}>
                Get started
              </Button>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
