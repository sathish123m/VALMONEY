import { useMemo, useState } from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav, Topbar } from './Topbar';
import { useMediaQuery } from '../../hooks';

/**
 * Signed-in chrome: persistent rail on desktop, slide-in drawer on phones, and
 * a shared context so pages can open the "add account" flow from the topbar and
 * publish the alerts the topbar's bell should show.
 */
export function AppShell() {
  const isCompact = useMediaQuery('(min-width: 768px) and (max-width: 1279px)');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const context = useMemo(
    () => ({
      openQuickAdd: () => setQuickAddOpen(true),
      closeQuickAdd: () => setQuickAddOpen(false),
      setNotifications,
    }),
    [],
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-app">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <Sidebar compact={isCompact} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onOpenMenu={() => setMobileOpen(true)}
          onAddAccount={() => setQuickAddOpen(true)}
          notifications={notifications}
        />

        <main id="main" className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-6 pb-24 sm:px-6 md:pb-10">
            <Outlet context={{ ...context, quickAddOpen, setQuickAddOpen }} />
          </div>
        </main>
      </div>

      <MobileNav
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onAddAccount={() => setQuickAddOpen(true)}
      />
    </div>
  );
}

/** Typed-ish accessor for the shell context. */
export function useShell() {
  return useOutletContext() ?? {};
}
