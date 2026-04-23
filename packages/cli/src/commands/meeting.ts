import { Command } from 'commander';
import type { ApiListResponse, ApiResponse, Meeting } from '@lifeos/shared';
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

export const meetingCommand = new Command('meeting')
  .description('Browse meetings synced from Granola');

meetingCommand
  .command('list')
  .description('List recent meetings (latest first)')
  .option('-l, --limit <n>', 'How many meetings to fetch (default 50)')
  .action(async (opts: { limit?: string }) => {
    try {
      const client = createClient();
      const params: Record<string, string> = {};
      if (opts.limit) params.limit = opts.limit;

      const res = await client.get<ApiListResponse<Meeting>>('/api/v1/meetings', params);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      if (res.data.length === 0) {
        console.log('No meetings yet — connect Granola in Settings → Integrations.');
        return;
      }

      const rows = res.data.map((m) => [
        shortId(m),
        m.title.slice(0, 60),
        formatDate(epochToIso(m.startedAt ?? m.started_at)),
        String(m.attendees?.length ?? 0),
      ]);
      printTable(['ID', 'Title', 'When', 'People'], rows);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

meetingCommand
  .command('show <id>')
  .description('Show a meeting in full (summary + transcript)')
  .action(async (id: string) => {
    try {
      const client = createClient();
      const res = await client.get<ApiResponse<Meeting>>(`/api/v1/meetings/${id}`);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      const m = res.data;
      console.log(`ID:         ${shortId(m)}`);
      console.log(`Title:      ${m.title}`);
      console.log(`When:       ${formatDate(epochToIso(m.startedAt ?? m.started_at))}`);
      if (m.attendees && m.attendees.length > 0) {
        console.log(`Attendees:  ${m.attendees.join(', ')}`);
      }
      if (m.granolaUrl ?? m.granola_url) {
        console.log(`Granola:    ${m.granolaUrl ?? m.granola_url}`);
      }
      if (m.summary) {
        console.log('\nSummary:');
        console.log(m.summary);
      }
      if (m.transcript) {
        console.log('\nTranscript:');
        console.log(m.transcript);
        if (m.transcriptTruncated ?? m.transcript_truncated) {
          console.log('\n[transcript truncated — Convex doc-size cap]');
        }
      }
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

meetingCommand
  .command('sync')
  .description('Force an immediate Granola sync (otherwise runs hourly)')
  .action(async () => {
    try {
      const client = createClient();
      const res = await client.post<ApiResponse<{ ok?: boolean; created?: number; updated?: number; reason?: string }>>(
        '/api/v1/granola/sync',
      );

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      const r = res.data;
      if (r?.ok === false) {
        printError(`Sync failed: ${r.reason ?? 'unknown'}`);
        process.exitCode = 1;
        return;
      }
      printSuccess(
        `Synced. ${r?.created ?? 0} new, ${r?.updated ?? 0} updated.`,
      );
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

function epochToIso(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return new Date(value).toISOString();
}
