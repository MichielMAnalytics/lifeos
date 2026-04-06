'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import Link from 'next/link';

export function GoalsOkr() {
  const goals = useQuery(api.goals.list, { status: 'active' });
  const todoTasks = useQuery(api.tasks.list, { status: 'todo' });
  const doneTasks = useQuery(api.tasks.list, { status: 'done' });

  if (goals === undefined || todoTasks === undefined || doneTasks === undefined) {
    return <div className="animate-pulse h-48 bg-surface rounded-lg" />;
  }

  // Combine all tasks for counting
  const allTasks = [...todoTasks, ...doneTasks];

  // Group tasks by goalId
  const tasksByGoal = new Map<string, { total: number; done: number; tasks: typeof allTasks }>();

  for (const task of allTasks) {
    if (!task.goalId) continue;
    const key = task.goalId;
    const existing = tasksByGoal.get(key);
    if (existing) {
      existing.total += 1;
      if (task.status === 'done') existing.done += 1;
      existing.tasks.push(task);
    } else {
      tasksByGoal.set(key, {
        total: 1,
        done: task.status === 'done' ? 1 : 0,
        tasks: [task],
      });
    }
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
          OKR View
        </span>
      </div>

      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-text-muted">No active goals</p>
          <p className="text-xs text-text-muted mt-1">Create goals and link tasks to see OKRs</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {goals.map((goal, gIdx: number) => {
            const stats = tasksByGoal.get(goal._id);
            const total = stats?.total ?? 0;
            const done = stats?.done ?? 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const linkedTasks = stats?.tasks ?? [];

            // Only show todo tasks as key results (things still to do)
            const keyResults = linkedTasks.filter((t) => t.status === 'todo');

            return (
              <div key={goal._id}>
                {/* Objective header */}
                <div className="px-6 py-4 bg-surface">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-text-muted">
                        O{gIdx + 1}
                      </span>
                      <Link
                        href={`/goals/${goal._id}`}
                        className="text-sm font-bold text-text hover:text-accent transition-colors"
                      >
                        {goal.title}
                      </Link>
                    </div>
                    <span className="text-xs font-mono text-text-muted">
                      {pct}% ({done}/{total})
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1 w-full bg-border overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        pct >= 70 ? 'bg-success' : pct >= 40 ? 'bg-warning' : 'bg-danger'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Key Results (linked todo tasks) */}
                {keyResults.length > 0 ? (
                  <div className="divide-y divide-border">
                    {keyResults.map((task, krIdx: number) => (
                      <Link
                        key={task._id}
                        href={`/tasks/${task._id}`}
                        className="group flex items-center gap-4 px-6 py-3 pl-12 transition-colors hover:bg-surface-hover"
                      >
                        <span className="text-xs font-mono text-text-muted w-10 shrink-0">
                          KR{krIdx + 1}
                        </span>
                        <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-text-muted/40 group-hover:border-text transition-colors" />
                        <span className="flex-1 text-sm text-text-muted group-hover:text-accent transition-colors truncate">
                          {task.title}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="px-12 py-3">
                    <span className="text-xs text-text-muted">No linked tasks</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
