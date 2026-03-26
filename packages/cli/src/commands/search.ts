import { Command } from 'commander';
import { createClient } from '../api-client.js';
import {
  formatDate,
  getId,
  isJsonMode,
  printError,
  printJson,
  printTable,
  shortId,
} from '../output.js';

interface SearchItem {
  id: string;
  _id?: string;
  [key: string]: unknown;
}

interface SearchData {
  tasks: Array<SearchItem & { title: string; due_date?: string | null; dueDate?: string | null; status: string }>;
  goals: Array<SearchItem & { title: string; quarter: string | null; status: string }>;
  ideas: Array<SearchItem & { content: string }>;
  journal: Array<SearchItem & { entry_date?: string; entryDate?: string; notes: string | null }>;
  resources: Array<SearchItem & { title: string; type: string | null }>;
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

      if ((d.tasks?.length ?? 0) > 0) {
        found = true;
        console.log('\nTasks:');
        printTable(
          ['ID', 'Title', 'Status', 'Due'],
          d.tasks.map((t) => [shortId(t), t.title, t.status, formatDate(t.dueDate ?? t.due_date ?? null)]),
        );
      }

      if ((d.goals?.length ?? 0) > 0) {
        found = true;
        console.log('\nGoals:');
        printTable(
          ['ID', 'Title', 'Status', 'Quarter'],
          d.goals.map((g) => [shortId(g), g.title, g.status, g.quarter ?? '-']),
        );
      }

      if ((d.ideas?.length ?? 0) > 0) {
        found = true;
        console.log('\nIdeas:');
        printTable(
          ['ID', 'Content'],
          d.ideas.map((i) => [shortId(i), i.content.slice(0, 80)]),
        );
      }

      if ((d.journal?.length ?? 0) > 0) {
        found = true;
        console.log('\nJournal:');
        printTable(
          ['ID', 'Date', 'Notes'],
          d.journal.map((j) => [shortId(j), (j.entryDate ?? j.entry_date) ?? '-', (j.notes ?? '').slice(0, 60)]),
        );
      }

      if ((d.resources?.length ?? 0) > 0) {
        found = true;
        console.log('\nResources:');
        printTable(
          ['ID', 'Title', 'Type'],
          d.resources.map((r) => [shortId(r), r.title, r.type ?? '-']),
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
