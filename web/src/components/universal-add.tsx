'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { PageKey } from '@/lib/presets';

type EntityType = 'task' | 'idea' | 'thought' | 'resource' | 'journal' | 'workout';

const PAGE_DEFAULTS: Partial<Record<PageKey, { label: string; type: EntityType }>> = {
  tasks: { label: 'Task', type: 'task' },
  today: { label: 'Task', type: 'task' },
  journal: { label: 'Entry', type: 'journal' },
  ideas: { label: 'Idea', type: 'idea' },
  thoughts: { label: 'Thought', type: 'thought' },
  resources: { label: 'Resource', type: 'resource' },
  health: { label: 'Workout', type: 'workout' },
};

const SECONDARY_OPTIONS: { label: string; type: EntityType }[] = [
  { label: 'Task', type: 'task' },
  { label: 'Idea', type: 'idea' },
  { label: 'Thought', type: 'thought' },
  { label: 'Resource', type: 'resource' },
];

// ── Inline Forms ────────────────────────────────────

function TaskForm({ onClose }: { onClose: () => void }) {
  const createTask = useMutation(api.tasks.create);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createTask({ title: title.trim(), dueDate: dueDate || undefined });
    onClose();
  }, [title, dueDate, createTask, onClose]);

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input ref={inputRef} type="text" value={title} onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        placeholder="Task title..."
        className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text placeholder:text-text-muted/70 focus:outline-none focus:border-accent/50 w-48" />
      <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
        className="bg-surface border border-border rounded-lg px-2 py-1.5 text-sm text-text focus:outline-none focus:border-accent/50 w-36" />
      <button type="submit" disabled={!title.trim()}
        className="px-3 py-1.5 bg-accent text-bg rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-40">
        Add
      </button>
      <button type="button" onClick={onClose} className="p-1.5 text-text-muted hover:text-text transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </form>
  );
}

function JournalEntryForm({ onClose }: { onClose: () => void }) {
  const upsertJournal = useMutation(api.journals.upsert);
  const [mit, setMit] = useState('');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [notes, setNotes] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date().toISOString().slice(0, 10);
    await upsertJournal({
      date: today,
      mit: mit.trim() || undefined,
      p1: p1.trim() || undefined,
      p2: p2.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    onClose();
  }, [mit, p1, p2, notes, upsertJournal, onClose]);

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-center gap-2">
        <input ref={inputRef} type="text" value={mit} onChange={(e) => setMit(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
          placeholder="MIT..."
          className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text placeholder:text-text-muted/70 focus:outline-none focus:border-accent/50 flex-1" />
        <input type="text" value={p1} onChange={(e) => setP1(e.target.value)}
          placeholder="P1..."
          className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text placeholder:text-text-muted/70 focus:outline-none focus:border-accent/50 flex-1" />
        <input type="text" value={p2} onChange={(e) => setP2(e.target.value)}
          placeholder="P2..."
          className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text placeholder:text-text-muted/70 focus:outline-none focus:border-accent/50 flex-1" />
      </div>
      <div className="flex items-center gap-2">
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes..."
          className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text placeholder:text-text-muted/70 focus:outline-none focus:border-accent/50 flex-1" />
        <button type="submit"
          className="px-3 py-1.5 bg-accent text-bg rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors">
          Save
        </button>
        <button type="button" onClick={onClose} className="p-1.5 text-text-muted hover:text-text transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </form>
  );
}

function SimpleForm({ placeholder, onSubmit, onClose }: { placeholder: string; onSubmit: (text: string) => Promise<void>; onClose: () => void }) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    await onSubmit(value.trim());
    onClose();
  }, [value, onSubmit, onClose]);

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input ref={inputRef} type="text" value={value} onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        placeholder={placeholder}
        className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text placeholder:text-text-muted/70 focus:outline-none focus:border-accent/50 flex-1" />
      <button type="submit" disabled={!value.trim()}
        className="px-3 py-1.5 bg-accent text-bg rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-40">
        Add
      </button>
      <button type="button" onClick={onClose} className="p-1.5 text-text-muted hover:text-text transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </form>
  );
}

function WorkoutForm({ onClose }: { onClose: () => void }) {
  const createWorkout = useMutation(api.workouts.create);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('strength');
  const [duration, setDuration] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createWorkout({
      title: title.trim(),
      type,
      workoutDate: new Date().toISOString().slice(0, 10),
      durationMinutes: duration ? parseFloat(duration) : undefined,
    });
    onClose();
  }, [title, type, duration, createWorkout, onClose]);

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input ref={inputRef} type="text" value={title} onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        placeholder="Workout title..."
        className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text placeholder:text-text-muted/70 focus:outline-none focus:border-accent/50 w-44" />
      <select value={type} onChange={(e) => setType(e.target.value)}
        className="bg-surface border border-border rounded-lg px-2 py-1.5 text-sm text-text focus:outline-none focus:border-accent/50">
        <option value="strength">Strength</option>
        <option value="cardio">Cardio</option>
        <option value="mobility">Mobility</option>
        <option value="sport">Sport</option>
        <option value="other">Other</option>
      </select>
      <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)}
        placeholder="Min"
        className="bg-surface border border-border rounded-lg px-2 py-1.5 text-sm text-text placeholder:text-text-muted/70 focus:outline-none focus:border-accent/50 w-20" />
      <button type="submit" disabled={!title.trim()}
        className="px-3 py-1.5 bg-accent text-bg rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-40">
        Log
      </button>
      <button type="button" onClick={onClose} className="p-1.5 text-text-muted hover:text-text transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </form>
  );
}

// ── Main Component ──────────────────────────────────

export function UniversalAdd({ page }: { page: PageKey }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeType, setActiveType] = useState<EntityType | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const createIdea = useMutation(api.ideas.create);
  const createThought = useMutation(api.thoughts.create);
  const createResource = useMutation(api.resources.create);

  // Close dropdown on outside click — must be before any conditional returns
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  const defaultAction = PAGE_DEFAULTS[page];
  if (!defaultAction) return null;

  const close = () => { setActiveType(null); setDropdownOpen(false); };

  // Expanded form for the active type
  if (activeType) {
    switch (activeType) {
      case 'task':
        return <TaskForm onClose={close} />;
      case 'journal':
        return <JournalEntryForm onClose={close} />;
      case 'workout':
        return <WorkoutForm onClose={close} />;
      case 'idea':
        return <SimpleForm placeholder="Capture an idea..." onSubmit={async (text) => { await createIdea({ content: text }); }} onClose={close} />;
      case 'thought':
        return <SimpleForm placeholder="Write a thought..." onSubmit={async (text) => { await createThought({ content: text }); }} onClose={close} />;
      case 'resource':
        return <SimpleForm placeholder="Resource title..." onSubmit={async (text) => { await createResource({ title: text }); }} onClose={close} />;
    }
  }

  const secondaryOptions = SECONDARY_OPTIONS.filter((o) => o.type !== defaultAction.type);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setActiveType(defaultAction.type)}
        className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-text-muted hover:text-text hover:border-text/20 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 group-hover:opacity-80 transition-opacity">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span>{defaultAction.label}</span>
        {secondaryOptions.length > 0 && (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
            className="ml-0.5 -mr-1 pl-1 border-l border-border/50 opacity-40 hover:opacity-80 transition-opacity"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        )}
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-1 w-40 rounded-xl border border-border bg-surface shadow-xl py-1 animate-scale-in z-50">
          {secondaryOptions.map((opt) => (
            <button
              key={opt.type}
              onClick={() => { setDropdownOpen(false); setActiveType(opt.type); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
