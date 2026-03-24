'use client';

import { useDashboardConfig } from '@/lib/dashboard-config';
import { cn } from '@/lib/utils';

export function ConfigureToolbar() {
  const { isConfigMode, toggleConfigMode, config, setNavMode } = useDashboardConfig();

  if (!isConfigMode) return null;

  return (
    <div className="mb-6 border border-text/20 bg-surface p-4 flex items-center justify-between animate-fade-in">
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
              config.navMode === 'sidebar' ? 'border-text text-text' : 'border-border text-text-muted hover:text-text',
            )}
          >
            Sidebar
          </button>
          <button
            onClick={() => setNavMode('header')}
            className={cn(
              'px-3 py-1 text-xs uppercase tracking-wider transition-colors border',
              config.navMode === 'header' ? 'border-text text-text' : 'border-border text-text-muted hover:text-text',
            )}
          >
            Header
          </button>
        </div>
      </div>
      <button
        onClick={toggleConfigMode}
        className="text-xs text-text-muted hover:text-text transition-colors uppercase tracking-wider"
      >
        Done
      </button>
    </div>
  );
}
