import { Command } from 'commander';
import type { ApiListResponse, ApiResponse, Programme } from '@lifeos/shared';
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

export const programmeCommand = new Command('programme')
  .description('Manage training programmes');

programmeCommand
  .command('list')
  .description('List programmes')
  .option('-s, --status <status>', 'Filter by status (active, completed, archived)')
  .action(async (opts: { status?: string }) => {
    try {
      const client = createClient();
      const params: Record<string, string> = {};
      if (opts.status) params.status = opts.status;

      const res = await client.get<ApiListResponse<Programme>>('/api/v1/programmes', params);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      if (res.data.length === 0) {
        console.log('No programmes found.');
        return;
      }

      const rows = res.data.map((p) => [
        shortId(p),
        p.title,
        p.status,
        formatDate(p.startDate ?? p.start_date ?? null),
        formatDate(p.endDate ?? p.end_date ?? null),
      ]);
      printTable(['ID', 'Title', 'Status', 'Start', 'End'], rows);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

programmeCommand
  .command('create <title>')
  .description('Create a training programme')
  .option('-s, --start <date>', 'Start date (YYYY-MM-DD, default: today)')
  .option('-d, --description <text>', 'Description')
  .option('-n, --notes <text>', 'Notes')
  .action(async (title: string, opts: { start?: string; description?: string; notes?: string }) => {
    try {
      const client = createClient();
      const body: Record<string, unknown> = {
        title,
        startDate: opts.start || new Date().toISOString().split('T')[0],
      };
      if (opts.description) body.description = opts.description;
      if (opts.notes) body.notes = opts.notes;

      const res = await client.post<ApiResponse<Programme>>('/api/v1/programmes', body);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Programme created: ${title} (${shortId(res.data)})`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

programmeCommand
  .command('show <id>')
  .description('Show programme details')
  .action(async (id: string) => {
    try {
      const client = createClient();
      const res = await client.get<ApiResponse<Programme>>(`/api/v1/programmes/${id}`);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      const p = res.data;
      console.log(`ID:           ${getId(p)}`);
      console.log(`Title:        ${p.title}`);
      console.log(`Status:       ${p.status}`);
      console.log(`Start:        ${formatDate(p.startDate ?? p.start_date ?? null)}`);
      console.log(`End:          ${formatDate(p.endDate ?? p.end_date ?? null)}`);
      console.log(`Current Week: ${p.currentWeek ?? p.current_week ?? '-'}`);
      console.log(`Description:  ${p.description ?? '-'}`);
      console.log(`Notes:        ${p.notes ?? '-'}`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

programmeCommand
  .command('update <id>')
  .description('Update a programme')
  .option('-t, --title <text>', 'New title')
  .option('-s, --status <status>', 'New status (active, completed, archived)')
  .option('-d, --description <text>', 'New description')
  .option('-n, --notes <text>', 'New notes')
  .action(async (id: string, opts: { title?: string; status?: string; description?: string; notes?: string }) => {
    try {
      const client = createClient();
      const body: Record<string, unknown> = {};
      if (opts.title) body.title = opts.title;
      if (opts.status) body.status = opts.status;
      if (opts.description) body.description = opts.description;
      if (opts.notes) body.notes = opts.notes;

      const res = await client.patch<ApiResponse<Programme>>(`/api/v1/programmes/${id}`, body);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Programme updated: ${res.data.title}`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

programmeCommand
  .command('delete <id>')
  .description('Delete a programme')
  .action(async (id: string) => {
    try {
      const client = createClient();
      await client.del(`/api/v1/programmes/${id}`);
      printSuccess(`Programme ${id.slice(0, 8)} deleted.`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });
