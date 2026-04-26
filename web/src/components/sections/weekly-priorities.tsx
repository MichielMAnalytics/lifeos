'use client';

// Weekly priorities — surfaces the P1/P2/P3 the user committed to during
// their most recent weekly review (`reviews.content.nextWeekPriorities`).
// Read-only: the source of truth is the review row; users edit by writing
// a new weekly review. Hidden when no weekly review exists yet.

import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';

interface NextWeekPriorities {
  p1?: string;
  p2?: string;
  p3?: string;
}

/**
 * 1..7 indicator (Mon..Sun) for where today sits within the week the
 * priorities were set for. Returns null if today is outside that week —
 * in that case the priorities are stale and the header label degrades to
 * "set in last weekly review" without a day badge.
 */
function dayOfWeekIndex(): { day: number; total: 7 } | null {
  const now = new Date();
  const day = now.getDay(); // 0=Sun..6=Sat
  // ISO-like Monday=1..Sunday=7
  const idx = day === 0 ? 7 : day;
  return { day: idx, total: 7 };
}

export function WeeklyPriorities() {
  // Bounded short-circuit query — stops at the first weekly review found
  // in desc creation order. Avoids the full-history scan that
  // `reviews.list({ reviewType: 'weekly' })` would do on the Today page.
  const latest = useQuery(api.reviews.latestOfType, { reviewType: 'weekly' });

  if (latest === undefined) {
    return (
      <div className="rounded-xl border border-border bg-surface px-5 py-3 animate-pulse">
        <div className="h-3 w-32 bg-bg-subtle rounded" />
      </div>
    );
  }
  if (!latest) return null;

  const content = (latest.content ?? null) as { nextWeekPriorities?: NextWeekPriorities } | null;
  const priorities = content?.nextWeekPriorities;
  if (!priorities) return null;

  const items: { label: string; text: string | undefined }[] = [
    { label: 'P1', text: priorities.p1 },
    { label: 'P2', text: priorities.p2 },
    { label: 'P3', text: priorities.p3 },
  ].filter((p): p is { label: string; text: string } => Boolean(p.text?.trim()));
  if (items.length === 0) return null;

  const dayIndex = dayOfWeekIndex();

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex items-baseline justify-between px-5 py-2.5 border-b border-border">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/80">
          This week
        </h3>
        {dayIndex ? (
          <span className="text-[10px] text-text-muted/70 tabular-nums">
            Day {dayIndex.day} of {dayIndex.total}
          </span>
        ) : (
          <span className="text-[10px] text-text-muted/70">
            set in last weekly review
          </span>
        )}
      </div>
      <div className="px-5 py-2.5 space-y-1">
        {items.map((p) => (
          <div key={p.label} className="flex items-baseline gap-2.5 text-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted/80 w-5 shrink-0 tabular-nums">
              {p.label}
            </span>
            <span className="text-text">{p.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
