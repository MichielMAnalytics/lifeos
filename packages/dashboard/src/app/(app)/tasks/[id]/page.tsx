'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TaskActions } from '@/components/task-actions';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Id } from '../../../../../../convex/_generated/dataModel';

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"tasks">;

  const task = useQuery(api.tasks.get, { id });

  if (task === undefined) return <div className="text-text-muted">Loading...</div>;
  if (task === null) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/tasks" className="text-sm text-text-muted hover:text-text transition-colors">
          &larr; Back to Tasks
        </Link>
        <p className="text-text-muted">Task not found.</p>
      </div>
    );
  }

  const statusVariant =
    task.status === 'done'
      ? 'success'
      : task.status === 'dropped'
        ? 'danger'
        : 'default';

  const dueDate = task.dueDate ?? null;
  const goalId = task.goalId ?? null;
  const projectId = task.projectId ?? null;
  const completedAt = task.completedAt ?? null;
  const createdDate = task._creationTime
    ? new Date(task._creationTime).toISOString().slice(0, 10)
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back link */}
      <Link
        href="/tasks"
        className="text-sm text-text-muted hover:text-text transition-colors"
      >
        &larr; Back to Tasks
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-text">{task.title}</h1>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant={statusVariant}>{task.status}</Badge>
                {dueDate && (
                  <Badge variant="muted">{formatDate(dueDate)}</Badge>
                )}
              </div>
            </div>
            <TaskActions taskId={task._id} currentStatus={task.status} />
          </div>
        </CardHeader>

        <div className="space-y-4 text-sm">
          {/* Notes */}
          {task.notes && (
            <div>
              <h3 className="mb-1 font-medium text-text-muted">Notes</h3>
              <p className="whitespace-pre-wrap text-text leading-relaxed">
                {task.notes}
              </p>
            </div>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <span className="text-text-muted">Due Date</span>
              <p className="text-text">{formatDate(dueDate)}</p>
            </div>
            <div>
              <span className="text-text-muted">Status</span>
              <p className="text-text">{task.status}</p>
            </div>
            <div>
              <span className="text-text-muted">Created</span>
              <p className="text-text">{formatDate(createdDate)}</p>
            </div>
            {completedAt && (
              <div>
                <span className="text-text-muted">Completed</span>
                <p className="text-text">
                  {formatDate(new Date(completedAt).toISOString().slice(0, 10))}
                </p>
              </div>
            )}
            {goalId && (
              <div>
                <span className="text-text-muted">Goal</span>
                <p>
                  <Link
                    href={`/goals/${goalId}`}
                    className="text-accent hover:underline"
                  >
                    View Goal
                  </Link>
                </p>
              </div>
            )}
            {projectId && (
              <div>
                <span className="text-text-muted">Project</span>
                <p>
                  <Link
                    href={`/projects/${projectId}`}
                    className="text-accent hover:underline"
                  >
                    View Project
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
