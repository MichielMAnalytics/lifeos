import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TaskActions } from '@/components/task-actions';
import type { Task, ApiResponse } from '@lifeos/shared';
import Link from 'next/link';

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await api.get<ApiResponse<Task>>(`/api/v1/tasks/${id}`);
  const task = res.data;

  const statusVariant =
    task.status === 'done'
      ? 'success'
      : task.status === 'dropped'
        ? 'danger'
        : 'default';

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
                {task.due_date && (
                  <Badge variant="muted">{formatDate(task.due_date)}</Badge>
                )}
              </div>
            </div>
            <TaskActions taskId={task.id} currentStatus={task.status} />
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
              <p className="text-text">{formatDate(task.due_date)}</p>
            </div>
            <div>
              <span className="text-text-muted">Status</span>
              <p className="text-text">{task.status}</p>
            </div>
            <div>
              <span className="text-text-muted">Created</span>
              <p className="text-text">{formatDate(task.created_at.slice(0, 10))}</p>
            </div>
            {task.completed_at && (
              <div>
                <span className="text-text-muted">Completed</span>
                <p className="text-text">
                  {formatDate(task.completed_at.slice(0, 10))}
                </p>
              </div>
            )}
            {task.goal_id && (
              <div>
                <span className="text-text-muted">Goal</span>
                <p>
                  <Link
                    href={`/goals/${task.goal_id}`}
                    className="text-accent hover:underline"
                  >
                    View Goal
                  </Link>
                </p>
              </div>
            )}
            {task.project_id && (
              <div>
                <span className="text-text-muted">Project</span>
                <p>
                  <Link
                    href={`/projects/${task.project_id}`}
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
