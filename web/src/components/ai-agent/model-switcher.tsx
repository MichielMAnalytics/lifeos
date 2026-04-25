'use client';

import { useQuery, useMutation } from "convex/react";
import { api } from "@/lib/convex-api";
import { useState, useMemo } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui-clawnow/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui-clawnow/card";
import { cn } from "@/lib/utils";
import { MODELS, MODEL_PROVIDER_ORDER } from "@/components/ai-agent/types";
import type { DeploymentStatus } from "@/components/ai-agent/types";
import { capture, EVENTS } from "@/lib/analytics";

type Model = (typeof MODELS)[number];

interface CredentialState {
  hasAnthropic: boolean;
  hasOpenai: boolean;
  hasGoogle: boolean;
  hasMoonshot: boolean;
  hasMinimax: boolean;
}

/** Map provider → which credential field gates it. Centralised so the
 * picker grouping and the disabled-state derivation stay in lockstep. */
function isModelMissingCreds(model: Model, creds: CredentialState): boolean {
  switch (model.provider) {
    case "Anthropic": return !creds.hasAnthropic;
    case "OpenAI": return !creds.hasOpenai;
    case "Google": return !creds.hasGoogle;
    case "Moonshot": return !creds.hasMoonshot;
    case "MiniMax": return !creds.hasMinimax;
    case "Alibaba": return false; // platform-only, no BYOK gate
    default: return false;
  }
}

/** Bucket the flat MODELS list into [provider, models[]] pairs in the
 * order declared by MODEL_PROVIDER_ORDER. Models with an unknown
 * provider land in a trailing "Other" group. */
function groupModelsByProvider(models: typeof MODELS): Array<{ provider: string; items: Model[] }> {
  const buckets = new Map<string, Model[]>();
  for (const m of models) {
    const p = m.provider ?? "Other";
    if (!buckets.has(p)) buckets.set(p, []);
    buckets.get(p)!.push(m);
  }
  const ordered: Array<{ provider: string; items: Model[] }> = [];
  for (const p of MODEL_PROVIDER_ORDER) {
    const items = buckets.get(p);
    if (items && items.length > 0) ordered.push({ provider: p, items });
  }
  // Anything not in the explicit order list (e.g. a new provider added
  // before MODEL_PROVIDER_ORDER got bumped) tails on at the end.
  for (const [p, items] of buckets) {
    if (!MODEL_PROVIDER_ORDER.includes(p as (typeof MODEL_PROVIDER_ORDER)[number])) {
      ordered.push({ provider: p, items });
    }
  }
  return ordered;
}

interface ModelGridProps {
  selectedId: string | undefined;
  switching: string | null;
  onSwitch: (id: string) => void;
  isRunningRequired: boolean;
  isRunning: boolean;
  creds: CredentialState;
}

/** Provider-grouped grid of model buttons. Shared between the post-deploy
 * ModelSwitcher (which gates by deployment status) and the pre-deploy
 * picker (which doesn't). */
function ModelGrid({
  selectedId,
  switching,
  onSwitch,
  isRunningRequired,
  isRunning,
  creds,
}: ModelGridProps) {
  const groups = useMemo(() => groupModelsByProvider(MODELS), []);

  return (
    <div className="space-y-4">
      {groups.map(({ provider, items }) => (
        <div key={provider}>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted/70 mb-2">
            {provider}
          </h3>
          <div className="flex flex-wrap gap-2">
            {items.map((model) => {
              const missingCreds = isModelMissingCreds(model, creds);
              const isSelected = selectedId === model.id;
              const disabled =
                isSelected ||
                missingCreds ||
                switching !== null ||
                (isRunningRequired && !isRunning);

              return (
                <Button
                  key={model.id}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSwitch(model.id)}
                  disabled={disabled}
                  className={cn("gap-2", missingCreds && "opacity-40")}
                  title={missingCreds ? `Add a ${provider} key in BYOK to enable` : undefined}
                >
                  {switching === model.id ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <img
                      src={model.icon}
                      alt={model.label}
                      className={cn(
                        "size-3.5",
                        "iconClass" in model && !isSelected && model.iconClass,
                      )}
                    />
                  )}
                  {model.label}
                  {isSelected && <Check className="size-3 ml-1" />}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ModelSwitcher({ deploymentStatus }: { deploymentStatus: DeploymentStatus }) {
  const settings = useQuery(api.deploymentSettings.getMySettings);
  const saveSettings = useMutation(api.deploymentSettings.saveSettings);
  const [switching, setSwitching] = useState<string | null>(null);

  if (!settings) return null;

  const isRunning = deploymentStatus === "running";
  const isByok = settings.apiKeySource === "byok";

  const creds: CredentialState = {
    hasAnthropic: isByok ? !!settings.anthropicKeyLength : true,
    hasOpenai: isByok ? !!settings.openaiKeyLength : true,
    hasGoogle: isByok ? !!settings.googleKeyLength : true,
    hasMoonshot: isByok ? !!settings.moonshotKeyLength : true,
    hasMinimax: isByok ? !!settings.minimaxKeyLength : true,
  };

  const handleSwitch = async (modelId: string) => {
    if (modelId === settings.selectedModel || !isRunning) return;
    setSwitching(modelId);
    try {
      await saveSettings({
        apiKeySource: settings.apiKeySource,
        selectedModel: modelId,
      });
      capture(EVENTS.MODEL_SWITCHED, { model: modelId });
    } catch (e) {
      console.error("Model switch error:", e);
    } finally {
      setSwitching(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Default Model</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ModelGrid
          selectedId={settings.selectedModel}
          switching={switching}
          onSwitch={handleSwitch}
          isRunningRequired
          isRunning={isRunning}
          creds={creds}
        />
        <p className="text-[9px] text-text-muted/80">
          Model switch takes effect within seconds
        </p>
      </CardContent>
    </Card>
  );
}

export function PreDeployModelPicker() {
  const settings = useQuery(api.deploymentSettings.getMySettings);
  const saveSettings = useMutation(api.deploymentSettings.saveSettings);
  const [switching, setSwitching] = useState<string | null>(null);

  if (!settings) return null;

  const isByok = settings.apiKeySource === "byok";
  const creds: CredentialState = {
    hasAnthropic: isByok ? !!settings.anthropicKeyLength : true,
    hasOpenai: isByok ? !!settings.openaiKeyLength : true,
    hasGoogle: isByok ? !!settings.googleKeyLength : true,
    hasMoonshot: isByok ? !!settings.moonshotKeyLength : true,
    hasMinimax: isByok ? !!settings.minimaxKeyLength : true,
  };

  const handleSwitch = async (modelId: string) => {
    if (modelId === settings.selectedModel) return;
    setSwitching(modelId);
    try {
      await saveSettings({
        apiKeySource: settings.apiKeySource,
        selectedModel: modelId,
      });
      capture(EVENTS.MODEL_SWITCHED, { model: modelId });
    } catch (e) {
      console.error("Model switch error:", e);
    } finally {
      setSwitching(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Default Model</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ModelGrid
          selectedId={settings.selectedModel}
          switching={switching}
          onSwitch={handleSwitch}
          isRunningRequired={false}
          isRunning
          creds={creds}
        />
      </CardContent>
    </Card>
  );
}
