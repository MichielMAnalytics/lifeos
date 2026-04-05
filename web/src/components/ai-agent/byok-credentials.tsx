'use client';

import { useQuery, useMutation } from "convex/react";
import { api } from "@/lib/convex-api";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui-clawnow/button";
import { cn } from "@/lib/utils";
import { SecretInput } from "@/components/ui-clawnow/secret-input";
import { CopyCode } from "@/components/ui-clawnow/copy-code";
import { capture, EVENTS } from "@/lib/analytics";
import type { DeploymentStatus } from "@/components/ai-agent/types";

export function ByokCredentials({ deploymentStatus }: { deploymentStatus?: DeploymentStatus }) {
  const settings = useQuery(api.deploymentSettings.getMySettings);
  const saveSettings = useMutation(api.deploymentSettings.saveSettings);

  // Default to api_key — setup_token (Claude subscription) is temporarily unavailable
  const [anthropicAuthMethod, setAnthropicAuthMethod] = useState<"api_key" | "setup_token">("api_key");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [anthropicSetupToken, setAnthropicSetupToken] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [googleKey, setGoogleKey] = useState("");
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Keep api_key as default — setup_token is temporarily unavailable
    if (settings?.anthropicAuthMethod && settings.anthropicAuthMethod !== "setup_token") {
      setAnthropicAuthMethod(settings.anthropicAuthMethod);
    }
  }, [settings?.anthropicAuthMethod]);

  const togglePendingDelete = (provider: string) => {
    setPendingDeletes((prev) => {
      const next = new Set(prev);
      if (next.has(provider)) next.delete(provider);
      else next.add(provider);
      return next;
    });
  };

  const hasChanges = !!(anthropicKey || anthropicSetupToken || openaiKey || googleKey
    || anthropicAuthMethod !== (settings?.anthropicAuthMethod ?? "api_key")
    || pendingDeletes.size > 0);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    try {
      await saveSettings({
        apiKeySource: settings.apiKeySource,
        selectedModel: settings.selectedModel,
        anthropicAuthMethod,
        ...(anthropicAuthMethod === "api_key"
          ? { anthropicKey: anthropicKey || undefined }
          : { anthropicSetupToken: anthropicSetupToken || undefined }),
        openaiKey: openaiKey || undefined,
        googleKey: googleKey || undefined,
        keysToDelete: pendingDeletes.size > 0 ? Array.from(pendingDeletes) : undefined,
      });
      setAnthropicKey("");
      setAnthropicSetupToken("");
      setOpenaiKey("");
      setGoogleKey("");
      setPendingDeletes(new Set());
      setSaved(true);
      capture(EVENTS.CREDENTIALS_UPDATED);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error("Save error:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Anthropic */}
      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-muted">
          <svg viewBox="0 0 46 32" className="h-3.5 w-auto fill-current opacity-70" aria-hidden="true">
            <path d="M32.73 0L22.63 28.04h5.55L38.28 0h-5.55zM13.27 0L0 28.04h5.66l2.71-7.27h13.5l2.71 7.27h5.66L17.11 0h-3.84zm-1.46 15.81L15.19 6.5l3.38 9.31H11.81z" />
          </svg>
          Anthropic
        </label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setAnthropicAuthMethod("api_key")}
            className={cn(
              "flex-1 py-1.5 text-[10px] uppercase tracking-wider border transition-colors cursor-pointer",
              anthropicAuthMethod === "api_key"
                ? "bg-text text-bg border-text"
                : "bg-transparent text-text-muted border-border hover:border-text/30",
            )}
          >
            API Key
          </button>
          <button
            type="button"
            disabled
            title="Claude subscription is temporarily unavailable"
            className="flex-1 py-1.5 text-[10px] uppercase tracking-wider border border-border text-text-muted/30 cursor-not-allowed"
          >
            Claude subscription
          </button>
        </div>
        {anthropicAuthMethod === "api_key" ? (
          <SecretInput
            storedLength={settings?.anthropicAuthMethod !== "setup_token" ? settings?.anthropicKeyLength : undefined}
            placeholder="sk-ant-..."
            value={anthropicKey}
            onChange={setAnthropicKey}
            onDelete={settings?.anthropicAuthMethod !== "setup_token" && settings?.anthropicKeyLength ? () => togglePendingDelete("anthropic") : undefined}
            pendingDelete={pendingDeletes.has("anthropic")}
          />
        ) : (
          <div className="space-y-1.5">
            <SecretInput
              storedLength={settings?.anthropicAuthMethod === "setup_token" ? settings?.anthropicKeyLength : undefined}
              placeholder="Paste setup token..."
              value={anthropicSetupToken}
              onChange={setAnthropicSetupToken}
              onDelete={settings?.anthropicAuthMethod === "setup_token" && settings?.anthropicKeyLength ? () => togglePendingDelete("anthropic") : undefined}
              pendingDelete={pendingDeletes.has("anthropic")}
            />
            <p className="text-[9px] text-text-muted leading-relaxed">
              Run{" "}
              <CopyCode text="claude setup-token" />{" "}
              in your terminal, then paste the token above.
            </p>
          </div>
        )}
      </div>

      {/* OpenAI */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-muted">
          <svg viewBox="0 0 24 24" className="h-3.5 w-auto fill-current opacity-70" aria-hidden="true">
            <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
          </svg>
          OpenAI API Key
        </label>
        <SecretInput
          storedLength={settings?.openaiKeyLength}
          placeholder="sk-..."
          value={openaiKey}
          onChange={setOpenaiKey}
          onDelete={settings?.openaiKeyLength ? () => togglePendingDelete("openai") : undefined}
          pendingDelete={pendingDeletes.has("openai")}
        />
      </div>

      {/* Google */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-muted">
          <img src="/gemini-icon.png" alt="Google" className="h-3.5 w-auto opacity-70" aria-hidden="true" />
          Google (Gemini) API Key
        </label>
        <SecretInput
          storedLength={settings?.googleKeyLength}
          placeholder="AIza..."
          value={googleKey}
          onChange={setGoogleKey}
          onDelete={settings?.googleKeyLength ? () => togglePendingDelete("google") : undefined}
          pendingDelete={pendingDeletes.has("google")}
        />
      </div>

      {/* Save */}
      <p className="text-[9px] text-text-muted/50 leading-relaxed">
        Updating model credentials will recreate your instance. This takes about 1 minute.
      </p>
      <Button
        onClick={() => void handleSave()}
        disabled={saving || !hasChanges || (!!deploymentStatus && deploymentStatus !== "running")}
        loading={saving}
        className="w-full"
      >
        {saving ? "Saving..." : "Update Model Credentials"}
      </Button>
      {saved && (
        <p className="text-[10px] text-center text-success">
          Credentials updated. Your instance will restart shortly.
        </p>
      )}
    </div>
  );
}
