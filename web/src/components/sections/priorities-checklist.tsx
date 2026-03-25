'use client';

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

// ── PriorityRow sub-component ────────────────────────────
// Each row calls useQuery independently so conditional "skip" works.

function PriorityRow({
  config,
  taskId,
  done,
  onToggle,
}: {
  config: PriorityConfig;
  taskId: Id<'tasks'> | undefined;
  done: boolean;
  onToggle: () => void;
}) {
  const task = useQuery(api.tasks.get, taskId ? { id: taskId } : 'skip');

  const title = task?.title ?? (taskId ? 'Loading...' : 'Not assigned');
  const isLoading = taskId !== undefined && task === undefined;

  return (
    <div className="flex items-center gap-4 py-3 group">
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

      {/* Task title */}
      <span
        className={cn(
          'flex-1 text-sm transition-colors truncate',
          isLoading && 'animate-pulse text-text-muted',
          done ? 'line-through text-text-muted' : 'text-text',
          !taskId && 'text-text-muted italic',
        )}
      >
        {title}
      </span>

      {/* Done indicator */}
      {done && (
        <span className="text-xs font-mono text-success uppercase tracking-wide">
          Done
        </span>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────

export function PrioritiesChecklist() {
  const { date } = useTodayDate();
  const dayPlan = useQuery(api.dayPlans.getByDate, { date });
  const upsert = useMutation(api.dayPlans.upsert);

  // Also fetch today's tasks for the "more tasks" count
  const todayTasks = useQuery(api.tasks.list, { status: 'todo', due: 'today' });

  if (dayPlan === undefined) {
    return (
      <div className="border border-border">
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

  const completedCount = [
    dayPlan?.mitDone ?? false,
    dayPlan?.p1Done ?? false,
    dayPlan?.p2Done ?? false,
  ].filter(Boolean).length;

  // Count extra tasks beyond the 3 priorities
  const priorityIds = new Set(
    [dayPlan?.mitTaskId, dayPlan?.p1TaskId, dayPlan?.p2TaskId].filter(Boolean),
  );
  const extraTaskCount = todayTasks
    ? todayTasks.filter((t) => !priorityIds.has(t._id)).length
    : 0;

  return (
    <div className="border border-border">
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
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <p className="text-sm text-text-muted">No plan for this day</p>
          <p className="text-xs text-text-muted/60 mt-1">
            Create a day plan to set your priorities
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
