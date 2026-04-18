'use client';

// Moving Future — Dan Sullivan's quarterly check-in built on three Ms:
// Morale (last 90 days), Momentum (right now), Motivation (next 90 days).
// The output is a `quarterly` review row plus 0-5 newly-created goals
// stamped with the upcoming quarter.

import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { cn } from '@/lib/utils';

// ── Date helpers ─────────────────────────────────────

interface QuarterRange {
  start: Date;
  end: Date;
  label: string;        // "Q2 2026"
  shortLabel: string;   // "Q2"
  year: number;
  quarterNum: number;
  /** Identifier matching `goals.quarter` field convention: "2026-Q2". */
  goalQuarter: string;
}

function quarterFromDate(d: Date): QuarterRange {
  const year = d.getFullYear();
  const month = d.getMonth();
  let startMonth: number;
  let quarterNum: number;
  if (month < 3) { startMonth = 0; quarterNum = 1; }
  else if (month < 6) { startMonth = 3; quarterNum = 2; }
  else if (month < 9) { startMonth = 6; quarterNum = 3; }
  else { startMonth = 9; quarterNum = 4; }
  return {
    start: new Date(year, startMonth, 1),
    end: new Date(year, startMonth + 3, 0),
    label: `Q${quarterNum} ${year}`,
    shortLabel: `Q${quarterNum}`,
    year,
    quarterNum,
    goalQuarter: `${year}-Q${quarterNum}`,
  };
}

function nextQuarterFrom(q: QuarterRange): QuarterRange {
  const monthAfterEnd = new Date(q.end.getFullYear(), q.end.getMonth() + 1, 1);
  return quarterFromDate(monthAfterEnd);
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

interface MovingFutureFormProps {
  /** Reflect on this specific quarter. Defaults to the most recently closed
   * quarter (which is what someone showing up to "do their Q1 review" in
   * April actually wants). */
  closingPeriodStart?: Date;
  closingPeriodEnd?: Date;
  onSaved?: () => void;
  onCancel?: () => void;
}

// ── Main component ───────────────────────────────────

export function MovingFutureForm({
  closingPeriodStart,
  closingPeriodEnd,
  onSaved,
  onCancel,
}: MovingFutureFormProps = {}) {
  // The check-in reflects on the period passed in (or the most recently
  // closed quarter by default) and sets priorities for the *following* one.
  const closingQuarter = useMemo(() => {
    if (closingPeriodStart) return quarterFromDate(closingPeriodStart);
    // Default: the quarter that ended most recently. From any date in the
    // current quarter, subtracting 3 months lands us inside the previous one.
    const today = new Date();
    const dateInPrev = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
    return quarterFromDate(dateInPrev);
  }, [closingPeriodStart]);
  // closingPeriodEnd is accepted for API symmetry but the quarter is fully
  // determined by its start; we ignore end to avoid drift.
  void closingPeriodEnd;
  const nextQuarter = useMemo(() => nextQuarterFrom(closingQuarter), [closingQuarter]);

  const closingStartStr = toDateStr(closingQuarter.start);
  const closingEndStr = toDateStr(closingQuarter.end);

  const allWins = useQuery(api.wins.list, {});
  const journals = useQuery(api.journals.list, {});
  const createMovingFuture = useMutation(api.reviews.createMovingFuture);

  // Pre-fill: every win logged inside the closing quarter (from `wins` table
  // and `journals.wins`), de-duplicated.
  const quarterWins = useMemo(() => {
    const set = new Set<string>();
    if (allWins) {
      for (const w of allWins) {
        if (w.entryDate >= closingStartStr && w.entryDate <= closingEndStr) {
          set.add(w.content);
        }
      }
    }
    if (journals) {
      for (const j of journals) {
        if (j.entryDate >= closingStartStr && j.entryDate <= closingEndStr && j.wins) {
          for (const w of j.wins) set.add(w);
        }
      }
    }
    return Array.from(set);
  }, [allWins, journals, closingStartStr, closingEndStr]);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [proudest, setProudest] = useState('');
  const [confidentAbout, setConfidentAbout] = useState('');
  const [excitedAbout, setExcitedAbout] = useState('');
  const [priorities, setPriorities] = useState<Array<{ title: string; createAsGoal: boolean }>>([
    { title: '', createAsGoal: true },
    { title: '', createAsGoal: true },
    { title: '', createAsGoal: true },
  ]);
  const [score, setScore] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const filledPriorities = priorities.filter((p) => p.title.trim().length > 0);
  const canContinueFrom1 = proudest.trim().length > 0 || quarterWins.length > 0;
  const canContinueFrom2 = confidentAbout.trim().length > 0;
  const canContinueFrom3 = excitedAbout.trim().length > 0 && filledPriorities.length >= 1;
  const canSave =
    score.length > 0 &&
    !isNaN(parseInt(score, 10)) &&
    parseInt(score, 10) >= 1 &&
    parseInt(score, 10) <= 10;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      // Single atomic mutation: review + goals land together or not at all.
      await createMovingFuture({
        periodStart: closingStartStr,
        periodEnd: closingEndStr,
        quarterLabel: closingQuarter.label,
        nextQuarterLabel: nextQuarter.label,
        nextQuarterGoalKey: nextQuarter.goalQuarter,
        morale: { proudest: proudest.trim(), wins: quarterWins },
        momentum: { confidentAbout: confidentAbout.trim() },
        motivation: { excitedAbout: excitedAbout.trim() },
        priorities: filledPriorities.map((p) => ({
          title: p.title.trim(),
          createAsGoal: p.createAsGoal,
        })),
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
        <h2 className="text-lg font-bold text-text mb-1">Moving Future Saved</h2>
        <p className="text-sm text-text-muted">
          {closingQuarter.label}: {formatDateLong(closingQuarter.start)} &ndash; {formatDateLong(closingQuarter.end)}
        </p>
        {filledPriorities.some((p) => p.createAsGoal) && (
          <p className="text-xs text-text-muted/80 mt-2">
            {filledPriorities.filter((p) => p.createAsGoal).length} {nextQuarter.label} goals created
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl">
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-text">Moving Future · {closingQuarter.label}</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Reflect on the past 90 days, then set the next.
            </p>
          </div>
          <span className="text-[10px] font-semibold text-text-muted/80 tabular-nums uppercase tracking-wider">
            Step {step} of 4
          </span>
        </div>
        <StepIndicator current={step} total={4} />
      </div>

      <div className="p-6">
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-text mb-1">Morale</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Looking back at the last 90 days — what are you most proud of?
              </p>
            </div>

            {quarterWins.length > 0 && (
              <div className="border border-border rounded-lg bg-surface/50 p-4">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted/80 block mb-2">
                  Wins logged this quarter ({quarterWins.length})
                </span>
                <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                  {quarterWins.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-success">
                        <polyline points="3 7 6 10 11 4" />
                      </svg>
                      <span className="text-text">{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <textarea
              value={proudest}
              onChange={(e) => setProudest(e.target.value)}
              placeholder="What did you ship, finish, learn, become? Let yourself bank the confidence."
              rows={6}
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/60 resize-none leading-relaxed"
              autoFocus
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-text mb-1">Momentum</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Right now, today — what are you most confident about? What&rsquo;s working, in flow, paying off?
              </p>
            </div>

            <textarea
              value={confidentAbout}
              onChange={(e) => setConfidentAbout(e.target.value)}
              placeholder="Capabilities, systems, relationships, habits — anchor on current strengths, not problems."
              rows={6}
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/60 resize-none leading-relaxed"
              autoFocus
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-text mb-1">Motivation</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Looking at the next 90 days — what are you most excited about? What would make {nextQuarter.label} feel like a real leap?
              </p>
            </div>

            <textarea
              value={excitedAbout}
              onChange={(e) => setExcitedAbout(e.target.value)}
              placeholder="Equal parts excitement and a touch of fear — that's the right size."
              rows={5}
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/60 resize-none leading-relaxed"
              autoFocus
            />

            <div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
                  Quarterly priorities for {nextQuarter.label}
                </span>
                <span className="text-[10px] text-text-muted/80">
                  3–5 things that move the year forward most
                </span>
              </div>
              <div className="space-y-2">
                {priorities.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted/80 w-5 shrink-0 tabular-nums">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={p.title}
                      onChange={(e) =>
                        setPriorities((prev) =>
                          prev.map((q, i) => (i === idx ? { ...q, title: e.target.value } : q)),
                        )
                      }
                      placeholder={`Priority ${idx + 1}`}
                      className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/60"
                    />
                    <label
                      title="Create this as a goal stamped with the next quarter"
                      className="flex items-center gap-1.5 text-[11px] text-text-muted shrink-0 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={p.createAsGoal}
                        onChange={(e) =>
                          setPriorities((prev) =>
                            prev.map((q, i) =>
                              i === idx ? { ...q, createAsGoal: e.target.checked } : q,
                            ),
                          )
                        }
                        className="h-3.5 w-3.5 accent-accent"
                      />
                      Goal
                    </label>
                    {priorities.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPriorities((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-text-muted hover:text-danger transition-colors"
                        aria-label="Remove priority"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                {priorities.length < 5 && (
                  <button
                    type="button"
                    onClick={() => setPriorities((prev) => [...prev, { title: '', createAsGoal: true }])}
                    className="text-xs text-accent hover:text-accent-hover transition-colors mt-1"
                  >
                    + Add priority
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-text mb-1">Review &amp; save</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Quick sanity check before this lands. Score the quarter and save.
              </p>
            </div>

            <div className="border border-border rounded-lg divide-y divide-border/60 text-sm">
              {proudest.trim().length > 0 && (
                <SummaryRow label="Proudest" body={proudest} />
              )}
              {quarterWins.length > 0 && (
                <SummaryRow
                  label="Wins"
                  body={`${quarterWins.length} logged this quarter`}
                />
              )}
              {confidentAbout.trim().length > 0 && (
                <SummaryRow label="Momentum" body={confidentAbout} />
              )}
              {excitedAbout.trim().length > 0 && (
                <SummaryRow label="Excited about" body={excitedAbout} />
              )}
              {filledPriorities.length > 0 && (
                <div className="px-4 py-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted/80 block mb-2">
                    {nextQuarter.label} priorities
                  </span>
                  <ol className="space-y-1.5 list-decimal list-inside">
                    {filledPriorities.map((p, i) => (
                      <li key={i} className="text-sm text-text">
                        {p.title}
                        {p.createAsGoal && (
                          <span className="ml-2 text-[10px] font-medium uppercase tracking-wider text-accent/80">
                            → goal
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            <div>
              <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted block mb-2">
                Score this quarter (1–10)
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
          {step === 1 ? 'Cancel' : '← Back'}
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
            {saving ? 'Saving…' : 'Save Moving Future'}
          </button>
        )}
      </div>
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
