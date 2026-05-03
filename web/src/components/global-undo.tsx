'use client';

import { useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { useToast } from '@/components/toast';

const ACTION_LABEL: Record<string, string> = {
  create: 'creation',
  update: 'change',
  complete: 'completion',
  delete: 'deletion',
};

function describe(action: string, tableName: string): string {
  for (const key of Object.keys(ACTION_LABEL)) {
    if (action === key || action.startsWith(`${key}_`)) {
      return `${tableName} ${ACTION_LABEL[key]}`;
    }
  }
  return `${tableName} ${action}`;
}

/**
 * Global Cmd+Z / Ctrl+Z handler that calls the mutationLog undo mutation.
 * Skips when focus is in an input, textarea, or contenteditable element so
 * users can still undo within form fields. Surfaces success/error via toast.
 */
export function GlobalUndo() {
  const undo = useMutation(api.mutationLog.undo);
  const toast = useToast();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isUndoCombo =
        (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key === 'z';
      if (!isUndoCombo) return;

      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
      }

      e.preventDefault();
      void undo()
        .then((result) => {
          if (result && typeof result === 'object' && 'undone' in result && 'table' in result) {
            toast.show(`Undone ${describe(String(result.undone), String(result.table))}`, 'success');
          } else {
            toast.show('Undone', 'success');
          }
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Undo failed';
          // "No mutations to undo" is the empty-stack signal; show a softer toast.
          if (/no mutations/i.test(msg)) {
            toast.show('Nothing to undo', 'info');
          } else {
            toast.show(msg, 'error');
          }
        });
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [undo, toast]);

  return null;
}
