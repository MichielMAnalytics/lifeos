'use client';

import { useDashboardConfig } from '@/lib/dashboard-config';
import { type PageKey, getPresetsForPage } from '@/lib/presets';
import { SectionRenderer } from './section-renderer';
import { PresetSelector } from './preset-selector';

interface PageShellProps {
  page: PageKey;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function PageShell({ page, title, subtitle, children }: PageShellProps) {
  const { getActivePreset, isConfigMode } = useDashboardConfig();
  const preset = getActivePreset(page);
  const allPresets = getPresetsForPage(page);

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Configure mode toolbar */}

      {/* Config mode: preset selector */}
      {isConfigMode && (
        <PresetSelector page={page} presets={allPresets} activePreset={preset} />
      )}

      {/* Sections grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {preset.sections.map((section, index) => (
          <div
            key={section.id}
            className={`animate-fade-in transition-[border-color,box-shadow,background-color] duration-200 ease-out ${section.span === 'full' ? 'lg:col-span-2' : ''}`}
            style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' }}
          >
            <SectionRenderer section={section} />
          </div>
        ))}
      </div>

      {children}
    </div>
  );
}
