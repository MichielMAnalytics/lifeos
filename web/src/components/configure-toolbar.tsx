'use client';

import { useState, useEffect } from 'react';
import { useDashboardConfig } from '@/lib/dashboard-config';
import { useTheme } from '@/components/theme-provider';
import { themes, themeKeys, systemThemeEntry } from '@/lib/themes';
import { cn } from '@/lib/utils';

const FONT_OPTIONS = [
  { key: 'kefa', name: 'Kefa', family: '"Kefa", ui-sans-serif, system-ui, sans-serif', href: '' },
  { key: 'satoshi', name: 'Satoshi', family: '"Satoshi", ui-sans-serif, system-ui, sans-serif', href: 'https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap' },
  { key: 'inter', name: 'Inter', family: '"Inter", ui-sans-serif, system-ui, sans-serif', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
  { key: 'jetbrains', name: 'JetBrains Mono', family: '"JetBrains Mono", ui-monospace, monospace', href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap' },
  { key: 'space-grotesk', name: 'Space Grotesk', family: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif', href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap' },
  { key: 'dm-sans', name: 'DM Sans', family: '"DM Sans", ui-sans-serif, system-ui, sans-serif', href: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap' },
  { key: 'outfit', name: 'Outfit', family: '"Outfit", ui-sans-serif, system-ui, sans-serif', href: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap' },
  { key: 'geist', name: 'Geist', family: '"Geist", ui-sans-serif, system-ui, sans-serif', href: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap' },
  { key: 'ibm-plex', name: 'IBM Plex Sans', family: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif', href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap' },
  { key: 'source-serif', name: 'Source Serif', family: '"Source Serif 4", Georgia, serif', href: 'https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;500;600;700&display=swap' },
  { key: 'system', name: 'System', family: 'ui-sans-serif, system-ui, -apple-system, sans-serif', href: '' },
] as const;

const FONT_STORAGE_KEY = 'lifeos-font';

function loadFont(href: string) {
  if (!href) return;
  const existing = document.querySelector(`link[href="${href}"]`);
  if (existing) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function applyFont(family: string) {
  document.documentElement.style.setProperty('--font-sans', family);
}

export function ConfigureToolbar() {
  const { isConfigMode, toggleConfigMode, config, setNavMode } = useDashboardConfig();
  const { theme, setTheme } = useTheme();
  const [activeFont, setActiveFont] = useState('kefa');

  useEffect(() => {
    const stored = localStorage.getItem(FONT_STORAGE_KEY);
    if (stored) {
      setActiveFont(stored);
      const font = FONT_OPTIONS.find(f => f.key === stored);
      if (font) {
        loadFont(font.href);
        applyFont(font.family);
      }
    }
  }, []);

  function selectFont(key: string) {
    const font = FONT_OPTIONS.find(f => f.key === key);
    if (!font) return;
    setActiveFont(key);
    localStorage.setItem(FONT_STORAGE_KEY, key);
    loadFont(font.href);
    applyFont(font.family);
  }

  if (!isConfigMode) return null;

  const isHeader = config.navMode === 'header';

  return (
    <div className="mb-6 border border-text/20 bg-surface p-4 space-y-4 animate-fade-in">
      {/* Row 1: Mode + nav toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold uppercase tracking-widest text-text">
            Configure Mode
          </span>
          <div className="h-4 w-px bg-border" />
          <div className="flex gap-1">
            <button
              onClick={() => setNavMode('sidebar')}
              className={cn(
                'px-3 py-1 text-xs uppercase tracking-wider transition-colors border',
                config.navMode === 'sidebar'
                  ? 'border-text text-text'
                  : 'border-border text-text-muted hover:text-text hover:border-text/40',
              )}
            >
              Sidebar
            </button>
            <button
              onClick={() => setNavMode('header')}
              className={cn(
                'px-3 py-1 text-xs uppercase tracking-wider transition-colors border',
                config.navMode === 'header'
                  ? 'border-text text-text'
                  : 'border-border text-text-muted hover:text-text hover:border-text/40',
              )}
            >
              Header
            </button>
          </div>
          {isHeader && (
            <>
              <div className="h-4 w-px bg-border" />
              <span className="text-[10px] text-text-muted">
                Click &quot;Sidebar&quot; to switch back
              </span>
            </>
          )}
        </div>
        <button
          onClick={toggleConfigMode}
          className="text-xs text-text-muted hover:text-text transition-colors uppercase tracking-wider"
        >
          Done
        </button>
      </div>

      {/* Row 2: Theme selector */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted shrink-0">
          Theme
        </span>
        {themeKeys.map((key) => {
          const isSystem = key === 'system';
          const t = isSystem ? systemThemeEntry : themes[key as keyof typeof themes];
          const isActive = theme === key;
          return (
            <button
              key={key}
              onClick={() => setTheme(key)}
              className={cn(
                'shrink-0 flex items-center gap-2 px-3 py-1.5 border transition-all duration-150',
                isActive ? 'border-text' : 'border-border hover:border-text/30',
                isSystem && 'bg-gradient-to-r from-black to-white',
              )}
              style={isSystem ? undefined : { backgroundColor: t.colors.bg }}
            >
              {isSystem ? (
                <>
                  <div className="h-3 w-3 rounded-full border border-white/20" style={{ background: 'linear-gradient(135deg, #000 50%, #fff 50%)' }} />
                  <span className="text-xs font-medium text-text">System</span>
                </>
              ) : (
                <>
                  <div
                    className="h-3 w-3 rounded-full border border-white/10"
                    style={{ backgroundColor: t.colors.accent }}
                  />
                  <span className="text-xs font-medium" style={{ color: t.colors.text }}>
                    {t.name}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Row 3: Font selector */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted shrink-0">
          Font
        </span>
        {FONT_OPTIONS.map((font) => {
          const isActive = activeFont === font.key;
          return (
            <button
              key={font.key}
              onClick={() => selectFont(font.key)}
              className={cn(
                'shrink-0 px-3 py-1.5 border transition-all duration-150',
                isActive ? 'border-text text-text' : 'border-border text-text-muted hover:border-text/30 hover:text-text',
              )}
              style={{ fontFamily: font.family }}
            >
              <span className="text-xs font-medium">{font.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
