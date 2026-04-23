import { Command } from 'commander';
import type { ApiListResponse, ApiResponse } from '@lifeos/shared';
import { createClient } from '../api-client.js';
import {
  isJsonMode,
  printError,
  printJson,
  printSuccess,
  printTable,
  shortId,
} from '../output.js';

interface CalendarEvent {
  id: string;
  _id?: string;
  summary: string;
  description?: string | null;
  location?: string | null;
  startMs?: number | null;
  endMs?: number | null;
  allDay?: boolean;
  attendees?: string[];
  htmlLink?: string | null;
  hangoutLink?: string | null;
  status?: string | null;
}

export const calendarCommand = new Command('calendar')
  .description('Manage Google Calendar events');

calendarCommand
  .command('list')
  .description('List upcoming calendar events')
  .option('-f, --from <iso-or-date>', 'Start of window (default: now)')
  .option('-t, --to <iso-or-date>', 'End of window (default: from + 7 days)')
  .option('-l, --limit <n>', 'Max events to fetch (default 50)', '50')
  .option('-c, --calendar <id>', 'Calendar id (default "primary")', 'primary')
  .action(
    async (opts: { from?: string; to?: string; limit?: string; calendar?: string }) => {
      try {
        const client = createClient();

        const fromMs = opts.from ? Date.parse(opts.from) : Date.now();
        if (Number.isNaN(fromMs)) {
          printError(`Could not parse --from "${opts.from}".`);
          process.exitCode = 1;
          return;
        }
        const toMs = opts.to ? Date.parse(opts.to) : fromMs + 7 * 24 * 60 * 60 * 1000;
        if (Number.isNaN(toMs)) {
          printError(`Could not parse --to "${opts.to}".`);
          process.exitCode = 1;
          return;
        }

        const params: Record<string, string> = {
          timeMin: new Date(fromMs).toISOString(),
          timeMax: new Date(toMs).toISOString(),
          calendarId: opts.calendar ?? 'primary',
        };
        if (opts.limit) params.limit = opts.limit;

        const res = await client.get<ApiListResponse<CalendarEvent>>(
          '/api/v1/calendar/events',
          params,
        );

        if (isJsonMode()) {
          printJson(res);
          return;
        }

        if (res.data.length === 0) {
          console.log('No calendar events in that window.');
          return;
        }

        const rows = res.data.map((e) => [
          shortId(e),
          (e.summary ?? '(no title)').slice(0, 50),
          formatWhen(e.startMs, e.allDay),
          formatDuration(e.startMs, e.endMs, e.allDay),
          String(e.attendees?.length ?? 0),
        ]);
        printTable(['ID', 'Title', 'When', 'Duration', 'Attendees'], rows);
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    },
  );

calendarCommand
  .command('create <summary>')
  .description('Create a calendar event')
  .requiredOption('-s, --start <iso>', 'Start datetime (ISO or human-readable)')
  .requiredOption('-e, --end <iso>', 'End datetime (ISO or human-readable)')
  .option('-d, --description <text>', 'Event description')
  .option('-L, --location <text>', 'Event location')
  .option('-a, --attendees <emails>', 'Comma-separated attendee emails')
  .option('-c, --calendar <id>', 'Calendar id (default "primary")', 'primary')
  .action(
    async (
      summary: string,
      opts: {
        start: string;
        end: string;
        description?: string;
        location?: string;
        attendees?: string;
        calendar?: string;
      },
    ) => {
      try {
        const startMs = Date.parse(opts.start);
        if (Number.isNaN(startMs)) {
          printError(`Could not parse --start "${opts.start}".`);
          process.exitCode = 1;
          return;
        }
        const endMs = Date.parse(opts.end);
        if (Number.isNaN(endMs)) {
          printError(`Could not parse --end "${opts.end}".`);
          process.exitCode = 1;
          return;
        }

        const body: Record<string, unknown> = {
          summary,
          startMs,
          endMs,
          calendarId: opts.calendar ?? 'primary',
        };
        if (opts.description) body.description = opts.description;
        if (opts.location) body.location = opts.location;
        if (opts.attendees) {
          body.attendees = opts.attendees
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        }

        const client = createClient();
        const res = await client.post<ApiResponse<CalendarEvent>>(
          '/api/v1/calendar/events',
          body,
        );

        if (isJsonMode()) {
          printJson(res);
          return;
        }

        printSuccess(
          `Event created: ${res.data.summary} (${shortId(res.data)})`,
        );
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    },
  );

calendarCommand
  .command('update <id>')
  .description('Update a calendar event')
  .option('--summary <text>', 'New title')
  .option('-s, --start <iso>', 'New start datetime')
  .option('-e, --end <iso>', 'New end datetime')
  .option('-d, --description <text>', 'New description')
  .option('-L, --location <text>', 'New location')
  .option('-c, --calendar <id>', 'Calendar id (default "primary")', 'primary')
  .action(
    async (
      id: string,
      opts: {
        summary?: string;
        start?: string;
        end?: string;
        description?: string;
        location?: string;
        calendar?: string;
      },
    ) => {
      try {
        const payload: Record<string, unknown> = {};
        if (opts.summary) payload.summary = opts.summary;
        if (opts.description) payload.description = opts.description;
        if (opts.location) payload.location = opts.location;
        if (opts.calendar) payload.calendarId = opts.calendar;
        if (opts.start) {
          const ms = Date.parse(opts.start);
          if (Number.isNaN(ms)) {
            printError(`Could not parse --start "${opts.start}".`);
            process.exitCode = 1;
            return;
          }
          payload.startMs = ms;
        }
        if (opts.end) {
          const ms = Date.parse(opts.end);
          if (Number.isNaN(ms)) {
            printError(`Could not parse --end "${opts.end}".`);
            process.exitCode = 1;
            return;
          }
          payload.endMs = ms;
        }

        if (Object.keys(payload).length === 0) {
          printError('Nothing to update — pass at least one flag.');
          process.exitCode = 1;
          return;
        }

        const client = createClient();
        const res = await client.patch<ApiResponse<CalendarEvent>>(
          `/api/v1/calendar/events/${id}`,
          payload,
        );

        if (isJsonMode()) {
          printJson(res);
          return;
        }

        printSuccess(`Event updated: ${res.data.summary}`);
      } catch (err) {
        printError(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    },
  );

calendarCommand
  .command('delete <id>')
  .description('Delete a calendar event')
  .option('-c, --calendar <id>', 'Calendar id (default "primary")', 'primary')
  .action(async (id: string, opts: { calendar?: string }) => {
    try {
      const client = createClient();
      const params: Record<string, string> = {};
      if (opts.calendar) params.calendarId = opts.calendar;
      // ApiClient.del doesn't accept query params directly — append manually
      const qs = new URLSearchParams(params).toString();
      const path = qs
        ? `/api/v1/calendar/events/${id}?${qs}`
        : `/api/v1/calendar/events/${id}`;
      await client.del(path);
      if (isJsonMode()) {
        printJson({ data: { ok: true } });
        return;
      }
      printSuccess(`Event ${id.slice(0, 8)} deleted.`);
    } catch (err) {
      printError(err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    }
  });

// ── helpers ──────────────────────────────────────────

function epochToIso(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return new Date(value).toISOString();
}

function formatWhen(startMs: number | null | undefined, allDay?: boolean): string {
  if (startMs === null || startMs === undefined) return '-';
  const d = new Date(startMs);
  if (allDay) {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(
  startMs: number | null | undefined,
  endMs: number | null | undefined,
  allDay?: boolean,
): string {
  if (allDay) return 'all-day';
  if (
    startMs === null ||
    startMs === undefined ||
    endMs === null ||
    endMs === undefined
  ) {
    return '-';
  }
  const minutes = Math.round((endMs - startMs) / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hours}h` : `${hours}h${mins}m`;
}

// Exported only to silence unused-import linters in environments that strip
// dead exports — kept available in case downstream commands want it.
export { epochToIso };
