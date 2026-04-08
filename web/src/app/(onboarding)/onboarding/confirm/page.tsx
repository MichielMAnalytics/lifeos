'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { StepContainer } from '@/components/onboarding/step-container';
import { LoadingScreen } from '@/components/loading-screen';
import { getOnboardingState, setOnboardingState, clearPrefs, getPrefBilling, onboardingPath } from '@/lib/onboarding-store';

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

const isDev = process.env.NODE_ENV === 'development';

const MOCK_PLANS: Plan[] = [
  { priceId: 'mock_basic', annualPriceId: 'mock_basic_yr', planType: 'basic', priceEuroCents: 3000, annualPriceEuroCents: 28800, includedCreditsCents: 1000, label: 'Managed (€10)', includesDeployment: true },
  { priceId: 'mock_standard', annualPriceId: 'mock_standard_yr', planType: 'standard', priceEuroCents: 4500, annualPriceEuroCents: 43200, includedCreditsCents: 2500, label: 'Managed (€25)', includesDeployment: true },
  { priceId: 'mock_pro', annualPriceId: 'mock_pro_yr', planType: 'pro', priceEuroCents: 7000, annualPriceEuroCents: 67200, includedCreditsCents: 5000, label: 'Managed (€50)', includesDeployment: true },
  { priceId: 'mock_premium', annualPriceId: 'mock_premium_yr', planType: 'premium', priceEuroCents: 12000, annualPriceEuroCents: 115200, includedCreditsCents: 10000, label: 'Managed (€100)', includesDeployment: true },
  { priceId: 'mock_byok', annualPriceId: 'mock_byok_yr', planType: 'byok', priceEuroCents: 2000, annualPriceEuroCents: 19200, includedCreditsCents: 0, label: 'BYOK', includesDeployment: true },
  { priceId: 'mock_dashboard', annualPriceId: 'mock_dashboard_yr', planType: 'dashboard', priceEuroCents: 1000, annualPriceEuroCents: 9600, includedCreditsCents: 0, label: 'Home', includesDeployment: false },
];

// ── Shared UI pieces ──

function TrustSignal() {
  const avatars = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=48&h=48&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=48&h=48&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=48&h=48&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=48&h=48&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=48&h=48&fit=crop&crop=face',
  ];
  return (
    <div className="mt-8 flex items-center gap-2.5 text-[11px] text-text-muted/70">
      <span className="flex -space-x-2">
        {avatars.map((src, i) => (
          <img key={i} src={src} alt="" className="w-7 h-7 rounded-full border-2 border-bg object-cover" />
        ))}
      </span>
      Joined by 500+ people taking control of their days
    </div>
  );
}

function CtaButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="mt-8 w-full rounded-lg bg-accent px-8 py-3 text-sm font-medium text-bg transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
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
}

// ── Toggle switch ──

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${checked ? 'bg-accent' : 'bg-text-muted/20'}`}
    >
      <div className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-[20px]' : 'translate-x-0.5'}`} />
    </button>
  );
}

// ── Pricing card ──

function PricingCard({ title, subtitle, afterTrialPrice, annual, onToggleAnnual, features, loading, onCheckout }: {
  title: string;
  subtitle: string;
  afterTrialPrice: string;
  annual: boolean;
  onToggleAnnual: (v: boolean) => void;
  features: string[];
  loading: boolean;
  onCheckout: () => void;
}) {
  return (
    <div className="w-full max-w-md rounded-2xl border-2 border-border/40 bg-surface/10 p-6 text-center">
      <h2 className="text-xl font-semibold text-text">{title}</h2>
      <p className="mt-1 text-sm text-text-muted">{subtitle}</p>

      <div className="mt-6 border-t border-border/30 pt-6">
        <p className="text-lg font-semibold text-text">7 days free</p>
        <p className="mt-1 text-sm text-text-muted">
          then {afterTrialPrice}/mo
        </p>
      </div>

      {/* Annual toggle */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <span className={`text-xs ${!annual ? 'text-text font-medium' : 'text-text-muted'}`}>Monthly</span>
        <Toggle checked={annual} onChange={onToggleAnnual} />
        <span className={`text-xs ${annual ? 'text-text font-medium' : 'text-text-muted'}`}>
          Annual <span className="text-green-500 text-[10px] font-medium">-20%</span>
        </span>
      </div>

      {/* Features */}
      {features.length > 0 && (
        <ul className="mt-5 border-t border-border/30 pt-4 space-y-2 text-left">
          {features.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-text-muted">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent shrink-0">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {f}
            </li>
          ))}
        </ul>
      )}

      <CtaButton loading={loading} onClick={onCheckout} />
    </div>
  );
}

// ── Core confirm UI (shared by dev + live) ──

function ConfirmUI({ plans, onCheckout, isDevMode }: { plans: Plan[]; onCheckout: (planType: string, annual: boolean) => void; isDevMode: boolean }) {
  const [selectedPlanType, setSelectedPlanType] = useState<string>('standard');
  const [annual, setAnnual] = useState(() => getPrefBilling() === 'annual');
  const [loading, setLoading] = useState(false);
  const [path, setPath] = useState<string | null>(null);

  useEffect(() => {
    const state = getOnboardingState();
    setPath(state.path);
    if (state.selectedPlanType) setSelectedPlanType(state.selectedPlanType);
  }, []);

  const isByok = path === 'byok';
  const isOwnAgent = path === 'own-agent';

  const getPlan = useCallback(
    (planType: string): Plan | undefined => plans.find((p) => p.planType === planType),
    [plans],
  );

  const fmtPrice = (cents: number) => `\u20AC${(cents / 100).toFixed(0)}`;
  const afterTrialPrice = (plan: Plan) =>
    annual && plan.annualPriceEuroCents
      ? fmtPrice(Math.round(plan.annualPriceEuroCents / 12))
      : fmtPrice(plan.priceEuroCents);

  function handleCheckout() {
    if (isDevMode) {
      window.location.href = onboardingPath('/onboarding/personalize');
      return;
    }
    setLoading(true);
    onCheckout(selectedPlanType, annual);
  }

  const backPath = isOwnAgent ? '/onboarding/plans' : '/onboarding/channels';

  // ── Own-agent path ──
  if (isOwnAgent) {
    const dashboardPlan = getPlan('dashboard');
    if (!dashboardPlan) return <LoadingScreen />;

    return (
      <StepContainer backHref={backPath}>
        <div className="flex flex-col items-center w-full animate-fade-in">
          <h1 className="text-3xl font-light tracking-tight text-text sm:text-4xl text-center">
            Start your <span className="font-semibold">free trial</span>
          </h1>
          <p className="mt-3 text-sm text-text-muted text-center">
            Full access for 7 days, then choose to continue.
          </p>

          <div className="mt-8">
            <PricingCard
              title="LifeOS Home"
              subtitle="Plan, track, and reflect"

              afterTrialPrice={afterTrialPrice(dashboardPlan)}
              annual={annual}
              onToggleAnnual={setAnnual}
              features={['Full home & all pages', 'All presets & themes', 'CLI access', 'Connect your own AI agent']}
              loading={loading}
              onCheckout={handleCheckout}
            />
          </div>

          <TrustSignal />
        </div>
      </StepContainer>
    );
  }

  // ── BYOK path ──
  if (isByok) {
    const byokPlan = getPlan('byok');
    if (!byokPlan) return <LoadingScreen />;

    return (
      <StepContainer backHref={backPath}>
        <div className="flex flex-col items-center w-full animate-fade-in">
          <h1 className="text-3xl font-light tracking-tight text-text sm:text-4xl text-center">
            Start your <span className="font-semibold">free trial</span>
          </h1>
          <p className="mt-3 text-sm text-text-muted text-center">
            Full access for 7 days, then choose to continue.
          </p>

          <div className="mt-8">
            <PricingCard
              title="Bring Your Own Key"
              subtitle="Use your own Claude or ChatGPT subscription"

              afterTrialPrice={afterTrialPrice(byokPlan)}
              annual={annual}
              onToggleAnnual={setAnnual}
              features={['LifeCoach hosting & updates', 'No AI markup — use your own subscription', 'All presets & themes', 'Telegram & Discord channels']}
              loading={loading}
              onCheckout={handleCheckout}
            />
          </div>

          <TrustSignal />
        </div>
      </StepContainer>
    );
  }

  // ── Managed path: credit tier selector ──
  const CREDIT_TIERS = [
    { planType: 'basic' as const, credits: 10, total: 30 },
    { planType: 'standard' as const, credits: 25, total: 45 },
    { planType: 'premium' as const, credits: 100, total: 120 },
  ];

  const activeTier = CREDIT_TIERS.find(t => t.planType === selectedPlanType) ?? CREDIT_TIERS[0];
  const platformPrice = 20;
  const displayTotal = annual ? Math.round(activeTier.total * 0.8) : activeTier.total;

  return (
    <StepContainer backHref={backPath}>
      <div className="flex flex-col items-center w-full max-w-md animate-fade-in">
        <h1 className="text-3xl font-light tracking-tight text-text sm:text-4xl text-center">
          Start your <span className="font-semibold">free trial</span>
        </h1>
        <p className="mt-3 text-sm text-text-muted text-center">
          Full access, no charge today
        </p>

        <div className="mt-6 w-full rounded-2xl border-2 border-border/40 bg-surface/10 p-5">
          <p className="text-center text-lg font-semibold text-text">7 days free</p>

          <div className="mt-4 rounded-lg bg-text/[0.03] p-4 space-y-3 text-sm">
            {/* Platform line */}
            <div className="flex justify-between items-start gap-4">
              <div className="min-w-0">
                <span className="text-text font-medium text-xs block">LifeOS + LifeCoach</span>
                <span className="text-[10px] text-text-muted/70">Goals, tasks, journals, coaching, channels</span>
              </div>
              <span className="text-text font-medium shrink-0">{'\u20AC'}{platformPrice}</span>
            </div>

            {/* AI credits line with dropdown */}
            <div className="flex justify-between items-start gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-text font-medium text-xs">AI credits</span>
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 font-medium">direct to Claude</span>
                </div>
                <span className="text-[10px] text-text-muted/70">Unused credits roll over monthly</span>
              </div>
              <select
                value={selectedPlanType}
                onChange={(e) => {
                  setSelectedPlanType(e.target.value);
                  setOnboardingState({ selectedPlanType: e.target.value });
                }}
                className="bg-surface/50 border border-border/40 rounded-lg px-2 py-1 text-xs text-text font-medium cursor-pointer focus:outline-none focus:border-accent/50 shrink-0"
              >
                {CREDIT_TIERS.map(t => (
                  <option key={t.planType} value={t.planType}>
                    {'\u20AC'}{t.credits}/mo
                  </option>
                ))}
              </select>
            </div>

            {/* Total */}
            <div className="border-t border-border/30 pt-2 flex justify-between font-semibold text-text">
              <span>After trial</span>
              <span>{'\u20AC'}{displayTotal}/mo</span>
            </div>
          </div>

          {/* Annual toggle */}
          <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-center gap-3">
            <span className={`text-xs ${!annual ? 'text-text font-medium' : 'text-text-muted'}`}>Monthly</span>
            <Toggle checked={annual} onChange={setAnnual} />
            <span className={`text-xs ${annual ? 'text-text font-medium' : 'text-text-muted'}`}>
              Annual <span className="text-green-500 text-[10px] font-medium">-20%</span>
            </span>
          </div>
        </div>

        <CtaButton loading={loading} onClick={handleCheckout} />
        <p className="mt-2 text-[10px] text-text-muted/70 text-center">Cancel anytime.</p>

        <TrustSignal />
      </div>
    </StepContainer>
  );
}

// ── Dev version (mock plans, no Stripe) ──

function DevConfirmPage() {
  return (
    <ConfirmUI
      plans={MOCK_PLANS}
      isDevMode={true}
      onCheckout={() => window.location.href = onboardingPath('/onboarding/personalize')}
    />
  );
}

// ── Live version (real Convex + Stripe) ──

function LiveConfirmPage() {
  const plans = useQuery(api.stripe.getSubscriptionPlansList);
  const createCheckout = useAction(api.stripeCheckout.createSubscriptionCheckout);
  const saveSettings = useMutation(api.deploymentSettings.saveSettings);
  const setPendingDeploy = useMutation(api.deploymentSettings.setPendingDeploy);

  if (plans === undefined) return <LoadingScreen />;

  async function handleCheckout(planType: string, annual: boolean) {
    const plan = plans!.find((p) => p.planType === planType);
    if (!plan?.priceId) return;

    try {
      const state = getOnboardingState();
      const isByok = state.path === 'byok';
      const isManaged = state.path === 'managed';

      if (isManaged || isByok) {
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
          openaiAuthMethod: isByok ? state.openaiAuthMethod : undefined,
          ...(isByok && state.openaiAuthMethod === 'api_key' && state.openaiApiKey.trim()
            ? { openaiKey: state.openaiApiKey.trim() }
            : {}),
          ...(isByok && state.openaiAuthMethod === 'chatgpt_oauth' && state.openaiOAuthTokens.trim()
            ? { openaiOAuthTokens: state.openaiOAuthTokens.trim() }
            : {}),
          telegramBotToken: state.telegramToken.trim() || undefined,
          discordBotToken: state.discordToken.trim() || undefined,
        });
        await setPendingDeploy({ pending: true });
      }

      clearPrefs();
      const priceId = annual && plan.annualPriceId ? plan.annualPriceId : plan.priceId;
      const result = await createCheckout({ priceId });
      if (result.url) window.location.href = result.url;
    } catch (err) {
      console.error('Checkout error:', err);
    }
  }

  return (
    <ConfirmUI
      plans={plans as Plan[]}
      isDevMode={false}
      onCheckout={handleCheckout}
    />
  );
}

// ── Router ──

function ConfirmPageRouter() {
  const searchParams = useSearchParams();
  const isDevMode = isDev && searchParams.get('dev') !== null;

  if (isDevMode) return <DevConfirmPage />;
  return <LiveConfirmPage />;
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ConfirmPageRouter />
    </Suspense>
  );
}
