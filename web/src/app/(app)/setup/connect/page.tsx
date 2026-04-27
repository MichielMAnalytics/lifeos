'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { SoftGlow } from '@/components/onboarding/soft-glow';
import { getOnboardingState, setOnboardingState } from '@/lib/onboarding-store';

// Note: Telegram/Discord token persistence happens via deploymentSettings
// (same as the original onboarding channels flow). The tokens are saved
// to sessionStorage here and persisted server-side on the confirm/setup page.

interface Integration {
  key: string;
  label: string;
  description: string;
  available: boolean;
  icon: React.ReactNode;
}

const CHANNEL_INTEGRATIONS: Integration[] = [
  {
    key: 'telegram',
    label: 'Telegram',
    description: 'Chat with your Life Coach via Telegram bot.',
    available: true,
    icon: <img src="/telegram-icon.png" alt="" className="h-8 w-8 rounded-lg" />,
  },
  {
    key: 'discord',
    label: 'Discord',
    description: 'Chat with your Life Coach via Discord bot.',
    available: true,
    icon: <img src="/discord-icon.png" alt="" className="h-8 w-8 rounded-lg" />,
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    description: 'Message your Life Coach on WhatsApp.',
    available: false,
    icon: (
      <svg viewBox="0 0 48 48" className="w-8 h-8">
        <rect x="8" y="8" width="32" height="32" rx="4" fill="#25D366" />
        <path d="M24 14c-5.52 0-10 4.48-10 10 0 1.76.46 3.42 1.27 4.87L14 34l5.27-1.38A9.96 9.96 0 0024 34c5.52 0 10-4.48 10-10s-4.48-10-10-10z" fill="white" />
        <path d="M21.5 19.5c-.3-.67-.62-.68-.9-.7h-.77c-.27 0-.7.1-1.07.52-.37.42-1.4 1.37-1.4 3.33s1.43 3.86 1.63 4.13c.2.27 2.77 4.43 6.84 6.03.95.37 1.7.6 2.28.76.96.26 1.83.22 2.52.13.77-.1 2.37-.97 2.7-1.9.34-.94.34-1.74.24-1.9-.1-.17-.37-.27-.77-.47s-2.37-1.17-2.74-1.3c-.37-.14-.64-.2-.9.2-.27.4-1.04 1.3-1.27 1.57-.24.27-.47.3-.87.1s-1.7-.63-3.24-2c-1.2-1.07-2-2.38-2.24-2.78-.23-.4-.02-.62.18-.82.18-.18.4-.47.6-.7.2-.24.27-.4.4-.67.14-.27.07-.5-.03-.7-.1-.2-.9-2.17-1.24-2.97z" fill="#25D366" />
      </svg>
    ),
  },
];

const CALENDAR_INTEGRATIONS: Integration[] = [
  {
    key: 'google-calendar',
    label: 'Google Calendar',
    description: 'See your events alongside your day plan.',
    available: false,
    icon: (
      <svg viewBox="0 0 48 48" className="w-8 h-8">
        <rect x="8" y="8" width="32" height="32" rx="4" fill="#4285F4" />
        <rect x="12" y="16" width="24" height="20" rx="2" fill="white" />
        <rect x="12" y="8" width="24" height="8" rx="2" fill="#1A73E8" />
      </svg>
    ),
  },
  {
    key: 'apple-calendar',
    label: 'Apple Calendar',
    description: 'Sync your iCloud calendar events.',
    available: false,
    icon: (
      <svg viewBox="0 0 48 48" className="w-8 h-8">
        <rect x="8" y="8" width="32" height="32" rx="4" fill="#FF3B30" />
        <rect x="12" y="16" width="24" height="20" rx="2" fill="white" />
        <text x="24" y="31" textAnchor="middle" fill="#333" fontSize="12" fontWeight="700" fontFamily="system-ui">13</text>
      </svg>
    ),
  },
];

function TelegramSetup({ token, onChange }: { token: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-3 space-y-3 animate-fade-in">
      <div className="rounded-xl border border-border/40 bg-surface/20 p-4 text-left text-xs text-text-muted space-y-2">
        <p className="font-medium text-text text-sm">How to get your bot token</p>
        <ol className="list-decimal list-inside space-y-1.5 text-text-muted/80">
          <li>Open <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">@BotFather</a> on Telegram</li>
          <li>Send <code className="px-1 py-0.5 rounded bg-surface text-text-muted">/newbot</code> and follow the prompts</li>
          <li>Copy the token and paste it below</li>
        </ol>
      </div>
      <input
        type="text"
        value={token}
        onChange={(e) => onChange(e.target.value)}
        placeholder="123456:ABC-DEF1234ghIkl..."
        className="w-full rounded-xl border border-border/60 bg-surface/30 px-4 py-3 text-sm text-text font-mono placeholder:text-text-muted focus:border-accent/50 focus:outline-none transition-colors"
      />
    </div>
  );
}

function DiscordSetup({ token, onChange }: { token: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-3 space-y-3 animate-fade-in">
      <div className="rounded-xl border border-border/40 bg-surface/20 p-4 text-left text-xs text-text-muted space-y-2">
        <p className="font-medium text-text text-sm">How to get your bot token</p>
        <ol className="list-decimal list-inside space-y-1.5 text-text-muted/80">
          <li>Go to the <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">Discord Developer Portal</a></li>
          <li>Create a new application and add a Bot</li>
          <li>Copy the bot token and paste it below</li>
        </ol>
      </div>
      <input
        type="text"
        value={token}
        onChange={(e) => onChange(e.target.value)}
        placeholder="MTIzNDU2Nzg5MDEyMzQ1..."
        className="w-full rounded-xl border border-border/60 bg-surface/30 px-4 py-3 text-sm text-text font-mono placeholder:text-text-muted focus:border-accent/50 focus:outline-none transition-colors"
      />
    </div>
  );
}

export default function ConnectPage() {
  const router = useRouter();
  const profile = useQuery(api.userProfile.get);
  const markComplete = useMutation(api.userProfile.markSetupComplete);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [telegramToken, setTelegramToken] = useState('');
  const [discordToken, setDiscordToken] = useState('');

  useEffect(() => {
    const state = getOnboardingState();
    setTelegramToken(state.telegramToken);
    setDiscordToken(state.discordToken);
  }, []);

  const setupPath = profile?.setupPath ?? getOnboardingState().setupPath;
  const isFullSetup = setupPath === 'full-setup';

  async function handleContinue() {
    setOnboardingState({ telegramToken, discordToken });

    if (isFullSetup) {
      router.push('/setup/personalize');
    } else {
      await markComplete();
      localStorage.setItem('lifeos-setup-complete', 'true');
      router.replace('/today');
    }
  }

  async function handleSkip() {
    if (isFullSetup) {
      router.push('/setup/personalize');
    } else {
      await markComplete();
      localStorage.setItem('lifeos-setup-complete', 'true');
      router.replace('/today');
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-bg">
      <SoftGlow />

      {/* LifeAI logo */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-40">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" width="28" height="39" className="opacity-30">
          <rect x="22" y="20" width="56" height="70" fill="none" stroke="var(--color-text)" strokeWidth="5" strokeLinejoin="miter" />
          <line x1="50" y1="115" x2="50" y2="25" stroke="var(--color-text)" strokeWidth="5" strokeLinecap="round" />
          <line x1="50" y1="85" x2="26" y2="65" stroke="var(--color-text)" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="50" y1="85" x2="74" y2="65" stroke="var(--color-text)" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="50" y1="62" x2="30" y2="42" stroke="var(--color-text)" strokeWidth="4" strokeLinecap="round" />
          <line x1="50" y1="62" x2="70" y2="42" stroke="var(--color-text)" strokeWidth="4" strokeLinecap="round" />
          <line x1="50" y1="45" x2="38" y2="28" stroke="var(--color-text)" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="50" y1="45" x2="62" y2="28" stroke="var(--color-text)" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Back */}
      <div className="fixed top-6 left-6 z-50">
        <button
          onClick={() => router.push('/setup')}
          className="group flex items-center gap-2 text-xs text-text-muted hover:text-text transition-all duration-200"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-0.5">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
          <span>Back</span>
        </button>
      </div>

      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 animate-fade-in">
        <div className="flex items-start gap-12 w-full max-w-4xl">
          {/* Left side — integrations */}
          <div className="flex flex-col items-center text-center w-full max-w-lg">
          <h1 className="text-3xl font-light tracking-tight text-text sm:text-4xl">
            Connect your <span className="font-semibold">integrations</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-text-muted">
            Link your calendar and chat channels. You can always add more later in settings.
          </p>

          {/* Channels */}
          <div className="mt-8 w-full">
            <p className="text-xs font-medium text-text-muted/50 uppercase tracking-wider mb-3">Channels</p>
            <div className="space-y-3">
            {CHANNEL_INTEGRATIONS.map((integration) => {
              const isExpanded = expanded === integration.key;
              const isComingSoon = !integration.available;

              return (
                <div
                  key={integration.key}
                  className={`rounded-2xl border-2 transition-all duration-200 ${
                    isComingSoon
                      ? 'border-border/20 bg-surface/5 opacity-50'
                      : isExpanded
                        ? 'border-accent bg-accent/[0.03]'
                        : 'border-border/40 bg-surface/10 hover:border-border/60'
                  }`}
                >
                  <button
                    onClick={() => {
                      if (isComingSoon) return;
                      setExpanded(isExpanded ? null : integration.key);
                    }}
                    disabled={isComingSoon}
                    className="w-full flex items-center gap-3 p-4 text-left"
                  >
                    {integration.icon}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text block">{integration.label}</span>
                        {isComingSoon && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-text-muted/10 text-text-muted/60 font-medium">
                            Coming soon
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-text-muted/70">{integration.description}</span>
                    </div>
                    {!isComingSoon && (
                      <svg
                        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className={`text-text-muted/70 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    )}
                  </button>

                  {isExpanded && integration.key === 'telegram' && (
                    <div className="px-4 pb-4">
                      <TelegramSetup
                        token={telegramToken}
                        onChange={(v) => { setTelegramToken(v); setOnboardingState({ telegramToken: v }); }}
                      />
                    </div>
                  )}
                  {isExpanded && integration.key === 'discord' && (
                    <div className="px-4 pb-4">
                      <DiscordSetup
                        token={discordToken}
                        onChange={(v) => { setDiscordToken(v); setOnboardingState({ discordToken: v }); }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </div>

          {/* Divider */}
          <div className="w-full flex items-center gap-3 mt-6 mb-2">
            <div className="h-px flex-1 bg-border/30" />
            <span className="text-[10px] text-text-muted/40 uppercase tracking-wider">Calendars</span>
            <div className="h-px flex-1 bg-border/30" />
          </div>

          {/* Calendars */}
          <div className="w-full space-y-3 mb-2">
            {CALENDAR_INTEGRATIONS.map((integration) => (
              <div
                key={integration.key}
                className="rounded-2xl border-2 border-border/20 bg-surface/5 opacity-50"
              >
                <div className="w-full flex items-center gap-3 p-4 text-left">
                  {integration.icon}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-text block">{integration.label}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-text-muted/10 text-text-muted/60 font-medium">Coming soon</span>
                    </div>
                    <span className="text-xs text-text-muted/70">{integration.description}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col items-center gap-3 w-full max-w-xs">
            <button
              onClick={handleContinue}
              className="w-full rounded-lg bg-accent px-8 py-3 text-sm font-medium text-bg transition-all duration-200 hover:opacity-90 active:scale-[0.98] shadow-sm"
            >
              {isFullSetup ? 'Continue' : 'Finish Setup'}
            </button>
            <button
              onClick={handleSkip}
              className="text-xs text-text-muted hover:text-text transition-colors duration-200"
            >
              Skip — I&apos;ll add these later
            </button>
          </div>
        </div>

          {/* Right side — chat mockup (matches lifeai.so) */}
          <div className="hidden lg:block w-80 shrink-0 sticky top-16">
            <div className="rounded-2xl border border-border/30 bg-[#e8ddd3] overflow-hidden shadow-lg">
              {/* Header */}
              <div className="bg-[#075e54] px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-accent/80 flex items-center justify-center">
                  <svg viewBox="0 0 100 140" width="14" height="19" className="text-white">
                    <rect x="22" y="20" width="56" height="70" fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="miter" />
                    <line x1="50" y1="115" x2="50" y2="25" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                    <line x1="50" y1="85" x2="26" y2="65" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                    <line x1="50" y1="85" x2="74" y2="65" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-white text-xs font-medium">Life Coach</p>
                    <span className="text-[8px] bg-white/20 text-white/80 px-1.5 py-0.5 rounded-full font-medium">bot</span>
                  </div>
                  <p className="text-white/60 text-[9px]">last seen recently</p>
                </div>
              </div>

              {/* Messages */}
              <div className="p-3 space-y-2.5 text-[11px]">
                {/* User: task */}
                <div className="flex justify-end">
                  <div className="bg-[#dcf8c6] rounded-lg rounded-tr-none px-3 py-1.5 max-w-[80%] shadow-sm">
                    <p className="text-[#303030]">Add a task for tomorrow: finish project proposal</p>
                    <p className="text-[9px] text-[#999] text-right mt-0.5 flex items-center justify-end gap-1">14:32 <span className="text-blue-500">&#10003;&#10003;</span></p>
                  </div>
                </div>
                {/* Bot: task response */}
                <div className="flex justify-start">
                  <div className="bg-white rounded-lg rounded-tl-none px-3 py-1.5 max-w-[85%] shadow-sm">
                    <p className="text-[#303030]">Done. <strong>Finish project proposal</strong> &#8212; tomorrow, Apr 5.</p>
                    <p className="text-[9px] text-[#999] text-right mt-0.5">14:32</p>
                  </div>
                </div>
                {/* User: idea */}
                <div className="flex justify-end">
                  <div className="bg-[#dcf8c6] rounded-lg rounded-tr-none px-3 py-1.5 max-w-[80%] shadow-sm">
                    <p className="text-[#303030]">Idea: Habit tracker with social accountability</p>
                    <p className="text-[9px] text-[#999] text-right mt-0.5 flex items-center justify-end gap-1">14:33 <span className="text-blue-500">&#10003;&#10003;</span></p>
                  </div>
                </div>
                {/* Bot: idea response */}
                <div className="flex justify-start">
                  <div className="bg-white rounded-lg rounded-tl-none px-3 py-1.5 max-w-[85%] shadow-sm">
                    <p className="text-[#303030]">Captured as idea #7 &#8212; <strong>High</strong> potential. Connects to Q2 goal.</p>
                    <p className="text-[9px] text-[#999] text-right mt-0.5">14:33</p>
                  </div>
                </div>
                {/* User: voice note (visual) */}
                <div className="flex justify-end">
                  <div className="bg-[#dcf8c6] rounded-lg rounded-tr-none px-3 py-2 max-w-[70%] shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#075e54] flex items-center justify-center">
                        <svg width="10" height="12" viewBox="0 0 10 12" fill="white"><polygon points="2,0 10,6 2,12"/></svg>
                      </div>
                      <div className="flex-1 flex items-center gap-0.5">
                        {Array.from({ length: 20 }).map((_, i) => (
                          <div key={i} className="w-[3px] rounded-full bg-[#075e54]/40" style={{ height: `${4 + Math.random() * 10}px` }} />
                        ))}
                      </div>
                      <span className="text-[9px] text-[#999]">0:12</span>
                    </div>
                    <p className="text-[9px] text-[#999] text-right mt-0.5 flex items-center justify-end gap-1">14:34 <span className="text-blue-500">&#10003;&#10003;</span></p>
                  </div>
                </div>
                {/* Bot: voice note processing */}
                <div className="flex justify-start">
                  <div className="bg-white rounded-lg rounded-tl-none px-3 py-2 max-w-[85%] shadow-sm">
                    <p className="text-[#303030]">Processed your voice note. Here&apos;s what I captured:</p>
                    <div className="mt-1.5 space-y-1 text-[#303030]">
                      <p>&#128221; <strong>Journal entry</strong> added: Reflection on this week&apos;s progress</p>
                      <p>&#9989; <strong>Task</strong> created: Call mom this weekend</p>
                      <p>&#128161; <strong>Insight</strong>: Your Q1 goal &quot;Read 6 books&quot; is 1 behind pace</p>
                    </div>
                    <p className="text-[9px] text-[#999] text-right mt-1">14:34</p>
                  </div>
                </div>
              </div>

              {/* Input bar */}
              <div className="bg-[#f0f0f0] px-3 py-2 flex items-center gap-2 border-t border-[#ddd]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l2 2"/></svg>
                <div className="flex-1 bg-white rounded-full px-3 py-1.5 text-[10px] text-[#999]">Write a message...</div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M12 2a3 3 0 013 3v6a3 3 0 01-6 0V5a3 3 0 013-3z"/><path d="M19 10v1a7 7 0 01-14 0v-1"/></svg>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-text-muted/50 text-center">
              Telegram / WhatsApp LifeCoach
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
