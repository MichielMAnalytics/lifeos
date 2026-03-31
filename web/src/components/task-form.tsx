'use client';

import { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { Button } from '@/components/ui/button';

export function TaskForm({ onDone }: { onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const createTask = useMutation(api.tasks.create);

  function closeModal() {
    setOpen(false);
    setTitle('');
    setDueDate(new Date().toISOString().slice(0, 10));
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
    if (!title.trim()) return;

    setLoading(true);
    try {
      const args: { title: string; dueDate?: string; notes?: string } = {
        title: title.trim(),
      };
      if (dueDate) args.dueDate = dueDate;
      if (notes.trim()) args.notes = notes.trim();

      await createTask(args);

      closeModal();
      onDone?.();
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        + New Task
      </Button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start pt-4 md:pt-[12vh] justify-center bg-black/60 backdrop-blur-[2px]"
      onClick={closeModal}
    >
      <div
        className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 md:mx-auto p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">New Task</h2>
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
          <input
            type="text"
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
          />

          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          />

          <textarea
            placeholder="Description (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
          />

          <div className="flex gap-2">
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? 'Adding...' : 'Add Task'}
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
