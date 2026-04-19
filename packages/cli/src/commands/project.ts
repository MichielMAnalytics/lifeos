import { Command } from 'commander';
import type { ApiListResponse, ApiResponse, Project } from '@lifeos/shared';
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

export const projectCommand = new Command('project')
  .description('Manage projects');

projectCommand
  .command('list')
  .description('List projects')
  .option('-s, --status <status>', 'Filter by status (active, completed, archived)')
  .action(async (opts: { status?: string }) => {
    try {
      const client = createClient();
      const params: Record<string, string> = {};
      if (opts.status) params.status = opts.status;

      const res = await client.get<ApiListResponse<Project>>('/api/v1/projects', params);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      if (res.data.length === 0) {
        console.log('No projects found.');
        return;
      }

      const rows = res.data.map((p) => [
        shortId(p),
        p.title,
        p.status,
        formatDate(p.createdAt ?? p.created_at ?? null),
      ]);
      printTable(['ID', 'Title', 'Status', 'Created'], rows);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

projectCommand
  .command('create <title>')
  .description('Create a new project')
  .option('-d, --description <desc>', 'Project description')
  .action(async (title: string, opts: { description?: string }) => {
    try {
      const client = createClient();
      const body: Record<string, unknown> = { title };
      if (opts.description) body.description = opts.description;

      const res = await client.post<ApiResponse<Project>>('/api/v1/projects', body);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Project created: ${res.data.title} (${shortId(res.data)})`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

projectCommand
  .command('show <id>')
  .description('Show project details')
  .action(async (id: string) => {
    try {
      const client = createClient();
      const res = await client.get<ApiResponse<Project>>(`/api/v1/projects/${id}`);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      const p = res.data;
      console.log(`ID:           ${getId(p)}`);
      console.log(`Title:        ${p.title}`);
      console.log(`Description:  ${p.description ?? '-'}`);
      console.log(`Status:       ${p.status}`);
      console.log(`Created:      ${formatDate(p.createdAt ?? p.created_at ?? null)}`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

projectCommand
  .command('update <id>')
  .description('Update a project')
  .option('-t, --title <title>', 'New title')
  .option('-d, --description <desc>', 'New description')
  .option('-s, --status <status>', 'New status (active, completed, archived)')
  .action(async (id: string, opts: { title?: string; description?: string; status?: string }) => {
    try {
      const client = createClient();
      const body: Record<string, unknown> = {};
      if (opts.title) body.title = opts.title;
      if (opts.description) body.description = opts.description;
      if (opts.status) body.status = opts.status;

      const res = await client.patch<ApiResponse<Project>>(`/api/v1/projects/${id}`, body);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Project updated: ${res.data.title}`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

projectCommand
  .command('delete <id>')
  .description('Delete a project')
  .action(async (id: string) => {
    try {
      const client = createClient();
      await client.del(`/api/v1/projects/${id}`);
      printSuccess(`Project ${id.slice(0, 8)} deleted.`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

// ── Impact Filter ────────────────────────────────────
// Dan Sullivan's one-page project clarifier. Stored on `projects.impactFilter`.
// `set` requires all 6 textual fields + at least one success criterion;
// `--criteria` accepts a newline-separated list (CLI users typically build
// the prompt-friendly version from a heredoc).

interface ImpactFilterPayload {
  purpose: string;
  importance: string;
  idealOutcome: string;
  worstResult: string;
  bestResult: string;
  successCriteria: string[];
  who?: string;
  completedAt?: number;
  updatedAt?: number;
}

projectCommand
  .command('impact-filter <action> <id>')
  .description('Manage a project\'s Impact Filter. Actions: show | set | clear')
  .option('--purpose <text>', 'Purpose (one sentence)')
  .option('--importance <text>', 'Importance (single biggest difference)')
  .option('--ideal <text>', 'Ideal outcome (concrete finished state)')
  .option('--worst <text>', 'Worst result (what happens if undone)')
  .option('--best <text>', 'Best result (what becomes possible next)')
  .option('--criteria <list>', 'Success criteria, newline-separated')
  .option('--who <name>', 'Who owns this (freeform string)')
  .action(
    async (
      action: string,
      id: string,
      opts: {
        purpose?: string;
        importance?: string;
        ideal?: string;
        worst?: string;
        best?: string;
        criteria?: string;
        who?: string;
      },
    ) => {
      try {
        const client = createClient();
        if (action === 'show') {
          const res = await client.get<ApiResponse<Project & { impactFilter?: ImpactFilterPayload }>>(
            `/api/v1/projects/${id}`,
          );
          const filter = res.data.impactFilter;
          if (isJsonMode()) {
            printJson(filter ?? null);
            return;
          }
          if (!filter) {
            console.log(`No Impact Filter set for project ${id.slice(0, 8)}.`);
            return;
          }
          console.log(`# ${res.data.title}`);
          if (filter.who) console.log(`\n**Who:** ${filter.who}`);
          console.log(`\n## Purpose\n${filter.purpose}`);
          console.log(`\n## Importance\n${filter.importance}`);
          console.log(`\n## Ideal Outcome\n${filter.idealOutcome}`);
          console.log(`\n## Worst Result\n${filter.worstResult}`);
          console.log(`\n## Best Result\n${filter.bestResult}`);
          console.log(`\n## Success Criteria`);
          filter.successCriteria.forEach((c, i) => console.log(`${i + 1}. ${c}`));
          return;
        }
        if (action === 'set') {
          const required = { purpose: opts.purpose, importance: opts.importance, ideal: opts.ideal, worst: opts.worst, best: opts.best };
          const missing = Object.entries(required).filter(([, v]) => !v).map(([k]) => k);
          if (missing.length) {
            printError(`Missing required: ${missing.join(', ')}`);
            process.exitCode = 1;
            return;
          }
          // Split on real newlines AND on literal "\n" sequences. The latter
          // lets a Telegram-relayed agent message pass criteria as a single
          // double-quoted string with backslash-n separators.
          const criteria = (opts.criteria ?? '')
            .replace(/\\n/g, '\n')
            .split('\n')
            .map((c) => c.trim())
            .filter(Boolean);
          if (criteria.length === 0) {
            printError('Provide --criteria with at least one line (newlines or literal \\n separators).');
            process.exitCode = 1;
            return;
          }
          await client.post(`/api/v1/projects/${id}/impact-filter`, {
            purpose: opts.purpose!,
            importance: opts.importance!,
            idealOutcome: opts.ideal!,
            worstResult: opts.worst!,
            bestResult: opts.best!,
            successCriteria: criteria,
            who: opts.who,
          });
          printSuccess(`Impact Filter saved for project ${id.slice(0, 8)} (${criteria.length} criteria).`);
          return;
        }
        if (action === 'clear') {
          await client.del(`/api/v1/projects/${id}/impact-filter`);
          printSuccess(`Impact Filter cleared for project ${id.slice(0, 8)}.`);
          return;
        }
        printError(`Unknown action: ${action}. Use show | set | clear.`);
        process.exitCode = 1;
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    },
  );
