'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'lifeos-onboarding-checklist';

interface ChecklistItem {
  id: string;
  label: string;
  desc: string;
  action: string;
  href: string;
}

const ITEMS: ChecklistItem[] = [
  {
    id: 'coach',
    label: 'Say hello to your LifeCoach',
    desc: 'Send your first message',
    action: 'Open LifeCoach',
    href: '/life-coach',
  },
  {
    id: 'task',
    label: 'Add your first task',
    desc: 'Try typing "Buy groceries tomorrow"',
    action: 'Add a task',
    href: '/tasks',
  },
  {
    id: 'plan',
    label: 'Create today\'s plan',
    desc: 'Set your top priorities for the day',
    action: 'Open planner',
    href: '/plan',
  },
  {
    id: 'journal',
    label: 'Write a journal entry',
    desc: 'Reflect on how your day is going',
    action: 'Open journal',
    href: '/journal',
  },
  {
    id: 'goal',
    label: 'Set your first goal',
    desc: 'What do you want to achieve this quarter?',
    action: 'Add a goal',
    href: '/goals',
  },
  {
    id: 'voice',
    label: 'Send a voice note',
    desc: 'Your LifeCoach transcribes and processes it',
    action: 'Open LifeCoach',
    href: '/life-coach',
  },
];

function getCompletedItems(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveCompletedItems(items: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(items)));
}

export function OnboardingChecklist() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    setCompleted(getCompletedItems());
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveCompletedItems(next);
      return next;
    });
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY + '-dismissed', 'true');
  }

  // Collapsed: just a small pill
  if (collapsed) {
    return (
      <div
        className="fixed bottom-5 left-5 z-50 animate-fade-in"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-2.5 rounded-full border border-accent/20 bg-bg/95 backdrop-blur-sm shadow-lg px-4 py-2.5 hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          {/* Progress ring */}
          <div className="relative w-6 h-6">
            <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="none" stroke="var(--color-text)" strokeWidth="2" opacity="0.06" />
              <circle
                cx="12" cy="12" r="10" fill="none" stroke="var(--color-accent)" strokeWidth="2"
                strokeDasharray={`${progress * 0.628} 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-accent">{doneCount}</span>
          </div>
          <span className="text-xs font-medium text-text">Setup guide</span>
        </button>

        {/* X dismiss on hover */}
        {hovering && (
          <button
            onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-bg border border-border/40 shadow-sm flex items-center justify-center text-text-muted/40 hover:text-text-muted hover:bg-surface transition-colors text-xs"
          >
            &times;
          </button>
        )}
      </div>
    );
  }

  // Expanded panel
  return (
    <div
      className="fixed bottom-5 left-5 z-50 w-80 animate-fade-in"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="rounded-2xl border border-border/40 bg-bg/95 backdrop-blur-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-border/30">
          <button onClick={() => setCollapsed(true)} className="flex items-center gap-2 group">
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="text-text-muted/40"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            <span className="text-xs font-semibold text-text">Get started</span>
          </button>
          <span className="text-[10px] text-text-muted/50">{doneCount}/{totalCount}</span>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-text/[0.04]">
          <div
            className="h-full bg-accent transition-all duration-500 ease-out"
            style={{ width: `${Math.max(progress, 3)}%` }}
          />
        </div>

        {/* Items */}
        <div className="py-1 max-h-80 overflow-y-auto">
          {ITEMS.map(item => {
            const isDone = completed.has(item.id);
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                  isDone ? '' : 'hover:bg-surface/30 cursor-pointer'
                }`}
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                    isDone ? 'bg-accent border-accent' : 'border-text-muted/25 hover:border-accent/50'
                  }`}
                >
                  {isDone && (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0" onClick={() => !isDone && (window.location.href = item.href)}>
                  <span className={`text-[11px] block leading-tight ${isDone ? 'text-text-muted/35 line-through' : 'text-text font-medium'}`}>
                    {item.label}
                  </span>
                  {!isDone && (
                    <span className="text-[10px] text-text-muted/45 leading-tight">{item.desc}</span>
                  )}
                </div>

                {!isDone && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted/20 shrink-0">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* X dismiss on hover */}
      {hovering && (
        <button
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-bg border border-border/40 shadow-sm flex items-center justify-center text-text-muted/40 hover:text-text-muted hover:bg-surface transition-colors text-sm"
        >
          &times;
        </button>
      )}
    </div>
  );
}
