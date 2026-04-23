import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { Command } from 'commander';
import type {
  ApiListResponse,
  ApiResponse,
  FinanceCategory,
  FinanceStatement,
  FinanceTransaction,
} from '@lifeos/shared';
import { createClient } from '../api-client.js';
import {
  isJsonMode,
  printError,
  printJson,
  printSuccess,
  printTable,
  shortId,
} from '../output.js';

export const financeCommand = new Command('finance')
  .description('Browse and import personal finance data');

// ── transactions list ────────────────────────────────

financeCommand
  .command('list')
  .description('List recent transactions (newest first)')
  .option('-s, --status <status>', 'Filter by status: uncategorized, categorized, excluded')
  .option('-l, --limit <n>', 'Max rows to fetch (default 50)')
  .action(async (opts: { status?: string; limit?: string }) => {
    try {
      const client = createClient();
      const params: Record<string, string> = {};
      if (opts.status) params.status = opts.status;
      if (opts.limit) params.limit = opts.limit;

      const res = await client.get<ApiListResponse<FinanceTransaction>>(
        '/api/v1/finance/transactions',
        params,
      );

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      if (res.data.length === 0) {
        console.log('No transactions found.');
        return;
      }

      const cats = await client.get<ApiListResponse<FinanceCategory>>('/api/v1/finance/categories');
      const catNameById = new Map<string, string>();
      for (const c of cats.data) catNameById.set(String(c._id ?? c.id), c.name);

      const rows = res.data.map((t) => [
        shortId(t),
        t.date,
        (t.description ?? '').slice(0, 40),
        formatMoney(t.amountUsd ?? t.amount_usd ?? null, t.amount, t.currency),
        t.status ?? '?',
        t.categoryId ? catNameById.get(String(t.categoryId)) ?? '?' : '—',
      ]);
      printTable(['ID', 'Date', 'Description', 'Amount', 'Status', 'Category'], rows);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

// ── categorize ───────────────────────────────────────

financeCommand
  .command('categorize <txnId> <categoryId>')
  .description('Assign a category to a transaction (use full IDs)')
  .action(async (txnId: string, categoryId: string) => {
    try {
      const client = createClient();
      await client.post<ApiResponse<unknown>>(
        `/api/v1/finance/transactions/${txnId}/categorize`,
        { categoryId },
      );
      printSuccess(`Categorised ${txnId.slice(0, 8)}.`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

// ── categories list ──────────────────────────────────

financeCommand
  .command('categories')
  .description('List your finance categories')
  .action(async () => {
    try {
      const client = createClient();
      const res = await client.get<ApiListResponse<FinanceCategory>>('/api/v1/finance/categories');
      if (isJsonMode()) {
        printJson(res);
        return;
      }
      if (res.data.length === 0) {
        console.log('No categories yet. Run `lifeos finance seed` to create defaults.');
        return;
      }
      const rows = res.data.map((c) => [
        String(c._id ?? c.id),
        c.name,
        (c.isIncome ?? c.is_income) ? 'income' : 'spend',
      ]);
      printTable(['ID', 'Name', 'Kind'], rows);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

// ── seed defaults ────────────────────────────────────

financeCommand
  .command('seed')
  .description('Create the 13 default finance categories (idempotent)')
  .action(async () => {
    try {
      const client = createClient();
      const res = await client.post<ApiResponse<{ inserted: number }>>(
        '/api/v1/finance/categories/seed',
      );
      if (isJsonMode()) {
        printJson(res);
        return;
      }
      printSuccess(`Inserted ${res.data.inserted} new categor${res.data.inserted === 1 ? 'y' : 'ies'}.`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

// ── upload ───────────────────────────────────────────

financeCommand
  .command('upload <file>')
  .description('Upload a Revolut/WIO/generic CSV bank statement')
  .option('-s, --source <source>', 'revolut | wio | generic | auto', 'auto')
  .option('-a, --account <label>', 'Optional account label for the statement')
  .action(async (file: string, opts: { source?: string; account?: string }) => {
    try {
      const path = resolvePath(file);
      const csvText = readFileSync(path, 'utf8');
      const filename = file.split(/[\\/]/).pop() ?? file;

      const client = createClient();
      const res = await client.post<ApiResponse<{
        ok?: boolean;
        source?: string;
        inserted?: number;
        skipped?: number;
        parseSkipped?: number;
        reason?: string;
      }>>('/api/v1/finance/import', {
        csvText,
        filename,
        source: opts.source ?? 'auto',
        accountLabel: opts.account,
      });

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      const r = res.data;
      if (r?.ok === false) {
        printError(`Import failed: ${r.reason ?? 'unknown'}`);
        process.exitCode = 1;
        return;
      }
      printSuccess(
        `Imported ${r.inserted ?? 0} new, skipped ${r.skipped ?? 0} duplicates ` +
          `(${r.parseSkipped ?? 0} unparseable). Source: ${r.source ?? '?'}.`,
      );
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

// ── statements ───────────────────────────────────────

financeCommand
  .command('statements')
  .description('List past CSV uploads')
  .action(async () => {
    try {
      const client = createClient();
      const res = await client.get<ApiListResponse<FinanceStatement>>('/api/v1/finance/statements');
      if (isJsonMode()) {
        printJson(res);
        return;
      }
      if (res.data.length === 0) {
        console.log('No uploads yet.');
        return;
      }
      const rows = res.data.map((s) => [
        shortId(s),
        s.source,
        s.filename,
        String(s.parsedCount ?? s.parsed_count ?? 0),
        String(s.skippedCount ?? s.skipped_count ?? 0),
      ]);
      printTable(['ID', 'Source', 'Filename', 'Parsed', 'Skipped'], rows);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

// ── suggest ──────────────────────────────────────────

financeCommand
  .command('suggest')
  .description('Run AI categorisation suggestions on uncategorised transactions')
  .action(async () => {
    try {
      const client = createClient();
      const res = await client.post<ApiResponse<{
        ok?: boolean;
        memoryHits?: number;
        llmSuggested?: number;
        remaining?: number;
        reason?: string;
      }>>('/api/v1/finance/suggest');
      if (isJsonMode()) {
        printJson(res);
        return;
      }
      const r = res.data;
      if (r?.ok === false) {
        printError(`Suggest failed: ${r.reason ?? 'unknown'}`);
        process.exitCode = 1;
        return;
      }
      printSuccess(
        `Memory hits: ${r.memoryHits ?? 0}, LLM suggested: ${r.llmSuggested ?? 0}, remaining: ${r.remaining ?? 0}.`,
      );
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

// ── helpers ──────────────────────────────────────────

function formatMoney(amountUsd: number | null | undefined, amount: number, currency: string): string {
  if (amountUsd !== null && amountUsd !== undefined) {
    return `$${amountUsd.toFixed(2)}`;
  }
  return `${amount.toFixed(2)} ${currency}`;
}
