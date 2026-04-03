import { Command } from 'commander';
import type { ApiListResponse, ApiResponse, Workout } from '@lifeos/shared';
import { createClient } from '../api-client.js';
import {
  formatDate,
  getId,
  isJsonMode,
  printError,
  printJson,
  printSuccess,
  printTable,
  shortId,
} from '../output.js';

export const workoutCommand = new Command('workout')
  .description('Manage workout logs');

workoutCommand
  .command('list')
  .description('List workouts')
  .option('-t, --type <type>', 'Filter by type (strength, cardio, mobility, sport, other)')
  .option('--from <date>', 'From date (YYYY-MM-DD)')
  .option('--to <date>', 'To date (YYYY-MM-DD)')
  .option('--programme <id>', 'Filter by programme ID')
  .action(async (opts: { type?: string; from?: string; to?: string; programme?: string }) => {
    try {
      const client = createClient();
      const params: Record<string, string> = {};
      if (opts.type) params.type = opts.type;
      if (opts.from) params.from = opts.from;
      if (opts.to) params.to = opts.to;
      if (opts.programme) params.programmeId = opts.programme;

      const res = await client.get<ApiListResponse<Workout>>('/api/v1/workouts', params);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      if (res.data.length === 0) {
        console.log('No workouts found.');
        return;
      }

      const rows = res.data.map((w) => [
        shortId(w),
        formatDate(w.workoutDate ?? w.workout_date ?? null),
        w.type,
        w.title,
        w.durationMinutes ?? w.duration_minutes ? `${w.durationMinutes ?? w.duration_minutes}min` : '-',
      ]);
      printTable(['ID', 'Date', 'Type', 'Title', 'Duration'], rows);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

workoutCommand
  .command('log <title>')
  .description('Log a workout')
  .requiredOption('-t, --type <type>', 'Workout type (strength, cardio, mobility, sport, other)')
  .option('-d, --date <date>', 'Workout date (YYYY-MM-DD, default: today)')
  .option('--duration <minutes>', 'Duration in minutes')
  .option('-n, --notes <notes>', 'Notes')
  .option('--programme <id>', 'Link to a programme')
  .action(async (title: string, opts: { type: string; date?: string; duration?: string; notes?: string; programme?: string }) => {
    try {
      const client = createClient();
      const body: Record<string, unknown> = {
        title,
        type: opts.type,
        workoutDate: opts.date || new Date().toISOString().split('T')[0],
      };
      if (opts.duration) body.durationMinutes = parseFloat(opts.duration);
      if (opts.notes) body.notes = opts.notes;
      if (opts.programme) body.programmeId = opts.programme;

      const res = await client.post<ApiResponse<Workout>>('/api/v1/workouts', body);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Workout logged: ${title} (${shortId(res.data)})`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

workoutCommand
  .command('show <id>')
  .description('Show workout details')
  .action(async (id: string) => {
    try {
      const client = createClient();
      const res = await client.get<ApiResponse<Workout>>(`/api/v1/workouts/${id}`);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      const w = res.data;
      console.log(`ID:        ${getId(w)}`);
      console.log(`Date:      ${formatDate(w.workoutDate ?? w.workout_date ?? null)}`);
      console.log(`Type:      ${w.type}`);
      console.log(`Title:     ${w.title}`);
      console.log(`Duration:  ${w.durationMinutes ?? w.duration_minutes ? `${w.durationMinutes ?? w.duration_minutes} min` : '-'}`);
      console.log(`Notes:     ${w.notes ?? '-'}`);
      if (w.exercises && w.exercises.length > 0) {
        console.log(`Exercises:`);
        for (const ex of w.exercises) {
          const parts = [ex.name];
          if (ex.sets) parts.push(`${ex.sets}x${ex.reps ?? '?'}`);
          if (ex.weight) parts.push(`${ex.weight}${ex.unit ?? 'kg'}`);
          console.log(`  - ${parts.join(' ')}`);
        }
      }
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

workoutCommand
  .command('delete <id>')
  .description('Delete a workout')
  .action(async (id: string) => {
    try {
      const client = createClient();
      await client.del(`/api/v1/workouts/${id}`);
      printSuccess(`Workout ${id.slice(0, 8)} deleted.`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });
