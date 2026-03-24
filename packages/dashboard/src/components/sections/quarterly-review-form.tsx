'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';

// ── Date helpers ─────────────────────────────────────

function getCurrentQuarterRange(): { start: Date; end: Date; label: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  let startMonth: number;
  let quarterNum: number;

  if (month < 3) {
    startMonth = 0;
    quarterNum = 1;
  } else if (month < 6) {
    startMonth = 3;
    quarterNum = 2;
  } else if (month < 9) {
    startMonth = 6;
    quarterNum = 3;
  } else {
    startMonth = 9;
    quarterNum = 4;
  }

  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0); // last day of quarter
  return { start, end, label: `Q${quarterNum} ${year}` };
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

// ── Main component ───────────────────────────────────

export function QuarterlyReviewForm() {
  const quarter = useMemo(() => getCurrentQuarterRange(), []);
  const quarterStartStr = toDateStr(quarter.start);
  const quarterEndStr = toDateStr(quarter.end);

  // Fetch weekly reviews from this quarter to aggregate highlights
  const allReviews = useQuery(api.reviews.list, { reviewType: 'weekly' });
  const allGoals = useQuery(api.goals.list, {});
  const createReview = useMutation(api.reviews.create);

  // Aggregate highlights from weekly reviews in this quarter
  const { weeklyHighlights, weeklyCount } = useMemo(() => {
    if (!allReviews) return { weeklyHighlights: [], weeklyCount: 0 };
    const quarterReviews = allReviews.filter(
      (r) => r.periodStart >= quarterStartStr && r.periodEnd <= quarterEndStr,
    );
    const highlights: string[] = [];
    for (const r of quarterReviews) {
      const content = r.content as Record<string, unknown> | null;
      if (content && Array.isArray(content.highlights)) {
        for (const h of content.highlights) {
          if (typeof h === 'string') highlights.push(h);
        }
      }
    }
    return { weeklyHighlights: highlights, weeklyCount: quarterReviews.length };
  }, [allReviews, quarterStartStr, quarterEndStr]);

  // Goals completed this quarter
  const completedGoals = useMemo(() => {
    if (!allGoals) return [];
    return allGoals.filter((g) => {
      if (g.status !== 'completed') return false;
      // Check if completedAt falls within the quarter
      if (g.completedAt) {
        const completedDate = new Date(g.completedAt);
        return completedDate >= quarter.start && completedDate <= quarter.end;
      }
      // Fallback: check quarter field
      return g.quarter === quarter.label.replace(' ', '-');
    });
  }, [allGoals, quarter]);

  // Active goals (still in progress)
  const activeGoals = useMemo(() => {
    if (!allGoals) return [];
    return allGoals.filter((g) => g.status === 'active');
  }, [allGoals]);

  // Form state
  const [summary, setSummary] = useState('');
  const [additionalAchievements, setAdditionalAchievements] = useState('');
  const [whatDidntWork, setWhatDidntWork] = useState('');
  const [nextQuarterGoals, setNextQuarterGoals] = useState('');
  const [score, setScore] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    const scoreNum = parseInt(score, 10);
    if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 10) return;

    setSaving(true);
    try {
      const achievements = [
        ...weeklyHighlights,
        ...additionalAchievements
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
      ];

      await createReview({
        reviewType: 'quarterly',
        periodStart: quarterStartStr,
        periodEnd: quarterEndStr,
        content: {
          quarterLabel: quarter.label,
          summary,
          achievements,
          completedGoals: completedGoals.map((g) => ({ id: g._id, title: g.title })),
          whatDidntWork,
          nextQuarterGoals: nextQuarterGoals
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean),
          weeklyReviewCount: weeklyCount,
        },
        score: scoreNum,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="border border-border p-8 text-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-success">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <h2 className="text-lg font-bold text-text mb-1">Quarterly Review Saved</h2>
        <p className="text-sm text-text-muted">
          {quarter.label}: {formatDateLong(quarter.start)} &ndash; {formatDateLong(quarter.end)}
        </p>
      </div>
    );
  }

  const isLoading = allReviews === undefined || allGoals === undefined;

  return (
    <div className="border border-border">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-sm font-bold text-text uppercase tracking-wide">
          Quarterly Review: {quarter.label}
        </h2>
        <p className="text-xs text-text-muted mt-1">
          {formatDateLong(quarter.start)} &ndash; {formatDateLong(quarter.end)}
        </p>
      </div>

      {isLoading ? (
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-surface rounded" />
            <div className="h-20 bg-surface rounded" />
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-8">
          {/* Quarter Summary */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted block mb-3">
              Quarter Summary
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="How would you summarize this quarter?"
              rows={4}
              className="w-full bg-surface border border-border px-4 py-3 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-accent/50 resize-none"
            />
          </div>

          {/* Achievements (pre-filled from weekly reviews) */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted block mb-3">
              Achievements
            </label>
            {weeklyHighlights.length > 0 && (
              <div className="mb-3">
                <span className="text-xs text-text-muted mb-2 block">
                  Pre-filled from {weeklyCount} weekly review{weeklyCount !== 1 ? 's' : ''}:
                </span>
                <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                  {weeklyHighlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-success">
                        <polyline points="3 7 6 10 11 4" />
                      </svg>
                      <span className="text-text">{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <textarea
              value={additionalAchievements}
              onChange={(e) => setAdditionalAchievements(e.target.value)}
              placeholder="Add more achievements (one per line)..."
              rows={3}
              className="w-full bg-surface border border-border px-4 py-3 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-accent/50 resize-none"
            />
          </div>

          {/* Goals Completed This Quarter */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted block mb-3">
              Goals Completed This Quarter
            </label>
            {completedGoals.length > 0 ? (
              <ul className="space-y-1.5 mb-3">
                {completedGoals.map((g) => (
                  <li key={g._id} className="flex items-start gap-2 text-sm">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-success">
                      <polyline points="3 7 6 10 11 4" />
                    </svg>
                    <span className="text-text">{g.title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-muted mb-3">No goals completed this quarter yet.</p>
            )}
            {activeGoals.length > 0 && (
              <div>
                <span className="text-xs text-text-muted block mb-2">Still active:</span>
                <ul className="space-y-1.5">
                  {activeGoals.map((g) => (
                    <li key={g._id} className="flex items-start gap-2 text-sm">
                      <svg width="14" height="14" viewBox="0 0 14 14" className="mt-0.5 shrink-0 text-text-muted">
                        <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1" />
                      </svg>
                      <span className="text-text-muted">{g.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* What Didn't Work */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted block mb-3">
              What Didn&apos;t Work
            </label>
            <textarea
              value={whatDidntWork}
              onChange={(e) => setWhatDidntWork(e.target.value)}
              placeholder="What would you do differently?"
              rows={3}
              className="w-full bg-surface border border-border px-4 py-3 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-accent/50 resize-none"
            />
          </div>

          {/* Next Quarter Goals */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted block mb-3">
              Goals for Next Quarter
            </label>
            <textarea
              value={nextQuarterGoals}
              onChange={(e) => setNextQuarterGoals(e.target.value)}
              placeholder="What do you want to achieve next quarter? (one per line)"
              rows={4}
              className="w-full bg-surface border border-border px-4 py-3 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-accent/50 resize-none"
            />
          </div>

          {/* Score */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted block mb-3">
              Score (1-10)
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="Rate this quarter"
              className="w-24 bg-surface border border-border px-4 py-2 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-accent/50"
            />
          </div>

          {/* Save */}
          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !score || parseInt(score, 10) < 1 || parseInt(score, 10) > 10}
              className="px-6 py-2.5 text-sm font-bold uppercase tracking-wide bg-accent text-bg hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Quarterly Review'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
