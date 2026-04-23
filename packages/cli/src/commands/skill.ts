import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { Command } from 'commander';
import type { ApiListResponse, ApiResponse } from '@lifeos/shared';
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

interface Skill {
  _id: string;
  id?: string;
  name: string;
  summary: string;
  body: string;
  triggers?: string[];
  enabled: boolean;
  updatedAt: number;
  _creationTime?: number;
}

export const skillCommand = new Command('skill')
  .description("Manage Life Coach skills (the user's prompt fragments)");

skillCommand
  .command('list')
  .description("List your skills")
  .option('--enabled-only', 'Skip disabled skills')
  .action(async (opts: { enabledOnly?: boolean }) => {
    try {
      const client = createClient();
      const res = await client.get<ApiListResponse<Skill>>('/api/v1/skills');

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      const items = opts.enabledOnly
        ? res.data.filter((s) => s.enabled)
        : res.data;

      if (items.length === 0) {
        console.log(
          opts.enabledOnly
            ? 'No enabled skills. Try `lifeos skill seed` to install defaults.'
            : 'No skills yet. Try `lifeos skill seed` to install defaults.',
        );
        return;
      }

      const rows = items.map((s) => [
        shortId(s),
        s.name,
        s.enabled ? 'yes' : 'no',
        String(s.triggers?.length ?? 0),
        (s.summary ?? '').slice(0, 60),
      ]);
      printTable(['ID', 'Name', 'Enabled', 'Triggers', 'Summary'], rows);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

skillCommand
  .command('show <id-or-name>')
  .description('Show full skill body')
  .action(async (idOrName: string) => {
    try {
      const client = createClient();
      const skill = await resolveSkill(client, idOrName);
      if (!skill) {
        printError(`No skill matched "${idOrName}".`);
        process.exitCode = 1;
        return;
      }

      if (isJsonMode()) {
        printJson({ data: skill });
        return;
      }

      console.log(`ID:        ${String(skill._id ?? skill.id ?? '')}`);
      console.log(`Name:      ${skill.name}`);
      console.log(`Enabled:   ${skill.enabled ? 'yes' : 'no'}`);
      console.log(`Summary:   ${skill.summary}`);
      if (skill.triggers && skill.triggers.length > 0) {
        console.log(`Triggers:  ${skill.triggers.join(', ')}`);
      }
      if (skill.updatedAt) {
        console.log(`Updated:   ${formatDate(new Date(skill.updatedAt).toISOString())}`);
      }
      console.log('\nBody:');
      console.log(skill.body);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

skillCommand
  .command('create <name>')
  .description('Create a skill')
  .requiredOption('-s, --summary <text>', 'Short one-line summary')
  .option('-b, --body <text>', 'Markdown body')
  .option('-f, --body-file <path>', 'Read markdown body from a file (UTF-8)')
  .option('-t, --triggers <comma-separated>', 'Comma-separated trigger keywords')
  .option('--disabled', 'Create the skill in disabled state')
  .action(
    async (
      name: string,
      opts: {
        summary: string;
        body?: string;
        bodyFile?: string;
        triggers?: string;
        disabled?: boolean;
      },
    ) => {
      try {
        const body = readBody(opts.body, opts.bodyFile);
        if (body === null) {
          printError('Either --body or --body-file is required.');
          process.exitCode = 1;
          return;
        }

        const payload: Record<string, unknown> = {
          name,
          summary: opts.summary,
          body,
          enabled: !opts.disabled,
        };
        if (opts.triggers) {
          payload.triggers = opts.triggers
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t.length > 0);
        }

        const client = createClient();
        const res = await client.post<ApiResponse<Skill>>('/api/v1/skills', payload);

        if (isJsonMode()) {
          printJson(res);
          return;
        }

        printSuccess(`Skill created: ${res.data.name} (${shortId(res.data)})`);
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    },
  );

skillCommand
  .command('update <id-or-name>')
  .description('Update a skill')
  .option('-n, --name <name>', 'New name')
  .option('-s, --summary <text>', 'New summary')
  .option('-b, --body <text>', 'New markdown body')
  .option('-f, --body-file <path>', 'Read new markdown body from a file (UTF-8)')
  .option('-t, --triggers <comma-separated>', 'New comma-separated triggers')
  .option('--enabled', 'Enable the skill')
  .option('--disabled', 'Disable the skill')
  .action(
    async (
      idOrName: string,
      opts: {
        name?: string;
        summary?: string;
        body?: string;
        bodyFile?: string;
        triggers?: string;
        enabled?: boolean;
        disabled?: boolean;
      },
    ) => {
      try {
        if (opts.enabled && opts.disabled) {
          printError('Pass either --enabled or --disabled, not both.');
          process.exitCode = 1;
          return;
        }

        const client = createClient();
        const target = await resolveSkill(client, idOrName);
        if (!target) {
          printError(`No skill matched "${idOrName}".`);
          process.exitCode = 1;
          return;
        }

        const payload: Record<string, unknown> = {};
        if (opts.name) payload.name = opts.name;
        if (opts.summary) payload.summary = opts.summary;
        if (opts.body !== undefined || opts.bodyFile) {
          const body = readBody(opts.body, opts.bodyFile);
          if (body === null) {
            printError('Could not read body from --body / --body-file.');
            process.exitCode = 1;
            return;
          }
          payload.body = body;
        }
        if (opts.triggers !== undefined) {
          payload.triggers = opts.triggers
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t.length > 0);
        }
        if (opts.enabled) payload.enabled = true;
        if (opts.disabled) payload.enabled = false;

        if (Object.keys(payload).length === 0) {
          printError('Nothing to update — pass at least one flag.');
          process.exitCode = 1;
          return;
        }

        const res = await client.patch<ApiResponse<Skill>>(
          `/api/v1/skills/${String(target._id ?? target.id)}`,
          payload,
        );

        if (isJsonMode()) {
          printJson(res);
          return;
        }

        printSuccess(`Skill updated: ${res.data.name}`);
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    },
  );

skillCommand
  .command('delete <id-or-name>')
  .description('Delete a skill')
  .action(async (idOrName: string) => {
    try {
      const client = createClient();
      const target = await resolveSkill(client, idOrName);
      if (!target) {
        printError(`No skill matched "${idOrName}".`);
        process.exitCode = 1;
        return;
      }
      await client.del(`/api/v1/skills/${String(target._id ?? target.id)}`);
      if (isJsonMode()) {
        printJson({ data: { id: String(target._id ?? target.id) } });
        return;
      }
      printSuccess(`Skill "${target.name}" deleted.`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

skillCommand
  .command('seed')
  .description('Install the default Life Coach skills (idempotent)')
  .action(async () => {
    try {
      const client = createClient();
      const res = await client.post<ApiResponse<{ inserted: number }>>(
        '/api/v1/skills/seed',
      );

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      const n = res.data.inserted;
      printSuccess(`${n} default skill${n === 1 ? '' : 's'} created.`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

// ── helpers ──────────────────────────────────────────

/**
 * Look up a skill by id or by name.
 *
 * Strategy:
 *   - If input looks like a Convex id (>= 32 chars and matches a Convex-ish
 *     shape), try GET /api/v1/skills/:id first; on 404 fall through to name.
 *   - Otherwise, list all skills and find the one whose name matches.
 *
 * The HTTP layer doesn't expose getByName as its own route, so we do the
 * lookup client-side. There are at most a handful of skills per user.
 */
async function resolveSkill(
  client: ReturnType<typeof createClient>,
  idOrName: string,
): Promise<Skill | null> {
  const looksLikeId = idOrName.length >= 32 && !/[^a-z0-9]/i.test(idOrName);

  if (looksLikeId) {
    try {
      const res = await client.get<ApiResponse<Skill>>(`/api/v1/skills/${idOrName}`);
      if (res.data) return res.data;
    } catch {
      // Fall through to name-based lookup
    }
  }

  const list = await client.get<ApiListResponse<Skill>>('/api/v1/skills');
  const match = list.data.find((s) => s.name === idOrName);
  return match ?? null;
}

function readBody(inline: string | undefined, filePath: string | undefined): string | null {
  if (filePath) {
    const path = resolvePath(filePath);
    return readFileSync(path, 'utf8');
  }
  if (inline !== undefined && inline !== '') return inline;
  return null;
}
