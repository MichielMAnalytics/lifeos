// LLM-generated talking points for a meeting prep.
//
// Pulls the prep + its hydrated context (upcoming meeting metadata, past
// meetings with overlapping attendees, related open tasks + active goals,
// the user's editable agenda/notes) and asks OpenAI to produce a tight
// markdown brief: agenda recap, talking points, open questions, and any
// follow-ups owed.
//
// Lives in Node runtime because `readByokSecret` shells out to GCP Secret
// Manager. Same pattern as `financeAi.ts`.

"use node";

import { v } from "convex/values";
import { action, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { readByokSecret } from "./k8s";
import type { Doc, Id } from "./_generated/dataModel";

const OPENAI_MODEL = "gpt-4o-mini";

type GenerateResult =
  | { ok: true; talkingPoints: string }
  | { ok: false; reason: "missing-api-key" | "no-context" | "llm-failed" | "prep-not-found" };

export const generate = action({
  args: { id: v.id("meetingPreps") },
  handler: async (ctx, args): Promise<GenerateResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await generateForUser(ctx, userId, args.id);
  },
});

// Internal variant — same logic, takes a userId so the HTTP/CLI surface
// can call it without a session.
import { internalAction } from "./_generated/server";

export const _generate = internalAction({
  args: { userId: v.id("users"), id: v.id("meetingPreps") },
  handler: async (ctx, args): Promise<GenerateResult> => {
    return await generateForUser(ctx, args.userId, args.id);
  },
});

async function generateForUser(
  ctx: ActionCtx,
  userId: Id<"users">,
  prepId: Id<"meetingPreps">,
): Promise<GenerateResult> {
  const view = await ctx.runQuery(internal.meetingPreps._viewWithContext, {
    userId,
    id: prepId,
  });
  if (!view) return { ok: false, reason: "prep-not-found" };

  const apiKey = await readByokSecret(userId, "openai");
  if (!apiKey) return { ok: false, reason: "missing-api-key" };

  const prompt = buildPrompt(view);
  // If we have nothing but the bare upcoming meeting (no related context,
  // no agenda, no notes), the model will just hallucinate filler — better
  // to surface that explicitly so the UI can prompt the user to add notes.
  if (!prompt.hasSubstance) return { ok: false, reason: "no-context" };

  const talkingPoints = await callOpenAi(apiKey, prompt.system, prompt.user);
  if (!talkingPoints) return { ok: false, reason: "llm-failed" };

  await ctx.runMutation(internal.meetingPreps._setTalkingPoints, {
    userId,
    id: prepId,
    talkingPoints,
    source: "openai",
  });

  return { ok: true, talkingPoints };
}

// ── Prompt building ──────────────────────────────────

interface PrepView {
  prep: Doc<"meetingPreps">;
  upcoming: Doc<"upcomingMeetings"> | null;
  relatedMeetings: Array<{
    _id: Id<"meetings">;
    title: string;
    startedAt?: number;
    attendees?: string[];
    summary?: string;
  }>;
  relatedTasks: Array<{
    _id: Id<"tasks">;
    title: string;
    status: string;
  }>;
}

function buildPrompt(view: PrepView): {
  system: string;
  user: string;
  hasSubstance: boolean;
} {
  const { prep, upcoming, relatedMeetings, relatedTasks } = view;

  const lines: string[] = [];
  if (upcoming) {
    lines.push(`# Upcoming meeting`);
    lines.push(`Title: ${upcoming.title}`);
    lines.push(`When: ${formatWhen(upcoming.startedAt, upcoming.endedAt)}`);
    if (upcoming.attendees?.length) {
      lines.push(`Attendees: ${upcoming.attendees.join(", ")}`);
    }
    if (upcoming.location) lines.push(`Location: ${upcoming.location}`);
    if (upcoming.description) {
      lines.push("", "Description:", upcoming.description.slice(0, 1500));
    }
    lines.push("");
  }

  if (prep.agenda?.trim()) {
    lines.push(`# User's agenda`);
    lines.push(prep.agenda.trim().slice(0, 2000));
    lines.push("");
  }
  if (prep.notes?.trim()) {
    lines.push(`# User's notes`);
    lines.push(prep.notes.trim().slice(0, 2000));
    lines.push("");
  }

  if (relatedMeetings.length > 0) {
    lines.push(`# Past meetings with these people`);
    for (const m of relatedMeetings) {
      const when = m.startedAt ? new Date(m.startedAt).toISOString().slice(0, 10) : "unknown date";
      lines.push(`- ${when} — ${m.title}`);
      if (m.summary) lines.push(`  Summary: ${m.summary.slice(0, 600)}`);
    }
    lines.push("");
  }

  if (relatedTasks.length > 0) {
    lines.push(`# Open tasks mentioning these people`);
    for (const t of relatedTasks) {
      lines.push(`- [${t.status}] ${t.title}`);
    }
    lines.push("");
  }

  const userText = lines.join("\n").trim();

  // "Substance" = at least one of (related meeting, related task, agenda,
  // notes). Bare upcoming-meeting-only prompts produce filler.
  const hasSubstance =
    relatedMeetings.length > 0 ||
    relatedTasks.length > 0 ||
    Boolean(prep.agenda?.trim()) ||
    Boolean(prep.notes?.trim());

  const system =
    "You prepare a concise meeting brief for the user (a busy operator). " +
    "Output GitHub-flavoured markdown with these sections: " +
    "## Talking points (3-5 bullets, what to raise), " +
    "## Open questions (things to ask), " +
    "## Follow-ups owed (commitments from past meetings or open tasks). " +
    "Skip a section entirely if there is nothing concrete to put under it. " +
    "Be specific — reference past meeting titles, task titles, and attendees by name. " +
    "Never invent facts not present in the supplied context. Keep total under 300 words.";

  return { system, user: userText, hasSubstance };
}

function formatWhen(startMs: number, endMs: number): string {
  const start = new Date(startMs);
  const end = new Date(endMs);
  const sameDay = start.toDateString() === end.toDateString();
  const date = start.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const t1 = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const t2 = end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return sameDay ? `${date}, ${t1} – ${t2}` : `${date}, ${t1} – ${end.toLocaleString()}`;
}

// ── OpenAI call ──────────────────────────────────────

async function callOpenAi(
  apiKey: string,
  system: string,
  user: string,
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.4,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    console.warn("[meetingPrepGenerator] OpenAI fetch failed", err);
    return null;
  }
  clearTimeout(timeout);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.warn("[meetingPrepGenerator] OpenAI returned", res.status, body.slice(0, 500));
    return null;
  }

  let payload: { choices?: Array<{ message?: { content?: string } }> };
  try {
    payload = (await res.json()) as typeof payload;
  } catch {
    return null;
  }

  const content = payload.choices?.[0]?.message?.content?.trim();
  return content || null;
}
