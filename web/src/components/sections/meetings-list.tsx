'use client';

// Meetings — Compact list layout.
//
// Dense table-like rows for fast scanning. Best for people with many
// meetings per week who care about counts more than narrative.

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import {
  type MeetingPreview,
  formatMeetingTime,
  formatDuration,
} from '@/lib/meeting-utils';
import { MeetingPeek } from '@/components/meeting-peek';

export function MeetingsList({ meetings }: { meetings?: MeetingPreview[] } = {}) {
  const queried = useQuery(api.meetings.list, meetings ? 'skip' : { limit: 100 });
  const [openId, setOpenId] = useState<MeetingPreview['_id'] | null>(null);
  const data = meetings ?? queried;

  if (data === undefined) return <SkeletonRows />;
  if (data.length === 0) return <EmptyState />;

  const openMeeting = openId ? data.find((m) => m._id === openId) ?? null : null;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-baseline justify-between px-5 py-3 border-b border-border">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/80">
          Meetings · Compact
        </h3>
        <span className="text-[10px] text-text-muted/70">{data.length} synced</span>
      </div>
      <div className="divide-y divide-border">
        {data.map((m) => {
          const duration = formatDuration(m.startedAt, m.endedAt);
          const attendeeCount = m.attendees?.length ?? 0;
          return (
            <button
              key={m._id}
              type="button"
              onClick={() => setOpenId(m._id)}
              className="group w-full text-left grid grid-cols-[7rem_1fr_auto_auto] gap-3 items-center px-5 py-2.5 hover:bg-surface-hover transition-colors"
            >
              <span className="text-[10px] text-text-muted/80 tabular-nums truncate">
                {formatMeetingTime(m.startedAt)}
              </span>
              <span className="text-sm text-text truncate group-hover:text-accent transition-colors">
                {m.title}
              </span>
              <span className="text-[10px] text-text-muted/60 tabular-nums">
                {attendeeCount > 0 ? `${attendeeCount}p` : '—'}
              </span>
              <span className="text-[10px] text-text-muted/60 tabular-nums w-12 text-right">
                {duration ?? '—'}
              </span>
            </button>
          );
        })}
      </div>
      {openMeeting && (
        <MeetingPeek
          meeting={openMeeting}
          onClose={() => setOpenId(null)}
          allowDelete={meetings === undefined}
        />
      )}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="border border-border rounded-xl overflow-hidden animate-pulse">
      <div className="px-5 py-3 border-b border-border">
        <div className="h-3 w-32 bg-bg-subtle rounded" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-5 py-2.5 h-7 bg-bg-subtle/40" />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border border-border rounded-xl px-5 py-10 text-center space-y-1">
      <p className="text-sm text-text-muted">No meetings synced yet</p>
      <p className="text-xs text-text-muted/70">
        Connect Granola in Settings → Integrations to start syncing.
      </p>
    </div>
  );
}
