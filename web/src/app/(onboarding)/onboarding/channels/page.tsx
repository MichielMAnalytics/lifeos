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

export default function ChannelsPage() {
  const router = useRouter();
  const plans = useQuery(api.stripe.getSubscriptionPlansList);
  const createCheckout = useAction(api.stripeCheckout.createSubscriptionCheckout);
  const saveSettings = useMutation(api.deploymentSettings.saveSettings);
  const setPendingDeploy = useMutation(api.deploymentSettings.setPendingDeploy);

  const [telegramToken, setTelegramToken] = useState('');
  const [discordToken, setDiscordToken] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [selectedPlanType, setSelectedPlanType] = useState<string | null>(null);

  // Hydrate from store on mount
  useEffect(() => {
    const state = getOnboardingState();
    setTelegramToken(state.telegramToken);
    setDiscordToken(state.discordToken);
    setSelectedPlanType(state.selectedPlanType);
  }, []);

  const getPlan = useCallback(
    (planType: string): Plan | undefined => plans?.find((p) => p.planType === planType),
    [plans],
  );

  const prefBilling = getPrefBilling();
  const isAnnual = prefBilling === 'annual';

  const resolvePrice = (plan: Plan) =>
    isAnnual && plan.annualPriceId ? plan.annualPriceId : plan.priceId;

  async function handleProceedToCheckout() {
    const state = getOnboardingState();
    const planType = state.selectedPlanType;
    const plan = planType ? getPlan(planType) : undefined;
    if (!plan?.priceId) return;

    setSavingSettings(true);
    try {
      const isByok = planType === 'byok';
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
        telegramBotToken: telegramToken.trim() || undefined,
        discordBotToken: discordToken.trim() || undefined,
      });
      await setPendingDeploy({ pending: true });

      clearPrefs();
      clearOnboardingState();
      const result = await createCheckout({ priceId: resolvePrice(plan) });
      if (result.url) window.location.href = result.url;
    } catch (err) {
      console.error('Checkout error:', err);
      setSavingSettings(false);
    }
  }

  function handleSkip() {
    setTelegramToken('');
    setDiscordToken('');
    // Save empty tokens and proceed to checkout
    setOnboardingState({ telegramToken: '', discordToken: '' });
    handleProceedToCheckout();
  }

  if (plans === undefined) return <LoadingScreen />;

  const backPath = selectedPlanType === 'byok' ? '/onboarding/byok-key' : '/onboarding/plans';

  return (
    <StepContainer onBack={() => router.push(onboardingPath(backPath))}>
      <div className="flex flex-col items-center text-center w-full max-w-lg">
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
              Create a bot via <span className="text-text-muted/60">@BotFather</span> on Telegram
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
            onClick={handleProceedToCheckout}
            disabled={savingSettings}
            className="w-full max-w-md rounded-full bg-accent px-8 py-3.5 text-sm font-medium text-bg transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 active:scale-[0.97] disabled:opacity-60"
          >
            {savingSettings ? (
              <span className="flex items-center justify-center gap-1">
                Saving
                <span className="inline-flex">
                  <span className="animate-bounce [animation-delay:0ms]">.</span>
                  <span className="animate-bounce [animation-delay:150ms]">.</span>
                  <span className="animate-bounce [animation-delay:300ms]">.</span>
                </span>
              </span>
            ) : (
              'Continue to checkout'
            )}
          </button>
          <button
            onClick={handleSkip}
            disabled={savingSettings}
            className="text-xs text-text-muted/40 hover:text-text-muted transition-colors duration-200"
          >
            Skip — I&apos;ll add these later
          </button>
        </div>
      </div>
    </StepContainer>
  );
}
