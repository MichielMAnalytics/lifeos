'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StepContainer } from '@/components/onboarding/step-container';
import { getOnboardingState, setOnboardingState, onboardingPath } from '@/lib/onboarding-store';

export default function ByokKeyPage() {
  const router = useRouter();

  const [anthropicAuthMethod, setAnthropicAuthMethod] = useState<'api_key' | 'setup_token'>('setup_token');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [anthropicSetupToken, setAnthropicSetupToken] = useState('');

  // Hydrate from store on mount
  useEffect(() => {
    const state = getOnboardingState();
    setAnthropicAuthMethod(state.anthropicAuthMethod);
    setAnthropicApiKey(state.anthropicApiKey);
    setAnthropicSetupToken(state.anthropicSetupToken);
  }, []);

  function handleContinue() {
    setOnboardingState({
      anthropicAuthMethod,
      anthropicApiKey,
      anthropicSetupToken,
    });
    router.push(onboardingPath('/onboarding/channels'));
  }

  const isValid =
    anthropicAuthMethod === 'api_key'
      ? anthropicApiKey.trim().startsWith('sk-ant-')
      : !!anthropicSetupToken.trim();

  return (
    <StepContainer onBack={() => { router.push(onboardingPath('/onboarding/plans')); }}>
      <div className="flex flex-col items-center text-center w-full max-w-lg">
        <h1 className="text-3xl font-light tracking-tight text-text sm:text-4xl">
          Your <span className="font-semibold">Anthropic credentials</span>
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-text-muted/70 max-w-sm">
          Your Life Coach is powered by Claude. Connect your Anthropic account
          and you&apos;ll only pay for what you use — no credit limits.
        </p>

        <div className="mt-8 w-full max-w-md">
          {/* Tab toggle */}
          <div className="flex rounded-lg overflow-hidden border border-border/60 mb-5">
            <button
              onClick={() => setAnthropicAuthMethod('setup_token')}
              className={`flex-1 py-2.5 text-[10px] uppercase tracking-wider font-medium transition-colors ${
                anthropicAuthMethod === 'setup_token'
                  ? 'bg-text text-bg'
                  : 'bg-transparent text-text-muted hover:text-text'
              }`}
            >
              Claude Subscription
            </button>
            <button
              onClick={() => setAnthropicAuthMethod('api_key')}
              className={`flex-1 py-2.5 text-[10px] uppercase tracking-wider font-medium transition-colors ${
                anthropicAuthMethod === 'api_key'
                  ? 'bg-text text-bg'
                  : 'bg-transparent text-text-muted hover:text-text'
              }`}
            >
              API Key
            </button>
          </div>

          {anthropicAuthMethod === 'api_key' ? (
            <div className="text-left">
              <input
                type="password"
                value={anthropicApiKey}
                onChange={(e) => setAnthropicApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                autoComplete="off"
                className="w-full rounded-xl border border-border/60 bg-surface/30 px-4 py-3 text-sm text-text font-mono placeholder:text-text-muted/25 focus:border-accent/50 focus:outline-none transition-colors"
              />
              <p className="mt-2 text-[11px] text-text-muted/40">
                Get your key at{' '}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted/60 underline underline-offset-2 hover:text-text-muted"
                >
                  console.anthropic.com
                </a>
                . Your key is encrypted and never stored in plain text.
              </p>
            </div>
          ) : (
            <div className="text-left">
              <input
                type="password"
                value={anthropicSetupToken}
                onChange={(e) => setAnthropicSetupToken(e.target.value)}
                placeholder="Paste setup token..."
                autoComplete="off"
                className="w-full rounded-xl border border-border/60 bg-surface/30 px-4 py-3 text-sm text-text font-mono placeholder:text-text-muted/25 focus:border-accent/50 focus:outline-none transition-colors"
              />
              <p className="mt-2 text-[11px] text-text-muted/40">
                Run{' '}
                <code
                  onClick={() => { navigator.clipboard.writeText('claude setup-token'); }}
                  className="px-1.5 py-0.5 rounded bg-surface text-text-muted/70 text-[10px] cursor-pointer hover:text-text-muted hover:bg-surface-hover transition-colors"
                  title="Click to copy"
                >claude setup-token</code>
                {' '}in your terminal, then paste the token above.
              </p>
            </div>
          )}
        </div>

        <div className="mt-10 flex flex-col items-center gap-4">
          <button
            onClick={handleContinue}
            disabled={!isValid}
            className="w-full max-w-md rounded-full bg-accent px-8 py-3.5 text-sm font-medium text-bg transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 active:scale-[0.97] disabled:opacity-30 disabled:pointer-events-none"
          >
            Continue
          </button>
        </div>
      </div>
    </StepContainer>
  );
}
