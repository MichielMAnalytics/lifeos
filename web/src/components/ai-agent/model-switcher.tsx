'use client';

import { useQuery, useMutation } from "convex/react";
import { api } from "@/lib/convex-api";
import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui-clawnow/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui-clawnow/card";
import { cn } from "@/lib/utils";
import { MODELS } from "@/components/ai-agent/types";
import type { DeploymentStatus } from "@/components/ai-agent/types";
import { capture, EVENTS } from "@/lib/analytics";

export function ModelSwitcher({ deploymentStatus }: { deploymentStatus: DeploymentStatus }) {
  const settings = useQuery(api.deploymentSettings.getMySettings);
  const saveSettings = useMutation(api.deploymentSettings.saveSettings);
  const [switching, setSwitching] = useState<string | null>(null);

  if (!settings) return null;

  const isRunning = deploymentStatus === "running";
  const isByok = settings.apiKeySource === "byok";

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
        <div className="flex flex-wrap gap-2">
          {MODELS.map((model) => {
            const isClaude = model.id.startsWith("claude");
            const isGpt = model.id.startsWith("gpt");
            const isGemini = model.id.startsWith("gemini");
            const isKimi = model.id.startsWith("kimi");
            const isMinimax = model.id.startsWith("minimax");
            const hasAnthropic = isByok ? !!settings.anthropicKeyLength : true;
            const hasOpenai = isByok ? !!settings.openaiKeyLength : true;
            const hasGoogle = isByok ? !!settings.googleKeyLength : true;
            const hasMoonshot = isByok ? !!settings.moonshotKeyLength : true;
            const hasMinimax = isByok ? !!settings.minimaxKeyLength : true;
            const missingCreds = (isClaude && !hasAnthropic) || (isGpt && !hasOpenai) || (isGemini && !hasGoogle) || (isKimi && !hasMoonshot) || (isMinimax && !hasMinimax);
            const isSelected = settings.selectedModel === model.id;
            const disabled = !isRunning || missingCreds || switching !== null;

            return (
              <Button
                key={model.id}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => handleSwitch(model.id)}
                disabled={isSelected ? true : disabled}
                className={cn("gap-2", missingCreds && "opacity-40")}
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
        <div className="flex flex-wrap gap-2">
          {MODELS.map((model) => {
            const isClaude = model.id.startsWith("claude");
            const isGpt = model.id.startsWith("gpt");
            const isGemini = model.id.startsWith("gemini");
            const isKimi = model.id.startsWith("kimi");
            const isMinimax = model.id.startsWith("minimax");
            const hasAnthropic = isByok ? !!settings.anthropicKeyLength : true;
            const hasOpenai = isByok ? !!settings.openaiKeyLength : true;
            const hasGoogle = isByok ? !!settings.googleKeyLength : true;
            const hasMoonshot = isByok ? !!settings.moonshotKeyLength : true;
            const hasMinimax = isByok ? !!settings.minimaxKeyLength : true;
            const missingCreds = (isClaude && !hasAnthropic) || (isGpt && !hasOpenai) || (isGemini && !hasGoogle) || (isKimi && !hasMoonshot) || (isMinimax && !hasMinimax);
            const isSelected = settings.selectedModel === model.id;

            return (
              <Button
                key={model.id}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => handleSwitch(model.id)}
                disabled={isSelected || missingCreds || switching !== null}
                className={cn("gap-2", missingCreds && "opacity-40")}
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
      </CardContent>
    </Card>
  );
}
