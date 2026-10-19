import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, configureApi } from '../lib/api';

const TOKEN_KEY = 'valmoney:token';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [error, setError] = useState(null);

  const persistToken = useCallback((nextToken) => {
    if (nextToken) {
      localStorage.setItem(TOKEN_KEY, nextToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    setToken(nextToken);
  }, []);

  const signOut = useCallback(() => {
    persistToken(null);
    setUser(null);
    setStatus('ready');
  }, [persistToken]);

  // Keep the API client in sync without importing React into it.
  useEffect(() => {
    configureApi({
      tokenProvider: () => localStorage.getItem(TOKEN_KEY),
      unauthorizedHandler: () => {
        // A 401 means the JWT expired or was revoked: drop it and let the
        // router show the sign-in screen.
        if (localStorage.getItem(TOKEN_KEY)) signOut();
      },
    });
  }, [signOut]);

  // Bootstrap: resolve the signed-in user from the stored token.
  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setUser(null);
      setStatus('ready');
      return () => {
        cancelled = true;
      };
    }

    setStatus('loading');
    api
      .get('/api/user/me')
      .then(({ user: found }) => {
        if (cancelled) return;
        setUser(found);
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setStatus('error');
        if (err.status === 401) signOut();
      });

    return () => {
      cancelled = true;
    };
  }, [token, signOut]);

  const authenticate = useCallback(
    (path, payload) =>
      api.post(path, payload).then((data) => {
        persistToken(data.token);
        setUser(data.user);
        setStatus('ready');
        setError(null);
        return data;
      }),
    [persistToken],
  );

  const login = useCallback((payload) => authenticate('/api/user/login', payload), [authenticate]);
  const register = useCallback((payload) => authenticate('/api/user/register', payload), [authenticate]);

  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) return null;
    const { user: fresh } = await api.get('/api/user/me');
    setUser(fresh);
    return fresh;
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      status,
      error,
      isAuthenticated: Boolean(token),
      login,
      register,
      signOut,
      refreshUser,
      setUser,
    }),
    [token, user, status, error, login, register, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
