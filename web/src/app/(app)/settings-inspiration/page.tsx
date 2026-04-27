'use client';

import { useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Inspiration page — Settings redesign options                       */
/*  Navigate to /settings-inspiration on localhost:3000                */
/* ------------------------------------------------------------------ */

type Option = 'A' | 'B' | 'C';

export default function SettingsInspirationPage() {
  const [active, setActive] = useState<Option>('A');

  return (
    <div className="min-h-screen max-w-6xl mx-auto py-10 px-6 space-y-12 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">
          Settings Redesign — Inspiration
        </h1>
        <p className="text-sm text-text-muted mt-2 max-w-2xl">
          Three layout options for a cleaner settings experience with a dedicated billing section.
          Each option is inspired by real products. Pick the direction you like, or mix and match.
        </p>
      </div>

      {/* Option switcher */}
      <div className="flex gap-2">
        {(['A', 'B', 'C'] as Option[]).map((opt) => (
          <button
            key={opt}
            onClick={() => setActive(opt)}
            className={`px-4 py-2 text-xs font-medium uppercase tracking-wider border transition-all cursor-pointer ${
              active === opt
                ? 'bg-text text-bg border-text'
                : 'bg-transparent text-text-muted border-border hover:border-text/30'
            }`}
          >
            Option {opt}
          </button>
        ))}
      </div>

      {/* Active option */}
      {active === 'A' && <OptionA />}
      {active === 'B' && <OptionB />}
      {active === 'C' && <OptionC />}

      {/* Comparison table */}
      <ComparisonTable />
    </div>
  );
}

/* ================================================================== */
/*  OPTION A — Sidebar Tabs (Linear / Supabase / Vercel style)        */
/* ================================================================== */

function OptionA() {
  const [tab, setTab] = useState('account');

  const tabs = [
    { id: 'account', label: 'Account', icon: UserIcon },
    { id: 'billing', label: 'Billing', icon: CreditCardIcon },
    { id: 'life-coach', label: 'Life Coach', icon: BotIcon },
    { id: 'api-keys', label: 'API Keys', icon: KeyIcon },
    { id: 'appearance', label: 'Appearance', icon: PaletteIcon },
  ];

  return (
    <div className="space-y-4">
      <OptionHeader
        title="Option A — Sidebar Tabs"
        description="Inspired by Linear, Supabase, and Vercel. A persistent sidebar groups settings into clear categories. The right panel shows only the active section — no scrolling through unrelated content."
        pros={[
          'Clear navigation — users always know where they are',
          'Scales well as settings grow (add new tabs easily)',
          'Each section loads independently — snappier feel',
          'Billing gets its own dedicated space',
        ]}
        cons={[
          'Takes horizontal space (sidebar)',
          'More navigation clicks for users who want to scan everything',
        ]}
        references={['Linear Settings', 'Supabase Project Settings', 'Vercel Project Settings', 'GitHub Settings']}
      />

      {/* Mockup */}
      <div className="border border-border overflow-hidden">
        <div className="flex min-h-[600px]">
          {/* Sidebar */}
          <div className="w-52 border-r border-border bg-bg-subtle flex-shrink-0 py-4 px-2 space-y-0.5">
            <p className="text-[10px] uppercase tracking-widest text-text-muted/80 px-3 py-2">
              Settings
            </p>
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors cursor-pointer ${
                    tab === t.id
                      ? 'text-text bg-surface-hover font-medium'
                      : 'text-text-muted hover:text-text hover:bg-surface-hover/50'
                  }`}
                >
                  <Icon active={tab === t.id} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 p-8 overflow-y-auto">
            {tab === 'account' && <AccountMockup />}
            {tab === 'billing' && <BillingMockup />}
            {tab === 'life-coach' && <LifeCoachMockup />}
            {tab === 'api-keys' && <ApiKeysMockup />}
            {tab === 'appearance' && <AppearanceMockup />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  OPTION B — Horizontal Tabs (Stripe Dashboard / Clerk style)       */
/* ================================================================== */

function OptionB() {
  const [tab, setTab] = useState('account');

  const tabs = [
    { id: 'account', label: 'Account' },
    { id: 'billing', label: 'Billing' },
    { id: 'life-coach', label: 'Life Coach' },
    { id: 'api-keys', label: 'API Keys' },
    { id: 'appearance', label: 'Appearance' },
  ];

  return (
    <div className="space-y-4">
      <OptionHeader
        title="Option B — Horizontal Tabs"
        description="Inspired by Stripe Dashboard, Clerk, and Tailwind UI. A horizontal tab bar separates sections. Content is full-width below. Clean and familiar pattern."
        pros={[
          'Full content width — no sidebar eating space',
          'Familiar pattern (most SaaS dashboards)',
          'Works great on all screen sizes',
          'Tabs are always visible for quick switching',
        ]}
        cons={[
          'Tab bar can get crowded with many sections',
          'Less visual hierarchy than sidebar',
        ]}
        references={['Stripe Dashboard', 'Clerk Dashboard', 'Tailwind UI Settings', 'Railway Settings']}
      />

      {/* Mockup */}
      <div className="border border-border overflow-hidden min-h-[600px]">
        {/* Tab bar */}
        <div className="border-b border-border px-6 flex gap-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-xs transition-colors cursor-pointer relative ${
                tab === t.id
                  ? 'text-text font-medium'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {t.label}
              {tab === t.id && (
                <div className="absolute bottom-0 left-4 right-4 h-px bg-text" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-8 max-w-3xl">
          {tab === 'account' && <AccountMockup />}
          {tab === 'billing' && <BillingMockup />}
          {tab === 'life-coach' && <LifeCoachMockup />}
          {tab === 'api-keys' && <ApiKeysMockup />}
          {tab === 'appearance' && <AppearanceMockup />}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  OPTION C — Grouped Cards / Sections (Notion / Apple style)        */
/* ================================================================== */

function OptionC() {
  return (
    <div className="space-y-4">
      <OptionHeader
        title="Option C — Grouped Card Sections"
        description="Inspired by Notion Settings and Apple System Preferences. All settings visible in one scrollable view, but organized into distinct cards with clear headers. Quick-jump links at top."
        pros={[
          'Everything visible — scan without clicking',
          'Cards create natural grouping',
          'Jump links for quick navigation',
          'Feels comprehensive and transparent',
        ]}
        cons={[
          'Long page — can feel overwhelming',
          'Harder to add new sections without growing the page',
          'Similar to current layout (less dramatic improvement)',
        ]}
        references={['Notion Settings', 'Apple System Settings', 'Figma Account Settings', 'Raycast Settings']}
      />

      {/* Mockup */}
      <div className="border border-border overflow-hidden min-h-[600px] p-8">
        {/* Jump links */}
        <div className="flex gap-3 mb-8 pb-4 border-b border-border">
          {['Account', 'Billing', 'Life Coach', 'API Keys', 'Appearance'].map((s) => (
            <span
              key={s}
              className="text-[10px] uppercase tracking-wider text-text-muted hover:text-text transition-colors cursor-pointer"
            >
              {s}
            </span>
          ))}
        </div>

        <div className="max-w-3xl space-y-8">
          {/* Account card */}
          <SettingsCard title="Account">
            <AccountMockup />
          </SettingsCard>

          {/* Billing card */}
          <SettingsCard title="Billing">
            <BillingMockup />
          </SettingsCard>

          {/* Life Coach card */}
          <SettingsCard title="Life Coach">
            <LifeCoachMockup />
          </SettingsCard>

          {/* API Keys card */}
          <SettingsCard title="API Keys">
            <ApiKeysMockup />
          </SettingsCard>

          {/* Appearance card */}
          <SettingsCard title="Appearance">
            <AppearanceMockup />
          </SettingsCard>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Shared section mockups                                             */
/* ================================================================== */

function AccountMockup() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Account" subtitle="Manage your profile and preferences" />

      <div className="flex items-start gap-6">
        {/* Avatar */}
        <div className="relative group flex-shrink-0">
          <div className="h-16 w-16 rounded-full bg-surface border-2 border-border flex items-center justify-center text-lg font-bold text-text">
            K
          </div>
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <FormRow label="Name" value="Kemp Zumpolle" />
          <FormRow label="Email" value="zumpollekemp@gmail.com" disabled />
          <FormRow label="Timezone" value="Europe/Amsterdam" />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <MockButton label="Save changes" primary />
      </div>

      {/* Danger zone */}
      <div className="border-t border-border pt-6 mt-8">
        <p className="text-[10px] uppercase tracking-widest text-danger/70 mb-3">Danger zone</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-text">Delete account</p>
            <p className="text-[10px] text-text-muted">Permanently delete your account and all data</p>
          </div>
          <MockButton label="Delete account" danger />
        </div>
      </div>
    </div>
  );
}

function BillingMockup() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Billing" subtitle="Manage your subscription, payment method, and credits" />

      {/* Current plan */}
      <div className="border border-border p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">Current plan</p>
            <p className="text-lg font-bold text-text">BYOK</p>
            <p className="text-xs text-text-muted mt-0.5">Bring your own API keys</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-text tabular-nums">EUR 20<span className="text-xs font-normal text-text-muted">/mo</span></p>
            <p className="text-[10px] text-text-muted">Renews May 5, 2026</p>
          </div>
        </div>

        <div className="flex gap-2">
          <MockButton label="Change plan" />
          <MockButton label="Cancel subscription" subtle />
        </div>
      </div>

      {/* Payment method */}
      <div className="border border-border p-5 space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-text-muted">Payment method</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-7 rounded border border-border bg-surface flex items-center justify-center">
              <span className="text-[9px] font-bold text-text-muted">VISA</span>
            </div>
            <div>
              <p className="text-xs text-text font-mono">**** **** **** 4242</p>
              <p className="text-[10px] text-text-muted">Expires 12/27</p>
            </div>
          </div>
          <MockButton label="Update" subtle />
        </div>
      </div>

      {/* Credits (for managed plans) */}
      <div className="border border-border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-text-muted">Credits balance</p>
          <p className="text-sm font-bold text-text tabular-nums">EUR 0.00</p>
        </div>
        <p className="text-[10px] text-text-muted">
          Credits are used for managed AI model usage. BYOK plans use your own API keys.
        </p>
        <div className="flex gap-2">
          {['EUR 10', 'EUR 25', 'EUR 50'].map((t) => (
            <button
              key={t}
              className="text-[10px] px-3 py-1 border border-border text-text-muted hover:text-text hover:border-text/30 transition-colors cursor-pointer"
            >
              +{t}
            </button>
          ))}
        </div>

        {/* Coupon */}
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            placeholder="Coupon code"
            className="flex-1 text-xs px-3 py-1.5 bg-transparent border border-border text-text placeholder:text-text-muted/70 focus:border-text/30 focus:outline-none"
          />
          <MockButton label="Redeem" />
        </div>
      </div>

      {/* Invoices */}
      <div className="border border-border">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-[10px] uppercase tracking-widest text-text-muted">Recent invoices</p>
        </div>
        {[
          { date: 'Apr 5, 2026', amount: 'EUR 20.00', status: 'Paid' },
          { date: 'Mar 5, 2026', amount: 'EUR 20.00', status: 'Paid' },
          { date: 'Feb 5, 2026', amount: 'EUR 20.00', status: 'Paid' },
        ].map((inv, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-5 py-2.5 border-b border-border last:border-b-0 hover:bg-surface-hover/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <p className="text-xs text-text font-mono w-28">{inv.date}</p>
              <p className="text-xs text-text tabular-nums">{inv.amount}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-success">{inv.status}</span>
              <span className="text-[10px] text-text-muted hover:text-text transition-colors cursor-pointer underline underline-offset-2">
                Download
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Manage via Stripe */}
      <p className="text-[10px] text-text-muted">
        Payment processing by Stripe.{' '}
        <span className="text-text underline underline-offset-2 cursor-pointer hover:opacity-70">
          Open Stripe billing portal
        </span>
      </p>
    </div>
  );
}

function LifeCoachMockup() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Life Coach" subtitle="Configure your AI agent deployment and model credentials" />

      {/* Status */}
      <div className="border border-border p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-success animate-pulse" />
            <div>
              <p className="text-sm font-medium text-text">Instance running</p>
              <p className="text-[10px] text-text-muted font-mono">pod-k8s-eu-west-1a · 247ms</p>
            </div>
          </div>
          <div className="flex gap-2">
            <MockButton label="Restart" subtle />
            <MockButton label="Logs" subtle />
          </div>
        </div>
      </div>

      {/* Model credentials */}
      <div className="border border-border p-5 space-y-4">
        <p className="text-[10px] uppercase tracking-widest text-text-muted">Model credentials</p>

        {/* Anthropic */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-text">Anthropic</label>
            <div className="flex gap-1">
              <span className="text-[9px] px-2 py-0.5 bg-text text-bg uppercase tracking-wider">
                API Key
              </span>
              <span className="text-[9px] px-2 py-0.5 border border-border text-text-muted uppercase tracking-wider cursor-pointer hover:border-text/30 transition-colors">
                Claude sub
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 border border-border bg-surface/50 text-xs text-text-muted font-mono">
              sk-ant-api ···· (51 chars)
            </div>
            <MockButton label="Update" subtle />
          </div>
        </div>

        {/* OpenAI */}
        <div className="space-y-1.5">
          <label className="text-xs text-text">OpenAI</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 border border-border border-dashed text-xs text-text-muted/70">
              Not configured
            </div>
            <MockButton label="Add key" subtle />
          </div>
        </div>

        {/* Google */}
        <div className="space-y-1.5">
          <label className="text-xs text-text">Google (Gemini)</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 border border-border border-dashed text-xs text-text-muted/70">
              Not configured
            </div>
            <MockButton label="Add key" subtle />
          </div>
        </div>
      </div>

      {/* Channels */}
      <div className="border border-border p-5 space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-text-muted">Channels</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-border p-3 flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-success" />
            <div>
              <p className="text-xs text-text">Telegram</p>
              <p className="text-[10px] text-text-muted">Connected</p>
            </div>
          </div>
          <div className="border border-border border-dashed p-3 flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-border" />
            <div>
              <p className="text-xs text-text-muted">Discord</p>
              <p className="text-[10px] text-text-muted/80">Not connected</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApiKeysMockup() {
  return (
    <div className="space-y-6">
      <SectionTitle title="API Keys" subtitle="Manage keys for the CLI and external integrations" />

      <div className="border border-border">
        {[
          { name: 'CLI - MacBook', prefix: 'lifeos_sk_a3b7', lastUsed: '2026-04-04', active: true },
          { name: 'Life Coach', prefix: 'lifeos_sk_f9c2', lastUsed: '2026-04-05', active: true },
          { name: 'Testing', prefix: 'lifeos_sk_0e4d', lastUsed: null, active: false },
        ].map((key, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-5 py-3.5 border-b border-border last:border-b-0 hover:bg-surface-hover/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className={`h-2 w-2 rounded-full ${key.active ? 'bg-success' : 'bg-border'}`} />
              <div>
                <p className="text-xs font-medium text-text">{key.name}</p>
                <p className="text-[10px] text-text-muted font-mono">{key.prefix}····</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-[10px] text-text-muted font-mono">
                {key.lastUsed ?? 'Never used'}
              </p>
              <button className="text-text-muted hover:text-danger transition-colors cursor-pointer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                </svg>
              </button>
            </div>
          </div>
        ))}

        {/* Create new key */}
        <div className="px-5 py-3.5 border-t border-border">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Key name (e.g. CLI, Mobile)"
              className="flex-1 px-3 py-2 text-xs bg-transparent border border-border text-text placeholder:text-text-muted/70 focus:border-text/30 focus:outline-none font-mono"
            />
            <MockButton label="Create key" primary />
          </div>
        </div>
      </div>
    </div>
  );
}

function AppearanceMockup() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Appearance" subtitle="Customize the look and feel of your dashboard" />

      {/* Theme */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-text-muted">Theme</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { name: 'Midnight', bg: '#000000', accent: '#ffffff', active: true },
            { name: 'Zen', bg: '#f7f3ee', accent: '#c45d3e', active: false },
            { name: 'Nord', bg: '#242933', accent: '#88c0d0', active: false },
            { name: 'Sunset', bg: '#1a0a1e', accent: '#f59e0b', active: false },
            { name: 'Forest', bg: '#0d1a0d', accent: '#4ade80', active: false },
            { name: 'Light', bg: '#ffffff', accent: '#1a1a1a', active: false },
            { name: 'Dark', bg: '#121212', accent: '#e0e0e0', active: false },
            { name: 'System', bg: 'linear-gradient(135deg, #fff 50%, #000 50%)', accent: '#666', active: false },
          ].map((t) => (
            <button
              key={t.name}
              className={`p-3 border transition-all cursor-pointer text-left ${
                t.active
                  ? 'border-text'
                  : 'border-border hover:border-text/30'
              }`}
            >
              <div
                className="h-8 w-full rounded-sm mb-2 border border-black/10"
                style={{ background: t.bg }}
              >
                <div
                  className="h-full w-1/3 rounded-sm"
                  style={{ backgroundColor: t.accent, opacity: 0.6 }}
                />
              </div>
              <p className="text-[10px] text-text">{t.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Font */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-text-muted">Font</p>
        <div className="grid grid-cols-3 gap-2">
          {['Geist', 'Satoshi', 'Inter', 'JetBrains Mono', 'Space Grotesk', 'System'].map((f) => (
            <button
              key={f}
              className={`px-3 py-2 border text-xs transition-all cursor-pointer ${
                f === 'Geist'
                  ? 'border-text text-text font-medium'
                  : 'border-border text-text-muted hover:border-text/30'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Nav mode */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-text-muted">Navigation mode</p>
        <div className="flex gap-2">
          {['Sidebar', 'Header'].map((mode) => (
            <button
              key={mode}
              className={`flex-1 py-3 border text-xs transition-all cursor-pointer ${
                mode === 'Sidebar'
                  ? 'border-text text-text font-medium'
                  : 'border-border text-text-muted hover:border-text/30'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Preset */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-text-muted">Page preset</p>
        <div className="flex flex-wrap gap-2">
          {['Default', 'Solopreneur', 'Developer', 'Executive', 'Minimalist', 'Journaler', 'Content Creator'].map((p) => (
            <button
              key={p}
              className={`px-3 py-1.5 border text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                p === 'Default'
                  ? 'border-text text-text font-medium'
                  : 'border-border text-text-muted hover:border-text/30'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Comparison table                                                   */
/* ================================================================== */

function ComparisonTable() {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-widest text-text-muted">Comparison</h2>
      <div className="border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3 text-[10px] uppercase tracking-widest text-text-muted font-medium">Criteria</th>
              <th className="text-center px-4 py-3 text-[10px] uppercase tracking-widest text-text-muted font-medium">A — Sidebar</th>
              <th className="text-center px-4 py-3 text-[10px] uppercase tracking-widest text-text-muted font-medium">B — Horizontal</th>
              <th className="text-center px-4 py-3 text-[10px] uppercase tracking-widest text-text-muted font-medium">C — Cards</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Scalability', 'Excellent', 'Good', 'Poor'],
              ['Discoverability', 'Good', 'Good', 'Excellent'],
              ['Mobile-friendly', 'Requires drawer', 'Good', 'Good'],
              ['Content width', 'Narrower', 'Full width', 'Full width'],
              ['Billing visibility', 'Dedicated tab', 'Dedicated tab', 'Inline card'],
              ['Implementation effort', 'Medium', 'Low', 'Low'],
              ['Best for', '5+ sections', '3-5 sections', '3-4 sections'],
            ].map(([criteria, a, b, c], i) => (
              <tr key={i} className="border-b border-border last:border-b-0 hover:bg-surface-hover/30 transition-colors">
                <td className="px-5 py-2.5 text-text">{criteria}</td>
                <td className="px-4 py-2.5 text-center text-text-muted">{a}</td>
                <td className="px-4 py-2.5 text-center text-text-muted">{b}</td>
                <td className="px-4 py-2.5 text-center text-text-muted">{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border border-accent/20 bg-accent-glow p-5 space-y-2">
        <p className="text-xs font-bold text-text">Recommendation</p>
        <p className="text-xs text-text-muted leading-relaxed">
          <strong className="text-text">Option A (Sidebar Tabs)</strong> is the strongest choice for LifeAI.
          You already have 5 sections that will likely grow (e.g. Notifications, Integrations, Data Export).
          The sidebar pattern matches Linear and Supabase — products your audience knows.
          It also gives Billing its own proper home instead of being buried in a dropdown.
        </p>
        <p className="text-xs text-text-muted leading-relaxed">
          <strong className="text-text">Option B (Horizontal Tabs)</strong> is a close second if you want maximum simplicity
          and don&apos;t expect the settings to grow much.
        </p>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Shared UI helpers                                                  */
/* ================================================================== */

function OptionHeader({
  title,
  description,
  pros,
  cons,
  references,
}: {
  title: string;
  description: string;
  pros: string[];
  cons: string[];
  references: string[];
}) {
  return (
    <div className="border border-border p-6 space-y-4">
      <div>
        <h2 className="text-sm font-bold text-text">{title}</h2>
        <p className="text-xs text-text-muted mt-1 leading-relaxed max-w-2xl">{description}</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-success mb-2">Pros</p>
          <ul className="space-y-1">
            {pros.map((p, i) => (
              <li key={i} className="text-xs text-text-muted flex gap-2">
                <span className="text-success flex-shrink-0">+</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-danger mb-2">Cons</p>
          <ul className="space-y-1">
            {cons.map((c, i) => (
              <li key={i} className="text-xs text-text-muted flex gap-2">
                <span className="text-danger flex-shrink-0">-</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest text-text-muted/80 mb-1">Inspired by</p>
        <p className="text-xs text-text-muted">{references.join(' · ')}</p>
      </div>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-text">{title}</h3>
      <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
    </div>
  );
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border">
      <div className="px-5 py-3 border-b border-border bg-bg-subtle">
        <p className="text-[10px] uppercase tracking-widest text-text-muted font-medium">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function FormRow({
  label,
  value,
  disabled,
}: {
  label: string;
  value: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-4">
      <label className="text-xs text-text-muted w-20 flex-shrink-0">{label}</label>
      <input
        type="text"
        defaultValue={value}
        disabled={disabled}
        className="flex-1 px-3 py-2 text-xs bg-transparent border border-border text-text focus:border-text/30 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}

function MockButton({
  label,
  primary,
  danger,
  subtle,
}: {
  label: string;
  primary?: boolean;
  danger?: boolean;
  subtle?: boolean;
}) {
  const base = 'px-3 py-1.5 text-[10px] uppercase tracking-wider transition-all cursor-pointer';
  const variants = {
    primary: 'bg-text text-bg hover:opacity-90',
    danger: 'border border-danger/30 text-danger hover:bg-danger/10',
    subtle: 'border border-border text-text-muted hover:text-text hover:border-text/30',
    default: 'border border-border text-text hover:bg-surface-hover',
  };
  const variant = primary ? 'primary' : danger ? 'danger' : subtle ? 'subtle' : 'default';

  return <button className={`${base} ${variants[variant]}`}>{label}</button>;
}

/* ================================================================== */
/*  Icons                                                              */
/* ================================================================== */

function UserIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="flex-shrink-0">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function CreditCardIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="flex-shrink-0">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function BotIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="flex-shrink-0">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <line x1="12" y1="7" x2="12" y2="11" />
      <line x1="8" y1="16" x2="8" y2="16" strokeLinecap="round" strokeWidth="2" />
      <line x1="16" y1="16" x2="16" y2="16" strokeLinecap="round" strokeWidth="2" />
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

function PaletteIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} className="flex-shrink-0">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="8" r="1" fill="currentColor" />
      <circle cx="8" cy="12" r="1" fill="currentColor" />
      <circle cx="16" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}
