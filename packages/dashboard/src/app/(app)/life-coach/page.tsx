'use client';

import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { DeploymentDashboard } from '@/components/ai-agent/deployment-dashboard';

import { ChannelConfig } from '@/components/ai-agent/channel-config';
import { ApiKeys } from '@/components/ai-agent/api-keys-byok';
import { InstanceTools } from '@/components/ai-agent/instance-tools';
import { Onboarding } from '@/components/ai-agent/onboarding';
import { ConfigCard } from '@/components/ai-agent/config-card';
import { PaymentStatus } from '@/components/ai-agent/payment-status';

function GetStartedBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('lifeos-coach-introduced') !== 'true') {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem('lifeos-coach-introduced', 'true');
    setVisible(false);
  }

  return (
    <div className="relative border border-border rounded-lg bg-surface p-6">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-text-muted hover:text-text transition-colors"
        aria-label="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <h2 className="text-sm font-semibold text-text">Say hello to your Life Coach</h2>
      <p className="mt-1 text-xs text-text-muted">
        Start a conversation to set up your goals, routines, and daily rhythm.
      </p>
    </div>
  );
}

export default function AiAgentPage() {
  const subscription = useQuery(api.stripe.getMySubscription);
  const deployment = useQuery(api.deploymentQueries.getMyDeployment);
  const settings = useQuery(api.deploymentSettings.getMySettings);
  const deploy = useAction(api.deploymentActions.deploy);
  const clearPendingDeploy = useMutation(api.deploymentSettings.setPendingDeploy);
  const autodeployingRef = useRef(false);

  const [reconfiguring, setReconfiguring] = useState<'byok' | 'ours' | null>(null);

  const plan = typeof window !== 'undefined' ? sessionStorage.getItem('pref_plan') : null;
  const model = typeof window !== 'undefined' ? sessionStorage.getItem('pref_model') : null;
  const urlPrefs = { plan, model };

  // Auto-deploy after Stripe return (only for plans that include deployment)
  useEffect(() => {
    const hasActiveSubscription = subscription && subscription.status === 'active';
    const isDashboardOnly = subscription?.planType === 'dashboard';
    const hasActiveDeployment = deployment && deployment.status !== 'deactivated';
    if (
      hasActiveSubscription &&
      !isDashboardOnly &&
      settings?.pendingDeploy &&
      !hasActiveDeployment &&
      !autodeployingRef.current
    ) {
      autodeployingRef.current = true;
      deploy({})
        .then(() => clearPendingDeploy({ pending: false }))
        .catch(console.error)
        .finally(() => { autodeployingRef.current = false; });
    }
  }, [subscription, settings?.pendingDeploy, deployment, deploy, clearPendingDeploy]);

  if (subscription === undefined || deployment === undefined || settings === undefined) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-pulse h-5 w-5 rounded-full bg-text-muted" />
      </div>
    );
  }

  const hasActiveDeployment = deployment && deployment.status !== 'deactivated';
  const isDashboardOnly = subscription?.planType === 'dashboard';

  // Dashboard-only plan — show upgrade prompt
  if (isDashboardOnly && !hasActiveDeployment) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text tracking-tight mb-2">Life Coach</h1>
          <p className="text-xs text-text-muted">Add a 24/7 AI assistant to your LifeOS</p>
        </div>
        <PaymentStatus />
        <div className="border border-border rounded-lg p-8 text-center space-y-4">
          <div className="text-4xl mb-2">
            <svg width="48" height="48" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-text-muted">
              <circle cx="8" cy="4" r="2" />
              <circle cx="4" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <line x1="8" y1="6" x2="4" y2="10" />
              <line x1="8" y1="6" x2="12" y2="10" />
              <line x1="4" y1="12" x2="12" y2="12" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-text">Activate your personal Life Coach</h2>
          <p className="text-sm text-text-muted max-w-md mx-auto">
            Upgrade your plan to get a dedicated Life Coach instance with Telegram, Discord, and WhatsApp integration. Your Life Coach runs 24/7 and connects to your LifeOS data.
          </p>
          <div className="pt-2">
            <Link
              href="/settings"
              className="inline-flex items-center justify-center h-9 px-6 bg-accent text-bg text-sm font-medium rounded-md hover:bg-accent-hover transition-colors"
            >
              Upgrade Plan
            </Link>
          </div>
          <p className="text-[10px] text-text-muted/60">Starting from EUR 30/mo (Dashboard + BYOK)</p>
        </div>
      </div>
    );
  }

  // Active deployment — show management dashboard
  if (hasActiveDeployment) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text tracking-tight mb-2">Life Coach</h1>
          <p className="text-xs text-text-muted">Your Life Coach is active</p>
        </div>
        <PaymentStatus />
        <GetStartedBanner />
        <DeploymentDashboard deployment={deployment} />
        <ChannelConfig />
        <ApiKeys deploymentStatus={deployment.status} />
        {deployment.status === 'running' && (
          <InstanceTools subdomain={deployment.subdomain} gatewayToken={deployment.gatewayToken} />
        )}
      </div>
    );
  }

  // No settings yet — show onboarding
  if (!settings || reconfiguring) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text tracking-tight mb-2">Life Coach</h1>
          <p className="text-xs text-text-muted">Set up your always-on Life Coach</p>
        </div>
        <PaymentStatus />
        <Onboarding
          preferredPlan={reconfiguring ?? urlPrefs.plan}
          preferredModel={urlPrefs.model}
          onComplete={reconfiguring ? () => setReconfiguring(null) : undefined}
        />
      </div>
    );
  }

  // Settings exist but no deployment — show config card
  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-text tracking-tight mb-2">Life Coach</h1>
        <p className="text-xs text-text-muted">Set up your always-on Life Coach</p>
      </div>
      <PaymentStatus />
      <ConfigCard preferredPlan={urlPrefs.plan} onRequestReconfigure={setReconfiguring} />
    </div>
  );
}
