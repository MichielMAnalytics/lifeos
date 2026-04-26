'use client';

// Weekly Review form — Review → Reflect → Plan flow.
//
// Three sections, in the order the user sees them on Sunday:
//
// 1. REVIEW (read-only, auto-pulled): last week's three priorities they
//    committed to (from the previous weekly review's nextWeekPriorities),
//    wins logged this week (from journals + wins table), active quarterly
//    goals as cascade context.
// 2. REFLECT (3 short text fields): what worked / what didn't / lesson.
//    Replaces the older "highlights + challenges + per-goal-notes" form,
//    which was too heavy and didn't drive useful reflection.
// 3. PLAN (P1/P2/P3 + score): same priorities the WeeklyPriorities Today
//    section reads from, so saving here propagates to the dashboard
//    immediately.
//
// The OpenClaw `weekly-review` skill writes the SAME content shape so a
// review created via the Telegram voice flow renders identically to one
// filled in from this form.

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';

// ── Date helpers ─────────────────────────────────────

function getCurrentWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
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

function weekFromMonday(monday: Date): { start: Date; end: Date } {
  const start = new Date(monday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function currentQuarter(): string {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) + 1;
  return `${now.getFullYear()}-Q${q}`;
}

// ── Props ────────────────────────────────────────────

interface WeeklyReviewFormProps {
  /** Reflect on this specific week (Monday). Defaults to the current week. */
  weekStart?: Date;
  weekEnd?: Date;
  onSaved?: () => void;
}

interface NextWeekPriorities {
  p1?: string;
  p2?: string;
  p3?: string;
}

// ── Main component ───────────────────────────────────

export function WeeklyReviewForm({ weekStart, weekEnd, onSaved }: WeeklyReviewFormProps = {}) {
  const { start, end } = useMemo(() => {
    if (weekStart) return weekFromMonday(weekStart);
    return getCurrentWeekRange();
  }, [weekStart]);
  void weekEnd;
  const weekStartStr = toDateStr(start);
  const weekEndStr = toDateStr(end);

  // ── Pre-fill data ────────────────────────────────────

  // Last week's review — gives us the priorities the user committed to.
  const lastReview = useQuery(api.reviews.latestOfType, { reviewType: 'weekly' });
  const lastPriorities: NextWeekPriorities | null = useMemo(() => {
    if (!lastReview) return null;
    const c = (lastReview.content ?? null) as { nextWeekPriorities?: NextWeekPriorities } | null;
    return c?.nextWeekPriorities ?? null;
  }, [lastReview]);

  // Wins from this week's journal entries + the wins table.
  const journals = useQuery(api.journals.list, { from: weekStartStr, to: weekEndStr });
  const winsThisWeek = useQuery(api.wins.list, { from: weekStartStr, to: weekEndStr });
  const allWins = useMemo(() => {
    const out: string[] = [];
    if (journals) {
      for (const j of journals) if (j.wins) out.push(...j.wins);
    }
    if (winsThisWeek) {
      for (const w of winsThisWeek) out.push(w.content);
    }
    return out;
  }, [journals, winsThisWeek]);

  // Active goals tagged to the current quarter — cascade context above
  // the Plan section.
  const activeGoals = useQuery(api.goals.list, { status: 'active' });
  const quarterGoals = useMemo(() => {
    if (!activeGoals) return [];
    const q = currentQuarter();
    return activeGoals.filter((g) => g.quarter === q);
  }, [activeGoals]);

  const createReview = useMutation(api.reviews.create);

  // ── Form state ──────────────────────────────────────

  const [worked, setWorked] = useState('');
  const [didnt, setDidnt] = useState('');
  const [lesson, setLesson] = useState('');
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
      // The shape the OpenClaw weekly-review skill ALSO writes. Keep these
      // in sync — if you add a field here, mirror it in the skill.
      await createReview({
        reviewType: 'weekly',
        periodStart: weekStartStr,
        periodEnd: weekEndStr,
        content: {
          // Reflect — three short structured prompts.
          reflection: {
            worked: worked.trim() || undefined,
            didnt: didnt.trim() || undefined,
            lesson: lesson.trim() || undefined,
          },
          // Review context — snapshot at save time so the review can be
          // re-rendered later without re-querying everything.
          previousPriorities: lastPriorities ?? null,
          winsCount: allWins.length,
          // Plan — surfaced on the Today tab via WeeklyPriorities.
          nextWeekPriorities: { p1: p1.trim(), p2: p2.trim(), p3: p3.trim() },
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

  const isLoading = journals === undefined || winsThisWeek === undefined || activeGoals === undefined || lastReview === undefined;

  return (
    <div className="border border-border rounded-xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-baseline justify-between">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
          Weekly Review
        </h2>
        <span className="text-[11px] tabular-nums text-text-muted">
          {formatDateLong(start)} &ndash; {formatDateLong(end)}
        </span>
      </div>

      {isLoading ? (
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-surface rounded-lg" />
            <div className="h-20 bg-surface rounded-lg" />
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-10">

          {/* ───── 1. REVIEW ───── */}
          <section>
            <div className="flex items-baseline gap-3 mb-4">
              <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-accent">01 · Review</span>
              <h3 className="text-base font-semibold text-text">Look back at the week</h3>
            </div>

            {/* Last week's priorities */}
            <div className="rounded-lg border border-border bg-surface/40 p-4 mb-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted block mb-3">
                Last week, you said you'd focus on
              </span>
              {lastPriorities && (lastPriorities.p1 || lastPriorities.p2 || lastPriorities.p3) ? (
                <ol className="space-y-2">
                  {[lastPriorities.p1, lastPriorities.p2, lastPriorities.p3].map((p, i) =>
                    p ? (
                      <li key={i} className="flex items-baseline gap-3 text-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted w-5 shrink-0 tabular-nums">P{i + 1}</span>
                        <span className="text-text">{p}</span>
                      </li>
                    ) : null,
                  )}
                </ol>
              ) : (
                <p className="text-sm text-text-muted italic">No prior weekly review yet — first one of this run.</p>
              )}
            </div>

            {/* Wins this week */}
            <div className="rounded-lg border border-border bg-surface/40 p-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted block mb-3">
                Wins this week · {allWins.length}
              </span>
              {allWins.length > 0 ? (
                <ul className="space-y-1.5">
                  {allWins.slice(0, 8).map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-success">
                        <polyline points="3 7 6 10 11 4" />
                      </svg>
                      <span className="text-text">{w}</span>
                    </li>
                  ))}
                  {allWins.length > 8 && (
                    <li className="text-xs text-text-muted/70 pl-5">+ {allWins.length - 8} more</li>
                  )}
                </ul>
              ) : (
                <p className="text-sm text-text-muted italic">No wins logged this week.</p>
              )}
            </div>
          </section>

          {/* ───── 2. REFLECT ───── */}
          <section>
            <div className="flex items-baseline gap-3 mb-4">
              <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-accent">02 · Reflect</span>
              <h3 className="text-base font-semibold text-text">Honest, short, three answers</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-text-muted block mb-1.5">What worked?</label>
                <textarea
                  value={worked}
                  onChange={(e) => setWorked(e.target.value)}
                  placeholder="One or two sentences. The thing(s) that paid off."
                  rows={2}
                  className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/50 resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted block mb-1.5">What didn't?</label>
                <textarea
                  value={didnt}
                  onChange={(e) => setDidnt(e.target.value)}
                  placeholder="The drag, the miss, the avoided thing."
                  rows={2}
                  className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/50 resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted block mb-1.5">Lesson for next week?</label>
                <textarea
                  value={lesson}
                  onChange={(e) => setLesson(e.target.value)}
                  placeholder="One thing to carry forward."
                  rows={2}
                  className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/50 resize-none"
                />
              </div>
            </div>
          </section>

          {/* ───── 3. PLAN ───── */}
          <section>
            <div className="flex items-baseline gap-3 mb-4">
              <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-accent">03 · Plan</span>
              <h3 className="text-base font-semibold text-text">Three priorities for next week</h3>
            </div>

            {/* Quarterly cascade context */}
            {quarterGoals.length > 0 && (
              <div className="rounded-lg border border-border bg-surface/40 p-4 mb-4">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted block mb-2">
                  Active this quarter — what should next week ladder up to
                </span>
                <ul className="space-y-1">
                  {quarterGoals.map((g) => (
                    <li key={g._id} className="flex items-baseline gap-2 text-sm">
                      <span className="text-text-muted/40">·</span>
                      <span className="text-text">{g.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              {([
                { label: 'P1', value: p1, set: setP1, ph: 'The most important thing to ship next week' },
                { label: 'P2', value: p2, set: setP2, ph: 'Second priority' },
                { label: 'P3', value: p3, set: setP3, ph: 'Third priority' },
              ] as const).map(({ label, value, set, ph }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-wide text-text-muted w-6 shrink-0">{label}</span>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    placeholder={ph}
                    className="flex-1 bg-surface border border-border rounded-lg px-4 py-2 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/50"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Score + save */}
          <section className="border-t border-border pt-6 flex items-end justify-between gap-6">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted block mb-2">
                Score · 1–10
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="—"
                className="w-20 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/50 tabular-nums"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !score || parseInt(score, 10) < 1 || parseInt(score, 10) > 10}
              className="px-6 py-2.5 text-sm font-bold uppercase tracking-wide bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Save Review'}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
