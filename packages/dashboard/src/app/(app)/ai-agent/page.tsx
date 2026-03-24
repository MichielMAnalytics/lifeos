'use client';

import { useConvexAuth, useQuery, useAction, useMutation } from 'convex/react';
import { api } from '@/lib/convex-api';
import { useState, useEffect, useRef } from 'react';
import { DeploymentDashboard } from '@/components/ai-agent/deployment-dashboard';
import { ModelSwitcher } from '@/components/ai-agent/model-switcher';
import { ChannelConfig } from '@/components/ai-agent/channel-config';
import { ApiKeys } from '@/components/ai-agent/api-keys-byok';
import { InstanceTools } from '@/components/ai-agent/instance-tools';
import { Onboarding } from '@/components/ai-agent/onboarding';
import { ConfigCard } from '@/components/ai-agent/config-card';
import { PaymentStatus } from '@/components/ai-agent/payment-status';

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

  // Auto-deploy after Stripe return
  useEffect(() => {
    const hasActiveSubscription = subscription && subscription.status === 'active';
    const hasActiveDeployment = deployment && deployment.status !== 'deactivated';
    if (
      hasActiveSubscription &&
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

  if (hasActiveDeployment) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text tracking-tight mb-2">AI Agent</h1>
          <p className="text-xs text-text-muted">Manage your deployed OpenClaw instance</p>
        </div>
        <PaymentStatus />
        <DeploymentDashboard deployment={deployment} />
        <ModelSwitcher deploymentStatus={deployment.status} />
        <ChannelConfig />
        <ApiKeys deploymentStatus={deployment.status} />
        {deployment.status === 'running' && (
          <InstanceTools subdomain={deployment.subdomain} gatewayToken={deployment.gatewayToken} />
        )}
      </div>
    );
  }

  if (!settings || reconfiguring) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text tracking-tight mb-2">AI Agent</h1>
          <p className="text-xs text-text-muted">Deploy your personal AI assistant</p>
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

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-text tracking-tight mb-2">AI Agent</h1>
        <p className="text-xs text-text-muted">Deploy your personal AI assistant</p>
      </div>
      <PaymentStatus />
      <ConfigCard preferredPlan={urlPrefs.plan} onRequestReconfigure={setReconfiguring} />
    </div>
  );
}
