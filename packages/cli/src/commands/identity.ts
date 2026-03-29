import { Command } from 'commander';
import type { ApiResponse } from '@lifeos/shared';
import { createClient } from '../api-client.js';
import {
  formatDate,
  isJsonMode,
  printError,
  printJson,
  printSuccess,
} from '../output.js';

interface Identity {
  _id?: string;
  id?: string;
  statement: string;
  updatedAt?: number;
  updated_at?: number;
}

export const identityCommand = new Command('identity')
  .description('Manage your identity statement')
  .action(async () => {
    // Default action: show current identity
    try {
      const client = createClient();
      const res = await client.get<{ data: Identity | null }>('/api/v1/identity');

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      if (!res.data) {
        console.log('No identity statement set. Use "lifeos identity set <statement>" to create one.');
        return;
      }

      console.log(res.data.statement);
      const ts = res.data.updatedAt ?? res.data.updated_at;
      if (ts) {
        console.log(`\nLast updated: ${formatDate(new Date(ts).toISOString())}`);
      }
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

identityCommand
  .command('show')
  .description('Show current identity statement')
  .action(async () => {
    try {
      const client = createClient();
      const res = await client.get<{ data: Identity | null }>('/api/v1/identity');

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      if (!res.data) {
        console.log('No identity statement set. Use "lifeos identity set <statement>" to create one.');
        return;
      }

      console.log(res.data.statement);
      const ts = res.data.updatedAt ?? res.data.updated_at;
      if (ts) {
        console.log(`\nLast updated: ${formatDate(new Date(ts).toISOString())}`);
      }
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

identityCommand
  .command('set <statement>')
  .description('Set your identity statement')
  .action(async (statement: string) => {
    try {
      const client = createClient();
      const res = await client.put<ApiResponse<Identity>>('/api/v1/identity', { statement });

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess('Identity statement updated.');
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });
