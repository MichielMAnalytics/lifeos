'use client';

import { useState } from 'react';
import { useGatewayQuery, useGatewayConnection } from '@/lib/gateway';
import { cn } from '@/lib/utils';

interface Skill {
  name: string;
  enabled: boolean;
  description?: string;
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between px-6 py-3">
      <div className="animate-pulse bg-surface h-4 w-32 rounded" />
      <div className="animate-pulse bg-surface h-5 w-10 rounded-full" />
    </div>
  );
}

export function SkillsStatus() {
  const connection = useGatewayConnection();
  const { data, error, loading } = useGatewayQuery<Skill[]>(
    connection.status === 'connected' ? 'skills.status' : null,
    {},
  );

  const [togglingSkill, setTogglingSkill] = useState<string | null>(null);

  const handleToggle = async (skillName: string, currentEnabled: boolean) => {
    if (togglingSkill) return;
    setTogglingSkill(skillName);
    try {
      const { client } = connection;
      if (client) {
        await client.call('config.set', {
          skill: skillName,
          enabled: !currentEnabled,
        });
      }
    } catch (e) {
      console.error('Failed to toggle skill:', e);
    } finally {
      setTogglingSkill(null);
    }
  };

  if (connection.status !== 'connected') {
    return (
      <div className="border border-border p-6">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-sm font-bold text-text uppercase tracking-wide">
            Skills
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
            Skills
          </h2>
        </div>
        <SkeletonRow />
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
            Skills
          </h2>
        </div>
        <p className="text-sm text-danger">Failed to load skills</p>
      </div>
    );
  }

  const skills = data ?? [];

  return (
    <div className="border border-border flex flex-col">
      <div className="flex items-baseline justify-between px-6 py-4 border-b border-border">
        <h2 className="text-sm font-bold text-text uppercase tracking-wide">
          Skills
        </h2>
        <span className="text-xs text-text-muted">
          [ {skills.filter((s) => s.enabled).length}/{skills.length} ]
        </span>
      </div>

      {skills.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <p className="text-sm text-text-muted">No skills installed</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {skills.map((skill) => {
            const isToggling = togglingSkill === skill.name;

            return (
              <div
                key={skill.name}
                className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-surface-hover"
              >
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <span className="text-sm text-text truncate">{skill.name}</span>
                  {skill.description && (
                    <span className="text-xs text-text-muted truncate">
                      {skill.description}
                    </span>
                  )}
                </div>

                {/* Toggle switch */}
                <button
                  onClick={() => handleToggle(skill.name, skill.enabled)}
                  disabled={isToggling}
                  className={cn(
                    'relative w-9 h-5 shrink-0 rounded-full border transition-colors',
                    skill.enabled
                      ? 'bg-accent border-accent'
                      : 'bg-surface border-border',
                    isToggling && 'opacity-50',
                  )}
                  title={skill.enabled ? 'Disable' : 'Enable'}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-3.5 h-3.5 rounded-full transition-transform',
                      skill.enabled
                        ? 'translate-x-4 bg-bg'
                        : 'translate-x-0.5 bg-text-muted',
                    )}
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
