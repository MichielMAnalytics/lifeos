'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function IdeaForm() {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [actionability, setActionability] = useState<string>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/v1/ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), actionability }),
      });

      if (!res.ok) {
        throw new Error(`Failed to create idea: ${res.status}`);
      }

      setContent('');
      setActionability('medium');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
        rows={3}
        className="w-full resize-none rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
      />

      <div className="flex items-center gap-3">
        <select
          value={actionability}
          onChange={(e) => setActionability(e.target.value)}
          className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text focus:border-accent focus:outline-none"
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <Button type="submit" disabled={submitting || !content.trim()}>
          {submitting ? 'Adding...' : 'Add Idea'}
        </Button>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}
