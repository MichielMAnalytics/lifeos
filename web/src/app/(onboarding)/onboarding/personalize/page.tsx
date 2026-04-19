'use client';

import { useState, Suspense } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { StepContainer } from '@/components/onboarding/step-container';
import { LoadingScreen } from '@/components/loading-screen';
import { setOnboardingState, onboardingPath } from '@/lib/onboarding-store';

const isDev = process.env.NODE_ENV === 'development';

const PERSONAS = [
  { key: 'solopreneur', label: 'Solopreneur', desc: 'I run my own thing', focus: 'productivity' },
  { key: 'developer', label: 'Developer', desc: 'I ship code', focus: 'productivity' },
  { key: 'content-creator', label: 'Creator', desc: 'I create and publish', focus: 'goals' },
  { key: 'executive', label: 'Executive', desc: 'I lead a team', focus: 'goals' },
  { key: 'journaler', label: 'Journaler', desc: 'I reflect and write', focus: 'reflection' },
  { key: 'minimalist', label: 'Minimalist', desc: 'Keep it simple', focus: 'productivity' },
];

function PersonalizeInner() {
  const isDevMode = isDev && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('dev');
  const updateConfig = useMutation(api.dashboardConfig.update);

  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleContinue() {
    if (!selected) return;
    const persona = PERSONAS.find(p => p.key === selected);
    if (!persona) return;

    setOnboardingState({ persona: selected, mainFocus: persona.focus });
    setSaving(true);

    if (!isDevMode) {
      try {
        const presetMap: Record<string, string> = {};
        const pages = ['today', 'tasks', 'projects', 'goals', 'journal', 'ideas', 'plan', 'reviews', 'life-coach', 'thoughts', 'resources', 'schedules', 'health'];
        for (const page of pages) presetMap[page] = selected;
        await updateConfig({ pagePresets: presetMap });
      } catch (err) {
        console.error('Failed to save preset:', err);
      }
    }

    setSaving(false);
    window.location.href = onboardingPath('/onboarding/setup');
  }

  function handleSkip() {
    window.location.href = onboardingPath('/onboarding/setup');
  }

  return (
    <StepContainer>
      <div className="flex flex-col items-center text-center w-full max-w-md animate-fade-in">
        <h1 className="text-3xl font-light tracking-tight text-text sm:text-4xl">
          Which sounds most <span className="font-semibold">like you</span>?
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-text-muted">
          We&apos;ll set up your LifeOS home based on your answer. You can always change this later.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-3 w-full">
          {PERSONAS.map((p) => {
            const isSelected = selected === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setSelected(p.key)}
                className={`rounded-2xl border-2 px-5 py-4 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                  isSelected
                    ? 'border-accent bg-accent/[0.06]'
                    : 'border-border/50 bg-surface/20 hover:border-border hover:bg-surface/40'
                }`}
              >
                <span className="block text-sm font-medium text-text">{p.label}</span>
                <span className="block mt-0.5 text-[11px] text-text-muted/70">{p.desc}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 w-full">
          <button
            onClick={handleContinue}
            disabled={!selected || saving}
            className={`w-full max-w-xs rounded-lg px-8 py-3 text-sm font-medium transition-all duration-200 ${
              selected
                ? 'bg-accent text-bg hover:opacity-90 active:scale-[0.98] shadow-sm'
                : 'bg-text-muted/10 text-text-muted/70 cursor-not-allowed'
            }`}
          >
            {saving ? 'Setting up...' : 'Continue'}
          </button>
          <button
            onClick={handleSkip}
            className="text-xs text-text-muted hover:text-text-muted transition-colors"
          >
            Skip — use the default layout
          </button>
        </div>
      </div>
    </StepContainer>
  );
}

export default function PersonalizePage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PersonalizeInner />
    </Suspense>
  );
}
