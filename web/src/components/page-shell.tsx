'use client';

import { useDashboardConfig } from '@/lib/dashboard-config';
import { type PageKey, getPresetsForPage } from '@/lib/presets';
import { SectionRenderer } from './section-renderer';
import { PresetSelector } from './preset-selector';
import { UniversalAdd } from './universal-add';
import { OnboardingChecklist } from './onboarding-checklist';

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
    <div className="animate-fade-in">
      {/* Page header with Add button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">{title}</h1>
          {subtitle && <p className="text-sm text-text-muted mt-0.5">{subtitle}</p>}
        </div>
        <UniversalAdd page={page} />
      </div>

      {/* Onboarding checklist — Today page */}
      {page === 'today' && <OnboardingChecklist />}

      {/* Config mode: preset selector */}
      {isConfigMode && (
        <PresetSelector page={page} presets={allPresets} activePreset={preset} />
      )}

      {/* Sections grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
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
