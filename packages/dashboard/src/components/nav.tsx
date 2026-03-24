'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useDashboardConfig } from '@/lib/dashboard-config';
import { HeaderNav } from './header-nav';

const allPages: Record<string, { label: string; abbr: string }> = {
  today: { label: 'Today', abbr: 'To' },
  tasks: { label: 'Tasks', abbr: 'Ta' },
  projects: { label: 'Projects', abbr: 'Pr' },
  goals: { label: 'Goals', abbr: 'Go' },
  journal: { label: 'Journal', abbr: 'Jo' },
  ideas: { label: 'Ideas', abbr: 'Id' },
  plan: { label: 'Plan', abbr: 'Pl' },
  reviews: { label: 'Reviews', abbr: 'Re' },
};

const bottomLinks = [
  { href: '/settings', label: 'Settings', abbr: 'Se' },
] as const;

const STORAGE_KEY = 'lifeos-nav-expanded';

export function Nav() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { config, isConfigMode, toggleConfigMode, togglePageVisibility } = useDashboardConfig();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') setExpanded(true);
    setMounted(true);
  }, []);

  if (config.navMode === 'header') {
    return <HeaderNav />;
  }

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

  // Build nav links based on config
  const visiblePages = config.navOrder.filter(p => !config.navHidden.includes(p));
  const navLinks = isConfigMode
    ? config.navOrder.map(key => ({
        key,
        href: `/${key}`,
        ...(allPages[key] ?? { label: key, abbr: key.slice(0, 2) }),
        hidden: config.navHidden.includes(key),
      }))
    : visiblePages.map(key => ({
        key,
        href: `/${key}`,
        ...(allPages[key] ?? { label: key, abbr: key.slice(0, 2) }),
        hidden: false,
      }));

  return (
    <nav
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-bg transition-all duration-200',
        expanded ? 'w-52' : 'w-14',
      )}
    >
      {/* Logo area */}
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-border',
          expanded ? 'justify-between px-4' : 'justify-center',
        )}
      >
        {expanded ? (
          <>
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-text animate-fade-in">
              LIFEOS
            </span>
            <button
              onClick={toggle}
              className="flex h-7 w-7 shrink-0 items-center justify-center text-text-muted transition-colors hover:text-text font-mono text-xs"
              title="Collapse sidebar"
            >
              &larr;
            </button>
          </>
        ) : (
          <button
            onClick={toggle}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-text text-xs font-bold transition-colors hover:border-text-muted"
            title="Expand sidebar"
          >
            L
          </button>
        )}
      </div>

      {/* Main links */}
      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pt-4">
        {navLinks.map(({ key, href, label, abbr, hidden }, index) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');

          return (
            <div key={key} className="relative flex items-center">
              <Link
                href={href}
                title={expanded ? undefined : label}
                className={cn(
                  'group relative flex h-9 items-center transition-all duration-150 flex-1',
                  expanded ? 'px-3 gap-3 rounded-lg' : 'justify-center w-10 mx-auto rounded-md',
                  hidden && 'opacity-40',
                  isActive
                    ? 'text-text'
                    : 'text-text-muted hover:text-text',
                )}
                style={
                  expanded && mounted
                    ? { animationDelay: `${index * 30}ms` }
                    : undefined
                }
              >
                {/* Active dot indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-text" />
                )}
                {expanded ? (
                  <span className="text-sm font-medium animate-slide-in">{label}</span>
                ) : (
                  <span className="font-mono text-[11px] font-medium tracking-tight">{abbr}</span>
                )}
              </Link>

              {/* Config mode: visibility toggle */}
              {isConfigMode && expanded && (
                <button
                  onClick={() => togglePageVisibility(key, hidden)}
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors mr-1',
                    hidden
                      ? 'text-text-muted hover:text-text'
                      : 'text-text hover:text-text-muted',
                  )}
                  title={hidden ? `Show ${label}` : `Hide ${label}`}
                >
                  {hidden ? (
                    // Eye-off icon (simplified SVG)
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    // Eye icon (simplified SVG)
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              )}

              {/* Config mode: compact visibility toggle (collapsed sidebar) */}
              {isConfigMode && !expanded && (
                <button
                  onClick={() => togglePageVisibility(key, hidden)}
                  className={cn(
                    'absolute -right-0.5 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full text-[8px] transition-colors',
                    hidden
                      ? 'bg-border text-text-muted'
                      : 'bg-text text-bg',
                  )}
                  title={hidden ? `Show ${label}` : `Hide ${label}`}
                >
                  {hidden ? '\u2013' : '\u2713'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom links */}
      <div className="shrink-0 border-t border-border px-2 py-3">
        {/* Configure mode toggle */}
        <button
          onClick={toggleConfigMode}
          title={expanded ? undefined : (isConfigMode ? 'Exit Configure' : 'Configure')}
          className={cn(
            'group relative flex h-9 items-center transition-all duration-150 w-full',
            expanded ? 'px-3 gap-3 rounded-lg' : 'justify-center w-10 mx-auto rounded-md',
            isConfigMode
              ? 'text-text bg-border/50'
              : 'text-text-muted hover:text-text',
          )}
        >
          {expanded ? (
            <span className="text-sm font-medium animate-slide-in flex items-center gap-2">
              {/* Gear icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              {isConfigMode ? 'Done' : 'Configure'}
            </span>
          ) : (
            // Gear icon (collapsed)
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          )}
        </button>

        {bottomLinks.map(({ href, label, abbr }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');

          return (
            <Link
              key={href}
              href={href}
              title={expanded ? undefined : label}
              className={cn(
                'group relative flex h-9 items-center transition-all duration-150',
                expanded ? 'px-3 gap-3 rounded-lg' : 'justify-center w-10 mx-auto rounded-md',
                isActive
                  ? 'text-text'
                  : 'text-text-muted hover:text-text',
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-text" />
              )}
              {expanded ? (
                <span className="text-sm font-medium animate-slide-in">{label}</span>
              ) : (
                <span className="font-mono text-[11px] font-medium tracking-tight">{abbr}</span>
              )}
            </Link>
          );
        })}

        {/* Toggle arrow at the very bottom */}
        {!expanded && (
          <button
            onClick={toggle}
            className="flex h-9 w-10 mx-auto items-center justify-center text-text-muted hover:text-text transition-colors font-mono text-xs mt-1"
            title="Expand sidebar"
          >
            &rarr;
          </button>
        )}
      </div>
    </nav>
  );
}
