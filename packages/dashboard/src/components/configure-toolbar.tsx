'use client';

import { useDashboardConfig } from '@/lib/dashboard-config';
import { useTheme } from '@/components/theme-provider';
import { themes, themeKeys } from '@/lib/themes';
import { cn } from '@/lib/utils';

export function ConfigureToolbar() {
  const { isConfigMode, toggleConfigMode, config, setNavMode } = useDashboardConfig();
  const { theme, setTheme } = useTheme();

  if (!isConfigMode) return null;

  const isHeader = config.navMode === 'header';

  return (
    <div className="mb-6 border border-text/20 bg-surface p-4 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold uppercase tracking-widest text-text">
            Configure Mode
          </span>
          <div className="h-4 w-px bg-border" />
          {/* Nav mode toggle */}
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
          {/* Hint when in header mode */}
          {isHeader && (
            <>
              <div className="h-4 w-px bg-border" />
              <span className="text-[10px] text-text-muted">
                Click &quot;Sidebar&quot; above to switch back to sidebar navigation
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

      {/* Theme selector */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted shrink-0">
          Theme
        </span>
        {themeKeys.map((key) => {
          const t = themes[key];
          const isActive = theme === key;
          return (
            <button
              key={key}
              onClick={() => setTheme(key)}
              className={cn(
                'shrink-0 flex items-center gap-2 px-3 py-1.5 border transition-all duration-150',
                isActive ? 'border-text' : 'border-border hover:border-text/30',
              )}
              style={{ backgroundColor: t.colors.bg }}
            >
              <div
                className="h-3 w-3 rounded-full border border-white/10"
                style={{ backgroundColor: t.colors.accent }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: t.colors.text }}
              >
                {t.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
