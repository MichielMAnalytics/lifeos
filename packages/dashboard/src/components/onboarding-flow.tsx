'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { useSearchParams } from 'next/navigation';

// ── Types ──────────────────────────────────────────────────────────────

type Step = 'welcome' | 'plans' | 'setup';

type PlanView = 'main' | 'dashboard' | 'byok';

interface Plan {
  priceId: string;
  planType: string;
  priceEuroCents: number;
  includedCreditsCents: number;
  label: string;
  includesDeployment: boolean;
}

// ── Icons (inline SVG) ─────────────────────────────────────────────────

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function LoadingDots() {
  return (
    <span className="inline-flex gap-1">
      <span className="animate-bounce [animation-delay:0ms]">.</span>
      <span className="animate-bounce [animation-delay:150ms]">.</span>
      <span className="animate-bounce [animation-delay:300ms]">.</span>
    </span>
  );
}

// ── Step wrapper for crossfade transitions ──────────────────────────────

function StepContainer({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out ${
        active
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}
    >
      <div className="w-full max-w-xl px-6">{children}</div>
    </div>
  );
}

// ── Plan Card ──────────────────────────────────────────────────────────

function PlanCard({
  name,
  price,
  description,
  popular,
  selected,
  loading,
  onClick,
}: {
  name: string;
  price: string;
  description: string;
  popular?: boolean;
  selected?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`relative flex flex-col items-start rounded-xl border p-6 text-left transition-all duration-200 ${
        selected
          ? 'border-accent bg-accent-glow'
          : 'border-border bg-surface hover:bg-surface-hover hover:border-text-muted/30'
      } ${loading ? 'opacity-60 pointer-events-none' : ''}`}
    >
      {popular && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-bg">
          Most popular
        </span>
      )}
      <span className="text-sm font-semibold text-text">{name}</span>
      <span className="mt-1 text-2xl font-bold tracking-tight text-text">
        {price}
      </span>
      <span className="mt-2 text-xs leading-relaxed text-text-muted">
        {description}
      </span>
      {loading && (
        <span className="mt-3 text-xs text-accent">
          Redirecting<LoadingDots />
        </span>
      )}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────

export function OnboardingFlow() {
  const searchParams = useSearchParams();
  const subscription = useQuery(api.stripe.getMySubscription);
  const deployment = useQuery(api.deploymentQueries.getMyDeployment);
  const settings = useQuery(api.deploymentSettings.getMySettings);
  const plans = useQuery(api.stripe.getSubscriptionPlansList);

  const createCheckout = useAction(api.stripeCheckout.createSubscriptionCheckout);
  const saveSettings = useMutation(api.deploymentSettings.saveSettings);
  const setPendingDeploy = useMutation(api.deploymentSettings.setPendingDeploy);
  const deployAction = useAction(api.deploymentActions.deploy);

  // ── State ──────────────────────────────────────────────────────────

  const [step, setStep] = useState<Step>('welcome');
  const [planView, setPlanView] = useState<PlanView>('main');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [telegramToken, setTelegramToken] = useState('');
  const [discordToken, setDiscordToken] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [deployComplete, setDeployComplete] = useState(false);

  // ── Determine initial step based on URL + data ─────────────────────

  useEffect(() => {
    const isSubscriptionSuccess = searchParams.get('subscription') === 'success';

    if (isSubscriptionSuccess && subscription && !deployment) {
      setStep('setup');
    } else if (subscription && !deployment) {
      // Has subscription but no deployment: go to setup
      setStep('setup');
    }
  }, [searchParams, subscription, deployment]);

  // ── Watch deployment status after deploy ────────────────────────────

  useEffect(() => {
    if (deploying && deployment && deployment.status === 'running') {
      setDeploying(false);
      setDeployComplete(true);
    }
  }, [deploying, deployment]);

  // ── Plan helpers ───────────────────────────────────────────────────

  const getPlan = useCallback(
    (planType: string): Plan | undefined => {
      return plans?.find((p) => p.planType === planType);
    },
    [plans],
  );

  const formatPrice = (cents: number): string => {
    return `\u20AC${(cents / 100).toFixed(0)}/mo`;
  };

  const formatCredits = (cents: number): string => {
    return `\u20AC${(cents / 100).toFixed(0)}`;
  };

  // ── Checkout handler ──────────────────────────────────────────────

  async function handleSelectPlan(plan: Plan) {
    if (!plan.priceId) return;
    setCheckoutLoading(plan.planType);
    try {
      await setPendingDeploy({ pending: true });
      const result = await createCheckout({ priceId: plan.priceId });
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setCheckoutLoading(null);
    }
  }

  // ── Deploy handler ────────────────────────────────────────────────

  async function handleDeploy() {
    setDeploying(true);
    try {
      // Save channel tokens if provided
      if (telegramToken.trim() || discordToken.trim()) {
        await saveSettings({
          apiKeySource: 'ours',
          selectedModel: 'claude-sonnet',
          telegramBotToken: telegramToken.trim() || undefined,
          discordBotToken: discordToken.trim() || undefined,
        });
      }
      await deployAction();
    } catch (err) {
      console.error('Deploy error:', err);
      setDeploying(false);
    }
  }

  async function handleSkipSetup() {
    setDeploying(true);
    try {
      await deployAction();
    } catch (err) {
      console.error('Deploy error:', err);
      setDeploying(false);
    }
  }

  // ── Loading state ─────────────────────────────────────────────────

  if (subscription === undefined || deployment === undefined || plans === undefined) {
    return (
      <div className="flex h-full items-center justify-center bg-bg">
        <div className="h-6 w-6 rounded-full border-2 border-border border-t-accent animate-spin" />
      </div>
    );
  }

  // ── Plan data ─────────────────────────────────────────────────────

  const basicPlan = getPlan('basic');
  const standardPlan = getPlan('standard');
  const premiumPlan = getPlan('premium');
  const dashboardPlan = getPlan('dashboard');
  const byokPlan = getPlan('byok');

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      {/* ── Step 1: Welcome ──────────────────────────────────────── */}
      <StepContainer active={step === 'welcome'}>
        <div className="flex flex-col items-center text-center">
          <h1 className="text-4xl font-bold tracking-tight text-text sm:text-5xl">
            Ready to take control
            <br />
            of your life?
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-text-muted">
            LifeOS is your personal operating system for goals, habits, and
            growth. Everything in one place, designed to keep you in the zone.
          </p>
          <button
            onClick={() => setStep('plans')}
            className="mt-10 rounded-xl bg-accent px-8 py-3.5 text-sm font-semibold text-bg transition-all duration-200 hover:bg-accent-hover active:scale-[0.97]"
          >
            Let&apos;s get started
          </button>
        </div>
      </StepContainer>

      {/* ── Step 2: Choose your plan ─────────────────────────────── */}
      <StepContainer active={step === 'plans'}>
        <div className="flex flex-col items-center text-center">
          <h1 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Try LifeOS free for 7 days
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-text-muted">
            We believe everyone should experience what it&apos;s like to be in
            the zone. Pick a plan — you won&apos;t be charged until your trial
            ends.
          </p>

          {/* Main plans */}
          <div
            className={`mt-10 w-full transition-all duration-400 ease-out ${
              planView === 'main'
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4 pointer-events-none absolute'
            }`}
          >
            {planView === 'main' && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {basicPlan && (
                    <PlanCard
                      name="Basic"
                      price={formatPrice(basicPlan.priceEuroCents)}
                      description={`${formatCredits(basicPlan.includedCreditsCents)} AI credits included`}
                      loading={checkoutLoading === 'basic'}
                      onClick={() => handleSelectPlan(basicPlan)}
                    />
                  )}
                  {standardPlan && (
                    <PlanCard
                      name="Standard"
                      price={formatPrice(standardPlan.priceEuroCents)}
                      description={`${formatCredits(standardPlan.includedCreditsCents)} AI credits included`}
                      popular
                      loading={checkoutLoading === 'standard'}
                      onClick={() => handleSelectPlan(standardPlan)}
                    />
                  )}
                  {premiumPlan && (
                    <PlanCard
                      name="Premium"
                      price={formatPrice(premiumPlan.priceEuroCents)}
                      description={`${formatCredits(premiumPlan.includedCreditsCents)} AI credits included`}
                      loading={checkoutLoading === 'premium'}
                      onClick={() => handleSelectPlan(premiumPlan)}
                    />
                  )}
                </div>

                <div className="mt-8 flex flex-col items-center gap-2">
                  <button
                    onClick={() => setPlanView('dashboard')}
                    className="text-xs text-text-muted hover:text-text transition-colors"
                  >
                    Only interested in the LifeOS dashboard?
                  </button>
                  <button
                    onClick={() => setPlanView('byok')}
                    className="text-xs text-text-muted hover:text-text transition-colors"
                  >
                    Want to bring your own Anthropic API key?
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Dashboard-only plan */}
          <div
            className={`mt-10 w-full transition-all duration-400 ease-out ${
              planView === 'dashboard'
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4 pointer-events-none absolute'
            }`}
          >
            {planView === 'dashboard' && (
              <>
                <div className="mx-auto max-w-xs">
                  {dashboardPlan && (
                    <PlanCard
                      name="Dashboard"
                      price={formatPrice(dashboardPlan.priceEuroCents)}
                      description="Full access to the LifeOS dashboard. No AI agent included."
                      loading={checkoutLoading === 'dashboard'}
                      onClick={() => handleSelectPlan(dashboardPlan)}
                    />
                  )}
                </div>
                <button
                  onClick={() => setPlanView('main')}
                  className="mt-6 text-xs text-text-muted hover:text-text transition-colors"
                >
                  &larr; Back to main plans
                </button>
              </>
            )}
          </div>

          {/* BYOK plan */}
          <div
            className={`mt-10 w-full transition-all duration-400 ease-out ${
              planView === 'byok'
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4 pointer-events-none absolute'
            }`}
          >
            {planView === 'byok' && (
              <>
                <div className="mx-auto max-w-xs">
                  {byokPlan && (
                    <PlanCard
                      name="BYOK"
                      price={formatPrice(byokPlan.priceEuroCents)}
                      description="Bring your own Anthropic API key. No credits included."
                      loading={checkoutLoading === 'byok'}
                      onClick={() => handleSelectPlan(byokPlan)}
                    />
                  )}
                </div>
                <button
                  onClick={() => setPlanView('main')}
                  className="mt-6 text-xs text-text-muted hover:text-text transition-colors"
                >
                  &larr; Back to main plans
                </button>
              </>
            )}
          </div>
        </div>
      </StepContainer>

      {/* ── Step 3: Setup / Congratulations ──────────────────────── */}
      <StepContainer active={step === 'setup'}>
        <div className="flex flex-col items-center text-center">
          {deploying ? (
            /* Deploying state */
            <div className="flex flex-col items-center">
              <div className="relative h-12 w-12">
                <div className="absolute inset-0 rounded-full border-2 border-border border-t-accent animate-spin" />
              </div>
              <h1 className="mt-8 text-2xl font-bold tracking-tight text-text">
                Setting up your Life Coach
              </h1>
              <p className="mt-3 text-sm text-text-muted">
                This usually takes a couple of minutes.
              </p>
            </div>
          ) : deployComplete ? (
            /* Complete state */
            <div className="flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <CheckIcon className="h-6 w-6 text-success" />
              </div>
              <h1 className="mt-8 text-2xl font-bold tracking-tight text-text">
                You&apos;re all set!
              </h1>
              <p className="mt-3 text-sm text-text-muted">
                Your Life Coach is running. Welcome to the zone.
              </p>
            </div>
          ) : (
            /* Setup form */
            <>
              <h1 className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
                Welcome to LifeOS!
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-text-muted">
                Your 7-day free trial has started. Let&apos;s set up your Life
                Coach.
              </p>

              <p className="mt-8 text-sm font-medium text-text">
                Would you like your Life Coach on Telegram or Discord?
              </p>

              <div className="mt-6 w-full max-w-sm space-y-4 text-left">
                {/* Telegram input */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-medium text-text-muted mb-1.5">
                    <TelegramIcon className="h-3.5 w-3.5" />
                    Telegram Bot Token
                  </label>
                  <input
                    type="text"
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    placeholder="123456:ABC-DEF1234ghIkl..."
                    className="w-full rounded-lg border border-border bg-bg px-4 py-2.5 text-sm text-text placeholder:text-text-muted/40 focus:border-accent focus:outline-none transition-colors"
                  />
                  <p className="mt-1 text-[11px] text-text-muted/60">
                    Create a bot via @BotFather on Telegram
                  </p>
                </div>

                {/* Discord input */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-medium text-text-muted mb-1.5">
                    <DiscordIcon className="h-3.5 w-3.5" />
                    Discord Bot Token
                  </label>
                  <input
                    type="text"
                    value={discordToken}
                    onChange={(e) => setDiscordToken(e.target.value)}
                    placeholder="MTIzNDU2Nzg5MDEyMzQ1..."
                    className="w-full rounded-lg border border-border bg-bg px-4 py-2.5 text-sm text-text placeholder:text-text-muted/40 focus:border-accent focus:outline-none transition-colors"
                  />
                  <p className="mt-1 text-[11px] text-text-muted/60">
                    Create a bot in the Discord Developer Portal
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-col items-center gap-3">
                <button
                  onClick={handleDeploy}
                  disabled={!telegramToken.trim() && !discordToken.trim()}
                  className="rounded-xl bg-accent px-8 py-3 text-sm font-semibold text-bg transition-all duration-200 hover:bg-accent-hover active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
                >
                  Set up my Life Coach
                </button>
                <button
                  onClick={handleSkipSetup}
                  className="text-xs text-text-muted hover:text-text transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </>
          )}
        </div>
      </StepContainer>
    </div>
  );
}
