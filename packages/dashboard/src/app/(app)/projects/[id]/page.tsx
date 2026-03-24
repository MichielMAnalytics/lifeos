'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { cn, formatDate, shortId } from '@/lib/utils';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Doc, Id } from '../../../../../../convex/_generated/dataModel';

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

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"projects">;

  const project = useQuery(api.projects.get, { id });

  if (project === undefined) return <div className="text-text-muted">Loading...</div>;
  if (project === null) {
    return (
      <div className="space-y-6">
        <Link href="/projects" className="text-xs text-text-muted hover:text-text">
          &larr; Projects
        </Link>
        <p className="text-text-muted">Project not found.</p>
      </div>
    );
  }

  const tasks: Doc<"tasks">[] = project.tasks ?? [];
  const todoTasks = tasks.filter((t) => t.status === 'todo');
  const doneTasks = tasks.filter((t) => t.status === 'done');
  const droppedTasks = tasks.filter((t) => t.status === 'dropped');
  const createdDate = project._creationTime
    ? new Date(project._creationTime).toISOString().slice(0, 10)
    : null;

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
          ID: <span className="font-mono">{shortId(String(project._id))}</span>
        </span>
        <span>Created: {formatDate(createdDate)}</span>
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
                  <TaskRow key={task._id} task={task} />
                ))}
              </div>
            )}

            {doneTasks.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-text-muted">
                  Done ({doneTasks.length})
                </p>
                {doneTasks.map((task) => (
                  <TaskRow key={task._id} task={task} />
                ))}
              </div>
            )}

            {droppedTasks.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-text-muted">
                  Dropped ({droppedTasks.length})
                </p>
                {droppedTasks.map((task) => (
                  <TaskRow key={task._id} task={task} />
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function TaskRow({ task }: { task: Doc<"tasks"> }) {
  const dueDate = task.dueDate ?? null;
  return (
    <Link
      href={`/tasks/${task._id}`}
      className={cn(
        'flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-surface-hover',
        task.status === 'done' && 'line-through opacity-60',
      )}
    >
      <span className="flex-1 truncate text-text">{task.title}</span>
      <div className="flex items-center gap-2">
        {dueDate && (
          <span className="text-xs text-text-muted">
            {formatDate(dueDate)}
          </span>
        )}
        <Badge variant={taskStatusVariant(task.status)}>{task.status}</Badge>
      </div>
    </Link>
  );
}
