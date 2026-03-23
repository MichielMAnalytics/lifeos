import { Command } from 'commander';
import type { ApiResponse, Idea, Thought, Win, Resource } from '@lifeos/shared';
import { createClient } from '../api-client.js';
import {
  isJsonMode,
  printError,
  printJson,
  printSuccess,
} from '../output.js';

export const ideaCommand = new Command('idea')
  .description('Capture an idea')
  .argument('<content>', 'Idea content')
  .option('-a, --actionability <level>', 'Actionability level (high, medium, low)')
  .action(async (content: string, opts: { actionability?: string }) => {
    try {
      const client = createClient();
      const body: Record<string, unknown> = { content };
      if (opts.actionability) body.actionability = opts.actionability;

      const res = await client.post<ApiResponse<Idea>>('/api/v1/ideas', body);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Idea captured (${res.data.id.slice(0, 8)}).`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

export const thoughtCommand = new Command('thought')
  .description('Capture a thought')
  .argument('<content>', 'Thought content')
  .option('-t, --title <title>', 'Optional title')
  .action(async (content: string, opts: { title?: string }) => {
    try {
      const client = createClient();
      const body: Record<string, unknown> = { content };
      if (opts.title) body.title = opts.title;

      const res = await client.post<ApiResponse<Thought>>('/api/v1/thoughts', body);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Thought captured (${res.data.id.slice(0, 8)}).`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

export const winCommand = new Command('win')
  .description('Record a win')
  .argument('<content>', 'Win description')
  .action(async (content: string) => {
    try {
      const client = createClient();
      const res = await client.post<ApiResponse<Win>>('/api/v1/wins', { content });

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Win recorded (${res.data.id.slice(0, 8)}).`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

export const resourceCommand = new Command('resource')
  .description('Save a resource')
  .argument('<title>', 'Resource title')
  .option('-u, --url <url>', 'URL')
  .option('-t, --type <type>', 'Type (article, tool, book, video, other)')
  .action(async (title: string, opts: { url?: string; type?: string }) => {
    try {
      const client = createClient();
      const body: Record<string, unknown> = { title };
      if (opts.url) body.url = opts.url;
      if (opts.type) body.type = opts.type;

      const res = await client.post<ApiResponse<Resource>>('/api/v1/resources', body);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      printSuccess(`Resource saved: ${res.data.title} (${res.data.id.slice(0, 8)}).`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });
