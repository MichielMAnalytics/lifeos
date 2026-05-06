'use client';

// ChatGPT subscription connect/disconnect for the Life Coach tab.
//
// This is the single OpenAI BYOK path lifeai still surfaces after the
// Model-credentials section was retired (e4acc79). The full BYOK form
// (Anthropic / OpenAI key / Google / Moonshot / MiniMax) lives in
// /onboarding/byok via byok-credentials.tsx; here we only expose the
// OAuth flow that lets the pod use Kemp's existing ChatGPT subscription
// instead of metered API spend.

import { useQuery, useMutation, useAction } from 'convex/react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '@/lib/convex-api';
import type { DeploymentStatus } from '@/components/ai-agent/types';
import { cn } from '@/lib/utils';

export function ChatGptSubscription({ deploymentStatus }: { deploymentStatus?: DeploymentStatus }) {
  const settings = useQuery(api.deploymentSettings.getMySettings);
  const saveSettings = useMutation(api.deploymentSettings.saveSettings);
  const initiateDeviceCode = useAction(api.openaiDeviceAuth.initiateDeviceCode);
  const pollDeviceCode = useAction(api.openaiDeviceAuth.pollDeviceCode);

  const [deviceFlow, setDeviceFlow] = useState<{
    deviceAuthId: string;
    userCode: string;
    interval: number;
    verificationUrl: string;
  } | null>(null);
  const [status, setStatus] = useState<'idle' | 'initiating' | 'waiting' | 'complete' | 'error' | 'disconnecting'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const isConnected = settings?.openaiAuthMethod === 'chatgpt_oauth' && !!settings?.openaiKeyLength;

  const startDeviceCodeFlow = async () => {
    if (!settings) return;
    setStatus('initiating');
    setError(null);
    stopPolling();
    try {
      const result = await initiateDeviceCode({});
      setDeviceFlow(result);
      setStatus('waiting');
      pollRef.current = setInterval(async () => {
        try {
          const poll = await pollDeviceCode({
            deviceAuthId: result.deviceAuthId,
            userCode: result.userCode,
          });
          if (poll.status === 'complete') {
            stopPolling();
            await saveSettings({
              apiKeySource: settings.apiKeySource,
              selectedModel: settings.selectedModel,
              openaiAuthMethod: 'chatgpt_oauth',
              openaiOAuthTokens: poll.tokens,
            });
            setDeviceFlow(null);
            setStatus('idle');
          }
        } catch (err) {
          stopPolling();
          setStatus('error');
          setError(err instanceof Error ? err.message : 'Polling failed');
        }
      }, (result.interval || 5) * 1000);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to start device code flow');
    }
  };

  const cancelDeviceCodeFlow = () => {
    stopPolling();
    setDeviceFlow(null);
    setStatus('idle');
    setError(null);
  };

  const disconnect = async () => {
    if (!settings) return;
    setStatus('disconnecting');
    setError(null);
    try {
      await saveSettings({
        apiKeySource: settings.apiKeySource,
        selectedModel: settings.selectedModel,
        keysToDelete: ['openai'],
      });
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Disconnect failed');
    }
  };

  const podBlocking = !!deploymentStatus && deploymentStatus !== 'running';

  if (!settings) {
    return (
      <div className="border border-border">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-xs font-medium text-text">ChatGPT subscription</p>
        </div>
        <div className="p-4">
          <p className="text-xs text-text-muted animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border">
      <div className="px-5 py-3 border-b border-border">
        <p className="text-xs font-medium text-text">ChatGPT subscription</p>
      </div>
      <div className="p-4 space-y-3">
        {isConnected && status === 'idle' ? (
          <div className="flex items-center justify-between rounded border border-success/30 bg-success/5 px-3 py-2">
            <span className="text-[11px] text-success font-medium">ChatGPT connected</span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => void startDeviceCodeFlow()}
                disabled={podBlocking}
                className="text-[10px] text-text-muted hover:text-text transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Reconnect
              </button>
              <button
                type="button"
                onClick={() => void disconnect()}
                className="text-[10px] text-text-muted hover:text-danger transition-colors cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : status === 'idle' || status === 'error' ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => void startDeviceCodeFlow()}
              disabled={podBlocking}
              className="w-full rounded border border-border bg-surface hover:bg-surface-hover transition-colors px-3 py-2.5 text-[11px] font-medium text-text cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isConnected ? 'Reconnect ChatGPT account' : 'Connect ChatGPT account'}
            </button>
            {error && <p className="text-[10px] text-danger leading-relaxed">{error}</p>}
            <p className="text-[9px] text-text-muted leading-relaxed">
              Uses your ChatGPT Plus / Pro / Team subscription instead of metered
              API spend. Disconnect to switch accounts or fall back to platform credits.
            </p>
          </div>
        ) : status === 'initiating' ? (
          <div className="rounded border border-border bg-surface px-3 py-3 text-center">
            <p className="text-[11px] text-text-muted">Starting authentication...</p>
          </div>
        ) : status === 'disconnecting' ? (
          <div className="rounded border border-border bg-surface px-3 py-3 text-center">
            <p className="text-[11px] text-text-muted">Disconnecting...</p>
          </div>
        ) : status === 'waiting' && deviceFlow ? (
          <div className="rounded border border-accent/30 bg-accent/5 px-3 py-3 space-y-2.5">
            <p className="text-[11px] text-text leading-relaxed text-center">
              Enter code at OpenAI:
            </p>
            <div className="flex justify-center">
              <code
                onClick={() => {
                  navigator.clipboard.writeText(deviceFlow.userCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-4 py-2 rounded-lg bg-bg border border-border text-lg font-mono font-bold text-text tracking-widest cursor-pointer hover:bg-surface-hover transition-colors"
                title="Click to copy"
              >
                {copied ? 'Copied!' : deviceFlow.userCode}
              </code>
            </div>
            <div className="flex justify-center">
              <a
                href={deviceFlow.verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  navigator.clipboard.writeText(deviceFlow.userCode);
                }}
                className="inline-flex items-center gap-1.5 rounded bg-text text-bg px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider hover:opacity-90 transition-opacity"
              >
                Open OpenAI
                <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current" aria-hidden="true">
                  <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" />
                </svg>
              </a>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className={cn('inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse')} />
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
        ) : status === 'complete' ? (
          <div className="rounded border border-success/30 bg-success/5 px-3 py-2 text-center">
            <p className="text-[11px] text-success font-medium">Connected! Saving credentials...</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
