'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useAction } from 'convex/react';
import { api } from '@/lib/convex-api';
import { StepContainer } from '@/components/onboarding/step-container';
import { HomeSetupStep } from '@/components/onboarding/home-setup-step';
import { LoadingScreen } from '@/components/loading-screen';

function SetupPageInner() {
  const searchParams = useSearchParams();
  const subscription = useQuery(api.stripe.getMySubscription);
  const deployment = useQuery(api.deploymentQueries.getMyDeployment);
  const settings = useQuery(api.deploymentSettings.getMySettings);
  const deployAction = useAction(api.deploymentActions.deploy);

  const [deploying, setDeploying] = useState(false);
  const [deployComplete, setDeployComplete] = useState(false);
  const autoDeployTriggered = useRef(false);

  const isDeploymentPlan = (planType: string | null | undefined) =>
    planType === 'basic' || planType === 'standard' || planType === 'premium' || planType === 'byok';

  // Auto-deploy after Stripe redirect for deployment plans
  useEffect(() => {
    if (autoDeployTriggered.current) return;
    const isSuccess = searchParams.get('subscription') === 'success';
    if (!isSuccess || !subscription || deployment) return;

    if (subscription.planType === 'dashboard') {
      // Dashboard plan: show CLI setup (HomeSetupStep renders below)
      return;
    }

    if (isDeploymentPlan(subscription.planType) && settings?.pendingDeploy) {
      autoDeployTriggered.current = true;
      setDeploying(true);
      deployAction().catch((err) => {
        console.error('Auto-deploy error:', err);
        setDeploying(false);
      });
    }
  }, [searchParams, subscription, deployment, settings, deployAction]);

  // Track deployment status changes
  useEffect(() => {
    if (deploying && deployment && deployment.status === 'running') {
      setDeploying(false);
      setDeployComplete(true);
    }
  }, [deploying, deployment]);

  if (subscription === undefined || deployment === undefined || settings === undefined) {
    return <LoadingScreen />;
  }

  return (
    <StepContainer>
      <div className="flex flex-col items-center text-center w-full max-w-lg">
        {subscription?.planType === 'dashboard' ? (
          /* Home plan: CLI + AI assistant setup */
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
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SetupPageInner />
    </Suspense>
  );
}
