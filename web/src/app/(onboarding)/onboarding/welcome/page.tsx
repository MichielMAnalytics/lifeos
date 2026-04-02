'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { StepContainer } from '@/components/onboarding/step-container';
import { getPrefPlan, setOnboardingState, onboardingPath } from '@/lib/onboarding-store';

export default function WelcomePage() {
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current) return;
    const prefPlan = getPrefPlan();
    if (!prefPlan) return;

    redirected.current = true;
    if (prefPlan === 'byok') {
      setOnboardingState({ selectedPlanType: 'byok' });
      router.replace(onboardingPath('/onboarding/byok-key'));
    } else if (prefPlan === 'dashboard') {
      router.replace(onboardingPath('/onboarding/plans'));
    } else if (['basic', 'standard', 'premium'].includes(prefPlan)) {
      setOnboardingState({ selectedPlanType: prefPlan });
      router.replace(onboardingPath('/onboarding/channels'));
    }
  }, [router]);

  return (
    <StepContainer>
      <div className="flex flex-col items-center text-center max-w-lg">
        <h1 className="text-4xl font-light tracking-tight text-text leading-[1.15] sm:text-5xl">
          Ready to regain
          <br />
          <span className="font-semibold">control of your life?</span>
        </h1>

        <p className="mt-8 text-base leading-relaxed text-text-muted/80 max-w-sm">
          Goals. Habits. Journals. Plans. Reviews.
          <br />
          All in one calm, focused space.
        </p>

        <button
          onClick={() => router.push(onboardingPath('/onboarding/plans'))}
          className="mt-12 rounded-full bg-accent px-10 py-3.5 text-sm font-medium text-bg transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 active:scale-[0.97]"
        >
          Begin your journey
        </button>
      </div>
    </StepContainer>
  );
}
