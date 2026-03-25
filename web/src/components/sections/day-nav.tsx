'use client';

import { useTodayDate } from '@/lib/today-date-context';

function formatNavDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function DayNav() {
  const { date, goPrev, goNext, goToday, isToday } = useTodayDate();

  return (
    <div className="border-b border-border pb-4">
      <div className="flex items-center justify-center gap-6">
        {/* Previous day */}
        <button
          onClick={goPrev}
          className="flex items-center gap-1.5 text-xs text-text-muted uppercase tracking-wide transition-colors hover:text-text"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Yesterday
        </button>

        {/* Current date */}
        <span className="font-mono text-sm font-bold text-text tracking-wide">
          [ {formatNavDate(date)} ]
        </span>

        {/* Next day */}
        <button
          onClick={goNext}
          className="flex items-center gap-1.5 text-xs text-text-muted uppercase tracking-wide transition-colors hover:text-text"
        >
          Tomorrow
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Snap-back button (only when not on today) */}
      {!isToday && (
        <div className="flex justify-center mt-3">
          <button
            onClick={goToday}
            className="border border-accent/40 px-3 py-1 text-xs font-bold text-accent uppercase tracking-wide transition-colors hover:bg-accent/10"
          >
            Back to Today
          </button>
        </div>
      )}
    </div>
  );
}
