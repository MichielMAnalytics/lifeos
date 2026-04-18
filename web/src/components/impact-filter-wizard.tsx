'use client';

// Impact Filter — Dan Sullivan's one-page project clarifier.
//
// Seven steps with deliberate ordering: purpose → importance → ideal → worst
// → best → 8 success criteria → who. Worst-before-best is intentional; loss
// aversion is the sharper motivator and surfaces whether the project actually
// matters before the user gets seduced by upside.

import { useEffect, useMemo, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Doc, Id } from '@/lib/convex-api';
import { cn } from '@/lib/utils';

type Project = Doc<'projects'>;
type ImpactFilter = NonNullable<Project['impactFilter']>;

interface WizardState {
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  purpose: string;
  importance: string;
  idealOutcome: string;
  worstResult: string;
  bestResult: string;
  successCriteria: string[];
  who: string;
}

const VAGUE_WORDS = [
  'good', 'great', 'better', 'nice', 'cool', 'awesome', 'amazing',
  'feel', 'feels', 'feeling', 'happy', 'fine',
];

/** Returns a soft warning when an answer reads as vague. The wizard still
 * lets the user continue — Dan's rule is "push back," not "block." */
function vaguenessWarning(text: string, minLen = 30): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.length < minLen) {
    return 'A bit short — can you say more?';
  }
  const lower = ' ' + trimmed.toLowerCase() + ' ';
  for (const word of VAGUE_WORDS) {
    if (lower.includes(` ${word} `) || lower.includes(` ${word}.`)) {
      return `"${word}" is vague — what would actually be true?`;
    }
  }
  return null;
}

function criterionWarning(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.length < 12) return 'Be more specific.';
  const lower = ' ' + trimmed.toLowerCase() + ' ';
  for (const word of VAGUE_WORDS) {
    if (lower.includes(` ${word} `) || lower.includes(` ${word}.`)) {
      return `"${word}" — make it concrete and measurable.`;
    }
  }
  return null;
}

interface ImpactFilterWizardProps {
  projectId: Id<'projects'>;
  initial?: ImpactFilter;
  onDone: () => void;
  onCancel: () => void;
}

export function ImpactFilterWizard({ projectId, initial, onDone, onCancel }: ImpactFilterWizardProps) {
  const setImpactFilter = useMutation(api.projects.setImpactFilter);

  const initialCriteria = useMemo(() => {
    const fromInitial = initial?.successCriteria ?? [];
    const padded = [...fromInitial];
    while (padded.length < 8) padded.push('');
    return padded.slice(0, 8);
  }, [initial]);

  const [state, setState] = useState<WizardState>({
    step: 1,
    purpose: initial?.purpose ?? '',
    importance: initial?.importance ?? '',
    idealOutcome: initial?.idealOutcome ?? '',
    worstResult: initial?.worstResult ?? '',
    bestResult: initial?.bestResult ?? '',
    successCriteria: initialCriteria,
    who: initial?.who ?? '',
  });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function setCriterion(i: number, value: string) {
    setState((prev) => ({
      ...prev,
      successCriteria: prev.successCriteria.map((c, idx) => (idx === i ? value : c)),
    }));
  }

  // Step gating
  const canContinue = (() => {
    switch (state.step) {
      case 1: return state.purpose.trim().length >= 8;
      case 2: return state.importance.trim().length >= 12;
      case 3: return state.idealOutcome.trim().length >= 12;
      case 4: return state.worstResult.trim().length >= 12;
      case 5: return state.bestResult.trim().length >= 12;
      case 6: return state.successCriteria.every((c) => c.trim().length >= 12);
      case 7: return true; // Who is optional
    }
  })();

  async function handleSave() {
    setSaving(true);
    try {
      await setImpactFilter({
        id: projectId,
        purpose: state.purpose.trim(),
        importance: state.importance.trim(),
        idealOutcome: state.idealOutcome.trim(),
        worstResult: state.worstResult.trim(),
        bestResult: state.bestResult.trim(),
        successCriteria: state.successCriteria.map((c) => c.trim()),
        who: state.who.trim() || undefined,
      });
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <h2 className="text-base font-semibold text-text">Impact Filter</h2>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted/80 tabular-nums">
            Step {state.step} of 7
          </span>
        </div>
        <StepBars current={state.step} total={7} />
      </div>

      {/* Body */}
      <div className="space-y-3">
        {state.step === 1 && (
          <Question
            title="Purpose"
            prompt="What do you want to accomplish? In one sentence."
            hint="If you can't state it in a sentence, you don't understand it yet."
          >
            <textarea
              value={state.purpose}
              onChange={(e) => set('purpose', e.target.value)}
              rows={3}
              autoFocus
              placeholder="e.g. Launch the new pricing page so we can test the $49 tier with paid traffic."
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/60 resize-none leading-relaxed"
            />
            <Warning text={vaguenessWarning(state.purpose, 20)} />
          </Question>
        )}

        {state.step === 2 && (
          <Question
            title="Importance"
            prompt="What's the single biggest difference completing this will make?"
            hint="Impact, not activity. Why does this matter enough to spend attention on?"
          >
            <textarea
              value={state.importance}
              onChange={(e) => set('importance', e.target.value)}
              rows={4}
              autoFocus
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/60 resize-none leading-relaxed"
            />
            <Warning text={vaguenessWarning(state.importance)} />
          </Question>
        )}

        {state.step === 3 && (
          <Question
            title="Ideal outcome"
            prompt="Describe the finished state concretely. What exists in the world that didn't before?"
            hint="If this were complete and went well, what could you point to?"
          >
            <textarea
              value={state.idealOutcome}
              onChange={(e) => set('idealOutcome', e.target.value)}
              rows={4}
              autoFocus
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/60 resize-none leading-relaxed"
            />
            <Warning text={vaguenessWarning(state.idealOutcome)} />
          </Question>
        )}

        {state.step === 4 && (
          <Question
            title="Worst result"
            prompt="If you don't do this, what won't happen, what gets worse, what opportunity is lost?"
            hint="Be specific and a bit dramatic — loss aversion is sharper than gain. If the worst case is 'nothing much changes,' the project probably isn't worth doing."
          >
            <textarea
              value={state.worstResult}
              onChange={(e) => set('worstResult', e.target.value)}
              rows={4}
              autoFocus
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/60 resize-none leading-relaxed"
            />
            <Warning text={vaguenessWarning(state.worstResult)} />
          </Question>
        )}

        {state.step === 5 && (
          <Question
            title="Best result"
            prompt="If you achieve this, what becomes possible next? What doors open?"
            hint="What future moves does this unlock? This is the part that sells you on doing it."
          >
            <textarea
              value={state.bestResult}
              onChange={(e) => set('bestResult', e.target.value)}
              rows={4}
              autoFocus
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/60 resize-none leading-relaxed"
            />
            <Warning text={vaguenessWarning(state.bestResult)} />
          </Question>
        )}

        {state.step === 6 && (
          <Question
            title="Success criteria"
            prompt="List eight specific, measurable things that must be true for this to count as complete."
            hint='Actions, decisions, deliverables — not feelings or vague states. "Website copy finalised for all 6 sections" not "website feels great." The discipline of writing eight forces you past the obvious three or four.'
          >
            <ol className="space-y-2 list-none">
              {state.successCriteria.map((c, i) => {
                const warning = criterionWarning(c);
                return (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted/80 mt-2 w-5 shrink-0 tabular-nums">
                      {i + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={c}
                        onChange={(e) => setCriterion(i, e.target.value)}
                        autoFocus={i === 0}
                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/60"
                      />
                      {warning && (
                        <p className="text-[10px] text-warning/90 mt-1">{warning}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="text-xs text-text-muted/80 mt-2">
              All eight must be filled and at least 12 characters before you can continue.
            </p>
          </Question>
        )}

        {state.step === 7 && (
          <Question
            title="Who"
            prompt="Who's going to own this? (Optional)"
            hint="Per Who Not How: the question is rarely 'how' — it's 'who handles this?' Leave blank if it's still you."
          >
            <input
              type="text"
              value={state.who}
              onChange={(e) => set('who', e.target.value)}
              autoFocus
              placeholder="e.g. Faye, or 'a contractor'"
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-sm text-text placeholder:text-text-muted/80 focus:outline-none focus:border-accent/60"
            />
          </Question>
        )}
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-border/60 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            if (state.step === 1) {
              onCancel();
            } else {
              setState((prev) => ({ ...prev, step: (prev.step - 1) as WizardState['step'] }));
            }
          }}
          className="text-xs font-medium text-text-muted hover:text-text transition-colors px-3 py-1.5"
        >
          {state.step === 1 ? 'Cancel' : '← Back'}
        </button>

        {state.step < 7 ? (
          <button
            type="button"
            onClick={() => setState((prev) => ({ ...prev, step: (prev.step + 1) as WizardState['step'] }))}
            disabled={!canContinue}
            className="px-5 py-2 text-xs font-bold uppercase tracking-wide bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-xs font-bold uppercase tracking-wide bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save Impact Filter'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────

function StepBars({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => i + 1).map((step) => (
        <div
          key={step}
          className={cn(
            'h-1 flex-1 rounded-full transition-colors',
            step < current && 'bg-success/70',
            step === current && 'bg-accent',
            step > current && 'bg-border',
          )}
        />
      ))}
    </div>
  );
}

function Question({
  title,
  prompt,
  hint,
  children,
}: {
  title: string;
  prompt: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        <p className="text-sm text-text-muted leading-relaxed mt-1">{prompt}</p>
        {hint && (
          <p className="text-xs text-text-muted/80 leading-relaxed mt-2 italic">{hint}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function Warning({ text }: { text: string | null }) {
  if (!text) return null;
  return <p className="text-[10px] text-warning/90 mt-2">{text}</p>;
}

// ── Read-only one-page view ──────────────────────────

interface ImpactFilterViewProps {
  project: Project;
  onEdit: () => void;
  onClear: () => void;
}

export function ImpactFilterView({ project, onEdit, onClear }: ImpactFilterViewProps) {
  const filter = project.impactFilter;
  const [copied, setCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  if (!filter) return null;

  function handleCopyMarkdown() {
    if (!filter) return;
    const md = renderMarkdown(project.title, filter);
    void navigator.clipboard.writeText(md).then(() => setCopied(true));
  }

  return (
    <div className="border border-border rounded-xl bg-surface/30">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-accent block">
            Impact Filter
          </span>
          <span className="text-[11px] text-text-muted">
            One-page clarifier
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="text-[11px] font-medium text-text-muted hover:text-text transition-colors px-2.5 py-1 border border-border rounded-md hover:border-text-muted"
          >
            {copied ? 'Copied!' : 'Copy markdown'}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="text-[11px] font-medium text-accent hover:text-accent-hover transition-colors px-2.5 py-1 border border-accent/30 rounded-md hover:border-accent/60"
          >
            Edit
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {filter.who && (
          <Field label="Who" body={filter.who} highlight />
        )}
        <Field label="Purpose" body={filter.purpose} />
        <Field label="Importance" body={filter.importance} />
        <Field label="Ideal outcome" body={filter.idealOutcome} />
        <Field label="Worst result" body={filter.worstResult} />
        <Field label="Best result" body={filter.bestResult} />
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/80 block mb-2">
            Success criteria
          </span>
          <ol className="space-y-1.5 list-decimal list-inside">
            {filter.successCriteria.map((c, i) => (
              <li key={i} className="text-sm text-text leading-relaxed">
                {c}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-border/60">
        {!confirmClear ? (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="text-[11px] text-text-muted/80 hover:text-danger transition-colors"
          >
            Remove Impact Filter
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] font-medium text-danger bg-danger/10 hover:bg-danger/20 px-3 py-1 rounded-md transition-colors"
            >
              Confirm remove
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="text-[11px] text-text-muted hover:text-text transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, body, highlight }: { label: string; body: string; highlight?: boolean }) {
  return (
    <div>
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/80 block mb-1">
        {label}
      </span>
      <p
        className={cn(
          'text-sm leading-relaxed whitespace-pre-line',
          highlight ? 'text-text font-medium' : 'text-text',
        )}
      >
        {body}
      </p>
    </div>
  );
}

// ── Markdown renderer ────────────────────────────────

function renderMarkdown(title: string, f: ImpactFilter): string {
  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push('');
  if (f.who) {
    lines.push(`**Who:** ${f.who}`);
    lines.push('');
  }
  lines.push('## Purpose');
  lines.push(f.purpose);
  lines.push('');
  lines.push('## Importance');
  lines.push(f.importance);
  lines.push('');
  lines.push('## Ideal Outcome');
  lines.push(f.idealOutcome);
  lines.push('');
  lines.push('## Worst Result');
  lines.push(f.worstResult);
  lines.push('');
  lines.push('## Best Result');
  lines.push(f.bestResult);
  lines.push('');
  lines.push('## Success Criteria');
  f.successCriteria.forEach((c, i) => lines.push(`${i + 1}. ${c}`));
  return lines.join('\n');
}
