'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import Link from 'next/link';

export function TasksToday() {
  const todayTasks = useQuery(api.tasks.list, { status: 'todo', due: 'today' });

  if (todayTasks === undefined) {
    return <div className="animate-pulse h-48 bg-surface rounded-lg" />;
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden flex flex-col">
      <div className="flex items-baseline justify-between px-6 py-4 border-b border-border">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
          Today&apos;s Tasks
        </h2>
      </div>
      {todayTasks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-text-muted">No tasks due today</p>
          <p className="text-xs text-text-muted mt-1">Use quick capture to add one</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {todayTasks.map((task, i: number) => (
            <Link
              key={task._id}
              href={`/tasks/${task._id}`}
              className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-surface-hover"
            >
              <span className="text-xs font-mono text-text-muted w-6 shrink-0">
                [{String(i + 1).padStart(2, '0')}]
              </span>
              <span className="h-4 w-4 shrink-0 rounded-full border border-text-muted/40 group-hover:border-text transition-colors" />
              <span className="flex-1 text-sm text-text truncate group-hover:text-accent transition-colors">
                {task.title}
              </span>
              {task.goalId && (
                <span className="text-xs text-text-muted">[ goal ]</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
