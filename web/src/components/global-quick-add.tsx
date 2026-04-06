'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { useDashboardConfig } from '@/lib/dashboard-config';
import { cn } from '@/lib/utils';
import { CalendarDatePicker } from '@/components/calendar-date-picker';

type QuickAddType = 'task' | 'idea' | 'thought' | 'win' | 'reminder';

const QUICK_ADD_OPTIONS: { type: QuickAddType; label: string; icon: React.ReactNode }[] = [
  {
    type: 'task',
    label: 'Task',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    type: 'idea',
    label: 'Idea',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="2" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
        <line x1="2" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="22" y2="12" />
      </svg>
    ),
  },
  {
    type: 'thought',
    label: 'Thought',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    type: 'win',
    label: 'Win',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    type: 'reminder',
    label: 'Reminder',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
];

const ACTIONABILITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

// ── Toast ────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="fixed bottom-6 right-6 z-[60] bg-surface border border-border rounded-xl px-4 py-2.5 text-xs font-medium text-success animate-fade-in shadow-lg">
      {message}
    </div>
  );
}

// ── Task Form ────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function TaskQuickForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(todayISO());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const createTask = useMutation(api.tasks.create);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const args: { title: string; dueDate?: string } = { title: title.trim() };
      if (dueDate) args.dueDate = dueDate;
      await createTask(args);
      onDone();
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        ref={inputRef}
        type="text"
        placeholder="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border border-border bg-bg rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/80 focus:border-accent focus:outline-none"
      />
      <div className="relative">
        <button
          type="button"
          onClick={() => setDatePickerOpen((prev) => !prev)}
          className={cn(
            'flex items-center gap-2 w-full text-left text-sm rounded-lg border border-border bg-bg px-3 py-2 transition-colors',
            dueDate ? 'text-text' : 'text-text-muted/80',
            datePickerOpen && 'border-accent',
          )}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 shrink-0">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>
            {dueDate
              ? new Date(dueDate + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
              : 'Due date (optional)'}
          </span>
        </button>
        {datePickerOpen && (
          <CalendarDatePicker
            currentDate={dueDate || undefined}
            onSelect={(date) => {
              setDueDate(date ?? '');
              setDatePickerOpen(false);
            }}
            onClose={() => setDatePickerOpen(false)}
          />
        )}
      </div>
      <button
        type="submit"
        disabled={!title.trim() || saving}
        className="w-full bg-text text-bg rounded-lg py-2 text-xs font-medium transition-colors hover:bg-accent-hover disabled:opacity-30 disabled:pointer-events-none"
      >
        {saving ? 'Adding...' : 'Add Task'}
      </button>
    </form>
  );
}

// ── Idea Form ────────────────────────────────────────────

function IdeaQuickForm({ onDone }: { onDone: () => void }) {
  const [content, setContent] = useState('');
  const [actionability, setActionability] = useState('');
  const [saving, setSaving] = useState(false);
  const createIdea = useMutation(api.ideas.create);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || saving) return;
    setSaving(true);
    try {
      const args: { content: string; actionability?: string } = { content: content.trim() };
      if (actionability) args.actionability = actionability;
      await createIdea(args);
      onDone();
    } catch (err) {
      console.error('Failed to create idea:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        ref={inputRef}
        placeholder="What's the idea?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="w-full border border-border bg-bg rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/80 focus:border-accent focus:outline-none resize-none"
      />
      <select
        value={actionability}
        onChange={(e) => setActionability(e.target.value)}
        className="w-full border border-border bg-bg rounded-lg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
      >
        <option value="">Actionability (optional)</option>
        {ACTIONABILITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={!content.trim() || saving}
        className="w-full bg-text text-bg rounded-lg py-2 text-xs font-medium transition-colors hover:bg-accent-hover disabled:opacity-30 disabled:pointer-events-none"
      >
        {saving ? 'Adding...' : 'Add Idea'}
      </button>
    </form>
  );
}

// ── Thought Form ─────────────────────────────────────────

function ThoughtQuickForm({ onDone }: { onDone: () => void }) {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const createThought = useMutation(api.thoughts.create);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || saving) return;
    setSaving(true);
    try {
      const args: { content: string; title?: string } = { content: content.trim() };
      if (title.trim()) args.title = title.trim();
      await createThought(args);
      onDone();
    } catch (err) {
      console.error('Failed to create thought:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        ref={inputRef}
        placeholder="What's on your mind?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="w-full border border-border bg-bg rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/80 focus:border-accent focus:outline-none resize-none"
      />
      <input
        type="text"
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border border-border bg-bg rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/80 focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        disabled={!content.trim() || saving}
        className="w-full bg-text text-bg rounded-lg py-2 text-xs font-medium transition-colors hover:bg-accent-hover disabled:opacity-30 disabled:pointer-events-none"
      >
        {saving ? 'Adding...' : 'Add Thought'}
      </button>
    </form>
  );
}

// ── Win Form ──────────────────────────────────────────────

function WinQuickForm({ onDone }: { onDone: () => void }) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const createWin = useMutation(api.wins.create);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || saving) return;
    setSaving(true);
    try {
      await createWin({ content: content.trim() });
      onDone();
    } catch (err) {
      console.error('Failed to create win:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        ref={inputRef}
        type="text"
        placeholder="What did you accomplish?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full border border-border bg-bg rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/80 focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        disabled={!content.trim() || saving}
        className="w-full bg-text text-bg rounded-lg py-2 text-xs font-medium transition-colors hover:bg-accent-hover disabled:opacity-30 disabled:pointer-events-none"
      >
        {saving ? 'Adding...' : 'Add Win'}
      </button>
    </form>
  );
}

// ── Reminder Form ─────────────────────────────────────────

function ReminderQuickForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);
  const createReminder = useMutation(api.reminders.create);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scheduledAt || saving) return;
    setSaving(true);
    try {
      await createReminder({
        title: title.trim(),
        scheduledAt: new Date(scheduledAt).getTime(),
      });
      onDone();
    } catch (err) {
      console.error('Failed to create reminder:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        ref={inputRef}
        type="text"
        placeholder="Reminder title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border border-border bg-bg rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/80 focus:border-accent focus:outline-none"
      />
      <input
        type="datetime-local"
        value={scheduledAt}
        onChange={(e) => setScheduledAt(e.target.value)}
        className="w-full border border-border bg-bg rounded-lg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        disabled={!title.trim() || !scheduledAt || saving}
        className="w-full bg-text text-bg rounded-lg py-2 text-xs font-medium transition-colors hover:bg-accent-hover disabled:opacity-30 disabled:pointer-events-none"
      >
        {saving ? 'Adding...' : 'Add Reminder'}
      </button>
    </form>
  );
}

// ── Main Component ───────────────────────────────────────

export function GlobalQuickAdd() {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<QuickAddType | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { config } = useDashboardConfig();
  const isHeader = config.navMode === 'header';
  const popoverRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setSelectedType(null);
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, close]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedType) {
          setSelectedType(null);
        } else {
          close();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedType, close]);

  const handleSuccess = useCallback((label: string) => {
    close();
    setToast(`${label} added`);
  }, [close]);

  const FORM_MAP: Record<QuickAddType, React.ReactNode> = {
    task: <TaskQuickForm onDone={() => handleSuccess('Task')} />,
    idea: <IdeaQuickForm onDone={() => handleSuccess('Idea')} />,
    thought: <ThoughtQuickForm onDone={() => handleSuccess('Thought')} />,
    win: <WinQuickForm onDone={() => handleSuccess('Win')} />,
    reminder: <ReminderQuickForm onDone={() => handleSuccess('Reminder')} />,
  };

  return (
    <>
      <div
        ref={popoverRef}
        className={cn(
          'fixed right-4 md:right-6 z-50',
          isHeader ? 'top-[4.5rem]' : 'top-4',
        )}
      >
        {/* Trigger button */}
        <button
          onClick={() => {
            if (open) {
              close();
            } else {
              setOpen(true);
              setSelectedType(null);
            }
          }}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-text transition-all duration-200',
            'hover:bg-surface-hover hover:border-text-muted/40 hover:scale-105',
            open && 'bg-surface-hover border-text-muted/40 rotate-45 scale-105',
          )}
          aria-label="Quick add"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Dropdown */}
        {open && !selectedType && (
          <div className="absolute top-10 right-0 w-[calc(100vw-2rem)] sm:w-52 border border-border bg-surface rounded-xl shadow-xl animate-scale-in overflow-hidden">
            <div className="px-3 py-2.5 border-b border-border/40">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                Quick Add
              </span>
            </div>
            <div className="py-1">
              {QUICK_ADD_OPTIONS.map(({ type, label, icon }) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
                >
                  <span className="opacity-60">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form popover */}
        {open && selectedType && (
          <div className="absolute top-10 right-0 w-[calc(100vw-2rem)] sm:w-72 border border-border bg-surface rounded-xl shadow-xl animate-scale-in overflow-hidden">
            {/* Header with back button */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/40">
              <button
                onClick={() => setSelectedType(null)}
                className="flex h-5 w-5 items-center justify-center rounded-md text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span className="text-xs font-medium text-text">
                New {QUICK_ADD_OPTIONS.find(o => o.type === selectedType)?.label}
              </span>
            </div>
            <div className="p-4">
              {FORM_MAP[selectedType]}
            </div>
          </div>
        )}
      </div>

      {/* Success toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}
