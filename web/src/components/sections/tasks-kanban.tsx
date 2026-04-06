'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export function TasksKanban() {
  const todoTasks = useQuery(api.tasks.list, { status: 'todo' });
  const doneTasks = useQuery(api.tasks.list, { status: 'done' });

  if (todoTasks === undefined || doneTasks === undefined) {
    return <div className="animate-pulse h-48 bg-surface rounded-lg" />;
  }

  const columns = [
    { key: 'todo', label: 'To Do', tasks: todoTasks },
    { key: 'done', label: 'Done', tasks: doneTasks.slice(0, 20) },
  ];

  const totalCount = todoTasks.length + doneTasks.length;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
          Kanban Board
        </span>
        <span className="text-xs text-text-muted tabular-nums">{totalCount} total</span>
      </div>

      <div className="grid grid-cols-2 divide-x divide-border min-h-[200px]">
        {columns.map((col) => (
          <div key={col.key} className="flex flex-col">
            {/* Column header */}
            <div className="px-4 py-3 border-b border-border bg-surface flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
                {col.label}
              </span>
              <span className="text-xs text-text-muted tabular-nums">
                {col.tasks.length}
              </span>
            </div>

            {/* Column body */}
            {col.tasks.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-4">
                <span className="text-xs text-text-muted">
                  Empty
                </span>
              </div>
            ) : (
              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[480px]">
                {col.tasks.map((task) => (
                  <Link
                    key={task._id}
                    href={`/tasks/${task._id}`}
                    className="group block border border-border p-3 rounded-xl transition-colors hover:border-text/30 hover:bg-surface-hover"
                  >
                    <span className="text-sm text-text group-hover:text-accent transition-colors line-clamp-2">
                      {task.title}
                    </span>
                    <div className="flex items-center justify-between mt-2">
                      {task.dueDate ? (
                        <span className="text-xs text-text-muted">
                          {formatDate(task.dueDate)}
                        </span>
                      ) : (
                        <span />
                      )}
                      {task.goalId && (
                        <span className="text-xs text-text-muted">Goal</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
