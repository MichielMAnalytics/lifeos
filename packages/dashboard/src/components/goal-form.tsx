'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function GoalForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [quarter, setQuarter] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const body: Record<string, string> = { title: title.trim() };
      if (description.trim()) body.description = description.trim();
      if (targetDate) body.target_date = targetDate;
      if (quarter) body.quarter = quarter;

      const res = await fetch(`${API_URL}/api/v1/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to create goal');

      setTitle('');
      setDescription('');
      setTargetDate('');
      setQuarter('');
      setOpen(false);
      router.refresh();
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
