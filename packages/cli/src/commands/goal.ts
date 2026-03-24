import { Command } from 'commander';
import type { ApiListResponse, ApiResponse, Goal, GoalHealthInfo } from '@lifeos/shared';
import { createClient } from '../api-client.js';
import chalk from 'chalk';
import {
  formatDate,
  getId,
  isJsonMode,
  printError,
  printJson,
  printSuccess,
  printTable,
  shortId,
} from '../output.js';

export const goalCommand = new Command('goal')
  .description('Manage goals');

goalCommand
  .command('list')
  .description('List goals')
  .option('-q, --quarter <quarter>', 'Filter by quarter (e.g. 2026-Q1)')
  .option('-s, --status <status>', 'Filter by status (active, completed, dropped)')
  .action(async (opts: { quarter?: string; status?: string }) => {
    try {
      const client = createClient();
      const params: Record<string, string> = {};
      if (opts.quarter) params.quarter = opts.quarter;
      if (opts.status) params.status = opts.status;

      const res = await client.get<ApiListResponse<Goal>>('/api/v1/goals', params);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      if (res.data.length === 0) {
        console.log('No goals found.');
        return;
      }

      const rows = res.data.map((g) => [
        shortId(g),
        g.title,
        g.status,
        g.quarter ?? '-',
        formatDate(g.targetDate ?? g.target_date ?? null),
      ]);
      printTable(['ID', 'Title', 'Status', 'Quarter', 'Target'], rows);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

goalCommand
  .command('create <title>')
  .description('Create a new goal')
  .option('-t, --target-date <date>', 'Target date (YYYY-MM-DD)')
  .option('-q, --quarter <quarter>', 'Quarter (e.g. 2026-Q1)')
  .option('-d, --description <desc>', 'Goal description')
  .action(async (title: string, opts: { targetDate?: string; quarter?: string; description?: string }) => {
    try {
      const client = createClient();
      const body: Record<string, unknown> = { title };
      if (opts.targetDate) body.targetDate = opts.targetDate;
      if (opts.quarter) body.quarter = opts.quarter;
      if (opts.description) body.description = opts.description;

      const res = await client.post<ApiResponse<Goal>>('/api/v1/goals', body);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Goal created: ${res.data.title} (${shortId(res.data)})`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

goalCommand
  .command('show <id>')
  .description('Show goal details')
  .action(async (id: string) => {
    try {
      const client = createClient();
      const res = await client.get<ApiResponse<Goal>>(`/api/v1/goals/${id}`);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      const g = res.data;
      console.log(`ID:           ${getId(g)}`);
      console.log(`Title:        ${g.title}`);
      console.log(`Description:  ${g.description ?? '-'}`);
      console.log(`Status:       ${g.status}`);
      console.log(`Quarter:      ${g.quarter ?? '-'}`);
      console.log(`Target Date:  ${formatDate(g.targetDate ?? g.target_date ?? null)}`);
      console.log(`Created:      ${formatDate(g.createdAt ?? g.created_at ?? null)}`);
      const completedAt = g.completedAt ?? g.completed_at;
      if (completedAt) {
        console.log(`Completed:    ${formatDate(completedAt)}`);
      }
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

function colorHealth(status: string): string {
  switch (status) {
    case 'on_track': return chalk.green(status);
    case 'at_risk': return chalk.yellow(status);
    case 'off_track': return chalk.red(status);
    default: return chalk.dim(status);
  }
}

goalCommand
  .command('health [id]')
  .description('Show health for one or all goals')
  .action(async (id?: string) => {
    try {
      const client = createClient();

      if (id) {
        const res = await client.get<ApiResponse<GoalHealthInfo>>(`/api/v1/goals/${id}/health`);

        if (isJsonMode()) {
          printJson(res);
          return;
        }

        const h = res.data;
        const tasksDone = h.tasksDone ?? h.tasks_done ?? 0;
        const tasksTotal = h.tasksTotal ?? h.tasks_total ?? 0;
        console.log(`Status:    ${colorHealth(h.status)}`);
        console.log(`Score:     ${h.score}`);
        console.log(`Tasks:     ${tasksDone}/${tasksTotal}`);
        console.log(`Velocity:  ${h.velocity}`);
      } else {
        const goalsRes = await client.get<ApiListResponse<Goal>>('/api/v1/goals', { status: 'active' });

        if (isJsonMode()) {
          const healthData: Array<{ goal: Goal; health: GoalHealthInfo }> = [];
          for (const goal of goalsRes.data) {
            const hRes = await client.get<ApiResponse<GoalHealthInfo>>(`/api/v1/goals/${getId(goal)}/health`);
            healthData.push({ goal, health: hRes.data });
          }
          printJson(healthData);
          return;
        }

        if (goalsRes.data.length === 0) {
          console.log('No active goals.');
          return;
        }

        const rows: string[][] = [];
        for (const goal of goalsRes.data) {
          const hRes = await client.get<ApiResponse<GoalHealthInfo>>(`/api/v1/goals/${getId(goal)}/health`);
          const h = hRes.data;
          const tasksDone = h.tasksDone ?? h.tasks_done ?? 0;
          const tasksTotal = h.tasksTotal ?? h.tasks_total ?? 0;
          rows.push([
            shortId(goal),
            goal.title,
            colorHealth(h.status),
            String(h.score),
            `${tasksDone}/${tasksTotal}`,
          ]);
        }
        printTable(['ID', 'Goal', 'Health', 'Score', 'Tasks'], rows);
      }
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });
