'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';

// ── Hint definitions ─────────────────────────────────

interface Hint {
  id: string;
  message: string;
  cta?: string;
  href?: string;
  /** If set, opens Life Coach orb with this prefilled message instead of navigating */
  prefillMessage?: string;
}

const ALL_HINTS: Hint[] = [
  {
    id: 'connect-telegram',
    message: 'Talk to your Life Coach on Telegram too.',
    cta: 'Set up Telegram',
    href: '/settings?tab=integrations',
  },
  {
    id: 'customize-dashboard',
    message: 'Ask your Life Coach to customize your home.',
    cta: 'Open Life Coach',
    href: '/life-coach',
  },
  {
    id: 'connect-calendar',
    message: 'Connect Google Calendar to see events in your plan.',
    cta: 'Integrations',
    href: '/settings?tab=integrations',
  },
  {
    id: 'set-mit',
    message: 'Set your Most Important Task for tomorrow.',
    cta: 'Go to Today',
    href: '/today',
  },
  {
    id: 'weekly-review',
    message: 'Your Life Coach can run a weekly review.',
    cta: 'Start a review',
    prefillMessage: 'Can you help me do a weekly review?',
  },
];

// ── Timing constants ─────────────────────────────────

const HINT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days per hint
const HINT_GAP_MS = 60 * 60 * 1000; // 1 hour between any hints
const STORAGE_KEY = 'lifeos-hints';

interface HintTimestamps {
  dismissed: Record<string, number>; // hintId -> timestamp
  lastShown: number; // timestamp of last hint shown
}

function getHintState(): HintTimestamps {
  if (typeof window === 'undefined') return { dismissed: {}, lastShown: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { dismissed: {}, lastShown: 0 };
    return JSON.parse(raw);
  } catch {
    return { dismissed: {}, lastShown: 0 };
  }
}

function saveHintState(state: HintTimestamps) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function dismissHint(id: string) {
  const state = getHintState();
  state.dismissed[id] = Date.now();
  saveHintState(state);
}

function markHintShown() {
  const state = getHintState();
  state.lastShown = Date.now();
  saveHintState(state);
}

function isHintDismissed(id: string): boolean {
  const state = getHintState();
  const dismissedAt = state.dismissed[id];
  if (!dismissedAt) return false;
  return Date.now() - dismissedAt < HINT_COOLDOWN_MS;
}

function canShowHint(): boolean {
  const state = getHintState();
  if (!state.lastShown) return true;
  return Date.now() - state.lastShown > HINT_GAP_MS;
}

// ── Hook to determine which hints are relevant ───────

function useActiveHint(): Hint | null {
  const profile = useQuery(api.userProfile.get);
  const reviews = useQuery(api.reviews.list, {});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (!canShowHint()) return null;

  const candidates: Hint[] = [];

  // High priority: action-based hints
  if (!isHintDismissed('set-mit') && profile?.setupCompleted) {
    candidates.push(ALL_HINTS[3]);
  }

  if (!isHintDismissed('weekly-review') && reviews !== undefined && reviews.length === 0) {
    candidates.push(ALL_HINTS[4]);
  }

  // Medium priority: integrations
  if (!isHintDismissed('connect-telegram')) {
    candidates.push(ALL_HINTS[0]);
  }

  if (!isHintDismissed('connect-calendar')) {
    candidates.push(ALL_HINTS[2]);
  }

  // Lower priority: generic
  if (!isHintDismissed('customize-dashboard')) {
    candidates.push(ALL_HINTS[1]);
  }

  return candidates[0] ?? null;
}

// ── Component ────────────────────────────────────────

export function SetupHints() {
  const hint = useActiveHint();
  const [visible, setVisible] = useState(false);
  const [currentHintId, setCurrentHintId] = useState<string | null>(null);

  useEffect(() => {
    if (!hint) {
      setVisible(false);
      return;
    }
    if (hint.id !== currentHintId) {
      setVisible(false);
      const timer = setTimeout(() => {
        setCurrentHintId(hint.id);
        setVisible(true);
        markHintShown();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [hint, currentHintId]);

  const handleDismiss = useCallback(() => {
    if (hint) {
      dismissHint(hint.id);
      setVisible(false);
      setCurrentHintId(null);
    }
  }, [hint]);

  const handleAction = useCallback(() => {
    if (!hint) return;

    // If hint has a prefill message, dispatch event for Life Coach orb
    if (hint.prefillMessage) {
      window.dispatchEvent(new CustomEvent('lifeos:open-coach', {
        detail: { message: hint.prefillMessage },
      }));
    }

    handleDismiss();
  }, [hint, handleDismiss]);

  if (!visible || !hint) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
      <div className="relative max-w-[260px] rounded-xl border border-border/30 bg-surface/95 backdrop-blur-sm shadow-md px-3 py-2.5">
        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="absolute top-1.5 right-1.5 p-0.5 rounded-full text-text-muted/30 hover:text-text-muted transition-all"
          aria-label="Dismiss hint"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="flex items-start gap-2.5 pr-4">
          <div className="shrink-0 mt-0.5">
            <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-text leading-relaxed">{hint.message}</p>
            {hint.cta && (
              hint.prefillMessage ? (
                <button
                  onClick={handleAction}
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:text-accent-hover transition-colors"
                >
                  {hint.cta}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              ) : hint.href ? (
                <a
                  href={hint.href}
                  onClick={handleDismiss}
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:text-accent-hover transition-colors"
                >
                  {hint.cta}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </a>
              ) : null
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
