import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ErrorState, Spinner } from './components/ui/Feedback';
import Landing from './pages/Landing';

// The marketing page ships in the entry chunk; everything behind a login (and
// the less common auth screens) is split out so a first visit stays light.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Accounts = lazy(() => import('./pages/Accounts'));
const Ledger = lazy(() => import('./pages/Ledger'));
const Documents = lazy(() => import('./pages/Documents'));
const Settings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AppShell = lazy(() =>
  import('./components/layout/AppShell').then((module) => ({ default: module.AppShell })),
);

function RouteLoader({ full = false }) {
  return (
    <div className={full ? 'grid min-h-dvh place-items-center bg-app' : 'grid min-h-[60vh] place-items-center'}>
      <div className="flex items-center gap-3 text-sm text-ink-muted">
        <Spinner size={20} /> Loading…
      </div>
    </div>
  );
}

/** Blocks the signed-in area until the stored token has been resolved. */
function RequireAuth() {
  const { isAuthenticated, status, error } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  if (status === 'idle' || status === 'loading') return <RouteLoader full />;

  if (status === 'error') {
    return (
      <div className="grid min-h-dvh place-items-center bg-app px-4">
        <ErrorState
          error={error}
          onRetry={() => window.location.reload()}
          className="max-w-md"
        />
      </div>
    );
  }

  return <Outlet />;
}

/** Keeps signed-in users away from the sign-in / sign-up screens. */
function PublicOnly({ children }) {
  const { isAuthenticated, status } = useAuth();
  if (isAuthenticated && status === 'ready') return <Navigate to="/dashboard" replace />;
  return children;
}

/** Reset the scroll position on navigation, but leave in-page anchors alone. */
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <ScrollToTop />

            <Suspense fallback={<RouteLoader full />}>
              <Routes>
                <Route path="/" element={<Landing />} />

                <Route
                  path="/login"
                  element={
                    <PublicOnly>
                      <Login />
                    </PublicOnly>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <PublicOnly>
                      <Register />
                    </PublicOnly>
                  }
                />
                <Route
                  path="/forgot-password"
                  element={
                    <PublicOnly>
                      <ForgotPassword />
                    </PublicOnly>
                  }
                />
                <Route
                  path="/reset-password"
                  element={
                    <PublicOnly>
                      <ResetPassword />
                    </PublicOnly>
                  }
                />

                <Route element={<RequireAuth />}>
                  <Route element={<AppShell />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/debts" element={<Accounts />} />
                    <Route path="/ledger" element={<Ledger />} />
                    <Route path="/receipts" element={<Documents />} />
                    <Route path="/profile" element={<Settings />} />
                  </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
