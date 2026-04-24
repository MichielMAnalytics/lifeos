'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery, useAction } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '@/lib/convex-api';
import { cn } from '@/lib/utils';
import { useDashboardConfig } from '@/lib/dashboard-config';
import { ADMIN_ONLY_PAGES } from '@/lib/presets';
import { LogoMark } from './theme-logo';
import { NAV_MARKS } from './nav-marks';
import { SearchTrigger } from './search-modal';

const allPages: Record<string, { label: string }> = {
  'life-coach': { label: 'Life Coach' },
  today: { label: 'Today' },
  tasks: { label: 'Tasks' },
  projects: { label: 'Projects' },
  goals: { label: 'Compass' },
  journal: { label: 'Journal' },
  ideas: { label: 'Ideas' },
  thoughts: { label: 'Thoughts' },
  reviews: { label: 'Reviews' },
  resources: { label: 'Resources' },
  schedules: { label: 'Schedules' },
  meetings: { label: 'Meetings' },
  marketing: { label: 'Marketing' },
  finance: { label: 'Finance' },
  health: { label: 'Health' },
};

const ADMIN_GATE = new Set<string>(ADMIN_ONLY_PAGES);

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
    setNavMode,
    setNavOrder,
    togglePageVisibility,
  } = useDashboardConfig();

  // Drag-and-drop state for reordering in config mode
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const myRole = useQuery(api.roles.getMyRole, {});
  const isAdmin = myRole?.isAdmin ?? false;

  // Admin-only pages stripped before any other filtering — non-admins
  // never see them in the header nav (config mode included).
  const allowedOrder = config.navOrder.filter((p) => isAdmin || !ADMIN_GATE.has(p));
  const visiblePages = allowedOrder.filter(p => !config.navHidden.includes(p));

  // In config mode, show ALL pages from navOrder (hidden ones are dimmed).
  // In normal mode, only show visible pages.
  const displayPages = isConfigMode ? allowedOrder : visiblePages;

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
          <LogoMark size={28} />
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
                  <span className="cursor-grab text-text-muted/80 hover:text-text-muted mr-0.5 shrink-0">
                    <GripIcon />
                  </span>
                )}

                <Link
                  href={href}
                  className={cn(
                    'px-2.5 py-1.5 text-xs transition-colors rounded whitespace-nowrap',
                    isHidden && 'opacity-40 line-through decoration-1',
                    isActive
                      ? 'text-text bg-surface'
                      : 'text-text-muted hover:text-text',
                  )}
                >
                  {(() => {
                    if (key === 'life-coach') {
                      return (
                        <span className="flex items-center gap-1.5 group/lc relative">
                          <img src="/openclaw-icon.png" alt="Life Coach" className="shrink-0 size-4 rounded-sm" />
                          {page.label}
                          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 hidden group-hover/lc:block bg-surface border border-border rounded px-2 py-1 text-[10px] text-text-muted whitespace-nowrap shadow-lg pointer-events-auto">
                            Powered by <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open('https://openclaw.ai/', '_blank'); }} className="text-accent hover:underline cursor-pointer">OpenClaw</span>
                          </span>
                        </span>
                      );
                    }
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

        {/* Right side: search + profile */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <SearchTrigger
            variant="icon"
            className="px-2 py-1.5"
          />
          <HeaderProfileMenu />
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

/* ── Header profile dropdown ──────────────────────────────── */

const PLAN_LABELS: Record<string, string> = {
  dashboard: 'Home',
  byok: 'BYOK',
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
};

function HeaderProfileMenu() {
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
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        title={`${user.name ?? user.email} — ${planLabel}`}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-hover transition-colors"
      >
        {profileImage ? (
          <img src={profileImage} alt="" className="size-7 rounded-full shrink-0 object-cover" />
        ) : (
          <span className="size-7 rounded-full shrink-0 bg-surface flex items-center justify-center text-[10px] font-bold text-text-muted">
            {initials}
          </span>
        )}
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-surface border border-border rounded-lg shadow-lg py-1 w-52 animate-scale-in">
          {/* User info */}
          <div className="px-3 py-2.5">
            <p className="text-xs font-medium text-text truncate">{user.name ?? user.email}</p>
            <p className="text-[10px] text-text-muted">{planLabel} plan</p>
          </div>
          <div className="my-1 border-t border-border/40" />

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
          {/* "Configure layout" entry removed — now lives as the Edit pill in
              the page header (Section 14C). Esc also exits config mode. */}
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
