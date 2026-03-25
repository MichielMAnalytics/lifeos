'use client';

import { useState, useCallback } from 'react';
import { useGatewayQuery, useGatewayConnection } from '@/lib/gateway';
import { cn } from '@/lib/utils';

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  agent: string;
  prompt?: string;
  enabled: boolean;
  lastRun: number | null;
  nextRun: number | null;
}

function formatTimestamp(ts: number | null): string {
  if (!ts) return '--';
  const d = new Date(ts);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-6 py-3">
      <div className="animate-pulse bg-surface h-4 w-24 rounded" />
      <div className="animate-pulse bg-surface h-4 w-20 rounded" />
      <div className="animate-pulse bg-surface h-4 w-16 rounded" />
      <div className="animate-pulse bg-surface h-4 w-28 rounded ml-auto" />
    </div>
  );
}

function InlineAddForm({ onSubmit, onCancel }: {
  onSubmit: (data: { name: string; schedule: string; agent: string; prompt: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [schedule, setSchedule] = useState('');
  const [agent, setAgent] = useState('');
  const [prompt, setPrompt] = useState('');

  const canSubmit = name.trim() && schedule.trim() && agent.trim();

  return (
    <div className="border-t border-border px-6 py-4 space-y-3 bg-surface/30">
      <div className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
        New Automation
      </div>
      <div className="grid grid-cols-3 gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="bg-bg border border-border px-2.5 py-1.5 text-sm text-text placeholder:text-text-muted/40 focus:outline-none focus:border-accent transition-colors"
        />
        <input
          type="text"
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          placeholder="0 9 * * *"
          className="bg-bg border border-border px-2.5 py-1.5 text-sm font-mono text-text placeholder:text-text-muted/40 focus:outline-none focus:border-accent transition-colors"
        />
        <input
          type="text"
          value={agent}
          onChange={(e) => setAgent(e.target.value)}
          placeholder="Agent name"
          className="bg-bg border border-border px-2.5 py-1.5 text-sm text-text placeholder:text-text-muted/40 focus:outline-none focus:border-accent transition-colors"
        />
      </div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Prompt (optional)"
        className="w-full bg-bg border border-border px-2.5 py-1.5 text-sm font-mono text-text placeholder:text-text-muted/40 focus:outline-none focus:border-accent transition-colors resize-none"
        rows={2}
      />
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (canSubmit) onSubmit({ name: name.trim(), schedule: schedule.trim(), agent: agent.trim(), prompt: prompt.trim() });
          }}
          disabled={!canSubmit}
          className={cn(
            'px-3 py-1.5 text-xs font-medium border transition-colors',
            canSubmit
              ? 'border-text text-text hover:bg-surface-hover'
              : 'border-border text-text-muted/40 cursor-not-allowed',
          )}
        >
          Add
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-medium text-text-muted border border-border hover:text-text hover:border-text-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function CronManager() {
  const connection = useGatewayConnection();
  const { data, error, loading, refetch } = useGatewayQuery<CronJob[]>(
    connection.status === 'connected' ? 'cron.list' : null,
    {},
  );

  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const callGateway = useCallback(
    async (method: string, params: Record<string, unknown>) => {
      const { client } = connection;
      if (client) {
        await client.call(method, params);
        refetch();
      }
    },
    [connection, refetch],
  );

  const handleAdd = async (data: { name: string; schedule: string; agent: string; prompt: string }) => {
    try {
      await callGateway('cron.create', data);
      setShowAddForm(false);
    } catch (e) {
      console.error('Failed to create cron:', e);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await callGateway('cron.delete', { id });
      setConfirmDeleteId(null);
    } catch (e) {
      console.error('Failed to delete cron:', e);
    } finally {
      setDeletingId(null);
    }
  };

  const handleTrigger = async (id: string) => {
    setTriggeringId(id);
    try {
      await callGateway('cron.trigger', { id });
    } catch (e) {
      console.error('Failed to trigger cron:', e);
    } finally {
      setTriggeringId(null);
    }
  };

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    setTogglingId(id);
    try {
      await callGateway('cron.update', { id, enabled: !currentEnabled });
    } catch (e) {
      console.error('Failed to toggle cron:', e);
    } finally {
      setTogglingId(null);
    }
  };

  if (connection.status !== 'connected') {
    return (
      <div className="border border-border p-6">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-sm font-bold text-text uppercase tracking-wide">
            Automations
          </h2>
        </div>
        <div className="flex flex-col items-center py-8 text-center">
          <span className="inline-block w-2 h-2 rounded-full bg-text-muted/40 mb-3" />
          <p className="text-sm text-text-muted">Gateway not connected</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="border border-border flex flex-col">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-bold text-text uppercase tracking-wide">
            Automations
          </h2>
        </div>
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-border p-6">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-bold text-text uppercase tracking-wide">
            Automations
          </h2>
        </div>
        <p className="text-sm text-danger">Failed to load automations</p>
      </div>
    );
  }

  const crons = data ?? [];

  return (
    <div className="border border-border flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-sm font-bold text-text uppercase tracking-wide">
          Automations
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-xs font-medium text-text-muted hover:text-text border border-border px-2.5 py-1 transition-colors hover:border-text-muted"
        >
          {showAddForm ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {showAddForm && (
        <InlineAddForm
          onSubmit={handleAdd}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {crons.length === 0 && !showAddForm ? (
        <div className="flex flex-col items-center py-12 text-center">
          <p className="text-sm text-text-muted">No scheduled automations</p>
          <p className="text-xs text-text-muted/60 mt-1">
            Add a cron job to automate recurring tasks
          </p>
        </div>
      ) : (
        <>
          {/* Header */}
          {crons.length > 0 && (
            <div className="flex items-center gap-3 px-6 py-2 border-b border-border text-[10px] font-medium text-text-muted uppercase tracking-wider">
              <span className="w-32 shrink-0">Name</span>
              <span className="w-24 shrink-0">Schedule</span>
              <span className="w-20 shrink-0">Agent</span>
              <span className="w-5 shrink-0" />
              <span className="w-28 shrink-0">Last Run</span>
              <span className="flex-1">Next Run</span>
              <span className="w-24 shrink-0 text-right">Actions</span>
            </div>
          )}

          {/* Rows */}
          <div className="divide-y divide-border">
            {crons.map((cron) => (
              <div key={cron.id}>
                <div
                  className={cn(
                    'flex items-center gap-3 px-6 py-3 transition-colors hover:bg-surface-hover',
                    !cron.enabled && 'opacity-50',
                  )}
                >
                  <span className="w-32 shrink-0 text-sm text-text truncate">
                    {cron.name}
                  </span>
                  <span className="w-24 shrink-0 text-xs font-mono text-text-muted">
                    {cron.schedule}
                  </span>
                  <span className="w-20 shrink-0 text-xs text-text-muted truncate">
                    {cron.agent}
                  </span>

                  {/* Enabled toggle */}
                  <button
                    onClick={() => handleToggle(cron.id, cron.enabled)}
                    disabled={togglingId === cron.id}
                    className={cn(
                      'relative w-7 h-4 shrink-0 rounded-full border transition-colors',
                      cron.enabled
                        ? 'bg-accent border-accent'
                        : 'bg-surface border-border',
                      togglingId === cron.id && 'opacity-50',
                    )}
                    title={cron.enabled ? 'Disable' : 'Enable'}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 w-2.5 h-2.5 rounded-full transition-transform',
                        cron.enabled
                          ? 'translate-x-3 bg-bg'
                          : 'translate-x-0.5 bg-text-muted',
                      )}
                    />
                  </button>

                  <span className="w-28 shrink-0 text-xs font-mono text-text-muted">
                    {formatTimestamp(cron.lastRun)}
                  </span>
                  <span className="flex-1 text-xs font-mono text-text-muted">
                    {formatTimestamp(cron.nextRun)}
                  </span>

                  {/* Actions */}
                  <div className="w-24 shrink-0 flex items-center justify-end gap-1">
                    {/* Trigger */}
                    <button
                      onClick={() => handleTrigger(cron.id)}
                      disabled={triggeringId === cron.id}
                      className="px-2 py-1 text-[10px] font-medium text-text-muted border border-border hover:text-text hover:border-text-muted transition-colors"
                      title="Run now"
                    >
                      {triggeringId === cron.id ? '...' : 'Run'}
                    </button>

                    {/* Delete */}
                    {confirmDeleteId === cron.id ? (
                      <button
                        onClick={() => handleDelete(cron.id)}
                        disabled={deletingId === cron.id}
                        className="px-2 py-1 text-[10px] font-medium text-danger border border-danger/50 hover:bg-danger/10 transition-colors"
                      >
                        {deletingId === cron.id ? '...' : 'Confirm'}
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(cron.id)}
                        className="px-2 py-1 text-[10px] font-medium text-text-muted border border-border hover:text-danger hover:border-danger/50 transition-colors"
                        title="Delete"
                      >
                        {/* X mark */}
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                          <line x1="2" y1="2" x2="8" y2="8" />
                          <line x1="8" y1="2" x2="2" y2="8" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Cancel confirm on click away */}
                {confirmDeleteId === cron.id && (
                  <div className="px-6 py-2 bg-surface/30 border-t border-border flex items-center gap-2">
                    <span className="text-xs text-text-muted">Delete &quot;{cron.name}&quot;?</span>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs text-text-muted hover:text-text transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
