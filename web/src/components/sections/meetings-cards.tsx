'use client';

// Meetings — Visual cards layout.
//
// Magazine-style: the most recent meeting takes a hero card with a long
// summary excerpt, the next 5 fall into a 2-column grid below. Best for
// people whose meetings carry weight — the visual hierarchy mirrors
// "this is the meeting I need to think about".

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

export function MeetingsCards({ meetings }: { meetings?: MeetingPreview[] } = {}) {
  const queried = useQuery(api.meetings.list, meetings ? 'skip' : { limit: 50 });
  const [openId, setOpenId] = useState<MeetingPreview['_id'] | null>(null);
  const data = meetings ?? queried;

  if (data === undefined) return <SkeletonCards />;
  if (data.length === 0) return <EmptyState />;

  const [hero, ...rest] = data;
  const openMeeting = openId ? data.find((m) => m._id === openId) ?? null : null;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setOpenId(hero._id)}
        className="group block w-full text-left rounded-xl border border-border bg-surface px-6 py-5 hover:border-accent/40 hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-baseline justify-between gap-4 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
            Latest meeting
          </span>
          <span className="text-[10px] text-text-muted/80 tabular-nums">
            {formatMeetingTime(hero.startedAt)}
            {(() => {
              const d = formatDuration(hero.startedAt, hero.endedAt);
              return d ? <span className="ml-1.5 text-text-muted/60">· {d}</span> : null;
            })()}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-text group-hover:text-accent transition-colors">
          {hero.title}
        </h3>
        {hero.summary && (
          <p className="text-sm text-text-muted leading-relaxed mt-2">
            {summaryPreview(hero.summary, 380)}
          </p>
        )}
        {hero.attendees && hero.attendees.length > 0 && (
          <div className="flex items-center gap-2 mt-4">
            <div className="flex items-center gap-1">
              {hero.attendees.slice(0, 6).map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-bg-subtle border border-border text-[10px] font-semibold text-text-muted"
                  title={a}
                >
                  {initialsFor(a)}
                </span>
              ))}
            </div>
            <span className="text-[11px] text-text-muted/70">
              {hero.attendees.length} attendee{hero.attendees.length === 1 ? '' : 's'}
            </span>
          </div>
        )}
      </button>

      {rest.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rest.slice(0, 6).map((m) => (
            <button
              key={m._id}
              type="button"
              onClick={() => setOpenId(m._id)}
              className="group text-left rounded-lg border border-border bg-surface hover:bg-surface-hover hover:border-accent/40 transition-colors px-4 py-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="text-sm font-semibold text-text truncate group-hover:text-accent transition-colors">
                  {m.title}
                </h4>
                <span className="text-[10px] text-text-muted/80 tabular-nums shrink-0">
                  {formatMeetingTime(m.startedAt)}
                </span>
              </div>
              {m.summary && (
                <p className="text-xs text-text-muted leading-relaxed mt-1.5 line-clamp-2">
                  {summaryPreview(m.summary, 140)}
                </p>
              )}
            </button>
          ))}
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

function SkeletonCards() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="rounded-xl border border-border bg-surface px-6 py-5 space-y-3">
        <div className="h-3 w-24 bg-bg-subtle rounded" />
        <div className="h-5 w-2/3 bg-bg-subtle rounded" />
        <div className="h-3 w-full bg-bg-subtle rounded" />
        <div className="h-3 w-5/6 bg-bg-subtle rounded" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg border border-border bg-surface" />
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
