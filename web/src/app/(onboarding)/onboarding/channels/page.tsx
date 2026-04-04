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
        className="w-full rounded-xl border border-border/60 bg-surface/30 px-4 py-3 text-sm text-text font-mono placeholder:text-text-muted/30 focus:border-accent/50 focus:outline-none transition-colors"
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
        className="w-full rounded-xl border border-border/60 bg-surface/30 px-4 py-3 text-sm text-text font-mono placeholder:text-text-muted/30 focus:border-accent/50 focus:outline-none transition-colors"
      />
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

  const backPath = path === 'byok' ? '/onboarding/byok-key' : '/onboarding/plans';

  return (
    <StepContainer backHref={backPath}>
      <div className="flex flex-col items-center text-center w-full max-w-md animate-fade-in">
        <h1 className="text-3xl font-light tracking-tight text-text sm:text-4xl">
          Connect your <span className="font-semibold">channels</span>
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-text-muted">
          Where would you like to chat with your LifeCoach?
          <br />
          <span className="text-text-muted/60">You can always add these later.</span>
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
                className={`text-text-muted/40 transition-transform duration-200 ${expanded === 'telegram' ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {expanded === 'telegram' && (
              <div className="px-4 pb-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <TelegramSetup token={telegramToken} onChange={(v) => { setTelegramToken(v); setOnboardingState({ telegramToken: v }); }} />
                  </div>
                  <div className="hidden sm:block w-48 shrink-0">
                    <div className="rounded-xl overflow-hidden border border-border/30">
                      <video autoPlay loop muted playsInline className="w-full" src="/tg-demo.mp4" />
                    </div>
                    <p className="mt-1.5 text-[10px] text-text-muted/50 text-center">Chat with your LifeCoach</p>
                  </div>
                </div>
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
                className={`text-text-muted/40 transition-transform duration-200 ${expanded === 'discord' ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {expanded === 'discord' && (
              <div className="px-4 pb-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <DiscordSetup token={discordToken} onChange={(v) => { setDiscordToken(v); setOnboardingState({ discordToken: v }); }} />
                  </div>
                  <div className="hidden sm:block w-48 shrink-0">
                    <div className="rounded-xl overflow-hidden border border-border/30">
                      <video autoPlay loop muted playsInline className="w-full" src="/tg-demo.mp4" />
                    </div>
                    <p className="mt-1.5 text-[10px] text-text-muted/50 text-center">Chat with your LifeCoach</p>
                  </div>
                </div>
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
            className="text-xs text-text-muted/60 hover:text-text-muted transition-colors duration-200"
          >
            Skip — I&apos;ll add these later
          </button>
        </div>
      </div>
    </StepContainer>
  );
}
