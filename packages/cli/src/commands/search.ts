import { Command } from 'commander';
import { createClient } from '../api-client.js';
import {
  formatDate,
  isJsonMode,
  printError,
  printJson,
  printTable,
} from '../output.js';

interface SearchData {
  tasks: Array<{ id: string; title: string; due_date: string | null; status: string }>;
  goals: Array<{ id: string; title: string; quarter: string | null; status: string }>;
  ideas: Array<{ id: string; content: string }>;
  journal: Array<{ id: string; entry_date: string; notes: string | null }>;
  resources: Array<{ id: string; title: string; type: string | null }>;
}

export const searchCommand = new Command('search')
  .description('Search across all entities')
  .argument('<query>', 'Search query')
  .option('-t, --type <type>', 'Filter by type (tasks,goals,ideas,journal,resources)')
  .action(async (query: string, opts: { type?: string }) => {
    try {
      const client = createClient();
      const params: Record<string, string> = { q: query };
      if (opts.type) params.type = opts.type;

      const res = await client.get<{ data: SearchData }>('/api/v1/search', params);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      const d = res.data;
      let found = false;

      if (d.tasks.length > 0) {
        found = true;
        console.log('\nTasks:');
        printTable(
          ['ID', 'Title', 'Status', 'Due'],
          d.tasks.map((t) => [t.id.slice(0, 8), t.title, t.status, formatDate(t.due_date)]),
        );
      }

      if (d.goals.length > 0) {
        found = true;
        console.log('\nGoals:');
        printTable(
          ['ID', 'Title', 'Status', 'Quarter'],
          d.goals.map((g) => [g.id.slice(0, 8), g.title, g.status, g.quarter ?? '-']),
        );
      }

      if (d.ideas.length > 0) {
        found = true;
        console.log('\nIdeas:');
        printTable(
          ['ID', 'Content'],
          d.ideas.map((i) => [i.id.slice(0, 8), i.content.slice(0, 80)]),
        );
      }

      if (d.journal.length > 0) {
        found = true;
        console.log('\nJournal:');
        printTable(
          ['ID', 'Date', 'Notes'],
          d.journal.map((j) => [j.id.slice(0, 8), j.entry_date, (j.notes ?? '').slice(0, 60)]),
        );
      }

      if (d.resources.length > 0) {
        found = true;
        console.log('\nResources:');
        printTable(
          ['ID', 'Title', 'Type'],
          d.resources.map((r) => [r.id.slice(0, 8), r.title, r.type ?? '-']),
        );
      }

      if (!found) {
        console.log('No results found.');
      }
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });
