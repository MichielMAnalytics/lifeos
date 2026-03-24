import { Command } from 'commander';
import type { ApiResponse, MutationLogEntry } from '@lifeos/shared';
import { createClient } from '../api-client.js';
import {
  isJsonMode,
  printError,
  printJson,
  printSuccess,
} from '../output.js';

export const undoCommand = new Command('undo')
  .description('Undo the last mutation')
  .action(async () => {
    try {
      const client = createClient();
      const res = await client.post<{ data: { undone: string; table?: string; tableName?: string; record_id?: string; recordId?: string } }>('/api/v1/mutations/undo');

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      const entry = res.data;
      const table = entry.tableName ?? entry.table ?? 'unknown';
      const recordId = entry.recordId ?? entry.record_id ?? '';
      printSuccess(`Undid ${entry.undone} on ${table} (record ${recordId.slice(0, 8)}).`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });
