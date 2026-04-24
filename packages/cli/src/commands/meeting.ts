import { Command } from 'commander';
import type {
  ApiListResponse,
  ApiResponse,
  Meeting,
  UpcomingMeeting,
  MeetingPrep,
  MeetingPrepView,
} from '@lifeos/shared';
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
  .option('-a, --attendee <name>', 'Filter to meetings with an attendee whose name/email contains this text')
  .option('-f, --folder <name>', 'Filter to meetings in this Granola folder (exact match, case-insensitive)')
  .option('-t, --tag <name>', 'Filter to meetings with this user tag (exact match, case-insensitive)')
  .option('-q, --search <query>', 'Full-text search across meeting title + summary')
  .action(async (opts: { limit?: string; attendee?: string; folder?: string; tag?: string; search?: string }) => {
    try {
      const client = createClient();
      const params: Record<string, string> = {};
      if (opts.limit) params.limit = opts.limit;
      if (opts.attendee) params.attendee = opts.attendee;
      if (opts.folder) params.folder = opts.folder;
      if (opts.tag) params.tag = opts.tag;
      if (opts.search) params.search = opts.search;

      const res = await client.get<ApiListResponse<Meeting>>('/api/v1/meetings', params);

      if (isJsonMode()) {
        printJson(res);
        return;
      }

      if (res.data.length === 0) {
        if (opts.attendee || opts.folder || opts.tag || opts.search) {
          console.log('No meetings match those filters.');
        } else {
          console.log('No meetings yet — connect Granola in Settings → Integrations.');
        }
        return;
      }

      const rows = res.data.map((m) => [
        shortId(m),
        m.title.slice(0, 50),
        formatDate(epochToIso(m.startedAt ?? m.started_at)),
        String(m.attendees?.length ?? 0),
        ((m as { folders?: string[] }).folders?.[0] ?? '—').slice(0, 18),
      ]);
      printTable(['ID', 'Title', 'When', 'People', 'Folder'], rows);
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

// ── upcoming ──────────────────────────────────────────
// Calendar-side view: meetings that haven't happened yet. While Google
// Workspace is gated, `upcoming seed` populates 5 mock events the user
// can experiment with.

const upcomingCommand = new Command('upcoming')
  .description('Browse upcoming meetings (Google Calendar — currently mock)');

upcomingCommand
  .command('list')
  .description('List upcoming meetings (next 30 days)')
  .option('-l, --limit <n>', 'Max meetings to fetch (default 50)')
  .action(async (opts: { limit?: string }) => {
    try {
      const client = createClient();
      const params: Record<string, string> = {};
      if (opts.limit) params.limit = opts.limit;
      const res = await client.get<ApiListResponse<UpcomingMeeting>>(
        '/api/v1/upcoming-meetings',
        params,
      );
      if (isJsonMode()) {
        printJson(res);
        return;
      }
      if (res.data.length === 0) {
        console.log('No upcoming meetings. Run `lifeos meeting upcoming seed` to add 5 mocks.');
        return;
      }
      const rows = res.data.map((m) => [
        shortId(m),
        m.title.slice(0, 40),
        formatDateTime(m.startedAt),
        String(m.attendees.length),
        m.source,
      ]);
      printTable(['ID', 'Title', 'When', 'People', 'Source'], rows);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

upcomingCommand
  .command('seed')
  .description('Seed 5 mock upcoming meetings (uses past attendees if available)')
  .action(async () => {
    try {
      const client = createClient();
      const res = await client.post<ApiResponse<{ inserted: number }>>(
        '/api/v1/upcoming-meetings/seed-mock',
      );
      if (isJsonMode()) {
        printJson(res);
        return;
      }
      printSuccess(`Seeded ${res.data.inserted} mock meetings.`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

upcomingCommand
  .command('show <id>')
  .description('Show one upcoming meeting in full')
  .action(async (id: string) => {
    try {
      const client = createClient();
      const res = await client.get<ApiResponse<UpcomingMeeting>>(
        `/api/v1/upcoming-meetings/${id}`,
      );
      if (isJsonMode()) {
        printJson(res);
        return;
      }
      const m = res.data;
      console.log(`ID:        ${shortId(m)}`);
      console.log(`Title:     ${m.title}`);
      console.log(`When:      ${formatDateTime(m.startedAt)} – ${formatDateTime(m.endedAt)}`);
      console.log(`Attendees: ${m.attendees.join(', ')}`);
      if (m.location) console.log(`Location:  ${m.location}`);
      if (m.description) console.log(`\n${m.description}`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

meetingCommand.addCommand(upcomingCommand);

// ── prep ──────────────────────────────────────────────
// Notion-style one-pager attached to an upcoming meeting. The agent
// hits this surface so it can answer "what should I prep for the X
// meeting?" with the gathered context + LLM talking points.

const prepCommand = new Command('prep')
  .description('Meeting preps — agenda, notes, talking points');

prepCommand
  .command('list')
  .description('List existing preps')
  .action(async () => {
    try {
      const client = createClient();
      const res = await client.get<ApiListResponse<MeetingPrep>>(
        '/api/v1/meeting-preps',
      );
      if (isJsonMode()) {
        printJson(res);
        return;
      }
      if (res.data.length === 0) {
        console.log('No preps yet. Create one with `lifeos meeting prep create <upcoming-id>`.');
        return;
      }
      const rows = res.data.map((p) => [
        shortId(p),
        p.title.slice(0, 40),
        p.talkingPoints ? '\u2713' : '-',
        formatDate(epochToIso(p.updatedAt)),
      ]);
      printTable(['ID', 'Title', 'Brief?', 'Updated'], rows);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

prepCommand
  .command('create <upcoming-id>')
  .description('Create (or fetch existing) prep for an upcoming meeting id')
  .action(async (upcomingId: string) => {
    try {
      const client = createClient();
      const res = await client.post<ApiResponse<MeetingPrep>>(
        '/api/v1/meeting-preps',
        { upcomingMeetingId: upcomingId },
      );
      if (isJsonMode()) {
        printJson(res);
        return;
      }
      printSuccess(`Prep ready (${shortId(res.data)}).`);
      console.log(`Title: ${res.data.title}`);
      console.log(`\nNext: lifeos meeting prep show ${shortId(res.data)}`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

prepCommand
  .command('show <id>')
  .description('Show a prep with all hydrated context')
  .action(async (id: string) => {
    try {
      const client = createClient();
      const res = await client.get<ApiResponse<MeetingPrepView>>(
        `/api/v1/meeting-preps/${id}/view`,
      );
      if (isJsonMode()) {
        printJson(res);
        return;
      }
      const v = res.data;
      const p = v.prep;
      const u = v.upcoming;
      console.log(`ID:    ${shortId(p)}`);
      console.log(`Title: ${p.title}`);
      if (u) {
        console.log(`When:  ${formatDateTime(u.startedAt)} – ${formatDateTime(u.endedAt)}`);
        console.log(`With:  ${u.attendees.join(', ')}`);
      }
      if (p.agenda) {
        console.log(`\n--- Agenda ---\n${p.agenda}`);
      }
      if (p.notes) {
        console.log(`\n--- Notes ---\n${p.notes}`);
      }
      if (p.talkingPoints) {
        console.log(`\n--- Talking points (${p.talkingPointsSource ?? 'manual'}) ---\n${p.talkingPoints}`);
      }
      if (v.relatedMeetings.length) {
        console.log(`\n--- Related past meetings ---`);
        for (const m of v.relatedMeetings) {
          const when = m.startedAt ? formatDate(epochToIso(m.startedAt)) : '-';
          console.log(`  · ${when}  ${m.title}`);
        }
      }
      if (v.relatedTasks.length) {
        console.log(`\n--- Open tasks ---`);
        for (const t of v.relatedTasks) {
          console.log(`  · [${t.status}] ${t.title}`);
        }
      }
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

prepCommand
  .command('update <id>')
  .description('Patch agenda or notes on a prep')
  .option('--agenda <text>', 'Replace the agenda body')
  .option('--notes <text>', 'Replace the notes body')
  .action(async (id: string, opts: { agenda?: string; notes?: string }) => {
    try {
      const client = createClient();
      const body: { agenda?: string; notes?: string } = {};
      if (opts.agenda !== undefined) body.agenda = opts.agenda;
      if (opts.notes !== undefined) body.notes = opts.notes;
      if (Object.keys(body).length === 0) {
        printError('Pass --agenda or --notes.');
        process.exitCode = 1;
        return;
      }
      const res = await client.patch<ApiResponse<MeetingPrep>>(
        `/api/v1/meeting-preps/${id}`,
        body,
      );
      if (isJsonMode()) {
        printJson(res);
        return;
      }
      printSuccess(`Prep updated (${shortId(res.data)}).`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

prepCommand
  .command('refresh <id>')
  .description('Re-run context discovery (past meetings, open tasks, active goals)')
  .action(async (id: string) => {
    try {
      const client = createClient();
      const res = await client.post<ApiResponse<MeetingPrep>>(
        `/api/v1/meeting-preps/${id}/refresh-context`,
      );
      if (isJsonMode()) {
        printJson(res);
        return;
      }
      const p = res.data;
      printSuccess(
        `Refreshed. ${p.relatedMeetingIds.length} meetings, ${p.relatedTaskIds.length} tasks, ${p.relatedGoalIds.length} goals.`,
      );
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

prepCommand
  .command('generate <id>')
  .description('Generate LLM talking points (uses your BYOK OpenAI key)')
  .action(async (id: string) => {
    try {
      const client = createClient();
      const res = await client.post<
        ApiResponse<
          | { ok: true; talkingPoints: string }
          | { ok: false; reason: string }
        >
      >(`/api/v1/meeting-preps/${id}/generate`);
      if (isJsonMode()) {
        printJson(res);
        return;
      }
      const r = res.data;
      if (!r.ok) {
        if (r.reason === 'missing-api-key') {
          printError('No OpenAI key. Connect one in Settings → BYOK.');
        } else if (r.reason === 'no-context') {
          printError('No related context. Add agenda/notes or run `prep refresh` first.');
        } else {
          printError(`Generate failed: ${r.reason}`);
        }
        process.exitCode = 1;
        return;
      }
      printSuccess('Talking points generated.');
      console.log(`\n${r.talkingPoints}`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

prepCommand
  .command('delete <id>')
  .description('Delete a prep')
  .action(async (id: string) => {
    try {
      const client = createClient();
      await client.del(`/api/v1/meeting-preps/${id}`);
      printSuccess('Prep deleted.');
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

meetingCommand.addCommand(prepCommand);

function formatDateTime(epochMs: number | null | undefined): string {
  if (epochMs === null || epochMs === undefined) return '-';
  const d = new Date(epochMs);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
