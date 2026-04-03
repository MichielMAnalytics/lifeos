'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import Link from 'next/link';

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

export function WorkoutLog() {
  const workouts = useQuery(api.workouts.list, {});
  const createWorkout = useMutation(api.workouts.create);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('strength');
  const [duration, setDuration] = useState('');

  if (workouts === undefined) {
    return <div className="animate-pulse h-32 bg-surface rounded-lg" />;
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

  // Show last 10
  const recent = workouts.slice(0, 10);

  return (
    <div className="border border-border rounded-xl overflow-hidden flex flex-col">
      <div className="flex items-baseline justify-between px-6 py-4 border-b border-border">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/60">
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
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/40 focus:outline-none focus:border-accent/50"
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
              className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/40 focus:outline-none focus:border-accent/50"
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
          <p className="text-xs text-text-muted/60 mt-1">Click + Log to record your first workout</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {recent.map((w) => (
            <Link
              key={w._id}
              href={`/health`}
              className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-surface-hover"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className={`text-[10px] font-bold uppercase tracking-wide w-12 shrink-0 ${TYPE_COLORS[w.type] ?? 'text-text-muted'}`}>
                  {TYPE_LABELS[w.type] ?? w.type}
                </span>
                <span className="text-sm text-text truncate">
                  {w.title}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {w.durationMinutes && (
                  <span className="text-xs font-mono text-text-muted">
                    {w.durationMinutes}min
                  </span>
                )}
                <span className="text-xs text-text-muted/60">
                  {w.workoutDate}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
