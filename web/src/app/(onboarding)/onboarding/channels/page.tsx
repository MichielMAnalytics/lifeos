'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { createPortal } from 'react-dom';
import { StepContainer } from '@/components/onboarding/step-container';
import { LoadingScreen } from '@/components/loading-screen';
import { getOnboardingState, setOnboardingState, onboardingPath } from '@/lib/onboarding-store';

function VideoPreview() {
  const [expanded, setExpanded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (expanded) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [expanded]);

  return (
    <>
      <div className="w-[320px]">
        <button
          onClick={() => setExpanded(true)}
          className="rounded-3xl overflow-hidden border border-border/30 shadow-lg shadow-black/5 cursor-pointer transition-transform duration-200 hover:scale-[1.02] active:scale-[0.99]"
        >
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            className="w-full"
            src="/tg-demo.mp4"
          />
        </button>
        <p className="mt-3 text-[11px] text-text-muted/40 text-center">
          Your Life Coach on Telegram
        </p>
      </div>

      {expanded && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in cursor-pointer"
          onClick={() => setExpanded(false)}
        >
          <div
            className="relative w-[90vw] max-w-3xl rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <video autoPlay loop muted playsInline className="w-full" src="/tg-demo.mp4" />
            <button
              onClick={() => setExpanded(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center text-sm hover:bg-black/70 transition-colors"
            >
              &times;
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

export default function ChannelsPage() {
  const router = useRouter();
  const plans = useQuery(api.stripe.getSubscriptionPlansList);

  const [telegramToken, setTelegramToken] = useState('');
  const [discordToken, setDiscordToken] = useState('');
  const [selectedPlanType, setSelectedPlanType] = useState<string | null>(null);

  useEffect(() => {
    const state = getOnboardingState();
    setTelegramToken(state.telegramToken);
    setDiscordToken(state.discordToken);
    setSelectedPlanType(state.selectedPlanType);
  }, []);

  function handleContinue() {
    setOnboardingState({ telegramToken, discordToken });
    router.push(onboardingPath('/onboarding/confirm'));
  }

  function handleSkip() {
    setOnboardingState({ telegramToken: '', discordToken: '' });
    router.push(onboardingPath('/onboarding/confirm'));
  }

  if (plans === undefined) return <LoadingScreen />;

  const backPath = selectedPlanType === 'byok' ? '/onboarding/byok-key' : '/onboarding/plans';

  return (
    <StepContainer onBack={() => router.push(onboardingPath(backPath))}>
      <div className="relative w-full max-w-lg animate-fade-in">
        <div className="flex flex-col items-center text-center w-full">
          <h1 className="text-3xl font-light tracking-tight text-text sm:text-4xl">
            Connect your <span className="font-semibold">channels</span>
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-text-muted/70 max-w-sm">
            Want your Life Coach available on Telegram or Discord?
            You can always add these later in settings.
          </p>

          <div className="mt-8 w-full max-w-md space-y-4 text-left">
            <div>
              <label className="flex items-center gap-2.5 text-xs font-medium text-text-muted mb-2">
                <img src="/telegram-icon.png" alt="" className="h-4 w-4 rounded-sm" />
                Telegram Bot Token
                <span className="text-text-muted/30 font-normal">optional</span>
              </label>
              <input
                type="text"
                value={telegramToken}
                onChange={(e) => { setTelegramToken(e.target.value); setOnboardingState({ telegramToken: e.target.value }); }}
                placeholder="123456:ABC-DEF1234ghIkl..."
                className="w-full rounded-xl border border-border/60 bg-surface/30 px-4 py-3 text-sm text-text font-mono placeholder:text-text-muted/25 focus:border-accent/50 focus:outline-none transition-colors"
              />
              <p className="mt-1.5 text-[11px] text-text-muted/40">
                Open{' '}
                <a
                  href="https://web.telegram.org/k/#@BotFather"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted/60 underline underline-offset-2 hover:text-text-muted"
                >
                  @BotFather
                </a>
                {' '}on Telegram, send <code className="px-1 py-0.5 rounded bg-surface text-[10px] text-text-muted/60">/newbot</code>, and paste the token here
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2.5 text-xs font-medium text-text-muted mb-2">
                <img src="/discord-icon.png" alt="" className="h-4 w-4 rounded-sm" />
                Discord Bot Token
                <span className="text-text-muted/30 font-normal">optional</span>
              </label>
              <input
                type="text"
                value={discordToken}
                onChange={(e) => { setDiscordToken(e.target.value); setOnboardingState({ discordToken: e.target.value }); }}
                placeholder="MTIzNDU2Nzg5MDEyMzQ1..."
                className="w-full rounded-xl border border-border/60 bg-surface/30 px-4 py-3 text-sm text-text font-mono placeholder:text-text-muted/25 focus:border-accent/50 focus:outline-none transition-colors"
              />
              <p className="mt-1.5 text-[11px] text-text-muted/40">
                Create a bot in the <span className="text-text-muted/60">Discord Developer Portal</span>
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center gap-4">
            <button
              onClick={handleContinue}
              className="w-full max-w-md rounded-full bg-accent px-8 py-3.5 text-sm font-medium text-bg transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 active:scale-[0.97]"
            >
              Continue
            </button>
            <button
              onClick={handleSkip}
              className="text-xs text-text-muted/40 hover:text-text-muted transition-colors duration-200"
            >
              Skip — I&apos;ll add these later
            </button>
          </div>
        </div>

        <div className="hidden lg:block absolute left-full ml-16 top-1/2 -translate-y-1/2">
          <VideoPreview />
        </div>
      </div>
    </StepContainer>
  );
}
