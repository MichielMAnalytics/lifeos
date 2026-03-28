'use client';

import { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { Button } from '@/components/ui/button';

export function IdeaForm() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [actionability, setActionability] = useState<string>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createIdea = useMutation(api.ideas.create);

  function closeModal() {
    setOpen(false);
    setContent('');
    setActionability('medium');
    setError(null);
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

    setSubmitting(true);
    setError(null);

    try {
      await createIdea({
        content: content.trim(),
        actionability,
      });

      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        + Add Idea
      </Button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start pt-[12vh] justify-center bg-black/50"
      onClick={closeModal}
    >
      <div
        className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">New Idea</h2>
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
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={3}
            autoFocus
            className="w-full resize-none rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
          />

          <div className="flex items-center gap-3">
            <select
              value={actionability}
              onChange={(e) => setActionability(e.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-text focus:border-accent focus:outline-none"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <Button type="submit" disabled={submitting || !content.trim()}>
              {submitting ? 'Adding...' : 'Add Idea'}
            </Button>
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}
        </form>
      </div>
    </div>
  );
}
