'use client';

import { useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';

/**
 * Global Cmd+Z / Ctrl+Z handler that calls the mutationLog undo mutation.
 * No toast, no UI — just the keyboard shortcut working everywhere.
 *
 * Skips when focus is in an input, textarea, or contenteditable element so
 * users can still undo within form fields.
 *
 * Section 18P pick — see inspiration.html.
 */
export function GlobalUndo() {
  const undo = useMutation(api.mutationLog.undo);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+Z on macOS, Ctrl+Z elsewhere. Skip if Shift is held (that's redo).
      const isUndoCombo =
        (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key === 'z';
      if (!isUndoCombo) return;

      // Don't intercept undo when focus is in an editable field — let the
      // browser's native text undo run.
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return;
        }
      }

      e.preventDefault();
      void undo().catch(() => {
        // Silent failure — "no mutations to undo" is normal and shouldn't toast.
      });
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [undo]);

  return null;
}
