'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useAction } from 'convex/react';
import { api } from '@/lib/convex-api';
import { NavArrow } from './nav-arrow';
import { CodeBlock } from './code-block';
import { StepNumber } from './step-number';

function FixedBackButton({ onClick }: { onClick: () => void }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed top-6 left-6 z-50">
      <NavArrow direction="back" onClick={onClick} label="Back" />
    </div>,
    document.body,
  );
}

export function HomeSetupStep() {
  const [setupStep, setSetupStep] = useState(0);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);
  const user = useQuery(api.authHelpers.getMe, {});
  const existingKeys = useQuery(api.authHelpers.listApiKeys, {});
  const generateKey = useAction(api.apiKeyAuth.createApiKey);
  const hasExistingKey = existingKeys && existingKeys.length > 0;

  async function handleGenerateKey() {
    if (!user?._id || generatingKey || apiKey) return;
    setGeneratingKey(true);
    try {
      const result = await generateKey({ userId: user._id, name: 'CLI' });
      setApiKey(result.key);
    } catch (err) {
      console.error('Failed to generate API key:', err);
    } finally {
      setGeneratingKey(false);
    }
  }

  return (
    <div className="flex flex-col items-center w-full">
      {setupStep === 0 && (
        <div className="flex flex-col items-center text-center animate-fade-in">
          <div className="mb-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-success/20 bg-success/5 px-4 py-1.5 text-xs text-success">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              7-day free trial started
            </span>
          </div>

          <h1 className="text-3xl font-light tracking-tight text-text sm:text-4xl">
            Welcome to <span className="font-semibold">LifeOS</span>
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-text-muted/70 max-w-sm">
            Let&apos;s connect LifeOS with your AI assistant.
            It only takes a minute.
          </p>

          <button
            onClick={() => setSetupStep(1)}
            className="mt-10 rounded-full bg-accent px-10 py-3.5 text-sm font-medium text-bg transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 active:scale-[0.97]"
          >
            Let&apos;s set it up
          </button>

          <button
            onClick={() => { localStorage.setItem('lifeos-setup-complete', 'true'); window.location.href = '/today'; }}
            className="mt-4 text-xs text-text-muted/40 hover:text-text-muted transition-colors duration-200"
          >
            Skip — I&apos;ll do this later
          </button>
        </div>
      )}

      {setupStep === 1 && (
        <div className="flex flex-col items-center text-center w-full animate-fade-in">
          <FixedBackButton onClick={() => setSetupStep(0)} />
          <h1 className="text-2xl font-light tracking-tight text-text">
            Install the <span className="font-semibold">LifeOS CLI</span>
          </h1>

          <p className="mt-3 text-sm text-text-muted/60 max-w-sm">
            The CLI lets you capture tasks, ideas, and journal entries from your terminal
            — and connects your AI assistant to LifeOS.
          </p>

          <div className="mt-10 w-full max-w-md space-y-6 text-left">
            <div className="flex gap-4">
              <StepNumber n={1} />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-text">Install globally</p>
                <CodeBlock>npm install -g lifeos-cli</CodeBlock>
              </div>
            </div>

            <div className="flex gap-4">
              <StepNumber n={2} />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-text">Set your API URL</p>
                <CodeBlock>{`lifeos config set-url ${process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? 'https://charming-squid-23.eu-west-1.convex.site'}`}</CodeBlock>
              </div>
            </div>

            <div className="flex gap-4">
              <StepNumber n={3} />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-text">Authenticate with your API key</p>
                {apiKey ? (
                  <CodeBlock>{`lifeos config set-key ${apiKey}`}</CodeBlock>
                ) : (
                  <>
                    <button
                      onClick={handleGenerateKey}
                      disabled={generatingKey || !user}
                      className="rounded-lg border border-border/60 bg-surface/30 px-4 py-2.5 text-sm text-text hover:bg-surface-hover transition-colors disabled:opacity-40"
                    >
                      {generatingKey ? 'Generating...' : 'Generate API Key'}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <StepNumber n={4} />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-text">Verify it works</p>
                <CodeBlock>lifeos whoami</CodeBlock>
              </div>
            </div>
          </div>

          <div className="mt-10 flex items-center gap-6">
            <button
              onClick={() => setSetupStep(0)}
              className="text-xs text-text-muted/40 hover:text-text-muted transition-colors"
            >
              &larr; Back
            </button>
            <button
              onClick={() => setSetupStep(2)}
              className="rounded-full bg-accent px-8 py-3 text-sm font-medium text-bg transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 active:scale-[0.97]"
            >
              Next: Connect your assistant
            </button>
          </div>
        </div>
      )}

      {setupStep === 2 && (
        <div className="flex flex-col items-center text-center w-full animate-fade-in">
          <FixedBackButton onClick={() => setSetupStep(1)} />
          <h1 className="text-2xl font-light tracking-tight text-text">
            Connect your <span className="font-semibold">assistant</span>
          </h1>

          <p className="mt-3 text-sm text-text-muted/60 max-w-sm">
            The LifeOS skill was installed with the CLI. Open your coding agent and run:
          </p>

          <div className="mt-8 w-full max-w-md text-left space-y-6">
            <CodeBlock>/lifeos-init</CodeBlock>

            <p className="text-xs text-text-muted/50 text-center">
              Your assistant will walk you through connecting to your LifeOS data,
              setting up routines, and creating your first goals.
            </p>

            {!apiKey && (
              <p className="text-[11px] text-text-muted/30 text-center">
                Tip: generate your API key in the previous step — your assistant will need it.
              </p>
            )}
          </div>

          <div className="mt-10">
            <button
              onClick={() => { localStorage.setItem('lifeos-setup-complete', 'true'); window.location.href = '/today'; }}
              className="rounded-full bg-accent px-8 py-3 text-sm font-medium text-bg transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 active:scale-[0.97]"
            >
              Enter LifeOS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
