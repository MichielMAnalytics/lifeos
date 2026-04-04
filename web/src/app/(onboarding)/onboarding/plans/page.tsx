'use client';

import { useState, useCallback } from 'react';
import { StepContainer } from '@/components/onboarding/step-container';
import { setOnboardingState, onboardingPath } from '@/lib/onboarding-store';
import type { OnboardingPath } from '@/lib/onboarding-store';

const PATHS: {
  key: OnboardingPath;
  title: string;
  subtitle: string;
}[] = [
  {
    key: 'own-agent',
    title: 'I have my own AI agent',
    subtitle: 'Connect your own agent separately.',
  },
  {
    key: 'byok',
    title: 'Use my Claude subscription',
    subtitle: 'Bring your own Anthropic account.',
  },
  {
    key: 'managed',
    title: 'Set up everything for me',
    subtitle: 'We handle the AI, hosting, and updates.',
  },
];

function getNextPath(path: OnboardingPath): string {
  if (path === 'managed') return '/onboarding/channels';
  if (path === 'byok') return '/onboarding/byok-key';
  return '/onboarding/confirm';
}

/* Friendly, thick-stroke pictograms */
function AgentIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="12" y="10" width="24" height="18" rx="4" />
      <line x1="19" y1="28" x2="19" y2="33" />
      <line x1="29" y1="28" x2="29" y2="33" />
      <line x1="14" y1="33" x2="34" y2="33" />
      <circle cx="20" cy="19" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="28" cy="19" r="1.8" fill="currentColor" stroke="none" />
      <path d="M21 23.5c0 0 1.2 1.5 3 1.5s3-1.5 3-1.5" strokeWidth="2" />
    </svg>
  );
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="19" cy="24" r="7" />
      <circle cx="19" cy="24" r="2.5" fill="currentColor" stroke="none" />
      <line x1="26" y1="24" x2="38" y2="24" />
      <line x1="33" y1="24" x2="33" y2="20" />
      <line x1="37" y1="24" x2="37" y2="20" />
    </svg>
  );
}

function RocketIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M24 8c-3.5 5.5-5.5 12.5-5.5 20h11c0-7.5-2-14.5-5.5-20z" />
      <path d="M18.5 28c-3.5 0-6 2-7 5h5" />
      <path d="M29.5 28c3.5 0 6 2 7 5h-5" />
      <circle cx="24" cy="20" r="2.5" />
      <path d="M22 34h4v3.5h-4z" />
    </svg>
  );
}

const ICONS: Record<OnboardingPath, React.FC<{ className?: string }>> = {
  'own-agent': AgentIcon,
  'byok': KeyIcon,
  'managed': RocketIcon,
};

export default function PlansPage() {
  const [selected, setSelected] = useState<OnboardingPath | null>(null);

  const handleContinue = useCallback(() => {
    if (!selected) return;
    const planType = selected === 'managed' ? 'standard' : selected === 'byok' ? 'byok' : 'dashboard';
    setOnboardingState({ path: selected, selectedPlanType: planType });
    window.location.href = onboardingPath(getNextPath(selected));
  }, [selected]);

  return (
    <StepContainer backHref="/onboarding/welcome">
      <div className="flex flex-col items-center text-center w-full max-w-xl animate-fade-in">
        <h1 className="text-3xl font-light tracking-tight text-text sm:text-4xl">
          How would you like to <span className="font-semibold">get started</span>?
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-text-muted">
          We&apos;ll streamline your setup experience accordingly.
        </p>

        <div className="mt-10 grid grid-cols-3 gap-4 w-full">
          {PATHS.map((p) => {
            const isSelected = selected === p.key;
            const Icon = ICONS[p.key];
            return (
              <div key={p.key} className="flex flex-col items-center gap-3">
                <button
                  onClick={() => setSelected(p.key)}
                  className={`relative w-full flex flex-col items-center text-center rounded-2xl border-2 p-5 pt-6 pb-5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                    isSelected
                      ? 'border-accent bg-accent/[0.05] shadow-lg shadow-accent/10'
                      : 'border-border/40 bg-surface/10 hover:border-border/70 hover:bg-surface/30'
                  }`}
                >
                  <Icon className={`w-12 h-12 mb-3 transition-colors ${isSelected ? 'text-text' : 'text-text/50'}`} />
                  <span className={`text-[13px] font-semibold leading-tight transition-colors ${isSelected ? 'text-text' : 'text-text/70'}`}>
                    {p.title}
                  </span>
                  <span className={`mt-1.5 text-[11px] leading-relaxed transition-colors ${isSelected ? 'text-text-muted' : 'text-text-muted/60'}`}>
                    {p.subtitle}
                  </span>
                </button>

                {/* Selection bubble under card */}
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                  isSelected
                    ? 'bg-accent border-accent'
                    : 'border-text-muted/25 bg-transparent'
                }`}>
                  {isSelected && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleContinue}
          disabled={!selected}
          className={`mt-8 rounded-lg px-16 py-3 text-sm font-medium transition-all duration-200 ${
            selected
              ? 'bg-accent text-bg hover:opacity-90 active:scale-[0.98] shadow-sm'
              : 'bg-text-muted/10 text-text-muted/40 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </StepContainer>
  );
}
