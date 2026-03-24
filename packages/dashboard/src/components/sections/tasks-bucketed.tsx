'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { formatDate } from '@/lib/utils';
import { TaskForm } from '@/components/task-form';
import Link from 'next/link';
import type { Doc } from '../../../../../convex/_generated/dataModel';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function endOfWeekISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

type Task = Doc<"tasks">;

interface TaskBucket {
  label: string;
  variant: 'danger' | 'default' | 'muted' | 'warning' | 'success';
  tasks: Task[];
}

function bucketTasks(tasks: Task[]): TaskBucket[] {
  const today = todayISO();
  const tomorrow = tomorrowISO();
  const endOfWeek = endOfWeekISO();

  const overdue: Task[] = [];
  const todayBucket: Task[] = [];
  const tomorrowBucket: Task[] = [];
  const thisWeek: Task[] = [];
  const later: Task[] = [];
  const noDate: Task[] = [];

  for (const task of tasks) {
    const dueDate = task.dueDate ?? null;
    if (!dueDate) {
      noDate.push(task);
    } else if (dueDate < today) {
      overdue.push(task);
    } else if (dueDate === today) {
      todayBucket.push(task);
    } else if (dueDate === tomorrow) {
      tomorrowBucket.push(task);
    } else if (dueDate <= endOfWeek) {
      thisWeek.push(task);
    } else {
      later.push(task);
    }
  }

  const buckets: TaskBucket[] = [];
  if (overdue.length > 0) buckets.push({ label: 'Overdue', variant: 'danger', tasks: overdue });
  if (todayBucket.length > 0) buckets.push({ label: 'Today', variant: 'default', tasks: todayBucket });
  if (tomorrowBucket.length > 0) buckets.push({ label: 'Tomorrow', variant: 'muted', tasks: tomorrowBucket });
  if (thisWeek.length > 0) buckets.push({ label: 'This Week', variant: 'muted', tasks: thisWeek });
  if (later.length > 0) buckets.push({ label: 'Later', variant: 'muted', tasks: later });
  if (noDate.length > 0) buckets.push({ label: 'No Date', variant: 'muted', tasks: noDate });

  return buckets;
}

export function TasksBucketed() {
  const tasks = useQuery(api.tasks.list, { status: "todo" });

  if (!tasks) return <div className="text-text-muted">Loading...</div>;

  const buckets = bucketTasks(tasks);

  // Running index across all buckets
  let globalIndex = 0;

  return (
    <div className="max-w-none space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text">
            Tasks <span className="text-text-muted font-normal">[ {tasks.length} ]</span>
          </h1>
        </div>
        <TaskForm />
      </div>

      {/* Task Buckets */}
      {buckets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-base font-medium text-text">All clear</p>
          <p className="text-sm text-text-muted mt-1">No tasks here.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {buckets.map((bucket) => {
            const bucketStartIndex = globalIndex;
            globalIndex += bucket.tasks.length;

            return (
              <section key={bucket.label}>
                {/* Bucket header: label + thin line */}
                <div className="flex items-center gap-4 mb-4">
                  <span className={`text-xs font-bold uppercase tracking-widest ${
                    bucket.variant === 'danger' ? 'text-danger' : 'text-text-muted'
                  }`}>
                    {bucket.label}
                  </span>
                  <span className="text-xs text-text-muted">
                    {bucket.tasks.length}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Task rows */}
                <div className="border border-border divide-y divide-border">
                  {bucket.tasks.map((task, i: number) => {
                    const idx = bucketStartIndex + i + 1;
                    const dueDate = task.dueDate ?? null;
                    return (
                      <Link
                        key={task._id}
                        href={`/tasks/${task._id}`}
                        className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-surface-hover group"
                      >
                        {/* Numbered index */}
                        <span className="text-xs font-mono text-text-muted w-8 shrink-0">
                          [{String(idx).padStart(2, '0')}]
                        </span>

                        {/* Completion circle */}
                        {task.status === 'done' ? (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-bg">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                        ) : (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-text-muted/40 group-hover:border-text transition-colors" />
                        )}

                        {/* Title */}
                        <span className="flex-1 text-sm text-text group-hover:text-accent transition-colors truncate">
                          {task.title}
                        </span>

                        {/* Goal tag */}
                        {task.goalId && (
                          <span className="text-xs text-text-muted">[ goal ]</span>
                        )}

                        {/* Due date */}
                        {dueDate && (
                          <span className="text-xs text-text-muted shrink-0 font-mono">
                            {formatDate(dueDate)}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
