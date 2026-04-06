'use client';

import { useDashboardConfig } from '@/lib/dashboard-config';
import { type PageKey, type PagePreset } from '@/lib/presets';
import { cn } from '@/lib/utils';

interface PresetSelectorProps {
  page: PageKey;
  presets: Record<string, PagePreset>;
  activePreset: PagePreset;
}

export function PresetSelector({ page, presets, activePreset }: PresetSelectorProps) {
  const { setPagePreset } = useDashboardConfig();
  const entries = Object.entries(presets);

  return (
    <div className="mb-6 border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
          Layout Preset
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {entries.map(([key, preset]) => {
          const isActive = preset.name === activePreset.name;
          return (
            <button
              key={key}
              onClick={() => setPagePreset(page, key)}
              className={cn(
                'shrink-0 border px-4 py-3 text-left transition-all duration-150 min-w-[160px]',
                isActive
                  ? 'border-text bg-surface'
                  : 'border-border hover:border-text/30',
              )}
            >
              <p className="text-sm font-medium text-text">{preset.name}</p>
              <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{preset.description}</p>
              <p className="text-[10px] text-text-muted/80 mt-1 font-mono">
                {preset.sections.length} sections
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
