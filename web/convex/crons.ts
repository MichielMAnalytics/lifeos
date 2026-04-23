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

export default crons;
