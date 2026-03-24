'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export function TasksFlat() {
  const tasks = useQuery(api.tasks.list, { status: 'todo' });

  if (tasks === undefined) {
    return <div className="animate-pulse h-48 bg-surface rounded-lg" />;
  }

  return (
    <div className="border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
          All Tasks
        </span>
        <span className="text-xs font-mono text-text-muted">[ {tasks.length} ]</span>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-text-muted">No tasks</p>
          <p className="text-xs text-text-muted/60 mt-1">Nothing on the list right now</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {tasks.map((task, i: number) => (
            <Link
              key={task._id}
              href={`/tasks/${task._id}`}
              className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-surface-hover"
            >
              <span className="text-xs font-mono text-text-muted w-8 shrink-0">
                [{String(i + 1).padStart(2, '0')}]
              </span>
              <span className="flex-1 text-sm text-text truncate group-hover:text-accent transition-colors">
                {task.title}
              </span>
              {task.dueDate ? (
                <span className="text-xs font-mono text-text-muted shrink-0">
                  {formatDate(task.dueDate)}
                </span>
              ) : (
                <span className="text-xs text-text-muted/40 shrink-0">no date</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
