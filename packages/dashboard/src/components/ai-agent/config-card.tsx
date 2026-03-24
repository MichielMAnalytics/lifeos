'use client';

import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/lib/convex-api";
import { useState } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui-clawnow/button";
import { Card, CardContent } from "@/components/ui-clawnow/card";
import { Badge } from "@/components/ui-clawnow/badge";
import { PreDeployModelPicker } from "@/components/ai-agent/model-switcher";
import { ChannelConfig } from "@/components/ai-agent/channel-config";
import { ByokCredentials } from "@/components/ai-agent/byok-credentials";
import { SubscriptionPicker } from "@/components/ai-agent/subscription-picker";
import { PricingExtras } from "@/components/ai-agent/pricing-extras";
import { capture, EVENTS } from "@/lib/analytics";

function DeployButton({
  onShowPlans,
}: {
  onShowPlans: () => void;
}) {
  const subscription = useQuery(api.stripe.getMySubscription);
  const deploy = useAction(api.deploymentActions.deploy);
  const setPendingDeploy = useMutation(api.deploymentSettings.setPendingDeploy);

  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasActiveSubscription = subscription && subscription.status === "active";

  const handleDeploy = async () => {
    if (!hasActiveSubscription) {
      await setPendingDeploy({ pending: true });
      onShowPlans();
      return;
    }
    setDeploying(true);
    setError(null);
    try {
      await deploy({});
      capture(EVENTS.DEPLOY_INITIATED);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deployment failed");
    } finally {
      setDeploying(false);
    }
  };

  return (
    <Card className="ring-primary/20">
      <CardContent className="pt-6 pb-6 flex flex-col items-center text-center space-y-4">
        {error && (
          <Badge
            variant="destructive"
            className="h-auto px-3 py-2 text-xs w-full"
          >
            {error}
          </Badge>
        )}

        <Button
          onClick={handleDeploy}
          disabled={deploying}
          loading={deploying}
          size="lg"
          className="w-full h-12 text-sm gap-2.5"
        >
          <Zap className="size-4" />
          {deploying ? "Deploying..." : "Deploy Claw Now"}
        </Button>

        <p className="text-[10px] text-text-muted">
          Your instance will be live in under 1 minute.
        </p>
      </CardContent>
    </Card>
  );
}

export function ConfigCard({
  preferredPlan,
  onRequestReconfigure,
}: {
  preferredPlan?: string | null;
  onRequestReconfigure?: (target: "ours" | "byok") => void;
}) {
  const settings = useQuery(api.deploymentSettings.getMySettings);
  const isByok = settings?.apiKeySource === "byok";
  const [showPlans, setShowPlans] = useState(false);

  if (showPlans) {
    return (
      <div className="max-w-4xl mx-auto">
        <SubscriptionPicker
          preferredPlan={preferredPlan}
          filterByApiKeySource={settings?.apiKeySource}
          onRequestChangeKeys={onRequestReconfigure}
        />
        <PricingExtras />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <DeployButton onShowPlans={() => setShowPlans(true)} />
      <PreDeployModelPicker />
      <ChannelConfig />
      {isByok && <ByokCredentials />}
      <p className="text-center pt-2">
        <a href="mailto:contact@azin.run?subject=%5BClawNow%5D%20Support%20request&body=Hi!%20I%20need%20help%20with%3A%0A%0A" className="text-xs text-text-muted/50 hover:text-text-muted transition-colors">
          Contact Support
        </a>
      </p>
    </div>
  );
}
