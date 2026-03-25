'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery, useAction } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
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

      {/* Bottom */}
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

        {expanded && <GatewayStatusIndicator />}

        {/* Profile + menu (settings, configure, logout) */}
        <ProfileBadge expanded={expanded} toggleConfigMode={toggleConfigMode} isConfigMode={isConfigMode} />

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

function ProfileBadge({ expanded, toggleConfigMode, isConfigMode }: { expanded: boolean; toggleConfigMode: () => void; isConfigMode: boolean }) {
  const user = useQuery(api.authHelpers.getMe, {});
  const subscription = useQuery(api.stripe.getMySubscription);
  const balance = useQuery(api.stripe.getBalance);
  const creditTiers = useQuery(api.stripe.getCreditTiersList);
  const createCheckout = useAction(api.stripe.createCreditCheckout);
  const { signOut } = useAuthActions();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('lifeos-avatar');
    if (stored) setAvatar(stored);
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  if (!user) return null;

  const profileImage = avatar ?? user.image;
  const initials = (user.name ?? user.email ?? '?')
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');

  const planLabel = subscription ? PLAN_LABELS[subscription.planType] ?? 'No plan' : 'No plan';

  return (
    <div className="relative mt-1" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        title={expanded ? undefined : `${user.name ?? user.email} — ${planLabel}`}
        className={cn(
          'flex items-center transition-all duration-150 w-full',
          expanded ? 'gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-hover' : 'justify-center w-10 mx-auto py-2',
        )}
      >
        {profileImage ? (
          <img src={profileImage} alt="" className="size-7 rounded-full shrink-0 object-cover" />
        ) : (
          <span className="size-7 rounded-full shrink-0 bg-surface flex items-center justify-center text-[10px] font-bold text-text-muted">
            {initials}
          </span>
        )}
        {expanded && (
          <span className="flex flex-col min-w-0 text-left animate-slide-in">
            <span className="text-xs font-medium text-text truncate">{user.name ?? user.email}</span>
            <span className="text-[10px] text-text-muted">{planLabel} plan</span>
          </span>
        )}
      </button>

      {menuOpen && (
        <div className={cn(
          'absolute z-50 bg-surface border border-border rounded-lg shadow-lg py-1 animate-scale-in',
          expanded ? 'bottom-full left-0 right-0 mb-1' : 'bottom-full left-0 mb-1 w-48',
        )}>
          {/* Balance display */}
          {balance !== undefined && (
            <>
              <div className="px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-widest text-text-muted mb-0.5">Balance</p>
                <p className="text-sm font-bold text-text font-mono tabular-nums">
                  EUR {(balance / 100).toFixed(2)}
                </p>
              </div>
              <div className="my-1 border-t border-border/40" />
            </>
          )}

          {/* Top up */}
          <div className="relative">
            <button
              onClick={() => setTopUpOpen(!topUpOpen)}
              className="flex items-center justify-between gap-2.5 px-3 py-2 text-xs text-text-muted hover:text-text hover:bg-surface-hover transition-colors w-full text-left"
            >
              <span className="flex items-center gap-2.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Top up
              </span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn('transition-transform duration-150', topUpOpen && 'rotate-180')}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {topUpOpen && creditTiers && creditTiers.length > 0 && (
              <div className="px-2 pb-1.5">
                {creditTiers.map((tier) => (
                  <button
                    key={tier.priceId}
                    disabled={checkingOut === tier.priceId}
                    onClick={async () => {
                      setCheckingOut(tier.priceId);
                      try {
                        const result = await createCheckout({ priceId: tier.priceId });
                        if (result.url) window.location.href = result.url;
                      } catch (err) {
                        console.error('Checkout failed:', err);
                      } finally {
                        setCheckingOut(null);
                      }
                    }}
                    className="flex items-center justify-between w-full px-2.5 py-1.5 text-xs text-text-muted hover:text-text hover:bg-surface-hover rounded transition-colors disabled:opacity-50"
                  >
                    <span className="font-mono">{tier.label}</span>
                    {checkingOut === tier.priceId && (
                      <span className="text-[10px] text-text-muted animate-pulse">...</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="my-1 border-t border-border/40" />

          <Link
            href="/settings"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-xs text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="13" x2="13" y2="3" /><circle cx="8" cy="8" r="2.5" />
            </svg>
            Settings
          </Link>
          <button
            onClick={() => { setMenuOpen(false); toggleConfigMode(); }}
            className="flex items-center gap-2.5 px-3 py-2 text-xs text-text-muted hover:text-text hover:bg-surface-hover transition-colors w-full text-left"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
            {isConfigMode ? 'Done configuring' : 'Configure layout'}
          </button>
          <div className="my-1 border-t border-border/40" />
          <button
            onClick={() => { setMenuOpen(false); void signOut(); }}
            className="flex items-center gap-2.5 px-3 py-2 text-xs text-text-muted hover:text-danger hover:bg-surface-hover transition-colors w-full text-left"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
