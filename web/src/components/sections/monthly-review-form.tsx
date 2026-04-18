'use client';

// Monthly review — calendar-anchored. Pre-fills highlights from wins logged
// inside the current calendar month (e.g. April 1 – April 30).

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';

interface MonthRange {
  start: Date;
  end: Date;
  label: string; // "April 2026"
}

function currentMonthRange(): MonthRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const label = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return { start, end, label };
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateLong(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface MonthlyReviewFormProps {
  /** Reflect on this specific month. Defaults to the most recently closed
   * calendar month. */
  monthStart?: Date;
  monthEnd?: Date;
  onSaved?: () => void;
  onCancel?: () => void;
}

function monthFromDate(d: Date): MonthRange {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const label = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return { start, end, label };
}

export function MonthlyReviewForm({
  monthStart,
  monthEnd,
  onSaved,
  onCancel,
}: MonthlyReviewFormProps = {}) {
  const month = useMemo(() => {
    if (monthStart) return monthFromDate(monthStart);
    return currentMonthRange();
  }, [monthStart]);
  void monthEnd;
  const startStr = toDateStr(month.start);
  const endStr = toDateStr(month.end);

  const allWins = useQuery(api.wins.list, {});
  const journals = useQuery(api.journals.list, {});
  const createReview = useMutation(api.reviews.create);

  const monthWins = useMemo(() => {
    const set = new Set<string>();
    if (allWins) {
      for (const w of allWins) {
        if (w.entryDate >= startStr && w.entryDate <= endStr) set.add(w.content);
      }
    }
    if (journals) {
      for (const j of journals) {
        if (j.entryDate >= startStr && j.entryDate <= endStr && j.wins) {
          for (const w of j.wins) set.add(w);
        }
      }
    }
    return Array.from(set);
  }, [allWins, journals, startStr, endStr]);

  const [additionalHighlights, setAdditionalHighlights] = useState('');
  const [challenges, setChallenges] = useState('');
  const [nextMonthFocus, setNextMonthFocus] = useState('');
  const [score, setScore] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const scoreNum = parseInt(score, 10);
  const canSave = !isNaN(scoreNum) && scoreNum >= 1 && scoreNum <= 10;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const allHighlights = [
        ...monthWins,
        ...additionalHighlights
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
      ];

      await createReview({
        reviewType: 'monthly',
        periodStart: startStr,
        periodEnd: endStr,
        content: {
          monthLabel: month.label,
          highlights: allHighlights,
          challenges: challenges.trim(),
          nextMonthFocus: nextMonthFocus.trim(),
        },
        score: scoreNum,
      });

      setSaved(true);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="border border-border rounded-xl p-8 text-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-success">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <h2 className="text-lg font-bold text-text mb-1">Monthly Review Saved</h2>
        <p className="text-sm text-text-muted">
          {month.label}: {formatDateLong(month.start)} &ndash; {formatDateLong(month.end)}
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-text">Monthly Review · {month.label}</h2>
        <p className="text-xs text-text-muted mt-0.5">
          {formatDateLong(month.start)} – {formatDateLong(month.end)}
        </p>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted block mb-3">
            Highlights
          </label>
          {monthWins.length > 0 && (
            <div className="mb-3">
              <span className="text-xs text-text-muted block mb-2">
                Pre-filled from {monthWins.length} win{monthWins.length !== 1 ? 's' : ''} logged this month:
              </span>
              <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                {monthWins.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-success">
                      <polyline points="3 7 6 10 11 4" />
                    </svg>
                    <span className="text-text">{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <textarea
            value={additionalHighlights}
            onChange={(e) => setAdditionalHighlights(e.target.value)}
            placeholder="Add more highlights (one per line)…"
            rows={3}
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/60 resize-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted block mb-3">
            Challenges
          </label>
          <textarea
            value={challenges}
            onChange={(e) => setChallenges(e.target.value)}
            placeholder="What was difficult this month?"
            rows={3}
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/60 resize-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted block mb-3">
            Focus for next month
          </label>
          <textarea
            value={nextMonthFocus}
            onChange={(e) => setNextMonthFocus(e.target.value)}
            placeholder="What deserves your attention next?"
            rows={3}
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/60 resize-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted block mb-3">
            Score (1–10)
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="—"
            className="w-24 bg-surface border border-border rounded-lg px-4 py-2 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/60"
          />
        </div>
      </div>

      <div className="px-6 py-4 border-t border-border flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-medium text-text-muted hover:text-text transition-colors px-3 py-1.5"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !canSave}
          className="px-5 py-2 text-xs font-bold uppercase tracking-wide bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save Monthly Review'}
        </button>
      </div>
    </div>
  );
}
