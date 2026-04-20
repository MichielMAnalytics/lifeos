'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useMutation, useQuery, useAction } from 'convex/react';
import { api } from '@/lib/convex-api';
import type { Id } from '@/lib/convex-api';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DeploymentDashboard } from '@/components/ai-agent/deployment-dashboard';
import { ModelSwitcher } from '@/components/ai-agent/model-switcher';
import { ChannelConfig } from '@/components/ai-agent/channel-config';
import { ApiKeys as ByokApiKeys } from '@/components/ai-agent/api-keys-byok';
import { InstanceTools } from '@/components/ai-agent/instance-tools';
import { ConfigCard } from '@/components/ai-agent/config-card';
import { PaymentStatus } from '@/components/ai-agent/payment-status';
import { useTheme } from '@/components/theme-provider';
import { useTimeFormat, type TimeFormat } from '@/components/time-format-provider';
import { themes, themeKeys, systemThemeEntry } from '@/lib/themes';
import { useDashboardConfig } from '@/lib/dashboard-config';
import { capture, EVENTS } from '@/lib/analytics';
import { TelegramSetup } from '@/components/sections/telegram-setup';

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

interface User {
  _id: Id<"users">;
  _creationTime: number;
  email?: string;
  name?: string;
  timezone?: string;
}

interface ApiKeyEntry {
  _id: Id<"apiKeys">;
  _creationTime: number;
  name?: string;
  keyPrefix: string;
  lastUsedAt?: number;
}

type SettingsTab = 'account' | 'billing' | 'life-coach' | 'integrations' | 'api-keys' | 'appearance';

/* ================================================================== */
/*  Fonts                                                              */
/* ================================================================== */

const FONT_OPTIONS = [
  { key: 'geist', name: 'Geist', family: '"Geist", ui-sans-serif, system-ui, sans-serif', href: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap' },
  { key: 'kefa', name: 'Kefa', family: '"Kefa", ui-sans-serif, system-ui, sans-serif', href: '' },
  { key: 'satoshi', name: 'Satoshi', family: '"Satoshi", ui-sans-serif, system-ui, sans-serif', href: 'https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap' },
  { key: 'inter', name: 'Inter', family: '"Inter", ui-sans-serif, system-ui, sans-serif', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
  { key: 'jetbrains', name: 'JetBrains Mono', family: '"JetBrains Mono", ui-monospace, monospace', href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap' },
  { key: 'space-grotesk', name: 'Space Grotesk', family: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif', href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap' },
  { key: 'dm-sans', name: 'DM Sans', family: '"DM Sans", ui-sans-serif, system-ui, sans-serif', href: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap' },
  { key: 'outfit', name: 'Outfit', family: '"Outfit", ui-sans-serif, system-ui, sans-serif', href: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap' },
  { key: 'ibm-plex', name: 'IBM Plex Sans', family: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif', href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap' },
  { key: 'source-serif', name: 'Source Serif', family: '"Source Serif 4", Georgia, serif', href: 'https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;500;600;700&display=swap' },
  { key: 'system', name: 'System', family: 'ui-sans-serif, system-ui, -apple-system, sans-serif', href: '' },
] as const;

const FONT_STORAGE_KEY = 'lifeos-font';

function loadFont(href: string) {
  if (!href) return;
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function applyFont(family: string) {
  document.documentElement.style.setProperty('--font-sans', family);
}

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function daysSince(creationTime: number): number {
  try {
    return Math.max(1, Math.floor((Date.now() - creationTime) / 86400000) + 1);
  } catch {
    return 1;
  }
}

function formatJoinDate(creationTime: number): string {
  const d = new Date(creationTime);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDetectedTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/* ================================================================== */
/*  Timezone picker                                                    */
/* ================================================================== */

const COMMON_TIMEZONES = [
  'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi',
  'America/Anchorage', 'America/Argentina/Buenos_Aires', 'America/Bogota',
  'America/Chicago', 'America/Denver', 'America/Halifax', 'America/Lima',
  'America/Los_Angeles', 'America/Mexico_City', 'America/New_York',
  'America/Phoenix', 'America/Santiago', 'America/Sao_Paulo', 'America/Toronto',
  'America/Vancouver',
  'Asia/Bangkok', 'Asia/Colombo', 'Asia/Dubai', 'Asia/Hong_Kong',
  'Asia/Jakarta', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Kuala_Lumpur',
  'Asia/Manila', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Singapore',
  'Asia/Taipei', 'Asia/Tehran', 'Asia/Tokyo',
  'Atlantic/Reykjavik',
  'Australia/Melbourne', 'Australia/Perth', 'Australia/Sydney',
  'Europe/Amsterdam', 'Europe/Athens', 'Europe/Berlin', 'Europe/Brussels',
  'Europe/Dublin', 'Europe/Helsinki', 'Europe/Istanbul', 'Europe/Lisbon',
  'Europe/London', 'Europe/Madrid', 'Europe/Moscow', 'Europe/Oslo',
  'Europe/Paris', 'Europe/Prague', 'Europe/Rome', 'Europe/Stockholm',
  'Europe/Vienna', 'Europe/Warsaw', 'Europe/Zurich',
  'Pacific/Auckland', 'Pacific/Fiji', 'Pacific/Honolulu',
  'UTC',
];

function getTimezoneInfo(tz: string): { offset: string; currentTime: string; offsetMinutes: number } {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const currentTime = formatter.format(now);

    // Calculate GMT offset
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    const diffMs = tzDate.getTime() - utcDate.getTime();
    const diffMinutes = Math.round(diffMs / 60000);
    const sign = diffMinutes >= 0 ? '+' : '-';
    const absMinutes = Math.abs(diffMinutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    const offset = mins === 0 ? `GMT${sign}${hours}` : `GMT${sign}${hours}:${mins.toString().padStart(2, '0')}`;

    return { offset, currentTime, offsetMinutes: diffMinutes };
  } catch {
    return { offset: 'GMT+0', currentTime: '--:--', offsetMinutes: 0 };
  }
}

function TimezoneSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (tz: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => inputRef.current?.focus());
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setSearch(''); }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const options = useMemo(() => {
    const q = search.toLowerCase();
    const tzList = COMMON_TIMEZONES.filter((tz) =>
      tz.toLowerCase().includes(q) || tz.replace(/_/g, ' ').toLowerCase().includes(q)
    );
    return tzList.map((tz) => ({ tz, ...getTimezoneInfo(tz) }))
      .sort((a, b) => a.offsetMinutes - b.offsetMinutes);
  }, [search]);

  const currentInfo = getTimezoneInfo(value);
  const displayLabel = value ? `${value.replace(/_/g, ' ')} (${currentInfo.offset})` : 'Select timezone...';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm bg-transparent border border-border text-text hover:border-text/30 transition-colors text-left"
      >
        <span className="truncate">{displayLabel}</span>
        <span className="text-text-muted text-xs shrink-0 ml-2">{currentInfo.currentTime}</span>
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 border border-border bg-surface rounded-lg shadow-2xl max-h-[320px] flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-border-subtle shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search timezones..."
              className="w-full bg-transparent text-sm text-text placeholder:text-text-muted focus:outline-none"
            />
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {options.length === 0 ? (
              <p className="px-3 py-3 text-xs text-text-muted text-center">No timezones match</p>
            ) : (
              options.map(({ tz, offset, currentTime }) => (
                <button
                  key={tz}
                  type="button"
                  onClick={() => {
                    onChange(tz);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-surface-hover transition-colors text-left',
                    tz === value && 'bg-surface-hover text-accent',
                  )}
                >
                  <span className="truncate">{tz.replace(/_/g, ' ')}</span>
                  <span className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px] text-text-muted font-mono">{offset}</span>
                    <span className="text-[10px] text-text-muted/70 tabular-nums w-[60px] text-right">{currentTime}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Main Component                                                     */
/* ================================================================== */

export function SettingsClient({
  user,
  initialApiKeys,
}: {
  user: User | null;
  initialApiKeys: ApiKeyEntry[];
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const subscription = useQuery(api.stripe.getMySubscription);

  const showLifeCoach = subscription !== undefined && subscription !== null && subscription.planType !== 'dashboard';

  const tabs: { id: SettingsTab; label: string; icon: React.FC<{ active: boolean }> }[] = [
    { id: 'account', label: 'Account', icon: UserIcon },
    { id: 'billing', label: 'Billing', icon: CreditCardIcon },
    ...(showLifeCoach ? [{ id: 'life-coach' as SettingsTab, label: 'Life Coach', icon: BotIcon }] : []),
    { id: 'integrations', label: 'Integrations', icon: LinkIcon },
    { id: 'api-keys', label: 'API Keys', icon: KeyIcon },
    { id: 'appearance', label: 'Appearance', icon: PaletteIcon },
  ];

  const tabIds = tabs.map(t => t.id);
  useEffect(() => {
    if (!tabIds.includes(activeTab)) {
      setActiveTab('account');
    }
  }, [tabIds.join(','), activeTab]);

  return (
    <div className="max-w-none animate-fade-in">
      <div className="flex min-h-[calc(100vh-120px)]">
        {/* Sidebar */}
        <div className="hidden md:block w-48 flex-shrink-0 border-r border-border py-6 pr-2 space-y-0.5">
          <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted px-3 py-2 font-medium">
            Settings
          </p>
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors cursor-pointer',
                  activeTab === t.id
                    ? 'text-text bg-surface-hover font-medium'
                    : 'text-text-muted hover:text-text hover:bg-surface-hover/50',
                )}
              >
                <Icon active={activeTab === t.id} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Mobile tab bar */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-bg border-b border-border flex overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'px-4 py-3 text-xs whitespace-nowrap transition-colors cursor-pointer relative flex-shrink-0',
                activeTab === t.id
                  ? 'text-text font-medium'
                  : 'text-text-muted',
              )}
            >
              {t.label}
              {activeTab === t.id && (
                <div className="absolute bottom-0 left-4 right-4 h-px bg-text" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 py-6 pl-4 md:pl-8 pr-2 overflow-y-auto mt-10 md:mt-0">
          <div className="max-w-2xl">
            {activeTab === 'account' && <AccountTab user={user} />}
            {activeTab === 'billing' && <BillingTab />}
            {activeTab === 'life-coach' && <LifeCoachTab />}
            {activeTab === 'integrations' && <IntegrationsTab />}
            {activeTab === 'api-keys' && <ApiKeysTab apiKeys={initialApiKeys} />}
            {activeTab === 'appearance' && <AppearanceTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Tab: Account                                                       */
/* ================================================================== */

function AccountTab({ user }: { user: User | null }) {
  const deployment = useQuery(api.deploymentQueries.getMyDeployment);
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [editName, setEditName] = useState('');
  const [editTimezone, setEditTimezone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const updateMeMutation = useMutation(api.authHelpers.updateMe);

  useEffect(() => {
    const stored = localStorage.getItem('lifeos-avatar');
    if (stored) setAvatar(stored);
  }, []);

  useEffect(() => {
    if (user) {
      setEditName(user.name ?? '');
      setEditTimezone(user.timezone ?? getDetectedTimezone());
    }
  }, [user?.name, user?.timezone]);

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be under 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatar(result);
      localStorage.setItem('lifeos-avatar', result);
    };
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    setAvatar(null);
    localStorage.removeItem('lifeos-avatar');
  }

  const hasChanges = user ? (
    editName !== (user.name ?? '') ||
    editTimezone !== (user.timezone ?? '')
  ) : false;

  async function handleSave() {
    if (!hasChanges) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateMeMutation({
        name: editName || undefined,
        timezone: editTimezone || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  function handleDetectTimezone() {
    setEditTimezone(getDetectedTimezone());
  }

  if (!user) {
    return (
      <div>
        <TabHeader title="Account" subtitle="Manage your profile and preferences" />
        <div className="border border-border p-12 text-center">
          <p className="text-text-muted animate-pulse">Loading profile...</p>
        </div>
      </div>
    );
  }

  const days = daysSince(user._creationTime);

  return (
    <div className="space-y-6">
      <TabHeader title="Account" subtitle="Manage your profile and preferences" />

      {/* Profile header */}
      <div className="border border-border">
        <div className="p-6 flex items-start justify-between">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative group">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              {avatar ? (
                <img src={avatar} alt="Profile" className="h-16 w-16 rounded-full object-cover border-2 border-border" />
              ) : (
                <div className="h-16 w-16 flex items-center justify-center rounded-full border-2 border-border bg-surface text-xl font-bold text-text">
                  {(user.name || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </button>
              {avatar && (
                <button
                  onClick={removeAvatar}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-danger text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Remove photo"
                >
                  x
                </button>
              )}
            </div>
            <div>
              <p className="text-lg font-bold text-text">{user.name || user.email || 'User'}</p>
              <p className="text-sm text-text-muted mt-0.5">{user.email ?? ''}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-text-muted">Day</p>
            <p className="text-3xl font-bold text-text tabular-nums leading-tight">{days}</p>
          </div>
        </div>
      </div>

      {/* Editable fields */}
      <div className="border border-border divide-y divide-border">
        {/* Name */}
        <div className="p-5 space-y-2">
          <label className="text-xs font-medium text-text">Display name</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Your name"
            className="w-full px-3 py-2 text-sm bg-transparent border border-border text-text placeholder:text-text-muted/70 focus:border-text/30 focus:outline-none"
          />
        </div>

        {/* Email (read-only) */}
        <div className="p-5 space-y-2">
          <label className="text-xs font-medium text-text">Email</label>
          <p className="text-sm text-text-muted">{user.email ?? 'Not set'}</p>
          <p className="text-[10px] text-text-muted">Managed via your Google account</p>
        </div>

        {/* Timezone */}
        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text">Timezone</label>
            <button
              onClick={handleDetectTimezone}
              className="text-[10px] text-text-muted hover:text-text transition-colors cursor-pointer underline underline-offset-2"
            >
              Detect from browser
            </button>
          </div>
          <TimezoneSelect
            value={editTimezone}
            onChange={(tz) => setEditTimezone(tz)}
          />
        </div>

        {/* Joined */}
        <div className="p-5 space-y-2">
          <label className="text-xs font-medium text-text">Joined</label>
          <p className="text-sm text-text-muted">{formatJoinDate(user._creationTime)}</p>
        </div>

        {/* Pod ID (debug) */}
        {deployment && (
          <div className="p-5 space-y-2">
            <label className="text-xs font-medium text-text">Pod ID</label>
            <p className="text-sm text-text-muted font-mono">{deployment.subdomain}</p>
          </div>
        )}
      </div>

      {/* Save */}
      {hasChanges && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="px-4 py-2 text-xs font-medium bg-text text-bg hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          <button
            onClick={() => {
              setEditName(user.name ?? '');
              setEditTimezone(user.timezone ?? getDetectedTimezone());
            }}
            className="px-4 py-2 text-xs text-text-muted hover:text-text transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
      {saved && <p className="text-xs text-success">Profile updated</p>}
    </div>
  );
}

/* ================================================================== */
/*  Tab: Billing                                                       */
/* ================================================================== */

function BillingTab() {
  const subscription = useQuery(api.stripe.getMySubscription);
  const balance = useQuery(api.stripe.getBalance);
  const tiers = useQuery(api.stripe.getCreditTiersList);
  const payments = useQuery(api.stripe.getPaymentHistory);
  const billingPortal = useAction(api.stripe.createBillingPortalSession);
  const checkout = useAction(api.stripe.createCreditCheckout);
  const redeemCoupon = useMutation(api.coupons.redeemCoupon);

  const [creditLoading, setCreditLoading] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponResult, setCouponResult] = useState<{ success: boolean; message: string } | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const planLabels: Record<string, string> = {
    dashboard: 'Home',
    byok: 'BYOK',
    basic: 'Basic',
    standard: 'Standard',
    premium: 'Premium',
  };

  async function handleManageBilling() {
    setPortalLoading(true);
    capture(EVENTS.BILLING_PORTAL_OPENED);
    try {
      const { url } = await billingPortal({});
      window.location.href = url;
    } catch (e) {
      console.error(e);
    } finally {
      setPortalLoading(false);
    }
  }

  async function handlePurchase(priceId: string) {
    setCreditLoading(priceId);
    const tier = tiers?.find((t) => t.priceId === priceId);
    capture(EVENTS.CREDIT_PURCHASED, { tier: tier?.label ?? priceId });
    try {
      const result = await checkout({ priceId });
      if (result.url) window.location.href = result.url;
    } catch (e) {
      console.error(e);
    } finally {
      setCreditLoading(null);
    }
  }

  async function handleRedeemCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponResult(null);
    try {
      const result = await redeemCoupon({ code: couponCode });
      if (result.success) {
        setCouponCode('');
        setCouponResult({
          success: true,
          message: `+EUR ${((result.creditedCents ?? 0) / 100).toFixed(2)} credited!`,
        });
        capture(EVENTS.COUPON_REDEEMED, { creditedCents: result.creditedCents });
      } else {
        setCouponResult({ success: false, message: result.error ?? 'Redemption failed' });
      }
    } catch {
      setCouponResult({ success: false, message: 'Something went wrong' });
    } finally {
      setCouponLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <TabHeader title="Billing" subtitle="Manage your subscription, payment method, and credits" />

      {/* Current plan */}
      <div className="border border-border p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-text mb-1">Current plan</p>
            {subscription ? (
              <p className="text-lg font-bold text-text">{planLabels[subscription.planType] ?? subscription.planType}</p>
            ) : (
              <p className="text-sm text-text-muted">No active subscription</p>
            )}
          </div>
          {subscription && (
            <div className="text-right">
              <p className="text-lg font-bold text-text tabular-nums">
                EUR {(subscription.priceEuroCents / 100).toFixed(0)}
                <span className="text-xs font-normal text-text-muted">/mo</span>
              </p>
              <p className="text-[10px] text-text-muted">
                {subscription.cancelAtPeriodEnd ? 'Cancels' : 'Renews'}{' '}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {subscription ? (
            <button
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="px-3 py-1.5 text-xs border border-border text-text hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-50"
            >
              {portalLoading ? 'Loading...' : 'Manage billing'}
            </button>
          ) : (
            <Link href="/life-coach" className="px-3 py-1.5 text-xs bg-text text-bg hover:opacity-90 transition-opacity">
              Choose a plan
            </Link>
          )}
        </div>
      </div>

      {/* Payment method */}
      {subscription && (
        <div className="border border-border p-5 space-y-3">
          <p className="text-xs font-medium text-text">Payment method</p>
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">Managed via Stripe billing portal</p>
            <button
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="text-xs text-text-muted hover:text-text transition-colors cursor-pointer underline underline-offset-2 disabled:opacity-50"
            >
              Update
            </button>
          </div>
        </div>
      )}

      {/* Credits */}
      {subscription && subscription.planType !== 'byok' && (
        <div className="border border-border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-text">Credits balance</p>
            <p className="text-sm font-bold text-text tabular-nums">EUR {((balance ?? 0) / 100).toFixed(2)}</p>
          </div>

          {tiers && tiers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tiers.map((tier) => (
                <button
                  key={tier.priceId}
                  onClick={() => handlePurchase(tier.priceId)}
                  disabled={creditLoading !== null}
                  className="text-xs px-3 py-1 border border-border text-text-muted hover:text-text hover:border-text/30 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {creditLoading === tier.priceId ? '...' : `+${tier.label}`}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Coupon code"
              value={couponCode}
              onChange={(e) => { setCouponCode(e.target.value); setCouponResult(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleRedeemCoupon(); }}
              className="flex-1 text-xs px-3 py-1.5 bg-transparent border border-border text-text placeholder:text-text-muted/70 focus:border-text/30 focus:outline-none"
            />
            <button
              onClick={() => void handleRedeemCoupon()}
              disabled={couponLoading || !couponCode.trim()}
              className="text-xs px-3 py-1.5 border border-border text-text-muted hover:text-text hover:border-text/30 transition-colors cursor-pointer disabled:opacity-50"
            >
              {couponLoading ? '...' : 'Redeem'}
            </button>
          </div>
          {couponResult && (
            <p className={cn('text-xs', couponResult.success ? 'text-success' : 'text-danger')}>
              {couponResult.message}
            </p>
          )}
        </div>
      )}

      {/* Payment history */}
      {payments && payments.length > 0 && (
        <div className="border border-border">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs font-medium text-text">Payment history</p>
          </div>
          {payments.slice(0, 10).map((payment) => (
            <div
              key={payment.stripePaymentIntentId}
              className="flex items-center justify-between px-5 py-2.5 border-b border-border last:border-b-0 hover:bg-surface-hover/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <p className="text-xs text-text-muted font-mono w-28">
                  {new Date(payment.created * 1000).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </p>
                <p className="text-xs text-text tabular-nums">EUR {(payment.amount / 100).toFixed(2)}</p>
              </div>
              <span className={cn('text-xs', payment.status === 'succeeded' ? 'text-success' : 'text-text-muted')}>
                {payment.status === 'succeeded' ? 'Paid' : payment.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {subscription && (
        <p className="text-xs text-text-muted">
          Payment processing by Stripe.{' '}
          <button onClick={handleManageBilling} className="underline underline-offset-2 hover:text-text transition-colors cursor-pointer">
            Open billing portal
          </button>
        </p>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Tab: Life Coach                                                    */
/* ================================================================== */

function LifeCoachTab() {
  const deployment = useQuery(api.deploymentQueries.getMyDeployment);
  const settings = useQuery(api.deploymentSettings.getMySettings);
  const deploy = useAction(api.deploymentActions.deploy);
  const clearPendingDeploy = useMutation(api.deploymentSettings.setPendingDeploy);
  const subscription = useQuery(api.stripe.getMySubscription);
  const autodeployingRef = useRef(false);

  const [reconfiguring, setReconfiguring] = useState<'byok' | 'ours' | null>(null);

  useEffect(() => {
    const hasActiveSubscription = subscription && subscription.status === 'active';
    const isDashboardOnly = subscription?.planType === 'dashboard';
    const hasActiveDeployment = deployment && deployment.status !== 'deactivated';
    if (
      hasActiveSubscription &&
      !isDashboardOnly &&
      settings?.pendingDeploy &&
      !hasActiveDeployment &&
      !autodeployingRef.current
    ) {
      autodeployingRef.current = true;
      deploy({})
        .then(() => clearPendingDeploy({ pending: false }))
        .catch(console.error)
        .finally(() => { autodeployingRef.current = false; });
    }
  }, [subscription, settings?.pendingDeploy, deployment, deploy, clearPendingDeploy]);

  const hasActiveDeployment = deployment && deployment.status !== 'deactivated';

  if (deployment === undefined || settings === undefined) {
    return (
      <div>
        <TabHeader title="Life Coach" subtitle="Your AI agent deployment and configuration" />
        <div className="border border-border px-6 py-8 text-center">
          <p className="text-sm text-text-muted animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TabHeader title="Life Coach" subtitle="Your AI agent deployment and configuration" />

      <PaymentStatus />

      {hasActiveDeployment ? (
        <>
          {/* Deployment status */}
          <div className="border border-border">
            <div className="px-5 py-3 border-b border-border">
              <p className="text-xs font-medium text-text">Deployment</p>
            </div>
            <div className="p-0">
              <DeploymentDashboard deployment={deployment} />
            </div>
          </div>

          {/* Model switcher */}
          <ModelSwitcher deploymentStatus={deployment.status} />

          {/* Channels */}
          <div className="border border-border">
            <div className="px-5 py-3 border-b border-border">
              <p className="text-xs font-medium text-text">Channels</p>
            </div>
            <div className="p-4">
              <ChannelConfig />
            </div>
          </div>

          {/* Model credentials */}
          <div className="border border-border">
            <div className="px-5 py-3 border-b border-border">
              <p className="text-xs font-medium text-text">Model credentials</p>
            </div>
            <div className="p-4">
              <ByokApiKeys deploymentStatus={deployment.status} />
            </div>
          </div>

          {/* Instance tools */}
          {deployment.status === 'running' && (
            <div className="border border-border">
              <div className="px-5 py-3 border-b border-border">
                <p className="text-xs font-medium text-text">Instance tools</p>
              </div>
              <div className="p-4">
                <InstanceTools subdomain={deployment.subdomain} gatewayToken={deployment.gatewayToken} />
              </div>
            </div>
          )}
        </>
      ) : (
        <ConfigCard onRequestReconfigure={setReconfiguring} />
      )}
    </div>
  );
}

/* ================================================================== */
/*  Tab: API Keys                                                      */
/* ================================================================== */

function ApiKeysTab({ apiKeys }: { apiKeys: ApiKeyEntry[] }) {
  const [deletingKeyId, setDeletingKeyId] = useState<Id<"apiKeys"> | null>(null);
  const deleteApiKeyMutation = useMutation(api.authHelpers.deleteApiKey);
  const subscription = useQuery(api.stripe.getMySubscription);

  const createApiKey = useAction(api.apiKeyAuth.createMyApiKey);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<{ key: string; name?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    const trimmed = newKeyName.trim();
    setCreating(true);
    setCreateError(null);
    try {
      const result = await createApiKey({ name: trimmed || undefined });
      setRevealedKey({ key: result.key, name: result.name });
      setNewKeyName('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create key';
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy() {
    if (!revealedKey) return;
    try {
      await navigator.clipboard.writeText(revealedKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent
    }
  }

  return (
    <div className="space-y-6">
      <TabHeader title="API Keys" subtitle="Manage keys for the CLI and external integrations" />

      {/* Revealed key (shown once after creation) */}
      {revealedKey && (
        <div className="border border-accent/40 bg-accent/5 p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-text">
                Your new API key{revealedKey.name ? ` — ${revealedKey.name}` : ''}
              </p>
              <p className="text-[11px] text-text-muted mt-1">
                Copy it now — for security, you won&apos;t be able to see it again.
              </p>
            </div>
            <button
              onClick={() => setRevealedKey(null)}
              className="text-text-muted hover:text-text transition-colors cursor-pointer text-xs"
              title="Dismiss"
            >
              Done
            </button>
          </div>
          <div className="flex items-center gap-2">
            <pre className="flex-1 border border-border/40 bg-surface/40 px-3 py-2 text-xs font-mono text-text/80 overflow-x-auto">
              {revealedKey.key}
            </pre>
            <button
              onClick={() => void handleCopy()}
              className="px-3 py-2 text-xs border border-border text-text-muted hover:text-text hover:border-text/30 transition-colors cursor-pointer whitespace-nowrap"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Create new key */}
      <div className="border border-border p-5 space-y-3">
        <p className="text-xs font-medium text-text">Create a new API key</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => { setNewKeyName(e.target.value); setCreateError(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
            placeholder="Key name (e.g. CLI, Laptop)"
            disabled={creating}
            className="flex-1 px-3 py-2 text-xs bg-transparent border border-border text-text placeholder:text-text-muted/70 focus:border-text/30 focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={() => void handleCreate()}
            disabled={creating}
            className="px-4 py-2 text-xs font-medium bg-text text-bg hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            {creating ? 'Creating...' : '+ Create key'}
          </button>
        </div>
        {createError && <p className="text-xs text-danger">{createError}</p>}
      </div>

      <div className="border border-border">
        {apiKeys.length > 0 ? (
          <div className="divide-y divide-border">
            {apiKeys.map((key, idx) => (
              <div
                key={key._id}
                className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-surface-hover/50"
              >
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono text-text-muted w-8">
                    [{String(idx + 1).padStart(2, '0')}]
                  </span>
                  <div>
                    <p className="text-sm font-medium text-text">{key.name ?? 'Unnamed key'}</p>
                    <p className="font-mono text-xs text-text-muted mt-0.5">{key.keyPrefix}{'--------'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {key.lastUsedAt ? (
                    <p className="text-xs text-text-muted font-mono">
                      {new Date(key.lastUsedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  ) : (
                    <span className="text-xs text-text-muted/80">never used</span>
                  )}
                  <div className={`h-2 w-2 rounded-full ${key.lastUsedAt ? 'bg-success' : 'bg-border'}`} />
                  <button
                    onClick={async () => {
                      setDeletingKeyId(key._id);
                      try { await deleteApiKeyMutation({ keyId: key._id }); } catch { /* silent */ } finally { setDeletingKeyId(null); }
                    }}
                    disabled={deletingKeyId === key._id}
                    className="text-text-muted/70 hover:text-danger transition-colors disabled:opacity-30 cursor-pointer"
                    title="Delete key"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-text-muted">No API keys yet.</p>
          </div>
        )}
      </div>

      {/* CLI Setup for Home plan */}
      {subscription?.planType === 'dashboard' && (
        <div className="border border-border divide-y divide-border">
          <div className="px-5 py-3">
            <p className="text-xs font-medium text-text">CLI Setup</p>
            <p className="text-xs text-text-muted mt-1">Connect the LifeOS CLI to your terminal.</p>
          </div>
          <div className="p-5 space-y-3">
            <CliStep step={1} title="Install globally">
              <pre className="border border-border/40 bg-surface/40 px-3 py-2 text-xs font-mono text-text/80 overflow-x-auto">npm install -g lifeos-cli</pre>
            </CliStep>
            <CliStep step={2} title="Set your API URL">
              <pre className="border border-border/40 bg-surface/40 px-3 py-2 text-xs font-mono text-text/80 overflow-x-auto">
                {`lifeos config set-url ${process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? 'https://charming-squid-23.eu-west-1.convex.site'}`}
              </pre>
            </CliStep>
            <CliStep step={3} title="Authenticate">
              <pre className="border border-border/40 bg-surface/40 px-3 py-2 text-xs font-mono text-text/80 overflow-x-auto">lifeos config set-key YOUR_API_KEY</pre>
            </CliStep>
            <CliStep step={4} title="Verify">
              <pre className="border border-border/40 bg-surface/40 px-3 py-2 text-xs font-mono text-text/80 overflow-x-auto">lifeos whoami</pre>
            </CliStep>
          </div>
        </div>
      )}
    </div>
  );
}

function CliStep({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-text mb-1.5">{step}. {title}</p>
      {children}
    </div>
  );
}

/* ================================================================== */
/*  Tab: Appearance                                                    */
/* ================================================================== */

function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  const { config, setNavMode } = useDashboardConfig();
  const { timeFormat, setTimeFormat } = useTimeFormat();
  const [activeFont, setActiveFont] = useState('geist');

  useEffect(() => {
    const stored = localStorage.getItem(FONT_STORAGE_KEY);
    if (stored) {
      setActiveFont(stored);
      const font = FONT_OPTIONS.find(f => f.key === stored);
      if (font) {
        loadFont(font.href);
        applyFont(font.family);
      }
    }
  }, []);

  const selectFont = useCallback((key: string) => {
    const font = FONT_OPTIONS.find(f => f.key === key);
    if (!font) return;
    setActiveFont(key);
    localStorage.setItem(FONT_STORAGE_KEY, key);
    loadFont(font.href);
    applyFont(font.family);
  }, []);

  return (
    <div className="space-y-6">
      <TabHeader title="Appearance" subtitle="Customize the look and feel of your LifeOS home" />

      {/* Theme */}
      <div className="border border-border p-5 space-y-4">
        <p className="text-xs font-medium text-text">Theme</p>
        <div className="grid grid-cols-4 gap-2">
          {themeKeys.map((key) => {
            const isSystem = key === 'system';
            const t = isSystem ? systemThemeEntry : themes[key as keyof typeof themes];
            const isActive = theme === key;
            return (
              <button
                key={key}
                onClick={() => setTheme(key)}
                className={cn(
                  'p-3 border transition-all cursor-pointer text-left',
                  isActive ? 'border-text' : 'border-border hover:border-text/30',
                )}
              >
                <div
                  className="h-8 w-full rounded-sm mb-2 border border-black/10 flex items-end p-1"
                  style={isSystem
                    ? { background: 'linear-gradient(135deg, #fff 50%, #191919 50%)' }
                    : { backgroundColor: t.colors.bg }
                  }
                >
                  <div className="h-2 w-4 rounded-sm" style={{ backgroundColor: t.colors.accent }} />
                </div>
                <p className={cn('text-[10px] font-medium', isActive ? 'text-text' : 'text-text-muted')}>{t.name}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Font */}
      <div className="border border-border p-5 space-y-4">
        <p className="text-xs font-medium text-text">Font</p>
        <div className="grid grid-cols-3 gap-2">
          {FONT_OPTIONS.map((font) => {
            const isActive = activeFont === font.key;
            return (
              <button
                key={font.key}
                onClick={() => selectFont(font.key)}
                className={cn(
                  'px-3 py-2.5 border transition-all cursor-pointer text-left',
                  isActive ? 'border-text text-text' : 'border-border text-text-muted hover:border-text/30 hover:text-text',
                )}
                style={{ fontFamily: font.family }}
              >
                <span className="text-xs font-medium">{font.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time format */}
      <div className="border border-border p-5 space-y-4">
        <p className="text-xs font-medium text-text">Time format</p>
        <div className="grid grid-cols-2 gap-2">
          {([
            { key: '12h' as TimeFormat, label: '12-hour', example: '2:30 PM' },
            { key: '24h' as TimeFormat, label: '24-hour', example: '14:30' },
          ]).map(({ key, label, example }) => {
            const isActive = timeFormat === key;
            return (
              <button
                key={key}
                onClick={() => setTimeFormat(key)}
                className={cn(
                  'py-3 border transition-all cursor-pointer text-center',
                  isActive ? 'border-text text-text font-medium' : 'border-border text-text-muted hover:border-text/30 hover:text-text',
                )}
              >
                <p className="text-xs">{label}</p>
                <p className="text-[9px] text-text-muted mt-0.5 tabular-nums">{example}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation mode */}
      <div className="border border-border p-5 space-y-4">
        <p className="text-xs font-medium text-text">Navigation mode</p>
        <div className="grid grid-cols-2 gap-2">
          {(['sidebar', 'header'] as const).map((mode) => {
            const isActive = config.navMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setNavMode(mode)}
                className={cn(
                  'py-3 border transition-all cursor-pointer text-center',
                  isActive ? 'border-text text-text font-medium' : 'border-border text-text-muted hover:border-text/30 hover:text-text',
                )}
              >
                <p className="text-xs capitalize">{mode}</p>
                <p className="text-[9px] text-text-muted mt-0.5">
                  {mode === 'sidebar' ? 'Vertical navigation on the left' : 'Horizontal bar at the top'}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Tab: Integrations                                                  */
/* ================================================================== */

type IntegrationStatus = 'wireable' | 'needs-michiel' | 'coming-soon';

interface IntegrationDef {
  name: string;
  status: IntegrationStatus;
  description: string;
  blocker?: string;
}

const INTEGRATION_GROUPS: { title: string; items: IntegrationDef[] }[] = [
  {
    title: 'Messaging',
    items: [
      // Telegram is special — rendered via the live <TelegramSetup /> below.
      {
        name: 'WhatsApp',
        status: 'needs-michiel',
        description: 'Send reminders + chat with your agent over WhatsApp.',
        blocker: 'Needs Twilio or Meta Business API account + token routing.',
      },
      {
        name: 'Discord',
        status: 'needs-michiel',
        description: 'Channel-based notifications and command DMs.',
        blocker: 'Bot token field exists in deployment settings; pod-side handler not wired yet.',
      },
    ],
  },
  {
    title: 'Google Workspace',
    items: [
      {
        name: 'Calendar',
        status: 'needs-michiel',
        description: 'Two-way sync between Day Plan blocks and Google Calendar events.',
        blocker: 'Needs Google OAuth client (Cloud Console) + redirect URIs configured.',
      },
      {
        name: 'Gmail',
        status: 'needs-michiel',
        description: 'Triage inbox into reminders/ideas; send drafts from the agent.',
        blocker: 'Needs Google OAuth client + Gmail API scope approved.',
      },
      {
        name: 'Drive',
        status: 'needs-michiel',
        description: 'Attach docs to projects and journal entries.',
        blocker: 'Needs Google OAuth client + Drive scope.',
      },
      {
        name: 'Tasks',
        status: 'needs-michiel',
        description: 'Sync Google Tasks with LifeOS tasks.',
        blocker: 'Needs Google OAuth client + Tasks API scope.',
      },
      {
        name: 'Docs',
        status: 'needs-michiel',
        description: 'Drop journal entries / reviews into a doc, or pull notes back.',
        blocker: 'Needs Google OAuth client + Docs scope.',
      },
      {
        name: 'Sheets',
        status: 'needs-michiel',
        description: 'Push wins / metrics to a sheet for tracking.',
        blocker: 'Needs Google OAuth client + Sheets scope.',
      },
      {
        name: 'Contacts',
        status: 'needs-michiel',
        description: 'Resolve Who? in Impact Filters to real people.',
        blocker: 'Needs Google OAuth client + People API scope.',
      },
    ],
  },
  {
    title: 'Other',
    items: [
      {
        name: 'iCal feed',
        status: 'coming-soon',
        description: 'Subscribe to your reminders + day-plan blocks from any calendar app.',
        blocker: 'No external dependencies — just needs to be built.',
      },
      {
        name: 'Webhooks',
        status: 'coming-soon',
        description: 'Outbound webhooks on reminder fires, task completes, etc.',
        blocker: 'No external dependencies — just needs to be built.',
      },
    ],
  },
];

function IntegrationsTab() {
  return (
    <div className="space-y-8">
      <TabHeader
        title="Integrations"
        subtitle="Connect LifeOS to the tools you already use."
      />

      {/* Telegram — wireable; rendered with the live setup card */}
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted/80 mb-3">
          Messaging — Telegram
        </h2>
        <TelegramSetup />
      </div>

      {INTEGRATION_GROUPS.map((group) => (
        <div key={group.title}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted/80 mb-3">
            {group.title}
          </h2>
          <div className="border border-border divide-y divide-border">
            {group.items.map((it) => (
              <IntegrationRow key={it.name} integration={it} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function IntegrationRow({ integration }: { integration: IntegrationDef }) {
  const badge =
    integration.status === 'wireable'
      ? { label: 'Available', cls: 'bg-success/15 text-success' }
      : integration.status === 'needs-michiel'
        ? { label: 'Needs Michiel', cls: 'bg-warning/15 text-warning' }
        : { label: 'Coming soon', cls: 'bg-text-muted/15 text-text-muted' };
  return (
    <div className="px-5 py-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-text">{integration.name}</p>
          <span
            className={cn(
              'text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full',
              badge.cls,
            )}
          >
            {badge.label}
          </span>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">{integration.description}</p>
        {integration.blocker && (
          <p className="text-[11px] text-text-muted/80 mt-1.5 italic">
            {integration.status === 'needs-michiel' ? '🔒 ' : '⏳ '}
            {integration.blocker}
          </p>
        )}
      </div>
      <button
        type="button"
        disabled
        className="text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md border border-border text-text-muted/70 cursor-not-allowed shrink-0"
        title={integration.blocker ?? 'Not yet wired'}
      >
        Connect
      </button>
    </div>
  );
}

/* ================================================================== */
/*  Shared UI                                                          */
/* ================================================================== */

function TabHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-bold text-text">{title}</h1>
      <p className="text-sm text-text-muted mt-1">{subtitle}</p>
    </div>
  );
}

/* ================================================================== */
/*  Icons                                                              */
/* ================================================================== */

function UserIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="flex-shrink-0">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function CreditCardIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="flex-shrink-0">
      <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function BotIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="flex-shrink-0">
      <rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><line x1="12" y1="7" x2="12" y2="11" />
      <line x1="8" y1="16" x2="8" y2="16" strokeLinecap="round" strokeWidth="2" /><line x1="16" y1="16" x2="16" y2="16" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function KeyIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="flex-shrink-0">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function LinkIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function PaletteIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="flex-shrink-0">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="8" r="1" fill="currentColor" />
      <circle cx="8" cy="12" r="1" fill="currentColor" /><circle cx="16" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}
