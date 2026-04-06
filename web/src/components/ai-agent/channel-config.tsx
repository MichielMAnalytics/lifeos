'use client';

import { useQuery, useMutation } from "convex/react";
import { api } from "@/lib/convex-api";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui-clawnow/button";
import { Card, CardContent } from "@/components/ui-clawnow/card";
import { SecretInput } from "@/components/ui-clawnow/secret-input";
import { capture, EVENTS } from "@/lib/analytics";

export function ChannelConfig() {
  const settings = useQuery(api.deploymentSettings.getMySettings);
  const saveSettings = useMutation(api.deploymentSettings.saveSettings);

  const [telegramToken, setTelegramToken] = useState("");
  const [discordToken, setDiscordToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasChanges = !!(telegramToken || discordToken);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    try {
      await saveSettings({
        apiKeySource: settings.apiKeySource,
        selectedModel: settings.selectedModel,
        telegramBotToken: telegramToken || undefined,
        discordBotToken: discordToken || undefined,
      });
      setTelegramToken("");
      setDiscordToken("");
      setSaved(true);
      capture(EVENTS.CREDENTIALS_UPDATED, { context: "channels" });
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error("Channel save error:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <details className="group">
      <summary className="flex items-center gap-1.5 cursor-pointer text-[10px] font-medium text-text-muted hover:text-text-muted uppercase tracking-wider select-none list-none [&::-webkit-details-marker]:hidden transition-colors">
        <ChevronDown className="size-3 transition-transform group-open:rotate-180" />
        Messaging Channels
        {(settings?.telegramBotTokenLength || settings?.discordBotTokenLength) && (
          <span className="text-[9px] normal-case tracking-normal text-text-muted/70">
            — {[
              settings?.telegramBotTokenLength ? "Telegram" : null,
              settings?.discordBotTokenLength ? "Discord" : null,
            ].filter(Boolean).join(", ")} configured
          </span>
        )}
      </summary>
      <Card className="mt-3">
        <CardContent className="pt-5 pb-5 space-y-4">
          {/* Telegram */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-muted">
              <img src="/telegram-icon.png" alt="Telegram" className="h-3.5 w-auto opacity-70" />
              Telegram Bot Token
            </label>
            <SecretInput
              storedLength={settings?.telegramBotTokenLength}
              placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
              value={telegramToken}
              onChange={setTelegramToken}
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

          {/* Discord */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-muted">
              <img src="/discord-icon.png" alt="Discord" className="h-3.5 w-auto opacity-70" />
              Discord Bot Token
            </label>
            <SecretInput
              storedLength={settings?.discordBotTokenLength}
              placeholder="MTIzNDU2Nzg5MDEyMzQ1Njc4OQ..."
              value={discordToken}
              onChange={setDiscordToken}
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

          {/* Save */}
          <p className="text-[9px] text-text-muted/80 leading-relaxed">
            Updating channel tokens will recreate your instance. This takes about 1 minute.
          </p>
          <Button
            onClick={() => void handleSave()}
            disabled={saving || !hasChanges}
            loading={saving}
            className="w-full"
          >
            {saving ? "Saving..." : "Update Channels"}
          </Button>
          {saved && (
            <p className="text-[10px] text-center text-success">
              Channel tokens updated. Your instance will restart shortly.
            </p>
          )}

          {/* Other channels */}
          <div className="border-t border-border pt-4 mt-1">
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
        </CardContent>
      </Card>
    </details>
  );
}
