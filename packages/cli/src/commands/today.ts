import { Command } from 'commander';
import { createClient } from '../api-client.js';
import { isJsonMode, printJson, printError } from '../output.js';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export const todayCommand = new Command('today')
  .description('Show your day at a glance')
  .action(async () => {
    try {
      const client = createClient();
      const today = todayStr();

      // Fetch everything in parallel
      const [tasksRes, planRes, journalRes] = await Promise.all([
        client.get<{ data: Array<{ _id?: string; id?: string; title: string; dueDate?: string; due_date?: string; status: string }> }>('/api/v1/tasks', { status: 'todo' }),
        client.get<{ data: Record<string, unknown> }>(`/api/v1/day-plans/${today}`).catch(() => null),
        client.get<{ data: Record<string, unknown> }>(`/api/v1/journal/${today}`).catch(() => null),
      ]);

      if (isJsonMode()) {
        printJson({ tasks: tasksRes, plan: planRes, journal: journalRes });
        return;
      }

      // Format date nicely
      const d = new Date(today + 'T00:00:00');
      const dateLabel = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      console.log(`\n  \u{1F4C5} ${dateLabel}\n`);

      // Priorities
      const plan = planRes?.data as Record<string, unknown> | undefined;
      console.log('  \u2500\u2500\u2500 Priorities \u2500\u2500\u2500');
      if (plan) {
        const mit = plan.mitTaskId ? '\u2713' : '\u25CB';
        const p1 = plan.p1TaskId ? '\u2713' : '\u25CB';
        const p2 = plan.p2TaskId ? '\u2713' : '\u25CB';
        console.log(`  ${mit} MIT  ${plan.mitDone ? '(done)' : ''}`);
        console.log(`  ${p1} P1   ${plan.p1Done ? '(done)' : ''}`);
        console.log(`  ${p2} P2   ${plan.p2Done ? '(done)' : ''}`);
      } else {
        console.log('  No priorities set for today');
      }

      // Tasks
      const tasks = (tasksRes?.data ?? []) as Array<{ title: string; dueDate?: string; due_date?: string }>;
      const todayTasks = tasks.filter((t) => (t.dueDate ?? t.due_date) === today);
      const overdue = tasks.filter((t) => {
        const due = t.dueDate ?? t.due_date;
        return due && due < today;
      });

      console.log(`\n  \u2500\u2500\u2500 Tasks \u2500\u2500\u2500`);
      console.log(`  Today: ${todayTasks.length} tasks`);
      if (overdue.length > 0) {
        console.log(`  \u26A0 Overdue: ${overdue.length} tasks`);
      }

      // Show today's tasks
      for (const task of todayTasks.slice(0, 8)) {
        console.log(`    \u25CB ${task.title}`);
      }
      if (todayTasks.length > 8) {
        console.log(`    ... and ${todayTasks.length - 8} more`);
      }

      // Journal
      console.log(`\n  \u2500\u2500\u2500 Journal \u2500\u2500\u2500`);
      const journal = journalRes?.data as Record<string, unknown> | undefined;
      if (journal) {
        if (journal.mit) console.log(`  MIT: ${journal.mit}`);
        if (journal.notes) console.log(`  Notes: ${String(journal.notes).slice(0, 100)}`);
      } else {
        console.log('  No journal entry for today');
      }

      console.log('');
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });
