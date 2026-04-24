'use client';

// Upcoming meetings — companion to the past-meetings sections.
//
// Mirror of a Google Calendar event (eventually) or a manually-added entry.
// Each row exposes a "Prep" affordance — clicking opens (or creates) the
// linked `meetingPreps` row and routes to the prep editor.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Doc, Id } from '@/lib/convex-api';
import { formatAttendees } from '@/lib/meeting-utils';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

type Upcoming = Doc<'upcomingMeetings'>;

export function MeetingsUpcoming() {
  const upcoming = useQuery(api.upcomingMeetings.list, { limit: 50 });
  const preps = useQuery(api.meetingPreps.list);
  const seedMock = useMutation(api.upcomingMeetings.seedMock);
  const createPrep = useMutation(api.meetingPreps.create);
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const prepByUpcoming = useMemo(() => {
    const map = new Map<string, Doc<'meetingPreps'>>();
    for (const p of preps ?? []) map.set(p.upcomingMeetingId, p);
    return map;
  }, [preps]);

  const grouped = useMemo(() => (upcoming ? groupByDay(upcoming) : []), [upcoming]);

  if (upcoming === undefined) return <SkeletonList />;
  if (upcoming.length === 0) {
    return (
      <div className="border border-border rounded-xl px-5 py-10 text-center space-y-3">
        <p className="text-sm text-text-muted">No upcoming meetings yet</p>
        <p className="text-xs text-text-muted/70">
          Google Calendar isn't wired up — seed 5 mock events to try the prep flow.
        </p>
        <button
          type="button"
          onClick={async () => {
            setSeeding(true);
            try {
              await seedMock({});
            } finally {
              setSeeding(false);
            }
          }}
          disabled={seeding}
          className="text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {seeding ? 'Seeding…' : 'Seed mock meetings'}
        </button>
      </div>
    );
  }

  const handlePrep = async (m: Upcoming) => {
    setBusyId(m._id);
    try {
      const prep = prepByUpcoming.get(m._id);
      if (prep) {
        router.push(`/meetings/prep/${prep._id}`);
        return;
      }
      const created = await createPrep({ upcomingMeetingId: m._id });
      router.push(`/meetings/prep/${created._id}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-baseline justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/80">
          Upcoming · Next 30 days
        </h3>
        <span className="text-[10px] text-text-muted/70">{upcoming.length}</span>
      </div>
      <div className="divide-y divide-border">
        {grouped.map((group) => (
          <div key={group.key}>
            <div className="px-5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted/70 bg-bg-subtle/30">
              {group.label}
            </div>
            <ul className="divide-y divide-border/60">
              {group.items.map((m) => {
                const prep = prepByUpcoming.get(m._id);
                const hasOthers = m.attendees.length > 1;
                const attendees = hasOthers ? formatAttendees(m.attendees, 3) : '';
                const time = formatTimeRange(m.startedAt, m.endedAt);
                return (
                  <li
                    key={m._id}
                    className="px-5 py-3 flex items-start gap-3 hover:bg-surface-hover transition-colors"
                  >
                    <div className="w-1 self-stretch rounded-full bg-accent/30 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <h4 className="text-sm font-semibold text-text truncate">{m.title}</h4>
                        <span className="text-[10px] text-text-muted/80 tabular-nums shrink-0">
                          {time}
                        </span>
                      </div>
                      {attendees && (
                        <p className="text-[11px] text-text-muted/80 truncate mt-1">
                          {attendees}
                        </p>
                      )}
                      {m.location && (
                        <p className="text-[10px] text-text-muted/60 truncate mt-0.5">
                          {m.location}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePrep(m)}
                      disabled={busyId === m._id}
                      className={cn(
                        'shrink-0 self-center text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-md transition-colors',
                        prep
                          ? 'border border-accent/40 text-accent hover:bg-accent/10'
                          : 'bg-accent text-white hover:bg-accent-hover',
                        busyId === m._id && 'opacity-50',
                      )}
                    >
                      {busyId === m._id ? '…' : prep ? 'Open prep' : 'Prep'}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <PrepIndex preps={preps ?? []} />
    </div>
  );
}

function PrepIndex({ preps }: { preps: Doc<'meetingPreps'>[] }) {
  if (preps.length === 0) return null;
  return (
    <div className="px-5 py-3 border-t border-border bg-bg-subtle/20">
      <h4 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/80 mb-2">
        Existing preps
      </h4>
      <ul className="space-y-1">
        {preps.slice(0, 6).map((p) => (
          <li key={p._id}>
            <Link
              href={`/meetings/prep/${p._id}`}
              className="text-xs text-text-muted hover:text-text transition-colors flex items-center gap-2"
            >
              <span className="truncate">{p.title}</span>
              {p.talkingPoints && (
                <span className="text-[9px] uppercase tracking-wider text-accent/80">
                  brief ready
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatTimeRange(startMs: number, endMs: number): string {
  const t1 = new Date(startMs).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const t2 = new Date(endMs).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${t1} – ${t2}`;
}

function groupByDay(rows: Upcoming[]): Array<{ key: string; label: string; items: Upcoming[] }> {
  const groups = new Map<string, { label: string; items: Upcoming[]; sortKey: number }>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  for (const m of rows) {
    const d = new Date(m.startedAt);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!groups.has(key)) {
      let label: string;
      if (dayStart.getTime() === today.getTime()) label = 'Today';
      else if (dayStart.getTime() === tomorrow.getTime()) label = 'Tomorrow';
      else
        label = d.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        });
      groups.set(key, { label, items: [], sortKey: dayStart.getTime() });
    }
    groups.get(key)!.items.push(m);
  }
  return Array.from(groups.entries())
    .sort((a, b) => a[1].sortKey - b[1].sortKey)
    .map(([key, { label, items }]) => ({ key, label, items }));
}

function SkeletonList() {
  return (
    <div className="border border-border rounded-xl overflow-hidden animate-pulse">
      <div className="px-5 py-3 border-b border-border">
        <div className="h-3 w-32 bg-bg-subtle rounded" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="px-5 py-4 space-y-2">
            <div className="h-3 w-3/4 bg-bg-subtle rounded" />
            <div className="h-2 w-1/2 bg-bg-subtle rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
