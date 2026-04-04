'use client';

import { Suspense } from 'react';
import { StepContainer } from '@/components/onboarding/step-container';
import { LoadingScreen } from '@/components/loading-screen';
import { getOnboardingState } from '@/lib/onboarding-store';

const isDev = process.env.NODE_ENV === 'development';

const FIRST_STEPS = [
  {
    title: 'Send a message to your LifeCoach',
    desc: 'Say hello on Telegram or in the app. Your coach already knows your goals.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M4 16l7 7L28 6" />
      </svg>
    ),
    action: 'Open LifeCoach',
    href: '/life-coach',
  },
  {
    title: 'Add your first task',
    desc: 'Type or voice-message a task to your LifeCoach, or add one directly.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <rect x="5" y="5" width="22" height="22" rx="3" />
        <line x1="12" y1="16" x2="20" y2="16" />
        <line x1="16" y1="12" x2="16" y2="20" />
      </svg>
    ),
    action: 'Add a task',
    href: '/tasks',
  },
  {
    title: 'Write your first journal entry',
    desc: 'Reflect on your day. Your LifeCoach can help you get started.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M6 6h16a2 2 0 012 2v16a2 2 0 01-2 2H6V6z" />
        <line x1="10" y1="12" x2="20" y2="12" />
        <line x1="10" y1="16" x2="17" y2="16" />
        <line x1="10" y1="20" x2="14" y2="20" />
      </svg>
    ),
    action: 'Open journal',
    href: '/journal',
  },
];

function GetStartedInner() {
  const state = getOnboardingState();
  const isDevMode = isDev && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('dev');

  function handleGetStarted(href: string) {
    if (isDevMode) return;
    localStorage.setItem('lifeos-setup-complete', 'true');
    window.location.href = href;
  }

  return (
    <StepContainer>
      <div className="flex flex-col items-center text-center w-full max-w-md animate-fade-in">
        {/* Success header */}
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className="text-3xl font-light tracking-tight text-text sm:text-4xl">
          You&apos;re <span className="font-semibold">all set</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">
          {state.persona
            ? `Your LifeOS home is ready, personalised for you.`
            : 'Your LifeOS home is ready.'}
          {' '}Here are a few things you can try first:
        </p>

        {/* First steps cards */}
        <div className="mt-8 w-full space-y-3">
          {FIRST_STEPS.map((step, i) => (
            <button
              key={i}
              onClick={() => handleGetStarted(step.href)}
              className="w-full flex items-start gap-4 rounded-2xl border-2 border-border/40 bg-surface/10 p-4 text-left transition-all duration-200 hover:border-border/60 hover:bg-surface/20 active:scale-[0.99] group"
            >
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0 mt-0.5">
                {step.icon}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-text block">{step.title}</span>
                <span className="text-xs text-text-muted/70 block mt-0.5">{step.desc}</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted/50 shrink-0 mt-3 transition-transform group-hover:translate-x-0.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>

        {/* Skip to dashboard */}
        <button
          onClick={() => handleGetStarted('/today')}
          className="mt-6 rounded-lg bg-accent px-12 py-3 text-sm font-medium text-bg transition-all duration-200 hover:opacity-90 active:scale-[0.98] shadow-sm"
        >
          Go to my LifeOS home
        </button>

        {isDevMode && (
          <div className="mt-6 rounded-xl border border-border/40 bg-surface/30 px-6 py-4 text-left text-xs text-text-muted/60 font-mono w-full">
            <p>path: {state.path ?? 'not set'}</p>
            <p>plan: {state.selectedPlanType ?? 'not set'}</p>
            <p>persona: {state.persona ?? 'not set'}</p>
          </div>
        )}
      </div>
    </StepContainer>
  );
}

export default function GetStartedPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <GetStartedInner />
    </Suspense>
  );
}
