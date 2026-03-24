'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Id } from '@/lib/convex-api';
import { formatDate } from '@/lib/utils';
import { TaskForm } from '@/components/task-form';
import type { Doc } from '../../../../../convex/_generated/dataModel';

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
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
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

function shortDate(dateStr: string | undefined | null): string {
  if (!dateStr) return 'No date';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Bucket types ─────────────────────────────────────

type Task = Doc<'tasks'>;

interface TaskBucket {
  key: string;
  label: string;
  count: number;
  variant: 'danger' | 'default' | 'muted';
  tasks: Task[];
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

  for (const task of tasks) {
    const due = task.dueDate ?? null;
    if (!due) {
      later.push(task);
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

  const dayAfterLabel = weekdayName(dayAfter);

  const buckets: TaskBucket[] = [];
  if (overdue.length > 0) {
    buckets.push({ key: 'overdue', label: 'Overdue', count: overdue.length, variant: 'danger', tasks: overdue });
  }
  buckets.push({ key: 'today', label: 'Today', count: todayBucket.length, variant: 'default', tasks: todayBucket });
  buckets.push({ key: 'tomorrow', label: 'Tomorrow', count: tomorrowBucket.length, variant: 'muted', tasks: tomorrowBucket });
  buckets.push({ key: 'dayafter', label: dayAfterLabel, count: dayAfterBucket.length, variant: 'muted', tasks: dayAfterBucket });
  buckets.push({ key: 'next7d', label: 'Next 7d', count: nextSevenDays.length, variant: 'muted', tasks: nextSevenDays });
  buckets.push({ key: 'later', label: 'Later', count: later.length, variant: 'muted', tasks: later });

  return buckets;
}

// ── Quick Date Picker ────────────────────────────────

interface QuickDatePickerProps {
  currentDate: string | undefined;
  onSelect: (date: string | null) => void;
  onClose: () => void;
}

function QuickDatePicker({ currentDate, onSelect, onClose }: QuickDatePickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [customDate, setCustomDate] = useState(currentDate ?? '');

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const quickOptions = [
    { label: 'Today', date: todayISO() },
    { label: 'Tomorrow', date: tomorrowISO() },
    { label: 'Next Monday', date: nextMondayISO() },
    { label: 'Next Week', date: nextWeekISO() },
    { label: 'No Date', date: null },
  ];

  return (
    <div
      ref={ref}
      className="absolute z-50 top-full left-0 mt-1 w-52 border border-border bg-bg shadow-lg p-2 space-y-1"
    >
      {quickOptions.map((opt) => {
        const isActive = opt.date === (currentDate ?? null);
        return (
          <button
            key={opt.label}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(opt.date);
            }}
            className={`w-full text-left px-3 py-1.5 text-xs rounded transition-colors ${
              isActive
                ? 'bg-accent/10 text-accent font-medium'
                : 'text-text hover:bg-surface-hover'
            }`}
          >
            <span>{opt.label}</span>
            {opt.date && (
              <span className="float-right text-text-muted font-mono">
                {shortDate(opt.date)}
              </span>
            )}
          </button>
        );
      })}
      <div className="border-t border-border pt-2 mt-2">
        <label className="block text-xs text-text-muted mb-1 px-1">Custom date</label>
        <div className="flex gap-1">
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="flex-1 rounded border border-border bg-bg px-2 py-1 text-xs text-text focus:border-accent focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (customDate) onSelect(customDate);
            }}
            disabled={!customDate}
            className="rounded bg-text px-2 py-1 text-xs text-bg hover:bg-accent-hover disabled:opacity-40 transition-colors"
          >
            Set
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Task Card ────────────────────────────────────────

interface TaskCardProps {
  task: Task;
}

function TaskCard({ task }: TaskCardProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [completing, setCompleting] = useState(false);

  const completeTask = useMutation(api.tasks.complete);
  const updateTask = useMutation(api.tasks.update);

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
        // Setting to empty string to clear. The update handler checks undefined vs provided.
        // Since the schema allows optional string, we pass empty string to represent "cleared".
        // Actually, looking at the update mutation, it checks `!== undefined` to decide patching.
        // We need to pass dueDate to clear it. Convex patch with undefined won't unset the field,
        // but the update mutation sets `updates.dueDate = args.dueDate` when provided.
        // For "No Date", we send an empty string which effectively removes the date display.
        args.dueDate = '';
      }
      await updateTask(args);
    } catch (err) {
      console.error('Failed to update task date:', err);
    }
  }, [updateTask, task._id]);

  const dueDate = task.dueDate ?? null;

  return (
    <div className="group px-3 py-2.5 hover:bg-surface-hover transition-colors">
      <div className="flex items-start gap-2.5">
        {/* Checkbox circle */}
        <button
          type="button"
          onClick={handleComplete}
          disabled={completing}
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
            completing
              ? 'border-success bg-success/20'
              : 'border-text-muted/40 hover:border-accent hover:bg-accent/10'
          }`}
          aria-label={`Complete "${task.title}"`}
        >
          {completing && (
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-success">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text leading-tight truncate">{task.title}</p>

          {/* Date label - clickable */}
          <div className="relative mt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDatePickerOpen((prev) => !prev);
              }}
              className="text-[11px] font-mono text-text-muted hover:text-accent transition-colors"
            >
              {dueDate ? shortDate(dueDate) : 'No date'}
            </button>
            {datePickerOpen && (
              <QuickDatePicker
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

// ── Column ───────────────────────────────────────────

interface BucketColumnProps {
  bucket: TaskBucket;
}

function BucketColumn({ bucket }: BucketColumnProps) {
  const headerColor =
    bucket.variant === 'danger'
      ? 'text-danger border-danger/30'
      : bucket.variant === 'default'
        ? 'text-text border-text/20'
        : 'text-text-muted border-border';

  return (
    <div className="min-w-[220px] max-w-[280px] flex-1 flex flex-col border border-border">
      {/* Column header */}
      <div className={`px-3 py-2.5 border-b ${headerColor} bg-surface`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest">
            {bucket.label}
          </span>
          <span className="text-xs font-mono opacity-60">
            {bucket.count}
          </span>
        </div>
      </div>

      {/* Task cards */}
      <div className="flex-1 divide-y divide-border overflow-y-auto">
        {bucket.tasks.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-text-muted">No tasks</p>
          </div>
        ) : (
          bucket.tasks.map((task) => (
            <TaskCard key={task._id} task={task} />
          ))
        )}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────

export function TasksBucketed() {
  const tasks = useQuery(api.tasks.list, { status: 'todo' });

  if (!tasks) return <div className="text-text-muted">Loading...</div>;

  const buckets = bucketTasks(tasks);

  return (
    <div className="max-w-none space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text">
            Tasks{' '}
            <span className="text-text-muted font-normal">[ {tasks.length} ]</span>
          </h1>
        </div>
        <TaskForm />
      </div>

      {/* Column layout */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
          {buckets.map((bucket) => (
            <BucketColumn key={bucket.key} bucket={bucket} />
          ))}
        </div>
      </div>
    </div>
  );
}
