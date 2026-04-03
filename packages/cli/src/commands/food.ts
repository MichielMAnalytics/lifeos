import { Command } from 'commander';
import type { ApiListResponse, ApiResponse, FoodLogEntry, DailyMacroTotals } from '@lifeos/shared';
import { createClient } from '../api-client.js';
import {
  formatDate,
  isJsonMode,
  printError,
  printJson,
  printSuccess,
  printTable,
  shortId,
} from '../output.js';

export const foodCommand = new Command('food')
  .description('Track food and nutrition');

foodCommand
  .command('log <name>')
  .description('Log a food entry')
  .option('-m, --meal <type>', 'Meal type (breakfast, lunch, dinner, snack)', 'lunch')
  .option('-d, --date <date>', 'Date (YYYY-MM-DD, default: today)')
  .option('--calories <kcal>', 'Calories')
  .option('--protein <grams>', 'Protein in grams')
  .option('--carbs <grams>', 'Carbs in grams')
  .option('--fat <grams>', 'Fat in grams')
  .option('-q, --quantity <qty>', 'Quantity (e.g., 200g, 1 cup)')
  .action(async (name: string, opts: { meal?: string; date?: string; calories?: string; protein?: string; carbs?: string; fat?: string; quantity?: string }) => {
    try {
      const client = createClient();
      const body: Record<string, unknown> = {
        name,
        entryDate: opts.date || new Date().toISOString().split('T')[0],
        mealType: opts.meal,
      };
      if (opts.calories) body.calories = parseFloat(opts.calories);
      if (opts.protein) body.protein = parseFloat(opts.protein);
      if (opts.carbs) body.carbs = parseFloat(opts.carbs);
      if (opts.fat) body.fat = parseFloat(opts.fat);
      if (opts.quantity) body.quantity = opts.quantity;

      const res = await client.post<ApiResponse<FoodLogEntry>>('/api/v1/food-log', body);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Logged: ${name} (${shortId(res.data)})`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

foodCommand
  .command('list')
  .description('List food entries')
  .option('-d, --date <date>', 'Date (YYYY-MM-DD, default: today)')
  .option('--from <date>', 'From date')
  .option('--to <date>', 'To date')
  .action(async (opts: { date?: string; from?: string; to?: string }) => {
    try {
      const client = createClient();
      const params: Record<string, string> = {};
      if (opts.date) params.date = opts.date;
      else if (!opts.from && !opts.to) params.date = new Date().toISOString().split('T')[0];
      if (opts.from) params.from = opts.from;
      if (opts.to) params.to = opts.to;

      const res = await client.get<ApiListResponse<FoodLogEntry>>('/api/v1/food-log', params);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      if (res.data.length === 0) {
        console.log('No food entries found.');
        return;
      }

      const rows = res.data.map((f) => [
        shortId(f),
        f.mealType ?? f.meal_type ?? '-',
        f.name,
        f.quantity ?? '-',
        f.calories ? `${Math.round(f.calories)}` : '-',
        f.protein ? `${Math.round(f.protein)}g` : '-',
        f.carbs ? `${Math.round(f.carbs)}g` : '-',
        f.fat ? `${Math.round(f.fat)}g` : '-',
      ]);
      printTable(['ID', 'Meal', 'Food', 'Qty', 'Cal', 'P', 'C', 'F'], rows);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

foodCommand
  .command('totals')
  .description('Show daily macro totals')
  .option('-d, --date <date>', 'Date (YYYY-MM-DD, default: today)')
  .action(async (opts: { date?: string }) => {
    try {
      const client = createClient();
      const date = opts.date || new Date().toISOString().split('T')[0];
      const res = await client.get<ApiResponse<DailyMacroTotals>>('/api/v1/food-log/totals', { date });

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      const t = res.data;
      console.log(`Date:     ${date}`);
      console.log(`Entries:  ${t.entries}`);
      console.log(`Calories: ${Math.round(t.calories)} kcal`);
      console.log(`Protein:  ${Math.round(t.protein)}g`);
      console.log(`Carbs:    ${Math.round(t.carbs)}g`);
      console.log(`Fat:      ${Math.round(t.fat)}g`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

foodCommand
  .command('delete <id>')
  .description('Delete a food entry')
  .action(async (id: string) => {
    try {
      const client = createClient();
      await client.del(`/api/v1/food-log/${id}`);
      printSuccess(`Food entry ${id.slice(0, 8)} deleted.`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });
