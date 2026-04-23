'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAction, useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { SidePeek } from '@/components/side-peek';

// ── Constants ───────────────────────────────────────────

const GRID_START_HOUR = 6;
const GRID_END_HOUR = 23;
const HOUR_HEIGHT = 60;
const TOTAL_HOURS = GRID_END_HOUR - GRID_START_HOUR;
const GRID_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;

// ── Types ───────────────────────────────────────────────

type CalendarEvent = {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  startMs?: number;
  endMs?: number;
  allDay?: boolean;
  attendees?: Array<{ email: string; name?: string; responseStatus?: string }>;
  htmlLink?: string;
  hangoutLink?: string;
  status?: string;
};

type ListResult =
  | { ok: true; events: CalendarEvent[] }
  | { ok: false; reason: string };

type Status = {
  connected: boolean;
  connectedAt?: number;
  scopes?: string[];
  googleEmail?: string;
  accessExpiresAt?: number;
};

interface PositionedEvent {
  event: CalendarEvent;
  top: number;
  height: number;
  startLabel: string;
  endLabel: string;
}

interface PositionedReminder {
  id: string;
  top: number;
  label: string;
  time: string;
}

// ── Date helpers ────────────────────────────────────────

function getMonday(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6);
  const startMonth = MONTH_NAMES[monday.getMonth()];
  const endMonth = MONTH_NAMES[sunday.getMonth()];
  const startDay = monday.getDate();
  const endDay = sunday.getDate();
  const year = sunday.getFullYear();

  if (monday.getMonth() === sunday.getMonth()) {
    return `${startMonth} ${startDay} \u2013 ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} \u2013 ${endMonth} ${endDay}, ${year}`;
}

function formatHour(hour: number): string {
  if (hour === 0 || hour === 24) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function formatClock(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0
    ? `${h12} ${period}`
    : `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function formatHHMM(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatRangeShort(start: Date, end: Date): string {
  return `${formatHHMM(start)} \u2013 ${formatHHMM(end)}`;
}

function minutesToPosition(minutes: number): number {
  const offset = minutes - GRID_START_HOUR * 60;
  return (offset / 60) * HOUR_HEIGHT;
}

function clampToGrid(minutes: number): number {
  return Math.max(GRID_START_HOUR * 60, Math.min(GRID_END_HOUR * 60, minutes));
}

function reasonToMessage(reason: string): string {
  if (reason === 'not-connected') {
    return 'Reconnect Google Workspace in Settings \u2192 Integrations';
  }
  if (reason === 'auth-401' || reason === 'auth-403') {
    return 'Google access expired \u2014 Reconnect in Settings \u2192 Integrations';
  }
  return `Could not load events (${reason})`;
}

function attendeeStatusLabel(s?: string): string {
  switch (s) {
    case 'accepted':
      return 'Accepted';
    case 'declined':
      return 'Declined';
    case 'tentative':
      return 'Maybe';
    case 'needsAction':
      return 'No reply';
    default:
      return s ?? '\u2014';
  }
}

function attendeeStatusClass(s?: string): string {
  switch (s) {
    case 'accepted':
      return 'text-success';
    case 'declined':
      return 'text-danger';
    case 'tentative':
      return 'text-warning';
    default:
      return 'text-text-muted';
  }
}

// ── Main component ──────────────────────────────────────

export function CalendarWeekly() {
  const [now, setNow] = useState(() => new Date());
  const today = useMemo(() => new Date(), []);
  const [weekStart, setWeekStart] = useState(() => getMonday(today));
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const { timeMin, timeMax } = useMemo(() => {
    const start = new Date(weekStart);
    start.setHours(0, 0, 0, 0);
    const end = addDays(weekStart, 7);
    end.setHours(0, 0, 0, 0);
    return { timeMin: start.getTime(), timeMax: end.getTime() };
  }, [weekStart]);

  // ── Connection status (probed once on mount) ──────────
  const getStatus = useAction(api.googleAuth.getStatus);
  const [status, setStatus] = useState<Status | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getStatus();
        if (!cancelled) setStatus(res);
      } catch {
        if (!cancelled) setStatus({ connected: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getStatus]);

  // ── Fetch events for the visible week ─────────────────
  const listEvents = useAction(api.googleCalendar.list);
  const [eventsState, setEventsState] = useState<
    | { state: 'idle' }
    | { state: 'loading' }
    | { state: 'ok'; events: CalendarEvent[] }
    | { state: 'error'; reason: string }
  >({ state: 'idle' });

  useEffect(() => {
    if (!status?.connected) return;
    let cancelled = false;
    setEventsState({ state: 'loading' });
    (async () => {
      try {
        const res = (await listEvents({ timeMin, timeMax, limit: 250 })) as ListResult;
        if (cancelled) return;
        if (res.ok) {
          setEventsState({ state: 'ok', events: res.events });
        } else {
          setEventsState({ state: 'error', reason: res.reason });
        }
      } catch (err) {
        if (cancelled) return;
        setEventsState({
          state: 'error',
          reason: err instanceof Error ? err.message : 'unknown',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listEvents, status?.connected, timeMin, timeMax]);

  // ── LifeOS reminders (kept alongside Google events) ───
  const reminders = useQuery(api.reminders.list, {});

  // Navigation
  const goToPrevWeek = () => setWeekStart((prev) => addDays(prev, -7));
  const goToNextWeek = () => setWeekStart((prev) => addDays(prev, 7));
  const goToThisWeek = () => setWeekStart(getMonday(new Date()));
  const isThisWeek = isSameDay(weekStart, getMonday(today));

  // Auto-scroll to 2 hours before current time on this-week mount
  useEffect(() => {
    if (scrollRef.current && isThisWeek) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const twoHoursBefore = currentMinutes - 120;
      const scrollPosition =
        ((twoHoursBefore - GRID_START_HOUR * 60) / 60) * HOUR_HEIGHT;
      scrollRef.current.scrollTop = Math.max(0, scrollPosition);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isThisWeek]);

  // ── Per-day positioned data ───────────────────────────
  const dayData = useMemo(() => {
    const events = eventsState.state === 'ok' ? eventsState.events : [];

    return weekDays.map((date) => {
      const dateStr = formatDateStr(date);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      const dayStartMs = dayStart.getTime();
      const dayEndMs = dayEnd.getTime();

      const allDay: CalendarEvent[] = [];
      const timed: PositionedEvent[] = [];

      for (const ev of events) {
        if (ev.startMs === undefined || ev.endMs === undefined) continue;
        // Skip events that don't intersect this day at all.
        if (ev.endMs <= dayStartMs || ev.startMs >= dayEndMs) continue;

        if (ev.allDay) {
          allDay.push(ev);
          continue;
        }

        const startDate = new Date(ev.startMs);
        const endDate = new Date(ev.endMs);

        const startMinutes =
          startDate.getTime() < dayStartMs
            ? GRID_START_HOUR * 60
            : clampToGrid(startDate.getHours() * 60 + startDate.getMinutes());
        const endMinutes =
          endDate.getTime() > dayEndMs
            ? GRID_END_HOUR * 60
            : clampToGrid(endDate.getHours() * 60 + endDate.getMinutes());

        const top = minutesToPosition(startMinutes);
        const height = Math.max(18, minutesToPosition(endMinutes) - top);

        timed.push({
          event: ev,
          top,
          height,
          startLabel: formatHHMM(startDate),
          endLabel: formatHHMM(endDate),
        });
      }

      const reminderItems: PositionedReminder[] = [];
      if (reminders) {
        for (const r of reminders) {
          if (
            r.scheduledAt >= dayStartMs &&
            r.scheduledAt <= dayEndMs &&
            r.status !== 'done'
          ) {
            const d = new Date(r.scheduledAt);
            const minutes = clampToGrid(d.getHours() * 60 + d.getMinutes());
            reminderItems.push({
              id: r._id,
              top: minutesToPosition(minutes),
              label: r.title,
              time: formatClock(d),
            });
          }
        }
      }

      return {
        date,
        dateStr,
        allDay,
        timed,
        reminders: reminderItems,
      };
    });
  }, [weekDays, eventsState, reminders]);

  const isLoadingEvents =
    status?.connected === true && eventsState.state === 'loading';
  const eventsError = eventsState.state === 'error' ? eventsState.reason : null;

  // "Now" line position
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTop = minutesToPosition(nowMinutes);
  const showNowLine =
    nowMinutes >= GRID_START_HOUR * 60 && nowMinutes <= GRID_END_HOUR * 60;

  const hasAnyTimed = dayData.some(
    (d) => d.timed.length > 0 || d.reminders.length > 0,
  );
  const hasAnyAllDay = dayData.some((d) => d.allDay.length > 0);

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Header: navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg">
        <button
          onClick={goToPrevWeek}
          className="flex items-center gap-1 text-xs font-mono text-text-muted hover:text-text transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Prev
        </button>

        <div className="flex items-center gap-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
            {formatWeekRange(weekStart)}
          </h2>
          {!isThisWeek && (
            <button
              onClick={goToThisWeek}
              className="text-[11px] font-medium uppercase tracking-[0.08em] text-accent hover:text-text transition-colors border border-accent/30 px-2 py-0.5 rounded"
            >
              Today
            </button>
          )}
        </div>

        <button
          onClick={goToNextWeek}
          className="flex items-center gap-1 text-xs font-mono text-text-muted hover:text-text transition-colors"
        >
          Next
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-6 py-2 border-b border-border/40">
        <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <span className="inline-block w-2 h-2 rounded-sm bg-accent/70" />
          Calendar
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-warning">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          Reminder
        </span>
        {status?.googleEmail && (
          <span className="ml-auto text-[11px] font-mono text-text-muted/70 truncate">
            {status.googleEmail}
          </span>
        )}
      </div>

      {/* Not connected state */}
      {status !== undefined && !status.connected ? (
        <div className="p-6">
          <div className="rounded-lg border border-border bg-bg-subtle p-5 flex items-start gap-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted shrink-0 mt-0.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text font-medium">
                Google Calendar not connected
              </p>
              <p className="text-xs text-text-muted mt-1">
                Connect Google Workspace in Settings {'\u2192'} Integrations to see your calendar here.
              </p>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1 mt-3 text-xs font-medium uppercase tracking-[0.08em] text-accent hover:text-text transition-colors border border-accent/30 px-3 py-1.5 rounded"
              >
                Open Settings
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      ) : status === undefined ? (
        <div className="p-6">
          <div className="flex gap-2">
            <div className="w-10 md:w-14 shrink-0" />
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Error banner from list action */}
          {eventsError && (
            <div className="mx-6 mt-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-xs text-danger flex items-start gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{reasonToMessage(eventsError)}</p>
                {(eventsError === 'not-connected' ||
                  eventsError.startsWith('auth-')) && (
                  <Link
                    href="/settings"
                    className="inline-block mt-1 underline hover:text-text"
                  >
                    Open Settings
                  </Link>
                )}
              </div>
            </div>
          )}

          <div ref={scrollRef} className="overflow-x-auto overflow-y-auto max-h-[720px]">
            {/* Day headers row */}
            <div className="flex border-b border-border bg-bg sticky top-0 z-10">
              <div className="shrink-0 w-10 md:w-14" />
              {weekDays.map((date, i) => {
                const isToday = isSameDay(date, now);
                return (
                  <div
                    key={i}
                    className={cn(
                      'flex-1 min-w-[60px] md:min-w-[100px] text-center py-2.5 border-l border-border',
                      isToday && 'bg-accent/[0.04]',
                    )}
                  >
                    <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted block">
                      {DAY_LABELS[i]}
                    </span>
                    <span
                      className={cn(
                        'text-lg font-mono block leading-tight',
                        isToday ? 'text-accent font-bold' : 'text-text',
                      )}
                    >
                      {date.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* All-day strip */}
            {hasAnyAllDay && (
              <div className="flex border-b border-border bg-bg-subtle/50">
                <div className="shrink-0 w-10 md:w-14 flex items-center justify-end pr-2">
                  <span className="text-[9px] font-mono uppercase text-text-muted/70">
                    All day
                  </span>
                </div>
                {dayData.map((day) => (
                  <div
                    key={`ad-${day.dateStr}`}
                    className="flex-1 min-w-[60px] md:min-w-[100px] border-l border-border py-1.5 px-1 space-y-1"
                  >
                    {day.allDay.map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => setSelected(ev)}
                        className="block w-full text-left rounded px-1.5 py-1 bg-accent/15 border-l-2 border-l-accent hover:bg-accent/25 transition-colors"
                      >
                        <span className="text-[10px] font-medium text-text leading-tight block truncate">
                          {ev.summary}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Loading shimmer over the grid */}
            {isLoadingEvents && (
              <div className="px-6 py-2">
                <div className="flex gap-2 animate-pulse">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={i} className="h-2 flex-1" />
                  ))}
                </div>
              </div>
            )}

            {/* Grid body */}
            <div className="relative flex" style={{ height: GRID_HEIGHT }}>
              {/* Hour labels gutter */}
              <div className="shrink-0 relative w-10 md:w-14">
                {Array.from({ length: TOTAL_HOURS }).map((_, i) => {
                  const hour = GRID_START_HOUR + i;
                  return (
                    <div
                      key={hour}
                      className="absolute right-2 -translate-y-1/2 text-[10px] font-mono text-text-muted"
                      style={{ top: i * HOUR_HEIGHT }}
                    >
                      {formatHour(hour)}
                    </div>
                  );
                })}
              </div>

              {/* Day columns */}
              {dayData.map((day) => {
                const isToday = isSameDay(day.date, now);
                return (
                  <div
                    key={day.dateStr}
                    className={cn(
                      'flex-1 min-w-[60px] md:min-w-[100px] relative border-l border-border',
                      isToday && 'bg-accent/[0.02]',
                    )}
                  >
                    {/* Hour grid lines */}
                    {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                      <div key={`h-${i}`}>
                        <div
                          className="absolute left-0 right-0 border-t border-border/50"
                          style={{ top: i * HOUR_HEIGHT }}
                        />
                        <div
                          className="absolute left-0 right-0 border-t border-border/25 border-dashed"
                          style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                        />
                      </div>
                    ))}
                    <div
                      className="absolute left-0 right-0 border-t border-border/50"
                      style={{ top: TOTAL_HOURS * HOUR_HEIGHT }}
                    />

                    {/* Google Calendar events */}
                    {day.timed.map((p) => {
                      const attendees = p.event.attendees ?? [];
                      return (
                        <button
                          key={p.event.id}
                          onClick={() => setSelected(p.event)}
                          className={cn(
                            'absolute left-1 right-1 rounded px-1.5 py-0.5 border-l-2 overflow-hidden z-[2] text-left',
                            'border-l-accent bg-accent/10 hover:bg-accent/20 transition-colors',
                            p.event.status === 'cancelled' && 'opacity-50 line-through',
                          )}
                          style={{ top: p.top, height: p.height }}
                          title={`${p.event.summary} (${p.startLabel} \u2013 ${p.endLabel})`}
                        >
                          <span className="text-[10px] font-medium text-text leading-tight block truncate">
                            {p.event.summary}
                          </span>
                          {p.height >= 32 && (
                            <span className="text-[9px] font-mono text-text-muted block truncate">
                              {p.startLabel} {'\u2013'} {p.endLabel}
                              {attendees.length > 0 && (
                                <span className="ml-1">+ {attendees.length}</span>
                              )}
                            </span>
                          )}
                        </button>
                      );
                    })}

                    {/* LifeOS reminders */}
                    {day.reminders.map((reminder) => (
                      <div
                        key={`r-${reminder.id}`}
                        className="absolute left-1 right-1 rounded px-1.5 py-0.5 border-l-2 border-l-warning bg-warning/10 overflow-hidden z-[3]"
                        style={{ top: reminder.top, height: 24 }}
                        title={`Reminder: ${reminder.label} at ${reminder.time}`}
                      >
                        <span className="text-[10px] font-medium text-text leading-tight block truncate">
                          {reminder.label}
                        </span>
                      </div>
                    ))}

                    {/* "Now" line */}
                    {isToday && showNowLine && (
                      <div
                        className="absolute left-0 right-0 z-[5] pointer-events-none"
                        style={{ top: nowTop }}
                      >
                        <div className="relative">
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-danger" />
                          <div className="absolute left-0 right-0 border-t-2 border-danger" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Empty state (only when truly nothing) */}
            {!isLoadingEvents &&
              !eventsError &&
              !hasAnyTimed &&
              !hasAnyAllDay && (
                <div className="px-6 py-8 text-center">
                  <p className="text-xs text-text-muted/70 font-mono">
                    No events this week.
                  </p>
                </div>
              )}
          </div>
        </>
      )}

      {/* Event details */}
      {selected && (
        <SidePeek
          open
          onClose={() => setSelected(null)}
          title={selected.summary}
        >
          <EventDetails event={selected} />
        </SidePeek>
      )}
    </div>
  );
}

// ── Event details panel ─────────────────────────────────

function EventDetails({ event }: { event: CalendarEvent }) {
  const start = event.startMs ? new Date(event.startMs) : null;
  const end = event.endMs ? new Date(event.endMs) : null;

  const whenLabel = (() => {
    if (!start) return 'Unknown time';
    if (event.allDay) return `${start.toDateString()} \u00b7 All day`;
    if (!end) return start.toLocaleString();
    const sameDay = isSameDay(start, end);
    const dateLine = start.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return sameDay
      ? `${dateLine} \u00b7 ${formatRangeShort(start, end)}`
      : `${start.toLocaleString()} \u2013 ${end.toLocaleString()}`;
  })();

  const attendees = event.attendees ?? [];

  return (
    <div className="px-5 py-5 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-text leading-snug">
          {event.summary}
        </h2>
        <p className="text-xs text-text-muted mt-1.5 font-mono">{whenLabel}</p>
        {event.status === 'cancelled' && (
          <span className="inline-block mt-2 text-[10px] uppercase tracking-[0.08em] text-danger border border-danger/40 px-2 py-0.5 rounded">
            Cancelled
          </span>
        )}
      </div>

      {event.location && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.08em] text-text-muted mb-1.5">
            Location
          </p>
          <p className="text-sm text-text">{event.location}</p>
        </div>
      )}

      {event.description && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.08em] text-text-muted mb-1.5">
            Description
          </p>
          <p className="text-sm text-text whitespace-pre-wrap leading-relaxed">
            {event.description}
          </p>
        </div>
      )}

      {event.hangoutLink && (
        <div>
          <a
            href={event.hangoutLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.08em] text-accent hover:text-text transition-colors border border-accent/30 px-3 py-1.5 rounded"
          >
            Join Meet
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      )}

      {attendees.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.08em] text-text-muted mb-2">
            Attendees ({attendees.length})
          </p>
          <ul className="space-y-1.5">
            {attendees.map((a) => (
              <li
                key={a.email}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-text truncate">{a.name ?? a.email}</span>
                <span
                  className={cn(
                    'text-[10px] font-mono uppercase tracking-[0.06em] shrink-0',
                    attendeeStatusClass(a.responseStatus),
                  )}
                >
                  {attendeeStatusLabel(a.responseStatus)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {event.htmlLink && (
        <div className="pt-2 border-t border-border/50">
          <a
            href={event.htmlLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-text-muted hover:text-text transition-colors"
          >
            Open in Google Calendar
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}
