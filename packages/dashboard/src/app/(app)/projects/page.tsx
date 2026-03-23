import Link from 'next/link';
import type { Project } from '@lifeos/shared';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

const statusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-success';
    case 'completed':
      return 'bg-accent';
    case 'archived':
      return 'bg-text-muted';
    default:
      return 'bg-text-muted';
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'completed':
      return 'Completed';
    case 'archived':
      return 'Archived';
    default:
      return status;
  }
};

export default async function ProjectsPage() {
  const { data: projects } = await api.get<{ data: Project[] }>(
    '/api/v1/projects?status=active',
  );

  return (
    <div className="max-w-none space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-text">
          Projects <span className="text-text-muted font-normal">[ {projects.length} ]</span>
        </h1>
        <Link
          href="/projects/new"
          className="bg-white text-black px-5 py-2.5 text-sm font-medium uppercase tracking-wide hover:bg-white/90 transition-colors"
        >
          New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-base font-medium text-text">No active projects</p>
          <p className="text-sm text-text-muted mt-1">Create one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, idx) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <div className="border border-border p-6 transition-colors hover:border-text/30 group h-full flex flex-col">
                {/* Index + Status */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono text-text-muted">
                    [{String(idx + 1).padStart(2, '0')}]
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${statusColor(project.status)}`} />
                    <span className="text-xs text-text-muted">{statusLabel(project.status)}</span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-text group-hover:text-accent transition-colors leading-snug mb-2">
                  {project.title}
                </h3>

                {/* Description */}
                {project.description && (
                  <p className="text-sm text-text-muted line-clamp-2 leading-relaxed mb-4">
                    {project.description}
                  </p>
                )}

                {/* Footer */}
                <div className="mt-auto pt-4 border-t border-border">
                  <span className="text-xs font-mono text-text-muted">
                    {formatDate(project.created_at.split('T')[0])}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
