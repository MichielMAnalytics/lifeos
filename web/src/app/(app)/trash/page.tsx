'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Id } from '@/lib/convex-api';
import { formatRelativeDate } from '@/lib/utils';

export default function TrashPage() {
  const droppedTasks = useQuery(api.tasks.list, { status: 'dropped' });
  const updateTask = useMutation(api.tasks.update);
  const removeTask = useMutation(api.tasks.remove);

  const handleRestore = async (id: Id<'tasks'>) => {
    await updateTask({ id, status: 'todo' });
  };

  const handleDeletePermanently = async (id: Id<'tasks'>) => {
    await removeTask({ id });
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-text mb-6">Trash</h1>

      {droppedTasks === undefined ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-surface animate-pulse" />
          ))}
        </div>
      ) : droppedTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted/30 mb-3">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          <p className="text-sm font-medium text-text-muted">Trash is empty</p>
          <p className="text-xs text-text-muted/60 mt-1">Deleted items will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {droppedTasks.map((task) => {
            const dateInfo = formatRelativeDate(task.dueDate);
            return (
              <div
                key={task._id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-surface group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-muted line-through truncate">{task.title}</p>
                  <span className={`text-[11px] ${dateInfo.colorClass}`}>{dateInfo.text}</span>
                </div>
                <button
                  onClick={() => handleRestore(task._id)}
                  className="text-xs text-text-muted hover:text-accent transition-colors opacity-0 group-hover:opacity-100 px-2 py-1 rounded-md hover:bg-surface-hover"
                >
                  Restore
                </button>
                <button
                  onClick={() => handleDeletePermanently(task._id)}
                  className="text-xs text-text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100 px-2 py-1 rounded-md hover:bg-danger/5"
                >
                  Delete
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
