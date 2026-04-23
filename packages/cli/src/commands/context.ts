import { Command } from 'commander';
import type { ApiResponse } from '@lifeos/shared';
import { createClient } from '../api-client.js';
import { isJsonMode, printError, printJson } from '../output.js';

interface ContextNowReminder {
  id: string;
  title: string;
  scheduledAt: number;
  minutesUntil: number;
}

interface ContextNowActiveTask {
  id: string;
  title: string;
}

interface ContextNowPlanBlock {
  start: string;
  end: string;
  label: string;
  type: string;
  taskId?: string | null;
}

interface ContextNow {
  now: number;
  timezone: string;
  nextReminder?: ContextNowReminder;
  activeTask?: ContextNowActiveTask;
  todaysPlanBlocks?: ContextNowPlanBlock[];
}

export const contextCommand = new Command('context')
  .description("Inspect what's happening right now in LifeOS");

contextCommand
  .command('now')
  .description("Print the current deterministic context snapshot")
  .action(async () => {
    try {
      const client = createClient();
      const res = await client.get<ApiResponse<ContextNow>>('/api/v1/context/now');

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      const ctx = res.data;
      console.log(`Now:           ${formatNow(ctx.now, ctx.timezone)} (${ctx.timezone})`);
      console.log(`Active task:   ${ctx.activeTask ? ctx.activeTask.title : '\u2014'}`);
      console.log(
        `Next reminder: ${
          ctx.nextReminder
            ? `${ctx.nextReminder.title} in ${formatMinutesUntil(ctx.nextReminder.minutesUntil)}`
            : '\u2014'
        }`,
      );

      const blocks = ctx.todaysPlanBlocks ?? [];
      console.log(`Today's plan:  ${blocks.length} block${blocks.length === 1 ? '' : 's'}`);
      for (const block of blocks) {
        const label = block.label || block.type || '(unnamed)';
        console.log(`  ${block.start}\u2013${block.end}  ${label}`);
      }
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

// ── helpers ──────────────────────────────────────────

function formatNow(epochMs: number, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(epochMs));
  } catch {
    return new Date(epochMs).toISOString();
  }
}

function formatMinutesUntil(minutes: number): string {
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins}m`;
}
