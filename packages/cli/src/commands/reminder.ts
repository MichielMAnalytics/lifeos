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
  shortId,
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
        shortId(r),
        r.title,
        r.status,
        formatDate(r.scheduledAt ?? r.scheduled_at ?? null),
        String(r.snoozeCount ?? r.snooze_count ?? 0),
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
      if (opts.at) body.scheduledAt = opts.at;
      if (opts.body) body.body = opts.body;

      const res = await client.post<ApiResponse<Reminder>>('/api/v1/reminders', body);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Reminder created: ${res.data.title} (${shortId(res.data)})`);
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
  .command('update <id>')
  .description('Update a reminder')
  .option('-t, --title <title>', 'New title')
  .option('-b, --body <body>', 'New body')
  .option('-a, --at <datetime>', 'New scheduled time (ISO datetime)')
  .action(async (id: string, opts: { title?: string; body?: string; at?: string }) => {
    try {
      const client = createClient();
      const payload: Record<string, unknown> = {};
      if (opts.title) payload.title = opts.title;
      if (opts.body) payload.body = opts.body;
      if (opts.at) payload.scheduledAt = opts.at;

      const res = await client.patch<ApiResponse<Reminder>>(`/api/v1/reminders/${id}`, payload);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Reminder updated: ${res.data.title}`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

reminderCommand
  .command('delete <id>')
  .description('Delete a reminder')
  .action(async (id: string) => {
    try {
      const client = createClient();
      await client.del(`/api/v1/reminders/${id}`);
      printSuccess(`Reminder ${id.slice(0, 8)} deleted.`);
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
