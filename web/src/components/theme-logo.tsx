'use client';

import { useTheme } from '@/components/theme-provider';
import { themes } from '@/lib/themes';

function isLightTheme(theme: string): boolean {
  if (theme === 'system' && typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: light)').matches;
  }
  // Look up the theme entry; default to "dark" (false) if unknown
  const entry = (themes as Record<string, { isDark: boolean } | undefined>)[theme];
  return entry ? !entry.isDark : false;
}

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  const { theme } = useTheme();
  const src = isLightTheme(theme) ? '/logo-only-black.svg' : '/logo-only-white.svg';
  return <img src={src} alt="LifeAI" width={size} height={size} className={className} />;
}

export function LogoHorizontal({ height = 20, className }: { height?: number; className?: string }) {
  const { theme } = useTheme();
  const src = isLightTheme(theme) ? '/logo-horizontal-black.svg' : '/logo-horizontal-white.svg';
  return <img src={src} alt="LifeAI" style={{ height }} className={className} />;
}
