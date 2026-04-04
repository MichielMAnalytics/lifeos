'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'lifeos-onboarding-checklist';

interface ChecklistItem {
  id: string;
  label: string;
  message?: string;
  linkLabel?: string;
  linkHref?: string;
  tip?: string;
}

const ITEMS: ChecklistItem[] = [
  {
    id: 'coach',
    label: 'Say hello to your LifeCoach',
    linkLabel: 'Open LifeCoach',
    linkHref: '/life-coach',
    tip: 'Just say hi — your coach will introduce itself',
  },
  {
    id: 'task',
    label: 'Add your first task',
    message: 'Add a task: buy groceries after work tomorrow',
  },
  {
    id: 'plan',
    label: 'Create today\'s plan',
    message: 'Plan my day — I have a meeting at 11 and need to finish the report',
  },
  {
    id: 'journal',
    label: 'Write a journal entry',
    message: 'Journal: Had a productive morning, feeling good about progress this week',
  },
  {
    id: 'goal',
    label: 'Set your first goal',
    message: 'Set a goal: Read 12 books this year',
  },
  {
    id: 'voice',
    label: 'Send a voice note',
    tip: 'Tap the mic in Telegram or Discord — your LifeCoach transcribes it automatically',
  },
];

function getCompleted(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveCompleted(items: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(items)));
}

function CopyableMessage({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      onClick={handleCopy}
      className="mt-2 rounded-lg bg-surface/40 border border-border/30 px-3 py-2 cursor-pointer hover:bg-surface/60 transition-colors group relative"
    >
      <p className="text-[11px] text-text/80 font-mono leading-relaxed select-all pr-12">{text}</p>
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-text-muted/30 group-hover:text-accent transition-colors">
        {copied ? 'Copied!' : 'Click to copy'}
      </span>
    </div>
  );
}

export function OnboardingChecklist() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCompleted(getCompleted());
    setHidden(localStorage.getItem(STORAGE_KEY + '-hidden') === 'true');
    setRemoved(localStorage.getItem(STORAGE_KEY + '-removed') === 'true');
    setMounted(true);
  }, []);

  if (!mounted || removed) return null;

  const doneCount = completed.size;
  const totalCount = ITEMS.length;
  const progress = (doneCount / totalCount) * 100;

  if (doneCount >= totalCount) return null;

  function toggleItem(id: string) {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveCompleted(next);
      return next;
    });
  }

  function handleHide() {
    setHidden(true);
    localStorage.setItem(STORAGE_KEY + '-hidden', 'true');
  }

  function handleShow() {
    setHidden(false);
    localStorage.removeItem(STORAGE_KEY + '-hidden');
  }

  function handleRemove() {
    setRemoved(true);
    localStorage.setItem(STORAGE_KEY + '-removed', 'true');
  }

  // Hidden state — small "show guide" link
  if (hidden) {
    return (
      <div className="mb-4 flex items-center justify-between">
        <button onClick={handleShow} className="flex items-center gap-2 text-xs text-text-muted/40 hover:text-text-muted transition-colors">
          <div className="flex gap-0.5">
            {ITEMS.map((item, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full ${completed.has(item.id) ? 'bg-accent' : 'bg-text/10'}`} />
            ))}
          </div>
          <span>Continue setup ({doneCount}/{totalCount})</span>
        </button>
        <button onClick={handleRemove} className="text-[10px] text-text-muted/20 hover:text-text-muted/40 transition-colors">
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl border border-border/30 bg-surface/[0.04] animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-text">Get started with LifeOS</p>
          <p className="text-[11px] text-text-muted/50 mt-0.5">{doneCount} of {totalCount} completed</p>
        </div>
        <button
          onClick={handleHide}
          className="text-[10px] text-text-muted/30 hover:text-text-muted transition-colors px-2 py-1 rounded-md hover:bg-surface/30"
        >
          Hide
        </button>
      </div>

      {/* Progress bar */}
      <div className="mx-5 h-1.5 rounded-full bg-text/[0.05] overflow-hidden">
        <div className="h-full rounded-full bg-accent transition-all duration-500 ease-out" style={{ width: `${Math.max(progress, 2)}%` }} />
      </div>

      {/* Items */}
      <div className="px-3 py-3 space-y-0.5">
        {ITEMS.map(item => {
          const isDone = completed.has(item.id);
          const isExpanded = expanded === item.id && !isDone;

          return (
            <div key={item.id}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                  isDone ? 'opacity-40' : 'hover:bg-surface/30'
                } ${isExpanded ? 'bg-surface/30' : ''}`}
                onClick={() => !isDone && setExpanded(isExpanded ? null : item.id)}
              >
                {/* Checkbox */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleItem(item.id); }}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                    isDone ? 'bg-accent border-accent' : 'border-text-muted/20 hover:border-accent/50'
                  }`}
                >
                  {isDone && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>

                {/* Label */}
                <span className={`text-xs flex-1 ${isDone ? 'line-through' : 'text-text font-medium'}`}>
                  {item.label}
                </span>

                {/* Expand indicator */}
                {!isDone && (
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className={`text-text-muted/20 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                )}
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="pl-11 pr-3 pb-3 animate-fade-in">
                  {item.message && <CopyableMessage text={item.message} />}

                  {item.tip && (
                    <p className="mt-2 text-[11px] text-text-muted/50 leading-relaxed">{item.tip}</p>
                  )}

                  {item.linkHref && (
                    <a
                      href={item.linkHref}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] text-accent font-medium hover:underline underline-offset-2"
                    >
                      {item.linkLabel}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
