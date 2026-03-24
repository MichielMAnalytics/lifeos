'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { type ThemeKey, defaultTheme } from '@/lib/themes';

type ThemeCtx = { theme: ThemeKey; setTheme: (t: ThemeKey) => void };

const ThemeContext = createContext<ThemeCtx>({
  theme: defaultTheme,
  setTheme: () => {},
});

function applyTheme(t: ThemeKey) {
  document.documentElement.setAttribute('data-theme', t);
}

function getSystemTheme(): ThemeKey {
  if (typeof window === 'undefined') return defaultTheme;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'midnight';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeKey>(defaultTheme);

  useEffect(() => {
    const stored = localStorage.getItem('lifeos-theme') as ThemeKey | null;

    // If user has explicitly chosen a theme, use it.
    // If "system", follow OS preference.
    // If nothing stored, follow OS preference.
    if (stored === 'system' || !stored) {
      const systemTheme = getSystemTheme();
      setThemeState(stored === 'system' ? ('system' as ThemeKey) : systemTheme);
      applyTheme(systemTheme);

      if (!stored) {
        // First visit: auto-detect and save "system"
        localStorage.setItem('lifeos-theme', 'system');
      }
    } else {
      setThemeState(stored);
      applyTheme(stored);
    }

    // Listen for OS theme changes
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => {
      const current = localStorage.getItem('lifeos-theme');
      if (current === 'system' || !current) {
        applyTheme(mq.matches ? 'light' : 'midnight');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setTheme = useCallback((t: ThemeKey) => {
    setThemeState(t);
    localStorage.setItem('lifeos-theme', t);
    if (t === 'system') {
      applyTheme(getSystemTheme());
    } else {
      applyTheme(t);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
