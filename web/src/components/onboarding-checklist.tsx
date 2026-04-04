'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'lifeos-onboarding-checklist';

interface ChecklistItem {
  id: string;
  label: string;
  hint: string;
  copyText?: string;
  linkLabel?: string;
  linkHref?: string;
}

const ITEMS: ChecklistItem[] = [
  {
    id: 'coach',
    label: 'Say hello to your LifeCoach',
    hint: 'Open a chat and send your first message',
    linkLabel: 'Open LifeCoach',
    linkHref: '/life-coach',
  },
  {
    id: 'task',
    label: 'Add your first task',
    hint: 'Try copy-pasting this into the LifeCoach chat:',
    copyText: 'Add a task: buy groceries after work tomorrow',
  },
  {
    id: 'plan',
    label: 'Create today\'s plan',
    hint: 'Ask your LifeCoach to plan your day:',
    copyText: 'Plan my day — I have a meeting at 11 and need to finish the report',
  },
  {
    id: 'journal',
    label: 'Write a journal entry',
    hint: 'Send a quick reflection:',
    copyText: 'Journal: Had a productive morning, feeling good about the progress this week',
  },
  {
    id: 'goal',
    label: 'Set your first goal',
    hint: 'Tell your LifeCoach what you\'re working towards:',
    copyText: 'Set a goal: Read 12 books this year',
  },
  {
    id: 'voice',
    label: 'Send a voice note',
    hint: 'Tap the mic icon in Telegram or Discord and speak naturally — your LifeCoach transcribes and processes it automatically.',
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-1.5 flex items-stretch gap-0 rounded-lg border border-border/40 overflow-hidden bg-surface/20">
      <span className="flex-1 px-3 py-2 text-[11px] text-text font-mono leading-relaxed select-all">{text}</span>
      <button
        onClick={handleCopy}
        className="px-3 border-l border-border/40 text-[10px] font-medium text-accent hover:bg-surface/40 transition-colors shrink-0"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

export function OnboardingChecklist() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCompleted(getCompleted());
    setDismissed(localStorage.getItem(STORAGE_KEY + '-dismissed') === 'true');
    setMounted(true);
  }, []);

  if (!mounted || dismissed) return null;

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

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY + '-dismissed', 'true');
  }

  return (
    <div className="mb-6 rounded-2xl border border-accent/20 bg-accent/[0.03] animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 flex items-center justify-between">
        <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-2">
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`text-text-muted/40 transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span className="text-sm font-semibold text-text">Get started with LifeOS</span>
        </button>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-text-muted/50">{doneCount} of {totalCount}</span>
          <button onClick={handleDismiss} className="text-[10px] text-text-muted/30 hover:text-text-muted transition-colors">
            Dismiss
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-text/[0.04]">
        <div className="h-full bg-accent transition-all duration-500 ease-out" style={{ width: `${Math.max(progress, 2)}%` }} />
      </div>

      {/* Items */}
      {!collapsed && (
        <div className="p-2">
          {ITEMS.map(item => {
            const isDone = completed.has(item.id);
            const isExpanded = expanded === item.id && !isDone;

            return (
              <div key={item.id} className="rounded-xl transition-colors">
                {/* Row */}
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isDone ? '' : 'hover:bg-accent/[0.04]'
                  } ${isExpanded ? 'bg-accent/[0.04]' : ''}`}
                  onClick={() => !isDone && setExpanded(isExpanded ? null : item.id)}
                >
                  {/* Checkbox */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleItem(item.id); }}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                      isDone ? 'bg-accent border-accent' : 'border-text-muted/25 hover:border-accent/50'
                    }`}
                  >
                    {isDone && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>

                  {/* Label */}
                  <span className={`text-xs flex-1 ${isDone ? 'text-text-muted/35 line-through' : 'text-text font-medium'}`}>
                    {item.label}
                  </span>

                  {/* Expand chevron */}
                  {!isDone && (
                    <svg
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className={`text-text-muted/25 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  )}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-3 pb-3 ml-8 animate-fade-in">
                    <p className="text-[11px] text-text-muted/60 mb-1">{item.hint}</p>

                    {item.copyText && <CopyButton text={item.copyText} />}

                    {item.linkHref && (
                      <a
                        href={item.linkHref}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] text-accent font-medium hover:underline underline-offset-2"
                      >
                        {item.linkLabel}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      )}
    </div>
  );
}
