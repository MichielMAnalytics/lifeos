'use client';

import { useEffect } from 'react';
import { useDashboardConfig } from '@/lib/dashboard-config';
import { cn } from '@/lib/utils';

/**
 * Phase 2 / Section 14C — Notion Edit Pill.
 *
 * A small pill button in the page header (next to the avatar / Add button)
 * that toggles configure mode. The same physical button is the entry AND
 * the exit:
 *   - Off state: outline pill labeled "Edit layout" with a sliders icon.
 *   - On state:  filled accent pill labeled "✓ Done".
 * Plus Esc anywhere exits configure mode (universal escape hatch).
 *
 * The old profile-menu "Configure layout" entry has been removed; this is
 * the canonical entry point now.
 */
export function ConfigureToggle() {
  const { isConfigMode, toggleConfigMode } = useDashboardConfig();

  // Universal Esc exit for config mode (Section 14 best practice)
  useEffect(() => {
    if (!isConfigMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Don't intercept when focus is in an input
        const target = e.target as HTMLElement | null;
        if (target) {
          const tag = target.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
            return;
          }
        }
        toggleConfigMode();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isConfigMode, toggleConfigMode]);

  return (
    <button
      type="button"
      onClick={toggleConfigMode}
      title={isConfigMode ? 'Exit configure mode (Esc)' : 'Configure layout'}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer border',
        isConfigMode
          ? 'bg-accent text-white border-accent shadow-sm'
          : 'bg-transparent text-text-muted border-border hover:text-text hover:border-text/40',
      )}
    >
      {isConfigMode ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Done
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" />
            <line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
          </svg>
          Edit layout
        </>
      )}
    </button>
  );
}
