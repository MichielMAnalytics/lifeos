'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Doc } from '@/lib/convex-api';

export function ThoughtDetailModal({
  thought,
  onClose,
}: {
  thought: Doc<'thoughts'>;
  onClose: () => void;
}) {
  const removeThought = useMutation(api.thoughts.remove);

  const [confirmDelete, setConfirmDelete] = useState(false);

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
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleDelete = useCallback(async () => {
    try {
      await removeThought({ id: thought._id });
      onClose();
    } catch (err) {
      console.error('Failed to delete thought:', err);
    }
  }, [removeThought, thought._id, onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const createdDate = new Date(thought._creationTime).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const displayTitle = thought.title && thought.title.trim().length > 0
    ? thought.title
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div
        className="rounded-2xl bg-surface border border-border shadow-2xl max-w-lg w-full mx-4 flex flex-col max-h-[80vh] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-end px-4 py-3 border-b border-border/50">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {/* Title */}
          {displayTitle && (
            <h2 className="text-lg font-semibold text-text">{displayTitle}</h2>
          )}

          {/* Content */}
          <div className="text-sm text-text leading-relaxed whitespace-pre-wrap">
            {thought.content}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between">
          {/* Created date */}
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 shrink-0">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{createdDate}</span>
          </div>

          {/* Delete */}
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-text-muted hover:text-danger py-1.5 px-3 rounded-lg hover:bg-surface-hover transition-colors"
            >
              Delete
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                className="text-xs font-medium text-danger bg-danger/10 hover:bg-danger/20 py-1.5 px-3 rounded-lg transition-colors"
              >
                Confirm
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
    </div>
  );
}
