'use client';

import { useTheme } from '@/components/theme-provider';

const LIGHT_THEMES = new Set(['zen', 'light']);

function isLightTheme(theme: string): boolean {
  if (LIGHT_THEMES.has(theme)) return true;
  if (theme === 'system' && typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: light)').matches;
  }
  return false;
}

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  const { theme } = useTheme();
  const src = isLightTheme(theme) ? '/logo-only-black.svg' : '/logo-only-white.svg';
  return <img src={src} alt="LifeOS" width={size} height={size} className={className} />;
}

export function LogoHorizontal({ height = 20, className }: { height?: number; className?: string }) {
  const { theme } = useTheme();
  const src = isLightTheme(theme) ? '/logo-horizontal-black.svg' : '/logo-horizontal-white.svg';
  return <img src={src} alt="LifeOS" style={{ height }} className={className} />;
}
