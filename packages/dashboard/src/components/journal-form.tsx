'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function JournalForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mit, setMit] = useState('');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [notes, setNotes] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const body: Record<string, string> = {};
      if (mit.trim()) body.mit = mit.trim();
      if (p1.trim()) body.p1 = p1.trim();
      if (p2.trim()) body.p2 = p2.trim();
      if (notes.trim()) body.notes = notes.trim();

      const res = await fetch(`${API_URL}/api/v1/journal/${todayISO()}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to save journal');

      setMit('');
      setP1('');
      setP2('');
      setNotes('');
      setOpen(false);
      router.refresh();
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
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-surface p-4 space-y-3"
    >
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
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
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
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
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
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
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
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Entry'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setMit('');
            setP1('');
            setP2('');
            setNotes('');
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
