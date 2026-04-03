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
import { LogoMark } from './theme-logo';
import { NAV_MARKS } from './nav-marks';
import { SearchTrigger } from './search-modal';


const allPages: Record<string, { label: string; abbr: string; category?: string }> = {
  'life-coach': { label: 'Life Coach', abbr: 'Lc' },
  today: { label: 'Today', abbr: 'To', category: 'Daily' },
  tasks: { label: 'Tasks', abbr: 'Ta', category: 'Daily' },
  journal: { label: 'Journal', abbr: 'Jo', category: 'Daily' },
  projects: { label: 'Projects', abbr: 'Pr', category: 'Work' },
  goals: { label: 'Compass', abbr: 'Co', category: 'Work' },
  ideas: { label: 'Ideas', abbr: 'Id', category: 'Capture' },
  thoughts: { label: 'Thoughts', abbr: 'Th', category: 'Capture' },
  resources: { label: 'Resources', abbr: 'Rs', category: 'Capture' },
  reviews: { label: 'Reviews', abbr: 'Re', category: 'Reflect' },
  calendar: { label: 'Schedules', abbr: 'Sc', category: 'Reflect' },
  health: { label: 'Health', abbr: 'He', category: 'Daily' },
};

const CATEGORY_ORDER = ['Daily', 'Work', 'Capture', 'Reflect'];

const STORAGE_KEY = 'lifeos-nav-expanded';

export function Nav() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { config, isConfigMode, toggleConfigMode, togglePageVisibility, setNavOrder } = useDashboardConfig();
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'false') setExpanded(false);
    setMounted(true);
  }, []);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile nav is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

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

  // Group nav links by category
  const grouped: { category: string | null; items: typeof navLinks }[] = [];
  if (!isConfigMode) {
    // Life Coach has no category — render it first standalone
    const lifeCoach = navLinks.filter(l => l.key === 'life-coach');
    const rest = navLinks.filter(l => l.key !== 'life-coach');

    if (lifeCoach.length > 0) {
      grouped.push({ category: null, items: lifeCoach });
    }

    for (const cat of CATEGORY_ORDER) {
      const items = rest.filter(l => allPages[l.key]?.category === cat);
      if (items.length > 0) {
        grouped.push({ category: cat, items });
      }
    }
    // Uncategorized remainder
    const catSet = new Set(CATEGORY_ORDER);
    const uncategorized = rest.filter(l => !allPages[l.key]?.category || !catSet.has(allPages[l.key]!.category!));
    if (uncategorized.length > 0) {
      grouped.push({ category: null, items: uncategorized });
    }
  }

  const showExpanded = expanded || hovered;

  // Shared nav content renderer (used for both desktop and mobile)
  const renderNavContent = (forMobile: boolean) => {
    const navExpanded = forMobile ? true : showExpanded;
    return (
      <>
        {/* Logo + toggle */}
        <div
          className={cn(
            'flex h-14 shrink-0 items-center',
            navExpanded ? 'justify-between px-4' : 'justify-center',
          )}
        >
          {navExpanded ? (
            <>
              <div className="flex items-center gap-2.5">
                <LogoMark size={24} className="opacity-80" />
                <span className="text-sm font-semibold text-text tracking-tight">LifeOS</span>
              </div>
              {forMobile ? (
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
                  title="Close menu"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={toggle}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
                  title={expanded ? 'Collapse sidebar' : 'Pin sidebar'}
                >
                  {/* Notion-style toggle icon */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {expanded ? (
                      <>
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                        <line x1="9" y1="3" x2="9" y2="21" />
                        <polyline points="14 9 12 12 14 15" />
                      </>
                    ) : (
                      <>
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                        <line x1="9" y1="3" x2="9" y2="21" />
                        <polyline points="12 9 14 12 12 15" />
                      </>
                    )}
                  </svg>
                </button>
              )}
            </>
          ) : (
            <button
              onClick={toggle}
              className="flex shrink-0 items-center justify-center transition-colors hover:opacity-70"
              title="Expand sidebar"
            >
              <LogoMark size={24} />
            </button>
          )}
        </div>

        {/* Main links */}
        <div className="flex flex-1 flex-col overflow-y-auto px-2.5 pt-2 pb-2">
          {isConfigMode ? (
            // Config mode: flat list with drag handles (no categories)
            <div className="flex flex-col gap-0.5">
              {navLinks.map(({ key, href, label, abbr, hidden }) => {
                const isActive = pathname === href || pathname.startsWith(href + '/');
                return (
                  <NavItem
                    key={key}
                    itemKey={key}
                    href={href}
                    label={label}
                    abbr={abbr}
                    hidden={hidden}
                    isActive={isActive}
                    showExpanded={navExpanded}
                    isConfigMode={isConfigMode}
                    mounted={mounted}
                    index={0}
                    dragKey={dragKey}
                    dragOverKey={dragOverKey}
                    setDragKey={setDragKey}
                    setDragOverKey={setDragOverKey}
                    config={config}
                    setNavOrder={setNavOrder}
                    togglePageVisibility={togglePageVisibility}
                    onNavigate={forMobile ? () => setMobileOpen(false) : undefined}
                  />
                );
              })}
            </div>
          ) : (
            // Normal mode: grouped by category
            grouped.map((group, gi) => (
              <div key={group.category ?? `g-${gi}`} className="mb-1">
                {group.category && navExpanded && (
                  <div className="px-2 pt-3 pb-1.5 first:pt-0">
                    <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted/40">
                      {group.category}
                    </span>
                  </div>
                )}
                {!navExpanded && gi > 0 && group.category && (
                  <div className="mx-auto my-2 w-5 border-t border-border/40" />
                )}
                <div className="flex flex-col gap-0.5">
                  {group.items.map(({ key, href, label, abbr, hidden }, index) => {
                    const isActive = pathname === href || pathname.startsWith(href + '/');
                    return (
                      <NavItem
                        key={key}
                        itemKey={key}
                        href={href}
                        label={label}
                        abbr={abbr}
                        hidden={hidden}
                        isActive={isActive}
                        showExpanded={navExpanded}
                        isConfigMode={false}
                        mounted={mounted}
                        index={index}
                        dragKey={dragKey}
                        dragOverKey={dragOverKey}
                        setDragKey={setDragKey}
                        setDragOverKey={setDragOverKey}
                        config={config}
                        setNavOrder={setNavOrder}
                        togglePageVisibility={togglePageVisibility}
                        onNavigate={forMobile ? () => setMobileOpen(false) : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom */}
        <div className="shrink-0 border-t border-border/40 px-2.5 py-3">
          {/* Search trigger */}
          <div
            className={cn(
              'group relative flex h-9 items-center transition-all duration-150 w-full',
              navExpanded ? 'px-2.5 gap-3 rounded-lg' : 'justify-center w-10 mx-auto rounded-lg',
            )}
          >
            {navExpanded ? (
              <SearchTrigger variant="expanded" />
            ) : (
              <SearchTrigger variant="icon" />
            )}
          </div>

          {/* Trash link */}
          <Link
            href="/trash"
            className={cn(
              'group relative flex items-center transition-all duration-150 w-full text-text-muted hover:text-text',
              navExpanded ? 'h-[34px] px-2.5 gap-2.5 rounded-lg hover:bg-surface-hover' : 'h-[34px] justify-center w-10 mx-auto rounded-lg hover:bg-surface-hover',
            )}
            title={navExpanded ? undefined : 'Trash'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            {navExpanded && <span className="text-[13px] font-medium">Trash</span>}
          </Link>

          {/* Profile + menu */}
          <ProfileBadge expanded={navExpanded} toggleConfigMode={toggleConfigMode} isConfigMode={isConfigMode} />
        </div>
      </>
    );
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-text md:hidden"
        aria-label="Open menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="absolute inset-y-0 left-0 w-72 bg-bg border-r border-border/60 flex flex-col animate-slide-in">
            {renderNavContent(true)}
          </nav>
        </div>
      )}

      {/* Desktop sidebar */}
      <nav
        onMouseEnter={() => { if (!expanded) setHovered(true); }}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden md:flex flex-col border-r border-border/60 bg-bg transition-all duration-200',
          showExpanded ? 'w-60' : 'w-14',
        )}
      >
        {renderNavContent(false)}
      </nav>
    </>
  );
}

// ── Nav Item ──────────────────────────────────────────────

interface NavItemProps {
  itemKey: string;
  href: string;
  label: string;
  abbr: string;
  hidden: boolean;
  isActive: boolean;
  showExpanded: boolean;
  isConfigMode: boolean;
  mounted: boolean;
  index: number;
  dragKey: string | null;
  dragOverKey: string | null;
  setDragKey: (k: string | null) => void;
  setDragOverKey: (k: string | null) => void;
  config: { navOrder: string[] };
  setNavOrder: (order: string[]) => void;
  togglePageVisibility: (page: string, visible: boolean) => void;
  onNavigate?: () => void;
}

function NavItem({
  itemKey, href, label, abbr, hidden, isActive, showExpanded, isConfigMode,
  mounted, index, dragKey, dragOverKey, setDragKey, setDragOverKey, config,
  setNavOrder, togglePageVisibility, onNavigate,
}: NavItemProps) {
  return (
    <div
      className={cn(
        'relative flex items-center',
        isConfigMode && dragOverKey === itemKey && 'border-t-2 border-text',
      )}
      draggable={isConfigMode}
      onDragStart={(e) => {
        setDragKey(itemKey);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverKey(itemKey);
      }}
      onDragLeave={() => setDragOverKey(null)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOverKey(null);
        if (!dragKey || dragKey === itemKey) return;
        const order = [...config.navOrder];
        const fromIdx = order.indexOf(dragKey);
        const toIdx = order.indexOf(itemKey);
        if (fromIdx === -1 || toIdx === -1) return;
        order.splice(fromIdx, 1);
        order.splice(toIdx, 0, dragKey);
        setNavOrder(order);
        setDragKey(null);
      }}
      onDragEnd={() => { setDragKey(null); setDragOverKey(null); }}
    >
      {/* Drag grip in config mode */}
      {isConfigMode && showExpanded && (
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
        title={showExpanded ? undefined : label}
        className={cn(
          'group relative flex h-[34px] items-center transition-all duration-150 flex-1',
          showExpanded
            ? (isConfigMode ? 'px-1 gap-2.5 rounded-lg' : 'px-2.5 gap-2.5 rounded-lg')
            : 'justify-center w-10 mx-auto rounded-lg',
          hidden && 'opacity-40',
          isActive
            ? 'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-4 before:w-[3px] before:rounded-full before:bg-accent bg-surface-hover/50 text-text'
            : 'text-text-muted hover:bg-surface-hover hover:text-text',
          isConfigMode && dragKey === itemKey && 'opacity-30',
        )}
        onClick={isConfigMode ? (e) => e.preventDefault() : onNavigate ?? undefined}
      >
        {(() => {
          if (itemKey === 'life-coach') {
            return showExpanded ? (
              <span className="flex items-center gap-2.5 text-[13px] font-medium">
                <img src="/openclaw-icon.png" alt="Life Coach" className="shrink-0 size-4 rounded-sm" />
                {label}
              </span>
            ) : (
              <img src="/openclaw-icon.png" alt="Life Coach" className="shrink-0 size-4 rounded-sm" />
            );
          }
          const Mark = NAV_MARKS[itemKey];
          return showExpanded ? (
            <span className="flex items-center gap-2.5 text-[13px] font-medium">
              {Mark && <Mark className="shrink-0 opacity-60" />}
              {label}
            </span>
          ) : (
            Mark ? <Mark className="shrink-0" /> : <span className="font-mono text-[11px] font-medium tracking-tight">{abbr}</span>
          );
        })()}
      </Link>

      {/* Config mode: visibility toggle */}
      {isConfigMode && showExpanded && (
        <button
          onClick={() => togglePageVisibility(itemKey, hidden)}
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors mr-1',
            hidden
              ? 'text-text-muted hover:text-text'
              : 'text-text hover:text-text-muted',
          )}
          title={hidden ? `Show ${label}` : `Hide ${label}`}
        >
          {hidden ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

// ── Profile Badge ─────────────────────────────────────────

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
          expanded ? 'gap-2.5 px-2.5 py-2 rounded-lg hover:bg-surface-hover' : 'justify-center w-10 mx-auto py-2',
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
          'absolute z-50 bg-surface border border-border rounded-xl shadow-lg py-1 animate-scale-in',
          expanded ? 'bottom-full left-0 right-0 mb-1' : 'bottom-full left-0 mb-1 w-48',
        )}>
          {/* Balance display (hide for Home and BYOK plans — no credits) */}
          {balance !== undefined && subscription?.planType !== 'dashboard' && subscription?.planType !== 'byok' && (
            <>
              <div className="px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-widest text-text-muted mb-0.5">Balance</p>
                <p className="text-sm font-bold text-text tabular-nums">
                  EUR {(balance / 100).toFixed(2)}
                </p>
              </div>
              <div className="my-1 border-t border-border/40" />
            </>
          )}

          {/* Top up (hide for Home and BYOK plans) */}
          {subscription?.planType !== 'dashboard' && subscription?.planType !== 'byok' && <div className="relative">
            <button
              onClick={() => setTopUpOpen(!topUpOpen)}
              className="flex items-center justify-between gap-2.5 px-3 py-2 text-xs text-text-muted hover:text-text hover:bg-surface-hover transition-colors w-full text-left rounded-lg mx-0"
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
                    className="flex items-center justify-between w-full px-2.5 py-1.5 text-xs text-text-muted hover:text-text hover:bg-surface-hover rounded-lg transition-colors disabled:opacity-50"
                  >
                    <span className="tabular-nums">{tier.label}</span>
                    {checkingOut === tier.priceId && (
                      <span className="text-[10px] text-text-muted animate-pulse">...</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>}

          <div className="my-1 border-t border-border/40" />

          <Link
            href="/settings"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-xs text-text-muted hover:text-text hover:bg-surface-hover transition-colors rounded-lg mx-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Settings
          </Link>
          <button
            onClick={() => { setMenuOpen(false); toggleConfigMode(); }}
            className="flex items-center gap-2.5 px-3 py-2 text-xs text-text-muted hover:text-text hover:bg-surface-hover transition-colors w-full text-left rounded-lg mx-1"
            style={{ width: 'calc(100% - 0.5rem)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" />
              <rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" />
            </svg>
            {isConfigMode ? 'Done configuring' : 'Configure layout'}
          </button>
          <div className="my-1 border-t border-border/40" />
          <button
            onClick={() => { setMenuOpen(false); void signOut(); }}
            className="flex items-center gap-2.5 px-3 py-2 text-xs text-text-muted hover:text-danger hover:bg-surface-hover transition-colors w-full text-left rounded-lg mx-1"
            style={{ width: 'calc(100% - 0.5rem)' }}
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
