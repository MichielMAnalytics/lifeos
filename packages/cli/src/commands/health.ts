import { Command } from 'commander';
import type { ApiResponse, HealthSummary } from '@lifeos/shared';
import { createClient } from '../api-client.js';
import {
  isJsonMode,
  printError,
  printJson,
  printSuccess,
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

// ── Macro Goals ─────────────────────────────────────

healthCommand
  .command('macros')
  .description('Show current macro goals')
  .action(async () => {
    try {
      const client = createClient();
      const res = await client.get<ApiResponse<{ calories: number; protein: number; carbs: number; fat: number }>>('/api/v1/macro-goals');

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      const g = res.data;
      console.log(`Macro Goals:`);
      console.log(`  Calories: ${g.calories} kcal`);
      console.log(`  Protein:  ${g.protein}g`);
      console.log(`  Carbs:    ${g.carbs}g`);
      console.log(`  Fat:      ${g.fat}g`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

healthCommand
  .command('set-macros')
  .description('Set macro goals')
  .option('--calories <kcal>', 'Daily calorie target')
  .option('--protein <grams>', 'Daily protein target (grams)')
  .option('--carbs <grams>', 'Daily carbs target (grams)')
  .option('--fat <grams>', 'Daily fat target (grams)')
  .action(async (opts: { calories?: string; protein?: string; carbs?: string; fat?: string }) => {
    try {
      const body: Record<string, number> = {};
      if (opts.calories) body.calories = parseFloat(opts.calories);
      if (opts.protein) body.protein = parseFloat(opts.protein);
      if (opts.carbs) body.carbs = parseFloat(opts.carbs);
      if (opts.fat) body.fat = parseFloat(opts.fat);

      if (Object.keys(body).length === 0) {
        printError('Provide at least one macro to set (--calories, --protein, --carbs, --fat)');
        process.exitCode = 1;
        return;
      }

      const client = createClient();
      await client.put('/api/v1/macro-goals', body);

      if (isJsonMode()) {
        const res = await client.get<ApiResponse<{ calories: number; protein: number; carbs: number; fat: number }>>('/api/v1/macro-goals');
        printJson(res);
        return;
      }

      printSuccess('Macro goals updated');
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });
