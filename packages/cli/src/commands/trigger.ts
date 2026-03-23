import { Command } from 'commander';
import { createClient } from '../api-client.js';
import {
  isJsonMode,
  printError,
  printJson,
  printSuccess,
} from '../output.js';

const VALID_TRIGGERS = [
  'morning-briefing',
  'daily-review',
  'weekly-review',
  'overdue-triage',
  'reminder-check',
  'goal-health',
] as const;

export const triggerCommand = new Command('trigger')
  .description('Fire a named trigger')
  .argument('<name>', `Trigger name (${VALID_TRIGGERS.join(', ')})`)
  .action(async (name: string) => {
    try {
      if (!VALID_TRIGGERS.includes(name as (typeof VALID_TRIGGERS)[number])) {
        printError(`Unknown trigger: ${name}. Valid triggers: ${VALID_TRIGGERS.join(', ')}`);
        process.exitCode = 1;
        return;
      }

      const client = createClient();
      const res = await client.post<{ data: unknown }>(`/api/v1/triggers/${name}`);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Trigger '${name}' executed.`);
      if (res.data) {
        console.log(JSON.stringify(res.data, null, 2));
      }
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });
