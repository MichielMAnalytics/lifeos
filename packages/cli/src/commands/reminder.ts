import { Command } from 'commander';
import type { ApiListResponse, ApiResponse, Reminder } from '@lifeos/shared';
import { createClient } from '../api-client.js';
import {
  formatDate,
  isJsonMode,
  printError,
  printJson,
  printSuccess,
  printTable,
} from '../output.js';

export const reminderCommand = new Command('reminder')
  .description('Manage reminders');

reminderCommand
  .command('list')
  .description('List reminders')
  .option('-s, --status <status>', 'Filter by status (pending, delivered, snoozed, done)')
  .action(async (opts: { status?: string }) => {
    try {
      const client = createClient();
      const params: Record<string, string> = {};
      if (opts.status) params.status = opts.status;

      const res = await client.get<ApiListResponse<Reminder>>('/api/v1/reminders', params);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      if (res.data.length === 0) {
        console.log('No reminders found.');
        return;
      }

      const rows = res.data.map((r) => [
        r.id.slice(0, 8),
        r.title,
        r.status,
        formatDate(r.scheduled_at),
        String(r.snooze_count),
      ]);
      printTable(['ID', 'Title', 'Status', 'Scheduled', 'Snoozed'], rows);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

reminderCommand
  .command('create <title>')
  .description('Create a reminder')
  .option('-a, --at <datetime>', 'Scheduled time (ISO datetime)')
  .option('-b, --body <body>', 'Reminder body')
  .action(async (title: string, opts: { at?: string; body?: string }) => {
    try {
      const client = createClient();
      const body: Record<string, unknown> = { title };
      if (opts.at) body.scheduled_at = opts.at;
      if (opts.body) body.body = opts.body;

      const res = await client.post<ApiResponse<Reminder>>('/api/v1/reminders', body);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Reminder created: ${res.data.title} (${res.data.id.slice(0, 8)})`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

reminderCommand
  .command('snooze <id>')
  .description('Snooze a reminder')
  .option('-m, --minutes <min>', 'Snooze duration in minutes (default 60)', '60')
  .action(async (id: string, opts: { minutes: string }) => {
    try {
      const client = createClient();
      const res = await client.post<ApiResponse<Reminder>>(`/api/v1/reminders/${id}/snooze`, {
        minutes: parseInt(opts.minutes, 10),
      });

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Reminder snoozed for ${opts.minutes} minutes.`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

reminderCommand
  .command('done <id>')
  .description('Mark a reminder as done')
  .action(async (id: string) => {
    try {
      const client = createClient();
      const res = await client.patch<ApiResponse<Reminder>>(`/api/v1/reminders/${id}`, { status: 'done' });

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Reminder marked as done: ${res.data.title}`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });
