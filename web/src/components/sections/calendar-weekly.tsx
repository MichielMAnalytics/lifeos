'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { cn } from '@/lib/utils';

// ── Constants ───────────────────────────────────────────

const GRID_START_HOUR = 6;
const GRID_END_HOUR = 23;
const HOUR_HEIGHT = 60; // px per hour
const TOTAL_HOURS = GRID_END_HOUR - GRID_START_HOUR;
const GRID_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;
const LABEL_WIDTH = 56; // px for the hour label gutter

// ── Block types to exclude (tasks/priorities/wake) ──────

const EXCLUDED_BLOCK_TYPES = new Set(['mit', 'p1', 'p2', 'task', 'wake']);

// ── Date helpers ────────────────────────────────────────

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

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToPosition(minutes: number): number {
  const offset = minutes - GRID_START_HOUR * 60;
  return (offset / 60) * HOUR_HEIGHT;
}

// ── Block type colors (schedule items only) ─────────────

const blockBorder: Record<string, string> = {
  event: 'border-l-accent',
  break: 'border-l-text-muted',
  lunch: 'border-l-text-muted',
  other: 'border-l-text-muted',
};

const blockBg: Record<string, string> = {
  event: 'bg-accent/10',
  break: 'bg-text-muted/5',
  lunch: 'bg-text-muted/5',
  other: 'bg-text-muted/5',
};

// ── Types ───────────────────────────────────────────────

interface ScheduleBlock {
  start: string;
  end: string;
  label: string;
  type: string;
}

interface PositionedBlock {
  top: number;
  height: number;
  label: string;
  type: string;
  startTime: string;
  endTime: string;
}

interface PositionedReminder {
  top: number;
  label: string;
  time: string;
}

// ── Main component ──────────────────────────────────────

export function CalendarWeekly() {
  const [now, setNow] = useState(() => new Date());
  const today = useMemo(() => new Date(), []);
  const [weekStart, setWeekStart] = useState(() => getMonday(today));

  const scrollRef = useRef<HTMLDivElement>(null);

  // Update "now" every minute for the red line
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const startDate = formatDateStr(weekDays[0]);
  const endDate = formatDateStr(weekDays[6]);

  // Fetch data -- scheduled items only, no tasks
  const reminders = useQuery(api.reminders.list, {});
  const dayPlans = useQuery(api.dayPlans.listByDateRange, { startDate, endDate });

  // Navigation
  const goToPrevWeek = () => setWeekStart((prev) => addDays(prev, -7));
  const goToNextWeek = () => setWeekStart((prev) => addDays(prev, 7));
  const goToThisWeek = () => setWeekStart(getMonday(new Date()));
  const isThisWeek = isSameDay(weekStart, getMonday(today));

  // Auto-scroll to 2 hours before current time on mount
  useEffect(() => {
    if (scrollRef.current && isThisWeek) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const twoHoursBefore = currentMinutes - 120;
      const scrollPosition = ((twoHoursBefore - GRID_START_HOUR * 60) / 60) * HOUR_HEIGHT;
      scrollRef.current.scrollTop = Math.max(0, scrollPosition);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isThisWeek]);

  // Build positioned blocks per day
  const dayData = useMemo(() => {
    return weekDays.map((date) => {
      const dateStr = formatDateStr(date);
      const blocks: PositionedBlock[] = [];
      const reminderItems: PositionedReminder[] = [];

      // Day plan schedule blocks (excluding tasks/priorities/wake)
      const plan = dayPlans?.find((p: { planDate: string }) => p.planDate === dateStr);
      if (plan) {
        for (const block of plan.schedule as ScheduleBlock[]) {
          if (EXCLUDED_BLOCK_TYPES.has(block.type)) continue;

          const startMin = timeToMinutes(block.start);
          const endMin = timeToMinutes(block.end);
          const top = minutesToPosition(startMin);
          const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 20);

          blocks.push({
            top,
            height,
            label: block.label,
            type: block.type,
            startTime: block.start,
            endTime: block.end,
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
            const minutes = d.getHours() * 60 + d.getMinutes();
            const top = minutesToPosition(minutes);
            const h = d.getHours();
            const m = d.getMinutes();
            const period = h >= 12 ? 'PM' : 'AM';
            const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
            const timeStr = m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, '0')} ${period}`;

            reminderItems.push({
              top,
              label: r.title,
              time: timeStr,
            });
          }
        }
      }

      return { date, dateStr, blocks, reminders: reminderItems };
    });
  }, [weekDays, dayPlans, reminders]);

  const isLoading = reminders === undefined || dayPlans === undefined;

  // "Now" line position
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTop = minutesToPosition(nowMinutes);
  const showNowLine =
    nowMinutes >= GRID_START_HOUR * 60 && nowMinutes <= GRID_END_HOUR * 60;

  // Find which day column is today (if visible this week)
  const todayIndex = weekDays.findIndex((d) => isSameDay(d, now));

  // Check if there are any items at all
  const hasAnyItems = dayData.some(
    (d) => d.blocks.length > 0 || d.reminders.length > 0,
  );

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
          <h2 className="text-sm font-bold text-text uppercase tracking-wide">
            {formatWeekRange(weekStart)}
          </h2>
          {!isThisWeek && (
            <button
              onClick={goToThisWeek}
              className="text-[10px] font-bold uppercase tracking-widest text-accent hover:text-text transition-colors border border-accent/30 px-2 py-0.5 rounded"
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
          {/* Bell icon */}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-warning">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          Reminder
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
          {/* Clock icon */}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Scheduled Job
        </span>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="p-6">
          <div className="flex gap-2">
            <div className="w-14 shrink-0" />
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 space-y-2">
                <div className="animate-pulse h-10 bg-surface-hover rounded" />
                <div className="animate-pulse h-40 bg-surface-hover rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div ref={scrollRef} className="overflow-x-auto overflow-y-auto max-h-[660px]">
          {/* Day headers row */}
          <div className="flex border-b border-border bg-bg sticky top-0 z-10">
            {/* Hour gutter spacer */}
            <div className="shrink-0" style={{ width: LABEL_WIDTH }} />

            {/* Day columns */}
            {weekDays.map((date, i) => {
              const isToday = isSameDay(date, now);
              return (
                <div
                  key={i}
                  className={cn(
                    'flex-1 min-w-[100px] text-center py-2.5 border-l border-border',
                    isToday && 'bg-accent/[0.04]',
                  )}
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted block">
                    {DAY_LABELS[i]}
                  </span>
                  <span
                    className={cn(
                      'text-lg font-mono block leading-tight',
                      isToday
                        ? 'text-accent font-bold'
                        : 'text-text',
                    )}
                  >
                    {date.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Grid body */}
          <div className="relative flex" style={{ height: GRID_HEIGHT }}>
            {/* Hour labels gutter */}
            <div
              className="shrink-0 relative"
              style={{ width: LABEL_WIDTH }}
            >
              {Array.from({ length: TOTAL_HOURS }).map((_, i) => {
                const hour = GRID_START_HOUR + i;
                return (
                  <div
                    key={hour}
                    className="absolute right-2 -translate-y-1/2 text-[10px] font-mono text-text-muted/60"
                    style={{ top: i * HOUR_HEIGHT }}
                  >
                    {formatHour(hour)}
                  </div>
                );
              })}
            </div>

            {/* Day columns */}
            {dayData.map((day, dayIndex) => {
              const isToday = isSameDay(day.date, now);
              return (
                <div
                  key={day.dateStr}
                  className={cn(
                    'flex-1 min-w-[100px] relative border-l border-border',
                    isToday && 'bg-accent/[0.02]',
                  )}
                >
                  {/* Hour grid lines */}
                  {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                    <div key={`h-${i}`}>
                      {/* Full hour line */}
                      <div
                        className="absolute left-0 right-0 border-t border-border/50"
                        style={{ top: i * HOUR_HEIGHT }}
                      />
                      {/* Half hour line */}
                      <div
                        className="absolute left-0 right-0 border-t border-border/25 border-dashed"
                        style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                      />
                    </div>
                  ))}
                  {/* Bottom line */}
                  <div
                    className="absolute left-0 right-0 border-t border-border/50"
                    style={{ top: TOTAL_HOURS * HOUR_HEIGHT }}
                  />

                  {/* Schedule blocks */}
                  {day.blocks.map((block, bi) => (
                    <div
                      key={`b-${bi}`}
                      className={cn(
                        'absolute left-1 right-1 rounded px-1.5 py-0.5 border-l-2 overflow-hidden z-[2]',
                        blockBg[block.type] ?? 'bg-text-muted/5',
                        blockBorder[block.type] ?? 'border-l-text-muted',
                      )}
                      style={{
                        top: block.top,
                        height: block.height,
                      }}
                      title={`${block.label} (${block.startTime} - ${block.endTime})`}
                    >
                      <span className="text-[10px] font-medium text-text leading-tight block truncate">
                        {block.label}
                      </span>
                      {block.height >= 32 && (
                        <span className="text-[9px] font-mono text-text-muted block truncate">
                          {block.startTime} - {block.endTime}
                        </span>
                      )}
                    </div>
                  ))}

                  {/* Reminder items */}
                  {day.reminders.map((reminder, ri) => (
                    <div
                      key={`r-${ri}`}
                      className="absolute left-1 right-1 rounded px-1.5 py-0.5 border-l-2 border-l-warning bg-warning/10 overflow-hidden z-[3]"
                      style={{
                        top: reminder.top,
                        height: 24,
                      }}
                      title={`Reminder: ${reminder.label} at ${reminder.time}`}
                    >
                      <span className="text-[10px] font-medium text-text leading-tight block truncate">
                        {reminder.label}
                      </span>
                    </div>
                  ))}

                  {/* Red "now" line -- only on today's column */}
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

          {/* Empty state overlay */}
          {!hasAnyItems && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: 120 }}>
              <p className="text-xs text-text-muted/40 font-mono">
                No scheduled items this week
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
