'use client';

import { useState, useEffect } from 'react';
import { StepContainer } from '@/components/onboarding/step-container';
import { getOnboardingState, setOnboardingState, onboardingPath } from '@/lib/onboarding-store';

function TelegramSetup({ token, onChange }: { token: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-4 space-y-3 animate-fade-in">
      <div className="rounded-xl border border-border/40 bg-surface/20 p-4 text-left text-xs text-text-muted space-y-2">
        <p className="font-medium text-text text-sm">How to get your bot token</p>
        <ol className="list-decimal list-inside space-y-1.5 text-text-muted/80">
          <li>Open <a href="https://web.telegram.org/k/#@BotFather" target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">@BotFather</a> on Telegram</li>
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
    <div className="mt-4 space-y-3 animate-fade-in">
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

/** Static chat mockup showing LifeCoach interaction */
function ChatMockup() {
  return (
    <div className="rounded-2xl border border-border/30 bg-[#e8ddd3] overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-[#075e54] px-4 py-2.5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-accent/80 flex items-center justify-center">
          <svg viewBox="0 0 100 140" width="12" height="17" className="text-white">
            <rect x="22" y="20" width="56" height="70" fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="miter" />
            <line x1="50" y1="115" x2="50" y2="25" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
            <line x1="50" y1="85" x2="26" y2="65" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            <line x1="50" y1="85" x2="74" y2="65" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <p className="text-white text-xs font-medium">LifeOS Coach</p>
          <p className="text-white/60 text-[9px]">online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="p-3 space-y-2 text-[11px]">
        {/* User message */}
        <div className="flex justify-end">
          <div className="bg-[#dcf8c6] rounded-lg rounded-tr-none px-3 py-1.5 max-w-[75%] shadow-sm">
            <p className="text-[#303030]">Pick up groceries after work, and remind me to call mom this weekend</p>
            <p className="text-[9px] text-[#999] text-right mt-0.5">14:32</p>
          </div>
        </div>

        {/* Bot response */}
        <div className="flex justify-start">
          <div className="bg-white rounded-lg rounded-tl-none px-3 py-1.5 max-w-[80%] shadow-sm">
            <p className="text-[#303030]">Got it! I created 2 tasks from your message:</p>
            <div className="mt-1 space-y-0.5 text-[#303030]">
              <p>☐ Pick up groceries after work <span className="text-[#999]">(today)</span></p>
              <p>☐ Call mom <span className="text-[#999]">(Saturday)</span></p>
            </div>
            <p className="text-[9px] text-[#999] text-right mt-1">14:32</p>
          </div>
        </div>

        {/* User reply */}
        <div className="flex justify-end">
          <div className="bg-[#dcf8c6] rounded-lg rounded-tr-none px-3 py-1.5 max-w-[75%] shadow-sm">
            <p className="text-[#303030]">Add both to today</p>
            <p className="text-[9px] text-[#999] text-right mt-0.5">14:33</p>
          </div>
        </div>

        {/* Bot plan update */}
        <div className="flex justify-start">
          <div className="bg-white rounded-lg rounded-tl-none px-3 py-1.5 max-w-[80%] shadow-sm">
            <p className="text-[#303030]">Done. Here&apos;s your updated plan:</p>
            <div className="mt-1 space-y-0.5 text-[#303030] font-mono text-[10px]">
              <p><strong>9:00</strong> &nbsp; Deep work</p>
              <p><strong>11:00</strong> &nbsp; Team standup</p>
              <p><strong>12:00</strong> &nbsp; Lunch</p>
              <p><strong>13:00</strong> &nbsp; Pick up groceries</p>
            </div>
            <p className="text-[9px] text-[#999] text-right mt-1">14:33</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChannelsPage() {
  const [telegramToken, setTelegramToken] = useState('');
  const [discordToken, setDiscordToken] = useState('');
  const [path, setPath] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<'telegram' | 'discord' | null>(null);

  useEffect(() => {
    const state = getOnboardingState();
    setTelegramToken(state.telegramToken);
    setDiscordToken(state.discordToken);
    setPath(state.path);
  }, []);

  function handleContinue() {
    setOnboardingState({ telegramToken, discordToken });
    window.location.href = onboardingPath('/onboarding/confirm');
  }

  function handleSkip() {
    setOnboardingState({ telegramToken: '', discordToken: '' });
    window.location.href = onboardingPath('/onboarding/confirm');
  }

  const backPath = path === 'byok' ? '/onboarding/byok' : '/onboarding/plans';

  return (
    <StepContainer backHref={backPath}>
      <div className="flex items-start gap-12 w-full max-w-4xl animate-fade-in">
        {/* Left side — form */}
        <div className="flex flex-col items-center text-center w-full max-w-md">
          <h1 className="text-3xl font-light tracking-tight text-text sm:text-4xl">
            Connect your <span className="font-semibold">channels</span>
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-text-muted">
            Chat with your LifeCoach on Telegram or Discord.
            <br />
            <span className="text-text-muted">You can always add these later.</span>
          </p>

          <div className="mt-8 w-full space-y-3">
            {/* Telegram card */}
            <div className={`rounded-2xl border-2 transition-all duration-200 ${
              expanded === 'telegram' ? 'border-accent bg-accent/[0.03]' : 'border-border/40 bg-surface/10 hover:border-border/60'
            }`}>
              <button
                onClick={() => setExpanded(expanded === 'telegram' ? null : 'telegram')}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <img src="/telegram-icon.png" alt="" className="h-8 w-8 rounded-lg" />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-text block">Telegram</span>
                  <span className="text-xs text-text-muted/70">Chat via Telegram bot</span>
                </div>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`text-text-muted/70 transition-transform duration-200 ${expanded === 'telegram' ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {expanded === 'telegram' && (
                <div className="px-4 pb-4">
                  <TelegramSetup token={telegramToken} onChange={(v) => { setTelegramToken(v); setOnboardingState({ telegramToken: v }); }} />
                </div>
              )}
            </div>

            {/* Discord card */}
            <div className={`rounded-2xl border-2 transition-all duration-200 ${
              expanded === 'discord' ? 'border-accent bg-accent/[0.03]' : 'border-border/40 bg-surface/10 hover:border-border/60'
            }`}>
              <button
                onClick={() => setExpanded(expanded === 'discord' ? null : 'discord')}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <img src="/discord-icon.png" alt="" className="h-8 w-8 rounded-lg" />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-text block">Discord</span>
                  <span className="text-xs text-text-muted/70">Chat via Discord bot</span>
                </div>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`text-text-muted/70 transition-transform duration-200 ${expanded === 'discord' ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {expanded === 'discord' && (
                <div className="px-4 pb-4">
                  <DiscordSetup token={discordToken} onChange={(v) => { setDiscordToken(v); setOnboardingState({ discordToken: v }); }} />
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-4 w-full">
            <button
              onClick={handleContinue}
              className="w-full rounded-lg bg-accent px-8 py-3 text-sm font-medium text-bg transition-all duration-200 hover:opacity-90 active:scale-[0.98] shadow-sm"
            >
              Continue
            </button>
            <button
              onClick={handleSkip}
              className="text-xs text-text-muted hover:text-text-muted transition-colors duration-200"
            >
              Skip — I&apos;ll add these later
            </button>
          </div>
        </div>

        {/* Right side — chat mockup */}
        <div className="hidden lg:block w-72 shrink-0 sticky top-24">
          <ChatMockup />
          <p className="mt-3 text-[11px] text-text-muted/70 text-center">
            Capture tasks, ideas & voice notes — your LifeCoach handles it all
          </p>
        </div>
      </div>
    </StepContainer>
  );
}
