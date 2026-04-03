'use client';

import { useState, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useAction } from 'convex/react';
import { api } from '@/lib/convex-api';
import { StepContainer } from '@/components/onboarding/step-container';
import { LoadingScreen } from '@/components/loading-screen';
import { clearPrefs, setOnboardingState, onboardingPath } from '@/lib/onboarding-store';

interface Plan {
  priceId: string;
  annualPriceId: string | null;
  planType: string;
  priceEuroCents: number;
  annualPriceEuroCents: number | null;
  includedCreditsCents: number;
  label: string;
  includesDeployment: boolean;
}

type Step = 'choice' | 'byok-ask' | 'home';

// ---------------------------------------------------------------------------
// Choice button — big tappable option for yes/no questions
// ---------------------------------------------------------------------------

function ChoiceButton({
  children,
  subtitle,
  recommended,
  onClick,
}: {
  children: React.ReactNode;
  subtitle?: string;
  recommended?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative w-full rounded-2xl border px-6 py-5 text-left transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
        recommended
          ? 'border-accent/40 bg-accent/[0.04] hover:border-accent/60 hover:bg-accent/[0.07]'
          : 'border-border/60 bg-surface/30 hover:border-text-muted/30 hover:bg-surface/60'
      }`}
    >
      {recommended && (
        <span className="absolute -top-2.5 left-5 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-medium text-bg tracking-wide">
          Most common
        </span>
      )}
      <span className="text-sm font-medium text-text">{children}</span>
      {subtitle && (
        <span className="block mt-1 text-xs text-text-muted/50">{subtitle}</span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function PlansPageInner() {
  const router = useRouter();
  const plans = useQuery(api.stripe.getSubscriptionPlansList);
  const createCheckout = useAction(api.stripeCheckout.createSubscriptionCheckout);

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [annual, setAnnual] = useState(false);
  const [step, _setStep] = useState<Step>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('plans_step');
      if (saved === 'byok-ask' || saved === 'home') return saved as Step;
    }
    return 'choice';
  });
  const setStep = (s: Step) => {
    if (typeof window !== 'undefined') {
      if (s === 'choice') sessionStorage.removeItem('plans_step');
      else sessionStorage.setItem('plans_step', s);
    }
    _setStep(s);
  };

  const getPlan = useCallback(
    (planType: string): Plan | undefined => plans?.find((p) => p.planType === planType),
    [plans],
  );

  const fmtPrice = (cents: number) => `\u20AC${(cents / 100).toFixed(0)}`;
  const displayPrice = (plan: Plan) =>
    annual && plan.annualPriceEuroCents
      ? fmtPrice(Math.round(plan.annualPriceEuroCents / 12))
      : fmtPrice(plan.priceEuroCents);
  const resolvePrice = (plan: Plan) =>
    annual && plan.annualPriceId ? plan.annualPriceId : plan.priceId;

  function handleSelectDashboardPlan(plan: Plan) {
    if (!plan.priceId) return;
    setCheckoutLoading(true);
    (async () => {
      try {
        clearPrefs();
        const result = await createCheckout({ priceId: resolvePrice(plan) });
        if (result.url) window.location.href = result.url;
      } catch (err) {
        console.error('Checkout error:', err);
        setCheckoutLoading(false);
      }
    })();
  }

  if (plans === undefined) return <LoadingScreen />;

  return (
    <StepContainer onBack={step === 'choice' ? () => router.push(onboardingPath('/onboarding/welcome')) : () => setStep('choice')}>
      <div className="flex flex-col items-center text-center w-full max-w-2xl">

        {/* ── Step 1: Initial choice ── */}
        {step === 'choice' && (
          <div key="choice" className="animate-fade-in w-full max-w-md">
            <h1 className="text-3xl font-light tracking-tight text-text sm:text-4xl">
              How would you like to get started?
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-text-muted/70">
              LifeOS comes with a personal Life Coach that helps you plan, reflect, and stay on track.
            </p>

            <div className="mt-10 flex flex-col gap-3">
              <ChoiceButton
                onClick={() => setStep('byok-ask')}
                subtitle="We'll set everything up for you"
                recommended
              >
                Set up my Life Coach for me
              </ChoiceButton>
              <ChoiceButton
                onClick={() => setStep('home')}
                subtitle="OpenClaw, Claude Code, or another agent"
              >
                I already have my own AI agent
              </ChoiceButton>
            </div>
          </div>
        )}

        {/* ── Step 2: Do you have an Anthropic subscription? ── */}
        {step === 'byok-ask' && (
          <div key="byok-ask" className="animate-fade-in w-full max-w-md">
            <h1 className="text-3xl font-light tracking-tight text-text sm:text-4xl">
              Do you have an Anthropic subscription?
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-text-muted/70">
              Your Life Coach is powered by Claude. If you already pay for Anthropic, you can connect your account and save on AI costs.
            </p>

            <div className="mt-10 flex flex-col gap-3">
              <ChoiceButton
                onClick={() => {
                  setOnboardingState({ selectedPlanType: 'standard' });
                  router.push(onboardingPath('/onboarding/channels'));
                }}
                subtitle="We take care of the AI — nothing extra to set up"
                recommended
              >
                No, include everything for me
              </ChoiceButton>
              <ChoiceButton
                onClick={() => {
                  setOnboardingState({ selectedPlanType: 'byok' });
                  router.push(onboardingPath('/onboarding/byok-key'));
                }}
                subtitle="Connect your existing Anthropic account"
              >
                Yes, I already pay for Anthropic
              </ChoiceButton>
            </div>
          </div>
        )}

        {/* ── Home plan ── */}
        {step === 'home' && (() => {
          const dashboardPlan = getPlan('dashboard');
          if (!dashboardPlan) return null;
          return (
            <div key="home" className="animate-fade-in w-full max-w-[360px] mx-auto flex flex-col items-center text-center">
              <h1 className="text-3xl font-light tracking-tight text-text sm:text-4xl">
                LifeOS Home
              </h1>
              <p className="mt-3 text-sm text-text-muted/60">
                Plan, track, and reflect — connect your own AI agent separately.
              </p>

              <div className="mt-8 flex flex-col items-center">
                <div className="flex items-baseline gap-3">
                  <span className="text-sm text-text-muted/40 line-through">{displayPrice(dashboardPlan)}/mo</span>
                  <span className="text-4xl font-semibold tracking-tight text-text">{'\u20AC'}0</span>
                  <span className="text-sm text-text-muted/50">/mo</span>
                </div>
                <p className="mt-1 text-xs text-text-muted/50">
                  Full home, all presets & themes, CLI access
                </p>
                <button
                  onClick={() => setAnnual((v) => !v)}
                  className="mt-3 text-xs text-text-muted/40 hover:text-text-muted transition-colors"
                >
                  {annual ? 'Billed annually' : 'Switch to annual'}{' '}
                  {!annual && <span className="text-green-500 font-medium">save 20%</span>}
                </button>
              </div>

              <p className="mt-8 text-[11px] text-text-muted/30 flex items-center gap-1.5">
                <span className="flex -space-x-1.5">
                  {['M', 'S', 'A', 'K'].map((letter, i) => (
                    <span key={i} className="w-5 h-5 rounded-full bg-text/[0.06] border-2 border-bg flex items-center justify-center text-[8px] font-medium text-text-muted/40">{letter}</span>
                  ))}
                </span>
                Joined by 500+ people taking control of their days
              </p>

              <button
                onClick={() => handleSelectDashboardPlan(dashboardPlan)}
                disabled={checkoutLoading}
                className="mt-8 w-full rounded-full bg-accent px-8 py-3.5 text-sm font-medium text-bg transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 active:scale-[0.97] disabled:opacity-60"
              >
                {checkoutLoading ? (
                  <span className="flex items-center justify-center gap-1">
                    Redirecting
                    <span className="inline-flex">
                      <span className="animate-bounce [animation-delay:0ms]">.</span>
                      <span className="animate-bounce [animation-delay:150ms]">.</span>
                      <span className="animate-bounce [animation-delay:300ms]">.</span>
                    </span>
                  </span>
                ) : (
                  'Start free trial'
                )}
              </button>

              <p className="mt-3 text-[11px] text-text-muted/30">7 days free. Cancel anytime.</p>
            </div>
          );
        })()}

      </div>
    </StepContainer>
  );
}

export default function PlansPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PlansPageInner />
    </Suspense>
  );
}
