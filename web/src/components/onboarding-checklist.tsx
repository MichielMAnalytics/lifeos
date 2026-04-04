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
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCompleted(getCompletedItems());
    setDismissed(localStorage.getItem(STORAGE_KEY + '-dismissed') === 'true');
    setMounted(true);
  }, []);

  if (!mounted || dismissed) return null;

  const doneCount = completed.size;
  const totalCount = ITEMS.length;
  const progress = (doneCount / totalCount) * 100;

  // Hide when all done
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

  function handleAction(href: string) {
    window.location.href = href;
  }

  return (
    <div className="mb-6 rounded-2xl border border-accent/20 bg-accent/[0.03] p-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-2 group">
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`text-text-muted/40 transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span className="text-sm font-semibold text-text">Get started with LifeOS</span>
        </button>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-text-muted/50">{doneCount} of {totalCount}</span>
          <button
            onClick={handleDismiss}
            className="text-[10px] text-text-muted/30 hover:text-text-muted transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 rounded-full bg-text/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
          style={{ width: `${Math.max(progress, 2)}%` }}
        />
      </div>

      {/* Items */}
      {!collapsed && (
        <div className="mt-4 space-y-1">
          {ITEMS.map(item => {
            const isDone = completed.has(item.id);
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                  isDone ? 'opacity-50' : 'hover:bg-accent/[0.04] cursor-pointer'
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleItem(item.id)}
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

                {/* Text */}
                <div className="flex-1 min-w-0" onClick={() => !isDone && handleAction(item.href)}>
                  <span className={`text-xs block ${isDone ? 'text-text-muted/40 line-through' : 'text-text font-medium'}`}>
                    {item.label}
                  </span>
                  {!isDone && (
                    <span className="text-[10px] text-text-muted/50">{item.desc}</span>
                  )}
                </div>

                {/* Action link */}
                {!isDone && (
                  <button
                    onClick={() => handleAction(item.href)}
                    className="text-[10px] text-accent font-medium shrink-0 hover:underline underline-offset-2"
                  >
                    {item.action}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
