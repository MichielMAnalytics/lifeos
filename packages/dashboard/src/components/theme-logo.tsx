'use client';

import { useTheme } from '@/components/theme-provider';

const LIGHT_THEMES = new Set(['zen', 'light']);

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  const { theme } = useTheme();
  const src = LIGHT_THEMES.has(theme) ? '/logo-only-black.svg' : '/logo-only-white.svg';
  return <img src={src} alt="LifeOS" width={size} height={size} className={className} />;
}

export function LogoHorizontal({ height = 20, className }: { height?: number; className?: string }) {
  const { theme } = useTheme();
  const src = LIGHT_THEMES.has(theme) ? '/logo-horizontal-black.svg' : '/logo-horizontal-white.svg';
  return <img src={src} alt="LifeOS" style={{ height }} className={className} />;
}
