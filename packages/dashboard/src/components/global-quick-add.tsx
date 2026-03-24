'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { useDashboardConfig } from '@/lib/dashboard-config';
import { cn } from '@/lib/utils';

type QuickAddType = 'task' | 'idea' | 'thought';

const QUICK_ADD_OPTIONS: { type: QuickAddType; label: string }[] = [
  { type: 'task', label: 'Task' },
  { type: 'idea', label: 'Idea' },
  { type: 'thought', label: 'Thought' },
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
    <div className="fixed bottom-6 right-6 z-[60] bg-surface border border-border px-4 py-2 text-xs font-medium text-success uppercase tracking-wide animate-fade-in">
      {message}
    </div>
  );
}

// ── Task Form ────────────────────────────────────────────

function TaskQuickForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
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
      const args: { title: string; dueDate?: string } = {
        title: title.trim(),
      };
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
        className="w-full border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted/50 focus:border-accent focus:outline-none"
      />
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="w-full border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        disabled={!title.trim() || saving}
        className="w-full bg-text text-bg py-2 text-xs font-medium uppercase tracking-wide transition-colors hover:bg-accent-hover disabled:opacity-30 disabled:pointer-events-none"
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
      const args: { content: string; actionability?: string } = {
        content: content.trim(),
      };
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
        className="w-full border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted/50 focus:border-accent focus:outline-none resize-none"
      />
      <select
        value={actionability}
        onChange={(e) => setActionability(e.target.value)}
        className="w-full border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
      >
        <option value="">Actionability (optional)</option>
        {ACTIONABILITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={!content.trim() || saving}
        className="w-full bg-text text-bg py-2 text-xs font-medium uppercase tracking-wide transition-colors hover:bg-accent-hover disabled:opacity-30 disabled:pointer-events-none"
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
      const args: { content: string; title?: string } = {
        content: content.trim(),
      };
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
        className="w-full border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted/50 focus:border-accent focus:outline-none resize-none"
      />
      <input
        type="text"
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted/50 focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        disabled={!content.trim() || saving}
        className="w-full bg-text text-bg py-2 text-xs font-medium uppercase tracking-wide transition-colors hover:bg-accent-hover disabled:opacity-30 disabled:pointer-events-none"
      >
        {saving ? 'Adding...' : 'Add Thought'}
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
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, close]);

  const handleSuccess = useCallback((label: string) => {
    close();
    setToast(`${label} added`);
  }, [close]);

  return (
    <>
      <div
        ref={popoverRef}
        className={cn(
          'fixed right-6 z-50',
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
            'flex h-8 w-8 items-center justify-center border border-border bg-surface text-text transition-all duration-150',
            'hover:bg-surface-hover hover:border-text-muted/40',
            open && 'bg-surface-hover border-text-muted/40 rotate-45',
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

        {/* Dropdown / Form popover */}
        {open && (
          <div className="absolute top-10 right-0 w-64 border border-border bg-surface shadow-lg">
            {/* Type selector tabs */}
            <div className="flex border-b border-border">
              {QUICK_ADD_OPTIONS.map(({ type, label }) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    'flex-1 px-3 py-2.5 text-xs font-medium uppercase tracking-wide transition-colors',
                    selectedType === type
                      ? 'text-text border-b-2 border-text'
                      : 'text-text-muted hover:text-text',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Form area */}
            {selectedType === null && (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-text-muted uppercase tracking-wide">
                  Select a type above
                </p>
              </div>
            )}
            {selectedType === 'task' && (
              <div className="p-4">
                <TaskQuickForm onDone={() => handleSuccess('Task')} />
              </div>
            )}
            {selectedType === 'idea' && (
              <div className="p-4">
                <IdeaQuickForm onDone={() => handleSuccess('Idea')} />
              </div>
            )}
            {selectedType === 'thought' && (
              <div className="p-4">
                <ThoughtQuickForm onDone={() => handleSuccess('Thought')} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Success toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}
