'use client';

import { useState, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Doc } from '@/lib/convex-api';
import { SidePeek } from '@/components/side-peek';

export function ThoughtDetailModal({
  thought,
  onClose,
}: {
  thought: Doc<'thoughts'>;
  onClose: () => void;
}) {
  const removeThought = useMutation(api.thoughts.remove);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = useCallback(async () => {
    try {
      await removeThought({ id: thought._id });
      onClose();
    } catch (err) {
      console.error('Failed to delete thought:', err);
    }
  }, [removeThought, thought._id, onClose]);

  const createdDate = new Date(thought._creationTime).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const displayTitle = thought.title && thought.title.trim().length > 0
    ? thought.title
    : null;

  return (
    <SidePeek open={true} onClose={onClose} title="Thought">
      <div className="px-8 py-6">
        {/* Title */}
        {displayTitle && (
          <h1 className="text-2xl font-bold text-text mb-6">
            {displayTitle}
          </h1>
        )}

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

        {/* Content */}
        <div className="text-sm text-text leading-relaxed whitespace-pre-wrap">
          {thought.content}
        </div>

        {/* Delete */}
        <div className="border-t border-border/40 mt-8 pt-4">
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full text-center text-xs text-text-muted hover:text-danger py-2 rounded-lg hover:bg-surface-hover transition-colors"
            >
              Delete thought
            </button>
          ) : (
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
          )}
        </div>
      </div>
    </SidePeek>
  );
}
