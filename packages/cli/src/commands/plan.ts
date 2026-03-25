import { Command } from 'commander';
import type { ApiResponse, DayPlan } from '@lifeos/shared';
import { createClient } from '../api-client.js';
import {
  isJsonMode,
  printError,
  printJson,
  printSuccess,
} from '../output.js';
import chalk from 'chalk';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function printPlan(plan: DayPlan): void {
  console.log(`Date:       ${plan.planDate ?? plan.plan_date ?? '-'}`);
  console.log(`Wake Time:  ${plan.wakeTime ?? plan.wake_time ?? '-'}`);

  const mitDone = plan.mitDone ?? plan.mit_done ?? false;
  const p1Done = plan.p1Done ?? plan.p1_done ?? false;
  const p2Done = plan.p2Done ?? plan.p2_done ?? false;

  const mitStatus = mitDone ? chalk.green('done') : chalk.yellow('pending');
  const p1Status = p1Done ? chalk.green('done') : chalk.yellow('pending');
  const p2Status = p2Done ? chalk.green('done') : chalk.yellow('pending');

  const mitTaskId = plan.mitTaskId ?? plan.mit_task_id;
  const p1TaskId = plan.p1TaskId ?? plan.p1_task_id;
  const p2TaskId = plan.p2TaskId ?? plan.p2_task_id;

  console.log(`MIT:        ${mitTaskId?.slice(0, 8) ?? '-'}  [${mitStatus}]`);
  console.log(`P1:         ${p1TaskId?.slice(0, 8) ?? '-'}  [${p1Status}]`);
  console.log(`P2:         ${p2TaskId?.slice(0, 8) ?? '-'}  [${p2Status}]`);

  if (plan.schedule.length > 0) {
    console.log('Schedule:');
    for (const block of plan.schedule) {
      console.log(`  ${block.start}-${block.end}  ${block.label} (${block.type})`);
    }
  }

  if (plan.overflow.length > 0) {
    console.log(`Overflow:   ${plan.overflow.join(', ')}`);
  }
}

export const planCommand = new Command('plan')
  .description('Manage day plans');

planCommand
  .command('today')
  .description('Show today\'s plan')
  .action(async () => {
    try {
      const client = createClient();
      const res = await client.get<ApiResponse<DayPlan>>(`/api/v1/day-plans/${todayStr()}`);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printPlan(res.data);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

planCommand
  .command('tomorrow')
  .description('Show tomorrow\'s plan')
  .action(async () => {
    try {
      const client = createClient();
      const res = await client.get<ApiResponse<DayPlan>>(`/api/v1/day-plans/${tomorrowStr()}`);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printPlan(res.data);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

planCommand
  .command('set <date>')
  .description('Create or update a day plan')
  .option('-w, --wake <time>', 'Wake time (HH:MM)')
  .option('--mit <taskId>', 'MIT task ID')
  .option('--p1 <taskId>', 'P1 task ID')
  .option('--p2 <taskId>', 'P2 task ID')
  .action(async (date: string, opts: { wake?: string; mit?: string; p1?: string; p2?: string }) => {
    try {
      const client = createClient();
      const body: Record<string, unknown> = {};
      if (opts.wake) body.wakeTime = opts.wake;
      if (opts.mit) body.mitTaskId = opts.mit;
      if (opts.p1) body.p1TaskId = opts.p1;
      if (opts.p2) body.p2TaskId = opts.p2;

      const res = await client.put<ApiResponse<DayPlan>>(`/api/v1/day-plans/${date}`, body);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Day plan saved for ${date}.`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

planCommand
  .command('complete-mit')
  .description('Mark MIT as done for today')
  .action(async () => {
    try {
      const client = createClient();
      const res = await client.patch<ApiResponse<DayPlan>>(`/api/v1/day-plans/${todayStr()}`, { mitDone: true });

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess('MIT marked as done.');
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

planCommand
  .command('complete-p1')
  .description('Mark P1 as done for today')
  .action(async () => {
    try {
      const client = createClient();
      const res = await client.patch<ApiResponse<DayPlan>>(`/api/v1/day-plans/${todayStr()}`, { p1Done: true });

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess('P1 marked as done.');
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

planCommand
  .command('complete-p2')
  .description('Mark P2 as done for today')
  .action(async () => {
    try {
      const client = createClient();
      const res = await client.patch<ApiResponse<DayPlan>>(`/api/v1/day-plans/${todayStr()}`, { p2Done: true });

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess('P2 marked as done.');
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });
