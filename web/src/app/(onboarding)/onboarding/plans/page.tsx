'use client';

import { useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useAction } from 'convex/react';
import { api } from '@/lib/convex-api';
import { StepContainer } from '@/components/onboarding/step-container';
import { PlanCard } from '@/components/onboarding/plan-card';
import { LoadingScreen } from '@/components/loading-screen';
import { getPrefBilling, clearPrefs, setOnboardingState, onboardingPath } from '@/lib/onboarding-store';

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

type PlanView = 'main' | 'dashboard' | 'byok';

function PlansPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plans = useQuery(api.stripe.getSubscriptionPlansList);
  const createCheckout = useAction(api.stripeCheckout.createSubscriptionCheckout);

  // Read URL params and persist to sessionStorage (for OAuth redirect survival)
  const urlPlan = searchParams.get('plan');
  const urlBilling = searchParams.get('billing');
  if (typeof window !== 'undefined') {
    if (urlPlan) sessionStorage.setItem('pref_plan', urlPlan);
    if (urlBilling) sessionStorage.setItem('pref_billing', urlBilling);
  }

  const prefPlan = typeof window !== 'undefined' ? sessionStorage.getItem('pref_plan') : null;
  const prefBilling = getPrefBilling();
  const [annual, setAnnual] = useState(() => prefBilling === 'annual');
  const isAnnual = annual;

  const [planView, setPlanView] = useState<PlanView>(() => {
    if (prefPlan === 'dashboard') return 'dashboard';
    return 'main';
  });
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const getPlan = useCallback(
    (planType: string): Plan | undefined => plans?.find((p) => p.planType === planType),
    [plans],
  );

  const fmtPrice = (cents: number) => `\u20AC${(cents / 100).toFixed(0)}`;
  const displayPrice = (plan: Plan) =>
    isAnnual && plan.annualPriceEuroCents
      ? fmtPrice(Math.round(plan.annualPriceEuroCents / 12))
      : fmtPrice(plan.priceEuroCents);
  const resolvePrice = (plan: Plan) =>
    isAnnual && plan.annualPriceId ? plan.annualPriceId : plan.priceId;

  function handleSelectDashboardPlan(plan: Plan) {
    if (!plan.priceId) return;
    setCheckoutLoading(plan.planType);
    (async () => {
      try {
        clearPrefs();
        const result = await createCheckout({ priceId: resolvePrice(plan) });
        if (result.url) window.location.href = result.url;
      } catch (err) {
        console.error('Checkout error:', err);
        setCheckoutLoading(null);
      }
    })();
  }

  function handleSelectDeploymentPlan(planType: string) {
    setOnboardingState({ selectedPlanType: planType });
    if (planType === 'byok') {
      router.push(onboardingPath('/onboarding/byok-key'));
    } else {
      router.push(onboardingPath('/onboarding/channels'));
    }
  }

  if (plans === undefined) return <LoadingScreen />;

  const basicPlan = getPlan('basic');
  const standardPlan = getPlan('standard');
  const premiumPlan = getPlan('premium');
  const dashboardPlan = getPlan('dashboard');
  const byokPlan = getPlan('byok');

  return (
    <StepContainer onBack={() => router.push(onboardingPath('/onboarding/welcome'))}>
      <div className="flex flex-col items-center text-center w-full max-w-2xl">
        <h1 className="text-3xl font-light tracking-tight text-text sm:text-4xl">
          Try LifeOS <span className="font-semibold">free for 7 days</span>
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-text-muted/70 max-w-md">
          We believe everyone deserves to feel in control.
          Pick what fits — you won&apos;t be charged until your trial ends.
        </p>

        {/* Monthly / Annual toggle */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <span className={`text-sm font-medium transition-colors ${!annual ? 'text-text' : 'text-text-muted/50'}`}>
            Monthly
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={annual}
            onClick={() => {
              const next = !annual;
              setAnnual(next);
              if (typeof window !== 'undefined') {
                if (next) sessionStorage.setItem('pref_billing', 'annual');
                else sessionStorage.removeItem('pref_billing');
              }
            }}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-text/10 transition-colors ${
              annual ? 'bg-accent' : 'bg-text/10'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-bg shadow-sm transition-transform ${
                annual ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-sm font-medium transition-colors ${annual ? 'text-text' : 'text-text-muted/50'}`}>
            Annual
            <span className="ml-1.5 text-[10px] text-green-500 font-medium">20% off</span>
          </span>
        </div>

        {/* Main plans */}
        {planView === 'main' && (
          <div className="mt-10 w-full animate-fade-in">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {basicPlan && (
                <PlanCard
                  name="Basic"
                  price={`${displayPrice(basicPlan)}/mo`}
                  billedAnnually={isAnnual}
                  features={[
                    'Full LifeOS home',
                    'Life Coach (24/7)',
                    `${fmtPrice(basicPlan.includedCreditsCents)} AI credits/mo`,
                  ]}
                  onClick={() => handleSelectDeploymentPlan('basic')}
                />
              )}
              {standardPlan && (
                <PlanCard
                  name="Standard"
                  price={`${displayPrice(standardPlan)}/mo`}
                  billedAnnually={isAnnual}
                  features={[
                    'Full LifeOS home',
                    'Life Coach (24/7)',
                    `${fmtPrice(standardPlan.includedCreditsCents)} AI credits/mo`,
                    'Priority support',
                  ]}
                  popular
                  onClick={() => handleSelectDeploymentPlan('standard')}
                />
              )}
              {premiumPlan && (
                <PlanCard
                  name="Premium"
                  price={`${displayPrice(premiumPlan)}/mo`}
                  billedAnnually={isAnnual}
                  features={[
                    'Full LifeOS home',
                    'Life Coach (24/7)',
                    `${fmtPrice(premiumPlan.includedCreditsCents)} AI credits/mo`,
                    'Priority support',
                    'Early access to features',
                  ]}
                  onClick={() => handleSelectDeploymentPlan('premium')}
                />
              )}
            </div>

            <div className="mt-10 flex flex-col items-center gap-3">
              <button
                onClick={() => setPlanView('dashboard')}
                className="text-xs text-text-muted/50 hover:text-text-muted transition-colors duration-200"
              >
                Already have an AI assistant and only want the LifeOS home?
              </button>
              <button
                onClick={() => setPlanView('byok')}
                className="text-xs text-text-muted/50 hover:text-text-muted transition-colors duration-200"
              >
                Want to bring your own Anthropic API key instead?
              </button>
            </div>
          </div>
        )}

        {/* Dashboard plan */}
        {planView === 'dashboard' && (
          <div className="mt-10 w-full max-w-xs mx-auto animate-fade-in flex flex-col items-center">
            {dashboardPlan && (
              <PlanCard
                name="Home Only"
                price={`${displayPrice(dashboardPlan)}/mo`}
                billedAnnually={isAnnual}
                features={[
                  'Full LifeOS home',
                  'All persona presets & themes',
                  'CLI access',
                ]}
                loading={checkoutLoading === 'dashboard'}
                onClick={() => handleSelectDashboardPlan(dashboardPlan)}
              />
            )}
            <button
              onClick={() => setPlanView('main')}
              className="mt-6 text-xs text-text-muted/50 hover:text-text-muted transition-colors"
            >
              &larr; See all plans
            </button>
          </div>
        )}

        {/* BYOK plan */}
        {planView === 'byok' && (
          <div className="mt-10 w-full max-w-xs mx-auto animate-fade-in flex flex-col items-center">
            {byokPlan && (
              <PlanCard
                name="BYOK"
                price={`${displayPrice(byokPlan)}/mo`}
                billedAnnually={isAnnual}
                features={[
                  'Full LifeOS home',
                  'Life Coach (24/7)',
                  'Bring your own API keys',
                  'No markup on AI costs',
                ]}
                onClick={() => handleSelectDeploymentPlan('byok')}
              />
            )}
            <button
              onClick={() => setPlanView('main')}
              className="mt-6 text-xs text-text-muted/50 hover:text-text-muted transition-colors"
            >
              &larr; See all plans
            </button>
          </div>
        )}
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
