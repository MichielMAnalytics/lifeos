import { Command } from 'commander';
import type { ApiResponse, DayPlan } from '@lifeos/shared';
import { createClient, type ApiClient } from '../api-client.js';
import {
  isJsonMode,
  printError,
  printJson,
  printSuccess,
} from '../output.js';
import chalk from 'chalk';

async function resolveTaskId(client: ApiClient, value: string): Promise<string> {
  // If it looks like a Convex ID (starts with letter, no spaces, 8+ alphanumeric chars), use as-is
  if (/^[a-z][a-z0-9]{7,}$/i.test(value)) {
    return value;
  }

  // Search by title
  try {
    const searchRes = await client.get<{ data: Record<string, unknown[]> }>('/api/v1/search', { q: value, type: 'tasks' });
    const tasks = searchRes.data.tasks ?? [];
    if (tasks.length > 0) {
      const match = tasks[0] as { _id: string; title: string };
      if (tasks.length > 1) {
        console.log(`  Note: multiple matches for "${value}", using "${match.title}"`);
      }
      return match._id;
    }
  } catch {
    // search failed, fall through to create
  }

  // No match - create a new task
  const today = new Date().toISOString().slice(0, 10);
  const newTask = await client.post<{ data: { _id: string } }>('/api/v1/tasks', { title: value, dueDate: today });
  console.log(`  Created task: "${value}"`);
  return newTask.data._id;
}

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
  .option('--mit <taskIdOrTitle>', 'MIT task ID or title')
  .option('--p1 <taskIdOrTitle>', 'P1 task ID or title')
  .option('--p2 <taskIdOrTitle>', 'P2 task ID or title')
  .option('--schedule <json>', 'Schedule blocks as JSON array')
  .option('--block <block...>', 'Time block: "HH:MM-HH:MM Description" or "HH:MM Description" (repeatable)')
  .action(async (date: string, opts: { wake?: string; mit?: string; p1?: string; p2?: string; schedule?: string; block?: string[] }) => {
    try {
      const client = createClient();
      const body: Record<string, unknown> = {};
      if (opts.wake) body.wakeTime = opts.wake;
      if (opts.mit) body.mitTaskId = await resolveTaskId(client, opts.mit);
      if (opts.p1) body.p1TaskId = await resolveTaskId(client, opts.p1);
      if (opts.p2) body.p2TaskId = await resolveTaskId(client, opts.p2);
      if (opts.schedule) {
        try {
          body.schedule = JSON.parse(opts.schedule);
        } catch {
          printError('Invalid schedule JSON. Format: [{"start":"09:00","end":"10:00","label":"Focus","type":"task"}]');
          process.exitCode = 1;
          return;
        }
      }

      // Parse --block flags into schedule array
      if (opts.block && opts.block.length > 0) {
        const blocks: { start: string; end: string; label: string; type: string }[] = [];
        for (const raw of opts.block) {
          // Format: "HH:MM-HH:MM Description" or "HH:MM Description"
          const rangeMatch = raw.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\s+(.+)$/);
          const singleMatch = raw.match(/^(\d{1,2}:\d{2})\s+(.+)$/);

          if (rangeMatch) {
            blocks.push({
              start: rangeMatch[1].padStart(5, '0'),
              end: rangeMatch[2].padStart(5, '0'),
              label: rangeMatch[3],
              type: 'other',
            });
          } else if (singleMatch) {
            // Single time = marker block (15 min default)
            const startStr = singleMatch[1].padStart(5, '0');
            const [h, m] = startStr.split(':').map(Number);
            const endMin = h * 60 + m + 15;
            const endH = Math.floor(endMin / 60);
            const endM = endMin % 60;
            const endStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
            blocks.push({
              start: startStr,
              end: endStr,
              label: singleMatch[2],
              type: 'other',
            });
          } else {
            printError(`Invalid block format: "${raw}". Use "HH:MM-HH:MM Description" or "HH:MM Description"`);
            process.exitCode = 1;
            return;
          }
        }

        // Merge with existing schedule from --schedule flag, or use alone
        const existing = (body.schedule as unknown[]) ?? [];
        body.schedule = [...existing, ...blocks];
      }

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
  .command('add-block <date> <block>')
  .description('Append a single time block to a day plan. Format: "HH:MM-HH:MM Description" or "HH:MM Description".')
  .option('-t, --type <type>', 'Block type (event/break/lunch/wake/task/other)', 'other')
  .action(async (date: string, raw: string, opts: { type: string }) => {
    try {
      const rangeMatch = raw.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\s+(.+)$/);
      const singleMatch = raw.match(/^(\d{1,2}:\d{2})\s+(.+)$/);
      let block: { start: string; end: string; label: string; type: string } | null = null;
      if (rangeMatch) {
        block = {
          start: rangeMatch[1].padStart(5, '0'),
          end: rangeMatch[2].padStart(5, '0'),
          label: rangeMatch[3],
          type: opts.type,
        };
      } else if (singleMatch) {
        const startStr = singleMatch[1].padStart(5, '0');
        const [h, m] = startStr.split(':').map(Number);
        const endMin = h * 60 + m + 30;
        const endH = Math.floor(endMin / 60);
        const endM = endMin % 60;
        const endStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
        block = {
          start: startStr,
          end: endStr,
          label: singleMatch[2],
          type: opts.type,
        };
      } else {
        printError(`Invalid block format. Use "HH:MM-HH:MM Description" or "HH:MM Description"`);
        process.exitCode = 1;
        return;
      }

      const client = createClient();
      // Fetch existing plan to append (don't overwrite)
      let existingSchedule: { start: string; end: string; label: string; type: string }[] = [];
      try {
        const existing = await client.get<ApiResponse<DayPlan>>(`/api/v1/day-plans/${date}`);
        if (existing.data?.schedule) {
          existingSchedule = existing.data.schedule.map((b) => ({
            start: b.start,
            end: b.end,
            label: b.label,
            type: b.type,
          }));
        }
      } catch {
        // No existing plan; start fresh
      }
      const newSchedule = [...existingSchedule, block];
      const res = await client.put<ApiResponse<DayPlan>>(`/api/v1/day-plans/${date}`, { schedule: newSchedule });

      if (isJsonMode()) {
        printJson(res);
        return;
      }
      printSuccess(`Added block to ${date}: ${block.start}-${block.end} ${block.label}`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

planCommand
  .command('clear-schedule <date>')
  .description('Remove all schedule blocks from a day plan (keeps MIT/P1/P2)')
  .action(async (date: string) => {
    try {
      const client = createClient();
      const res = await client.put<ApiResponse<DayPlan>>(`/api/v1/day-plans/${date}`, { schedule: [] });
      if (isJsonMode()) {
        printJson(res);
        return;
      }
      printSuccess(`Cleared schedule for ${date}.`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

planCommand
  .command('delete <date>')
  .description('Delete a day plan')
  .action(async (date: string) => {
    try {
      const client = createClient();
      await client.del(`/api/v1/day-plans/${date}`);

      if (isJsonMode()) {
        printJson({ data: { deleted: true, date } });
        return;
      }

      printSuccess(`Day plan for ${date} deleted.`);
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
