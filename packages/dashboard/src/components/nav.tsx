'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { cn } from '@/lib/utils';
import { useDashboardConfig } from '@/lib/dashboard-config';
import { HeaderNav } from './header-nav';
import { LogoMark, LogoHorizontal } from './theme-logo';
import { NAV_MARKS } from './nav-marks';
import { SearchTrigger } from './search-modal';
import { GatewayStatusIndicator } from './ai-agent/gateway-status-indicator';

const allPages: Record<string, { label: string; abbr: string }> = {
  'life-coach': { label: 'Life Coach', abbr: 'Lc' },
  today: { label: 'Today', abbr: 'To' },
  tasks: { label: 'Tasks', abbr: 'Ta' },
  projects: { label: 'Projects', abbr: 'Pr' },
  goals: { label: 'Compass', abbr: 'Co' },
  journal: { label: 'Journal', abbr: 'Jo' },
  ideas: { label: 'Ideas', abbr: 'Id' },
  thoughts: { label: 'Thoughts', abbr: 'Th' },
  plan: { label: 'Plan', abbr: 'Pl' },
  reviews: { label: 'Reviews', abbr: 'Re' },
  resources: { label: 'Resources', abbr: 'Rs' },
  calendar: { label: 'Calendar', abbr: 'Ca' },
};

const bottomLinks = [
  { href: '/settings', label: 'Settings', abbr: 'Se' },
] as const;

const STORAGE_KEY = 'lifeos-nav-expanded';

export function Nav() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { config, isConfigMode, toggleConfigMode, togglePageVisibility, setNavOrder } = useDashboardConfig();
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

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
            <LogoMark size={28} className="animate-fade-in" />
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
            className="flex shrink-0 items-center justify-center transition-colors hover:opacity-70"
            title="Expand sidebar"
          >
            <LogoMark size={28} />
          </button>
        )}
      </div>

      {/* Main links */}
      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pt-4">
        {navLinks.map(({ key, href, label, abbr, hidden }, index) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');

          return (
            <div
              key={key}
              className={cn(
                'relative flex items-center',
                isConfigMode && dragOverKey === key && 'border-t-2 border-text',
              )}
              draggable={isConfigMode}
              onDragStart={(e) => {
                setDragKey(key);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragOverKey(key);
              }}
              onDragLeave={() => setDragOverKey(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverKey(null);
                if (!dragKey || dragKey === key) return;
                const order = [...config.navOrder];
                const fromIdx = order.indexOf(dragKey);
                const toIdx = order.indexOf(key);
                if (fromIdx === -1 || toIdx === -1) return;
                order.splice(fromIdx, 1);
                order.splice(toIdx, 0, dragKey);
                setNavOrder(order);
                setDragKey(null);
              }}
              onDragEnd={() => { setDragKey(null); setDragOverKey(null); }}
            >
              {/* Drag grip in config mode */}
              {isConfigMode && expanded && (
                <span className="flex items-center justify-center w-5 shrink-0 cursor-grab text-text-muted/40 hover:text-text-muted">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    <circle cx="3" cy="2" r="1" /><circle cx="7" cy="2" r="1" />
                    <circle cx="3" cy="5" r="1" /><circle cx="7" cy="5" r="1" />
                    <circle cx="3" cy="8" r="1" /><circle cx="7" cy="8" r="1" />
                  </svg>
                </span>
              )}
              <Link
                href={href}
                title={expanded ? undefined : label}
                className={cn(
                  'group relative flex h-9 items-center transition-all duration-150 flex-1',
                  expanded ? (isConfigMode ? 'px-1 gap-2 rounded-lg' : 'px-3 gap-3 rounded-lg') : 'justify-center w-10 mx-auto rounded-md',
                  hidden && 'opacity-40',
                  isActive
                    ? 'text-text'
                    : 'text-text-muted hover:text-text',
                  isConfigMode && dragKey === key && 'opacity-30',
                )}
                style={
                  expanded && mounted && !isConfigMode
                    ? { animationDelay: `${index * 30}ms` }
                    : undefined
                }
                onClick={isConfigMode ? (e) => e.preventDefault() : undefined}
              >
                {/* Active dot indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-text" />
                )}
                {(() => {
                  if (key === 'life-coach') {
                    return expanded ? (
                      <span className="flex items-center gap-2.5 text-sm font-medium animate-slide-in group/lc relative">
                        <img src="/openclaw-icon.png" alt="Life Coach" className="shrink-0 size-4 rounded-sm" />
                        {label}
                        <span className="absolute left-0 bottom-full mb-1 z-50 hidden group-hover/lc:block bg-surface border border-border rounded px-2 py-1 text-[10px] text-text-muted whitespace-nowrap shadow-lg pointer-events-auto">
                          Powered by <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open('https://openclaw.ai/', '_blank'); }} className="text-accent hover:underline cursor-pointer">OpenClaw</span>
                        </span>
                      </span>
                    ) : (
                      <span className="relative group/lc">
                        <img src="/openclaw-icon.png" alt="Life Coach" className="shrink-0 size-4 rounded-sm" />
                        <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 hidden group-hover/lc:block bg-surface border border-border rounded px-2 py-1 text-[10px] text-text-muted whitespace-nowrap shadow-lg pointer-events-auto">
                          Powered by <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open('https://openclaw.ai/', '_blank'); }} className="text-accent hover:underline cursor-pointer">OpenClaw</span>
                        </span>
                      </span>
                    );
                  }
                  const Mark = NAV_MARKS[key];
                  return expanded ? (
                    <span className="flex items-center gap-2.5 text-sm font-medium animate-slide-in">
                      {Mark && <Mark className="shrink-0 opacity-70" />}
                      {label}
                    </span>
                  ) : (
                    Mark ? <Mark className="shrink-0" /> : <span className="font-mono text-[11px] font-medium tracking-tight">{abbr}</span>
                  );
                })()}
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

            </div>
          );
        })}
      </div>

      {/* Bottom links */}
      <div className="shrink-0 border-t border-border px-2 py-3">
        {/* Search trigger */}
        <div
          className={cn(
            'group relative flex h-9 items-center transition-all duration-150 w-full',
            expanded ? 'px-3 gap-3 rounded-lg' : 'justify-center w-10 mx-auto rounded-md',
          )}
        >
          {expanded ? (
            <SearchTrigger variant="expanded" />
          ) : (
            <SearchTrigger variant="icon" />
          )}
        </div>

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
            <span className="text-sm font-medium animate-slide-in">
              {isConfigMode ? 'Done' : 'Configure'}
            </span>
          ) : (
            <span className="font-mono text-[11px] font-medium tracking-tight">
              {isConfigMode ? '×' : 'Cf'}
            </span>
          )}
        </button>

        {expanded && <GatewayStatusIndicator />}

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
              {(() => {
                const key = href.slice(1); // "/settings" -> "settings"
                const Mark = NAV_MARKS[key];
                return expanded ? (
                  <span className="flex items-center gap-2.5 text-sm font-medium animate-slide-in">
                    {Mark && <Mark className="shrink-0 opacity-70" />}
                    {label}
                  </span>
                ) : (
                  Mark ? <Mark className="shrink-0" /> : <span className="font-mono text-[11px] font-medium tracking-tight">{abbr}</span>
                );
              })()}
            </Link>
          );
        })}

        {/* Profile + Plan */}
        <ProfileBadge expanded={expanded} />

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

const PLAN_LABELS: Record<string, string> = {
  dashboard: 'Home',
  byok: 'BYOK',
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
};

function ProfileBadge({ expanded }: { expanded: boolean }) {
  const user = useQuery(api.authHelpers.getMe, {});
  const subscription = useQuery(api.stripe.getMySubscription);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('lifeos-avatar');
    if (stored) setAvatar(stored);
  }, []);

  if (!user) return null;

  const profileImage = avatar ?? user.image;
  const initials = (user.name ?? user.email ?? '?')
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');

  const planLabel = subscription ? PLAN_LABELS[subscription.planType] ?? 'No plan' : 'No plan';

  return (
    <Link
      href="/settings"
      title={expanded ? undefined : `${user.name ?? user.email} — ${planLabel}`}
      className={cn(
        'flex items-center transition-all duration-150 mt-1',
        expanded ? 'gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-hover' : 'justify-center w-10 mx-auto py-2',
      )}
    >
      {profileImage ? (
        <img
          src={profileImage}
          alt=""
          className="size-7 rounded-full shrink-0 object-cover"
        />
      ) : (
        <span className="size-7 rounded-full shrink-0 bg-surface flex items-center justify-center text-[10px] font-bold text-text-muted">
          {initials}
        </span>
      )}
      {expanded && (
        <span className="flex flex-col min-w-0 animate-slide-in">
          <span className="text-xs font-medium text-text truncate">{user.name ?? user.email}</span>
          <span className="text-[10px] text-text-muted">{planLabel} plan</span>
        </span>
      )}
    </Link>
  );
}
