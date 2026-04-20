'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Id } from '@/lib/convex-api';
import { useTodayDate } from '@/lib/today-date-context';
import { cn, formatRelativeDate } from '@/lib/utils';
import { CalendarDatePicker } from '@/components/calendar-date-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { useTimeFormat } from '@/components/time-format-provider';

// ── Block type colors ────────────────────────────────────
// Sunset Gradient palette (Section 2B pick): MIT #FF4D4F · P1 #FB923C · P2 #FCD34D

const blockBorder: Record<string, string> = {
  mit: 'border-l-[#FF4D4F]',
  p1: 'border-l-[#FB923C]',
  p2: 'border-l-[#FCD34D]',
  event: 'border-l-warning',
  break: 'border-l-text-muted',
  lunch: 'border-l-text-muted',
  task: 'border-l-success',
  wake: 'border-l-warning',
  other: 'border-l-text-muted',
};

const blockBg: Record<string, string> = {
  mit: 'bg-[#FF4D4F]/10',
  p1: 'bg-[#FB923C]/10',
  p2: 'bg-[#FCD34D]/10',
  event: 'bg-warning/10',
  break: 'bg-text-muted/5',
  lunch: 'bg-text-muted/5',
  task: 'bg-success/10',
  wake: 'bg-warning/10',
  other: 'bg-text-muted/5',
};

const checkableTypes = new Set(['mit', 'p1', 'p2', 'task']);

// ── Constants ────────────────────────────────────────────

const GRID_START_HOUR = 6;
const GRID_END_HOUR = 23;
const HOUR_HEIGHT = 60; // px per hour
const TOTAL_HOURS = GRID_END_HOUR - GRID_START_HOUR;
const GRID_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;
const LABEL_WIDTH = 56; // px for the hour label gutter
const RESIZE_HANDLE_HEIGHT = 8; // px
const MIN_DURATION_MINUTES = 15;

// ── Helpers ──────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToPosition(minutes: number): number {
  const offset = minutes - GRID_START_HOUR * 60;
  return (offset / 60) * HOUR_HEIGHT;
}

function minutesToTimeString(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function snapToQuarter(minutes: number): number {
  return Math.round(minutes / 15) * 15;
}

function clampMinutes(minutes: number): number {
  return Math.max(GRID_START_HOUR * 60, Math.min(minutes, GRID_END_HOUR * 60));
}

function positionToMinutes(y: number): number {
  return (y / HOUR_HEIGHT) * 60 + GRID_START_HOUR * 60;
}

function formatHour(hour: number, is24h = false): string {
  if (is24h) return `${hour.toString().padStart(2, '0')}:00`;
  if (hour === 0 || hour === 24) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function getDoneField(type: string): 'mitDone' | 'p1Done' | 'p2Done' | null {
  switch (type) {
    case 'mit':
      return 'mitDone';
    case 'p1':
      return 'p1Done';
    case 'p2':
      return 'p2Done';
    default:
      return null;
  }
}

function getDoneValue(
  dayPlan: { mitDone: boolean; p1Done: boolean; p2Done: boolean },
  type: string,
): boolean {
  const field = getDoneField(type);
  if (!field) return false;
  return dayPlan[field];
}

// ── ScheduleBlock type ───────────────────────────────────

interface ScheduleBlock {
  start: string;
  end: string;
  label: string;
  type: string;
  taskId?: string;
}

// ── NowCard (Section 1I) ────────────────────────────────
// Shows the current time block plus time remaining. If no block is in
// progress right now, shows the next upcoming block instead.

function NowCard({
  schedule,
  nowMinutes,
}: {
  schedule: ScheduleBlock[];
  nowMinutes: number;
}) {
  // Find the block that contains "now" (start <= now < end)
  let current: ScheduleBlock | null = null;
  let next: ScheduleBlock | null = null;
  let smallestNextDelta = Infinity;
  for (const block of schedule) {
    const start = timeToMinutes(block.start);
    const end = timeToMinutes(block.end);
    if (start <= nowMinutes && nowMinutes < end) {
      current = block;
      break;
    }
    if (start > nowMinutes && start - nowMinutes < smallestNextDelta) {
      smallestNextDelta = start - nowMinutes;
      next = block;
    }
  }

  if (!current && !next) return null;

  const block = current ?? next!;
  const start = timeToMinutes(block.start);
  const end = timeToMinutes(block.end);
  const startLabel = block.start;
  const endLabel = block.end;
  const total = end - start;
  let progressPct: number | null = null;
  let metaLabel: string;

  if (current) {
    const remaining = end - nowMinutes;
    progressPct = Math.min(100, Math.max(0, ((nowMinutes - start) / total) * 100));
    metaLabel = `${remaining} min left`;
  } else {
    const wait = start - nowMinutes;
    if (wait < 60) metaLabel = `starts in ${wait} min`;
    else metaLabel = `starts in ${Math.floor(wait / 60)}h ${wait % 60}m`;
  }

  return (
    <div className="border-b border-border bg-bg-subtle px-6 py-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-accent shrink-0">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent-glow)]"
            style={{ animation: 'pulse 1.6s ease-in-out infinite' }}
          />
          {current ? 'Now' : 'Next'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-text truncate">
            {block.label}
          </div>
          <div className="text-[11px] text-text-muted font-mono tabular-nums">
            {startLabel}–{endLabel} <span className="text-accent">· {metaLabel}</span>
          </div>
        </div>
      </div>
      {progressPct !== null && (
        <div className="mt-2 h-[3px] bg-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ── Resize state type ───────────────────────────────────

interface ResizeState {
  blockIndex: number;
  edge: 'bottom' | 'top';
  initialMouseY: number;
  initialStartMin: number;
  initialEndMin: number;
}

// ── EventCard (positioned block on the grid) ─────────────

function EventCard({
  block,
  blockIndex,
  done,
  onToggle,
  onResizeStart,
  overrideStartMin,
  overrideEndMin,
  isResizing,
  formatTimeFn,
}: {
  block: ScheduleBlock;
  blockIndex: number;
  done: boolean;
  onToggle: (() => void) | null;
  onResizeStart: (e: React.MouseEvent, blockIndex: number, edge: 'bottom' | 'top') => void;
  overrideStartMin?: number;
  overrideEndMin?: number;
  isResizing: boolean;
  formatTimeFn: (t: string) => string;
}) {
  const startMin = overrideStartMin ?? timeToMinutes(block.start);
  const endMin = overrideEndMin ?? timeToMinutes(block.end);
  const top = minutesToPosition(startMin);
  const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 20);

  const displayStart = overrideStartMin != null ? minutesToTimeString(overrideStartMin) : block.start;
  const displayEnd = overrideEndMin != null ? minutesToTimeString(overrideEndMin) : block.end;

  const handleDragStart = (e: React.DragEvent) => {
    // Don't start drag if we're resizing
    if (isResizing) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('application/x-timeline-block-index', String(blockIndex));
    // Stable identity for the block — index alone is unsafe if the schedule
    // re-orders between drag-start and drop. Receivers should match by
    // (start, label, taskId) first, fall back to index.
    e.dataTransfer.setData('application/x-block-start', block.start);
    e.dataTransfer.setData('application/x-block-label', block.label);
    e.dataTransfer.setData('application/x-block-type', block.type);
    e.dataTransfer.setData('application/x-block-task-id', block.taskId ?? '');
    const duration = timeToMinutes(block.end) - timeToMinutes(block.start);
    e.dataTransfer.setData('application/x-block-duration', String(duration));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      data-event-card
      draggable={!isResizing}
      onDragStart={handleDragStart}
      className={cn(
        'absolute left-0 right-0 rounded-lg border-l-[3px] px-3 py-1.5 overflow-hidden transition-opacity select-none group',
        blockBorder[block.type] ?? 'border-l-text-muted',
        blockBg[block.type] ?? 'bg-text-muted/5',
        done && 'opacity-50',
        isResizing ? 'cursor-ns-resize z-30' : 'cursor-grab active:cursor-grabbing',
      )}
      style={{
        top: `${top}px`,
        height: `${height}px`,
      }}
    >
      {/* Top resize handle */}
      <div
        className="absolute top-0 left-0 right-0 cursor-n-resize z-10"
        style={{ height: `${RESIZE_HANDLE_HEIGHT}px` }}
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onResizeStart(e, blockIndex, 'top');
        }}
      />

      <div className="flex items-start gap-2 h-full">
        {/* Checkbox for checkable types */}
        {onToggle && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={cn(
              'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-all mt-0.5',
              done
                ? 'border-success bg-success text-white'
                : 'border-text-muted/40 hover:border-text',
            )}
            aria-label={`Toggle ${block.label}`}
          >
            {done && (
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        )}

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-sm font-medium truncate leading-tight',
              done ? 'line-through text-text-muted' : 'text-text',
            )}
          >
            {block.label}
          </p>
          {height >= 36 && (
            <p className="text-xs text-text-muted mt-0.5">
              {formatTimeFn(displayStart)} - {formatTimeFn(displayEnd)}
            </p>
          )}
        </div>
      </div>

      {/* Bottom resize handle */}
      <div
        className="absolute bottom-0 left-0 right-0 cursor-s-resize z-10"
        style={{ height: `${RESIZE_HANDLE_HEIGHT}px` }}
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onResizeStart(e, blockIndex, 'bottom');
        }}
      />

      {/* Visual resize indicator on hover */}
      <div className="absolute bottom-0 left-2 right-2 h-1 rounded-full bg-text-muted/0 group-hover:bg-text-muted/30 transition-colors" />
    </div>
  );
}

// ── NowLine (red current-time indicator) ─────────────────

function NowIndicator({ nowMinutes }: { nowMinutes: number }) {
  const top = minutesToPosition(nowMinutes);

  // Only show if within the grid bounds
  if (top < 0 || top > GRID_HEIGHT) return null;

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top: `${top}px` }}
    >
      {/* Red circle on the left edge */}
      <div className="absolute -left-[5px] -top-[5px] h-[10px] w-[10px] rounded-full bg-danger" />
      {/* Red line across the width */}
      <div className="h-[2px] bg-danger w-full" />
    </div>
  );
}

// ── TaskSidebarCard ──────────────────────────────────────

function TaskSidebarCard({ task }: { task: { _id: Id<'tasks'>; title: string; dueDate?: string } }) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const updateTask = useMutation(api.tasks.update);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/x-task-id', task._id);
    e.dataTransfer.setData('application/x-task-title', task.title);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDateSelect = useCallback(async (date: string | null) => {
    setDatePickerOpen(false);
    try {
      await updateTask({ id: task._id, dueDate: date ?? '' });
    } catch (err) {
      console.error('Failed to update task date:', err);
    }
  }, [updateTask, task._id]);

  const dueDate = task.dueDate ?? null;
  const dateInfo = formatRelativeDate(dueDate);
  const todayStr = new Date().toISOString().slice(0, 10);
  const isOverdue = dueDate !== null && dueDate < todayStr;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="rounded-xl border border-border bg-surface cursor-grab active:cursor-grabbing hover:border-text-muted/30 transition-all duration-150"
      title={task.title}
    >
      <div className="px-3 py-2.5 flex items-start gap-2.5">
        {/* Circle checkbox visual */}
        <div
          className={cn(
            'mt-0.5 flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border-[1.5px]',
            isOverdue
              ? 'border-danger/60'
              : 'border-text-muted/30',
          )}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text leading-snug truncate">
            {task.title}
          </p>

          {/* Due date badge - clickable to open calendar */}
          <div className="relative mt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDatePickerOpen((prev) => !prev);
              }}
              className={cn(
                'inline-flex items-center gap-1 text-xs rounded-md px-1 py-0.5 transition-colors',
                isOverdue
                  ? 'text-danger hover:bg-danger/10'
                  : 'text-text-muted hover:text-accent hover:bg-surface-hover',
              )}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={isOverdue ? 'text-danger' : 'opacity-50'}
              >
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

// ── TaskSidebar ──────────────────────────────────────────

function TaskSidebar({
  todayTasks,
  overdueTasks,
  isDragOverSidebar,
  onSidebarDragOver,
  onSidebarDragLeave,
  onSidebarDrop,
}: {
  todayTasks: { _id: Id<'tasks'>; title: string; dueDate?: string }[] | undefined;
  overdueTasks: { _id: Id<'tasks'>; title: string; dueDate?: string }[] | undefined;
  isDragOverSidebar: boolean;
  onSidebarDragOver: (e: React.DragEvent) => void;
  onSidebarDragLeave: () => void;
  onSidebarDrop: (e: React.DragEvent) => void;
}) {
  const todayCount = todayTasks?.length ?? 0;
  const overdueCount = overdueTasks?.length ?? 0;
  const isEmpty = todayCount === 0 && overdueCount === 0;

  return (
    <div
      className={cn(
        'md:shrink-0 md:w-[400px] md:border-l border-t md:border-t-0 border-border overflow-y-auto max-h-[300px] md:max-h-[660px] transition-colors',
        isDragOverSidebar && 'bg-danger/10 border-l-danger/50',
      )}
      onDragOver={onSidebarDragOver}
      onDragLeave={onSidebarDragLeave}
      onDrop={onSidebarDrop}
    >
      <div className="p-3 space-y-4">
        {/* Drop-to-remove indicator */}
        {isDragOverSidebar && (
          <div className="rounded-lg border-2 border-dashed border-danger/40 px-3 py-3 text-center">
            <p className="text-xs font-bold text-danger">Remove from schedule</p>
          </div>
        )}

        {/* Overdue section */}
        {overdueCount > 0 && (
          <div>
            <h3 className="text-xs font-bold text-danger uppercase tracking-wide mb-2">
              Overdue ({overdueCount})
            </h3>
            <div className="space-y-1.5">
              {overdueTasks!.map((task) => (
                <TaskSidebarCard key={task._id} task={task} />
              ))}
            </div>
          </div>
        )}

        {/* Today section */}
        {todayCount > 0 && (
          <div>
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wide mb-2">
              Today ({todayCount})
            </h3>
            <div className="space-y-1.5">
              {todayTasks!.map((task) => (
                <TaskSidebarCard key={task._id} task={task} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {isEmpty && !isDragOverSidebar && (
          <p className="text-xs text-text-muted text-center py-4">No tasks</p>
        )}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────

/**
 * DayTimeline — the day plan grid + its internal task sidebar.
 *
 * @param hideSidebar  When true the internal task sidebar is not rendered.
 *   Used by the TodayShell two-pane layout so the page-level left pane
 *   handles priorities + unscheduled tasks instead of having them
 *   duplicated inside this component.
 */
export function DayTimeline({ hideSidebar = false }: { hideSidebar?: boolean } = {}) {
  const { date, isToday } = useTodayDate();
  const dayPlan = useQuery(api.dayPlans.getByDate, { date });
  const upsert = useMutation(api.dayPlans.upsert);

  const todayTasks = useQuery(api.tasks.list, { status: 'todo', due: 'today' });
  const overdueTasks = useQuery(api.tasks.list, { status: 'todo', due: 'overdue' });
  const { formatTime, timeFormat } = useTimeFormat();
  const is24h = timeFormat === '24h';

  const [now, setNow] = useState(() => new Date());
  const [dropTargetMinutes, setDropTargetMinutes] = useState<number | null>(null);

  // Resize state
  const [resizing, setResizing] = useState<ResizeState | null>(null);
  const [resizePreview, setResizePreview] = useState<{ startMin: number; endMin: number } | null>(null);

  // Drag-to-reposition state
  const [blockDropTargetMinutes, setBlockDropTargetMinutes] = useState<number | null>(null);

  // Sidebar drop state
  const [isDragOverSidebar, setIsDragOverSidebar] = useState(false);

  // Section 1H — click empty slot to add a custom (non-task) block
  const [composer, setComposer] = useState<{ startMin: number; endMin: number } | null>(null);
  const [composerLabel, setComposerLabel] = useState('');
  const composerInputRef = useRef<HTMLInputElement>(null);
  // When Esc closes the composer, we want the subsequent blur to NOT save.
  const composerCancelledRef = useRef(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isToday) return;
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, [isToday]);

  // Auto-scroll to 2 hours before current time on mount
  useEffect(() => {
    if (scrollRef.current && isToday) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const twoHoursBefore = currentMinutes - 120;
      const scrollPosition = ((twoHoursBefore - GRID_START_HOUR * 60) / 60) * HOUR_HEIGHT;
      scrollRef.current.scrollTop = Math.max(0, scrollPosition);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday]);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const schedule: ScheduleBlock[] = dayPlan?.schedule ?? [];

  // Filter out tasks already on the schedule (Akiflow-style: drag removes from sidebar)
  const scheduledTaskIds = new Set(
    schedule.filter((b) => b.taskId).map((b) => b.taskId!),
  );
  const filteredTodayTasks = todayTasks?.filter((t) => !scheduledTaskIds.has(t._id));
  const filteredOverdueTasks = overdueTasks?.filter((t) => !scheduledTaskIds.has(t._id));

  // ── Resize handlers (native mouse events) ──────────────

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, blockIndex: number, edge: 'bottom' | 'top') => {
      const block = schedule[blockIndex];
      if (!block) return;

      setResizing({
        blockIndex,
        edge,
        initialMouseY: e.clientY,
        initialStartMin: timeToMinutes(block.start),
        initialEndMin: timeToMinutes(block.end),
      });
      setResizePreview({
        startMin: timeToMinutes(block.start),
        endMin: timeToMinutes(block.end),
      });
    },
    [schedule],
  );

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      const mouseMinutes = snapToQuarter(positionToMinutes(mouseY));

      if (resizing.edge === 'bottom') {
        const newEnd = clampMinutes(mouseMinutes);
        const minEnd = resizing.initialStartMin + MIN_DURATION_MINUTES;
        setResizePreview({
          startMin: resizing.initialStartMin,
          endMin: Math.max(newEnd, minEnd),
        });
      } else {
        const newStart = clampMinutes(mouseMinutes);
        const maxStart = resizing.initialEndMin - MIN_DURATION_MINUTES;
        setResizePreview({
          startMin: Math.min(newStart, maxStart),
          endMin: resizing.initialEndMin,
        });
      }
    };

    const handleMouseUp = () => {
      if (resizePreview && dayPlan) {
        const updatedSchedule = [...schedule];
        updatedSchedule[resizing.blockIndex] = {
          ...updatedSchedule[resizing.blockIndex],
          start: minutesToTimeString(resizePreview.startMin),
          end: minutesToTimeString(resizePreview.endMin),
        };
        void upsert({ date, schedule: updatedSchedule });
      }
      setResizing(null);
      setResizePreview(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, resizePreview, schedule, dayPlan, date, upsert]);

  // ── Grid drag handlers (for both sidebar tasks and timeline block repositioning) ──

  const calcDropMinutes = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const dropY = e.clientY - rect.top;
    const rawMinutes = positionToMinutes(dropY);
    return snapToQuarter(rawMinutes);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      const hasTask = e.dataTransfer.types.includes('application/x-task-id');
      const hasBlock = e.dataTransfer.types.includes('application/x-timeline-block-index');

      if (!hasTask && !hasBlock) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = hasBlock ? 'move' : 'copy';

      const minutes = calcDropMinutes(e);

      if (hasBlock) {
        setBlockDropTargetMinutes(minutes);
      } else {
        setDropTargetMinutes(minutes);
      }
    },
    [calcDropMinutes],
  );

  const handleDragLeave = useCallback(() => {
    setDropTargetMinutes(null);
    setBlockDropTargetMinutes(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDropTargetMinutes(null);
      setBlockDropTargetMinutes(null);

      // Case 1: Dropping a timeline block to reposition
      const blockIndexStr = e.dataTransfer.getData('application/x-timeline-block-index');
      if (blockIndexStr !== '') {
        const blockIndex = Number(blockIndexStr);
        const durationStr = e.dataTransfer.getData('application/x-block-duration');
        const duration = Number(durationStr) || 60;
        const dropMinutes = calcDropMinutes(e);

        const newStart = clampMinutes(dropMinutes);
        const newEnd = clampMinutes(newStart + duration);

        // If the end got clamped, adjust the start to maintain duration
        const actualEnd = Math.min(newEnd, GRID_END_HOUR * 60);
        const actualStart = Math.max(actualEnd - duration, GRID_START_HOUR * 60);

        const updatedSchedule = [...schedule];
        updatedSchedule[blockIndex] = {
          ...updatedSchedule[blockIndex],
          start: minutesToTimeString(actualStart),
          end: minutesToTimeString(actualEnd),
        };
        void upsert({ date, schedule: updatedSchedule });
        return;
      }

      // Case 2: Dropping a task from the sidebar
      const taskId = e.dataTransfer.getData('application/x-task-id');
      const taskTitle = e.dataTransfer.getData('application/x-task-title');
      if (!taskId || !taskTitle) return;

      const startMinutes = calcDropMinutes(e);
      const endMinutes = startMinutes + 60;

      const clampedStart = Math.max(GRID_START_HOUR * 60, Math.min(startMinutes, (GRID_END_HOUR - 1) * 60));
      const clampedEnd = Math.min(GRID_END_HOUR * 60, endMinutes);

      const newBlock: ScheduleBlock = {
        start: minutesToTimeString(clampedStart),
        end: minutesToTimeString(clampedEnd),
        label: taskTitle,
        type: 'task',
        taskId,
      };

      const existingSchedule: ScheduleBlock[] = dayPlan?.schedule ?? [];
      void upsert({ date, schedule: [...existingSchedule, newBlock] });
    },
    [calcDropMinutes, dayPlan, date, upsert, schedule],
  );

  // ── Sidebar drag handlers (drop block to remove from schedule) ──

  const handleSidebarDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('application/x-timeline-block-index')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOverSidebar(true);
  }, []);

  const handleSidebarDragLeave = useCallback(() => {
    setIsDragOverSidebar(false);
  }, []);

  const handleSidebarDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOverSidebar(false);

      const blockIndexStr = e.dataTransfer.getData('application/x-timeline-block-index');
      if (blockIndexStr === '') return;

      const blockIndex = Number(blockIndexStr);
      const updatedSchedule = schedule.filter((_, i) => i !== blockIndex);
      void upsert({ date, schedule: updatedSchedule });
    },
    [schedule, date, upsert],
  );

  // Section 1H — click handler for adding custom non-task blocks
  const handleGridClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (resizing || dropTargetMinutes !== null || blockDropTargetMinutes !== null) return;
    if (!gridRef.current) return;
    // Don't open the composer if the click came from inside an existing event
    const target = e.target as HTMLElement;
    if (target.closest('[data-event-card]')) return;
    if (target.closest('[data-composer]')) return;

    const rect = gridRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const startMin = clampMinutes(snapToQuarter(positionToMinutes(y)));
    const endMin = clampMinutes(startMin + 30); // default 30-min block
    setComposer({ startMin, endMin });
    setComposerLabel('');
    requestAnimationFrame(() => composerInputRef.current?.focus());
  }, [resizing, dropTargetMinutes, blockDropTargetMinutes]);

  const closeComposer = useCallback(() => {
    setComposer(null);
    setComposerLabel('');
  }, []);

  const cancelComposer = useCallback(() => {
    composerCancelledRef.current = true;
    closeComposer();
  }, [closeComposer]);

  const saveComposer = useCallback(() => {
    // Skip save if Esc just cancelled this composer (avoids onBlur racing)
    if (composerCancelledRef.current) {
      composerCancelledRef.current = false;
      return;
    }
    if (!composer) return;
    const trimmed = composerLabel.trim();
    if (!trimmed) {
      closeComposer();
      return;
    }
    const newBlock: ScheduleBlock = {
      start: minutesToTimeString(composer.startMin),
      end: minutesToTimeString(composer.endMin),
      label: trimmed,
      type: 'other',
    };
    const existingSchedule: ScheduleBlock[] = dayPlan?.schedule ?? [];
    void upsert({ date, schedule: [...existingSchedule, newBlock] });
    closeComposer();
  }, [composer, composerLabel, dayPlan, date, upsert, closeComposer]);

  // Loading state — shape-matching skeleton (Section 18J)
  if (dayPlan === undefined) {
    return (
      <div className="rounded-xl border border-border bg-surface">
        <div className="px-6 py-4 border-b border-border">
          <Skeleton className="h-3 w-28" />
        </div>
        <div className="p-6 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const handleToggle = (type: string) => {
    const field = getDoneField(type);
    if (!field || !dayPlan) return;
    void upsert({ date, [field]: !dayPlan[field] });
  };

  // Build the hour labels array
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => GRID_START_HOUR + i);

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-baseline justify-between px-6 py-4 border-b border-border">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
          Day Plan
        </h2>
        {dayPlan?.wakeTime && (
          <span className="text-xs font-mono text-text-muted">
            Wake {dayPlan.wakeTime}
          </span>
        )}
      </div>

      {/* Now card — Section 1I */}
      {isToday && schedule.length > 0 && (
        <NowCard schedule={schedule} nowMinutes={nowMinutes} />
      )}

      {/* Calendar grid + task sidebar */}
      <div className="flex flex-col md:flex-row overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto max-h-[720px]">
          <div className="flex" style={{ minHeight: `${GRID_HEIGHT}px` }}>
            {/* Hour labels gutter */}
            <div
              className="shrink-0 border-r border-border"
              style={{ width: `${LABEL_WIDTH}px` }}
            >
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="relative"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                >
                  <span className="absolute -top-[9px] right-3 text-[11px] text-text-muted select-none">
                    {formatHour(hour, is24h)}
                  </span>
                </div>
              ))}
            </div>

            {/* Grid area with events */}
            <div
              ref={gridRef}
              className={cn(
                'flex-1 relative',
                resizing && 'cursor-ns-resize',
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleGridClick}
            >
              {/* Hour grid lines */}
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-t border-border"
                  style={{ top: `${(hour - GRID_START_HOUR) * HOUR_HEIGHT}px` }}
                />
              ))}

              {/* Half-hour dashed lines */}
              {hours.map((hour) => (
                <div
                  key={`half-${hour}`}
                  className="absolute left-0 right-0 border-t border-border/40 border-dashed"
                  style={{
                    top: `${(hour - GRID_START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2}px`,
                  }}
                />
              ))}

              {/* Drop indicator for sidebar tasks */}
              {dropTargetMinutes !== null && (
                <div
                  className="absolute left-0 right-0 bg-accent/15 border border-accent/30 rounded pointer-events-none z-10"
                  style={{
                    top: `${minutesToPosition(dropTargetMinutes)}px`,
                    height: `${HOUR_HEIGHT}px`,
                  }}
                />
              )}

              {/* Drop indicator for repositioning timeline blocks */}
              {blockDropTargetMinutes !== null && (
                <div
                  className="absolute left-0 right-0 bg-success/15 border border-success/30 rounded pointer-events-none z-10"
                  style={{
                    top: `${minutesToPosition(blockDropTargetMinutes)}px`,
                    height: `${HOUR_HEIGHT}px`,
                  }}
                />
              )}

              {/* Event blocks */}
              <div className="absolute inset-0 px-2">
                {schedule.map((block, index) => {
                  const isCheckable = checkableTypes.has(block.type);
                  const done = dayPlan ? getDoneValue(dayPlan, block.type) : false;
                  const isBeingResized = resizing?.blockIndex === index;

                  return (
                    <EventCard
                      key={`block-${index}`}
                      block={block}
                      blockIndex={index}
                      done={done}
                      onToggle={isCheckable ? () => handleToggle(block.type) : null}
                      onResizeStart={handleResizeStart}
                      overrideStartMin={isBeingResized ? resizePreview?.startMin : undefined}
                      overrideEndMin={isBeingResized ? resizePreview?.endMin : undefined}
                      isResizing={isBeingResized}
                      formatTimeFn={formatTime}
                    />
                  );
                })}
              </div>

              {/* Now line */}
              {isToday && <NowIndicator nowMinutes={nowMinutes} />}

              {/* Inline composer for custom blocks (Section 1H) */}
              {composer && (
                <div
                  data-composer
                  className="absolute left-2 right-2 z-30 bg-surface border border-accent rounded-lg shadow-2xl px-3 py-2 flex items-center gap-2"
                  style={{
                    top: `${minutesToPosition(composer.startMin)}px`,
                    height: `${Math.max(((composer.endMin - composer.startMin) / 60) * HOUR_HEIGHT, 36)}px`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[10px] font-mono text-text-muted shrink-0 tabular-nums">
                    {minutesToTimeString(composer.startMin)}
                  </span>
                  <input
                    ref={composerInputRef}
                    type="text"
                    value={composerLabel}
                    onChange={(e) => setComposerLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        saveComposer();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelComposer();
                      }
                    }}
                    onBlur={saveComposer}
                    placeholder="Coffee with Maya, Lunch, Workout…"
                    className="flex-1 bg-transparent text-sm text-text placeholder:text-text-muted focus:outline-none"
                  />
                  <span className="text-[10px] text-text-muted shrink-0">↵ to save</span>
                </div>
              )}

              {/* Empty state message */}
              {schedule.length === 0 && !composer && (
                <div
                  className="absolute inset-x-0 flex flex-col items-center justify-center pointer-events-none"
                  style={{
                    top: `${2 * HOUR_HEIGHT}px`,
                    height: `${2 * HOUR_HEIGHT}px`,
                  }}
                >
                  <p className="text-sm text-text-muted">No events scheduled</p>
                  <p className="text-xs text-text-muted mt-1">
                    Click any time slot to add a block, or drag a task from the sidebar
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Task sidebar — hidden when rendered inside the TodayShell two-pane
            layout (the page-level left pane handles tasks instead) */}
        {!hideSidebar && (
          <TaskSidebar
            todayTasks={filteredTodayTasks}
            overdueTasks={filteredOverdueTasks}
            isDragOverSidebar={isDragOverSidebar}
            onSidebarDragOver={handleSidebarDragOver}
            onSidebarDragLeave={handleSidebarDragLeave}
            onSidebarDrop={handleSidebarDrop}
          />
        )}
      </div>

      {/* Overflow warning */}
      {dayPlan?.overflow && dayPlan.overflow.length > 0 && (
        <div className="border-t border-warning/30 px-6 py-3">
          <p className="text-xs font-bold text-warning uppercase tracking-wide">
            Overflow
          </p>
          <p className="text-xs text-text-muted mt-1">
            {dayPlan.overflow.length} task(s) did not fit in the schedule.
          </p>
        </div>
      )}
    </div>
  );
}
