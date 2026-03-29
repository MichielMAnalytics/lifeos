'use client';

import { useMutation } from "convex/react";
import { api } from "@/lib/convex-api";
import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui-clawnow/button";
import { Card, CardContent } from "@/components/ui-clawnow/card";
import { cn } from "@/lib/utils";
import { PasswordInput } from "@/components/ui-clawnow/password-input";
import { CopyCode } from "@/components/ui-clawnow/copy-code";
import { MODELS } from "@/components/ai-agent/types";
import { capture, EVENTS } from "@/lib/analytics";

export function Onboarding({ preferredPlan, preferredModel, onComplete }: { preferredPlan?: string | null; preferredModel?: string | null; onComplete?: () => void }) {
  const saveSettings = useMutation(api.deploymentSettings.saveSettings);
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [anthropicAuthMethod, setAnthropicAuthMethod] = useState<"api_key" | "setup_token">("api_key");
  const [anthropicSetupToken, setAnthropicSetupToken] = useState("");
  const [isByok, setIsByok] = useState(preferredPlan === "byok");

  // Clear consumed pref
  useEffect(() => {
    if (preferredModel) sessionStorage.removeItem("pref_model");
  }, [preferredModel]);

  const [selectedModel, setSelectedModel] = useState("claude-sonnet");
  const [telegramToken, setTelegramToken] = useState("");
  const [discordToken, setDiscordToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [skipAccepted, setSkipAccepted] = useState(false);

  const hasAnthropicCred = anthropicAuthMethod === "api_key" ? !!anthropicKey.trim() : !!anthropicSetupToken.trim();
  const hasOpenaiCred = !!openaiKey.trim();


  const handleContinue = async () => {
    setSaving(true);
    try {
      await saveSettings({
        apiKeySource: isByok ? "byok" : "ours",
        selectedModel,
        telegramBotToken: telegramToken || undefined,
        discordBotToken: discordToken || undefined,
        ...(isByok
          ? {
            openaiKey: openaiKey || undefined,
            anthropicAuthMethod,
            ...(anthropicAuthMethod === "api_key"
              ? { anthropicKey: anthropicKey || undefined }
              : { anthropicSetupToken: anthropicSetupToken || undefined }),
          }
          : {}),
      });
      capture(EVENTS.SETTINGS_SAVED, { context: "onboarding", model: selectedModel, source: isByok ? "byok" : "platform" });
      onComplete?.();
    } catch (e) {
      console.error("Save error:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      await saveSettings({
        apiKeySource: isByok ? "byok" : "ours",
        selectedModel: "claude",
      });
      capture(EVENTS.SETTINGS_SAVED, { context: "onboarding_skip" });
      onComplete?.();
    } catch (e) {
      console.error("Save error:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardContent className="pt-8 pb-8 px-6 space-y-6">
          {/* API key preference toggle */}
          <div className="space-y-2">
            <h2 className="text-lg font-medium text-text font-heading">
              Configure your instance
            </h2>
            <p className="text-xs text-text-muted leading-relaxed">
              Choose how you want to use AI models. Your agent will use Claude Sonnet 4.6 by default.
            </p>
          </div>

          <div className="flex gap-1">
            {preferredPlan === "byok" ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsByok(false)}
                  className={cn(
                    "flex-1 py-2 text-[10px] uppercase tracking-wider border rounded-md transition-colors cursor-pointer",
                    !isByok
                      ? "bg-text text-bg border-text"
                      : "bg-transparent text-text-muted border-border hover:border-text/30",
                  )}
                >
                  Use our API keys
                </button>
                <button
                  type="button"
                  onClick={() => setIsByok(true)}
                  className={cn(
                    "flex-1 py-2 text-[10px] uppercase tracking-wider border rounded-md transition-colors cursor-pointer",
                    isByok
                      ? "bg-text text-bg border-text"
                      : "bg-transparent text-text-muted border-border hover:border-text/30",
                  )}
                >
                  Bring your own keys
                </button>
              </>
            ) : null}
          </div>

          {isByok && (
            <>
              <div className="space-y-2">
                <p className="text-xs text-text-muted leading-relaxed">
                  Enter at least one API key to get started. Select a default
                  model below — you can change all of this later inside your agent instance.
                </p>
              </div>

              <div className="space-y-4">
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
                    <PasswordInput
                      placeholder="sk-ant-..."
                      value={anthropicKey}
                      onChange={(e) => setAnthropicKey(e.target.value)}
                    />
                  ) : (
                    <div className="space-y-1.5">
                      <PasswordInput
                        placeholder="Paste setup token..."
                        value={anthropicSetupToken}
                        onChange={(e) => setAnthropicSetupToken(e.target.value)}
                      />
                      <p className="text-[9px] text-text-muted leading-relaxed">
                        Run{" "}
                        <CopyCode text="claude setup-token" />{" "}
                        in your terminal, then paste the token above.
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-muted">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-auto fill-current opacity-70" aria-hidden="true">
                      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
                    </svg>
                    OpenAI API Key
                  </label>
                  <PasswordInput
                    placeholder="sk-..."
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* Model selector — Anthropic models only */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-text-muted">
              AI Model
            </label>
            <div className="grid grid-cols-3 gap-1">
              {MODELS.filter((m) => m.id.startsWith("claude")).map((model) => (
                <Button
                  key={model.id}
                  variant={selectedModel === model.id ? "default" : "outline"}
                  onClick={() => setSelectedModel(model.id)}
                  size="sm"
                  className="gap-1.5 text-[10px]"
                >
                  <img src={model.icon} alt={model.label} className="size-3" />
                  {model.label.replace("Claude ", "")}
                  {selectedModel === model.id && <Check className="size-2.5" />}
                </Button>
              ))}
            </div>
          </div>

          {/* Messaging Channels (optional) */}
          <details className="group" open>
            <summary className="flex items-center gap-1.5 cursor-pointer text-[10px] font-medium text-text-muted/60 hover:text-text-muted uppercase tracking-wider select-none list-none [&::-webkit-details-marker]:hidden transition-colors">
              <svg className="size-3 transition-transform group-open:rotate-90" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 2l4 4-4 4" /></svg>
              Messaging Channels
              <span className="text-[9px] normal-case tracking-normal text-text-muted/40">— optional</span>
            </summary>
            <div className="mt-3 space-y-3">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-muted">
                  <img src="/telegram-icon.png" alt="Telegram" className="h-3.5 w-auto opacity-70" />
                  Telegram Bot Token
                </label>
                <PasswordInput
                  placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                />
                <p className="text-[9px] text-text-muted leading-relaxed">
                  Create a bot via{" "}
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-text transition-colors"
                  >
                    @BotFather
                  </a>{" "}
                  on Telegram to get your token.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-muted">
                  <img src="/discord-icon.png" alt="Discord" className="h-3.5 w-auto opacity-70" />
                  Discord Bot Token
                </label>
                <PasswordInput
                  placeholder="MTIzNDU2Nzg5MDEyMzQ1Njc4OQ..."
                  value={discordToken}
                  onChange={(e) => setDiscordToken(e.target.value)}
                />
                <p className="text-[9px] text-text-muted leading-relaxed">
                  Create a bot in the{" "}
                  <a
                    href="https://discord.com/developers/applications"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-text transition-colors"
                  >
                    Discord Developer Portal
                  </a>. Make sure to enable{" "}
                  <strong>Message Content Intent</strong> under Bot &rarr; Privileged Gateway Intents,
                  otherwise the bot won't be able to read messages.
                </p>
              </div>
              <p className="text-[9px] text-text-muted leading-relaxed">
                The AI agent supports 20+ channels including WhatsApp, Slack, Signal, iMessage, and more.
                Configure additional channels directly from your agent instance.{" "}
                <a
                  href="https://docs.openclaw.ai/channels"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-text transition-colors"
                >
                  View all channels
                </a>
              </p>
            </div>
          </details>

          <div className="space-y-3 pt-2">
            <Button
              onClick={handleContinue}
              disabled={saving || (isByok && !hasAnthropicCred && !hasOpenaiCred)}
              loading={saving}
              className="w-full"
            >
              {saving ? "Saving..." : "Continue"}
            </Button>
            {isByok && (
              <div className="border-t border-text/5 pt-3 space-y-2">
                <label className="flex items-start gap-2 cursor-pointer group">
                  <span
                    role="checkbox"
                    aria-checked={skipAccepted}
                    tabIndex={0}
                    onClick={() => setSkipAccepted(!skipAccepted)}
                    onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setSkipAccepted(!skipAccepted); } }}
                    className={cn(
                      "mt-0.5 size-3.5 shrink-0 rounded-sm border cursor-pointer transition-colors",
                      skipAccepted
                        ? "bg-accent border-accent text-bg"
                        : "border-text-muted/40 bg-transparent",
                    )}
                  >
                    {skipAccepted && <Check className="size-3.5" />}
                  </span>
                  <span className="text-[10px] text-text-muted leading-relaxed group-hover:text-text/70 transition-colors">
                    I will set up my tokens through the agent instance itself and accept the risk of keys being compromised.
                  </span>
                </label>
                <button
                  onClick={handleSkip}
                  disabled={saving || !skipAccepted}
                  className="text-[10px] text-text-muted hover:text-text transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Skip setup
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
