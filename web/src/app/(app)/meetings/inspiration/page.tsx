'use client';

// Meetings — layout chooser. Renders all 4 layout candidates side-by-side
// with mock data so you can pick the one that fits how you actually use
// your meetings. Clicking "Use this layout" writes the choice to
// `dashboardConfig.pagePresets.meetings` and routes back to /meetings.
//
// We pass mock meetings explicitly into each layout so the previews don't
// depend on the user's Granola connection state — you can audition
// layouts before you've synced anything.

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDashboardConfig } from '@/lib/dashboard-config';
import { mockMeetings } from '@/lib/meeting-utils';
import { MeetingsTimeline } from '@/components/sections/meetings-timeline';
import { MeetingsKanban } from '@/components/sections/meetings-kanban';
import { MeetingsList } from '@/components/sections/meetings-list';
import { MeetingsCards } from '@/components/sections/meetings-cards';
import { cn } from '@/lib/utils';

const CANDIDATES = [
  {
    presetKey: 'default',
    name: 'Timeline',
    tagline: 'Reverse-chronological cards with summary previews.',
    when: 'Best when you want to read what happened, not just count meetings.',
    Component: MeetingsTimeline,
  },
  {
    presetKey: 'executive',
    name: 'Kanban',
    tagline: 'Buckets by week — Today / This week / Last week.',
    when: 'Best when meetings cluster around weekly cycles.',
    Component: MeetingsKanban,
  },
  {
    presetKey: 'developer',
    name: 'Compact',
    tagline: 'Dense rows, fast scan.',
    when: 'Best when you have many meetings and care more about counts than narrative.',
    Component: MeetingsList,
  },
  {
    presetKey: 'solopreneur',
    name: 'Cards',
    tagline: 'Magazine-style with the latest meeting in a hero card.',
    when: 'Best when one or two meetings carry weight per day.',
    Component: MeetingsCards,
  },
] as const;

export default function MeetingsInspirationPage() {
  const router = useRouter();
  const { config, setPagePreset } = useDashboardConfig();
  const [pending, setPending] = useState<string | null>(null);

  const meetings = useMemo(() => mockMeetings(), []);
  const activePreset = config.pagePresets.meetings ?? 'default';

  const handleUse = async (presetKey: string) => {
    setPending(presetKey);
    try {
      // Await the mutation so the destination /meetings page renders the
      // chosen layout on first paint — no flash of the previous preset.
      await setPagePreset('meetings', presetKey);
      router.push('/meetings');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Choose a meetings layout</h1>
          <p className="text-sm text-text-muted mt-1">
            Each preview uses mock data so you can audition layouts before syncing
            from Granola. Pick one — you can always change later from this page.
          </p>
        </div>
        <Link
          href="/meetings"
          className="text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md border border-border text-text-muted hover:text-text hover:border-accent/40 transition-colors shrink-0"
        >
          Back to /meetings
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {CANDIDATES.map((c) => {
          const isActive = activePreset === c.presetKey;
          const isPending = pending === c.presetKey;
          return (
            <section
              key={c.presetKey}
              className={cn(
                'rounded-xl border bg-bg-subtle/30 transition-colors',
                isActive ? 'border-accent/50' : 'border-border',
              )}
            >
              <header className="px-5 py-4 flex items-start justify-between gap-3 border-b border-border">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-text">{c.name}</h2>
                    {isActive && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted mt-1">{c.tagline}</p>
                  <p className="text-[11px] text-text-muted/70 italic mt-1">{c.when}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleUse(c.presetKey)}
                  disabled={isPending || isActive}
                  className={cn(
                    'text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md transition-colors shrink-0',
                    isActive
                      ? 'border border-border text-text-muted cursor-default'
                      : 'bg-accent text-white hover:bg-accent-hover disabled:opacity-50',
                  )}
                >
                  {isActive ? 'In use' : isPending ? 'Saving…' : 'Use this layout'}
                </button>
              </header>
              <div className="p-4 bg-bg">
                <c.Component meetings={meetings} />
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
