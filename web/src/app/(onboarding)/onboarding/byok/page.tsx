'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAction } from 'convex/react';
import { api } from '@/lib/convex-api';
import { StepContainer } from '@/components/onboarding/step-container';
import { getOnboardingState, setOnboardingState, onboardingPath } from '@/lib/onboarding-store';

type OpenaiAuthOption = 'api_key' | 'chatgpt_oauth';

export default function ByokPage() {
  const [apiKey, setApiKey] = useState('');
  const [openaiMethod, setOpenaiMethod] = useState<OpenaiAuthOption>('chatgpt_oauth');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiOAuthTokens, setOpenaiOAuthTokens] = useState('');
  const [expandedSection, setExpandedSection] = useState<'openai' | 'claude'>('openai');

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
    setApiKey(state.anthropicApiKey);
    setOpenaiMethod(state.openaiAuthMethod);
    setOpenaiApiKey(state.openaiApiKey);
    setOpenaiOAuthTokens(state.openaiOAuthTokens);
  }, []);

  function handleContinue() {
    setOnboardingState({
      anthropicAuthMethod: 'api_key',
      anthropicApiKey: apiKey,
      anthropicSetupToken: '',
      openaiAuthMethod: openaiMethod,
      openaiApiKey: openaiApiKey,
      openaiOAuthTokens: openaiOAuthTokens,
    });
    window.location.href = onboardingPath('/onboarding/use-cases');
  }

  const hasValidAnthropic = apiKey.trim().length >= 10;
  const hasValidOpenai = openaiMethod === 'chatgpt_oauth'
    ? !!openaiOAuthTokens.trim()
    : openaiApiKey.trim().startsWith('sk-');
  const isValid = hasValidAnthropic || hasValidOpenai;

  return (
    <StepContainer backHref="/onboarding/plans">
      <div className="flex flex-col items-center text-center w-full max-w-md animate-fade-in">
        <h1 className="text-3xl font-light tracking-tight text-text sm:text-4xl">
          Connect your <span className="font-semibold">AI account</span>
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-text-muted max-w-sm">
          Link your ChatGPT or Claude account to power your Life Coach.
        </p>

        <div className="mt-8 w-full space-y-3">
          {/* ── OpenAI Section ── */}
          <div className={`rounded-2xl border-2 transition-all duration-200 ${
            expandedSection === 'openai'
              ? 'border-accent bg-accent/[0.03]'
              : 'border-border/40 bg-surface/10 hover:border-border/60'
          }`}>
            <button
              onClick={() => setExpandedSection('openai')}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-[#10a37f]/10 flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#10a37f"><path d="M22.28 9.37a5.78 5.78 0 0 0-.5-4.74 5.86 5.86 0 0 0-6.32-2.83A5.79 5.79 0 0 0 1.18 4.6a5.78 5.78 0 0 0 .5 4.74 5.86 5.86 0 0 0 6.32 2.83A5.79 5.79 0 0 0 22.28 9.37Z"/></svg>
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold text-text block">OpenAI</span>
                <span className="text-xs text-text-muted/70">Connect your ChatGPT account</span>
              </div>
              {hasValidOpenai && (
                <span className="text-xs text-green-500 font-medium">Connected</span>
              )}
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className={`text-text-muted/70 transition-transform duration-200 shrink-0 ${expandedSection === 'openai' ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {expandedSection === 'openai' && (
              <div className="px-4 pb-4 space-y-4">
                {/* Method cards — ChatGPT Subscription on LEFT */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setOpenaiMethod('chatgpt_oauth')}
                    className={`rounded-xl border-2 p-3 text-center transition-all duration-200 ${
                      openaiMethod === 'chatgpt_oauth'
                        ? 'border-accent bg-accent/[0.05]'
                        : 'border-border/40 bg-surface/10'
                    }`}
                  >
                    <span className="text-xs font-semibold text-text block">ChatGPT Subscription</span>
                    <span className="text-[10px] text-text-muted/70 block mt-0.5">Plus or Pro plan</span>
                  </button>
                  <button
                    disabled
                    className="rounded-xl border-2 p-3 text-center border-border/20 bg-surface/5 opacity-40 cursor-not-allowed"
                  >
                    <span className="text-xs font-semibold text-text block">API Key</span>
                    <span className="text-[10px] text-text-muted/70 block mt-0.5">Pay-per-use</span>
                  </button>
                </div>

                {/* ChatGPT OAuth flow */}
                {openaiMethod === 'chatgpt_oauth' && (
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
                            className="w-full rounded-xl border-2 border-accent/40 bg-accent/[0.05] px-4 py-2.5 text-xs font-semibold text-text hover:bg-accent/10 transition-colors cursor-pointer"
                          >
                            Connect ChatGPT account
                          </button>
                        )}
                        {deviceError && (
                          <p className="text-[11px] text-red-500 leading-relaxed">{deviceError}</p>
                        )}
                        <p className="text-[10px] text-text-muted/70 text-center">Uses your ChatGPT subscription. No API costs.</p>
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
                          <a href={deviceFlow.verificationUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-text text-bg px-4 py-2 text-xs font-medium hover:opacity-90 transition-opacity"
                          >
                            Open OpenAI
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
            )}
          </div>

          {/* ── Claude Section ── */}
          <div className={`rounded-2xl border-2 transition-all duration-200 ${
            expandedSection === 'claude'
              ? 'border-accent bg-accent/[0.03]'
              : 'border-border/40 bg-surface/10 hover:border-border/60'
          }`}>
            <button
              onClick={() => setExpandedSection('claude')}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-[#d4a27f]/10 flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#d4a27f"><circle cx="12" cy="12" r="10"/></svg>
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold text-text block">Claude</span>
                <span className="text-xs text-text-muted/70">Connect with an API key</span>
              </div>
              {hasValidAnthropic && (
                <span className="text-xs text-green-500 font-medium">Connected</span>
              )}
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className={`text-text-muted/70 transition-transform duration-200 shrink-0 ${expandedSection === 'claude' ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {expandedSection === 'claude' && (
              <div className="px-4 pb-4 space-y-3">
                <div>
                  <label className="text-xs font-medium text-text mb-2 block">API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    autoComplete="off"
                    className="w-full rounded-xl border border-border/60 bg-surface/30 px-4 py-3 text-sm text-text font-mono placeholder:text-text-muted focus:border-accent/50 focus:outline-none transition-colors"
                  />
                </div>
                <div className="rounded-xl border border-border/40 bg-surface/20 p-4 text-xs text-text-muted/80">
                  <ol className="space-y-2">
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
              </div>
            )}
          </div>
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
