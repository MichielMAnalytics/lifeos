import { Command } from 'commander';
import type { ApiListResponse, ApiResponse, Task } from '@lifeos/shared';
import { createClient } from '../api-client.js';
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

export const taskCommand = new Command('task')
  .description('Manage tasks');

taskCommand
  .command('list')
  .description('List tasks')
  .option('-s, --status <status>', 'Filter by status (todo, done, dropped)')
  .option('-d, --due <due>', 'Filter by due date (today, tomorrow, week, overdue, all)')
  .action(async (opts: { status?: string; due?: string }) => {
    try {
      const client = createClient();
      const params: Record<string, string> = {};
      if (opts.status) params.status = opts.status;
      if (opts.due) params.due = opts.due;

      const res = await client.get<ApiListResponse<Task>>('/api/v1/tasks', params);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      if (res.data.length === 0) {
        console.log('No tasks found.');
        return;
      }

      const rows = res.data.map((t) => [
        shortId(t),
        t.title,
        t.status,
        formatDate(t.dueDate ?? t.due_date ?? null),
        (t.goalId ?? t.goal_id)?.slice(0, 8) ?? '-',
      ]);
      printTable(['ID', 'Title', 'Status', 'Due', 'Goal'], rows);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

taskCommand
  .command('create <title>')
  .description('Create a new task')
  .option('-d, --due <date>', 'Due date (YYYY-MM-DD)')
  .option('-p, --project <id>', 'Project ID')
  .option('-g, --goal <id>', 'Goal ID')
  .option('-n, --notes <notes>', 'Notes')
  .action(async (title: string, opts: { due?: string; project?: string; goal?: string; notes?: string }) => {
    try {
      const client = createClient();
      const body: Record<string, unknown> = { title };
      if (opts.due) body.dueDate = opts.due;
      if (opts.project) body.projectId = opts.project;
      if (opts.goal) body.goalId = opts.goal;
      if (opts.notes) body.notes = opts.notes;

      const res = await client.post<ApiResponse<Task>>('/api/v1/tasks', body);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Task created: ${res.data.title} (${shortId(res.data)})`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

taskCommand
  .command('show <id>')
  .description('Show task details')
  .action(async (id: string) => {
    try {
      const client = createClient();
      const res = await client.get<ApiResponse<Task>>(`/api/v1/tasks/${id}`);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      const t = res.data;
      console.log(`ID:          ${getId(t)}`);
      console.log(`Title:       ${t.title}`);
      console.log(`Status:      ${t.status}`);
      console.log(`Due:         ${formatDate(t.dueDate ?? t.due_date ?? null)}`);
      console.log(`Notes:       ${t.notes ?? '-'}`);
      console.log(`Project ID:  ${t.projectId ?? t.project_id ?? '-'}`);
      console.log(`Goal ID:     ${t.goalId ?? t.goal_id ?? '-'}`);
      console.log(`Created:     ${formatDate(t.createdAt ?? t.created_at ?? null)}`);
      const completedAt = t.completedAt ?? t.completed_at;
      if (completedAt) {
        console.log(`Completed:   ${formatDate(completedAt)}`);
      }
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

taskCommand
  .command('complete <id>')
  .description('Mark a task as done')
  .action(async (id: string) => {
    try {
      const client = createClient();
      const res = await client.patch<ApiResponse<Task>>(`/api/v1/tasks/${id}`, { status: 'done' });

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Task completed: ${res.data.title}`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

taskCommand
  .command('update <id>')
  .description('Update a task')
  .option('-t, --title <title>', 'New title')
  .option('-d, --due <date>', 'Due date (YYYY-MM-DD)')
  .option('-n, --notes <notes>', 'Notes')
  .option('-g, --goal <id>', 'Goal ID')
  .action(async (id: string, opts: { title?: string; due?: string; notes?: string; goal?: string }) => {
    try {
      const client = createClient();
      const body: Record<string, unknown> = {};
      if (opts.title) body.title = opts.title;
      if (opts.due) body.dueDate = opts.due;
      if (opts.notes) body.notes = opts.notes;
      if (opts.goal) body.goalId = opts.goal;

      const res = await client.patch<ApiResponse<Task>>(`/api/v1/tasks/${id}`, body);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Task updated: ${res.data.title}`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

taskCommand
  .command('delete <id>')
  .description('Delete a task')
  .action(async (id: string) => {
    try {
      const client = createClient();
      await client.del(`/api/v1/tasks/${id}`);
      printSuccess(`Task ${id.slice(0, 8)} deleted.`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

taskCommand
  .command('bulk-complete <ids...>')
  .description('Mark multiple tasks as done')
  .action(async (ids: string[]) => {
    try {
      const client = createClient();
      const res = await client.post<ApiResponse<{ completed: number }>>('/api/v1/tasks/bulk-complete', { ids });

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`${res.data.completed} task(s) completed.`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });
