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
  getId,
  isJsonMode,
  printError,
  printJson,
  printSuccess,
  printTable,
  shortId,
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
      if (opts.type) params.reviewType = opts.type;

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
        shortId(r),
        r.reviewType ?? r.review_type ?? '-',
        `${r.periodStart ?? r.period_start ?? '-'} - ${r.periodEnd ?? r.period_end ?? '-'}`,
        r.score !== null ? String(r.score) : '-',
        formatDate(r.createdAt ?? r.created_at ?? null),
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

      const d = res.data as Record<string, unknown>;
      console.log('=== Daily Review ===\n');

      const completedToday = (d.completedToday ?? d.tasks_completed_today ?? []) as Array<{ title: string }>;
      if (completedToday.length > 0) {
        console.log('Tasks completed today:');
        for (const t of completedToday) {
          console.log(`  - ${t.title}`);
        }
        console.log();
      }

      const winsToday = (d.todayWins ?? d.wins_today ?? []) as Array<{ content: string }>;
      if (winsToday.length > 0) {
        console.log('Wins today:');
        for (const w of winsToday) {
          console.log(`  - ${w.content}`);
        }
        console.log();
      }

      const journal = (d.todayJournal ?? d.journal) as { mit?: string; p1?: string; p2?: string } | null;
      if (journal) {
        console.log(`Journal MIT:  ${journal.mit ?? '-'}`);
        console.log(`Journal P1:   ${journal.p1 ?? '-'}`);
        console.log(`Journal P2:   ${journal.p2 ?? '-'}`);
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

      const d = res.data as Record<string, unknown>;
      console.log('=== Weekly Review ===\n');

      const weeklyPlan = (d.weeklyPlan ?? d.weekly_plan) as { theme?: string; reviewScore?: number; review_score?: number } | null;
      if (weeklyPlan) {
        console.log(`Theme:  ${weeklyPlan.theme ?? '-'}`);
        console.log(`Score:  ${weeklyPlan.reviewScore ?? weeklyPlan.review_score ?? '-'}`);
        console.log();
      }

      const tasksCompleted = (d.completedThisWeek ?? d.tasks_completed ?? []) as unknown[];
      const journals = (d.weekJournals ?? d.journals ?? []) as unknown[];
      const wins = (d.weekWins ?? d.wins ?? []) as unknown[];
      const goals = (d.activeGoals ?? d.goals ?? []) as unknown[];
      console.log(`Tasks completed: ${tasksCompleted.length}`);
      console.log(`Journal entries: ${journals.length}`);
      console.log(`Wins:            ${wins.length}`);
      console.log(`Goals tracked:   ${goals.length}`);
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
      console.log(`ID:      ${getId(r)}`);
      console.log(`Type:    ${r.reviewType ?? r.review_type ?? '-'}`);
      console.log(`Period:  ${r.periodStart ?? r.period_start ?? '-'} - ${r.periodEnd ?? r.period_end ?? '-'}`);
      console.log(`Score:   ${r.score ?? '-'}`);
      console.log(`Created: ${formatDate(r.createdAt ?? r.created_at ?? null)}`);
      console.log('Content:');
      console.log(JSON.stringify(r.content, null, 2));
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

reviewCommand
  .command('import')
  .description('Import/backfill a review')
  .option('--type <type>', 'Review type (daily, weekly, monthly, quarterly)', 'weekly')
  .option('--start <date>', 'Period start (YYYY-MM-DD)')
  .option('--end <date>', 'Period end (YYYY-MM-DD)')
  .option('--content <text>', 'Review content')
  .option('--score <n>', 'Score (1-10)')
  .action(async (opts: { type: string; start?: string; end?: string; content?: string; score?: string }) => {
    try {
      const client = createClient();
      const body: Record<string, unknown> = {
        reviewType: opts.type,
        periodStart: opts.start,
        periodEnd: opts.end,
        content: opts.content ?? '',
      };
      if (opts.score) body.score = parseInt(opts.score, 10);

      const res = await client.post<ApiResponse<Review>>('/api/v1/reviews', body);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess('Review imported.');
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

reviewCommand
  .command('delete <id>')
  .description('Delete a review')
  .action(async (id: string) => {
    try {
      const client = createClient();
      await client.del(`/api/v1/reviews/${id}`);
      printSuccess('Review deleted.');
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

// ── Quarterly Moving Future ──────────────────────────
// Dan Sullivan's three-M check-in. CLI version mirrors the wizard:
// Morale (proudest + wins), Momentum (what's working), Motivation (what's
// next) → spawns 0–N goals with the next quarter stamped on them.
// Atomic on the Convex side (review row + goals land together or not at all).

reviewCommand
  .command('quarterly')
  .description('Save a quarterly Moving Future check-in (creates the review row + N goals atomically).')
  .requiredOption('--period-start <date>', 'Closing quarter start (YYYY-MM-DD)')
  .requiredOption('--period-end <date>', 'Closing quarter end (YYYY-MM-DD)')
  .requiredOption('--quarter-label <label>', 'e.g. "Q1 2026"')
  .requiredOption('--next-quarter-label <label>', 'e.g. "Q2 2026"')
  .requiredOption('--next-quarter-key <key>', 'goals.quarter value, e.g. "2026-Q2"')
  .requiredOption('--proudest <text>', 'Morale: what you\'re most proud of')
  .requiredOption('--confident-about <text>', 'Momentum: what\'s working right now')
  .requiredOption('--excited-about <text>', 'Motivation: what\'s next')
  .option('--wins <list>', 'Morale wins, newline-separated')
  .option('--priorities <list>', 'Next-quarter priorities, newline-separated. Each becomes a goal unless prefixed with `-` (skip).')
  .option('--score <n>', 'Score 1–10', '8')
  .action(
    async (opts: {
      periodStart: string;
      periodEnd: string;
      quarterLabel: string;
      nextQuarterLabel: string;
      nextQuarterKey: string;
      proudest: string;
      confidentAbout: string;
      excitedAbout: string;
      wins?: string;
      priorities?: string;
      score: string;
    }) => {
      try {
        const wins = (opts.wins ?? '').split('\n').map((w) => w.trim()).filter(Boolean);
        const priorities = (opts.priorities ?? '')
          .split('\n')
          .map((p) => p.trim())
          .filter(Boolean)
          .map((line) => {
            const skip = line.startsWith('-');
            return {
              title: skip ? line.slice(1).trim() : line,
              createAsGoal: !skip,
            };
          });
        const score = Number(opts.score);
        const client = createClient();
        const res = await client.post('/api/v1/reviews/moving-future', {
          periodStart: opts.periodStart,
          periodEnd: opts.periodEnd,
          quarterLabel: opts.quarterLabel,
          nextQuarterLabel: opts.nextQuarterLabel,
          nextQuarterGoalKey: opts.nextQuarterKey,
          morale: { proudest: opts.proudest, wins },
          momentum: { confidentAbout: opts.confidentAbout },
          motivation: { excitedAbout: opts.excitedAbout },
          priorities,
          score: Number.isFinite(score) ? score : undefined,
        });
        if (isJsonMode()) {
          printJson(res);
          return;
        }
        const goalsCreated = priorities.filter((p) => p.createAsGoal).length;
        printSuccess(
          `Moving Future saved for ${opts.quarterLabel} (${goalsCreated} ${opts.nextQuarterLabel} goal${goalsCreated === 1 ? '' : 's'} created).`,
        );
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    },
  );
