import Link from 'next/link';
import type { Project, Task } from '@lifeos/shared';
import { api } from '@/lib/api';
import { cn, formatDate, shortId } from '@/lib/utils';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const statusVariant = (status: string) => {
  switch (status) {
    case 'active':
      return 'success';
    case 'completed':
      return 'default';
    case 'archived':
      return 'muted';
    default:
      return 'muted';
  }
};

const taskStatusVariant = (status: string) => {
  switch (status) {
    case 'done':
      return 'success';
    case 'dropped':
      return 'danger';
    default:
      return 'muted';
  }
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: project } = await api.get<{
    data: Project & { tasks: Task[] };
  }>(`/api/v1/projects/${id}`);

  const tasks = project.tasks ?? [];
  const todoTasks = tasks.filter((t) => t.status === 'todo');
  const doneTasks = tasks.filter((t) => t.status === 'done');
  const droppedTasks = tasks.filter((t) => t.status === 'dropped');

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/projects"
          className="text-xs text-text-muted hover:text-text"
        >
          &larr; Projects
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text">{project.title}</h1>
          {project.description && (
            <p className="mt-1 text-sm text-text-muted">
              {project.description}
            </p>
          )}
        </div>
        <Badge variant={statusVariant(project.status)}>
          {project.status}
        </Badge>
      </div>

      <div className="flex gap-4 text-xs text-text-muted">
        <span>
          ID: <span className="font-mono">{shortId(project.id)}</span>
        </span>
        <span>Created: {formatDate(project.created_at.split('T')[0])}</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Tasks ({tasks.length})
          </CardTitle>
        </CardHeader>

        {tasks.length === 0 ? (
          <p className="text-sm text-text-muted">
            No tasks linked to this project.
          </p>
        ) : (
          <div className="space-y-4">
            {todoTasks.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-text-muted">
                  To Do ({todoTasks.length})
                </p>
                {todoTasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            )}

            {doneTasks.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-text-muted">
                  Done ({doneTasks.length})
                </p>
                {doneTasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            )}

            {droppedTasks.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-text-muted">
                  Dropped ({droppedTasks.length})
                </p>
                {droppedTasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  return (
    <Link
      href={`/tasks/${task.id}`}
      className={cn(
        'flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-surface-hover',
        task.status === 'done' && 'line-through opacity-60',
      )}
    >
      <span className="flex-1 truncate text-text">{task.title}</span>
      <div className="flex items-center gap-2">
        {task.due_date && (
          <span className="text-xs text-text-muted">
            {formatDate(task.due_date)}
          </span>
        )}
        <Badge variant={taskStatusVariant(task.status)}>{task.status}</Badge>
      </div>
    </Link>
  );
}
