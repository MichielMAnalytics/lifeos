'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { useSearchParams } from 'next/navigation';
import { LoadingScreen } from '@/components/loading-screen';

// ── Types ──────────────────────────────────────────────────────────────

type Step = 'welcome' | 'plans' | 'byok-key' | 'channels' | 'setup';
type PlanView = 'main' | 'dashboard' | 'byok';

interface Plan {
  priceId: string;
  planType: string;
  priceEuroCents: number;
  includedCreditsCents: number;
  label: string;
  includesDeployment: boolean;
}

// ── Subtle background ──────────────────────────────────────────────────

function SoftGlow() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.03]"
        style={{ background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)' }}
      />
    </div>
  );
}

// ── Step indicator dots ────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-500 ${
            i === current
              ? 'w-6 bg-accent'
              : i < current
                ? 'w-1.5 bg-text-muted/40'
                : 'w-1.5 bg-border'
          }`}
        />
      ))}
    </div>
  );
}

// ── Nav arrow ──────────────────────────────────────────────────────────

function NavArrow({ direction, onClick, label }: { direction: 'back' | 'forward'; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2 text-xs text-text-muted hover:text-text transition-all duration-200"
    >
      {direction === 'back' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-0.5">
          <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
        </svg>
      )}
      <span>{label}</span>
      {direction === 'forward' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
          <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
}

// ── Step wrapper for crossfade ─────────────────────────────────────────

function StepContainer({ active, children, onBack }: { active: boolean; children: React.ReactNode; onBack?: () => void }) {
  return (
    <>
      {active && onBack && (
        <div className="fixed top-6 left-6 z-50">
          <NavArrow direction="back" onClick={onBack} label="Back" />
        </div>
      )}
      <div
        className={`absolute inset-0 overflow-y-auto transition-all duration-700 ease-out ${
          active
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-6 pointer-events-none'
        }`}
      >
        <div className="min-h-full flex flex-col items-center justify-center px-6 py-16">
          {children}
        </div>
      </div>
    </>
  );
}

// ── Feature pill ───────────────────────────────────────────────────────

function FeaturePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-surface/50 px-3 py-1 text-[11px] text-text-muted">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-success">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      {children}
    </span>
  );
}

// ── Plan Card ──────────────────────────────────────────────────────────

function PlanCard({
  name,
  price,
  features,
  popular,
  loading,
  onClick,
}: {
  name: string;
  price: string;
  features: string[];
  popular?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`group relative flex flex-col rounded-2xl border p-6 text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
        popular
          ? 'border-accent/40 bg-accent/[0.04]'
          : 'border-border/60 bg-surface/30 hover:border-text-muted/20'
      } ${loading ? 'opacity-60 pointer-events-none' : ''}`}
    >
      {popular && (
        <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-1 text-[10px] font-medium text-bg tracking-wide">
          Recommended
        </span>
      )}
      <span className="text-sm font-medium text-text-muted">{name}</span>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="text-3xl font-semibold tracking-tight text-text">
          {'\u20AC'}0/mo
        </span>
        <span className="text-sm text-text-muted/40 line-through">
          {price}
        </span>
      </div>
      <div className="mt-4 space-y-2">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-2 text-xs text-text-muted leading-relaxed">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-success/70">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {f}
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-center rounded-lg bg-accent/10 py-2 text-xs font-medium text-accent transition-colors group-hover:bg-accent group-hover:text-bg">
        {loading ? (
          <span className="flex items-center gap-1">
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
      </div>
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────

export function OnboardingFlow() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <OnboardingFlowInner />
    </Suspense>
  );
}

function OnboardingFlowInner() {
  const searchParams = useSearchParams();
  const subscription = useQuery(api.stripe.getMySubscription);
  const deployment = useQuery(api.deploymentQueries.getMyDeployment);
  const settings = useQuery(api.deploymentSettings.getMySettings);
  const plans = useQuery(api.stripe.getSubscriptionPlansList);

  const createCheckout = useAction(api.stripeCheckout.createSubscriptionCheckout);
  const saveSettings = useMutation(api.deploymentSettings.saveSettings);
  const setPendingDeploy = useMutation(api.deploymentSettings.setPendingDeploy);
  const deployAction = useAction(api.deploymentActions.deploy);

  const [step, setStep] = useState<Step>('welcome');
  const [planView, setPlanView] = useState<PlanView>('main');
  const [selectedPlanType, setSelectedPlanType] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [anthropicAuthMethod, setAnthropicAuthMethod] = useState<'api_key' | 'setup_token'>('api_key');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [anthropicSetupToken, setAnthropicSetupToken] = useState('');
  const [telegramToken, setTelegramToken] = useState('');
  const [discordToken, setDiscordToken] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [deployComplete, setDeployComplete] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const autoDeployTriggered = useRef(false);

  // Determine whether the selected plan is a deployment plan (includes Life Coach)
  const isDeploymentPlan = (planType: string | null | undefined) =>
    planType === 'basic' || planType === 'standard' || planType === 'premium' || planType === 'byok';

  // ── After Stripe redirect: auto-deploy for deployment plans ──────
  useEffect(() => {
    if (autoDeployTriggered.current) return;
    const isSuccess = searchParams.get('subscription') === 'success';
    if (!isSuccess || !subscription || deployment) return;

    if (subscription.planType === 'dashboard') {
      // Dashboard plan: show CLI setup
      setStep('setup');
      return;
    }

    if (isDeploymentPlan(subscription.planType) && settings?.pendingDeploy) {
      // Settings were saved before checkout; auto-deploy now
      autoDeployTriggered.current = true;
      setStep('setup');
      setDeploying(true);
      deployAction().catch((err) => {
        console.error('Auto-deploy error:', err);
        setDeploying(false);
      });
    }
  }, [searchParams, subscription, deployment, settings, deployAction]);

  // ── Track deployment status ──────────────────────────────────────
  useEffect(() => {
    if (deploying && deployment && deployment.status === 'running') {
      setDeploying(false);
      setDeployComplete(true);
    }
  }, [deploying, deployment]);

  const getPlan = useCallback(
    (planType: string): Plan | undefined => plans?.find((p) => p.planType === planType),
    [plans],
  );

  const fmtPrice = (cents: number) => `\u20AC${(cents / 100).toFixed(0)}`;

  // ── Plan selection handlers ──────────────────────────────────────
  // Dashboard plan goes straight to Stripe (no channels/BYOK steps)
  function handleSelectDashboardPlan(plan: Plan) {
    if (!plan.priceId) return;
    setCheckoutLoading(plan.planType);
    (async () => {
      try {
        const result = await createCheckout({ priceId: plan.priceId });
        if (result.url) window.location.href = result.url;
      } catch (err) {
        console.error('Checkout error:', err);
        setCheckoutLoading(null);
      }
    })();
  }

  // Deployment plans: remember the selected plan and advance to next step
  function handleSelectDeploymentPlan(planType: string) {
    setSelectedPlanType(planType);
    if (planType === 'byok') {
      setStep('byok-key');
    } else {
      setStep('channels');
    }
  }

  // ── Save settings + go to Stripe ─────────────────────────────────
  async function handleProceedToCheckout() {
    const plan = selectedPlanType ? getPlan(selectedPlanType) : undefined;
    if (!plan?.priceId) return;

    setSavingSettings(true);
    try {
      // Save settings to Convex BEFORE redirecting to Stripe
      const isByok = selectedPlanType === 'byok';
      await saveSettings({
        apiKeySource: isByok ? 'byok' : 'ours',
        selectedModel: 'claude-sonnet',
        anthropicAuthMethod: isByok ? anthropicAuthMethod : undefined,
        ...(isByok && anthropicAuthMethod === 'api_key' && anthropicApiKey.trim()
          ? { anthropicKey: anthropicApiKey.trim() }
          : {}),
        ...(isByok && anthropicAuthMethod === 'setup_token' && anthropicSetupToken.trim()
          ? { anthropicSetupToken: anthropicSetupToken.trim() }
          : {}),
        telegramBotToken: telegramToken.trim() || undefined,
        discordBotToken: discordToken.trim() || undefined,
      });
      await setPendingDeploy({ pending: true });

      // Redirect to Stripe checkout
      const result = await createCheckout({ priceId: plan.priceId });
      if (result.url) window.location.href = result.url;
    } catch (err) {
      console.error('Checkout error:', err);
      setSavingSettings(false);
    }
  }

  if (subscription === undefined || deployment === undefined || plans === undefined || settings === undefined) {
    return <LoadingScreen />;
  }

  const basicPlan = getPlan('basic');
  const standardPlan = getPlan('standard');
  const premiumPlan = getPlan('premium');
  const dashboardPlan = getPlan('dashboard');
  const byokPlan = getPlan('byok');

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-bg">
      <SoftGlow />

      {/* ═══ Step 1: Welcome ═══════════════════════════════════════════ */}
      <StepContainer active={step === 'welcome'}>
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
            onClick={() => setStep('plans')}
            className="mt-12 rounded-full bg-accent px-10 py-3.5 text-sm font-medium text-bg transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 active:scale-[0.97]"
          >
            Begin your journey
          </button>
        </div>
      </StepContainer>

      {/* ═══ Step 2: Plans ═════════════════════════════════════════════ */}
      <StepContainer active={step === 'plans'} onBack={() => setStep('welcome')}>
        <div className="flex flex-col items-center text-center w-full max-w-2xl">
          <h1 className="text-3xl font-light tracking-tight text-text sm:text-4xl">
            Try LifeOS <span className="font-semibold">free for 7 days</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-text-muted/70 max-w-md">
            We believe everyone deserves to feel in control.
            Pick what fits — you won&apos;t be charged until your trial ends.
          </p>

          {/* Main plans */}
          {planView === 'main' && (
            <div className="mt-10 w-full animate-fade-in">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {basicPlan && (
                  <PlanCard
                    name="Basic"
                    price={`${fmtPrice(basicPlan.priceEuroCents)}/mo`}
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
                    price={`${fmtPrice(standardPlan.priceEuroCents)}/mo`}
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
                    price={`${fmtPrice(premiumPlan.priceEuroCents)}/mo`}
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
                  onClick={() => { setSelectedPlanType('byok'); setStep('byok-key'); }}
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
                  price={`${fmtPrice(dashboardPlan.priceEuroCents)}/mo`}
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

        </div>
      </StepContainer>

      {/* ═══ Step 3: BYOK API Key (only for BYOK plan) ═════════════════ */}
      <StepContainer active={step === 'byok-key'} onBack={() => { setStep('plans'); setPlanView('main'); }}>
        <div className="flex flex-col items-center text-center w-full max-w-lg">
          <h1 className="text-3xl font-light tracking-tight text-text sm:text-4xl">
            Your <span className="font-semibold">Anthropic credentials</span>
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-text-muted/70 max-w-sm">
            Your Life Coach is powered by Claude. Connect your Anthropic account
            and you&apos;ll only pay for what you use — no credit limits.
          </p>

          <div className="mt-8 w-full max-w-md">
            {/* Tab toggle */}
            <div className="flex rounded-lg overflow-hidden border border-border/60 mb-5">
              <button
                onClick={() => setAnthropicAuthMethod('api_key')}
                className={`flex-1 py-2.5 text-[10px] uppercase tracking-wider font-medium transition-colors ${
                  anthropicAuthMethod === 'api_key'
                    ? 'bg-text text-bg'
                    : 'bg-transparent text-text-muted hover:text-text'
                }`}
              >
                API Key
              </button>
              <button
                onClick={() => setAnthropicAuthMethod('setup_token')}
                className={`flex-1 py-2.5 text-[10px] uppercase tracking-wider font-medium transition-colors ${
                  anthropicAuthMethod === 'setup_token'
                    ? 'bg-text text-bg'
                    : 'bg-transparent text-text-muted hover:text-text'
                }`}
              >
                Claude Subscription
              </button>
            </div>

            {anthropicAuthMethod === 'api_key' ? (
              <div className="text-left">
                <input
                  type="password"
                  value={anthropicApiKey}
                  onChange={(e) => setAnthropicApiKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  autoComplete="off"
                  className="w-full rounded-xl border border-border/60 bg-surface/30 px-4 py-3 text-sm text-text font-mono placeholder:text-text-muted/25 focus:border-accent/50 focus:outline-none transition-colors"
                />
                <p className="mt-2 text-[11px] text-text-muted/40">
                  Get your key at{' '}
                  <a
                    href="https://console.anthropic.com/settings/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-muted/60 underline underline-offset-2 hover:text-text-muted"
                  >
                    console.anthropic.com
                  </a>
                  . Your key is encrypted and never stored in plain text.
                </p>
              </div>
            ) : (
              <div className="text-left">
                <input
                  type="password"
                  value={anthropicSetupToken}
                  onChange={(e) => setAnthropicSetupToken(e.target.value)}
                  placeholder="Paste setup token..."
                  autoComplete="off"
                  className="w-full rounded-xl border border-border/60 bg-surface/30 px-4 py-3 text-sm text-text font-mono placeholder:text-text-muted/25 focus:border-accent/50 focus:outline-none transition-colors"
                />
                <p className="mt-2 text-[11px] text-text-muted/40">
                  Run{' '}
                  <code className="px-1.5 py-0.5 rounded bg-surface text-text-muted/70 text-[10px]">claude setup-token</code>
                  {' '}in your terminal, then paste the token above.
                </p>
              </div>
            )}
          </div>

          <div className="mt-10 flex flex-col items-center gap-4">
            <button
              onClick={() => setStep('channels')}
              disabled={
                anthropicAuthMethod === 'api_key'
                  ? !anthropicApiKey.trim().startsWith('sk-ant-')
                  : !anthropicSetupToken.trim()
              }
              className="w-full max-w-md rounded-full bg-accent px-8 py-3.5 text-sm font-medium text-bg transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 active:scale-[0.97] disabled:opacity-30 disabled:pointer-events-none"
            >
              Continue
            </button>
          </div>
        </div>
      </StepContainer>

      {/* ═══ Step 4: Channels (Telegram/Discord) ═══════════════════════ */}
      <StepContainer
        active={step === 'channels'}
        onBack={() => setStep(selectedPlanType === 'byok' ? 'byok-key' : 'plans')}
      >
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
                onChange={(e) => setTelegramToken(e.target.value)}
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
                onChange={(e) => setDiscordToken(e.target.value)}
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
              onClick={() => {
                // Skip channels but still save settings + proceed to checkout
                setTelegramToken('');
                setDiscordToken('');
                handleProceedToCheckout();
              }}
              disabled={savingSettings}
              className="text-xs text-text-muted/40 hover:text-text-muted transition-colors duration-200"
            >
              Skip — I&apos;ll add these later
            </button>
          </div>
        </div>
      </StepContainer>

      {/* ═══ Step 5: Setup (post-checkout) ═════════════════════════════ */}
      <StepContainer active={step === 'setup'}>
        <div className="flex flex-col items-center text-center w-full max-w-lg">
          {subscription?.planType === 'dashboard' ? (
            /* ── Home plan: CLI + AI assistant setup ─────────── */
            <HomeSetupStep />
          ) : deploying ? (
            <div className="flex flex-col items-center">
              <div className="relative h-16 w-16 mb-8">
                <div className="absolute inset-0 rounded-full border border-border/30" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
                <img src="/openclaw-icon.png" alt="" className="absolute inset-0 m-auto h-7 w-7 rounded-sm" />
              </div>
              <h1 className="text-2xl font-light tracking-tight text-text">
                Setting up your <span className="font-semibold">Life Coach</span>
              </h1>
              <p className="mt-3 text-sm text-text-muted/60">
                This usually takes a couple of minutes.
              </p>
              <p className="mt-2 text-xs text-text-muted/40">
                {deployment?.status === 'provisioning'
                  ? 'Creating your environment...'
                  : deployment?.status === 'starting'
                    ? 'Installing tools and starting up...'
                    : 'Setting up your Life Coach...'}
              </p>
            </div>
          ) : deployComplete ? (
            <div className="flex flex-col items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mb-8">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-light tracking-tight text-text">
                Your Life Coach is <span className="font-semibold">live</span>
              </h1>
              <p className="mt-3 text-sm text-text-muted/60">
                Say hello — your Life Coach is ready to help you get organized.
              </p>
              <button
                onClick={() => { localStorage.setItem('lifeos-setup-complete', 'true'); window.location.href = '/life-coach'; }}
                className="mt-8 rounded-full bg-accent px-8 py-3 text-sm font-medium text-bg transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 active:scale-[0.97]"
              >
                Meet your Life Coach
              </button>
            </div>
          ) : (
            /* Fallback: subscription exists but no deployment yet, manual deploy */
            <div className="flex flex-col items-center">
              <div className="mb-8">
                <span className="inline-flex items-center gap-2 rounded-full border border-success/20 bg-success/5 px-4 py-1.5 text-xs text-success">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  7-day free trial started
                </span>
              </div>

              <h1 className="text-3xl font-light tracking-tight text-text sm:text-4xl">
                Welcome to <span className="font-semibold">LifeOS</span>
              </h1>

              <p className="mt-4 text-sm leading-relaxed text-text-muted/70 max-w-sm">
                Your subscription is active. Let&apos;s deploy your Life Coach.
              </p>

              <button
                onClick={() => {
                  setDeploying(true);
                  deployAction().catch((err) => {
                    console.error('Deploy error:', err);
                    setDeploying(false);
                  });
                }}
                className="mt-8 rounded-full bg-accent px-10 py-3.5 text-sm font-medium text-bg transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 active:scale-[0.97]"
              >
                Deploy my Life Coach
              </button>
            </div>
          )}
        </div>
      </StepContainer>
    </div>
  );
}

// ── Home plan setup: CLI + AI assistant ────────────────────────────

function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre className="rounded-xl border border-border/40 bg-surface/40 px-5 py-4 text-[13px] font-mono text-text/80 overflow-x-auto leading-relaxed">
        {children}
      </pre>
      <button
        onClick={() => { navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-text-muted/50 hover:text-text-muted bg-surface/80 border border-border/40 rounded-md px-2 py-1"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/40 text-xs font-medium text-text-muted/60">
      {n}
    </span>
  );
}

function FixedBackButton({ onClick }: { onClick: () => void }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed top-6 left-6 z-50">
      <NavArrow direction="back" onClick={onClick} label="Back" />
    </div>,
    document.body,
  );
}

function HomeSetupStep() {
  const [setupStep, setSetupStep] = useState(0);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);
  const user = useQuery(api.authHelpers.getMe, {});
  const existingKeys = useQuery(api.authHelpers.listApiKeys, {});
  const generateKey = useAction(api.apiKeyAuth.createApiKey);
  const hasExistingKey = existingKeys && existingKeys.length > 0;

  async function handleGenerateKey() {
    if (!user?._id || generatingKey || apiKey) return;
    setGeneratingKey(true);
    try {
      const result = await generateKey({ userId: user._id, name: 'CLI' });
      setApiKey(result.key);
    } catch (err) {
      console.error('Failed to generate API key:', err);
    } finally {
      setGeneratingKey(false);
    }
  }

  return (
    <div className="flex flex-col items-center w-full">
      {setupStep === 0 && (
        <div className="flex flex-col items-center text-center animate-fade-in">
          <div className="mb-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-success/20 bg-success/5 px-4 py-1.5 text-xs text-success">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              7-day free trial started
            </span>
          </div>

          <h1 className="text-3xl font-light tracking-tight text-text sm:text-4xl">
            Welcome to <span className="font-semibold">LifeOS</span>
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-text-muted/70 max-w-sm">
            Let&apos;s connect LifeOS with your AI assistant.
            It only takes a minute.
          </p>

          <button
            onClick={() => setSetupStep(1)}
            className="mt-10 rounded-full bg-accent px-10 py-3.5 text-sm font-medium text-bg transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 active:scale-[0.97]"
          >
            Let&apos;s set it up
          </button>

          <button
            onClick={() => { localStorage.setItem('lifeos-setup-complete', 'true'); window.location.href = '/today'; }}
            className="mt-4 text-xs text-text-muted/40 hover:text-text-muted transition-colors duration-200"
          >
            Skip — I&apos;ll do this later
          </button>
        </div>
      )}

      {setupStep === 1 && (
        <div className="flex flex-col items-center text-center w-full animate-fade-in">
          <FixedBackButton onClick={() => setSetupStep(0)} />
          <h1 className="text-2xl font-light tracking-tight text-text">
            Install the <span className="font-semibold">LifeOS CLI</span>
          </h1>

          <p className="mt-3 text-sm text-text-muted/60 max-w-sm">
            The CLI lets you capture tasks, ideas, and journal entries from your terminal
            — and connects your AI assistant to LifeOS.
          </p>

          <div className="mt-10 w-full max-w-md space-y-6 text-left">
            <div className="flex gap-4">
              <StepNumber n={1} />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-text">Install globally</p>
                <CodeBlock>npm install -g lifeos-cli</CodeBlock>
              </div>
            </div>

            <div className="flex gap-4">
              <StepNumber n={2} />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-text">Set your API URL</p>
                <CodeBlock>lifeos config set-url https://proper-cormorant-28.eu-west-1.convex.site</CodeBlock>
              </div>
            </div>

            <div className="flex gap-4">
              <StepNumber n={3} />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-text">Authenticate with your API key</p>
                {apiKey ? (
                  <CodeBlock>{`lifeos config set-key ${apiKey}`}</CodeBlock>
                ) : (
                  <>
                    <button
                      onClick={handleGenerateKey}
                      disabled={generatingKey || !user}
                      className="rounded-lg border border-border/60 bg-surface/30 px-4 py-2.5 text-sm text-text hover:bg-surface-hover transition-colors disabled:opacity-40"
                    >
                      {generatingKey ? 'Generating...' : 'Generate API Key'}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <StepNumber n={4} />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-text">Verify it works</p>
                <CodeBlock>lifeos whoami</CodeBlock>
              </div>
            </div>
          </div>

          <div className="mt-10 flex items-center gap-6">
            <button
              onClick={() => setSetupStep(0)}
              className="text-xs text-text-muted/40 hover:text-text-muted transition-colors"
            >
              &larr; Back
            </button>
            <button
              onClick={() => setSetupStep(2)}
              className="rounded-full bg-accent px-8 py-3 text-sm font-medium text-bg transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 active:scale-[0.97]"
            >
              Next: Connect your assistant
            </button>
          </div>
        </div>
      )}

      {setupStep === 2 && (
        <div className="flex flex-col items-center text-center w-full animate-fade-in">
          <FixedBackButton onClick={() => setSetupStep(1)} />
          <h1 className="text-2xl font-light tracking-tight text-text">
            Connect your <span className="font-semibold">assistant</span>
          </h1>

          <p className="mt-3 text-sm text-text-muted/60 max-w-sm">
            The LifeOS skill was installed with the CLI. Open your coding agent and run:
          </p>

          <div className="mt-8 w-full max-w-md text-left space-y-6">
            <CodeBlock>/lifeos-init</CodeBlock>

            <p className="text-xs text-text-muted/50 text-center">
              Your assistant will walk you through connecting to your LifeOS data,
              setting up routines, and creating your first goals.
            </p>

            {!apiKey && (
              <p className="text-[11px] text-text-muted/30 text-center">
                Tip: generate your API key in the previous step — your assistant will need it.
              </p>
            )}
          </div>

          <div className="mt-10">
            <button
              onClick={() => { localStorage.setItem('lifeos-setup-complete', 'true'); window.location.href = '/today'; }}
              className="rounded-full bg-accent px-8 py-3 text-sm font-medium text-bg transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 active:scale-[0.97]"
            >
              Enter LifeOS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Assistant connection step with multi-assistant support ─────────────

type AssistantType = 'openclaw' | 'claude-code' | 'claude' | 'chatgpt' | 'codex';

const ASSISTANTS: { id: AssistantType; name: string; icon: string }[] = [
  { id: 'openclaw', name: 'OpenClaw', icon: '/openclaw-icon.png' },
  { id: 'claude-code', name: 'Claude Code', icon: '/claude-icon.png' },
  { id: 'claude', name: 'Claude', icon: '/claude-icon.png' },
  { id: 'chatgpt', name: 'ChatGPT', icon: '/openai-icon.png' },
  { id: 'codex', name: 'Codex', icon: '/openai-icon.png' },
];

function AssistantInstructions({ type, apiKey }: { type: AssistantType; apiKey: string | null }) {
  const key = apiKey ?? 'YOUR_API_KEY';

  switch (type) {
    case 'openclaw':
      return (
        <div className="space-y-4">
          <CodeBlock>openclaw skill install lifeos</CodeBlock>
          <p className="text-xs text-text-muted/50">Then set your API key:</p>
          <CodeBlock>{`openclaw config set skills.lifeos.apiKey ${key}`}</CodeBlock>
        </div>
      );

    case 'claude-code':
      return (
        <div className="space-y-4">
          <p className="text-xs text-text-muted/50">Add the LifeOS MCP server:</p>
          <CodeBlock>{`claude mcp add lifeos -- npx lifeos-mcp --api-key ${key}`}</CodeBlock>
        </div>
      );

    case 'claude':
      return (
        <div className="space-y-4">
          <p className="text-xs text-text-muted/50">
            Go to <span className="text-text/60">Settings &rarr; Integrations &rarr; Add MCP Server</span>
          </p>
          <CodeBlock>{`Server URL: https://mcp.lifeos.zone
API Key: ${key}`}</CodeBlock>
        </div>
      );

    case 'chatgpt':
      return (
        <div className="space-y-4">
          <p className="text-xs text-text-muted/50">
            Go to <span className="text-text/60">Settings &rarr; Developer Mode &rarr; Add MCP Server</span>
          </p>
          <CodeBlock>{`Server URL: https://mcp.lifeos.zone
Authentication: Bearer ${key}`}</CodeBlock>
          <p className="text-[10px] text-text-muted/30">
            Requires ChatGPT Pro, Team, Enterprise, or Edu.
          </p>
        </div>
      );

    case 'codex':
      return (
        <div className="space-y-4">
          <p className="text-xs text-text-muted/50">Configure via the Codex CLI:</p>
          <CodeBlock>{`codex mcp add lifeos --url https://mcp.lifeos.zone --api-key ${key}`}</CodeBlock>
        </div>
      );
  }
}

function AssistantConnectStep({ apiKey, onDone }: { apiKey: string | null; onDone: () => void }) {
  const [selected, setSelected] = useState<Set<AssistantType>>(new Set());

  function toggleAssistant(id: AssistantType) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <h1 className="text-2xl font-light tracking-tight text-text">
        Connect your <span className="font-semibold">assistant</span>
      </h1>

      <p className="mt-3 text-sm text-text-muted/60 max-w-sm">
        Let your AI assistant read and write to your LifeOS data.
        Select the one(s) you use.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {ASSISTANTS.map((a) => (
          <button
            key={a.id}
            onClick={() => toggleAssistant(a.id)}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all duration-200 ${
              selected.has(a.id)
                ? 'border-accent/50 bg-accent/5 text-text'
                : 'border-border/40 text-text-muted/60 hover:border-border hover:text-text-muted'
            }`}
          >
            <img src={a.icon} alt="" className="size-4 rounded-sm" />
            {a.name}
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="mt-8 w-full max-w-lg space-y-8 text-left animate-fade-in">
          {Array.from(selected).map((id) => {
            const assistant = ASSISTANTS.find((a) => a.id === id)!;
            return (
              <div key={id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <img src={assistant.icon} alt="" className="size-4 rounded-sm" />
                  <p className="text-sm font-medium text-text">{assistant.name}</p>
                </div>
                <AssistantInstructions type={id} apiKey={apiKey} />
              </div>
            );
          })}

          <div className="pt-2">
            <p className="text-sm font-medium text-text mb-1">Try it out</p>
            <p className="text-xs text-text-muted/50">
              Ask your assistant: &quot;What are my tasks for today?&quot;
            </p>
          </div>
        </div>
      )}

      <div className="mt-10">
        <button
          onClick={onDone}
          className="rounded-full bg-accent px-8 py-3 text-sm font-medium text-bg transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 active:scale-[0.97]"
        >
          Enter LifeOS
        </button>
      </div>
    </>
  );
}
