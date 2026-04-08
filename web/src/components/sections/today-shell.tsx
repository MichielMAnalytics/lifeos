'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Id } from '@/lib/convex-api';
import { cn, formatRelativeDate } from '@/lib/utils';
import { PrioritiesChecklist } from './priorities-checklist';
import { DayTimeline } from './day-timeline';
import { CalendarDatePicker } from '@/components/calendar-date-picker';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Phase 2 / Section 1A — Sunsama Two-Pane Today layout.
 *
 * LEFT pane (40%):
 *   - Priorities checklist (MIT / P1 / P2)
 *   - Today's unscheduled task list (drag-source for the timeline)
 *   - Done Today — collapsed by default
 *
 * RIGHT pane (60%):
 *   - DayTimeline grid WITHOUT its internal sidebar (we use `hideSidebar`)
 *     — includes the NowCard, click-to-add composer, and schedule blocks
 *
 * This component replaces the old vertical preset layout for the today page
 * default preset. It keeps working with the preset system (just lives as its
 * own section id) so the configure toolbar and other presets are unaffected.
 */

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function startOfDayMs(d: string): number {
  return new Date(d + 'T00:00:00').getTime();
}

function endOfDayMs(d: string): number {
  return new Date(d + 'T23:59:59.999').getTime();
}

// ── Left-pane task row ─────────────────────────────

function TaskRow({
  task,
  isOverdue,
}: {
  task: { _id: Id<'tasks'>; title: string; dueDate?: string };
  isOverdue?: boolean;
}) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const updateTask = useMutation(api.tasks.update);

  const handleDateSelect = useCallback(
    async (date: string | null) => {
      setDatePickerOpen(false);
      try {
        await updateTask({ id: task._id, dueDate: date ?? '' });
      } catch (err) {
        console.error('Failed to update task date:', err);
      }
    },
    [updateTask, task._id],
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('application/x-task-id', task._id);
      e.dataTransfer.setData('application/x-task-title', task.title);
      e.dataTransfer.effectAllowed = 'copy';
    },
    [task._id, task.title],
  );

  const dueDate = task.dueDate ?? null;
  const dateInfo = formatRelativeDate(dueDate);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="rounded-lg border border-border bg-surface px-3 py-2 cursor-grab active:cursor-grabbing hover:border-text-muted/30 transition-colors"
      title={task.title}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            'mt-0.5 flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border-[1.5px]',
            isOverdue ? 'border-danger/60' : 'border-text-muted/30',
          )}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text leading-snug truncate">{task.title}</p>
          <div className="relative mt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDatePickerOpen((v) => !v);
              }}
              className={cn(
                'inline-flex items-center gap-1 text-[11px] rounded-md px-1 py-0.5 transition-colors',
                isOverdue
                  ? 'text-danger hover:bg-danger/10'
                  : 'text-text-muted hover:text-accent hover:bg-surface-hover',
              )}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isOverdue ? 'text-danger' : 'opacity-50'}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {dateInfo.text}
            </button>
            {datePickerOpen && (
              <CalendarDatePicker
                currentDate={dueDate ?? undefined}
                onSelect={handleDateSelect}
                onClose={() => setDatePickerOpen(false)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Today Shell ────────────────────────────────

export function TodayShell() {
  const todayTasks = useQuery(api.tasks.list, { status: 'todo', due: 'today' });
  const overdueTasks = useQuery(api.tasks.list, { status: 'todo', due: 'overdue' });
  const doneTasks = useQuery(api.tasks.list, { status: 'done' });
  const today = todayISO();
  const dayPlan = useQuery(api.dayPlans.getByDate, { date: today });

  const [showDone, setShowDone] = useState(false);

  // Filter out tasks already on today's day plan (Akiflow pattern —
  // dragging a task into the timeline removes it from the list)
  const scheduledIds = new Set<string>(
    (dayPlan?.schedule ?? [])
      .map((b) => b.taskId)
      .filter((id): id is string => Boolean(id)),
  );

  const unscheduledToday = (todayTasks ?? []).filter((t) => !scheduledIds.has(t._id));
  const unscheduledOverdue = (overdueTasks ?? []).filter((t) => !scheduledIds.has(t._id));

  // "Done today" — tasks with status=done completed in the last 24h
  const dayStart = startOfDayMs(today);
  const dayEnd = endOfDayMs(today);
  const doneToday = (doneTasks ?? []).filter((t) => {
    if (!t.completedAt) return false;
    return t.completedAt >= dayStart && t.completedAt <= dayEnd;
  });

  const isLoading = todayTasks === undefined || dayPlan === undefined;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 md:gap-6">
        <div className="space-y-4">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
        <Skeleton className="h-[720px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 md:gap-6 items-start">
      {/* ── LEFT pane — 40% on desktop ── */}
      <div className="space-y-4 min-w-0">
        {/* Priorities checklist stays unchanged */}
        <PrioritiesChecklist />

        {/* Today's remaining tasks */}
        {(unscheduledOverdue.length > 0 || unscheduledToday.length > 0) && (
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            {unscheduledOverdue.length > 0 && (
              <div>
                <div className="flex items-baseline justify-between px-6 py-3 border-b border-border">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-danger">
                    Overdue
                  </h3>
                  <span className="text-xs text-text-muted tabular-nums">
                    {unscheduledOverdue.length}
                  </span>
                </div>
                <div className="px-3 py-3 space-y-2">
                  {unscheduledOverdue.map((task) => (
                    <TaskRow key={task._id} task={task} isOverdue />
                  ))}
                </div>
              </div>
            )}

            {unscheduledToday.length > 0 && (
              <div className={unscheduledOverdue.length > 0 ? 'border-t border-border' : ''}>
                <div className="flex items-baseline justify-between px-6 py-3 border-b border-border">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-text-muted">
                    Today
                  </h3>
                  <span className="text-xs text-text-muted tabular-nums">
                    {unscheduledToday.length}
                  </span>
                </div>
                <div className="px-3 py-3 space-y-2">
                  {unscheduledToday.map((task) => (
                    <TaskRow key={task._id} task={task} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Done Today — collapsible */}
        {doneToday.length > 0 && (
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDone((v) => !v)}
              className="w-full flex items-baseline justify-between px-6 py-3 hover:bg-surface-hover transition-colors"
            >
              <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-success flex items-center gap-2">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={cn('transition-transform', showDone ? 'rotate-90' : '')}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                Done Today
              </h3>
              <span className="text-xs text-text-muted tabular-nums">{doneToday.length}</span>
            </button>
            {showDone && (
              <div className="px-4 py-3 space-y-1 border-t border-border">
                {doneToday.map((task) => (
                  <div
                    key={task._id}
                    className="text-xs text-text-muted line-through truncate"
                    title={task.title}
                  >
                    {task.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {unscheduledOverdue.length === 0 && unscheduledToday.length === 0 && doneToday.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-8 text-center">
            <p className="text-sm text-text-muted">All clear for today.</p>
            <p className="text-xs text-text-muted/70 mt-1">
              Drop a task on the timeline or click an empty slot to plan your day.
            </p>
          </div>
        )}
      </div>

      {/* ── RIGHT pane — 60% on desktop, day-timeline WITHOUT its sidebar ── */}
      <div className="min-w-0">
        <DayTimeline hideSidebar />
      </div>
    </div>
  );
}
