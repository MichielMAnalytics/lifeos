'use client';

import { useState } from 'react';
import { CodeBlock } from './code-block';

type AssistantType = 'openclaw' | 'claude-code' | 'claude' | 'chatgpt' | 'codex';

const ASSISTANTS: { id: AssistantType; name: string; icon: string }[] = [
  { id: 'openclaw', name: 'OpenClaw', icon: '/openclaw-icon.png' },
  { id: 'claude-code', name: 'Claude Code', icon: '/claude-icon.png' },
  { id: 'claude', name: 'Claude', icon: '/claude-icon.png' },
  { id: 'chatgpt', name: 'ChatGPT', icon: '/openai-icon.png' },
  { id: 'codex', name: 'Codex', icon: '/openai-icon.png' },
];

function AssistantInstructions({ type, apiKey }: { type: AssistantType; apiKey: string | null }) {
  const key = apiKey ?? 'YOUR_API_KEY';

  switch (type) {
    case 'openclaw':
      return (
        <div className="space-y-4">
          <CodeBlock>openclaw skill install lifeos</CodeBlock>
          <p className="text-xs text-text-muted/50">Then set your API key:</p>
          <CodeBlock>{`openclaw config set skills.lifeos.apiKey ${key}`}</CodeBlock>
        </div>
      );

    case 'claude-code':
      return (
        <div className="space-y-4">
          <p className="text-xs text-text-muted/50">Add the LifeOS MCP server:</p>
          <CodeBlock>{`claude mcp add lifeos -- npx lifeos-mcp --api-key ${key}`}</CodeBlock>
        </div>
      );

    case 'claude':
      return (
        <div className="space-y-4">
          <p className="text-xs text-text-muted/50">
            Go to <span className="text-text/60">Settings &rarr; Integrations &rarr; Add MCP Server</span>
          </p>
          <CodeBlock>{`Server URL: https://mcp.lifeos.zone
API Key: ${key}`}</CodeBlock>
        </div>
      );

    case 'chatgpt':
      return (
        <div className="space-y-4">
          <p className="text-xs text-text-muted/50">
            Go to <span className="text-text/60">Settings &rarr; Developer Mode &rarr; Add MCP Server</span>
          </p>
          <CodeBlock>{`Server URL: https://mcp.lifeos.zone
Authentication: Bearer ${key}`}</CodeBlock>
          <p className="text-[10px] text-text-muted/30">
            Requires ChatGPT Pro, Team, Enterprise, or Edu.
          </p>
        </div>
      );

    case 'codex':
      return (
        <div className="space-y-4">
          <p className="text-xs text-text-muted/50">Configure via the Codex CLI:</p>
          <CodeBlock>{`codex mcp add lifeos --url https://mcp.lifeos.zone --api-key ${key}`}</CodeBlock>
        </div>
      );
  }
}

export function AssistantConnectStep({ apiKey, onDone }: { apiKey: string | null; onDone: () => void }) {
  const [selected, setSelected] = useState<Set<AssistantType>>(new Set());

  function toggleAssistant(id: AssistantType) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <h1 className="text-2xl font-light tracking-tight text-text">
        Connect your <span className="font-semibold">assistant</span>
      </h1>

      <p className="mt-3 text-sm text-text-muted/60 max-w-sm">
        Let your AI assistant read and write to your LifeOS data.
        Select the one(s) you use.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {ASSISTANTS.map((a) => (
          <button
            key={a.id}
            onClick={() => toggleAssistant(a.id)}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all duration-200 ${
              selected.has(a.id)
                ? 'border-accent/50 bg-accent/5 text-text'
                : 'border-border/40 text-text-muted/60 hover:border-border hover:text-text-muted'
            }`}
          >
            <img src={a.icon} alt="" className="size-4 rounded-sm" />
            {a.name}
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="mt-8 w-full max-w-lg space-y-8 text-left animate-fade-in">
          {Array.from(selected).map((id) => {
            const assistant = ASSISTANTS.find((a) => a.id === id)!;
            return (
              <div key={id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <img src={assistant.icon} alt="" className="size-4 rounded-sm" />
                  <p className="text-sm font-medium text-text">{assistant.name}</p>
                </div>
                <AssistantInstructions type={id} apiKey={apiKey} />
              </div>
            );
          })}

          <div className="pt-2">
            <p className="text-sm font-medium text-text mb-1">Try it out</p>
            <p className="text-xs text-text-muted/50">
              Ask your assistant: &quot;What are my tasks for today?&quot;
            </p>
          </div>
        </div>
      )}

      <div className="mt-10">
        <button
          onClick={onDone}
          className="rounded-full bg-accent px-8 py-3 text-sm font-medium text-bg transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 active:scale-[0.97]"
        >
          Enter LifeOS
        </button>
      </div>
    </>
  );
}
