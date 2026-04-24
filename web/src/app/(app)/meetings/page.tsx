'use client';

// Meetings — tabbed shell with two views:
//   • Past — Granola-synced meetings, rendered via the user-chosen preset.
//   • Upcoming — calendar events with a "Prep" button on each row.
//
// Tab state lives in the URL (?tab=past|upcoming) so the agent and the
// share buttons can deep-link to the right view, and a refresh keeps you
// where you were.

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDashboardConfig } from '@/lib/dashboard-config';
import { getPresetsForPage } from '@/lib/presets';
import { SectionRenderer } from '@/components/section-renderer';
import { PresetSelector } from '@/components/preset-selector';
import { UniversalAdd } from '@/components/universal-add';
import { MeetingsUpcoming } from '@/components/sections/meetings-upcoming';
import { AdminGate } from '@/components/admin-gate';
import { cn } from '@/lib/utils';

type Tab = 'past' | 'upcoming';

export default function MeetingsPage() {
  return (
    <AdminGate>
      <Suspense fallback={null}>
        <MeetingsPageInner />
      </Suspense>
    </AdminGate>
  );
}

function MeetingsPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab: Tab = params.get('tab') === 'upcoming' ? 'upcoming' : 'past';

  const { getActivePreset, isConfigMode } = useDashboardConfig();
  const preset = getActivePreset('meetings');
  const allPresets = useMemo(() => getPresetsForPage('meetings'), []);

  const setTab = (next: Tab) => {
    const sp = new URLSearchParams(params);
    if (next === 'past') sp.delete('tab');
    else sp.set('tab', next);
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const isDev = process.env.NODE_ENV !== 'production';

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Meetings</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Synced from Granola — preps for what's coming next
          </p>
        </div>
        <div className="flex items-center gap-2">
          <UniversalAdd page="meetings" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-border mb-6">
        <div className="flex gap-1">
          <TabButton active={tab === 'past'} onClick={() => setTab('past')}>
            Past
          </TabButton>
          <TabButton active={tab === 'upcoming'} onClick={() => setTab('upcoming')}>
            Upcoming
          </TabButton>
        </div>
        {isDev && (
          <Link
            href="/meetings/inspiration"
            className="text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 text-text-muted hover:text-text transition-colors"
          >
            Choose layout
          </Link>
        )}
      </div>

      {tab === 'past' ? (
        <>
          {isConfigMode && (
            <PresetSelector page="meetings" presets={allPresets} activePreset={preset} />
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {preset.sections.map((section, index) => (
              <div
                key={section.id}
                className={cn(
                  'animate-fade-in transition-[border-color,box-shadow,background-color] duration-200 ease-out',
                  section.span === 'full' && 'lg:col-span-2',
                )}
                style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' }}
              >
                <SectionRenderer section={section} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <MeetingsUpcoming />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
        active
          ? 'border-accent text-text'
          : 'border-transparent text-text-muted hover:text-text',
      )}
    >
      {children}
    </button>
  );
}
