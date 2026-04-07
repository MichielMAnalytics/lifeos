'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * Phase 2 / Section 17C — floating Life Coach orb.
 *
 * A small circular FAB anchored to the bottom-right of every page. Click to
 * expand a polished chat-style launcher panel. Submitting the input or
 * pressing "Open full chat" navigates to /life-coach with the prompt
 * pre-filled via sessionStorage.
 *
 * Hidden on /life-coach itself (no point doubling up).
 */

const SEED_KEY = 'lifeos-coach-seed-prompt';

export function LifeCoachOrb() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Hide the orb on /life-coach (no point doubling up) and on auth/onboarding routes
  const hidden = pathname?.startsWith('/life-coach') || pathname?.startsWith('/onboarding') || pathname?.startsWith('/login');

  // Auto-focus the input when the panel opens
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Close on click outside or Esc
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (trimmed) {
      try {
        sessionStorage.setItem(SEED_KEY, trimmed);
      } catch {
        // localStorage / sessionStorage may be unavailable
      }
    }
    setOpen(false);
    setInput('');
    router.push('/life-coach');
  }, [input, router]);

  if (hidden) return null;

  return (
    <>
      {/* The FAB orb itself — bottom-right of viewport */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title="Open Life Coach"
        aria-label="Open Life Coach"
        className={cn(
          'fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-2xl transition-all duration-200',
          'bg-gradient-to-br from-accent to-accent-hover text-white',
          'hover:scale-105 active:scale-95',
          open && 'opacity-0 pointer-events-none scale-90',
        )}
        style={{
          boxShadow: '0 12px 32px var(--color-accent-glow), 0 0 0 1px rgba(255,255,255,0.06)',
        }}
      >
        {/* Sparkle / chat hybrid icon */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
        </svg>
      </button>

      {/* The expanded panel */}
      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-5 right-5 z-50 w-[min(360px,calc(100vw-32px))] rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden animate-scale-in"
          style={{
            boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px var(--color-border)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-subtle">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-hover text-white">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-text">Life Coach</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-text-muted hover:text-text transition-colors"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-4 py-4 space-y-3">
            <p className="text-xs text-text-muted leading-relaxed">
              Ask Life Coach anything about your week, plans, goals, or wins. Submitting will open the full chat.
            </p>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSend();
                } else if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="How's my week looking?"
              rows={3}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent resize-none"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-text-muted">↵ to send</span>
              <button
                type="button"
                onClick={handleSend}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors"
              >
                Open chat
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export const LIFE_COACH_SEED_KEY = SEED_KEY;
