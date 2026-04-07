'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  type ThemeKey,
  themes,
  themeKeys,
  defaultTheme,
  SYSTEM_DARK_THEME,
  SYSTEM_LIGHT_THEME,
} from '@/lib/themes';

type ThemeCtx = { theme: ThemeKey; setTheme: (t: ThemeKey) => void };

const ThemeContext = createContext<ThemeCtx>({
  theme: defaultTheme,
  setTheme: () => {},
});

const STORAGE_KEY = 'lifeos-theme';

// Old theme keys (pre Phase 2). If we see one in localStorage we migrate to
// "system" so the user gets a sensible default for their OS.
const LEGACY_KEYS = new Set([
  'midnight',
  'zen',
  'nord',
  'sunset',
  'forest',
  'light',
  'dark',
]);

function applyTheme(t: keyof typeof themes) {
  document.documentElement.setAttribute('data-theme', t);
}

function resolveSystemKey(): keyof typeof themes {
  if (typeof window === 'undefined') return SYSTEM_DARK_THEME;
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? SYSTEM_LIGHT_THEME
    : SYSTEM_DARK_THEME;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeKey>(defaultTheme);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    let active: ThemeKey = 'system';
    if (stored) {
      if (LEGACY_KEYS.has(stored)) {
        // Migrate legacy keys → system
        localStorage.setItem(STORAGE_KEY, 'system');
        active = 'system';
      } else if (themeKeys.includes(stored as ThemeKey)) {
        active = stored as ThemeKey;
      }
    } else {
      // First visit: store "system" so we remember the choice
      localStorage.setItem(STORAGE_KEY, 'system');
    }

    setThemeState(active);
    if (active === 'system') {
      applyTheme(resolveSystemKey());
    } else {
      applyTheme(active as keyof typeof themes);
    }

    // Keep system mode in sync with OS preference changes
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => {
      const current = localStorage.getItem(STORAGE_KEY);
      if (!current || current === 'system') {
        applyTheme(resolveSystemKey());
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setTheme = useCallback((t: ThemeKey) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    if (t === 'system') {
      applyTheme(resolveSystemKey());
    } else {
      applyTheme(t as keyof typeof themes);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
