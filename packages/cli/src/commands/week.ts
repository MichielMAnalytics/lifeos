import { Command } from 'commander';
import type { ApiResponse, WeeklyPlan } from '@lifeos/shared';
import { createClient } from '../api-client.js';
import {
  isJsonMode,
  printError,
  printJson,
  printSuccess,
} from '../output.js';

function currentWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

function printWeeklyPlan(plan: WeeklyPlan): void {
  console.log(`Week:          ${plan.weekStart ?? plan.week_start ?? '-'}`);
  console.log(`Theme:         ${plan.theme ?? '-'}`);
  console.log(`Review Score:  ${plan.reviewScore ?? plan.review_score ?? '-'}`);

  if (plan.goals.length > 0) {
    console.log('Goals:');
    for (const g of plan.goals) {
      const status = g.status ? ` [${g.status}]` : '';
      console.log(`  - ${g.title}${status}`);
    }
  }
}

export const weekCommand = new Command('week')
  .description('Manage weekly plans')
  .argument('[week-start]', 'Week start date (YYYY-MM-DD, default current Monday)')
  .action(async (weekStart?: string) => {
    try {
      const client = createClient();
      const ws = weekStart ?? currentWeekStart();
      const res = await client.get<ApiResponse<WeeklyPlan>>(`/api/v1/weekly-plans/${ws}`);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printWeeklyPlan(res.data);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

weekCommand
  .command('create')
  .description('Create a weekly plan for this week')
  .option('-t, --theme <theme>', 'Week theme')
  .action(async (opts: { theme?: string }) => {
    try {
      const client = createClient();
      const body: Record<string, unknown> = {};
      if (opts.theme) body.theme = opts.theme;

      const ws = currentWeekStart();
      const res = await client.put<ApiResponse<WeeklyPlan>>(`/api/v1/weekly-plans/${ws}`, body);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Weekly plan created for ${ws}.`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

weekCommand
  .command('score <score>')
  .description('Set the review score for this week (1-10)')
  .action(async (score: string) => {
    try {
      const client = createClient();
      const ws = currentWeekStart();
      const res = await client.patch<ApiResponse<WeeklyPlan>>(`/api/v1/weekly-plans/${ws}`, {
        reviewScore: parseInt(score, 10),
      });

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Week score set to ${score}.`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });
