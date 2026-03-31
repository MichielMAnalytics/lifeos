import { Command } from 'commander';
import type { ApiResponse, ApiListResponse, Journal, Win } from '@lifeos/shared';
import { createClient } from '../api-client.js';
import {
  formatDate,
  isJsonMode,
  printError,
  printJson,
  printSuccess,
  printTable,
} from '../output.js';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export const journalCommand = new Command('journal')
  .description('Journal entries')
  .argument('[date]', 'Entry date (YYYY-MM-DD, default today)')
  .action(async (date?: string) => {
    try {
      const client = createClient();
      const d = date ?? todayStr();
      const res = await client.get<ApiResponse<Journal>>(`/api/v1/journal/${d}`);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      const j = res.data;
      console.log(`Date:   ${j.entryDate ?? j.entry_date ?? '-'}`);
      console.log(`MIT:    ${j.mit ?? '-'}`);
      console.log(`P1:     ${j.p1 ?? '-'}`);
      console.log(`P2:     ${j.p2 ?? '-'}`);
      console.log(`Notes:  ${j.notes ?? '-'}`);
      if (j.wins.length > 0) {
        console.log(`Wins:`);
        for (const w of j.wins) {
          console.log(`  - ${w}`);
        }
      }
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

journalCommand
  .command('write')
  .description('Write or update a journal entry')
  .option('--date <date>', 'Entry date (YYYY-MM-DD, default today)')
  .option('--mit <text>', 'Most Important Task')
  .option('--p1 <text>', 'Priority 1')
  .option('--p2 <text>', 'Priority 2')
  .option('--notes <text>', 'Notes')
  .option('--wins <text...>', 'Wins to record (repeatable)')
  .action(async (opts: { date?: string; mit?: string; p1?: string; p2?: string; notes?: string; wins?: string[] }) => {
    try {
      const client = createClient();
      const body: Record<string, unknown> = {};
      if (opts.mit) body.mit = opts.mit;
      if (opts.p1) body.p1 = opts.p1;
      if (opts.p2) body.p2 = opts.p2;
      if (opts.notes) body.notes = opts.notes;
      if (opts.wins && opts.wins.length > 0) body.wins = opts.wins;

      const d = opts.date ?? todayStr();
      const res = await client.put<ApiResponse<Journal>>(`/api/v1/journal/${d}`, body);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Journal entry saved for ${res.data.entryDate ?? res.data.entry_date ?? d}.`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

journalCommand
  .command('list')
  .description('List journal entries')
  .option('--from <date>', 'From date (YYYY-MM-DD)')
  .option('--to <date>', 'To date (YYYY-MM-DD)')
  .action(async (opts: { from?: string; to?: string }) => {
    try {
      const client = createClient();
      const params: Record<string, string> = {};
      if (opts.from) params.from = opts.from;
      if (opts.to) params.to = opts.to;

      const res = await client.get<ApiListResponse<Journal>>('/api/v1/journal', params);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      if (res.data.length === 0) {
        console.log('No journal entries found.');
        return;
      }

      const rows = res.data.map((j) => [
        j.entryDate ?? j.entry_date ?? '-',
        j.mit ?? '-',
        j.p1 ?? '-',
        j.p2 ?? '-',
        j.notes ? (j.notes.length > 40 ? j.notes.slice(0, 37) + '...' : j.notes) : '-',
      ]);
      printTable(['Date', 'MIT', 'P1', 'P2', 'Notes'], rows);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

journalCommand
  .command('delete <date>')
  .description('Delete a journal entry')
  .action(async (date: string) => {
    try {
      const client = createClient();
      await client.del(`/api/v1/journal/${date}`);
      printSuccess(`Journal entry for ${date} deleted.`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

journalCommand
  .command('wins [date]')
  .description('List wins for a date')
  .action(async (date?: string) => {
    try {
      const client = createClient();
      const d = date ?? todayStr();
      const res = await client.get<ApiListResponse<Win>>(`/api/v1/wins`, { entryDate: d });

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      if (res.data.length === 0) {
        console.log(`No wins recorded for ${d}.`);
        return;
      }

      console.log(`Wins for ${d}:`);
      for (const w of res.data) {
        console.log(`  - ${w.content} (${formatDate(w.createdAt ?? w.created_at ?? null)})`);
      }
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });
