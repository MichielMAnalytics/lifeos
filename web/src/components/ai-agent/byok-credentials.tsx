'use client';

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/lib/convex-api";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui-clawnow/button";
import { cn } from "@/lib/utils";
import { SecretInput } from "@/components/ui-clawnow/secret-input";
import { CopyCode } from "@/components/ui-clawnow/copy-code";
import { capture, EVENTS } from "@/lib/analytics";
import type { DeploymentStatus } from "@/components/ai-agent/types";

export function ByokCredentials({ deploymentStatus }: { deploymentStatus?: DeploymentStatus }) {
  const settings = useQuery(api.deploymentSettings.getMySettings);
  const saveSettings = useMutation(api.deploymentSettings.saveSettings);

  const [anthropicAuthMethod, setAnthropicAuthMethod] = useState<"api_key" | "setup_token">("api_key");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [anthropicSetupToken, setAnthropicSetupToken] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiAuthMethod, setOpenaiAuthMethod] = useState<"api_key" | "chatgpt_oauth">("api_key");
  const [openaiOAuthTokens, setOpenaiOAuthTokens] = useState("");
  const [googleKey, setGoogleKey] = useState("");
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings?.anthropicAuthMethod) {
      setAnthropicAuthMethod(settings.anthropicAuthMethod);
    }
  }, [settings?.anthropicAuthMethod]);

  useEffect(() => {
    if (settings?.openaiAuthMethod) {
      setOpenaiAuthMethod(settings.openaiAuthMethod);
    }
  }, [settings?.openaiAuthMethod]);

  const togglePendingDelete = (provider: string) => {
    setPendingDeletes((prev) => {
      const next = new Set(prev);
      if (next.has(provider)) next.delete(provider);
      else next.add(provider);
      return next;
    });
  };

  const hasChanges = !!(anthropicKey || anthropicSetupToken || openaiKey || openaiOAuthTokens || googleKey
    || anthropicAuthMethod !== (settings?.anthropicAuthMethod ?? "api_key")
    || openaiAuthMethod !== (settings?.openaiAuthMethod ?? "api_key")
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
        openaiAuthMethod,
        ...(openaiAuthMethod === "api_key"
          ? { openaiKey: openaiKey || undefined }
          : { openaiOAuthTokens: openaiOAuthTokens || undefined }),
        googleKey: googleKey || undefined,
        keysToDelete: pendingDeletes.size > 0 ? Array.from(pendingDeletes) : undefined,
      });
      setAnthropicKey("");
      setAnthropicSetupToken("");
      setOpenaiKey("");
      setOpenaiOAuthTokens("");
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
            onClick={() => setAnthropicAuthMethod("setup_token")}
            className={cn(
              "flex-1 py-1.5 text-[10px] uppercase tracking-wider border transition-colors cursor-pointer",
              anthropicAuthMethod === "setup_token"
                ? "bg-text text-bg border-text"
                : "bg-transparent text-text-muted border-border hover:border-text/30",
            )}
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
      <OpenAICredentialSection
        settings={settings}
        openaiAuthMethod={openaiAuthMethod}
        setOpenaiAuthMethod={setOpenaiAuthMethod}
        openaiKey={openaiKey}
        setOpenaiKey={setOpenaiKey}
        openaiOAuthTokens={openaiOAuthTokens}
        setOpenaiOAuthTokens={setOpenaiOAuthTokens}
        pendingDeletes={pendingDeletes}
        togglePendingDelete={togglePendingDelete}
        deploymentStatus={deploymentStatus}
        onSaveTokens={async (tokens: string) => {
          if (!settings) return;
          // Clear any pending openai delete to prevent race condition
          setPendingDeletes((prev) => { const next = new Set(prev); next.delete("openai"); return next; });
          setSaving(true);
          try {
            await saveSettings({
              apiKeySource: settings.apiKeySource,
              selectedModel: "gpt",
              openaiAuthMethod: "chatgpt_oauth",
              openaiOAuthTokens: tokens,
            });
            setOpenaiOAuthTokens("");
            setOpenaiAuthMethod("chatgpt_oauth");
            setSaved(true);
            capture(EVENTS.CREDENTIALS_UPDATED);
            setTimeout(() => setSaved(false), 3000);
          } catch (e) {
            console.error("Save error:", e);
          } finally {
            setSaving(false);
          }
        }}
      />

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
      <p className="text-[9px] text-text-muted/80 leading-relaxed">
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

// ── OpenAI credential section with device code OAuth flow ──

const OPENAI_SVG = (
  <svg viewBox="0 0 24 24" className="h-3.5 w-auto fill-current opacity-70" aria-hidden="true">
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
  </svg>
);

function OpenAICredentialSection({
  settings,
  openaiAuthMethod,
  setOpenaiAuthMethod,
  openaiKey,
  setOpenaiKey,
  openaiOAuthTokens,
  setOpenaiOAuthTokens,
  pendingDeletes,
  togglePendingDelete,
  deploymentStatus,
  onSaveTokens,
}: {
  settings: { openaiAuthMethod?: string; openaiKeyLength?: number } | null | undefined;
  openaiAuthMethod: "api_key" | "chatgpt_oauth";
  setOpenaiAuthMethod: (m: "api_key" | "chatgpt_oauth") => void;
  openaiKey: string;
  setOpenaiKey: (v: string) => void;
  openaiOAuthTokens: string;
  setOpenaiOAuthTokens: (v: string) => void;
  pendingDeletes: Set<string>;
  togglePendingDelete: (p: string) => void;
  deploymentStatus?: DeploymentStatus;
  onSaveTokens: (tokens: string) => Promise<void>;
}) {
  const initiateDeviceCode = useAction(api.openaiDeviceAuth.initiateDeviceCode);
  const pollDeviceCode = useAction(api.openaiDeviceAuth.pollDeviceCode);

  const [deviceFlow, setDeviceFlow] = useState<{
    deviceAuthId: string;
    userCode: string;
    interval: number;
    verificationUrl: string;
  } | null>(null);
  const [deviceFlowStatus, setDeviceFlowStatus] = useState<"idle" | "initiating" | "waiting" | "complete" | "error">("idle");
  const [copiedCode, setCopiedCode] = useState(false);
  const [deviceFlowError, setDeviceFlowError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isConnected = settings?.openaiAuthMethod === "chatgpt_oauth" && !!settings?.openaiKeyLength;

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => stopPolling, [stopPolling]);

  const startDeviceCodeFlow = async () => {
    setDeviceFlowStatus("initiating");
    setDeviceFlowError(null);
    stopPolling();

    try {
      const result = await initiateDeviceCode({});
      setDeviceFlow(result);
      setDeviceFlowStatus("waiting");

      // Start polling
      pollRef.current = setInterval(async () => {
        try {
          const poll = await pollDeviceCode({
            deviceAuthId: result.deviceAuthId,
            userCode: result.userCode,
          });
          if (poll.status === "complete") {
            stopPolling();
            setDeviceFlowStatus("complete");
            await onSaveTokens(poll.tokens);
            setDeviceFlow(null);
          }
        } catch (err) {
          stopPolling();
          setDeviceFlowStatus("error");
          setDeviceFlowError(err instanceof Error ? err.message : "Polling failed");
        }
      }, (result.interval || 5) * 1000);
    } catch (err) {
      setDeviceFlowStatus("error");
      setDeviceFlowError(err instanceof Error ? err.message : "Failed to start device code flow");
    }
  };

  const cancelDeviceCodeFlow = () => {
    stopPolling();
    setDeviceFlow(null);
    setDeviceFlowStatus("idle");
    setDeviceFlowError(null);
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-muted">
        {OPENAI_SVG}
        OpenAI
      </label>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => { setOpenaiAuthMethod("chatgpt_oauth"); cancelDeviceCodeFlow(); }}
          className={cn(
            "flex-1 py-1.5 text-[10px] uppercase tracking-wider border transition-colors cursor-pointer",
            openaiAuthMethod === "chatgpt_oauth"
              ? "bg-text text-bg border-text"
              : "bg-transparent text-text-muted border-border hover:border-text/30",
          )}
        >
          ChatGPT subscription
        </button>
        <button
          type="button"
          onClick={() => { setOpenaiAuthMethod("api_key"); cancelDeviceCodeFlow(); }}
          className={cn(
            "flex-1 py-1.5 text-[10px] uppercase tracking-wider border transition-colors cursor-pointer",
            openaiAuthMethod === "api_key"
              ? "bg-text text-bg border-text"
              : "bg-transparent text-text-muted border-border hover:border-text/30",
          )}
        >
          API Key
        </button>
      </div>

      {openaiAuthMethod === "api_key" ? (
        <SecretInput
          storedLength={settings?.openaiAuthMethod !== "chatgpt_oauth" ? settings?.openaiKeyLength : undefined}
          placeholder="sk-..."
          value={openaiKey}
          onChange={setOpenaiKey}
          onDelete={settings?.openaiAuthMethod !== "chatgpt_oauth" && settings?.openaiKeyLength ? () => togglePendingDelete("openai") : undefined}
          pendingDelete={pendingDeletes.has("openai")}
        />
      ) : (
        <div className="space-y-2">
          {isConnected && deviceFlowStatus === "idle" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded border border-success/30 bg-success/5 px-3 py-2">
                <span className="text-[11px] text-success font-medium">ChatGPT connected</span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => void startDeviceCodeFlow()}
                    className="text-[10px] text-text-muted hover:text-text transition-colors cursor-pointer"
                  >
                    Reconnect
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePendingDelete("openai")}
                    className={cn(
                      "text-[10px] transition-colors",
                      pendingDeletes.has("openai") ? "text-danger" : "text-text-muted hover:text-danger",
                    )}
                  >
                    {pendingDeletes.has("openai") ? "Undo disconnect" : "Disconnect"}
                  </button>
                </div>
              </div>
            </div>
          ) : deviceFlowStatus === "idle" || deviceFlowStatus === "error" ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => void startDeviceCodeFlow()}
                disabled={!!deploymentStatus && deploymentStatus !== "running"}
                className="w-full rounded border border-border bg-surface hover:bg-surface-hover transition-colors px-3 py-2.5 text-[11px] font-medium text-text cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Connect ChatGPT account
              </button>
              {deviceFlowError && (
                <p className="text-[10px] text-danger leading-relaxed">{deviceFlowError}</p>
              )}
              <p className="text-[9px] text-text-muted leading-relaxed">
                Uses your ChatGPT Plus, Pro, or Team subscription. No API costs.
              </p>
            </div>
          ) : deviceFlowStatus === "initiating" ? (
            <div className="rounded border border-border bg-surface px-3 py-3 text-center">
              <p className="text-[11px] text-text-muted">Starting authentication...</p>
            </div>
          ) : deviceFlowStatus === "waiting" && deviceFlow ? (
            <div className="rounded border border-accent/30 bg-accent/5 px-3 py-3 space-y-2.5">
              <p className="text-[11px] text-text leading-relaxed text-center">
                Enter code at OpenAI:
              </p>
              <div className="flex justify-center">
                <code
                  onClick={() => { navigator.clipboard.writeText(deviceFlow.userCode); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }}
                  className="px-4 py-2 rounded-lg bg-bg border border-border text-lg font-mono font-bold text-text tracking-widest cursor-pointer hover:bg-surface-hover transition-colors"
                  title="Click to copy"
                >
                  {copiedCode ? "Copied!" : deviceFlow.userCode}
                </code>
              </div>
              <div className="flex justify-center">
                <a
                  href={deviceFlow.verificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => { navigator.clipboard.writeText(deviceFlow.userCode); }}
                  className="inline-flex items-center gap-1.5 rounded bg-text text-bg px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider hover:opacity-90 transition-opacity"
                >
                  Open OpenAI
                  <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current" aria-hidden="true">
                    <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </a>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <p className="text-[10px] text-text-muted">Waiting for sign-in...</p>
              </div>
              <button
                type="button"
                onClick={cancelDeviceCodeFlow}
                className="block mx-auto text-[10px] text-text-muted hover:text-text transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : deviceFlowStatus === "complete" ? (
            <div className="rounded border border-success/30 bg-success/5 px-3 py-2 text-center">
              <p className="text-[11px] text-success font-medium">Connected! Saving credentials...</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
