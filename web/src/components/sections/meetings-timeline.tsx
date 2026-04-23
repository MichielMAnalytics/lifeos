'use client';

// Meetings — Timeline layout (default).
//
// Granola-style: a top-level filter bar (folder pills + search), then a
// scannable list grouped by calendar day. Each row shows time-of-day,
// title, attendees, and folder badge. Clicking a row opens the peek
// (modal with the full transcript, lazy-loaded by ID).
//
// Accepts an optional `meetings` prop so the inspiration chooser can
// render the layout with mock data without hitting Convex.

import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import {
  type MeetingPreview,
  formatTimeOfDay,
  formatAttendees,
  groupByDay,
  summaryPreview,
} from '@/lib/meeting-utils';
import { MeetingPeek } from '@/components/meeting-peek';
import { cn } from '@/lib/utils';

export function MeetingsTimeline({ meetings }: { meetings?: MeetingPreview[] } = {}) {
  const [folder, setFolder] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<MeetingPreview['_id'] | null>(null);

  // Defer convex queries when mock data is supplied (inspiration chooser).
  const queried = useQuery(
    api.meetings.list,
    meetings
      ? 'skip'
      : { limit: 100, folder: folder ?? undefined, search: search.trim() || undefined },
  );
  const folders = useQuery(api.meetings.listFolders, meetings ? 'skip' : {});

  const data = meetings ?? queried;
  const folderList = folders ?? [];

  const grouped = useMemo(() => (data ? groupByDay(data) : []), [data]);

  if (data === undefined) return <SkeletonList />;
  if (data.length === 0 && !folder && !search.trim()) return <EmptyState />;

  const openMeeting = openId ? data.find((m) => m._id === openId) ?? null : null;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header + filters */}
      <div className="px-5 py-3 border-b border-border space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/80">
            Meetings · Timeline
          </h3>
          <span className="text-[10px] text-text-muted/70">
            {data.length} synced
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or summary…"
            className="flex-1 min-w-[180px] bg-bg-subtle border border-border rounded-md px-2.5 py-1 text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
          />
          {folderList.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setFolder(null)}
                className={cn(
                  'text-[10px] uppercase tracking-wide px-2 py-1 rounded transition-colors',
                  folder === null
                    ? 'bg-accent/15 text-accent'
                    : 'text-text-muted hover:text-text hover:bg-surface-hover',
                )}
              >
                All
              </button>
              {folderList.slice(0, 6).map((f) => (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => setFolder(folder === f.name ? null : f.name)}
                  className={cn(
                    'text-[10px] uppercase tracking-wide px-2 py-1 rounded transition-colors flex items-center gap-1',
                    folder === f.name
                      ? 'bg-accent/15 text-accent'
                      : 'text-text-muted hover:text-text hover:bg-surface-hover',
                  )}
                >
                  <FolderGlyph />
                  {f.name}
                  <span className="text-text-muted/60">{f.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {grouped.length === 0 ? (
        <NoMatches />
      ) : (
        <div className="divide-y divide-border">
          {grouped.map((group) => (
            <div key={group.key}>
              <div className="px-5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted/70 bg-bg-subtle/30 sticky top-0">
                {group.label}
              </div>
              <ul className="divide-y divide-border/60">
                {group.items.map((m) => {
                  const time = formatTimeOfDay(m.startedAt);
                  const attendees = formatAttendees(m.attendees, 3);
                  const preview = summaryPreview(m.summary, 140);
                  const folderBadge = m.folders?.[0];
                  return (
                    <li key={m._id}>
                      <button
                        type="button"
                        onClick={() => setOpenId(m._id)}
                        className="group w-full text-left px-5 py-3 hover:bg-surface-hover transition-colors flex items-start gap-3"
                      >
                        <div className="w-1 self-stretch rounded-full bg-accent/40 group-hover:bg-accent shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-3">
                            <h4 className="text-sm font-semibold text-text truncate">
                              {m.title}
                            </h4>
                            <span className="text-[10px] text-text-muted/80 shrink-0 tabular-nums">
                              {time || '—'}
                            </span>
                          </div>
                          {(attendees || folderBadge) && (
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-text-muted/80">
                              {attendees && <span className="truncate">{attendees}</span>}
                              {folderBadge && (
                                <span className="inline-flex items-center gap-1 shrink-0 text-text-muted/60">
                                  <FolderGlyph />
                                  {folderBadge}
                                </span>
                              )}
                              {m.tags && m.tags.length > 0 && (
                                <span className="inline-flex items-center gap-1 shrink-0">
                                  {m.tags.slice(0, 3).map((t) => (
                                    <span
                                      key={t}
                                      className="text-[9px] uppercase tracking-wider px-1 py-px rounded bg-bg-subtle text-text-muted/80"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </span>
                              )}
                            </div>
                          )}
                          {preview && (
                            <p className="text-xs text-text-muted/70 leading-relaxed mt-1.5 line-clamp-2">
                              {preview}
                            </p>
                          )}
                          {!m.detailFetchedAt && !m.summary && (
                            <p className="text-[10px] text-text-muted/50 italic mt-1">
                              Granola is still processing this note…
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
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

function FolderGlyph() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 4 L7 4 L8.5 5.5 L14 5.5 L14 12 L2 12 Z" />
    </svg>
  );
}

function NoMatches() {
  return (
    <div className="px-5 py-10 text-center space-y-1">
      <p className="text-sm text-text-muted">No meetings match those filters.</p>
      <p className="text-xs text-text-muted/70">Clear the filters to see everything.</p>
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
