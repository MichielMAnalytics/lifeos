'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const links = [
  { href: '/today', label: 'Today', abbr: 'To' },
  { href: '/tasks', label: 'Tasks', abbr: 'Ta' },
  { href: '/projects', label: 'Projects', abbr: 'Pr' },
  { href: '/goals', label: 'Goals', abbr: 'Go' },
  { href: '/journal', label: 'Journal', abbr: 'Jo' },
  { href: '/ideas', label: 'Ideas', abbr: 'Id' },
  { href: '/plan', label: 'Plan', abbr: 'Pl' },
  { href: '/reviews', label: 'Reviews', abbr: 'Re' },
  { href: '/finance', label: 'Finance', abbr: 'Fi' },
] as const;

const bottomLinks = [
  { href: '/settings', label: 'Settings', abbr: 'Se' },
] as const;

const STORAGE_KEY = 'lifeos-nav-expanded';

export function Nav() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') setExpanded(true);
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

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
        {links.map(({ href, label, abbr }, index) => {
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
          );
        })}
      </div>

      {/* Bottom links */}
      <div className="shrink-0 border-t border-border px-2 py-3">
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
