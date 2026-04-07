'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Phase 2 / Section 6H-1 — compact tasks-page toolbar.
 *
 * Two visible buttons (Filter, View) + a small "More" chevron for everything
 * else (sort, group, density). Lives in the top-right of the tasks page.
 *
 * The popovers expose minimal but useful controls — full filter language
 * lives in the URL and the existing query string.
 */

export type TaskDensity = 'compact' | 'comfortable';
export type TaskSortBy = 'manual' | 'date' | 'title';

export interface TasksToolbarProps {
  hiddenBuckets: Set<string>;
  onToggleBucket: (key: string) => void;
  density: TaskDensity;
  onChangeDensity: (d: TaskDensity) => void;
  sortBy: TaskSortBy;
  onChangeSort: (s: TaskSortBy) => void;
}

const ALL_BUCKETS = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'dayAfter', label: 'Day after' },
  { key: 'thisWeek', label: 'Next 7 days' },
  { key: 'later', label: 'Later' },
  { key: 'noDate', label: 'No date' },
];

function useClickOutside(ref: React.RefObject<HTMLDivElement | null>, onClose: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onClose, active]);
}

function ButtonPill({ active, children, onClick, title }: { active?: boolean; children: React.ReactNode; onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors',
        active
          ? 'bg-accent/10 border-accent/40 text-accent'
          : 'bg-transparent border-border text-text-muted hover:text-text hover:border-text/40',
      )}
    >
      {children}
    </button>
  );
}

export function TasksToolbar({
  hiddenBuckets,
  onToggleBucket,
  density,
  onChangeDensity,
  sortBy,
  onChangeSort,
}: TasksToolbarProps) {
  const [open, setOpen] = useState<'filter' | 'more' | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  useClickOutside(filterRef, () => setOpen((o) => (o === 'filter' ? null : o)), open === 'filter');
  useClickOutside(moreRef, () => setOpen((o) => (o === 'more' ? null : o)), open === 'more');

  const visibleBucketCount = ALL_BUCKETS.length - hiddenBuckets.size;
  const filterLabel = hiddenBuckets.size === 0
    ? 'Filter'
    : `Filter · ${visibleBucketCount} of ${ALL_BUCKETS.length}`;

  return (
    <div className="flex items-center gap-1.5">
      {/* Filter button + popover */}
      <div className="relative" ref={filterRef}>
        <ButtonPill active={hiddenBuckets.size > 0 || open === 'filter'} onClick={() => setOpen(open === 'filter' ? null : 'filter')}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          {filterLabel}
        </ButtonPill>
        {open === 'filter' && (
          <div className="absolute z-50 right-0 mt-1 w-52 bg-surface border border-border rounded-lg shadow-2xl p-1 animate-scale-in">
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted px-3 py-2">
              Show buckets
            </div>
            {ALL_BUCKETS.map((b) => {
              const isHidden = hiddenBuckets.has(b.key);
              return (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => onToggleBucket(b.key)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text rounded-md hover:bg-surface-hover transition-colors"
                >
                  <div className={cn(
                    'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border-[1.5px]',
                    isHidden ? 'border-text-muted/40' : 'border-accent bg-accent text-white',
                  )}>
                    {!isHidden && (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  {b.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* View button — placeholder; clicking it toggles density (since we only ship the bucketed view here) */}
      <ButtonPill
        active={density === 'compact'}
        onClick={() => onChangeDensity(density === 'compact' ? 'comfortable' : 'compact')}
        title="Toggle density"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
        {density === 'compact' ? 'Compact' : 'Comfortable'}
      </ButtonPill>

      {/* More dropdown */}
      <div className="relative" ref={moreRef}>
        <ButtonPill active={open === 'more'} onClick={() => setOpen(open === 'more' ? null : 'more')} title="More options">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="5" cy="12" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
          </svg>
        </ButtonPill>
        {open === 'more' && (
          <div className="absolute z-50 right-0 mt-1 w-52 bg-surface border border-border rounded-lg shadow-2xl p-1 animate-scale-in">
            <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted px-3 py-2">
              Sort within bucket
            </div>
            {(['manual', 'date', 'title'] as const).map((s) => {
              const labels: Record<TaskSortBy, string> = { manual: 'Manual', date: 'Due date', title: 'Title' };
              const isActive = sortBy === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChangeSort(s)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md transition-colors',
                    isActive ? 'text-accent bg-accent/10' : 'text-text hover:bg-surface-hover',
                  )}
                >
                  <span className="w-3 text-center">
                    {isActive && (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                  {labels[s]}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
