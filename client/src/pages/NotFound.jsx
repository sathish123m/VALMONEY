import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks';
import { Button } from '../components/ui/Button';

export default function NotFound() {
  useDocumentTitle('Page not found');
  const { isAuthenticated } = useAuth();

  return (
    <div className="marketing-surface flex min-h-dvh flex-col items-center justify-center px-6 py-20 text-center">
      <div className="grid-noise pointer-events-none absolute inset-0" aria-hidden />

      <span className="relative grid h-16 w-16 place-items-center rounded-3xl border border-white/10 bg-white/5 text-accent backdrop-blur">
        <Compass size={28} />
      </span>

      <p className="relative mt-8 text-sm font-bold uppercase tracking-[0.3em] text-white/50">Error 404</p>
      <h1 className="relative mt-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">This page owes nothing</h1>
      <p className="relative mt-4 max-w-md text-base leading-relaxed text-white/65">
        The link is broken or the page moved. The planner is still where you left it.
      </p>

      <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button as={Link} to={isAuthenticated ? '/dashboard' : '/'} size="lg">
          {isAuthenticated ? 'Back to my dashboard' : 'Back to the home page'}
        </Button>
        {!isAuthenticated ? (
          <Button
            as={Link}
            to="/login"
            size="lg"
            variant="secondary"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10"
          >
            <ArrowLeft size={16} /> Sign in
          </Button>
        ) : null}
      </div>
    </div>
  );
}
