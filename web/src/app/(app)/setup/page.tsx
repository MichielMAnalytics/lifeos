'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { LoadingScreen } from '@/components/loading-screen';
import { SoftGlow } from '@/components/onboarding/soft-glow';
import { getOnboardingState } from '@/lib/onboarding-store';

type SetupPath = 'skip' | 'quick-connect' | 'full-setup';

function getPaths(hasLifeCoach: boolean): { key: SetupPath; title: string; subtitle: string }[] {
  return [
    {
      key: 'skip',
      title: 'Skip Setup',
      subtitle: 'Jump straight in with defaults.',
    },
    {
      key: 'quick-connect',
      title: 'Quick Connect',
      subtitle: 'Connect your calendar and channels.',
    },
    {
      key: 'full-setup',
      title: 'Full Setup',
      subtitle: hasLifeCoach
        ? 'Connect integrations and personalize your Life Coach.'
        : 'Connect integrations and personalize your experience.',
    },
  ];
}

function SkipIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 16l12 8-12 8V16z" />
      <line x1="36" y1="16" x2="36" y2="32" />
    </svg>
  );
}

function ConnectIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="16" cy="24" r="6" />
      <circle cx="32" cy="24" r="6" />
      <line x1="22" y1="24" x2="26" y2="24" />
      <path d="M10 16l-2-2M38 16l2-2M10 32l-2 2M38 32l2 2" />
    </svg>
  );
}

function FullSetupIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="24" cy="16" r="6" />
      <path d="M12 38c0-6.627 5.373-12 12-12s12 5.373 12 12" />
      <path d="M32 12l2 2 4-4" />
    </svg>
  );
}

const ICONS: Record<SetupPath, React.FC<{ className?: string }>> = {
  'skip': SkipIcon,
  'quick-connect': ConnectIcon,
  'full-setup': FullSetupIcon,
};

function SetupChooserInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subscription = useQuery(api.stripe.getMySubscription);
  const deployment = useQuery(api.deploymentQueries.getMyDeployment);
  const saveProfile = useMutation(api.userProfile.save);
  const deployAction = useAction(api.deploymentActions.deploy);

  const [selected, setSelected] = useState<SetupPath | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [deployTriggered, setDeployTriggered] = useState(false);

  const isPostCheckout = searchParams.get('subscription') === 'success';
  const isDeploymentPlan = subscription && subscription.planType !== 'dashboard';
  const hasDeployment = deployment && deployment.status !== 'deactivated';

  // Auto-trigger deployment on post-checkout for deployment plans
  useEffect(() => {
    if (deployTriggered) return;
    if (!isPostCheckout || !subscription || !isDeploymentPlan || hasDeployment) return;

    setDeployTriggered(true);
    setDeploying(true);
    deployAction().catch((err) => {
      console.error('Auto-deploy error:', err);
      setDeploying(false);
    });
  }, [isPostCheckout, subscription, isDeploymentPlan, hasDeployment, deployAction, deployTriggered]);

  // Track when deployment finishes
  useEffect(() => {
    if (deploying && deployment && deployment.status === 'running') {
      setDeploying(false);
    }
  }, [deploying, deployment]);

  if (subscription === undefined || deployment === undefined) return <LoadingScreen />;

  const hasLifeCoach = !!isDeploymentPlan;
  const PATHS = getPaths(hasLifeCoach);

  async function handleContinue() {
    if (!selected) return;

    // Persist setup path + use cases from pre-payment onboarding state
    const onboardingState = getOnboardingState();
    await saveProfile({
      setupPath: selected,
      selectedUseCases: onboardingState.selectedUseCases.length > 0
        ? onboardingState.selectedUseCases
        : undefined,
    });

    if (selected === 'skip') {
      await saveProfile({ setupCompleted: true });
      localStorage.setItem('lifeos-setup-complete', 'true');
      router.replace('/today');
    } else if (selected === 'quick-connect') {
      router.push('/setup/connect');
    } else {
      router.push('/setup/connect');
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-bg">
      <SoftGlow />

      {/* Deploying indicator */}
      {deploying && (
        <div className="fixed top-6 left-6 z-50 flex items-center gap-2 text-xs text-text-muted/70">
          <div className="w-3 h-3 rounded-full border border-accent/40 border-t-accent animate-spin" />
          Setting up your Life Coach...
        </div>
      )}

      {/* LifeAI logo */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-40">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" width="28" height="39" className="opacity-30">
          <rect x="22" y="20" width="56" height="70" fill="none" stroke="var(--color-text)" strokeWidth="5" strokeLinejoin="miter" />
          <line x1="50" y1="115" x2="50" y2="25" stroke="var(--color-text)" strokeWidth="5" strokeLinecap="round" />
          <line x1="50" y1="85" x2="26" y2="65" stroke="var(--color-text)" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="50" y1="85" x2="74" y2="65" stroke="var(--color-text)" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="50" y1="62" x2="30" y2="42" stroke="var(--color-text)" strokeWidth="4" strokeLinecap="round" />
          <line x1="50" y1="62" x2="70" y2="42" stroke="var(--color-text)" strokeWidth="4" strokeLinecap="round" />
          <line x1="50" y1="45" x2="38" y2="28" stroke="var(--color-text)" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="50" y1="45" x2="62" y2="28" stroke="var(--color-text)" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      </div>

      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 animate-fade-in">
        <div className="flex flex-col items-center text-center w-full max-w-xl">
          {/* Founders appreciation */}
          <div className="mb-8 max-w-sm">
            <div className="rounded-2xl border border-border/30 bg-surface/20 p-5 text-center">
              <div className="flex justify-center gap-2 mb-3">
                  <img src="https://avatars.githubusercontent.com/u/113110236?v=4" alt="Kemp" className="w-9 h-9 rounded-full object-cover" />
                <img src="https://avatars.githubusercontent.com/u/135761097?v=4" alt="Michiel" className="w-9 h-9 rounded-full object-cover" />
              </div>
              <p className="text-xs text-text-muted leading-relaxed italic">
                &quot;We really appreciate you giving LifeAI a try. We built this for ourselves first, and we&apos;re excited to build it with you.&quot;
              </p>
              <p className="mt-2 text-[10px] text-text-muted/50">Kemp & Michiel, founders</p>
            </div>
          </div>

          <h1 className="text-3xl font-light tracking-tight text-text sm:text-4xl">
            How much do you want to <span className="font-semibold">set up</span>?
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-text-muted">
            You can always adjust everything later in settings.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4 w-full">
            {PATHS.map((p) => {
              const isSelected = selected === p.key;
              const Icon = ICONS[p.key];
              return (
                <div key={p.key} className="flex flex-col items-center gap-3">
                  <button
                    onClick={() => setSelected(p.key)}
                    className={`relative w-full h-full flex flex-col items-center text-center rounded-2xl border-2 p-5 pt-6 pb-5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                      isSelected
                        ? 'border-accent bg-accent/[0.05] shadow-lg shadow-accent/10'
                        : 'border-border/40 bg-surface/10 hover:border-border/70 hover:bg-surface/30'
                    }`}
                  >
                    <Icon className={`w-12 h-12 mb-3 transition-colors ${isSelected ? 'text-text' : 'text-text/70'}`} />
                    <span className={`text-[13px] font-semibold leading-tight transition-colors ${isSelected ? 'text-text' : 'text-text/70'}`}>
                      {p.title}
                    </span>
                    <span className={`mt-1.5 text-[11px] leading-relaxed transition-colors ${isSelected ? 'text-text-muted' : 'text-text-muted/70'}`}>
                      {p.subtitle}
                    </span>
                  </button>

                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                    isSelected
                      ? 'bg-accent border-accent'
                      : 'border-text-muted/25 bg-transparent'
                  }`}>
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleContinue}
            disabled={!selected}
            className={`mt-8 rounded-lg px-16 py-3 text-sm font-medium transition-all duration-200 ${
              selected
                ? 'bg-accent text-bg hover:opacity-90 active:scale-[0.98] shadow-sm'
                : 'bg-text-muted/10 text-text-muted/70 cursor-not-allowed'
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SetupChooserInner />
    </Suspense>
  );
}
