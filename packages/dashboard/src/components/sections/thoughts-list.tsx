'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { Button } from '@/components/ui/button';
import type { Doc } from '../../../../../convex/_generated/dataModel';

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
      setTitle('');
      setContent('');
      setOpen(false);
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
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-surface p-4 space-y-3"
    >
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
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
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
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading || !content.trim()}>
          {loading ? 'Saving...' : 'Save Thought'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setTitle('');
            setContent('');
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ThoughtRow({
  thought,
  index,
  expanded,
  onToggle,
}: {
  thought: Thought;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const displayTitle = getDisplayTitle(thought);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface/50"
      >
        {/* Index badge */}
        <span className="mt-0.5 shrink-0 text-xs font-mono text-text-muted">
          [{String(index + 1).padStart(2, '0')}]
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
          {!expanded && (
            <p className="mt-0.5 ml-5 text-xs text-text-muted">Click to expand</p>
          )}
        </div>

        {/* Date */}
        <span className="shrink-0 text-xs text-text-muted mt-0.5">
          {formatThoughtDate(thought._creationTime)}
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 pl-14">
          <div className="text-sm text-text leading-relaxed whitespace-pre-line border-l-2 border-border pl-4">
            {thought.content}
          </div>
        </div>
      )}
    </div>
  );
}

export function ThoughtsList() {
  const thoughts = useQuery(api.thoughts.list, {});
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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

  if (!thoughts) return <div className="text-text-muted">Loading...</div>;

  return (
    <div className="max-w-none space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-text">
          Thoughts{' '}
          <span className="text-text-muted font-normal">[ {thoughts.length} ]</span>
        </h1>
        <ThoughtAddForm />
      </div>

      {/* List */}
      {thoughts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-base font-medium text-text">No thoughts yet</p>
          <p className="mt-1 text-sm text-text-muted">
            Capture what is on your mind.
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          {thoughts.map((thought, i) => (
            <ThoughtRow
              key={thought._id}
              thought={thought}
              index={i}
              expanded={expandedIds.has(thought._id)}
              onToggle={() => toggleExpanded(thought._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
