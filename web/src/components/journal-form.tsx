'use client';

import { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { Button } from '@/components/ui/button';

function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function JournalForm({ onDone }: { onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mit, setMit] = useState('');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [notes, setNotes] = useState('');

  const upsertJournal = useMutation(api.journals.upsert);

  function closeModal() {
    setOpen(false);
    setMit('');
    setP1('');
    setP2('');
    setNotes('');
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
    setLoading(true);

    try {
      const args: { date: string; mit?: string; p1?: string; p2?: string; notes?: string } = {
        date: todayISO(),
      };
      if (mit.trim()) args.mit = mit.trim();
      if (p1.trim()) args.p1 = p1.trim();
      if (p2.trim()) args.p2 = p2.trim();
      if (notes.trim()) args.notes = notes.trim();

      await upsertJournal(args);

      closeModal();
      onDone?.();
    } catch (err) {
      console.error('Failed to save journal:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        + Write Today&apos;s Entry
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
          <h2 className="text-sm font-semibold text-text">Today&apos;s Journal Entry</h2>
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
              MIT (Most Important Task)
            </label>
            <input
              type="text"
              placeholder="What is the one thing you must do today?"
              value={mit}
              onChange={(e) => setMit(e.target.value)}
              autoFocus
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              P1 (Priority 1)
            </label>
            <input
              type="text"
              placeholder="Second priority"
              value={p1}
              onChange={(e) => setP1(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              P2 (Priority 2)
            </label>
            <input
              type="text"
              placeholder="Third priority"
              value={p2}
              onChange={(e) => setP2(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              Notes
            </label>
            <textarea
              placeholder="Thoughts, reflections, anything..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Entry'}
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
