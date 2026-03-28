'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Id, Doc } from '@/lib/convex-api';
import { TaskDetailModal } from '@/components/task-detail-modal';
import { HoverActionsMenu, type HoverAction } from '@/components/hover-actions-menu';
import { ContextMenu, type ContextMenuItem } from '@/components/context-menu';

// ── Date helpers ─────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function dayAfterTomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
}

function sevenDaysFromNowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function nextMondayISO(): string {
  const d = new Date();
  const day = d.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + daysUntilMonday);
  return d.toISOString().slice(0, 10);
}

function nextWeekISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function weekdayName(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function shortDate(dateStr: string | undefined | null): string {
  if (!dateStr) return 'No date';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function columnHeaderDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  return `${day} ${month}`;
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ── Bucket types ─────────────────────────────────────

type Task = Doc<'tasks'>;

interface TaskBucket {
  key: string;
  label: string;
  sublabel?: string;
  count: number;
  variant: 'danger' | 'default' | 'muted';
  tasks: Task[];
  defaultDate?: string;
}

function bucketTasks(tasks: Task[]): TaskBucket[] {
  const today = todayISO();
  const tomorrow = tomorrowISO();
  const dayAfter = dayAfterTomorrowISO();
  const sevenDays = sevenDaysFromNowISO();

  const overdue: Task[] = [];
  const todayBucket: Task[] = [];
  const tomorrowBucket: Task[] = [];
  const dayAfterBucket: Task[] = [];
  const nextSevenDays: Task[] = [];
  const later: Task[] = [];
  const noDate: Task[] = [];

  for (const task of tasks) {
    const due = task.dueDate ?? null;
    if (!due) {
      noDate.push(task);
    } else if (due < today) {
      overdue.push(task);
    } else if (due === today) {
      todayBucket.push(task);
    } else if (due === tomorrow) {
      tomorrowBucket.push(task);
    } else if (due === dayAfter) {
      dayAfterBucket.push(task);
    } else if (due <= sevenDays) {
      nextSevenDays.push(task);
    } else {
      later.push(task);
    }
  }

  const tomorrowDay = weekdayName(tomorrow);

  const buckets: TaskBucket[] = [];
  if (overdue.length > 0) {
    buckets.push({ key: 'overdue', label: 'Overdue', count: overdue.length, variant: 'danger', tasks: overdue, defaultDate: today });
  }
  buckets.push({
    key: 'today',
    label: `${columnHeaderDate(today)}`,
    sublabel: 'Today',
    count: todayBucket.length,
    variant: 'default',
    tasks: todayBucket,
    defaultDate: today,
  });
  buckets.push({
    key: 'tomorrow',
    label: `${columnHeaderDate(tomorrow)}`,
    sublabel: tomorrowDay,
    count: tomorrowBucket.length,
    variant: 'muted',
    tasks: tomorrowBucket,
    defaultDate: tomorrow,
  });
  if (dayAfterBucket.length > 0) {
    const dayAfterDay = weekdayName(dayAfter);
    buckets.push({
      key: 'dayafter',
      label: `${columnHeaderDate(dayAfter)}`,
      sublabel: dayAfterDay,
      count: dayAfterBucket.length,
      variant: 'muted',
      tasks: dayAfterBucket,
      defaultDate: dayAfter,
    });
  }
  if (nextSevenDays.length > 0) {
    buckets.push({ key: 'next7d', label: 'Next 7 days', count: nextSevenDays.length, variant: 'muted', tasks: nextSevenDays, defaultDate: sevenDays });
  }
  if (later.length > 0) {
    buckets.push({ key: 'later', label: 'Later', count: later.length, variant: 'muted', tasks: later });
  }
  buckets.push({ key: 'nodate', label: 'No date', count: noDate.length, variant: 'muted', tasks: noDate });

  return buckets;
}

// ── Calendar Date Picker ─────────────────────────────

interface CalendarDatePickerProps {
  currentDate: string | undefined;
  onSelect: (date: string | null) => void;
  onClose: () => void;
}

function CalendarDatePicker({ currentDate, onSelect, onClose }: CalendarDatePickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  const todayStr = todayISO();
  const todayDate = new Date(todayStr + 'T00:00:00');

  const [viewYear, setViewYear] = useState(() => {
    if (currentDate) {
      const d = new Date(currentDate + 'T00:00:00');
      return d.getFullYear();
    }
    return todayDate.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    if (currentDate) {
      const d = new Date(currentDate + 'T00:00:00');
      return d.getMonth();
    }
    return todayDate.getMonth();
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const goToToday = () => {
    setViewYear(todayDate.getFullYear());
    setViewMonth(todayDate.getMonth());
  };

  // Build calendar grid
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  // Monday = 0, Sunday = 6
  let startDow = firstDayOfMonth.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const calendarDays: Array<{ day: number; month: number; year: number; isCurrentMonth: boolean }> = [];

  // Previous month fill
  for (let i = startDow - 1; i >= 0; i--) {
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    calendarDays.push({ day: daysInPrevMonth - i, month: prevMonth, year: prevYear, isCurrentMonth: false });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({ day: d, month: viewMonth, year: viewYear, isCurrentMonth: true });
  }

  // Next month fill (to complete 6 rows max, or at least fill the last row)
  const remaining = 7 - (calendarDays.length % 7);
  if (remaining < 7) {
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    for (let d = 1; d <= remaining; d++) {
      calendarDays.push({ day: d, month: nextMonth, year: nextYear, isCurrentMonth: false });
    }
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const quickOptions = [
    { label: 'Today', date: todayISO(), icon: '☀' },
    { label: 'Tomorrow', date: tomorrowISO(), icon: '→' },
    { label: 'Next Monday', date: nextMondayISO(), icon: '📅' },
    { label: 'Next Week', date: nextWeekISO(), icon: '⏭' },
    { label: 'No Date', date: null, icon: '✕' },
  ];

  return (
    <div
      ref={ref}
      className="absolute z-50 top-full left-0 mt-1 w-[280px] border border-border bg-surface rounded-xl shadow-xl overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Month header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <button
          type="button"
          onClick={goToPrevMonth}
          className="p-1 rounded-md text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
          aria-label="Previous month"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text">{monthLabel}</span>
          <button
            type="button"
            onClick={goToToday}
            className="text-[10px] text-text-muted hover:text-accent px-1.5 py-0.5 rounded-md hover:bg-surface-hover transition-colors"
          >
            Today
          </button>
        </div>
        <button
          type="button"
          onClick={goToNextMonth}
          className="p-1 rounded-md text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
          aria-label="Next month"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 px-3 pb-1">
        {weekDays.map((wd) => (
          <div key={wd} className="text-center text-[10px] font-medium text-text-muted/50 py-1">
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 px-3 pb-2">
        {calendarDays.map((cd, idx) => {
          const dateStr = toISO(cd.year, cd.month, cd.day);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === currentDate;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelect(dateStr)}
              className={`
                h-8 w-full flex items-center justify-center text-[11px] rounded-lg transition-all duration-100
                ${!cd.isCurrentMonth ? 'text-text-muted/25' : ''}
                ${cd.isCurrentMonth && !isToday && !isSelected ? 'text-text hover:bg-surface-hover' : ''}
                ${isToday && !isSelected ? 'text-accent font-bold bg-accent/10' : ''}
                ${isSelected ? 'bg-accent text-bg font-bold' : ''}
              `}
            >
              {cd.day}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="border-t border-border/40" />

      {/* Quick options */}
      <div className="p-2 space-y-0.5">
        {quickOptions.map((opt) => {
          const isActive = opt.date === (currentDate ?? null);
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onSelect(opt.date)}
              className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-2 ${
                isActive
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-text hover:bg-surface-hover'
              }`}
            >
              <span className="text-[11px] w-4 text-center opacity-60">{opt.icon}</span>
              <span>{opt.label}</span>
              {opt.date && (
                <span className="ml-auto text-text-muted font-mono text-[10px]">
                  {shortDate(opt.date)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Clear button */}
      {currentDate && (
        <>
          <div className="border-t border-border/40" />
          <div className="p-2">
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="w-full text-center text-xs text-text-muted hover:text-danger py-1.5 rounded-lg hover:bg-surface-hover transition-colors"
            >
              Clear date
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Calendar Icon ───────────────────────────────────

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

// ── Task Card ────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  showDate?: boolean;
  bucketKey: string;
  isSelected?: boolean;
  onDragStart: (e: React.DragEvent, taskId: string, bucketKey: string) => void;
  onClick?: (e: React.MouseEvent) => void;
  onComplete?: () => Promise<void>;
  onDelete?: () => Promise<void>;
  onRescheduleToday?: () => Promise<void>;
  onRescheduleTomorrow?: () => Promise<void>;
  onRemoveDate?: () => Promise<void>;
}

function TaskCard({ task, showDate = true, bucketKey, isSelected = false, onDragStart, onClick, onComplete, onDelete, onRescheduleToday, onRescheduleTomorrow, onRemoveDate }: TaskCardProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const completeTask = useMutation(api.tasks.complete);
  const updateTask = useMutation(api.tasks.update);

  const handleSave = useCallback(async () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== task.title) {
      try {
        await updateTask({ id: task._id, title: trimmed });
      } catch (err) {
        console.error('Failed to update task title:', err);
      }
    }
    setEditing(false);
  }, [editTitle, task.title, task._id, updateTask]);

  const handleComplete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (completing) return;
    setCompleting(true);
    try {
      await completeTask({ id: task._id });
    } catch (err) {
      console.error('Failed to complete task:', err);
    } finally {
      setCompleting(false);
    }
  }, [completeTask, completing, task._id]);

  const handleDateSelect = useCallback(async (date: string | null) => {
    setDatePickerOpen(false);
    try {
      const args: { id: Id<'tasks'>; dueDate?: string } = { id: task._id };
      if (date !== null) {
        args.dueDate = date;
      } else {
        args.dueDate = '';
      }
      await updateTask(args);
    } catch (err) {
      console.error('Failed to update task date:', err);
    }
  }, [updateTask, task._id]);

  const dueDate = task.dueDate ?? null;
  const isOverdue = dueDate && dueDate < todayISO();

  const hoverActions: HoverAction[] = [
    {
      label: 'Edit',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      ),
      onClick: () => onClick?.({ stopPropagation: () => {}, preventDefault: () => {} } as React.MouseEvent),
    },
    {
      label: 'Complete',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
      onClick: () => {
        if (onComplete) void onComplete();
        else void handleComplete({ stopPropagation: () => {}, preventDefault: () => {} } as React.MouseEvent);
      },
    },
    {
      label: 'Set as MIT',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
      onClick: () => {
        // Future: assign as MIT via day plan upsert
      },
    },
    {
      label: 'Reschedule: Today',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      onClick: () => {
        if (onRescheduleToday) void onRescheduleToday();
        else void updateTask({ id: task._id, dueDate: todayISO() });
      },
    },
    {
      label: 'Reschedule: Tomorrow',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      ),
      onClick: () => {
        if (onRescheduleTomorrow) void onRescheduleTomorrow();
        else void updateTask({ id: task._id, dueDate: tomorrowISO() });
      },
    },
    {
      label: 'Remove date',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <line x1="9" y1="14" x2="15" y2="18" />
          <line x1="15" y1="14" x2="9" y2="18" />
        </svg>
      ),
      onClick: () => {
        if (onRemoveDate) void onRemoveDate();
        else void updateTask({ id: task._id, dueDate: '' });
      },
    },
    {
      label: 'Delete',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      ),
      variant: 'danger' as const,
      onClick: () => {
        if (onDelete) void onDelete();
      },
    },
  ];

  const contextMenuItems: ContextMenuItem[] = [
    {
      label: 'Edit',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      ),
      onClick: () => onClick?.({ stopPropagation: () => {}, preventDefault: () => {} } as React.MouseEvent),
    },
    {
      label: 'Complete',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
      onClick: () => {
        if (onComplete) void onComplete();
        else void handleComplete({ stopPropagation: () => {}, preventDefault: () => {} } as React.MouseEvent);
      },
    },
    {
      label: 'Reschedule: Today',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      onClick: () => {
        if (onRescheduleToday) void onRescheduleToday();
        else void updateTask({ id: task._id, dueDate: todayISO() });
      },
    },
    {
      label: 'Reschedule: Tomorrow',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      ),
      onClick: () => {
        if (onRescheduleTomorrow) void onRescheduleTomorrow();
        else void updateTask({ id: task._id, dueDate: tomorrowISO() });
      },
    },
    {
      label: 'Remove date',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <line x1="9" y1="14" x2="15" y2="18" />
          <line x1="15" y1="14" x2="9" y2="18" />
        </svg>
      ),
      onClick: () => {
        if (onRemoveDate) void onRemoveDate();
        else void updateTask({ id: task._id, dueDate: '' });
      },
    },
    {
      label: 'Delete',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      ),
      variant: 'danger' as const,
      divider: true,
      onClick: () => {
        if (onDelete) void onDelete();
      },
    },
  ];

  return (
    <ContextMenu items={contextMenuItems}>
      <div
        draggable
        onDragStart={(e) => onDragStart(e, task._id, bucketKey)}
        onClick={onClick}
        className={`group relative rounded-xl border transition-all duration-150 cursor-grab active:cursor-grabbing ${
          isSelected
            ? 'border-accent/40 bg-surface ring-2 ring-accent/40'
            : editing
              ? 'border-accent/30 bg-surface ring-2 ring-accent/20'
              : 'border-border bg-surface hover:border-text-muted/30'
        }`}
      >
        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute top-2 left-2 h-4 w-4 rounded bg-accent flex items-center justify-center z-10">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
        )}

        {/* Hover actions menu */}
        <div className="absolute top-2 right-2 z-10">
          <HoverActionsMenu actions={hoverActions} />
        </div>

        <div className="px-3.5 py-3 flex items-start gap-3">
          {/* Checkbox circle */}
          <button
            type="button"
            onClick={handleComplete}
            disabled={completing}
            className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all duration-150 ${
              completing
                ? 'border-success bg-success/20'
                : isOverdue
                  ? 'border-danger/60 hover:border-danger hover:bg-danger/10'
                  : 'border-text-muted/30 hover:border-accent hover:bg-accent/10'
            }`}
            aria-label={`Complete "${task.title}"`}
          >
            {completing && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-success">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0 pr-6">
            {editing ? (
              <input
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => void handleSave()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSave();
                  if (e.key === 'Escape') { setEditing(false); setEditTitle(task.title); }
                }}
                className="w-full bg-transparent text-[13px] text-text focus:outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <p
                className="text-[13px] text-text leading-snug cursor-text"
                onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); setEditTitle(task.title); }}
              >
                {task.title}
              </p>
            )}
            {task.notes && (
              <p className="text-[11px] text-text-muted mt-0.5 truncate leading-snug">{task.notes}</p>
            )}

            {/* Date badge - clickable */}
            {showDate && (
              <div className="relative mt-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDatePickerOpen((prev) => !prev);
                  }}
                  className={`inline-flex items-center gap-1 text-[11px] transition-colors rounded-md px-1 py-0.5 -ml-1 ${
                    isOverdue
                      ? 'text-danger hover:bg-danger/10'
                      : 'text-text-muted hover:text-accent hover:bg-surface-hover'
                  }`}
                >
                  <CalendarIcon className={isOverdue ? 'text-danger' : 'opacity-50'} />
                  {dueDate ? formatDateLabel(dueDate) : 'No date'}
                </button>
                {datePickerOpen && (
                  <CalendarDatePicker
                    currentDate={dueDate ?? undefined}
                    onSelect={handleDateSelect}
                    onClose={() => setDatePickerOpen(false)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ContextMenu>
  );
}

// ── Inline Add Task ─────────────────────────────────

function InlineAddTask({ defaultDate, onDone }: { defaultDate?: string; onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(defaultDate ?? todayISO());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const createTask = useMutation(api.tasks.create);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const args: { title: string; dueDate?: string } = { title: title.trim() };
      if (dueDate) args.dueDate = dueDate;
      await createTask(args);
      setTitle('');
      setDueDate(defaultDate ?? todayISO());
      // Keep open for rapid entry
      inputRef.current?.focus();
      onDone?.();
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
    if (e.key === 'Escape') {
      setOpen(false);
      setTitle('');
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3.5 py-2.5 w-full text-text-muted hover:text-accent transition-colors group/add"
      >
        <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border-[1.5px] border-dashed border-text-muted/30 group-hover/add:border-accent/50 transition-colors">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
        <span className="text-[13px]">Add task</span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-accent/40 bg-surface p-3 mx-0">
      <input
        ref={inputRef}
        type="text"
        placeholder="Task name"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full bg-transparent text-[13px] text-text placeholder:text-text-muted/50 focus:outline-none"
      />
      <div className="flex items-center justify-between mt-2.5">
        <div className="relative">
          <button
            type="button"
            onClick={() => setDatePickerOpen((prev) => !prev)}
            className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-accent transition-colors rounded-md px-1.5 py-1 hover:bg-surface-hover"
          >
            <CalendarIcon className="opacity-50" />
            {dueDate ? shortDate(dueDate) : 'Today'}
          </button>
          {datePickerOpen && (
            <CalendarDatePicker
              currentDate={dueDate || undefined}
              onSelect={(date) => {
                setDueDate(date ?? '');
                setDatePickerOpen(false);
              }}
              onClose={() => setDatePickerOpen(false)}
            />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => { setOpen(false); setTitle(''); }}
            className="text-[11px] text-text-muted hover:text-text px-2 py-1 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!title.trim() || saving}
            className="text-[11px] font-medium bg-accent text-bg px-3 py-1 rounded-lg hover:bg-accent-hover disabled:opacity-30 transition-colors"
          >
            {saving ? '...' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Column ───────────────────────────────────────────

interface BucketColumnProps {
  bucket: TaskBucket;
  dragOverKey: string | null;
  selectedIds: Set<string>;
  onDragStart: (e: React.DragEvent, taskId: string, bucketKey: string) => void;
  onDragOver: (e: React.DragEvent, bucketKey: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, bucket: TaskBucket) => void;
  onReorder: (taskId: Id<'tasks'>, targetIndex: number, bucket: TaskBucket) => void;
  onTaskClick: (taskId: Id<'tasks'>, e: React.MouseEvent) => void;
  onTaskComplete: (taskId: Id<'tasks'>) => Promise<void>;
  onTaskDelete: (taskId: Id<'tasks'>) => Promise<void>;
  onTaskReschedule: (taskId: Id<'tasks'>, date: string) => Promise<void>;
  onTaskRemoveDate: (taskId: Id<'tasks'>) => Promise<void>;
}

function BucketColumn({ bucket, dragOverKey, selectedIds, onDragStart, onDragOver, onDragLeave, onDrop, onReorder, onTaskClick, onTaskComplete, onTaskDelete, onTaskReschedule, onTaskRemoveDate }: BucketColumnProps) {
  const isDragOver = dragOverKey === bucket.key;
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleTaskDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceBucket = e.dataTransfer.types.includes('application/x-source-bucket');
    if (sourceBucket) {
      setDragOverIndex(index);
    }
  }, []);

  const handleTaskDrop = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);

    const sourceBucket = e.dataTransfer.getData('application/x-source-bucket');
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    if (sourceBucket === bucket.key) {
      // Same-column reorder
      onReorder(taskId as Id<'tasks'>, index, bucket);
    } else {
      // Cross-column move -- delegate to parent
      onDrop(e, bucket);
    }
  }, [bucket, onReorder, onDrop]);

  const handleColumnDragLeave = useCallback((e: React.DragEvent) => {
    const relatedTarget = e.relatedTarget as Node | null;
    if (e.currentTarget instanceof HTMLElement && relatedTarget && e.currentTarget.contains(relatedTarget)) {
      return;
    }
    setDragOverIndex(null);
    onDragLeave(e);
  }, [onDragLeave]);

  const handleEndZoneDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(bucket.tasks.length);
  }, [bucket.tasks.length]);

  const handleEndZoneDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);

    const sourceBucket = e.dataTransfer.getData('application/x-source-bucket');
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    if (sourceBucket === bucket.key) {
      onReorder(taskId as Id<'tasks'>, bucket.tasks.length, bucket);
    } else {
      onDrop(e, bucket);
    }
  }, [bucket, onReorder, onDrop]);

  return (
    <div
      className={`min-w-[260px] max-w-[320px] flex-1 flex flex-col rounded-xl transition-all duration-150 ${
        isDragOver ? 'bg-accent/5 ring-2 ring-accent/30 ring-inset' : ''
      }`}
      onDragOver={(e) => onDragOver(e, bucket.key)}
      onDragLeave={handleColumnDragLeave}
      onDrop={(e) => onDrop(e, bucket)}
    >
      {/* Column header */}
      <div className="px-2 pb-3 pt-1 flex items-baseline gap-2">
        <span className={`text-sm font-semibold ${
          bucket.variant === 'danger' ? 'text-danger' : 'text-text'
        }`}>
          {bucket.sublabel && (
            <>
              <span className="text-text-muted">{bucket.label}</span>
              <span className="mx-1.5 text-text-muted/30">&middot;</span>
            </>
          )}
          {bucket.sublabel ?? bucket.label}
        </span>
        <span className="text-xs text-text-muted/50 font-medium tabular-nums">
          {bucket.count}
        </span>
        {bucket.variant === 'danger' && bucket.count > 0 && (
          <span className="text-[11px] text-danger/70 font-medium ml-auto cursor-default">
            Reschedule
          </span>
        )}
      </div>

      {/* Task cards */}
      <div className="flex flex-col gap-2 px-1">
        {bucket.tasks.map((task, index) => (
          <div
            key={task._id}
            onDragOver={(e) => handleTaskDragOver(e, index)}
            onDrop={(e) => handleTaskDrop(e, index)}
          >
            {/* Drop indicator line */}
            {dragOverIndex === index && (
              <div className="h-[2px] bg-accent rounded-full mx-2 mb-2 transition-all" />
            )}
            <TaskCard
              task={task}
              showDate={bucket.key === 'nodate' || bucket.key === 'overdue' || bucket.key === 'later' || bucket.key === 'next7d'}
              bucketKey={bucket.key}
              isSelected={selectedIds.has(task._id)}
              onDragStart={onDragStart}
              onClick={(e) => onTaskClick(task._id, e)}
              onComplete={() => onTaskComplete(task._id)}
              onDelete={() => onTaskDelete(task._id)}
              onRescheduleToday={() => onTaskReschedule(task._id, todayISO())}
              onRescheduleTomorrow={() => onTaskReschedule(task._id, tomorrowISO())}
              onRemoveDate={() => onTaskRemoveDate(task._id)}
            />
          </div>
        ))}
        {/* End-of-column drop zone */}
        <div
          onDragOver={handleEndZoneDragOver}
          onDrop={handleEndZoneDrop}
          className="min-h-[8px]"
        >
          {dragOverIndex === bucket.tasks.length && bucket.tasks.length > 0 && (
            <div className="h-[2px] bg-accent rounded-full mx-2 mb-1 transition-all" />
          )}
        </div>
      </div>

      {/* Drop indicator when empty and dragging over */}
      {isDragOver && bucket.tasks.length === 0 && (
        <div className="mx-1 h-12 rounded-xl border-2 border-dashed border-accent/30 flex items-center justify-center">
          <span className="text-[11px] text-accent/50">Drop here</span>
        </div>
      )}

      {/* Inline add task */}
      <div className="mt-1 px-1">
        <InlineAddTask defaultDate={bucket.defaultDate} />
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────

export function TasksBucketed() {
  const tasks = useQuery(api.tasks.list, { status: 'todo' });
  const updateTask = useMutation(api.tasks.update);
  const completeTaskMut = useMutation(api.tasks.complete);
  const removeTaskMut = useMutation(api.tasks.remove);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<Id<'tasks'> | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastSelectedIdRef = useRef<string | null>(null);
  const dragTaskIdRef = useRef<string | null>(null);

  // Build a flat ordered list of task IDs for shift-select range
  const allTaskIds = tasks ? tasks.map((t) => t._id as string) : [];

  // Clear selection on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && selectedIds.size > 0) {
        setSelectedIds(new Set());
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds.size]);

  const handleTaskClick = useCallback((taskId: Id<'tasks'>, e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      // Toggle individual selection
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(taskId)) {
          next.delete(taskId);
        } else {
          next.add(taskId);
        }
        return next;
      });
      lastSelectedIdRef.current = taskId;
    } else if (e.shiftKey && lastSelectedIdRef.current) {
      // Range select
      const startIdx = allTaskIds.indexOf(lastSelectedIdRef.current);
      const endIdx = allTaskIds.indexOf(taskId);
      if (startIdx !== -1 && endIdx !== -1) {
        const from = Math.min(startIdx, endIdx);
        const to = Math.max(startIdx, endIdx);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          for (let i = from; i <= to; i++) {
            next.add(allTaskIds[i]);
          }
          return next;
        });
      }
    } else if (selectedIds.size > 0) {
      // If already in selection mode, toggle
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(taskId)) {
          next.delete(taskId);
        } else {
          next.add(taskId);
        }
        return next;
      });
      lastSelectedIdRef.current = taskId;
    } else {
      // Normal click - open detail modal
      setSelectedTaskId(taskId);
    }
  }, [allTaskIds, selectedIds.size]);

  // ── Bulk action handlers ──────────────────────────

  const handleBulkComplete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    setSelectedIds(new Set());
    for (const id of ids) {
      try {
        await completeTaskMut({ id: id as Id<'tasks'> });
      } catch (err) {
        console.error('Failed to complete task:', err);
      }
    }
  }, [selectedIds, completeTaskMut]);

  const handleBulkRescheduleToday = useCallback(async () => {
    const ids = Array.from(selectedIds);
    const today = todayISO();
    setSelectedIds(new Set());
    for (const id of ids) {
      try {
        await updateTask({ id: id as Id<'tasks'>, dueDate: today });
      } catch (err) {
        console.error('Failed to reschedule task:', err);
      }
    }
  }, [selectedIds, updateTask]);

  const handleBulkRescheduleTomorrow = useCallback(async () => {
    const ids = Array.from(selectedIds);
    const tomorrow = tomorrowISO();
    setSelectedIds(new Set());
    for (const id of ids) {
      try {
        await updateTask({ id: id as Id<'tasks'>, dueDate: tomorrow });
      } catch (err) {
        console.error('Failed to reschedule task:', err);
      }
    }
  }, [selectedIds, updateTask]);

  const handleBulkRemoveDate = useCallback(async () => {
    const ids = Array.from(selectedIds);
    setSelectedIds(new Set());
    for (const id of ids) {
      try {
        await updateTask({ id: id as Id<'tasks'>, dueDate: '' });
      } catch (err) {
        console.error('Failed to remove task date:', err);
      }
    }
  }, [selectedIds, updateTask]);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    setSelectedIds(new Set());
    for (const id of ids) {
      try {
        await removeTaskMut({ id: id as Id<'tasks'> });
      } catch (err) {
        console.error('Failed to delete task:', err);
      }
    }
  }, [selectedIds, removeTaskMut]);

  const handleTaskComplete = useCallback(async (taskId: Id<'tasks'>) => {
    try {
      await completeTaskMut({ id: taskId });
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  }, [completeTaskMut]);

  const handleTaskDelete = useCallback(async (taskId: Id<'tasks'>) => {
    try {
      await removeTaskMut({ id: taskId });
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }, [removeTaskMut]);

  const handleTaskReschedule = useCallback(async (taskId: Id<'tasks'>, date: string) => {
    try {
      await updateTask({ id: taskId, dueDate: date });
    } catch (err) {
      console.error('Failed to reschedule task:', err);
    }
  }, [updateTask]);

  const handleTaskRemoveDate = useCallback(async (taskId: Id<'tasks'>) => {
    try {
      await updateTask({ id: taskId, dueDate: '' });
    } catch (err) {
      console.error('Failed to remove task date:', err);
    }
  }, [updateTask]);

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string, bucketKey: string) => {
    dragTaskIdRef.current = taskId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.setData('application/x-source-bucket', bucketKey);
    // Make the drag image slightly transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
      requestAnimationFrame(() => {
        if (e.currentTarget instanceof HTMLElement) {
          e.currentTarget.style.opacity = '1';
        }
      });
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, bucketKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverKey(bucketKey);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if we are leaving the column entirely (not entering a child)
    const relatedTarget = e.relatedTarget as Node | null;
    if (e.currentTarget instanceof HTMLElement && relatedTarget && e.currentTarget.contains(relatedTarget)) {
      return;
    }
    setDragOverKey(null);
  }, []);

  const handleReorder = useCallback(async (taskId: Id<'tasks'>, targetIndex: number, bucket: TaskBucket) => {
    const tasks = bucket.tasks;
    // Find the current index of the dragged task
    const currentIndex = tasks.findIndex((t) => t._id === taskId);
    if (currentIndex === -1 || currentIndex === targetIndex) return;

    // Adjust target index if dragging downward (since removing the item shifts indices)
    const adjustedIndex = targetIndex > currentIndex ? targetIndex - 1 : targetIndex;
    if (adjustedIndex === currentIndex) return;

    // Calculate new position value
    let newPosition: number;
    // Build the list without the dragged task to determine neighbors
    const withoutDragged = tasks.filter((t) => t._id !== taskId);

    if (withoutDragged.length === 0) {
      // Only task in column
      return;
    } else if (adjustedIndex === 0) {
      // Dropping at the top
      const firstPos = withoutDragged[0].position ?? 0;
      newPosition = firstPos - 1;
    } else if (adjustedIndex >= withoutDragged.length) {
      // Dropping at the end
      const lastPos = withoutDragged[withoutDragged.length - 1].position ?? 0;
      newPosition = lastPos + 1;
    } else {
      // Dropping between two tasks
      const prevPos = withoutDragged[adjustedIndex - 1].position ?? 0;
      const nextPos = withoutDragged[adjustedIndex].position ?? 0;
      newPosition = (prevPos + nextPos) / 2;
    }

    try {
      await updateTask({ id: taskId, position: newPosition });
    } catch (err) {
      console.error('Failed to reorder task:', err);
    }
  }, [updateTask]);

  const handleDrop = useCallback(async (e: React.DragEvent, bucket: TaskBucket) => {
    e.preventDefault();
    setDragOverKey(null);

    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    // If same-column drop, it's handled by BucketColumn's handleTaskDrop
    const sourceBucket = e.dataTransfer.getData('application/x-source-bucket');
    if (sourceBucket === bucket.key) return;

    // Determine the new due date based on the bucket
    let newDueDate: string;
    if (bucket.key === 'nodate') {
      newDueDate = '';
    } else if (bucket.defaultDate) {
      newDueDate = bucket.defaultDate;
    } else {
      // "later" bucket has no defaultDate -- don't change
      return;
    }

    try {
      await updateTask({ id: taskId as Id<'tasks'>, dueDate: newDueDate });
    } catch (err) {
      console.error('Failed to move task:', err);
    }
  }, [updateTask]);

  if (!tasks) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-surface animate-pulse" />
        ))}
      </div>
    );
  }

  const buckets = bucketTasks(tasks);

  return (
    <div className="max-w-none space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-text">
          Tasks
        </h1>
        <span className="text-sm text-text-muted tabular-nums">{tasks.length} tasks</span>
      </div>

      {/* Column layout */}
      <div className="overflow-x-auto pb-4 -mx-2 px-2">
        <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
          {buckets.map((bucket) => (
            <BucketColumn
              key={bucket.key}
              bucket={bucket}
              dragOverKey={dragOverKey}
              selectedIds={selectedIds}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onReorder={handleReorder}
              onTaskClick={handleTaskClick}
              onTaskComplete={handleTaskComplete}
              onTaskDelete={handleTaskDelete}
              onTaskReschedule={handleTaskReschedule}
              onTaskRemoveDate={handleTaskRemoveDate}
            />
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-surface border border-border rounded-xl shadow-2xl px-5 py-3">
          <span className="text-sm text-text font-medium">{selectedIds.size} selected</span>
          <div className="h-4 w-px bg-border" />
          <button onClick={() => void handleBulkComplete()} className="text-sm text-text-muted hover:text-success transition-colors">Complete</button>
          <button onClick={() => void handleBulkRescheduleToday()} className="text-sm text-text-muted hover:text-accent transition-colors">&rarr; Today</button>
          <button onClick={() => void handleBulkRescheduleTomorrow()} className="text-sm text-text-muted hover:text-accent transition-colors">&rarr; Tomorrow</button>
          <button onClick={() => void handleBulkRemoveDate()} className="text-sm text-text-muted hover:text-warning transition-colors">Remove date</button>
          <button onClick={() => void handleBulkDelete()} className="text-sm text-text-muted hover:text-danger transition-colors">Delete</button>
          <div className="h-4 w-px bg-border" />
          <button onClick={() => setSelectedIds(new Set())} className="text-sm text-text-muted hover:text-text transition-colors">Clear</button>
        </div>
      )}

      {/* Task detail modal */}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
}
