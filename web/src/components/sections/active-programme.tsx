'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';

export function ActiveProgramme() {
  const programmes = useQuery(api.programmes.list, { status: 'active' });

  if (programmes === undefined) {
    return <div className="animate-pulse h-32 bg-surface rounded-lg" />;
  }

  const active = programmes[0];

  if (!active) {
    return (
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="flex items-baseline justify-between px-6 py-4 border-b border-border">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
            Active Programme
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-text-muted">No active programme</p>
          <p className="text-xs text-text-muted mt-1">Create one via CLI or dashboard</p>
        </div>
      </div>
    );
  }

  // Compute current week from start date
  const now = new Date();
  const start = new Date(active.startDate);
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const currentWeek = Math.max(1, Math.ceil((diffDays + 1) / 7));

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-baseline justify-between px-6 py-4 border-b border-border">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
          Active Programme
        </h2>
        <span className="text-xs text-text-muted">
          Week {currentWeek}
        </span>
      </div>
      <div className="px-6 py-5 space-y-3">
        <h3 className="text-base font-semibold text-text">
          {active.title}
        </h3>
        {active.description && (
          <p className="text-sm text-text-muted leading-relaxed">
            {active.description}
          </p>
        )}
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span>Started {active.startDate}</span>
          {active.endDate && <span>Ends {active.endDate}</span>}
        </div>
      </div>
    </div>
  );
}
