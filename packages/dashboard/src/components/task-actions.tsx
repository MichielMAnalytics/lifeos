'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { Button } from '@/components/ui/button';
import type { Id } from '../../../../convex/_generated/dataModel';

export function TaskActions({
  taskId,
  currentStatus,
}: {
  taskId: Id<"tasks">;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const completeTask = useMutation(api.tasks.complete);
  const removeTask = useMutation(api.tasks.remove);

  async function handleComplete() {
    setLoading(true);
    try {
      await completeTask({ id: taskId });
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
      await removeTask({ id: taskId });
      router.push('/tasks');
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
