import { Command } from 'commander';
import type { ApiListResponse, ApiResponse, Project } from '@lifeos/shared';
import { createClient } from '../api-client.js';
import {
  formatDate,
  isJsonMode,
  printError,
  printJson,
  printSuccess,
  printTable,
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
        p.id.slice(0, 8),
        p.title,
        p.status,
        formatDate(p.created_at),
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

      printSuccess(`Project created: ${res.data.title} (${res.data.id.slice(0, 8)})`);
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
      console.log(`ID:           ${p.id}`);
      console.log(`Title:        ${p.title}`);
      console.log(`Description:  ${p.description ?? '-'}`);
      console.log(`Status:       ${p.status}`);
      console.log(`Created:      ${formatDate(p.created_at)}`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });
