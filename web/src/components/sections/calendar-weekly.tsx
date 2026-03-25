'use client';

import { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { cn } from '@/lib/utils';

// ── Date helpers ─────────────────────────────────────

function getMonday(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay(); // 0 = Sunday
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

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

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

function formatTime(epochMs: number): string {
  const d = new Date(epochMs);
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

// ── Block type colors ───────────────────────────────

const blockDot: Record<string, string> = {
  mit: 'bg-accent',
  p1: 'bg-purple-500',
  p2: 'bg-indigo-500',
  event: 'bg-warning',
  break: 'bg-text-muted/40',
  lunch: 'bg-text-muted/40',
  task: 'bg-success',
  wake: 'bg-warning',
  other: 'bg-text-muted/40',
};

// ── Types ───────────────────────────────────────────

interface CalendarEvent {
  time: string;
  label: string;
  type: 'schedule' | 'reminder' | 'task';
  dotColor: string;
  sortKey: number; // minutes from midnight or epoch for ordering
}

interface DayData {
  date: Date;
  dateStr: string;
  events: CalendarEvent[];
}

// ── Main component ──────────────────────────────────

export function CalendarWeekly() {
  const today = useMemo(() => new Date(), []);
  const [weekStart, setWeekStart] = useState(() => getMonday(today));

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const startDate = formatDateStr(weekDays[0]);
  const endDate = formatDateStr(weekDays[6]);

  // Fetch data
  const reminders = useQuery(api.reminders.list, {});
  const dayPlans = useQuery(api.dayPlans.listByDateRange, { startDate, endDate });
  const tasks = useQuery(api.tasks.list, { status: 'todo', due: 'all' });

  // Navigation handlers
  const goToPrevWeek = () => setWeekStart((prev) => addDays(prev, -7));
  const goToNextWeek = () => setWeekStart((prev) => addDays(prev, 7));
  const goToThisWeek = () => setWeekStart(getMonday(new Date()));

  const isThisWeek = isSameDay(weekStart, getMonday(today));

  // Build day data
  const days: DayData[] = useMemo(() => {
    return weekDays.map((date) => {
      const dateStr = formatDateStr(date);
      const events: CalendarEvent[] = [];

      // Day plan schedule blocks
      const plan = dayPlans?.find((p) => p.planDate === dateStr);
      if (plan) {
        for (const block of plan.schedule) {
          const [h, m] = block.start.split(':').map(Number);
          events.push({
            time: block.start,
            label: block.label,
            type: 'schedule',
            dotColor: blockDot[block.type] ?? 'bg-text-muted/40',
            sortKey: h * 60 + m,
          });
        }
      }

      // Reminders for this day
      if (reminders) {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        const dayStartMs = dayStart.getTime();
        const dayEndMs = dayEnd.getTime();

        for (const r of reminders) {
          if (
            r.scheduledAt >= dayStartMs &&
            r.scheduledAt <= dayEndMs &&
            r.status !== 'done'
          ) {
            const d = new Date(r.scheduledAt);
            events.push({
              time: formatTime(r.scheduledAt),
              label: r.title,
              type: 'reminder',
              dotColor: 'bg-danger',
              sortKey: d.getHours() * 60 + d.getMinutes(),
            });
          }
        }
      }

      // Tasks with dueDate on this day
      if (tasks) {
        for (const t of tasks) {
          if (t.dueDate === dateStr) {
            events.push({
              time: 'All day',
              label: t.title,
              type: 'task',
              dotColor: 'bg-success',
              sortKey: 9999, // sort after timed events
            });
          }
        }
      }

      // Sort events by time
      events.sort((a, b) => a.sortKey - b.sortKey);

      return { date, dateStr, events };
    });
  }, [weekDays, dayPlans, reminders, tasks]);

  const isLoading = reminders === undefined || dayPlans === undefined || tasks === undefined;

  return (
    <div className="border border-border">
      {/* Header: navigation */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
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
          <h2 className="text-sm font-bold text-text uppercase tracking-wide">
            {formatWeekRange(weekStart)}
          </h2>
          {!isThisWeek && (
            <button
              onClick={goToThisWeek}
              className="text-[10px] font-bold uppercase tracking-widest text-accent hover:text-text transition-colors border border-accent/30 px-2 py-0.5 rounded"
            >
              This Week
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

      {/* Loading state */}
      {isLoading ? (
        <div className="p-6">
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="animate-pulse h-6 bg-surface rounded" />
                <div className="animate-pulse h-20 bg-surface rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Desktop: 7-column grid */}
          <div className="hidden md:grid grid-cols-7 divide-x divide-border">
            {days.map((day, i) => {
              const isToday = isSameDay(day.date, today);
              return (
                <div
                  key={day.dateStr}
                  className={cn(
                    'min-h-[180px] flex flex-col',
                    isToday && 'bg-accent/[0.03]',
                  )}
                >
                  {/* Day header */}
                  <div
                    className={cn(
                      'px-3 py-2 border-b text-center',
                      isToday ? 'border-accent/40 bg-accent/[0.06]' : 'border-border',
                    )}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                      {DAY_LABELS[i]}
                    </span>
                    <span
                      className={cn(
                        'block text-lg font-mono',
                        isToday ? 'text-accent font-bold' : 'text-text',
                      )}
                    >
                      {day.date.getDate()}
                    </span>
                  </div>

                  {/* Events */}
                  <div className="flex-1 p-2 space-y-1.5">
                    {day.events.length === 0 && (
                      <p className="text-[10px] text-text-muted/40 text-center mt-4 font-mono">
                        --
                      </p>
                    )}
                    {day.events.map((event, j) => (
                      <div key={j} className="group">
                        <div className="flex items-start gap-1.5">
                          <span
                            className={cn(
                              'mt-1.5 h-1.5 w-1.5 rounded-full shrink-0',
                              event.dotColor,
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-mono text-text-muted block">
                              {event.time}
                            </span>
                            <span className="text-xs text-text truncate block leading-tight">
                              {event.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile: vertical list */}
          <div className="md:hidden divide-y divide-border">
            {days.map((day, i) => {
              const isToday = isSameDay(day.date, today);
              const hasEvents = day.events.length > 0;

              if (!hasEvents && !isToday) return null;

              return (
                <div
                  key={day.dateStr}
                  className={cn(
                    'px-4 py-3',
                    isToday && 'bg-accent/[0.03]',
                  )}
                >
                  {/* Day header */}
                  <div className="flex items-baseline gap-2 mb-2">
                    <span
                      className={cn(
                        'text-sm font-bold',
                        isToday ? 'text-accent' : 'text-text',
                      )}
                    >
                      {DAY_LABELS[i]} {day.date.getDate()}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Events */}
                  {day.events.length === 0 ? (
                    <p className="text-xs text-text-muted/50 font-mono">No events</p>
                  ) : (
                    <div className="space-y-2">
                      {day.events.map((event, j) => (
                        <div key={j} className="flex items-start gap-2">
                          <span
                            className={cn(
                              'mt-1.5 h-2 w-2 rounded-full shrink-0',
                              event.dotColor,
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-mono text-text-muted">
                              {event.time}
                            </span>
                            <span className="text-sm text-text block truncate">
                              {event.label}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 px-6 py-3 border-t border-border">
        <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Schedule
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-danger" /> Reminder
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-success" /> Task
        </span>
      </div>
    </div>
  );
}
