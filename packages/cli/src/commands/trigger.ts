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

      if (name === 'reminder-check' && res.data && !isJsonMode()) {
        const reminders = (res.data as { pending?: unknown[] })?.pending;
        if (Array.isArray(reminders) && reminders.length > 0) {
          console.log(`\n${reminders.length} pending reminder(s):`);
          for (const r of reminders) {
            const rem = r as { _id?: string; title?: string; scheduledAt?: number };
            const time = rem.scheduledAt ? new Date(rem.scheduledAt).toLocaleString() : '-';
            console.log(`  • ${rem.title ?? 'Untitled'} (${time}) [${(rem._id ?? '').slice(0, 8)}]`);
          }
        } else {
          console.log('No pending reminders.');
        }
      } else if (res.data) {
        console.log(JSON.stringify(res.data, null, 2));
      }
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });
