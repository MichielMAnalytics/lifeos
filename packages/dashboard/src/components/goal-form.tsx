'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { Button } from '@/components/ui/button';

export function GoalForm({ onDone }: { onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [quarter, setQuarter] = useState('');

  const createGoal = useMutation(api.goals.create);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const args: { title: string; description?: string; targetDate?: string; quarter?: string } = {
        title: title.trim(),
      };
      if (description.trim()) args.description = description.trim();
      if (targetDate) args.targetDate = targetDate;
      if (quarter) args.quarter = quarter;

      await createGoal(args);

      setTitle('');
      setDescription('');
      setTargetDate('');
      setQuarter('');
      setOpen(false);
      onDone?.();
    } catch (err) {
      console.error('Failed to create goal:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        + New Goal
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-surface p-4 space-y-3"
    >
      <input
        type="text"
        placeholder="Goal title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
      />

      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
      />

      <div className="grid grid-cols-2 gap-3">
        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          placeholder="Target date"
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
        />
        <select
          value={quarter}
          onChange={(e) => setQuarter(e.target.value)}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
        >
          <option value="">Quarter (optional)</option>
          <option value="2026-Q1">2026-Q1</option>
          <option value="2026-Q2">2026-Q2</option>
          <option value="2026-Q3">2026-Q3</option>
          <option value="2026-Q4">2026-Q4</option>
        </select>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading || !title.trim()}>
          {loading ? 'Creating...' : 'Create Goal'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setTitle('');
            setDescription('');
            setTargetDate('');
            setQuarter('');
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
