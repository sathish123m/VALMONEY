import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';

/** Closing band — always dark, matching the hero. */
export function FinalCta() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="marketing-surface relative isolate overflow-hidden">
      <div className="grid-noise pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto w-full max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-24">
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          The fastest way out of debt is a plan you can see
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/70">
          Add your accounts in a couple of minutes. You will get the debt-free date, the interest on the table and the exact
          order to pay everything off — free, and yours to keep.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {isAuthenticated ? (
            <Button as={Link} to="/dashboard" size="lg">
              Open my dashboard <ArrowRight size={17} />
            </Button>
          ) : (
            <>
              <Button as={Link} to="/register" size="lg">
                Create my free plan <ArrowRight size={17} />
              </Button>
              <Button
                as={Link}
                to="/login"
                size="lg"
                variant="secondary"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                Explore the demo instead
              </Button>
            </>
          )}
        </div>

        <p className="mt-6 text-xs text-white/45">
          Demo login: demo@valmoney.app / Demo1234 — a seeded portfolio with seven months of history.
        </p>
      </div>
    </section>
  );
}
