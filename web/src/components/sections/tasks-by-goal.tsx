'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Skeleton, SkeletonRow } from '@/components/ui/skeleton';

export function TasksByGoal() {
  const tasks = useQuery(api.tasks.list, { status: 'todo' });
  const goals = useQuery(api.goals.list, { status: 'active' });

  if (tasks === undefined || goals === undefined) {
    return (
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <div key={i} className="border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="px-2 py-2 space-y-1">
              <SkeletonRow />
              <SkeletonRow />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Build a map of goalId -> goal title
  const goalMap = new Map<string, string>();
  for (const goal of goals) {
    goalMap.set(goal._id, goal.title);
  }

  // Group tasks by goalId
  const grouped = new Map<string, typeof tasks>();
  const ungrouped: typeof tasks = [];

  for (const task of tasks) {
    if (task.goalId) {
      const key = task.goalId;
      const existing = grouped.get(key);
      if (existing) {
        existing.push(task);
      } else {
        grouped.set(key, [task]);
      }
    } else {
      ungrouped.push(task);
    }
  }

  // Build ordered sections: goals first, then ungrouped
  const sections: Array<{ key: string; label: string; tasks: typeof tasks }> = [];

  for (const goal of goals) {
    const goalTasks = grouped.get(goal._id);
    if (goalTasks && goalTasks.length > 0) {
      sections.push({ key: goal._id, label: goal.title, tasks: goalTasks });
    }
  }

  // Goals that have tasks but are not in the active goals list (edge case)
  for (const [goalId, goalTasks] of grouped) {
    if (!goalMap.has(goalId)) {
      sections.push({ key: goalId, label: 'Unknown Goal', tasks: goalTasks });
    }
  }

  if (ungrouped.length > 0) {
    sections.push({ key: '_ungrouped', label: 'Ungrouped', tasks: ungrouped });
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
          Tasks by Goal
        </span>
      </div>

      {sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-text-muted">No tasks</p>
          <p className="text-xs text-text-muted mt-1">Add tasks and link them to goals</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {sections.map((section) => (
            <div key={section.key}>
              {/* Section header */}
              <div className="flex items-center gap-4 px-6 py-3 bg-surface">
                <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
                  {section.label}
                </span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-mono text-text-muted">
                  {section.tasks.length}
                </span>
              </div>

              {/* Task rows */}
              <div className="divide-y divide-border">
                {section.tasks.map((task) => (
                  <Link
                    key={task._id}
                    href={`/tasks/${task._id}`}
                    className="group flex items-center gap-4 px-6 py-3 transition-colors hover:bg-surface-hover"
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-text-muted/40 group-hover:border-text transition-colors" />
                    <span className="flex-1 text-sm text-text truncate group-hover:text-accent transition-colors">
                      {task.title}
                    </span>
                    {task.dueDate && (
                      <span className="text-xs text-text-muted shrink-0 font-mono">
                        {formatDate(task.dueDate)}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
