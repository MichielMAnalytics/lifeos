'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Id } from '@/lib/convex-api';
import { useTodayDate } from '@/lib/today-date-context';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// ── Types ────────────────────────────────────────────────

type PriorityKey = 'mit' | 'p1' | 'p2';

interface PriorityConfig {
  key: PriorityKey;
  label: string;
  colorClass: string;
  checkClass: string;
  doneField: 'mitDone' | 'p1Done' | 'p2Done';
  taskIdField: 'mitTaskId' | 'p1TaskId' | 'p2TaskId';
}

const PRIORITIES: PriorityConfig[] = [
  {
    key: 'mit',
    label: 'MIT',
    colorClass: 'text-accent',
    checkClass: 'border-accent bg-accent',
    doneField: 'mitDone',
    taskIdField: 'mitTaskId',
  },
  {
    key: 'p1',
    label: 'P1',
    colorClass: 'text-purple-500',
    checkClass: 'border-purple-500 bg-purple-500',
    doneField: 'p1Done',
    taskIdField: 'p1TaskId',
  },
  {
    key: 'p2',
    label: 'P2',
    colorClass: 'text-indigo-500',
    checkClass: 'border-indigo-500 bg-indigo-500',
    doneField: 'p2Done',
    taskIdField: 'p2TaskId',
  },
];

// ── Date helpers ─────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
function sevenDaysISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

// ── Grouped task type ────────────────────────────────────

interface TaskItem {
  _id: Id<'tasks'>;
  title: string;
  dueDate?: string;
}

interface TaskGroup {
  key: string;
  label: string;
  headerClass?: string;
  tasks: TaskItem[];
}

function groupTasks(tasks: TaskItem[]): TaskGroup[] {
  const today = todayISO();
  const tomorrow = tomorrowISO();
  const weekEnd = sevenDaysISO();

  const groups: Record<string, TaskItem[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    thisWeek: [],
    later: [],
    noDate: [],
  };

  for (const task of tasks) {
    const due = task.dueDate;
    if (!due) {
      groups.noDate.push(task);
    } else if (due < today) {
      groups.overdue.push(task);
    } else if (due === today) {
      groups.today.push(task);
    } else if (due === tomorrow) {
      groups.tomorrow.push(task);
    } else if (due <= weekEnd) {
      groups.thisWeek.push(task);
    } else {
      groups.later.push(task);
    }
  }

  const result: TaskGroup[] = [];

  if (groups.overdue.length > 0) {
    result.push({ key: 'overdue', label: 'Overdue', headerClass: 'text-danger/60', tasks: groups.overdue });
  }
  if (groups.today.length > 0) {
    result.push({ key: 'today', label: 'Today', tasks: groups.today });
  }
  if (groups.tomorrow.length > 0) {
    result.push({ key: 'tomorrow', label: 'Tomorrow', tasks: groups.tomorrow });
  }
  if (groups.thisWeek.length > 0) {
    result.push({ key: 'thisWeek', label: 'This Week', tasks: groups.thisWeek });
  }
  if (groups.later.length > 0) {
    result.push({ key: 'later', label: 'Later', tasks: groups.later });
  }
  if (groups.noDate.length > 0) {
    result.push({ key: 'noDate', label: 'No date', tasks: groups.noDate });
  }

  return result;
}

function formatDueDate(dueDate?: string): string | null {
  if (!dueDate) return null;
  const today = todayISO();
  const tomorrow = tomorrowISO();
  if (dueDate === today) return 'Today';
  if (dueDate === tomorrow) return 'Tomorrow';
  // Show short date like "Mar 28"
  const d = new Date(dueDate + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── TaskPickerDropdown ──────────────────────────────────

function TaskPickerDropdown({
  tasks,
  onSelect,
  onClose,
}: {
  tasks: TaskItem[];
  onSelect: (taskId: Id<'tasks'>) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const groups = useMemo(() => groupTasks(tasks), [tasks]);

  if (tasks.length === 0) {
    return (
      <div
        ref={ref}
        className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border border-border bg-surface shadow-lg p-3"
      >
        <p className="text-xs text-text-muted">No tasks available</p>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border border-border bg-surface shadow-lg max-h-72 overflow-y-auto"
    >
      {groups.map((group) => (
        <div key={group.key}>
          <div
            className={cn(
              'text-[10px] font-semibold uppercase tracking-widest px-3 pt-3 pb-1',
              group.headerClass ?? 'text-text-muted/50',
            )}
          >
            {group.label}
          </div>
          {group.tasks.map((task) => {
            const dueDateLabel = formatDueDate(task.dueDate);
            return (
              <button
                key={task._id}
                onClick={() => onSelect(task._id)}
                className="w-full text-left px-3 py-2 text-sm text-text hover:bg-surface-hover transition-colors flex items-center justify-between gap-2"
              >
                <span className="truncate">{task.title}</span>
                {dueDateLabel && (
                  <span className="text-[10px] text-text-muted/50 shrink-0">
                    {dueDateLabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── PriorityRow sub-component ────────────────────────────
// Each row calls useQuery independently so conditional "skip" works.

function PriorityRow({
  config,
  taskId,
  done,
  onToggle,
  allTasks,
  assignedIds,
  onAssign,
}: {
  config: PriorityConfig;
  taskId: Id<'tasks'> | undefined;
  done: boolean;
  onToggle: () => void;
  allTasks: TaskItem[] | undefined;
  assignedIds: Set<string>;
  onAssign: (taskId: Id<'tasks'>) => void;
}) {
  const task = useQuery(api.tasks.get, taskId ? { id: taskId } : 'skip');
  const [pickerOpen, setPickerOpen] = useState(false);

  const title = task?.title ?? (taskId ? 'Loading...' : 'Not assigned');
  const isLoading = taskId !== undefined && task === undefined;

  // Filter out tasks already assigned to other priority slots
  const availableTasks = allTasks?.filter((t) => !assignedIds.has(t._id)) ?? [];

  return (
    <div className="relative flex items-center gap-4 py-3 group">
      {/* Checkbox */}
      <button
        onClick={onToggle}
        disabled={!taskId}
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
          done
            ? config.checkClass + ' text-white'
            : 'border-text-muted/40 hover:border-text',
          !taskId && 'opacity-40 cursor-not-allowed',
        )}
        aria-label={`Toggle ${config.label}`}
      >
        {done && (
          <svg
            width="14"
            height="14"
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

      {/* Label badge */}
      <span
        className={cn(
          'text-xs font-bold uppercase tracking-widest shrink-0 w-8',
          config.colorClass,
        )}
      >
        {config.label}
      </span>

      {/* Task title - clickable to reassign */}
      <button
        onClick={() => setPickerOpen((v) => !v)}
        className={cn(
          'flex-1 text-left text-sm transition-colors truncate',
          isLoading && 'animate-pulse text-text-muted',
          taskId
            ? (done ? 'line-through text-text-muted' : 'text-text hover:text-accent')
            : 'text-text-muted italic',
        )}
      >
        {title}
      </button>

      {/* Change indicator */}
      {taskId && !done && (
        <button
          onClick={() => setPickerOpen((v) => !v)}
          className="opacity-0 group-hover:opacity-100 flex h-5 w-5 items-center justify-center rounded-md text-text-muted hover:text-accent hover:bg-surface-hover transition-all"
          aria-label={`Change ${config.label} task`}
          title="Change task"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      )}

      {/* Done indicator */}
      {done && (
        <span className="text-xs text-success font-medium uppercase tracking-wide">
          Done
        </span>
      )}

      {/* Task picker dropdown */}
      {pickerOpen && (
        <TaskPickerDropdown
          tasks={availableTasks}
          onSelect={(id) => {
            onAssign(id);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────

export function PrioritiesChecklist() {
  const { date } = useTodayDate();
  const dayPlan = useQuery(api.dayPlans.getByDate, { date });
  const upsert = useMutation(api.dayPlans.upsert);

  // Fetch today's tasks for the "more tasks" count
  const todayTasks = useQuery(api.tasks.list, { status: 'todo', due: 'today' });

  // Fetch ALL todo tasks for the task picker dropdown
  const allTasks = useQuery(api.tasks.list, { status: 'todo' });

  if (dayPlan === undefined) {
    return (
      <div className="rounded-xl border border-border">
        <div className="px-6 py-4 border-b border-border">
          <div className="animate-pulse h-4 w-32 bg-surface rounded" />
        </div>
        <div className="p-6 space-y-4">
          <div className="animate-pulse h-6 bg-surface rounded" />
          <div className="animate-pulse h-6 bg-surface rounded" />
          <div className="animate-pulse h-6 bg-surface rounded" />
        </div>
      </div>
    );
  }

  const handleToggle = (field: 'mitDone' | 'p1Done' | 'p2Done', currentValue: boolean) => {
    void upsert({ date, [field]: !currentValue });
  };

  const handleAssign = (taskIdField: 'mitTaskId' | 'p1TaskId' | 'p2TaskId', taskId: Id<'tasks'>) => {
    void upsert({ date, [taskIdField]: taskId });
  };

  const completedCount = [
    dayPlan?.mitDone ?? false,
    dayPlan?.p1Done ?? false,
    dayPlan?.p2Done ?? false,
  ].filter(Boolean).length;

  // Collect IDs already assigned to priority slots
  const assignedIds = new Set(
    [dayPlan?.mitTaskId, dayPlan?.p1TaskId, dayPlan?.p2TaskId].filter(Boolean) as string[],
  );

  // Count extra tasks beyond the 3 priorities (today's tasks only)
  const extraTaskCount = todayTasks
    ? todayTasks.filter((t) => !assignedIds.has(t._id)).length
    : 0;

  return (
    <div className="rounded-xl border border-border">
      <div className="flex items-baseline justify-between px-6 py-4 border-b border-border">
        <h2 className="text-sm font-bold text-text uppercase tracking-wide">
          Priorities
        </h2>
        <span className="text-xs text-text-muted">
          {completedCount}/3 complete
        </span>
      </div>

      {dayPlan ? (
        <div className="px-6 py-2 divide-y divide-border/50">
          {PRIORITIES.map((config) => (
            <PriorityRow
              key={config.key}
              config={config}
              taskId={dayPlan[config.taskIdField] ?? undefined}
              done={dayPlan[config.doneField]}
              onToggle={() =>
                handleToggle(config.doneField, dayPlan[config.doneField])
              }
              allTasks={allTasks}
              assignedIds={assignedIds}
              onAssign={(taskId) => handleAssign(config.taskIdField, taskId)}
            />
          ))}
        </div>
      ) : (
        <div className="px-6 py-2">
          {/* Ghost priority rows */}
          <div className="divide-y divide-border/30">
            {[
              { label: 'MIT', colorClass: 'text-accent/40', placeholder: 'Set your most important task' },
              { label: 'P1', colorClass: 'text-purple-500/40', placeholder: 'Set your second priority' },
              { label: 'P2', colorClass: 'text-indigo-500/40', placeholder: 'Set your third priority' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4 py-3 opacity-40">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-text-muted/40" />
                <span className={cn('text-xs font-bold uppercase tracking-widest shrink-0 w-8', item.colorClass)}>
                  {item.label}
                </span>
                <span className="flex-1 text-sm text-text-muted italic truncate">
                  {item.placeholder}
                </span>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-text-muted/70 mt-4 mb-2">
            Set your priorities to start your day
          </p>
        </div>
      )}

      {/* Extra tasks link */}
      {extraTaskCount > 0 && (
        <div className="px-6 py-3 border-t border-border">
          <Link
            href="/tasks"
            className="text-xs text-text-muted hover:text-accent transition-colors"
          >
            and {extraTaskCount} more task{extraTaskCount !== 1 ? 's' : ''} due
            today &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
