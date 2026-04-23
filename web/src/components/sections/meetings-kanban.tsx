'use client';

// Meetings — Kanban layout.
//
// Three columns bucketed by week: Today, This week, Last week. Older
// meetings collapse into a footer count to keep the board scannable.

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import {
  type Meeting,
  bucketByWeek,
  formatMeetingTime,
  initialsFor,
} from '@/lib/meeting-utils';
import { MeetingPeek } from '@/components/meeting-peek';

export function MeetingsKanban({ meetings }: { meetings?: Meeting[] } = {}) {
  const queried = useQuery(api.meetings.list, meetings ? 'skip' : { limit: 100 });
  const [openId, setOpenId] = useState<Meeting['_id'] | null>(null);
  const data = meetings ?? queried;

  if (data === undefined) return <SkeletonGrid />;
  if (data.length === 0) return <EmptyState />;

  const buckets = bucketByWeek(data);
  const openMeeting = openId ? data.find((m) => m._id === openId) ?? null : null;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-baseline justify-between px-5 py-3 border-b border-border">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/80">
          Meetings · Kanban
        </h3>
        <span className="text-[10px] text-text-muted/70">
          {data.length} synced
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
        <Column title="Today" meetings={buckets.today} onOpen={setOpenId} />
        <Column title="This week" meetings={buckets.thisWeek} onOpen={setOpenId} />
        <Column title="Last week" meetings={buckets.lastWeek} onOpen={setOpenId} />
      </div>
      {buckets.older.length > 0 && (
        <div className="px-5 py-2.5 border-t border-border text-[10px] text-text-muted/70 text-center">
          + {buckets.older.length} older meeting{buckets.older.length === 1 ? '' : 's'}
        </div>
      )}
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

function Column({
  title,
  meetings,
  onOpen,
}: {
  title: string;
  meetings: Meeting[];
  onOpen: (id: Meeting['_id']) => void;
}) {
  return (
    <div className="p-3 min-h-[200px]">
      <div className="flex items-baseline justify-between mb-2 px-1">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted/80">
          {title}
        </h4>
        <span className="text-[10px] text-text-muted/60 tabular-nums">
          {meetings.length}
        </span>
      </div>
      <div className="space-y-2">
        {meetings.length === 0 ? (
          <p className="text-[11px] text-text-muted/50 italic px-1 py-2">Nothing here</p>
        ) : (
          meetings.map((m) => (
            <button
              key={m._id}
              type="button"
              onClick={() => onOpen(m._id)}
              className="w-full text-left rounded-lg border border-border bg-bg-subtle/40 hover:bg-surface-hover hover:border-accent/40 transition-colors px-3 py-2.5"
            >
              <p className="text-sm font-medium text-text line-clamp-2">{m.title}</p>
              <p className="text-[10px] text-text-muted/80 tabular-nums mt-1">
                {formatMeetingTime(m.startedAt)}
              </p>
              {m.attendees && m.attendees.length > 0 && (
                <div className="flex items-center gap-1 mt-2">
                  {m.attendees.slice(0, 3).map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-surface border border-border text-[8px] font-semibold text-text-muted"
                      title={a}
                    >
                      {initialsFor(a)}
                    </span>
                  ))}
                  {m.attendees.length > 3 && (
                    <span className="text-[9px] text-text-muted/60">
                      +{m.attendees.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="border border-border rounded-xl overflow-hidden animate-pulse">
      <div className="px-5 py-3 border-b border-border">
        <div className="h-3 w-32 bg-bg-subtle rounded" />
      </div>
      <div className="grid grid-cols-3 divide-x divide-border">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-3 space-y-2">
            <div className="h-2 w-16 bg-bg-subtle rounded" />
            <div className="h-12 bg-bg-subtle rounded" />
            <div className="h-12 bg-bg-subtle rounded" />
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
