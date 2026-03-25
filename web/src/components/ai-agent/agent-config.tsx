'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useGatewayQuery, useGatewayConnection } from '@/lib/gateway';
import { cn } from '@/lib/utils';

interface AgentConfig {
  name: string;
  systemPrompt: string;
  model: string;
  availableModels?: string[];
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-surface rounded', className)} />;
}

export function AgentConfig() {
  const connection = useGatewayConnection();
  const { data, error, loading } = useGatewayQuery<AgentConfig>(
    connection.status === 'connected' ? 'config.get' : null,
    {},
  );

  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [model, setModel] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (data) {
      setName(data.name);
      setSystemPrompt(data.systemPrompt);
      setModel(data.model);
    }
  }, [data]);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [systemPrompt, autoResize]);

  const hasChanges =
    data !== undefined &&
    data !== null &&
    (name !== data.name || systemPrompt !== data.systemPrompt || model !== data.model);

  const handleSave = async () => {
    if (!hasChanges || saving) return;
    setSaving(true);
    setSaved(false);
    try {
      // Access the gateway client through the connection
      const { client } = connection;
      if (client) {
        await client.call('config.set', { name, systemPrompt, model });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      console.error('Failed to save agent config:', e);
    } finally {
      setSaving(false);
    }
  };

  if (connection.status !== 'connected') {
    return (
      <div className="border border-border p-6">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-sm font-bold text-text uppercase tracking-wide">
            Agent Configuration
          </h2>
        </div>
        <div className="flex flex-col items-center py-8 text-center">
          <span className="inline-block w-2 h-2 rounded-full bg-text-muted/40 mb-3" />
          <p className="text-sm text-text-muted">Gateway not connected</p>
          <p className="text-xs text-text-muted/60 mt-1">
            Deploy your AI agent to configure it
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="border border-border p-6 space-y-4">
        <SkeletonBlock className="h-5 w-48" />
        <SkeletonBlock className="h-9 w-full" />
        <SkeletonBlock className="h-5 w-32" />
        <SkeletonBlock className="h-32 w-full" />
        <SkeletonBlock className="h-5 w-24" />
        <SkeletonBlock className="h-9 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-border p-6">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-bold text-text uppercase tracking-wide">
            Agent Configuration
          </h2>
        </div>
        <p className="text-sm text-danger">Failed to load configuration</p>
        <p className="text-xs text-text-muted mt-1">{String(error)}</p>
      </div>
    );
  }

  const availableModels = data?.availableModels ?? [];

  return (
    <div className="border border-border flex flex-col">
      <div className="flex items-baseline justify-between px-6 py-4 border-b border-border">
        <h2 className="text-sm font-bold text-text uppercase tracking-wide">
          Agent Configuration
        </h2>
        {saved && (
          <span className="text-xs text-success">Saved</span>
        )}
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Agent Name */}
        <div className="space-y-2">
          <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wider">
            Agent Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-bg border border-border px-3 py-2 text-sm text-text placeholder:text-text-muted/40 focus:outline-none focus:border-accent transition-colors"
            placeholder="My Agent"
          />
        </div>

        {/* Model Selection */}
        {availableModels.length > 0 && (
          <div className="space-y-2">
            <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wider">
              Model
            </label>
            <div className="flex flex-wrap gap-2">
              {availableModels.map((m) => (
                <button
                  key={m}
                  onClick={() => setModel(m)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-mono border transition-colors',
                    model === m
                      ? 'border-text bg-surface text-text'
                      : 'border-border text-text-muted hover:text-text hover:border-text-muted',
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Current model display when no available list */}
        {availableModels.length === 0 && model && (
          <div className="space-y-2">
            <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wider">
              Model
            </label>
            <span className="text-sm font-mono text-text">{model}</span>
          </div>
        )}

        {/* System Prompt */}
        <div className="space-y-2">
          <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wider">
            System Prompt
          </label>
          <textarea
            ref={textareaRef}
            value={systemPrompt}
            onChange={(e) => {
              setSystemPrompt(e.target.value);
              autoResize();
            }}
            className="w-full bg-bg border border-border px-3 py-2 text-sm font-mono text-text placeholder:text-text-muted/40 focus:outline-none focus:border-accent transition-colors resize-none min-h-[120px] leading-relaxed"
            placeholder="You are a helpful assistant..."
            rows={6}
          />
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={cn(
              'px-4 py-2 text-sm font-medium border transition-colors',
              hasChanges && !saving
                ? 'border-text text-text hover:bg-surface-hover'
                : 'border-border text-text-muted/40 cursor-not-allowed',
            )}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
          {hasChanges && !saving && (
            <span className="text-xs text-text-muted">Unsaved changes</span>
          )}
        </div>
      </div>
    </div>
  );
}
