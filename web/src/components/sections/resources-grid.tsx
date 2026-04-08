'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Id, Doc } from '@/lib/convex-api';
import { cn } from '@/lib/utils';
import { SidePeek } from '@/components/side-peek';
import { Skeleton } from '@/components/ui/skeleton';

// ── Types ────────────────────────────────────────────

type Resource = Doc<'resources'>;

// ── Icons ────────────────────────────────────────────

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// ── Helpers ──────────────────────────────────────────

function relativeDate(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (weeks < 5) return `${weeks}w ago`;
  if (months < 12) return `${months}mo ago`;
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatFullDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ── Ghost / Empty state data ────────────────────────

const GHOST_RESOURCES: Array<{
  title: string;
  content: string | undefined;
}> = [
  {
    title: 'Getting Started with React',
    content: 'The official React documentation with interactive examples and tutorials.',
  },
  {
    title: 'Figma Design Tool',
    content: 'Collaborative interface design tool for building digital products.',
  },
  {
    title: 'The Lean Startup',
    content: 'How today\'s entrepreneurs use continuous innovation to create radically successful businesses.',
  },
];

// ── Resource Card ────────────────────────────────────

interface ResourceCardProps {
  resource: Resource;
  onClick: () => void;
}

function ResourceCard({ resource, onClick }: ResourceCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="group rounded-xl border border-border bg-surface hover:border-text-muted/30 hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:-translate-y-[1px] transition-all duration-200 ease-out cursor-pointer flex flex-col overflow-hidden"
    >
      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Title */}
        <h3 className="text-sm font-semibold text-text leading-snug group-hover:text-accent transition-colors line-clamp-2">
          {resource.title}
        </h3>

        {/* Description preview */}
        {resource.content && (
          <p className="text-[12px] text-text-muted/70 leading-relaxed line-clamp-2">
            {resource.content}
          </p>
        )}
      </div>

      {/* Footer: date */}
      <div className="px-4 pb-3 pt-0 flex items-end justify-end gap-2 mt-auto">
        <span className="text-[10px] text-text-muted/80 shrink-0 whitespace-nowrap">
          {relativeDate(resource._creationTime)}
        </span>
      </div>
    </div>
  );
}

// ── Ghost Card (empty state) ─────────────────────────

function GhostCard({ ghost }: { ghost: typeof GHOST_RESOURCES[number] }) {
  return (
    <div className="rounded-xl border border-border bg-surface opacity-25 select-none pointer-events-none flex flex-col overflow-hidden">
      <div className="p-4 flex flex-col gap-3 flex-1">
        <h3 className="text-sm font-semibold text-text leading-snug line-clamp-2">
          {ghost.title}
        </h3>

        {ghost.content && (
          <p className="text-[12px] text-text-muted/70 leading-relaxed line-clamp-2">
            {ghost.content}
          </p>
        )}
      </div>

      <div className="px-4 pb-3 pt-0 flex items-end justify-end gap-2 mt-auto">
        <span className="text-[10px] text-text-muted/80 shrink-0">just now</span>
      </div>
    </div>
  );
}

// ── Resource Detail Modal ────────────────────────────

interface ResourceDetailModalProps {
  resource: Resource;
  onClose: () => void;
}

function ResourceDetailModal({ resource, onClose }: ResourceDetailModalProps) {
  const updateResource = useMutation(api.resources.update);
  const removeResource = useMutation(api.resources.remove);

  const [titleValue, setTitleValue] = useState(resource.title);
  const [contentValue, setContentValue] = useState(resource.content ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const initializedRef = useRef(false);

  // Initialize local state from resource data
  useEffect(() => {
    if (!initializedRef.current) {
      setTitleValue(resource.title);
      setContentValue(resource.content ?? '');
      initializedRef.current = true;
    }
  }, [resource]);

  // Reset initialized on resource id change
  useEffect(() => {
    initializedRef.current = false;
  }, [resource._id]);

  // Auto-resize content textarea
  const autoResize = useCallback(() => {
    if (contentRef.current) {
      contentRef.current.style.height = 'auto';
      contentRef.current.style.height = `${contentRef.current.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    autoResize();
  }, [contentValue, autoResize]);

  // Save helpers
  const saveField = useCallback(
    async (updates: Record<string, unknown>) => {
      try {
        await updateResource({ id: resource._id, ...updates } as Parameters<typeof updateResource>[0]);
      } catch (err) {
        console.error('Failed to update resource:', err);
      }
    },
    [resource._id, updateResource],
  );

  const handleTitleBlur = useCallback(() => {
    if (titleValue.trim() && titleValue.trim() !== resource.title) {
      saveField({ title: titleValue.trim() });
    }
  }, [titleValue, resource.title, saveField]);

  const handleContentBlur = useCallback(() => {
    const newContent = contentValue.trim();
    const oldContent = resource.content ?? '';
    if (newContent !== oldContent) {
      saveField({ content: newContent || undefined });
    }
  }, [contentValue, resource.content, saveField]);

  const handleDelete = useCallback(async () => {
    try {
      await removeResource({ id: resource._id });
      onClose();
    } catch (err) {
      console.error('Failed to delete resource:', err);
    }
  }, [resource._id, removeResource, onClose]);

  const createdDate = formatFullDate(resource._creationTime);

  return (
    <SidePeek open={true} onClose={onClose} title="Resource">
      <div className="px-8 py-6">
        {/* Title - large, editable */}
        <input
          ref={titleRef}
          type="text"
          value={titleValue}
          onChange={(e) => setTitleValue(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="w-full bg-transparent text-2xl font-bold text-text focus:outline-none placeholder:text-text-muted mb-6"
          placeholder="Resource title"
        />

        {/* Properties section */}
        <div className="space-y-3 mb-8">
          {/* Created */}
          <div className="flex items-center gap-3 py-1.5 group">
            <span className="text-[13px] text-text-muted w-28 shrink-0 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 opacity-40">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Created
            </span>
            <span className="text-[13px] text-text-muted flex-1">
              {createdDate}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/40 my-6" />

        {/* Description - editable auto-expanding textarea */}
        <div className="mb-8">
          <textarea
            ref={contentRef}
            value={contentValue}
            onChange={(e) => {
              setContentValue(e.target.value);
              autoResize();
            }}
            onBlur={handleContentBlur}
            placeholder="Add a description..."
            rows={4}
            className="w-full bg-transparent text-sm text-text placeholder:text-text-muted focus:outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Delete */}
        <div className="border-t border-border/40 pt-4">
          {confirmDelete ? (
            <div className="space-y-2">
              <p className="text-xs text-danger">Are you sure? This cannot be undone.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 text-xs font-medium text-danger bg-danger/10 hover:bg-danger/20 py-1.5 rounded-lg transition-colors"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-text-muted hover:text-text py-1.5 px-3 rounded-lg hover:bg-surface-hover transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full text-center text-xs text-text-muted hover:text-danger py-2 rounded-lg hover:bg-surface-hover transition-colors"
            >
              Delete resource
            </button>
          )}
        </div>
      </div>
    </SidePeek>
  );
}

// ── Add Resource Modal ──────────────────────────────

interface AddResourceModalProps {
  onClose: () => void;
}

function AddResourceModal({ onClose }: AddResourceModalProps) {
  const createResource = useMutation(api.resources.create);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim()) return;
      setSubmitting(true);
      try {
        await createResource({
          title: title.trim(),
          content: content.trim() || undefined,
        });
        onClose();
      } catch (err) {
        console.error('Failed to create resource:', err);
      } finally {
        setSubmitting(false);
      }
    },
    [title, content, createResource, onClose],
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start pt-4 md:pt-[12vh] justify-center bg-black/60 backdrop-blur-[2px]"
      onClick={handleBackdropClick}
    >
      <div
        className="rounded-xl bg-surface border border-border shadow-2xl max-w-lg w-full mx-4 md:mx-auto overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50">
          <span className="text-sm font-semibold text-text">New Resource</span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider block mb-1.5">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resource title"
              className="w-full text-sm px-3 py-2.5 rounded-lg border border-border bg-bg text-text focus:outline-none focus:border-accent placeholder:text-text-muted"
              autoFocus
            />
          </div>

          {/* Content */}
          <div>
            <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider block mb-1.5">
              Description
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add a description..."
              rows={3}
              className="w-full text-sm px-3 py-2.5 rounded-lg border border-border bg-bg text-text focus:outline-none focus:border-accent resize-y placeholder:text-text-muted"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || submitting}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── View mode icons ─────────────────────────────────

function GridIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={active ? 'text-accent' : 'text-text-muted'}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function ListIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={active ? 'text-accent' : 'text-text-muted'}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function MasonryIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={active ? 'text-accent' : 'text-text-muted'}>
      <rect x="3" y="3" width="7" height="10" rx="1" />
      <rect x="14" y="3" width="7" height="6" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
    </svg>
  );
}

function HeadlinesIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={active ? 'text-accent' : 'text-text-muted'}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="3" y1="14" x2="21" y2="14" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

// ── Headlines view row (super dense) ────────────────

function ResourceHeadlineRow({ resource, onClick }: { resource: Resource; onClick: () => void }) {
  let domain = '';
  if (resource.url) {
    try {
      domain = new URL(resource.url).hostname.replace(/^www\./, '');
    } catch {
      // ignore
    }
  }
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className="flex items-center gap-3 px-4 py-1.5 hover:bg-surface-hover transition-colors cursor-pointer border-b border-border/30 last:border-b-0 text-xs"
    >
      <span className="text-text flex-1 truncate">{resource.title}</span>
      {domain && (
        <span className="text-text-muted shrink-0 tabular-nums">{domain}</span>
      )}
      {resource.type && (
        <span className="text-[9px] uppercase tracking-wide text-text-muted/70 shrink-0 w-12 text-right">
          {resource.type}
        </span>
      )}
    </div>
  );
}

// ── Resource List Row ────────────────────────────────

function ResourceListRow({ resource, onClick }: { resource: Resource; onClick: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className="flex items-center gap-4 px-4 py-3 hover:bg-surface-hover transition-colors cursor-pointer border-b border-border/50 last:border-b-0"
    >
      <span className="text-sm text-text flex-1 truncate">{resource.title}</span>
      {resource.type && (
        <span className="text-[10px] font-medium uppercase tracking-wide text-text-muted shrink-0">
          {resource.type}
        </span>
      )}
      <span className="text-[11px] text-text-muted/80 shrink-0">
        {relativeDate(resource._creationTime)}
      </span>
    </div>
  );
}

// (Table view removed in Phase 2 Fix — replaced by masonry per Section 13A pick)

// ── Sort/Group helpers ──────────────────────────────

type SortBy = 'date' | 'title';
type GroupBy = 'none' | 'date' | 'title' | 'type';
type ViewMode = 'grid' | 'list' | 'masonry' | 'headlines';
type TypeFilter = 'all' | 'article' | 'tool' | 'book' | 'video' | 'other';

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: 'all',     label: 'All'      },
  { key: 'article', label: 'Articles' },
  { key: 'tool',    label: 'Tools'    },
  { key: 'book',    label: 'Books'    },
  { key: 'video',   label: 'Videos'   },
  { key: 'other',   label: 'Other'    },
];

function groupResources(resources: Resource[], groupBy: GroupBy): { label: string; items: Resource[] }[] {
  if (groupBy === 'none') return [{ label: '', items: resources }];

  const groups = new Map<string, Resource[]>();
  for (const r of resources) {
    let key: string;
    if (groupBy === 'date') {
      const d = new Date(r._creationTime);
      key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (groupBy === 'type') {
      key = r.type ? r.type.charAt(0).toUpperCase() + r.type.slice(1) : 'No type';
    } else {
      key = r.title.charAt(0).toUpperCase();
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

// ── Main Component ──────────────────────────────────

export function ResourcesGrid() {
  const resources = useQuery(api.resources.list, {});

  const [selectedId, setSelectedId] = useState<Id<'resources'> | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  // Filter + sort
  const filtered = useMemo(() => {
    if (!resources) return [];
    let list = [...resources];

    if (typeFilter !== 'all') {
      list = list.filter((r) => (r.type ?? 'other') === typeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.content && r.content.toLowerCase().includes(q)),
      );
    }

    if (sortBy === 'date') {
      list.sort((a, b) => b._creationTime - a._creationTime);
    } else {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }

    return list;
  }, [resources, searchQuery, sortBy, typeFilter]);

  // Counts per type for the filter chips
  const typeCounts = useMemo(() => {
    const counts: Record<TypeFilter, number> = { all: 0, article: 0, tool: 0, book: 0, video: 0, other: 0 };
    if (!resources) return counts;
    for (const r of resources) {
      counts.all += 1;
      const t = (r.type ?? 'other') as TypeFilter;
      if (t in counts) counts[t] += 1;
      else counts.other += 1;
    }
    return counts;
  }, [resources]);

  const groups = useMemo(() => groupResources(filtered, groupBy), [filtered, groupBy]);

  const selectedResource = useMemo(() => {
    if (!selectedId || !resources) return null;
    return resources.find((r) => r._id === selectedId) ?? null;
  }, [selectedId, resources]);

  if (!resources) {
    // Section 18J — shape-matching skeleton: toolbar + filter chips + card grid
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-56 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-6 w-16 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const isEmpty = resources.length === 0;
  const hasFilters = searchQuery.trim().length > 0;

  return (
    <div className="max-w-none space-y-5">
      {/* Toolbar: search + controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/80" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search resources..."
            className="text-sm pl-9 pr-3 py-1.5 rounded-lg border border-border bg-bg text-text focus:outline-none focus:border-accent placeholder:text-text-muted/70 w-full sm:w-56"
          />
        </div>

        <div className="flex items-center gap-1 ml-auto">
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="text-[11px] bg-transparent border border-border rounded-md px-2 py-1.5 text-text-muted focus:outline-none focus:border-accent/50 cursor-pointer"
          >
            <option value="date">Sort: Date</option>
            <option value="title">Sort: Title</option>
          </select>

          {/* Group */}
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="text-[11px] bg-transparent border border-border rounded-md px-2 py-1.5 text-text-muted focus:outline-none focus:border-accent/50 cursor-pointer"
          >
            <option value="none">Group: None</option>
            <option value="date">Group: Date</option>
            <option value="type">Group: Type</option>
            <option value="title">Group: Title</option>
          </select>

          {/* View mode — Section 13A Raindrop Quad */}
          <div className="flex items-center border border-border rounded-md overflow-hidden ml-1">
            <button onClick={() => setViewMode('grid')} className={cn('p-1.5 transition-colors', viewMode === 'grid' ? 'bg-surface' : 'hover:bg-surface-hover')} title="Grid">
              <GridIcon active={viewMode === 'grid'} />
            </button>
            <button onClick={() => setViewMode('list')} className={cn('p-1.5 transition-colors', viewMode === 'list' ? 'bg-surface' : 'hover:bg-surface-hover')} title="List">
              <ListIcon active={viewMode === 'list'} />
            </button>
            <button onClick={() => setViewMode('masonry')} className={cn('p-1.5 transition-colors', viewMode === 'masonry' ? 'bg-surface' : 'hover:bg-surface-hover')} title="Masonry">
              <MasonryIcon active={viewMode === 'masonry'} />
            </button>
            <button onClick={() => setViewMode('headlines')} className={cn('p-1.5 transition-colors', viewMode === 'headlines' ? 'bg-surface' : 'hover:bg-surface-hover')} title="Headlines">
              <HeadlinesIcon active={viewMode === 'headlines'} />
            </button>
          </div>
        </div>
      </div>

      {/* Type filter chips — Section 13A */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {TYPE_FILTERS.map((tf) => {
          const isActive = typeFilter === tf.key;
          const count = typeCounts[tf.key];
          return (
            <button
              key={tf.key}
              type="button"
              onClick={() => setTypeFilter(tf.key)}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border transition-colors',
                isActive
                  ? 'bg-accent/15 border-accent/40 text-accent'
                  : 'bg-transparent border-border text-text-muted hover:text-text hover:border-text/40',
              )}
            >
              {tf.label}
              <span className="opacity-60 tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isEmpty && !hasFilters ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GHOST_RESOURCES.map((ghost, i) => (
              <GhostCard key={i} ghost={ghost} />
            ))}
          </div>
          <div className="text-center py-4">
            <p className="text-sm text-text-muted">No resources yet.</p>
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="text-sm text-accent hover:underline mt-1"
            >
              Add your first resource
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-text">No resources match your search</p>
          <p className="text-xs text-text-muted mt-1">Try adjusting your search.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ label, items }) => (
            <div key={label || '__all'}>
              {label && (
                <h3 className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-muted/70 mb-3">
                  {label}
                </h3>
              )}

              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((resource) => (
                    <ResourceCard
                      key={resource._id}
                      resource={resource}
                      onClick={() => setSelectedId(resource._id)}
                    />
                  ))}
                </div>
              )}

              {viewMode === 'list' && (
                <div className="border border-border rounded-xl overflow-hidden">
                  {items.map((resource) => (
                    <ResourceListRow
                      key={resource._id}
                      resource={resource}
                      onClick={() => setSelectedId(resource._id)}
                    />
                  ))}
                </div>
              )}

              {viewMode === 'masonry' && (
                // Section 13A Raindrop Quad — Pinterest-style masonry using
                // CSS columns. Cards flow into columns with variable heights
                // so long-content cards expand and short ones stay compact.
                <div className="[column-gap:1rem] [column-count:1] sm:[column-count:2] lg:[column-count:3] xl:[column-count:4]">
                  {items.map((resource) => {
                    // Make the card height vary based on content length so
                    // columns look like a real masonry, not a uniform grid.
                    const bodyLen = (resource.content ?? '').length;
                    return (
                      <div key={resource._id} className="mb-4 break-inside-avoid">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedId(resource._id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedId(resource._id);
                            }
                          }}
                          className="group rounded-xl border border-border bg-surface hover:border-text-muted/30 hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:-translate-y-[1px] transition-all duration-200 ease-out cursor-pointer flex flex-col overflow-hidden"
                        >
                          <div className="p-4 flex flex-col gap-3">
                            <h3 className="text-sm font-semibold text-text leading-snug group-hover:text-accent transition-colors">
                              {resource.title}
                            </h3>
                            {resource.content && (
                              <p
                                className={cn(
                                  'text-[12px] text-text-muted/80 leading-relaxed',
                                  bodyLen > 240 ? 'line-clamp-6' : '',
                                )}
                              >
                                {resource.content}
                              </p>
                            )}
                          </div>
                          <div className="px-4 pb-3 flex items-center justify-between gap-2">
                            {resource.type && (
                              <span className="text-[9px] font-medium uppercase tracking-wide text-text-muted/70">
                                {resource.type}
                              </span>
                            )}
                            <span className="text-[10px] text-text-muted/60 ml-auto">
                              {relativeDate(resource._creationTime)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {viewMode === 'headlines' && (
                <div className="border border-border rounded-xl overflow-hidden divide-y divide-border/30">
                  {items.map((resource) => (
                    <ResourceHeadlineRow
                      key={resource._id}
                      resource={resource}
                      onClick={() => setSelectedId(resource._id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedResource && (
        <ResourceDetailModal
          resource={selectedResource}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* Add modal */}
      {showAdd && <AddResourceModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
