import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const THEME_KEY = 'valmoney:theme';
const ThemeContext = createContext(null);

const systemPrefersDark = () =>
  typeof window === 'undefined' ? true : !window.matchMedia('(prefers-color-scheme: light)').matches;

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem(THEME_KEY);
    // Dark is the product default; an explicit choice always wins.
    return stored ? stored === 'dark' : systemPrefersDark();
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', isDark ? '#05070f' : '#f6f7fb');
  }, [isDark]);

  useEffect(() => {
    // Follow the OS while the user has not made an explicit choice.
    if (localStorage.getItem(THEME_KEY)) return undefined;

    const media = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (event) => setIsDark(!event.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((current) => {
      localStorage.setItem(THEME_KEY, current ? 'light' : 'dark');
      return !current;
    });
  }, []);

  const value = useMemo(() => ({ isDark, toggleTheme, setDark: setIsDark }), [isDark, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>');
  return context;
}
