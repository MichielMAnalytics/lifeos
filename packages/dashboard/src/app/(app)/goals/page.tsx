import { api } from '@/lib/api';
import { GoalForm } from '@/components/goal-form';
import type { Goal, GoalHealthInfo, ApiListResponse, ApiResponse } from '@lifeos/shared';
import Link from 'next/link';

const healthColor: Record<string, string> = {
  on_track: 'bg-success',
  at_risk: 'bg-warning',
  off_track: 'bg-danger',
  unknown: 'bg-text-muted',
};

const healthLabel: Record<string, string> = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  off_track: 'Off Track',
  unknown: 'No Data',
};

const progressBarColor: Record<string, string> = {
  on_track: 'bg-success',
  at_risk: 'bg-warning',
  off_track: 'bg-danger',
  unknown: 'bg-text-muted',
};

export default async function GoalsPage() {
  const res = await api.get<ApiListResponse<Goal>>('/api/v1/goals?status=active');
  const goals = res.data;

  // Fetch health for each goal in parallel
  const healthMap = new Map<string, GoalHealthInfo>();
  const healthResults = await Promise.allSettled(
    goals.map((g) =>
      api
        .get<ApiResponse<GoalHealthInfo>>(`/api/v1/goals/${g.id}/health`)
        .then((r) => ({ id: g.id, health: r.data })),
    ),
  );

  for (const result of healthResults) {
    if (result.status === 'fulfilled') {
      healthMap.set(result.value.id, result.value.health);
    }
  }

  return (
    <div className="max-w-none space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-text">
          Goals <span className="text-text-muted font-normal">[ {res.count} ]</span>
        </h1>
        <GoalForm />
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-base font-medium text-text">No active goals</p>
          <p className="text-sm text-text-muted mt-1">Set one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {goals.map((goal) => {
            const health = healthMap.get(goal.id);
            const status = health?.status || 'unknown';
            const dotColor = healthColor[status] || 'bg-text-muted';
            const label = healthLabel[status] || 'No Data';
            const barColor = progressBarColor[status] || 'bg-text-muted';
            const progress = health && health.tasks_total > 0
              ? (health.tasks_done / health.tasks_total) * 100
              : 0;

            return (
              <Link key={goal.id} href={`/goals/${goal.id}`}>
                <div className="border border-border p-6 transition-colors hover:border-text/30 group h-full flex flex-col">
                  {/* Top row: title + health dot */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="text-lg font-bold text-text group-hover:text-accent transition-colors leading-snug">
                      {goal.title}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0 mt-1">
                      <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                      <span className="text-xs text-text-muted">{label}</span>
                    </div>
                  </div>

                  {/* Description */}
                  {goal.description && (
                    <p className="text-sm text-text-muted line-clamp-2 mb-4 leading-relaxed">
                      {goal.description}
                    </p>
                  )}

                  {/* Progress bar */}
                  <div className="mb-4 mt-auto">
                    <div className="h-px w-full bg-border overflow-hidden">
                      <div
                        className={`h-full ${barColor} transition-all duration-500`}
                        style={{ width: `${progress}%`, height: '2px', marginTop: '-0.5px' }}
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    {goal.quarter ? (
                      <span className="font-mono">[ {goal.quarter} ]</span>
                    ) : (
                      <span />
                    )}
                    {health && (
                      <span className="font-mono">
                        {health.tasks_done}/{health.tasks_total} tasks
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
