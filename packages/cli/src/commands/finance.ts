import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import type {
  ApiListResponse,
  ApiResponse,
  FinanceCategory,
  FinanceTransaction,
  NetWorthSnapshot,
} from '@lifeos/shared';
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

export const financeCommand = new Command('finance')
  .description('Manage finances');

financeCommand
  .command('list')
  .description('List transactions')
  .option('-f, --from <date>', 'Start date (YYYY-MM-DD)')
  .option('-t, --to <date>', 'End date (YYYY-MM-DD)')
  .action(async (opts: { from?: string; to?: string }) => {
    try {
      const client = createClient();
      const params: Record<string, string> = {};
      if (opts.from) params.from = opts.from;
      if (opts.to) params.to = opts.to;

      const res = await client.get<ApiListResponse<FinanceTransaction>>('/api/v1/finance/transactions', params);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      if (res.data.length === 0) {
        console.log('No transactions found.');
        return;
      }

      const rows = res.data.map((t) => [
        t.id.slice(0, 8),
        t.date,
        `${t.amount.toFixed(2)} ${t.currency}`,
        t.merchant ?? '-',
        t.category_id?.slice(0, 8) ?? '-',
      ]);
      printTable(['ID', 'Date', 'Amount', 'Merchant', 'Category'], rows);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

financeCommand
  .command('add <amount> <merchant>')
  .description('Add a transaction')
  .option('-c, --category <id>', 'Category ID')
  .option('-d, --date <date>', 'Transaction date (YYYY-MM-DD, default today)')
  .action(async (amount: string, merchant: string, opts: { category?: string; date?: string }) => {
    try {
      const client = createClient();
      const body: Record<string, unknown> = {
        amount: parseFloat(amount),
        merchant,
        date: opts.date ?? todayStr(),
      };
      if (opts.category) body.category_id = opts.category;

      const res = await client.post<ApiResponse<FinanceTransaction>>('/api/v1/finance/transactions', body);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Transaction added: ${res.data.amount.toFixed(2)} ${res.data.currency} at ${res.data.merchant} (${res.data.id.slice(0, 8)})`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

financeCommand
  .command('import <file>')
  .description('Import transactions from CSV')
  .action(async (file: string) => {
    try {
      const client = createClient();
      const csv = readFileSync(file, 'utf-8');
      const res = await client.post<ApiResponse<{ imported: number }>>('/api/v1/finance/import', { csv });

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Imported ${res.data.imported} transactions.`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

financeCommand
  .command('net-worth')
  .description('Show latest net worth snapshot')
  .action(async () => {
    try {
      const client = createClient();
      const res = await client.get<ApiResponse<NetWorthSnapshot>>('/api/v1/finance/net-worth/latest');

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      const nw = res.data;
      console.log(`Date:   ${nw.date}`);
      console.log(`Total:  ${nw.total.toLocaleString()}`);
      if (Object.keys(nw.breakdown).length > 0) {
        console.log('Breakdown:');
        for (const [key, value] of Object.entries(nw.breakdown)) {
          console.log(`  ${key}: ${value.toLocaleString()}`);
        }
      }
      if (nw.notes) {
        console.log(`Notes:  ${nw.notes}`);
      }
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

financeCommand
  .command('snapshot')
  .description('Create a net worth snapshot')
  .option('-t, --total <amount>', 'Total net worth')
  .option('-n, --notes <notes>', 'Notes')
  .action(async (opts: { total?: string; notes?: string }) => {
    try {
      const client = createClient();
      const body: Record<string, unknown> = {
        date: todayStr(),
        breakdown: {},
        total: opts.total ? parseFloat(opts.total) : 0,
      };
      if (opts.notes) body.notes = opts.notes;

      const res = await client.post<ApiResponse<NetWorthSnapshot>>('/api/v1/finance/net-worth', body);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Net worth snapshot saved for ${res.data.date}.`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

financeCommand
  .command('categories')
  .description('List finance categories')
  .action(async () => {
    try {
      const client = createClient();
      const res = await client.get<ApiListResponse<FinanceCategory>>('/api/v1/finance/categories');

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      if (res.data.length === 0) {
        console.log('No categories found.');
        return;
      }

      const rows = res.data.map((c) => [
        c.id.slice(0, 8),
        c.name,
        c.parent_id?.slice(0, 8) ?? '-',
      ]);
      printTable(['ID', 'Name', 'Parent'], rows);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });
