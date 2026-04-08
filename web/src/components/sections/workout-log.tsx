'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Doc, Id } from '@/lib/convex-api';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

type Workout = Doc<'workouts'>;

interface ExerciseRow {
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
  unit?: string;
}

const TYPE_COLORS: Record<string, string> = {
  strength: 'text-accent',
  cardio: 'text-success',
  mobility: 'text-warning',
  sport: 'text-text',
  other: 'text-text-muted',
};

const TYPE_LABELS: Record<string, string> = {
  strength: 'STR',
  cardio: 'CARDIO',
  mobility: 'MOB',
  sport: 'SPORT',
  other: 'OTHER',
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Exercise editor (Hevy-style table — Section 9A) ─────
// Includes a "Previous" column that shows the most-recent session's
// weight×reps for the same exercise name (matched case-insensitively).

function ExerciseTable({
  workout,
  previousByName,
}: {
  workout: Workout;
  previousByName: Map<string, { weight?: number; reps?: number; unit?: string }>;
}) {
  const updateWorkout = useMutation(api.workouts.update);
  const exercises: ExerciseRow[] = (workout.exercises ?? []) as ExerciseRow[];

  function formatPrev(name: string): string {
    const prev = previousByName.get(name.toLowerCase().trim());
    if (!prev) return '—';
    const w = prev.weight != null ? `${prev.weight}${prev.unit ?? 'kg'}` : '';
    const r = prev.reps != null ? `×${prev.reps}` : '';
    return [w, r].filter(Boolean).join(' ') || '—';
  }

  // Local draft for the new-row inputs
  const [draftName, setDraftName] = useState('');
  const [draftSets, setDraftSets] = useState('');
  const [draftReps, setDraftReps] = useState('');
  const [draftWeight, setDraftWeight] = useState('');

  const persist = useCallback(async (next: ExerciseRow[]) => {
    try {
      await updateWorkout({ id: workout._id, exercises: next });
    } catch (err) {
      console.error('Failed to update exercises:', err);
    }
  }, [updateWorkout, workout._id]);

  const addExercise = useCallback(() => {
    if (!draftName.trim()) return;
    const next: ExerciseRow[] = [
      ...exercises,
      {
        name: draftName.trim(),
        sets: draftSets ? parseFloat(draftSets) : undefined,
        reps: draftReps ? parseFloat(draftReps) : undefined,
        weight: draftWeight ? parseFloat(draftWeight) : undefined,
        unit: draftWeight ? 'kg' : undefined,
      },
    ];
    void persist(next);
    setDraftName(''); setDraftSets(''); setDraftReps(''); setDraftWeight('');
  }, [draftName, draftSets, draftReps, draftWeight, exercises, persist]);

  const removeExercise = useCallback((idx: number) => {
    const next = exercises.filter((_, i) => i !== idx);
    void persist(next);
  }, [exercises, persist]);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addExercise();
    }
  }

  return (
    <div className="px-6 py-3 border-t border-border-subtle bg-surface/30">
      {/* Column headers */}
      <div className="grid grid-cols-[1.6fr_0.9fr_0.5fr_0.5fr_0.7fr_auto] gap-2 text-[10px] font-medium uppercase tracking-wider text-text-muted/80 pb-2 border-b border-border-subtle">
        <span>Exercise</span>
        <span className="text-right">Previous</span>
        <span className="text-right">Sets</span>
        <span className="text-right">Reps</span>
        <span className="text-right">Weight</span>
        <span className="w-3" />
      </div>

      {/* Rows */}
      {exercises.map((ex, idx) => (
        <div
          key={idx}
          className="grid grid-cols-[1.6fr_0.9fr_0.5fr_0.5fr_0.7fr_auto] gap-2 py-1.5 text-sm group items-center"
        >
          <span className="text-text truncate">{ex.name}</span>
          <span className="text-right text-text-muted/60 tabular-nums text-xs italic">
            {formatPrev(ex.name)}
          </span>
          <span className="text-right text-text-muted tabular-nums">{ex.sets ?? '—'}</span>
          <span className="text-right text-text-muted tabular-nums">{ex.reps ?? '—'}</span>
          <span className="text-right text-text-muted tabular-nums">
            {ex.weight ? `${ex.weight}${ex.unit ?? 'kg'}` : '—'}
          </span>
          <button
            onClick={() => removeExercise(idx)}
            className="opacity-0 group-hover:opacity-50 hover:!opacity-100 text-text-muted hover:text-danger transition-all"
            aria-label="Remove exercise"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}

      {/* Inline add row */}
      <div className="grid grid-cols-[1.6fr_0.9fr_0.5fr_0.5fr_0.7fr_auto] gap-2 py-2 text-sm border-t border-dashed border-border-subtle mt-1">
        <input
          type="text"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={handleKey}
          placeholder="+ Add exercise"
          className="bg-transparent text-text placeholder:text-text-muted/50 focus:outline-none border-b border-transparent focus:border-accent/40 min-w-0"
        />
        <span className="text-right text-text-muted/40 tabular-nums text-xs italic">
          {draftName ? formatPrev(draftName) : ''}
        </span>
        <input
          type="number"
          value={draftSets}
          onChange={(e) => setDraftSets(e.target.value)}
          onKeyDown={handleKey}
          placeholder="3"
          className="bg-transparent text-text placeholder:text-text-muted/50 focus:outline-none text-right tabular-nums w-full"
        />
        <input
          type="number"
          value={draftReps}
          onChange={(e) => setDraftReps(e.target.value)}
          onKeyDown={handleKey}
          placeholder="8"
          className="bg-transparent text-text placeholder:text-text-muted/50 focus:outline-none text-right tabular-nums w-full"
        />
        <input
          type="number"
          value={draftWeight}
          onChange={(e) => setDraftWeight(e.target.value)}
          onKeyDown={handleKey}
          placeholder="80kg"
          className="bg-transparent text-text placeholder:text-text-muted/50 focus:outline-none text-right tabular-nums w-full"
        />
        <span className="w-3" />
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────

export function WorkoutLog() {
  const workouts = useQuery(api.workouts.list, {});
  const createWorkout = useMutation(api.workouts.create);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('strength');
  const [duration, setDuration] = useState('');
  const [expandedId, setExpandedId] = useState<Id<'workouts'> | null>(null);

  // Section 9A — "Previous" column helper.
  // Given the workout currently being displayed, return a map of
  // lowercased exercise name → most recent same-named exercise from any
  // workout STRICTLY BEFORE this one (by date, then creation time).
  // Used by ExerciseTable to show "80kg ×8" ghost text next to each row.
  function buildPrevForWorkout(
    currentWorkout: Workout,
  ): Map<string, { weight?: number; reps?: number; unit?: string }> {
    const result = new Map<string, { weight?: number; reps?: number; unit?: string }>();
    if (!workouts) return result;
    // Walk newest → oldest so the FIRST hit per key is the most recent prior
    const ordered = [...workouts].sort((a, b) => {
      if (a.workoutDate !== b.workoutDate) return b.workoutDate.localeCompare(a.workoutDate);
      return b._creationTime - a._creationTime;
    });
    for (const w of ordered) {
      if (w._id === currentWorkout._id) continue;
      if (w.workoutDate > currentWorkout.workoutDate) continue;
      if (
        w.workoutDate === currentWorkout.workoutDate &&
        w._creationTime >= currentWorkout._creationTime
      ) continue;
      for (const ex of w.exercises ?? []) {
        const key = (ex.name ?? '').toLowerCase().trim();
        if (!key || result.has(key)) continue;
        result.set(key, { weight: ex.weight, reps: ex.reps, unit: ex.unit });
      }
    }
    return result;
  }

  if (workouts === undefined) {
    return (
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="p-6 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await createWorkout({
      title: title.trim(),
      type,
      workoutDate: todayISO(),
      durationMinutes: duration ? parseFloat(duration) : undefined,
    });
    setTitle('');
    setDuration('');
    setShowForm(false);
  }

  const recent = workouts.slice(0, 10);

  return (
    <div className="border border-border rounded-xl overflow-hidden flex flex-col">
      <div className="flex items-baseline justify-between px-6 py-4 border-b border-border">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
          Workout Log
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-text-muted hover:text-accent transition-colors"
        >
          {showForm ? 'Cancel' : '+ Log'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="px-6 py-4 border-b border-border space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Workout title..."
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/70 focus:outline-none focus:border-accent/50"
            autoFocus
          />
          <div className="flex gap-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/50"
            >
              <option value="strength">Strength</option>
              <option value="cardio">Cardio</option>
              <option value="mobility">Mobility</option>
              <option value="sport">Sport</option>
              <option value="other">Other</option>
            </select>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Duration (min)"
              className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/70 focus:outline-none focus:border-accent/50"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-accent text-bg rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors"
            >
              Log
            </button>
          </div>
        </form>
      )}

      {recent.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-text-muted">No workouts logged yet</p>
          <p className="text-xs text-text-muted mt-1">Click + Log to record your first workout</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {recent.map((w) => {
            const isExpanded = expandedId === w._id;
            const exerciseCount = (w.exercises ?? []).length;
            return (
              <div key={w._id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : w._id)}
                  className="w-full flex items-center justify-between px-6 py-4 transition-colors hover:bg-surface-hover text-left"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={cn('text-[10px] font-bold uppercase tracking-wide w-12 shrink-0', TYPE_COLORS[w.type] ?? 'text-text-muted')}>
                      {TYPE_LABELS[w.type] ?? w.type}
                    </span>
                    <span className="text-sm text-text truncate">
                      {w.title}
                    </span>
                    {exerciseCount > 0 && (
                      <span className="text-[10px] text-text-muted/70 shrink-0">
                        · {exerciseCount} exercise{exerciseCount === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {w.durationMinutes && (
                      <span className="text-xs font-mono text-text-muted">
                        {w.durationMinutes}min
                      </span>
                    )}
                    <span className="text-xs text-text-muted">
                      {w.workoutDate}
                    </span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={cn('text-text-muted/60 transition-transform', isExpanded ? 'rotate-90' : '')}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </button>
                {isExpanded && (
                  <ExerciseTable workout={w} previousByName={buildPrevForWorkout(w)} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
