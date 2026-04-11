'use client';

import { useState, useEffect } from 'react';
import { StepContainer } from '@/components/onboarding/step-container';
import { setOnboardingState, getOnboardingState, onboardingPath } from '@/lib/onboarding-store';

const USE_CASES = [
  {
    key: 'plan-your-day',
    title: 'My days feel chaotic',
    description: 'Plan your mornings, set priorities, and stay focused.',
    preview: 'Day Planner',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
        <rect x="10" y="8" width="28" height="32" rx="3" />
        <line x1="10" y1="16" x2="38" y2="16" />
        <line x1="16" y1="23" x2="32" y2="23" />
        <line x1="16" y1="29" x2="28" y2="29" />
      </svg>
    ),
  },
  {
    key: 'track-goals',
    title: 'I lose sight of my goals',
    description: 'Track progress and stay on course, quarter by quarter.',
    preview: 'Compass',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
        <circle cx="24" cy="24" r="16" />
        <circle cx="24" cy="24" r="10" />
        <circle cx="24" cy="24" r="4" />
      </svg>
    ),
  },
  {
    key: 'journal-reflect',
    title: 'I don\'t reflect enough',
    description: 'Build a journaling habit with daily entries and reviews.',
    preview: 'Journal',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
        <path d="M12 8h24a2 2 0 012 2v28a2 2 0 01-2 2H12a2 2 0 01-2-2V10a2 2 0 012-2z" />
        <line x1="16" y1="16" x2="32" y2="16" />
        <line x1="16" y1="22" x2="32" y2="22" />
        <line x1="16" y1="28" x2="26" y2="28" />
      </svg>
    ),
  },
  {
    key: 'life-coach',
    title: 'I need accountability',
    description: 'A coach that checks in and keeps you on track.',
    preview: 'Life Coach',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
        <path d="M8 12h24a2 2 0 012 2v14a2 2 0 01-2 2H16l-6 5v-5H8a2 2 0 01-2-2V14a2 2 0 012-2z" />
        <circle cx="36" cy="20" r="6" fill="none" />
        <path d="M34 20l1.5 1.5 3-3" />
      </svg>
    ),
  },
  {
    key: 'health-fitness',
    title: 'I want to get healthier',
    description: 'Track workouts, nutrition, and build better habits.',
    preview: 'Health',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
        <path d="M18 14v20M30 14v20" />
        <path d="M14 18v12M34 18v12" />
        <line x1="18" y1="24" x2="30" y2="24" />
      </svg>
    ),
  },
];

function UseCaseCard({ uc, isSelected, onToggle }: { uc: typeof USE_CASES[number]; isSelected: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`group relative w-full flex flex-col items-center text-center rounded-2xl border-2 px-4 py-5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer overflow-hidden ${
        isSelected
          ? 'border-accent bg-accent/[0.05] shadow-lg shadow-accent/10'
          : 'border-border/40 bg-surface/10 hover:border-border/70 hover:bg-surface/30'
      }`}
    >
      {/* Hover preview overlay — placeholder for demo video/gif */}
      <div className="absolute inset-0 bg-surface/95 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="text-center px-3">
          <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-accent/10 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <p className="text-[10px] font-medium text-text-muted">Preview: {uc.preview}</p>
          <p className="text-[9px] text-text-muted/50 mt-0.5">Demo coming soon</p>
        </div>
      </div>

      {/* Checkmark */}
      <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 z-10 ${
        isSelected ? 'bg-accent border-accent' : 'border-text-muted/25 bg-transparent'
      }`}>
        {isSelected && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>

      <div className={`mb-2 transition-colors ${isSelected ? 'text-text' : 'text-text/60'}`}>
        {uc.icon}
      </div>
      <span className={`text-[13px] font-semibold leading-tight transition-colors ${isSelected ? 'text-text' : 'text-text/70'}`}>
        {uc.title}
      </span>
      <span className={`mt-1 text-[10px] leading-relaxed transition-colors ${isSelected ? 'text-text-muted' : 'text-text-muted/60'}`}>
        {uc.description}
      </span>
    </button>
  );
}

export default function UseCasesPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const state = getOnboardingState();
    if (state.selectedUseCases.length > 0) {
      setSelected(new Set(state.selectedUseCases));
    }
  }, []);

  function toggle(key: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handleContinue() {
    const useCases = Array.from(selected);
    setOnboardingState({ selectedUseCases: useCases });
    window.location.href = onboardingPath('/onboarding/confirm');
  }

  function handleSkip() {
    setOnboardingState({ selectedUseCases: [] });
    window.location.href = onboardingPath('/onboarding/confirm');
  }

  const backPath = getOnboardingState().path === 'byok'
    ? '/onboarding/byok'
    : '/onboarding/plans';

  return (
    <StepContainer backHref={backPath}>
      <div className="flex flex-col items-center text-center w-full max-w-2xl animate-fade-in">
        <h1 className="text-3xl font-light tracking-tight text-text sm:text-4xl">
          What do you <span className="font-semibold">struggle with</span>?
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-text-muted">
          Pick what resonates. We&apos;ll shape your experience around it.
        </p>

        <div className="mt-10 w-full max-w-xl mx-auto space-y-3">
        {/* Row 1: first 3 cards */}
        <div className="grid grid-cols-3 gap-3">
          {USE_CASES.slice(0, 3).map((uc) => (
            <UseCaseCard key={uc.key} uc={uc} isSelected={selected.has(uc.key)} onToggle={() => toggle(uc.key)} />
          ))}
        </div>
        {/* Row 2: last 2 cards, centered */}
        <div className="flex justify-center gap-3">
          {USE_CASES.slice(3).map((uc) => (
            <div key={uc.key} className="w-1/3">
              <UseCaseCard uc={uc} isSelected={selected.has(uc.key)} onToggle={() => toggle(uc.key)} />
            </div>
          ))}
        </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 w-full max-w-xs">
          <button
            onClick={handleContinue}
            className={`w-full rounded-lg px-8 py-3 text-sm font-medium transition-all duration-200 ${
              selected.size > 0
                ? 'bg-accent text-bg hover:opacity-90 active:scale-[0.98] shadow-sm'
                : 'bg-accent/80 text-bg hover:opacity-90 active:scale-[0.98]'
            }`}
          >
            Continue
          </button>
          <button
            onClick={handleSkip}
            className="text-xs text-text-muted hover:text-text transition-colors"
          >
            Skip — I&apos;ll explore on my own
          </button>
        </div>
      </div>
    </StepContainer>
  );
}
