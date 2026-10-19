import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Adds `is-visible` to elements carrying `.reveal` once they scroll into view.
 * Elements are unobserved after their first reveal, so nothing re-animates.
 *
 * Two safety nets guarantee that content is never left invisible: everything is
 * revealed immediately when motion is reduced or IntersectionObserver is
 * missing, and anything still hidden after `fallbackDelay` is revealed anyway
 * (automation, print, exotic scroll containers).
 */
export function useReveal({ rootMargin = '0px 0px -12% 0px', threshold = 0.12, fallbackDelay = 2000 } = {}) {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll('.reveal'));
    if (!nodes.length) return undefined;

    const revealAll = () => nodes.forEach((node) => node.classList.add('is-visible'));

    // Respect users who have asked for less motion: show everything immediately.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      revealAll();
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin, threshold },
    );

    nodes.forEach((node) => observer.observe(node));
    const fallback = setTimeout(revealAll, fallbackDelay);

    return () => {
      clearTimeout(fallback);
      observer.disconnect();
    };
  }, [rootMargin, threshold, fallbackDelay]);
}

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const list = window.matchMedia(query);
    const handler = (event) => setMatches(event.matches);
    setMatches(list.matches);
    list.addEventListener('change', handler);
    return () => list.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Animates a number from 0 to `target` for stat displays. */
export function useCountUp(target, { duration = 900, enabled = true } = {}) {
  const [value, setValue] = useState(enabled ? 0 : Number(target ?? 0));
  const frame = useRef();

  useEffect(() => {
    const end = Number(target ?? 0);

    if (!enabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(end);
      return undefined;
    }

    const start = performance.now();
    const from = 0;

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - (1 - progress) ** 3;
      setValue(from + (end - from) * eased);
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration, enabled]);

  return value;
}

/** Closes a floating element on Escape and on outside pointer-down. */
export function useDismiss(onDismiss, active = true) {
  const ref = useRef(null);

  useEffect(() => {
    if (!active) return undefined;

    const onKey = (event) => {
      if (event.key === 'Escape') onDismiss();
    };
    const onClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onDismiss();
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [onDismiss, active]);

  return ref;
}

export function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · VALMONEY` : 'VALMONEY — Debt Payoff Planner';
    return () => {
      document.title = previous;
    };
  }, [title]);
}

/** Small helper for one-shot async loads with loading/error state. */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    loader()
      .then((data) => {
        if (!cancelled) setState({ loading: false, data, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ loading: false, data: null, error });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { ...state, reload };
}
