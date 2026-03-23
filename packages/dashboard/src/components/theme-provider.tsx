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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeKey>(defaultTheme);

  // On mount: read localStorage and apply immediately
  useEffect(() => {
    const stored = localStorage.getItem('lifeos-theme') as ThemeKey | null;
    const initial = stored || defaultTheme;
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  const setTheme = useCallback((t: ThemeKey) => {
    setThemeState(t);
    localStorage.setItem('lifeos-theme', t);
    applyTheme(t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
