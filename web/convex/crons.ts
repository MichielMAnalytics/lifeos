import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Reminder dispatcher — runs every minute, picks up any pending reminder
// whose scheduledAt has passed and delivers it via Telegram. The action is
// idempotent at the row level (it only acts on rows still marked `pending`)
// so a missed minute or a retry won't double-fire.
crons.interval(
  "deliver due reminders",
  { minutes: 1 },
  internal.reminderDispatch.tick,
  {},
);

// Granola sync — hourly poll of every connected user's account. Granola
// has no webhooks, so we lean on polling. Hourly is comfortable inside
// the 5 req/s sustained rate limit even at hundreds of connected users
// and is fresh enough for "ask the bot about my last meeting".
crons.interval(
  "sync meetings from granola",
  { hours: 1 },
  internal.granolaSync.tick,
  {},
);

// Google Calendar sync — every 15 minutes. Most syncs are incremental
// (syncToken path) so the per-user request count is 1 GET unless the
// user has a lot of changes, keeping us well inside the 500-req-per-
// 100s per-user quota.
crons.interval(
  "sync google calendar events",
  { minutes: 15 },
  internal.googleCalendar._syncAllConnected,
  {},
);

// Daily cleanup of expired OAuth state tokens. The window is 10 min at
// creation so this is only a safety net for rows left behind by users
// who abandoned the consent screen.
crons.interval(
  "purge expired google oauth states",
  { hours: 24 },
  internal.googleAuthHelpers._purgeExpiredOAuthStates,
  {},
);

export default crons;
