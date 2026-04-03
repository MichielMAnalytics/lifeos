import { Command } from 'commander';
import type { ApiResponse, HealthSummary } from '@lifeos/shared';
import { createClient } from '../api-client.js';
import {
  isJsonMode,
  printError,
  printJson,
} from '../output.js';

export const healthCommand = new Command('health')
  .description('Health overview');

healthCommand
  .command('summary')
  .description('Show weekly health summary')
  .option('-w, --week <date>', 'Week start date (YYYY-MM-DD, Monday; default: this week)')
  .action(async (opts: { week?: string }) => {
    try {
      const client = createClient();
      const params: Record<string, string> = {};
      if (opts.week) params.week = opts.week;

      const res = await client.get<ApiResponse<HealthSummary>>('/api/v1/health/summary', params);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      const s = res.data;
      const weekStart = s.weekStart ?? s.week_start ?? '?';
      const weekEnd = s.weekEnd ?? s.week_end ?? '?';
      const total = s.totalWorkouts ?? s.total_workouts ?? 0;
      const duration = s.totalDurationMinutes ?? s.total_duration_minutes ?? 0;
      const byType = s.byType ?? s.by_type ?? {};

      console.log(`Week: ${weekStart} \u2192 ${weekEnd}`);
      console.log(`Workouts: ${total}`);
      console.log(`Total Duration: ${duration} min`);

      if (Object.keys(byType).length > 0) {
        console.log(`\nBy Type:`);
        for (const [type, count] of Object.entries(byType)) {
          console.log(`  ${type}: ${count}`);
        }
      }

      if (total === 0) {
        console.log('\nNo workouts this week yet.');
      }
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });
