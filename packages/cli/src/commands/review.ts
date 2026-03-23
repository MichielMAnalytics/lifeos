import { Command } from 'commander';
import type {
  ApiListResponse,
  ApiResponse,
  Review,
  DailyReviewPrompt,
  WeeklyReviewData,
} from '@lifeos/shared';
import { createClient } from '../api-client.js';
import {
  formatDate,
  isJsonMode,
  printError,
  printJson,
  printTable,
} from '../output.js';

export const reviewCommand = new Command('review')
  .description('Manage reviews');

reviewCommand
  .command('list')
  .description('List reviews')
  .option('-t, --type <type>', 'Filter by type (daily, weekly, monthly, quarterly)')
  .action(async (opts: { type?: string }) => {
    try {
      const client = createClient();
      const params: Record<string, string> = {};
      if (opts.type) params.review_type = opts.type;

      const res = await client.get<ApiListResponse<Review>>('/api/v1/reviews', params);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      if (res.data.length === 0) {
        console.log('No reviews found.');
        return;
      }

      const rows = res.data.map((r) => [
        r.id.slice(0, 8),
        r.review_type,
        `${r.period_start} - ${r.period_end}`,
        r.score !== null ? String(r.score) : '-',
        formatDate(r.created_at),
      ]);
      printTable(['ID', 'Type', 'Period', 'Score', 'Created'], rows);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

reviewCommand
  .command('daily')
  .description('Trigger a daily review and show results')
  .action(async () => {
    try {
      const client = createClient();
      const res = await client.post<ApiResponse<DailyReviewPrompt>>('/api/v1/triggers/daily-review');

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      const d = res.data;
      console.log('=== Daily Review ===\n');

      if (d.tasks_completed_today.length > 0) {
        console.log('Tasks completed today:');
        for (const t of d.tasks_completed_today) {
          console.log(`  - ${t.title}`);
        }
        console.log();
      }

      if (d.wins_today.length > 0) {
        console.log('Wins today:');
        for (const w of d.wins_today) {
          console.log(`  - ${w.content}`);
        }
        console.log();
      }

      if (d.journal) {
        console.log(`Journal MIT:  ${d.journal.mit ?? '-'}`);
        console.log(`Journal P1:   ${d.journal.p1 ?? '-'}`);
        console.log(`Journal P2:   ${d.journal.p2 ?? '-'}`);
      }
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

reviewCommand
  .command('weekly')
  .description('Trigger a weekly review and show results')
  .action(async () => {
    try {
      const client = createClient();
      const res = await client.post<ApiResponse<WeeklyReviewData>>('/api/v1/triggers/weekly-review');

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      const d = res.data;
      console.log('=== Weekly Review ===\n');

      if (d.weekly_plan) {
        console.log(`Theme:  ${d.weekly_plan.theme ?? '-'}`);
        console.log(`Score:  ${d.weekly_plan.review_score ?? '-'}`);
        console.log();
      }

      console.log(`Tasks completed: ${d.tasks_completed.length}`);
      console.log(`Journal entries: ${d.journals.length}`);
      console.log(`Wins:            ${d.wins.length}`);
      console.log(`Goals tracked:   ${d.goals.length}`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

reviewCommand
  .command('show <id>')
  .description('Show review details')
  .action(async (id: string) => {
    try {
      const client = createClient();
      const res = await client.get<ApiResponse<Review>>(`/api/v1/reviews/${id}`);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      const r = res.data;
      console.log(`ID:      ${r.id}`);
      console.log(`Type:    ${r.review_type}`);
      console.log(`Period:  ${r.period_start} - ${r.period_end}`);
      console.log(`Score:   ${r.score ?? '-'}`);
      console.log(`Created: ${formatDate(r.created_at)}`);
      console.log('Content:');
      console.log(JSON.stringify(r.content, null, 2));
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });
