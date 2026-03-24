'use client';

import { useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useDashboardConfig } from '@/lib/dashboard-config';
import { LogoHorizontal } from './theme-logo';
import { NAV_MARKS } from './nav-marks';

const allPages: Record<string, { label: string }> = {
  today: { label: 'Today' },
  tasks: { label: 'Tasks' },
  projects: { label: 'Projects' },
  goals: { label: 'Goals' },
  journal: { label: 'Journal' },
  ideas: { label: 'Ideas' },
  plan: { label: 'Plan' },
  reviews: { label: 'Reviews' },
};

/* ── SVG icon components ─────────────────────────────────── */

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function GearIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function GripIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </svg>
  );
}

/* ── Main component ──────────────────────────────────────── */

export function HeaderNav() {
  const pathname = usePathname();
  const {
    config,
    isConfigMode,
    toggleConfigMode,
    setNavMode,
    setNavOrder,
    togglePageVisibility,
  } = useDashboardConfig();

  // Drag-and-drop state for reordering in config mode
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const visiblePages = config.navOrder.filter(p => !config.navHidden.includes(p));

  // In config mode, show ALL pages from navOrder (hidden ones are dimmed).
  // In normal mode, only show visible pages.
  const displayPages = isConfigMode ? config.navOrder : visiblePages;

  /* ── Drag handlers ─────────────────────────────────────── */

  const handleDragStart = useCallback((index: number, e: React.DragEvent<HTMLDivElement>) => {
    setDragIndex(index);
    dragNodeRef.current = e.currentTarget;
    e.dataTransfer.effectAllowed = 'move';
    // Slight delay so the drag ghost captures correctly
    requestAnimationFrame(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.style.opacity = '0.4';
      }
    });
  }, []);

  const handleDragOver = useCallback((index: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '1';
    }
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const newOrder = [...config.navOrder];
      const [moved] = newOrder.splice(dragIndex, 1);
      newOrder.splice(dragOverIndex, 0, moved);
      setNavOrder(newOrder);
    }
    setDragIndex(null);
    setDragOverIndex(null);
    dragNodeRef.current = null;
  }, [dragIndex, dragOverIndex, config.navOrder, setNavOrder]);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-bg">
      {/* ── Primary row: logo + nav + actions ─────────────── */}
      <div className="flex h-14 items-center px-6 gap-1">
        {/* Logo */}
        <Link href="/today" className="mr-6 shrink-0 flex items-center">
          <LogoHorizontal height={38} />
        </Link>

        {/* Nav links */}
        <nav className="flex items-center justify-center gap-0.5 flex-1 min-w-0 overflow-x-auto">
          {displayPages.map((key, index) => {
            const page = allPages[key];
            if (!page) return null;
            const href = `/${key}`;
            const isActive = pathname === href || pathname.startsWith(href + '/');
            const isHidden = config.navHidden.includes(key);

            return (
              <div
                key={key}
                className={cn(
                  'flex items-center shrink-0 group',
                  isConfigMode && dragOverIndex === index && 'ring-1 ring-text/30 rounded',
                )}
                draggable={isConfigMode}
                onDragStart={(e) => handleDragStart(index, e)}
                onDragOver={(e) => handleDragOver(index, e)}
                onDragEnd={handleDragEnd}
                onDragLeave={handleDragLeave}
              >
                {/* Drag grip (config mode only) */}
                {isConfigMode && (
                  <span className="cursor-grab text-text-muted/50 hover:text-text-muted mr-0.5 shrink-0">
                    <GripIcon />
                  </span>
                )}

                <Link
                  href={href}
                  className={cn(
                    'px-3 py-1.5 text-sm transition-colors rounded whitespace-nowrap',
                    isHidden && 'opacity-40 line-through decoration-1',
                    isActive
                      ? 'text-text bg-surface'
                      : 'text-text-muted hover:text-text',
                  )}
                >
                  {(() => {
                    const Mark = NAV_MARKS[key];
                    return (
                      <span className="flex items-center gap-1.5">
                        {Mark && <Mark className="shrink-0 opacity-60" />}
                        {page.label}
                      </span>
                    );
                  })()}
                </Link>

                {/* Visibility toggle (config mode only) */}
                {isConfigMode && (
                  <button
                    onClick={() => togglePageVisibility(key, isHidden)}
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors',
                      isHidden
                        ? 'text-text-muted hover:text-text'
                        : 'text-text hover:text-text-muted',
                    )}
                    title={isHidden ? `Show ${page.label}` : `Hide ${page.label}`}
                  >
                    {isHidden ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                )}
              </div>
            );
          })}
        </nav>

        {/* Right side: configure + settings */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            onClick={toggleConfigMode}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-wider transition-colors rounded border',
              isConfigMode
                ? 'border-text text-text bg-surface font-bold'
                : 'border-border text-text-muted hover:text-text hover:border-text/40',
            )}
          >
            <GearIcon size={12} />
            {isConfigMode ? 'Done' : 'Configure'}
          </button>
          <Link
            href="/settings"
            className="px-3 py-1.5 text-sm text-text-muted hover:text-text transition-colors"
          >
            Settings
          </Link>
        </div>
      </div>

      {/* ── Config bar (only visible in config mode) ─────── */}
      {isConfigMode && (
        <div className="flex items-center gap-4 px-6 py-2 border-t border-border/50 bg-surface/50 animate-fade-in">
          <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted shrink-0">
            Navigation
          </span>

          <div className="h-3 w-px bg-border" />

          {/* Nav mode toggle: sidebar / header */}
          <div className="flex gap-1">
            <button
              onClick={() => setNavMode('sidebar')}
              className={cn(
                'px-3 py-1 text-xs uppercase tracking-wider transition-colors border',
                config.navMode === 'sidebar'
                  ? 'border-text text-text'
                  : 'border-border text-text-muted hover:text-text hover:border-text/40',
              )}
            >
              Sidebar
            </button>
            <button
              onClick={() => setNavMode('header')}
              className={cn(
                'px-3 py-1 text-xs uppercase tracking-wider transition-colors border',
                config.navMode === 'header'
                  ? 'border-text text-text'
                  : 'border-border text-text-muted hover:text-text hover:border-text/40',
              )}
            >
              Header
            </button>
          </div>

          <div className="h-3 w-px bg-border" />

          <span className="text-[10px] text-text-muted">
            Drag items to reorder. Click the eye icon to show/hide pages.
          </span>
        </div>
      )}
    </header>
  );
}
