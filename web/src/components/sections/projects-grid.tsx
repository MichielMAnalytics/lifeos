'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Id } from '@/lib/convex-api';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ProjectDetailModal } from '@/components/project-detail-modal';

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

function ProjectCreateModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const createProject = useMutation(api.projects.create);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const args: { title: string; description?: string } = { title: title.trim() };
      if (description.trim()) args.description = description.trim();
      await createProject(args);
      onClose();
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start pt-[12vh] justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">New Project</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Project title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? 'Creating...' : 'Create Project'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProjectsGrid() {
  const projects = useQuery(api.projects.list, { status: "active" });
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<Id<'projects'> | null>(null);

  if (!projects) return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-40 rounded-xl bg-surface animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="max-w-none space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-text">
          Projects <span className="text-text-muted font-normal">[ {projects.length} ]</span>
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-white text-black px-5 py-2.5 text-sm font-medium uppercase tracking-wide hover:bg-white/90 transition-colors rounded-xl"
        >
          New Project
        </button>
      </div>

      {showCreate && <ProjectCreateModal onClose={() => setShowCreate(false)} />}
      {selectedProjectId && (
        <ProjectDetailModal
          projectId={selectedProjectId}
          onClose={() => setSelectedProjectId(null)}
        />
      )}

      {projects.length === 0 ? (
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: 'Product Launch', desc: 'Plan and execute your next big release' },
              { title: 'Website Redesign', desc: 'Refresh the look and feel of your site' },
              { title: 'Growth Strategy', desc: 'Define key initiatives for this quarter' },
            ].map((ghost, idx) => (
              <div
                key={ghost.title}
                className="border border-dashed border-border/50 p-6 opacity-40 h-full flex flex-col rounded-xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono text-text-muted">
                    [{String(idx + 1).padStart(2, '0')}]
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-text-muted" />
                    <span className="text-xs text-text-muted">Active</span>
                  </div>
                </div>
                <h3 className="text-base font-bold text-text-muted leading-snug mb-2">
                  {ghost.title}
                </h3>
                <p className="text-sm text-text-muted/70 line-clamp-2 leading-relaxed mb-4 italic">
                  {ghost.desc}
                </p>
                <div className="mt-auto pt-4 border-t border-border/30">
                  <span className="text-xs font-mono text-text-muted">Today</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-text-muted/70">
            Create your first project
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, idx: number) => {
            const createdDate = project._creationTime
              ? new Date(project._creationTime).toISOString().slice(0, 10)
              : null;
            return (
              <div
                key={project._id}
                className="border border-border rounded-xl p-6 transition-colors hover:border-text/30 group h-full flex flex-col cursor-pointer"
                onClick={() => setSelectedProjectId(project._id)}
              >
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
                      {formatDate(createdDate)}
                    </span>
                  </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
