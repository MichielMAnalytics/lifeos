'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAction } from 'convex/react';
import { api } from '@/lib/convex-api';
import { StepContainer } from '@/components/onboarding/step-container';
import { getOnboardingState, setOnboardingState, onboardingPath } from '@/lib/onboarding-store';

type AuthOption = 'setup_token' | 'api_key';
type OpenaiAuthOption = 'api_key' | 'chatgpt_oauth';

export default function ByokKeyPage() {
  const [method, setMethod] = useState<AuthOption>('api_key');
  const [apiKey, setApiKey] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [hasClaudeCode, setHasClaudeCode] = useState(true);
  const [openaiMethod, setOpenaiMethod] = useState<OpenaiAuthOption>('api_key');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiOAuthTokens, setOpenaiOAuthTokens] = useState('');

  // Device code flow
  const initiateDeviceCode = useAction(api.openaiDeviceAuth.initiateDeviceCode);
  const pollDeviceCodeAction = useAction(api.openaiDeviceAuth.pollDeviceCode);
  const [deviceFlow, setDeviceFlow] = useState<{ deviceAuthId: string; userCode: string; interval: number; verificationUrl: string } | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<'idle' | 'initiating' | 'waiting' | 'complete' | 'error'>('idle');
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopPolling = useCallback(() => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } }, []);
  useEffect(() => stopPolling, [stopPolling]);

  const startDeviceCodeFlow = async () => {
    setDeviceStatus('initiating');
    setDeviceError(null);
    stopPolling();
    try {
      const result = await initiateDeviceCode({});
      setDeviceFlow(result);
      setDeviceStatus('waiting');
      pollRef.current = setInterval(async () => {
        try {
          const poll = await pollDeviceCodeAction({ deviceAuthId: result.deviceAuthId, userCode: result.userCode });
          if (poll.status === 'complete') {
            stopPolling();
            setDeviceStatus('complete');
            setOpenaiOAuthTokens(poll.tokens);
          }
        } catch (err) {
          stopPolling();
          setDeviceStatus('error');
          setDeviceError(err instanceof Error ? err.message : 'Polling failed');
        }
      }, (result.interval || 5) * 1000);
    } catch (err) {
      setDeviceStatus('error');
      setDeviceError(err instanceof Error ? err.message : 'Failed to start');
    }
  };

  const cancelDeviceCodeFlow = () => {
    stopPolling();
    setDeviceFlow(null);
    setDeviceStatus('idle');
    setDeviceError(null);
  };

  useEffect(() => {
    const state = getOnboardingState();
    setMethod(state.anthropicAuthMethod);
    setApiKey(state.anthropicApiKey);
    setSetupToken(state.anthropicSetupToken);
    setOpenaiMethod(state.openaiAuthMethod);
    setOpenaiApiKey(state.openaiApiKey);
    setOpenaiOAuthTokens(state.openaiOAuthTokens);
  }, []);

  function handleContinue() {
    setOnboardingState({
      anthropicAuthMethod: method,
      anthropicApiKey: apiKey,
      anthropicSetupToken: setupToken,
      openaiAuthMethod: openaiMethod,
      openaiApiKey: openaiApiKey,
      openaiOAuthTokens: openaiOAuthTokens,
    });
    window.location.href = onboardingPath('/onboarding/channels');
  }

  const hasValidAnthropic = method === 'api_key'
    ? apiKey.trim().startsWith('sk-ant-')
    : !!setupToken.trim();

  const hasValidOpenai = openaiMethod === 'api_key'
    ? openaiApiKey.trim().startsWith('sk-')
    : !!openaiOAuthTokens.trim();

  const isValid = hasValidAnthropic || hasValidOpenai;

  return (
    <StepContainer backHref="/onboarding/plans">
      <div className="flex flex-col items-center text-center w-full max-w-md animate-fade-in">
        <h1 className="text-3xl font-light tracking-tight text-text sm:text-4xl">
          Connect your <span className="font-semibold">Anthropic account</span>
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-text-muted max-w-sm">
          Choose how you&apos;d like to connect your Claude account.
        </p>

        {/* Method cards */}
        <div className="mt-8 grid grid-cols-2 gap-3 w-full">
          <button
            onClick={() => setMethod('setup_token')}
            className={`rounded-2xl border-2 p-4 text-center transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
              method === 'setup_token'
                ? 'border-accent bg-accent/[0.05]'
                : 'border-border/40 bg-surface/10 hover:border-border/60'
            }`}
          >
            <span className="text-sm font-semibold text-text block">Claude Subscription</span>
            <span className="text-[11px] text-text-muted/70 block mt-1">Pro or Max plan</span>
          </button>
          <button
            onClick={() => setMethod('api_key')}
            className={`rounded-2xl border-2 p-4 text-center transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
              method === 'api_key'
                ? 'border-accent bg-accent/[0.05]'
                : 'border-border/40 bg-surface/10 hover:border-border/60'
            }`}
          >
            <span className="text-sm font-semibold text-text block">API Key</span>
            <span className="text-[11px] text-text-muted/70 block mt-1">Pay-per-use</span>
          </button>
        </div>

        {/* Input + instructions */}
        <div className="mt-6 w-full text-left">
          {method === 'setup_token' ? (
            <>
              <label className="text-xs font-medium text-text mb-2 block">Setup Token</label>
              <input
                type="password"
                value={setupToken}
                onChange={(e) => setSetupToken(e.target.value)}
                placeholder="sk-ant-oat01-..."
                autoComplete="off"
                className="w-full rounded-xl border border-border/60 bg-surface/30 px-4 py-3 text-sm text-text font-mono placeholder:text-text-muted focus:border-accent/50 focus:outline-none transition-colors"
              />
              <div className="mt-3 rounded-xl border border-border/40 bg-surface/20 p-4 text-xs text-text-muted/80">
                {/* Toggle: already have Claude Code? */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-text">Do you have Claude Code installed?</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setHasClaudeCode(true)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${hasClaudeCode ? 'bg-accent/15 text-accent' : 'text-text-muted/80 hover:text-text-muted'}`}
                    >Yes</button>
                    <button
                      onClick={() => setHasClaudeCode(false)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${!hasClaudeCode ? 'bg-accent/15 text-accent' : 'text-text-muted/80 hover:text-text-muted'}`}
                    >No</button>
                  </div>
                </div>

                <ol className="space-y-2 text-text-muted/80">
                  {!hasClaudeCode && (
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <div>
                        <span>Install Claude Code:</span>
                        <code
                          onClick={() => navigator.clipboard.writeText('curl -fsSL https://claude.ai/install.sh | bash')}
                          className="mt-1 block w-full px-3 py-2 rounded-lg bg-bg border border-border/30 text-text text-[11px] font-mono cursor-pointer hover:bg-surface-hover transition-colors"
                          title="Click to copy"
                        >curl -fsSL https://claude.ai/install.sh | bash</code>
                      </div>
                    </li>
                  )}
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{hasClaudeCode ? '1' : '2'}</span>
                    <div>
                      <span>Run in your terminal:</span>
                      <code
                        onClick={() => navigator.clipboard.writeText('claude setup-token')}
                        className="mt-1 block w-full px-3 py-2 rounded-lg bg-bg border border-border/30 text-text text-[11px] font-mono cursor-pointer hover:bg-surface-hover transition-colors"
                        title="Click to copy"
                      >claude setup-token</code>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{hasClaudeCode ? '2' : '3'}</span>
                    <span>Sign in when your browser opens, then copy the token</span>
                  </li>
                </ol>
                <p className="mt-3 text-[10px] text-text-muted/70">Uses your existing Claude subscription — no extra costs.</p>
              </div>
            </>
          ) : (
            <>
              <label className="text-xs font-medium text-text mb-2 block">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                autoComplete="off"
                className="w-full rounded-xl border border-border/60 bg-surface/30 px-4 py-3 text-sm text-text font-mono placeholder:text-text-muted focus:border-accent/50 focus:outline-none transition-colors"
              />
              <div className="mt-3 rounded-xl border border-border/40 bg-surface/20 p-4 text-xs text-text-muted/80">
                <ol className="space-y-2 text-text-muted/80">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>Go to <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">console.anthropic.com/keys</a></span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>Click <strong className="text-text">Create Key</strong> and copy it</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span>Paste it above</span>
                  </li>
                </ol>
                <p className="mt-3 text-[10px] text-text-muted/70">Your key is encrypted and never stored in plain text.</p>
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="mt-10 w-full flex items-center gap-3">
          <div className="h-px flex-1 bg-border/30" />
          <span className="text-xs text-text-muted/50 font-medium">also connect</span>
          <div className="h-px flex-1 bg-border/30" />
        </div>

        {/* OpenAI section */}
        <div className="mt-8 w-full text-center">
          <h2 className="text-xl font-light tracking-tight text-text">
            Connect your <span className="font-semibold">OpenAI account</span>
          </h2>
          <p className="mt-1 text-xs text-text-muted/60">(optional)</p>
        </div>

        {/* OpenAI method cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 w-full">
          <button
            onClick={() => setOpenaiMethod('api_key')}
            className={`rounded-2xl border-2 p-4 text-center transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
              openaiMethod === 'api_key'
                ? 'border-accent bg-accent/[0.05]'
                : 'border-border/40 bg-surface/10 hover:border-border/60'
            }`}
          >
            <span className="text-sm font-semibold text-text block">API Key</span>
            <span className="text-[11px] text-text-muted/70 block mt-1">Pay-per-use</span>
          </button>
          <button
            onClick={() => setOpenaiMethod('chatgpt_oauth')}
            className={`rounded-2xl border-2 p-4 text-center transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
              openaiMethod === 'chatgpt_oauth'
                ? 'border-accent bg-accent/[0.05]'
                : 'border-border/40 bg-surface/10 hover:border-border/60'
            }`}
          >
            <span className="text-sm font-semibold text-text block">ChatGPT Subscription</span>
            <span className="text-[11px] text-text-muted/70 block mt-1">Plus or Pro plan</span>
          </button>
        </div>

        {/* OpenAI input + instructions */}
        <div className="mt-6 w-full text-left">
          {openaiMethod === 'api_key' ? (
            <>
              <label className="text-xs font-medium text-text mb-2 block">API Key</label>
              <input
                type="password"
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                placeholder="sk-proj-..."
                autoComplete="off"
                className="w-full rounded-xl border border-border/60 bg-surface/30 px-4 py-3 text-sm text-text font-mono placeholder:text-text-muted/30 focus:border-accent/50 focus:outline-none transition-colors"
              />
              <div className="mt-3 rounded-xl border border-border/40 bg-surface/20 p-4 text-xs text-text-muted/80">
                <ol className="space-y-2 text-text-muted/80">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>Go to <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">platform.openai.com/api-keys</a></span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>Click <strong className="text-text">Create new secret key</strong> and copy it</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span>Paste it above</span>
                  </li>
                </ol>
                <p className="mt-3 text-[10px] text-text-muted/70">Your key is encrypted and never stored in plain text.</p>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {deviceStatus === 'idle' || deviceStatus === 'error' ? (
                <>
                  {openaiOAuthTokens ? (
                    <div className="rounded-xl border border-green-500/30 bg-green-500/5 px-4 py-3 text-center">
                      <p className="text-sm font-medium text-green-600">ChatGPT connected</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => void startDeviceCodeFlow()}
                      className="w-full rounded-xl border border-border/60 bg-surface/30 px-4 py-3 text-sm font-medium text-text hover:bg-surface/50 transition-colors cursor-pointer"
                    >
                      Connect ChatGPT account
                    </button>
                  )}
                  {deviceError && (
                    <p className="text-[11px] text-red-500 leading-relaxed">{deviceError}</p>
                  )}
                  <p className="text-[10px] text-text-muted/70">Uses your ChatGPT Plus, Pro, or Team subscription. No API costs.</p>
                </>
              ) : deviceStatus === 'initiating' ? (
                <div className="rounded-xl border border-border/40 bg-surface/20 px-4 py-4 text-center">
                  <p className="text-sm text-text-muted">Starting authentication...</p>
                </div>
              ) : deviceStatus === 'waiting' && deviceFlow ? (
                <div className="rounded-xl border-2 border-accent/30 bg-accent/5 px-4 py-4 space-y-3 text-center">
                  <p className="text-sm text-text">Enter this code at OpenAI:</p>
                  <code
                    onClick={() => navigator.clipboard.writeText(deviceFlow.userCode)}
                    className="inline-block px-5 py-2.5 rounded-lg bg-bg border border-border text-xl font-mono font-bold text-text tracking-widest cursor-pointer hover:bg-surface-hover transition-colors"
                    title="Click to copy"
                  >
                    {deviceFlow.userCode}
                  </code>
                  <div>
                    <a
                      href={deviceFlow.verificationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-text text-bg px-4 py-2 text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      Open OpenAI
                      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current"><path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" /></svg>
                    </a>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <p className="text-[11px] text-text-muted">Waiting for sign-in...</p>
                  </div>
                  <button onClick={cancelDeviceCodeFlow} className="text-[11px] text-text-muted hover:text-text transition-colors cursor-pointer">Cancel</button>
                </div>
              ) : deviceStatus === 'complete' ? (
                <div className="rounded-xl border border-green-500/30 bg-green-500/5 px-4 py-3 text-center">
                  <p className="text-sm font-medium text-green-600">ChatGPT connected</p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <button
          onClick={handleContinue}
          disabled={!isValid}
          className={`mt-8 w-full rounded-lg px-8 py-3 text-sm font-medium transition-all duration-200 ${
            isValid
              ? 'bg-accent text-bg hover:opacity-90 active:scale-[0.98] shadow-sm'
              : 'bg-text-muted/10 text-text-muted/70 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </StepContainer>
  );
}
