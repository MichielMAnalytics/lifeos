'use client';

// Meetings — Timeline layout (default).
//
// Reverse-chronological cards with a left-edge accent. Each card shows
// the title, when it happened, attendee initials, duration, and a
// summary preview. The whole card is clickable — clicks open the meeting
// peek (modal with full transcript).
//
// Accepts an optional `meetings` prop so the inspiration chooser can
// render the layout with mock data without hitting Convex.

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import {
  type MeetingPreview,
  formatMeetingTime,
  formatDuration,
  initialsFor,
  summaryPreview,
} from '@/lib/meeting-utils';
import { MeetingPeek } from '@/components/meeting-peek';

export function MeetingsTimeline({ meetings }: { meetings?: MeetingPreview[] } = {}) {
  const queried = useQuery(api.meetings.list, meetings ? 'skip' : { limit: 50 });
  const [openId, setOpenId] = useState<MeetingPreview['_id'] | null>(null);
  const data = meetings ?? queried;

  if (data === undefined) return <SkeletonList />;
  if (data.length === 0) return <EmptyState />;

  const openMeeting = openId ? data.find((m) => m._id === openId) ?? null : null;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-baseline justify-between px-5 py-3 border-b border-border">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/80">
          Meetings · Timeline
        </h3>
        <span className="text-[10px] text-text-muted/70">
          {data.length} synced
        </span>
      </div>
      <div className="divide-y divide-border">
        {data.map((m) => {
          const duration = formatDuration(m.startedAt, m.endedAt);
          const preview = summaryPreview(m.summary);
          return (
            <button
              key={m._id}
              type="button"
              onClick={() => setOpenId(m._id)}
              className="group w-full text-left px-5 py-4 hover:bg-surface-hover transition-colors flex gap-4"
            >
              <div className="w-1 self-stretch rounded-full bg-accent/60 group-hover:bg-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <h4 className="text-sm font-semibold text-text truncate">{m.title}</h4>
                  <span className="text-[10px] text-text-muted/80 shrink-0 tabular-nums">
                    {formatMeetingTime(m.startedAt)}
                    {duration && <span className="ml-1.5 text-text-muted/60">· {duration}</span>}
                  </span>
                </div>
                {preview && (
                  <p className="text-xs text-text-muted leading-relaxed mt-1.5">{preview}</p>
                )}
                {m.attendees && m.attendees.length > 0 && (
                  <div className="flex items-center gap-1 mt-2.5">
                    {m.attendees.slice(0, 5).map((a) => (
                      <span
                        key={a}
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-bg-subtle border border-border text-[9px] font-semibold text-text-muted"
                        title={a}
                      >
                        {initialsFor(a)}
                      </span>
                    ))}
                    {m.attendees.length > 5 && (
                      <span className="text-[10px] text-text-muted/60 ml-1">
                        +{m.attendees.length - 5}
                      </span>
                    )}
                  </div>
                )}
              </div>
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

function SkeletonList() {
  return (
    <div className="border border-border rounded-xl overflow-hidden animate-pulse">
      <div className="px-5 py-3 border-b border-border">
        <div className="h-3 w-32 bg-bg-subtle rounded" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-5 py-4 space-y-2">
            <div className="h-3 w-3/4 bg-bg-subtle rounded" />
            <div className="h-2 w-1/2 bg-bg-subtle rounded" />
          </div>
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
