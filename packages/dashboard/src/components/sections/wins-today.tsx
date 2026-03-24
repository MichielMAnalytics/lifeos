'use client';

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function WinsToday() {
  const todayStr = todayISO();
  const wins = useQuery(api.wins.list, { from: todayStr, to: todayStr });

  if (wins === undefined) {
    return <div className="animate-pulse h-32 bg-surface rounded-lg" />;
  }

  return (
    <div className="border border-border flex flex-col">
      <div className="flex items-baseline justify-between px-6 py-4 border-b border-border">
        <h2 className="text-sm font-bold text-text uppercase tracking-wide">
          Wins
        </h2>
        <span className="text-xs text-text-muted">[ {wins.length} ]</span>
      </div>
      {wins.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-text-muted">No wins recorded today</p>
          <p className="text-xs text-text-muted/60 mt-1">Use quick capture to log a win</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {wins.map((win, i: number) => (
            <div
              key={win._id}
              className="flex items-start gap-4 px-6 py-4"
            >
              <span className="text-xs font-mono text-text-muted w-6 shrink-0 mt-0.5">
                [{String(i + 1).padStart(2, '0')}]
              </span>
              <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-success shrink-0 mt-0.5"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="flex-1 text-sm text-success/80 leading-relaxed">
                {win.content}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
