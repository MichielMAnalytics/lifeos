'use client';

// Weekly Review form — Review → Reflect → Plan → Save flow as four
// step-by-step screens (typeform-style).
//
// Step 1. REVIEW (read-only, auto-pulled): last week's three priorities
//   committed to (from the previous weekly review's nextWeekPriorities),
//   wins logged this week (from journals + wins table), active quarterly
//   goals as cascade context.
// Step 2. REFLECT (three short text fields): what worked / what didn't /
//   lesson. Replaces the older "highlights + challenges + per-goal-notes"
//   form, which was too heavy and didn't drive useful reflection.
// Step 3. PLAN (P1/P2/P3): same priorities the WeeklyPriorities Today
//   section reads from, so saving here propagates to the dashboard
//   immediately.
// Step 4. SAVE: summary review + 1–10 score.
//
// The OpenClaw `weekly-review` skill writes the SAME content shape so a
// review created via the Telegram voice flow renders identically to one
// filled in from this form.

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { cn } from '@/lib/utils';

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

// ── Step indicator ───────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => i + 1).map((step) => (
        <div
          key={step}
          className={cn(
            'h-1.5 flex-1 rounded-full transition-colors',
            step < current && 'bg-success/70',
            step === current && 'bg-accent',
            step > current && 'bg-border',
          )}
        />
      ))}
    </div>
  );
}

// ── Props ────────────────────────────────────────────

interface WeeklyReviewFormProps {
  /** Reflect on this specific week (Monday). Defaults to the current week. */
  weekStart?: Date;
  weekEnd?: Date;
  onSaved?: () => void;
  onCancel?: () => void;
}

interface NextWeekPriorities {
  p1?: string;
  p2?: string;
  p3?: string;
}

// ── Main component ───────────────────────────────────

export function WeeklyReviewForm({ weekStart, weekEnd, onSaved, onCancel }: WeeklyReviewFormProps = {}) {
  const { start, end } = useMemo(() => {
    if (weekStart) return weekFromMonday(weekStart);
    return getCurrentWeekRange();
  }, [weekStart]);
  void weekEnd;
  const weekStartStr = toDateStr(start);
  const weekEndStr = toDateStr(end);

  // ── Pre-fill data ────────────────────────────────────

  const lastReview = useQuery(api.reviews.latestOfType, { reviewType: 'weekly' });
  const lastPriorities: NextWeekPriorities | null = useMemo(() => {
    if (!lastReview) return null;
    const c = (lastReview.content ?? null) as { nextWeekPriorities?: NextWeekPriorities } | null;
    return c?.nextWeekPriorities ?? null;
  }, [lastReview]);

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

  const activeGoals = useQuery(api.goals.list, { status: 'active' });
  const quarterGoals = useMemo(() => {
    if (!activeGoals) return [];
    const q = currentQuarter();
    return activeGoals.filter((g) => g.quarter === q);
  }, [activeGoals]);

  const createReview = useMutation(api.reviews.create);

  // ── Form state ──────────────────────────────────────

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [worked, setWorked] = useState('');
  const [didnt, setDidnt] = useState('');
  const [lesson, setLesson] = useState('');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [p3, setP3] = useState('');
  const [score, setScore] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Continue gates: step 1 is read-only (always allowed). Step 2 needs
  // at least one of the three reflection prompts answered. Step 3 needs
  // at least P1. Step 4 (save) needs a valid 1–10 score.
  const canContinueFrom1 = true;
  const canContinueFrom2 =
    worked.trim().length > 0 || didnt.trim().length > 0 || lesson.trim().length > 0;
  const canContinueFrom3 = p1.trim().length > 0;
  // Strict integer 1–10. Reject decimals, scientific notation, negatives.
  const canSave = /^([1-9]|10)$/.test(score);

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      // The shape the OpenClaw weekly-review skill ALSO writes. Keep
      // these in sync — if you add a field here, mirror it in the skill.
      await createReview({
        reviewType: 'weekly',
        periodStart: weekStartStr,
        periodEnd: weekEndStr,
        content: {
          reflection: {
            worked: worked.trim() || undefined,
            didnt: didnt.trim() || undefined,
            lesson: lesson.trim() || undefined,
          },
          previousPriorities: lastPriorities ?? null,
          winsCount: allWins.length,
          nextWeekPriorities: { p1: p1.trim(), p2: p2.trim(), p3: p3.trim() },
        },
        score: parseInt(score, 10),
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

  const isLoading =
    journals === undefined ||
    winsThisWeek === undefined ||
    activeGoals === undefined ||
    lastReview === undefined;

  const STAGE_NAMES = ['Review', 'Reflect', 'Plan', 'Save'] as const;

  return (
    <div className="border border-border rounded-xl">
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-text">Weekly Review</h2>
            <p className="text-xs text-text-muted mt-0.5 tabular-nums">
              {formatDateLong(start)} &ndash; {formatDateLong(end)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-semibold text-text-muted/80 tabular-nums uppercase tracking-wider">
              Step {step} of 4
            </div>
            <div className="text-sm font-semibold text-accent mt-0.5">
              {STAGE_NAMES[step - 1]}
            </div>
          </div>
        </div>
        <StepIndicator current={step} total={4} />
        <ol className="mt-3 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
          {STAGE_NAMES.map((name, i) => {
            const stepNum = i + 1;
            const done = stepNum < step;
            const current = stepNum === step;
            return (
              <li key={name} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'font-semibold',
                    current && 'text-accent',
                    done && 'text-success/80',
                    !current && !done && 'text-text-muted/60',
                  )}
                >
                  {name}
                </span>
                {i < STAGE_NAMES.length - 1 && (
                  <span className="text-text-muted/40">›</span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {isLoading ? (
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-surface rounded-lg" />
            <div className="h-20 bg-surface rounded-lg" />
          </div>
        </div>
      ) : (
        <>
          <div className="p-6">
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-semibold text-text mb-1">Review</h3>
                  <p className="text-sm text-text-muted leading-relaxed">
                    Quick look back. The week as it actually happened.
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-surface/40 p-4">
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

                <div className="rounded-lg border border-border bg-surface/40 p-4">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted block mb-3">
                    Wins this week · {allWins.length}
                  </span>
                  {allWins.length > 0 ? (
                    <ul className="space-y-1.5 max-h-48 overflow-y-auto">
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

                {quarterGoals.length > 0 && (
                  <div className="rounded-lg border border-border bg-surface/40 p-4">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted block mb-2">
                      Active this quarter — what next week should ladder up to
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
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-semibold text-text mb-1">Reflect</h3>
                  <p className="text-sm text-text-muted leading-relaxed">
                    Honest, short, three answers. One or two sentences each is plenty.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-text-muted block mb-1.5">What worked?</label>
                    <textarea
                      value={worked}
                      onChange={(e) => setWorked(e.target.value)}
                      placeholder="The thing(s) that paid off."
                      rows={3}
                      autoFocus
                      className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/60 resize-none leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-text-muted block mb-1.5">What didn't?</label>
                    <textarea
                      value={didnt}
                      onChange={(e) => setDidnt(e.target.value)}
                      placeholder="The drag, the miss, the avoided thing."
                      rows={3}
                      className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/60 resize-none leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-text-muted block mb-1.5">Lesson for next week?</label>
                    <textarea
                      value={lesson}
                      onChange={(e) => setLesson(e.target.value)}
                      placeholder="One thing to carry forward."
                      rows={3}
                      className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/60 resize-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-text mb-1">Plan</h3>
                  <p className="text-sm text-text-muted leading-relaxed">
                    Three priorities for next week. P1 is the one that has to ship.
                  </p>
                </div>

                {quarterGoals.length > 0 && (
                  <div className="rounded-lg border border-border bg-surface/40 p-4">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted block mb-2">
                      Cascade context — active this quarter
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
                    { label: 'P1', value: p1, set: setP1, ph: 'The most important thing to ship next week', autoFocus: true },
                    { label: 'P2', value: p2, set: setP2, ph: 'Second priority', autoFocus: false },
                    { label: 'P3', value: p3, set: setP3, ph: 'Third priority', autoFocus: false },
                  ] as const).map(({ label, value, set, ph, autoFocus }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-xs font-bold uppercase tracking-wide text-text-muted w-6 shrink-0">{label}</span>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => set(e.target.value)}
                        placeholder={ph}
                        autoFocus={autoFocus}
                        className="flex-1 bg-surface border border-border rounded-lg px-4 py-2 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/60"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-text mb-1">Review &amp; save</h3>
                  <p className="text-sm text-text-muted leading-relaxed">
                    Quick sanity check. Score the week and save.
                  </p>
                </div>

                <div className="border border-border rounded-lg divide-y divide-border/60 text-sm">
                  {worked.trim().length > 0 && <SummaryRow label="What worked" body={worked} />}
                  {didnt.trim().length > 0 && <SummaryRow label="What didn't" body={didnt} />}
                  {lesson.trim().length > 0 && <SummaryRow label="Lesson" body={lesson} />}
                  {(p1.trim() || p2.trim() || p3.trim()) && (
                    <div className="px-4 py-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted/80 block mb-2">
                        Next week priorities
                      </span>
                      <ol className="space-y-1.5">
                        {[
                          { label: 'P1', value: p1.trim() },
                          { label: 'P2', value: p2.trim() },
                          { label: 'P3', value: p3.trim() },
                        ]
                          .filter((p) => p.value.length > 0)
                          .map((p) => (
                            <li key={p.label} className="flex items-baseline gap-3 text-sm">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted w-5 shrink-0 tabular-nums">{p.label}</span>
                              <span className="text-text">{p.value}</span>
                            </li>
                          ))}
                      </ol>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted block mb-2">
                    Score this week (1–10)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    placeholder="—"
                    className="w-24 bg-surface border border-border rounded-lg px-4 py-2 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/60"
                    autoFocus
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer nav */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                if (step === 1) {
                  onCancel?.();
                } else {
                  setStep((s) => (s - 1) as 1 | 2 | 3 | 4);
                }
              }}
              className="text-xs font-medium text-text-muted hover:text-text transition-colors px-3 py-1.5"
            >
              {step === 1 ? (onCancel ? 'Cancel' : '') : '← Back'}
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4)}
                disabled={
                  (step === 1 && !canContinueFrom1) ||
                  (step === 2 && !canContinueFrom2) ||
                  (step === 3 && !canContinueFrom3)
                }
                className="px-5 py-2 text-xs font-bold uppercase tracking-wide bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !canSave}
                className="px-5 py-2 text-xs font-bold uppercase tracking-wide bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : 'Save Review'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryRow({ label, body }: { label: string; body: string }) {
  return (
    <div className="px-4 py-3">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted/80 block mb-1">
        {label}
      </span>
      <p className="text-sm text-text leading-relaxed whitespace-pre-line">{body}</p>
    </div>
  );
}
