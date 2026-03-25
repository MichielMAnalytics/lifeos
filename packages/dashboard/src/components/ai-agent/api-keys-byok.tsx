'use client';

import { useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui-clawnow/card";
import { ByokCredentials } from "@/components/ai-agent/byok-credentials";
import { CustomEnvVars } from "@/components/ai-agent/custom-env-vars";
import type { DeploymentStatus } from "@/components/ai-agent/types";

export function ApiKeys({ deploymentStatus }: { deploymentStatus?: DeploymentStatus }) {
  const settings = useQuery(api.deploymentSettings.getMySettings);

  const isByok = settings?.apiKeySource === "byok";
  const storedEnvKeys = settings?.customEnvKeys ?? [];

  const configuredNames: string[] = [];
  if (isByok) {
    if (settings?.anthropicKeyLength) {
      if (settings.anthropicAuthMethod === "setup_token") configuredNames.push("Claude subscription");
      else configuredNames.push("Anthropic API key");
    }
    if (settings?.openaiKeyLength) configuredNames.push("OpenAI");
    if (settings?.googleKeyLength) configuredNames.push("Google");
    if (settings?.moonshotKeyLength) configuredNames.push("Moonshot");
    if (settings?.minimaxKeyLength) configuredNames.push("MiniMax");
  }
  for (const k of storedEnvKeys) configuredNames.push(k.name);
  const totalConfigured = configuredNames.length;

  return (
    <details className="group" open={isByok}>
      <summary className="flex items-center gap-1.5 cursor-pointer text-[10px] font-medium text-text-muted/60 hover:text-text-muted uppercase tracking-wider select-none list-none [&::-webkit-details-marker]:hidden transition-colors">
        <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
        API Keys
        {totalConfigured > 0 && (
          <span className="text-[9px] normal-case tracking-normal text-text-muted/40">
            — {configuredNames.join(", ")}
          </span>
        )}
      </summary>
      <Card className="mt-3">
        <CardContent className="pt-5 pb-5 space-y-4">
          {isByok ? (
            <>
              <ByokCredentials deploymentStatus={deploymentStatus} />
              <div className="border-t border-border" />
              <CustomEnvVars />
            </>
          ) : (
            <>
              <p className="text-[9px] text-text-muted leading-relaxed">
                Model API keys are handled by your plan — no setup needed.
                Use this section to add API keys for agent skills and integrations.
              </p>
              <CustomEnvVars />
            </>
          )}
        </CardContent>
      </Card>
    </details>
  );
}
