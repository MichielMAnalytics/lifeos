import { Command } from 'commander';
import type { ApiListResponse, ApiResponse, Idea, Thought, Win, Resource, Project } from '@lifeos/shared';
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

// ── Ideas ────────────────────────────────────────────────

async function createIdea(content: string, opts: { actionability?: string }) {
  try {
    const client = createClient();
    const body: Record<string, unknown> = { content };
    if (opts.actionability) body.actionability = opts.actionability;
    const res = await client.post<ApiResponse<Idea>>('/api/v1/ideas', body);
    if (isJsonMode()) { printJson(res); return; }
    printSuccess(`Idea captured (${shortId(res.data)}).`);
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

export const ideaCommand = new Command('idea')
  .description('Manage ideas')
  .argument('[content]', 'Quick capture (shorthand for "idea create")')
  .option('-a, --actionability <level>', 'Actionability level (high, medium, low)')
  .action(async (content: string | undefined, opts: { actionability?: string }) => {
    if (content) await createIdea(content, opts);
  });

ideaCommand
  .command('create <content>')
  .description('Capture an idea')
  .option('-a, --actionability <level>', 'Actionability level (high, medium, low)')
  .action(createIdea);

ideaCommand
  .command('list')
  .description('List ideas')
  .option('-a, --actionability <level>', 'Filter by actionability (high, medium, low)')
  .action(async (opts: { actionability?: string }) => {
    try {
      const client = createClient();
      const params: Record<string, string> = {};
      if (opts.actionability) params.actionability = opts.actionability;

      const res = await client.get<ApiListResponse<Idea>>('/api/v1/ideas', params);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      if (res.data.length === 0) {
        console.log('No ideas found.');
        return;
      }

      const rows = res.data.map((i) => [
        shortId(i),
        i.content.length > 60 ? i.content.slice(0, 57) + '...' : i.content,
        i.actionability ?? '-',
        i.nextStep ?? i.next_step ?? '-',
        formatDate(i.createdAt ?? i.created_at ?? null),
      ]);
      printTable(['ID', 'Content', 'Actionability', 'Next Step', 'Created'], rows);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

ideaCommand
  .command('update <id>')
  .description('Update an idea')
  .option('-c, --content <content>', 'New content')
  .option('-a, --actionability <level>', 'Actionability level (high, medium, low)')
  .option('-n, --next-step <step>', 'Next step')
  .action(async (id: string, opts: { content?: string; actionability?: string; nextStep?: string }) => {
    try {
      const client = createClient();
      const body: Record<string, unknown> = {};
      if (opts.content) body.content = opts.content;
      if (opts.actionability) body.actionability = opts.actionability;
      if (opts.nextStep) body.nextStep = opts.nextStep;

      const res = await client.patch<ApiResponse<Idea>>(`/api/v1/ideas/${id}`, body);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Idea updated (${shortId(res.data)}).`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

ideaCommand
  .command('delete <id>')
  .description('Delete an idea')
  .action(async (id: string) => {
    try {
      const client = createClient();
      await client.del(`/api/v1/ideas/${id}`);
      printSuccess(`Idea ${id.slice(0, 8)} deleted.`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

ideaCommand
  .command('promote <id>')
  .description('Promote an idea to a project')
  .requiredOption('-t, --title <title>', 'Project title')
  .action(async (id: string, opts: { title: string }) => {
    try {
      const client = createClient();
      const res = await client.post<ApiResponse<Project>>(`/api/v1/ideas/${id}/promote`, {
        projectTitle: opts.title,
      });

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Idea promoted to project: ${res.data.title} (${shortId(res.data)})`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

// ── Thoughts ─────────────────────────────────────────────

async function createThought(content: string, opts: { title?: string }) {
  try {
    const client = createClient();
    const body: Record<string, unknown> = { content };
    if (opts.title) body.title = opts.title;
    const res = await client.post<ApiResponse<Thought>>('/api/v1/thoughts', body);
    if (isJsonMode()) { printJson(res); return; }
    printSuccess(`Thought captured (${shortId(res.data)}).`);
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

export const thoughtCommand = new Command('thought')
  .description('Manage thoughts')
  .argument('[content]', 'Quick capture (shorthand for "thought create")')
  .option('-t, --title <title>', 'Optional title')
  .action(async (content: string | undefined, opts: { title?: string }) => {
    if (content) await createThought(content, opts);
  });

thoughtCommand
  .command('create <content>')
  .description('Capture a thought')
  .option('-t, --title <title>', 'Optional title')
  .action(createThought);

thoughtCommand
  .command('list')
  .description('List thoughts')
  .action(async () => {
    try {
      const client = createClient();
      const res = await client.get<ApiListResponse<Thought>>('/api/v1/thoughts');

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      if (res.data.length === 0) {
        console.log('No thoughts found.');
        return;
      }

      const rows = res.data.map((t) => [
        shortId(t),
        t.title ?? '-',
        t.content.length > 60 ? t.content.slice(0, 57) + '...' : t.content,
        formatDate(t.createdAt ?? t.created_at ?? null),
      ]);
      printTable(['ID', 'Title', 'Content', 'Created'], rows);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

thoughtCommand
  .command('update <id>')
  .description('Update a thought')
  .option('-c, --content <content>', 'New content')
  .option('-t, --title <title>', 'New title')
  .action(async (id: string, opts: { content?: string; title?: string }) => {
    try {
      const client = createClient();
      const body: Record<string, unknown> = {};
      if (opts.content) body.content = opts.content;
      if (opts.title) body.title = opts.title;

      await client.patch(`/api/v1/thoughts/${id}`, body);
      printSuccess('Thought updated.');
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

thoughtCommand
  .command('delete <id>')
  .description('Delete a thought')
  .action(async (id: string) => {
    try {
      const client = createClient();
      await client.del(`/api/v1/thoughts/${id}`);
      printSuccess(`Thought ${id.slice(0, 8)} deleted.`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

// ── Wins ─────────────────────────────────────────────────

async function createWin(content: string, opts: { date?: string }) {
  try {
    const client = createClient();
    const body: Record<string, unknown> = { content };
    if (opts.date) body.entryDate = opts.date;
    const res = await client.post<ApiResponse<Win>>('/api/v1/wins', body);
    if (isJsonMode()) { printJson(res); return; }
    printSuccess(`Win recorded (${shortId(res.data)}).`);
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

export const winCommand = new Command('win')
  .description('Manage wins')
  .argument('[content]', 'Quick capture (shorthand for "win create")')
  .option('-d, --date <date>', 'Entry date (YYYY-MM-DD, default today)')
  .action(async (content: string | undefined, opts: { date?: string }) => {
    if (content) await createWin(content, opts);
  });

winCommand
  .command('create <content>')
  .description('Record a win')
  .option('-d, --date <date>', 'Entry date (YYYY-MM-DD, default today)')
  .action(createWin);

winCommand
  .command('list')
  .description('List wins')
  .option('-f, --from <date>', 'Filter from date (YYYY-MM-DD)')
  .option('-t, --to <date>', 'Filter to date (YYYY-MM-DD)')
  .action(async (opts: { from?: string; to?: string }) => {
    try {
      const client = createClient();
      const params: Record<string, string> = {};
      if (opts.from) params.from = opts.from;
      if (opts.to) params.to = opts.to;

      const res = await client.get<ApiListResponse<Win>>('/api/v1/wins', params);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      if (res.data.length === 0) {
        console.log('No wins found.');
        return;
      }

      const rows = res.data.map((w) => [
        shortId(w),
        w.content.length > 60 ? w.content.slice(0, 57) + '...' : w.content,
        formatDate(w.entryDate ?? w.entry_date ?? null),
      ]);
      printTable(['ID', 'Content', 'Date'], rows);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

winCommand
  .command('delete <id>')
  .description('Delete a win')
  .action(async (id: string) => {
    try {
      const client = createClient();
      await client.del(`/api/v1/wins/${id}`);
      printSuccess('Win deleted.');
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

// ── Resources ────────────────────────────────────────────

async function createResource(title: string, opts: { url?: string; type?: string }) {
  try {
    const client = createClient();
    const body: Record<string, unknown> = { title };
    if (opts.url) body.url = opts.url;
    if (opts.type) body.type = opts.type;
    const res = await client.post<ApiResponse<Resource>>('/api/v1/resources', body);
    if (isJsonMode()) { printJson(res); return; }
    printSuccess(`Resource saved: ${res.data.title} (${shortId(res.data)}).`);
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

export const resourceCommand = new Command('resource')
  .description('Manage resources')
  .argument('[title]', 'Quick capture (shorthand for "resource create")')
  .option('-u, --url <url>', 'URL')
  .option('-t, --type <type>', 'Type (article, tool, book, video, other)')
  .action(async (title: string | undefined, opts: { url?: string; type?: string }) => {
    if (title) await createResource(title, opts);
  });

resourceCommand
  .command('create <title>')
  .description('Save a resource')
  .option('-u, --url <url>', 'URL')
  .option('-t, --type <type>', 'Type (article, tool, book, video, other)')
  .action(createResource);

resourceCommand
  .command('list')
  .description('List resources')
  .option('-t, --type <type>', 'Filter by type (article, tool, book, video, other)')
  .action(async (opts: { type?: string }) => {
    try {
      const client = createClient();
      const params: Record<string, string> = {};
      if (opts.type) params.type = opts.type;

      const res = await client.get<ApiListResponse<Resource>>('/api/v1/resources', params);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      if (res.data.length === 0) {
        console.log('No resources found.');
        return;
      }

      const rows = res.data.map((r) => [
        shortId(r),
        r.title,
        r.type ?? '-',
        r.url ?? '-',
        formatDate(r.createdAt ?? r.created_at ?? null),
      ]);
      printTable(['ID', 'Title', 'Type', 'URL', 'Created'], rows);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

resourceCommand
  .command('update <id>')
  .description('Update a resource')
  .option('--title <title>', 'New title')
  .option('-u, --url <url>', 'New URL')
  .option('-c, --content <content>', 'New content')
  .option('-t, --type <type>', 'New type (article, tool, book, video, other)')
  .action(async (id: string, opts: { title?: string; url?: string; content?: string; type?: string }) => {
    try {
      const client = createClient();
      const body: Record<string, unknown> = {};
      if (opts.title) body.title = opts.title;
      if (opts.url) body.url = opts.url;
      if (opts.content) body.content = opts.content;
      if (opts.type) body.type = opts.type;

      const res = await client.patch<ApiResponse<Resource>>(`/api/v1/resources/${id}`, body);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Resource updated: ${res.data.title} (${shortId(res.data)}).`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

resourceCommand
  .command('delete <id>')
  .description('Delete a resource')
  .action(async (id: string) => {
    try {
      const client = createClient();
      await client.del(`/api/v1/resources/${id}`);
      printSuccess(`Resource ${id.slice(0, 8)} deleted.`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });
