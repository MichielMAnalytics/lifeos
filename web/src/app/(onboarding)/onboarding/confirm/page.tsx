'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { StepContainer } from '@/components/onboarding/step-container';
import { LoadingScreen } from '@/components/loading-screen';
import { getOnboardingState, setOnboardingState, clearOnboardingState, clearPrefs, getPrefBilling, onboardingPath } from '@/lib/onboarding-store';

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

export default function ConfirmPage() {
  const router = useRouter();
  const plans = useQuery(api.stripe.getSubscriptionPlansList);
  const createCheckout = useAction(api.stripeCheckout.createSubscriptionCheckout);
  const saveSettings = useMutation(api.deploymentSettings.saveSettings);
  const setPendingDeploy = useMutation(api.deploymentSettings.setPendingDeploy);

  const [selectedPlanType, setSelectedPlanType] = useState<string>('standard');
  const [annual, setAnnual] = useState(() => getPrefBilling() === 'annual');
  const [loading, setLoading] = useState(false);
  const isByok = selectedPlanType === 'byok';

  useEffect(() => {
    const state = getOnboardingState();
    if (state.selectedPlanType) {
      setSelectedPlanType(state.selectedPlanType);
    }
  }, []);

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

  async function handleCheckout() {
    const plan = getPlan(selectedPlanType);
    if (!plan?.priceId) return;

    setLoading(true);
    try {
      const state = getOnboardingState();
      const isByok = selectedPlanType === 'byok';
      await saveSettings({
        apiKeySource: isByok ? 'byok' : 'ours',
        selectedModel: 'claude-sonnet',
        anthropicAuthMethod: isByok ? state.anthropicAuthMethod : undefined,
        ...(isByok && state.anthropicAuthMethod === 'api_key' && state.anthropicApiKey.trim()
          ? { anthropicKey: state.anthropicApiKey.trim() }
          : {}),
        ...(isByok && state.anthropicAuthMethod === 'setup_token' && state.anthropicSetupToken.trim()
          ? { anthropicSetupToken: state.anthropicSetupToken.trim() }
          : {}),
        telegramBotToken: state.telegramToken.trim() || undefined,
        discordBotToken: state.discordToken.trim() || undefined,
      });
      await setPendingDeploy({ pending: true });

      clearPrefs();
      clearOnboardingState();
      const result = await createCheckout({ priceId: resolvePrice(plan) });
      if (result.url) window.location.href = result.url;
    } catch (err) {
      console.error('Checkout error:', err);
      setLoading(false);
    }
  }

  if (plans === undefined) return <LoadingScreen />;

  const tiers = ['basic', 'standard', 'premium'] as const;
  const active = Math.max(0, tiers.indexOf(selectedPlanType as typeof tiers[number]));

  const tierMeta = [
    { key: 'basic' as const, label: 'Light', desc: 'A few check-ins a week' },
    { key: 'standard' as const, label: 'Regular', desc: 'Daily planning & reflection' },
    { key: 'premium' as const, label: 'All-in', desc: 'Your always-on partner' },
  ];

  const currentPlan = isByok ? getPlan('byok') : getPlan(tierMeta[active].key);
  if (!currentPlan) return <LoadingScreen />;

  const selectTier = (idx: number) => {
    const pt = tiers[idx];
    setSelectedPlanType(pt);
    setOnboardingState({ selectedPlanType: pt });
  };

  const toggleAnnual = () => {
    const next = !annual;
    setAnnual(next);
    if (typeof window !== 'undefined') {
      if (next) sessionStorage.setItem('pref_billing', 'annual');
      else sessionStorage.removeItem('pref_billing');
    }
  };

  const ctaButton = (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className="mt-8 w-full rounded-full bg-accent px-8 py-3.5 text-sm font-medium text-bg transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 active:scale-[0.97] disabled:opacity-60"
    >
      {loading ? (
        <span className="flex items-center justify-center gap-1">
          Setting up
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
  );

  // ── BYOK: simple single-plan confirm ──
  if (isByok) {
    return (
      <StepContainer onBack={() => router.push(onboardingPath('/onboarding/channels'))}>
        <div className="flex flex-col items-center text-center max-w-[360px] w-full animate-fade-in">
          <h1 className="text-3xl font-light tracking-tight text-text sm:text-4xl">
            Bring your own key
          </h1>
          <p className="mt-3 text-sm text-text-muted/60">
            Connect your own Anthropic account for AI.
            <br />
            This covers your LifeOS home, Life Coach hosting, and all updates.
          </p>

          <div className="mt-8 flex flex-col items-center">
            <div className="flex items-baseline gap-3">
              <span className="text-sm text-text-muted/40 line-through">{displayPrice(currentPlan)}/mo</span>
              <span className="text-4xl font-semibold tracking-tight text-text">{'\u20AC'}0</span>
              <span className="text-sm text-text-muted/50">/mo</span>
            </div>
            <p className="mt-1 text-xs text-text-muted/50">AI costs go straight to your Anthropic account — no markup</p>
            <button onClick={toggleAnnual} className="mt-3 text-xs text-text-muted/40 hover:text-text-muted transition-colors">
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

          {ctaButton}

          <p className="mt-3 text-[11px] text-text-muted/30">7 days free. Cancel anytime.</p>
        </div>
      </StepContainer>
    );
  }

  // ── Regular plans: tier selector ──
  return (
    <StepContainer onBack={() => router.push(onboardingPath('/onboarding/channels'))}>
      <div className="flex flex-col items-center text-center max-w-[360px] w-full animate-fade-in">
        <h1 className="text-3xl font-light tracking-tight text-text sm:text-4xl">
          Choose your pace
        </h1>
        <p className="mt-3 text-sm text-text-muted/60">
          You can change this anytime.
        </p>

        {/* Segmented control */}
        <div className="mt-10 w-full rounded-xl bg-text/[0.04] p-1 flex gap-1">
          {tierMeta.map((t, i) => (
            <button
              key={t.key}
              onClick={() => selectTier(i)}
              className={`flex-1 rounded-lg py-3 px-2 transition-all duration-200 ${
                i === active
                  ? 'bg-bg shadow-sm shadow-black/5'
                  : 'hover:bg-bg/50'
              }`}
            >
              <span className={`block text-sm font-medium transition-colors ${i === active ? 'text-text' : 'text-text-muted/50'}`}>
                {t.label}
              </span>
              <span className={`block text-[10px] mt-0.5 transition-colors ${i === active ? 'text-text-muted/60' : 'text-text-muted/30'}`}>
                {t.desc}
              </span>
            </button>
          ))}
        </div>

        {/* Price + billing */}
        <div className="mt-8 flex flex-col items-center">
          <div className="flex items-baseline gap-3">
            <span className="text-sm text-text-muted/40 line-through">{displayPrice(currentPlan)}/mo</span>
            <span className="text-4xl font-semibold tracking-tight text-text">{'\u20AC'}0</span>
            <span className="text-sm text-text-muted/50">/mo</span>
          </div>
          {currentPlan.includedCreditsCents > 0 && (
            <p className="mt-1 text-xs text-text-muted/50">
              includes {fmtPrice(currentPlan.includedCreditsCents)} AI credits
            </p>
          )}
          <button onClick={toggleAnnual} className="mt-3 text-xs text-text-muted/40 hover:text-text-muted transition-colors">
            {annual ? 'Billed annually' : 'Switch to annual'}{' '}
            {!annual && <span className="text-green-500 font-medium">save 20%</span>}
          </button>
        </div>

        {/* Trust signal */}
        <p className="mt-8 text-[11px] text-text-muted/30 flex items-center gap-1.5">
          <span className="flex -space-x-1.5">
            {['M', 'S', 'A', 'K'].map((letter, i) => (
              <span
                key={i}
                className="w-5 h-5 rounded-full bg-text/[0.06] border-2 border-bg flex items-center justify-center text-[8px] font-medium text-text-muted/40"
              >
                {letter}
              </span>
            ))}
          </span>
          Joined by 500+ people taking control of their days
        </p>

        {ctaButton}

        <p className="mt-3 text-[11px] text-text-muted/30">7 days free. Cancel anytime.</p>
      </div>
    </StepContainer>
  );
}
