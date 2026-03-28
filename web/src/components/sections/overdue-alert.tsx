'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import Link from 'next/link';

export function OverdueAlert() {
  const overdueTasks = useQuery(api.tasks.list, { status: 'todo', due: 'overdue' });

  if (overdueTasks === undefined) {
    return null;
  }

  if (overdueTasks.length === 0) {
    return null;
  }

  return (
    <div className="border border-danger/40 rounded-xl px-6 py-4 flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-danger">
          {overdueTasks.length} overdue task{overdueTasks.length !== 1 ? 's' : ''}
        </p>
        <p className="text-xs text-text-muted truncate mt-1">
          {overdueTasks.slice(0, 3).map((t) => t.title).join(', ')}
          {overdueTasks.length > 3 && ` +${overdueTasks.length - 3} more`}
        </p>
      </div>
      <Link
        href="/tasks?filter=overdue"
        className="shrink-0 bg-white text-black px-4 py-2 text-xs font-medium uppercase tracking-wide hover:bg-white/90 transition-colors"
      >
        View all
      </Link>
    </div>
  );
}
