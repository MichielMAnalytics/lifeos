'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function TaskActions({
  taskId,
  currentStatus,
}: {
  taskId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleComplete() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      });
      if (!res.ok) throw new Error('Failed to complete task');
      router.refresh();
    } catch (err) {
      console.error('Failed to complete task:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this task?')) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete task');
      router.push('/tasks');
      router.refresh();
    } catch (err) {
      console.error('Failed to delete task:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2 shrink-0">
      {currentStatus === 'todo' && (
        <Button
          variant="secondary"
          onClick={handleComplete}
          disabled={loading}
        >
          Complete
        </Button>
      )}
      <Button variant="danger" onClick={handleDelete} disabled={loading}>
        Delete
      </Button>
    </div>
  );
}
