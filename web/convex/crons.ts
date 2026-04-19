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

export default crons;
