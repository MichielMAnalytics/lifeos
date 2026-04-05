'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { Button } from '@/components/ui/button';
import { ThoughtDetailModal } from '@/components/thought-detail-modal';
import type { Doc } from '@/lib/convex-api';

type Thought = Doc<'thoughts'>;

function formatThoughtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDisplayTitle(thought: Thought): string {
  if (thought.title && thought.title.trim().length > 0) {
    return thought.title;
  }
  const truncated = thought.content.slice(0, 50).trim();
  return truncated.length < thought.content.length ? truncated + '...' : truncated;
}

function ThoughtAddForm({ onDone }: { onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const createThought = useMutation(api.thoughts.create);

  function closeModal() {
    setOpen(false);
    setTitle('');
    setContent('');
  }

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      const args: { content: string; title?: string } = {
        content: content.trim(),
      };
      if (title.trim()) args.title = title.trim();
      await createThought(args);
      closeModal();
      onDone?.();
    } catch (err) {
      console.error('Failed to create thought:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        + Add
      </Button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start pt-4 md:pt-[12vh] justify-center bg-black/60 backdrop-blur-[2px]"
      onClick={closeModal}
    >
      <div
        className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 md:mx-auto p-6 space-y-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">New Thought</h2>
          <button
            type="button"
            onClick={closeModal}
            className="text-text-muted hover:text-text transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              Title (optional)
            </label>
            <input
              type="text"
              placeholder="Give it a title, or leave blank"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              Content
            </label>
            <textarea
              placeholder="What are you thinking about?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading || !content.trim()}>
              {loading ? 'Saving...' : 'Save Thought'}
            </Button>
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ThoughtRow({
  thought,
  index,
  expanded,
  onToggle,
  onSelect,
}: {
  thought: Thought;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onSelect: (thought: Thought) => void;
}) {
  const displayTitle = getDisplayTitle(thought);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => onSelect(thought)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface/50"
      >
        {/* Index badge */}
        <span className="mt-0.5 shrink-0 text-xs text-text-muted tabular-nums">
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Title + chevron */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted shrink-0">
              {expanded ? '\u25BE' : '\u25B8'}
            </span>
            <span className="text-sm font-medium text-text truncate">
              {displayTitle}
            </span>
          </div>
        </div>

        {/* Date */}
        <span className="shrink-0 text-xs text-text-muted mt-0.5">
          {formatThoughtDate(thought._creationTime)}
        </span>
      </button>

      {/* Expanded content with animation */}
      <div
        className="overflow-hidden transition-all duration-200 ease-out"
        style={{
          maxHeight: expanded ? '500px' : '0px',
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="px-4 pb-4 pl-14">
          <div className="text-sm text-text leading-relaxed whitespace-pre-line border-l-2 border-border pl-4">
            {thought.content}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThoughtsList() {
  const thoughts = useQuery(api.thoughts.list, {});
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedThought, setSelectedThought] = useState<Thought | null>(null);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (!thoughts) return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 rounded-xl bg-surface animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="max-w-none space-y-6">
      {/* List */}
      {thoughts.length === 0 ? (
        <div className="space-y-4">
          <div className="border border-dashed border-border/50 rounded-xl overflow-hidden">
            {[
              "I've been thinking about...",
              'Something that crossed my mind...',
            ].map((title, idx) => (
              <div
                key={idx}
                className="flex w-full items-start gap-3 px-4 py-3 opacity-40 border-b border-border/30 last:border-b-0"
              >
                <span className="mt-0.5 shrink-0 text-xs font-mono text-text-muted">
                  [{String(idx + 1).padStart(2, '0')}]
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted shrink-0">{'\u25B8'}</span>
                    <span className="text-sm font-medium text-text-muted italic truncate">
                      {title}
                    </span>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-text-muted mt-0.5">Today</span>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-text-muted/70">
            Record your first thought
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          {thoughts.map((thought, i) => (
            <ThoughtRow
              key={thought._id}
              thought={thought}
              index={i}
              expanded={expandedIds.has(thought._id)}
              onToggle={() => toggleExpanded(thought._id)}
              onSelect={setSelectedThought}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedThought && (
        <ThoughtDetailModal
          thought={selectedThought}
          onClose={() => setSelectedThought(null)}
        />
      )}
    </div>
  );
}
