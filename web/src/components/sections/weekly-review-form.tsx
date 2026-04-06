'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Id } from '@/lib/convex-api';

// ── Date helpers ─────────────────────────────────────

function getCurrentWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  // Monday of this week
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  // Sunday of this week
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday, end: sunday };
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

// ── Health status helpers ────────────────────────────

const healthStatusLabel: Record<string, string> = {
  on_track: 'on track',
  at_risk: 'at risk',
  off_track: 'off track',
  unknown: 'no data',
};

const healthStatusColor: Record<string, string> = {
  on_track: 'text-success',
  at_risk: 'text-warning',
  off_track: 'text-danger',
  unknown: 'text-text-muted',
};

// ── GoalHealthBadge ──────────────────────────────────

function GoalHealthBadge({ goalId }: { goalId: Id<"goals"> }) {
  const health = useQuery(api.goals.health, { id: goalId });
  if (!health) return <span className="text-xs text-text-muted">...</span>;
  const label = healthStatusLabel[health.status] ?? health.status;
  const color = healthStatusColor[health.status] ?? 'text-text-muted';
  return (
    <span className={`text-xs font-medium ${color}`}>
      {label} ({health.doneTasks}/{health.totalTasks})
    </span>
  );
}

// ── Props ────────────────────────────────────────────

interface WeeklyReviewFormProps {
  onSaved?: () => void;
}

// ── Main component ───────────────────────────────────

export function WeeklyReviewForm({ onSaved }: WeeklyReviewFormProps = {}) {
  const { start, end } = useMemo(() => getCurrentWeekRange(), []);
  const weekStartStr = toDateStr(start);
  const weekEndStr = toDateStr(end);

  // Pre-fill data
  const journals = useQuery(api.journals.list, { from: weekStartStr, to: weekEndStr });
  const goals = useQuery(api.goals.list, { status: 'active' });
  const createReview = useMutation(api.reviews.create);

  // Extract wins from journal entries
  const prefilledWins = useMemo(() => {
    if (!journals) return [];
    const wins: string[] = [];
    for (const entry of journals) {
      if (entry.wins && entry.wins.length > 0) {
        wins.push(...entry.wins);
      }
    }
    return wins;
  }, [journals]);

  // Form state
  const [additionalHighlights, setAdditionalHighlights] = useState('');
  const [challenges, setChallenges] = useState('');
  const [goalNotes, setGoalNotes] = useState<Record<string, string>>({});
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [p3, setP3] = useState('');
  const [score, setScore] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    const scoreNum = parseInt(score, 10);
    if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 10) return;

    setSaving(true);
    try {
      const allHighlights = [
        ...prefilledWins,
        ...additionalHighlights
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
      ];

      const goalUpdates = (goals ?? []).map((g) => ({
        goalId: g._id,
        title: g.title,
        notes: goalNotes[g._id] ?? '',
      }));

      await createReview({
        reviewType: 'weekly',
        periodStart: weekStartStr,
        periodEnd: weekEndStr,
        content: {
          highlights: allHighlights,
          challenges,
          goalUpdates,
          nextWeekPriorities: { p1, p2, p3 },
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
        <h2 className="text-lg font-bold text-text mb-1">Weekly Review Saved</h2>
        <p className="text-sm text-text-muted">
          {formatDateLong(start)} &ndash; {formatDateLong(end)}
        </p>
      </div>
    );
  }

  const isLoading = journals === undefined || goals === undefined;

  return (
    <div className="border border-border rounded-xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
          Weekly Review: {formatDateLong(start)} &ndash; {formatDateLong(end)}
        </h2>
      </div>

      {isLoading ? (
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-surface rounded-lg" />
            <div className="h-20 bg-surface rounded-lg" />
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-8">
          {/* Highlights */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted block mb-3">
              Highlights
            </label>
            {prefilledWins.length > 0 && (
              <div className="mb-3">
                <span className="text-xs text-text-muted mb-2 block">Pre-filled from journal wins this week:</span>
                <ul className="space-y-1.5">
                  {prefilledWins.map((win, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-success">
                        <polyline points="3 7 6 10 11 4" />
                      </svg>
                      <span className="text-text">{win}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <textarea
              value={additionalHighlights}
              onChange={(e) => setAdditionalHighlights(e.target.value)}
              placeholder="Add more highlights (one per line)..."
              rows={3}
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/50 resize-none"
            />
          </div>

          {/* Challenges */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted block mb-3">
              Challenges
            </label>
            <textarea
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
              placeholder="What was difficult this week?"
              rows={3}
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/50 resize-none"
            />
          </div>

          {/* Goal Updates */}
          {goals && goals.length > 0 && (
            <div>
              <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted block mb-3">
                Goal Updates
              </label>
              <span className="text-xs text-text-muted block mb-3">Pre-filled from active goals:</span>
              <div className="space-y-4">
                {goals.map((goal) => (
                  <div key={goal._id} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-sm font-medium text-text">{goal.title}</span>
                      <GoalHealthBadge goalId={goal._id} />
                    </div>
                    <textarea
                      value={goalNotes[goal._id] ?? ''}
                      onChange={(e) =>
                        setGoalNotes((prev) => ({ ...prev, [goal._id]: e.target.value }))
                      }
                      placeholder="Notes on progress..."
                      rows={2}
                      className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/50 resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Week Priorities */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted block mb-3">
              Next Week Priorities
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wide text-text-muted w-6 shrink-0">P1</span>
                <input
                  type="text"
                  value={p1}
                  onChange={(e) => setP1(e.target.value)}
                  placeholder="Most important thing next week"
                  className="flex-1 bg-surface border border-border rounded-lg px-4 py-2 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/50"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wide text-text-muted w-6 shrink-0">P2</span>
                <input
                  type="text"
                  value={p2}
                  onChange={(e) => setP2(e.target.value)}
                  placeholder="Second priority"
                  className="flex-1 bg-surface border border-border rounded-lg px-4 py-2 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/50"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wide text-text-muted w-6 shrink-0">P3</span>
                <input
                  type="text"
                  value={p3}
                  onChange={(e) => setP3(e.target.value)}
                  placeholder="Third priority"
                  className="flex-1 bg-surface border border-border rounded-lg px-4 py-2 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/50"
                />
              </div>
            </div>
          </div>

          {/* Score */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted block mb-3">
              Score (1-10)
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="How was this week?"
              className="w-24 bg-surface border border-border rounded-lg px-4 py-2 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/50"
            />
          </div>

          {/* Save */}
          <div className="pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !score || parseInt(score, 10) < 1 || parseInt(score, 10) > 10}
              className="px-6 py-2.5 text-sm font-bold uppercase tracking-wide bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Review'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
