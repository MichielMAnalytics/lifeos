// Skills — per-user markdown rulebooks the Life Coach reads on every turn so
// it knows when to call a deterministic CLI command instead of asking the LLM
// to guess. Adapted from Garry Tan's "skillify" pattern.
//
// Public surface:
//   list / get / getByName     — read views for the dashboard and resolver.
//   create / update / remove   — user CRUD for custom skills.
//   seedDefaults               — idempotent install of the built-in skills.
//
// Slugs (`name`) are lowercase-alphanumeric-with-dashes and unique per user.

import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── default skills ───────────────────────────────────
// Embedded as constants so seedDefaults is hermetic — no file IO at runtime.

const SLUG_RE = /^[a-z0-9-]+$/;

type SkillSeed = {
  name: string;
  summary: string;
  triggers: string[];
  body: string;
};

export const DEFAULT_SKILLS: SkillSeed[] = [
  {
    name: "meeting-recall",
    summary: "Always check the local meetings DB before answering a question about past meetings.",
    triggers: ["meeting", "meetings", "discussed", "talked about", "call with"],
    body: `# meeting-recall

## When to use
- Any question about a past meeting, what was discussed, who attended, action items, or transcripts.
- Questions like: "what did I discuss with X", "summarise our last call", "find the meeting where we talked about Y".

## Procedure
1. Run \`lifeos meeting list --search "<keyword>" --limit 5\` first. Add \`--attendee <name>\` or \`--folder <folder>\` to narrow.
2. If multiple match, ask the user which one (show ID + title + date) before pulling the full transcript.
3. Run \`lifeos meeting show <id>\` for the full summary + transcript.
4. **Never** call the Granola API directly. The local DB is authoritative — \`granolaSync\` keeps it fresh hourly.

## Why this exists
Going to Granola for every question is slow (network), wastes the user's API quota, and misses the point — we already have the data.`,
  },
  {
    name: "context-now",
    summary: "Use the deterministic context-now CLI for any time-sensitive question instead of doing mental math.",
    triggers: ["what time", "next meeting", "right now", "minutes until", "today's", "this week"],
    body: `# context-now

## When to use
- Any question that depends on the current wall-clock time or "what's happening right now / next".
- Questions like: "when is my next meeting", "how long until X", "what's left on my plate today".

## Procedure
1. Run \`lifeos context now\` first. Output is a JSON snapshot: current time in the user's timezone, next reminder, active task, today's day plan.
2. Quote the result. **Never** do UTC ↔ local timezone math in your head — Granola/cron timestamps are UTC, the user is not.
3. For richer queries, chain: \`lifeos context now\` → \`lifeos task list --due today\` → \`lifeos schedule today\`.

## Why this exists
Two specific failures we want to be structurally impossible: (a) telling the user "your next meeting is in 28 minutes" when it's actually 88, (b) saying "today" while looking at yesterday's UTC date.`,
  },
];

// ── list ──────────────────────────────────────────────

export const list = query({
  args: { enabledOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const rows = await ctx.db
      .query("skills")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    const filtered = args.enabledOnly ? rows.filter((s) => s.enabled) : rows;
    filtered.sort((a, b) => a.name.localeCompare(b.name));
    return filtered;
  },
});

// ── get ───────────────────────────────────────────────

export const get = query({
  args: { id: v.id("skills") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const skill = await ctx.db.get(args.id);
    if (!skill || skill.userId !== userId) return null;
    return skill;
  },
});

// ── getByName ─────────────────────────────────────────

export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const skill = await ctx.db
      .query("skills")
      .withIndex("by_userId_name", (q) => q.eq("userId", userId).eq("name", args.name))
      .unique();
    return skill ?? null;
  },
});

// ── create ────────────────────────────────────────────

export const create = mutation({
  args: {
    name: v.string(),
    summary: v.string(),
    body: v.string(),
    triggers: v.optional(v.array(v.string())),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (!SLUG_RE.test(args.name)) {
      throw new Error("Skill name must be lowercase alphanumeric with dashes only");
    }
    const dupe = await ctx.db
      .query("skills")
      .withIndex("by_userId_name", (q) => q.eq("userId", userId).eq("name", args.name))
      .unique();
    if (dupe) throw new Error("A skill with this name already exists");

    const id = await ctx.db.insert("skills", {
      userId,
      name: args.name,
      summary: args.summary,
      body: args.body,
      triggers: args.triggers,
      enabled: args.enabled ?? true,
      updatedAt: Date.now(),
    });
    const row = await ctx.db.get(id);
    await ctx.db.insert("mutationLog", {
      userId, action: "create", tableName: "skills",
      recordId: id, beforeData: null, afterData: row,
    });
    return row;
  },
});

// ── update ────────────────────────────────────────────

export const update = mutation({
  args: {
    id: v.id("skills"),
    name: v.optional(v.string()),
    summary: v.optional(v.string()),
    body: v.optional(v.string()),
    triggers: v.optional(v.array(v.string())),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Skill not found");

    if (args.name !== undefined && args.name !== existing.name) {
      if (!SLUG_RE.test(args.name)) {
        throw new Error("Skill name must be lowercase alphanumeric with dashes only");
      }
      const dupe = await ctx.db
        .query("skills")
        .withIndex("by_userId_name", (q) => q.eq("userId", userId).eq("name", args.name!))
        .unique();
      if (dupe && dupe._id !== args.id) {
        throw new Error("A skill with this name already exists");
      }
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.summary !== undefined) updates.summary = args.summary;
    if (args.body !== undefined) updates.body = args.body;
    if (args.triggers !== undefined) updates.triggers = args.triggers;
    if (args.enabled !== undefined) updates.enabled = args.enabled;

    await ctx.db.patch(args.id, updates);
    const after = await ctx.db.get(args.id);
    await ctx.db.insert("mutationLog", {
      userId, action: "update", tableName: "skills",
      recordId: args.id, beforeData: existing, afterData: after,
    });
    return after;
  },
});

// ── remove ────────────────────────────────────────────

export const remove = mutation({
  args: { id: v.id("skills") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Skill not found");

    await ctx.db.delete(args.id);
    await ctx.db.insert("mutationLog", {
      userId, action: "delete", tableName: "skills",
      recordId: args.id, beforeData: existing, afterData: null,
    });
    return { id: args.id };
  },
});

// ── seedDefaults ──────────────────────────────────────
// Idempotent: only inserts the defaults that don't already exist (matched by
// name). Safe to call on every dashboard mount of the Life Coach surface.

export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("skills")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    const existingNames = new Set(existing.map((s) => s.name));

    let inserted = 0;
    for (const def of DEFAULT_SKILLS) {
      if (existingNames.has(def.name)) continue;
      await ctx.db.insert("skills", {
        userId,
        name: def.name,
        summary: def.summary,
        body: def.body,
        triggers: def.triggers,
        enabled: true,
        updatedAt: Date.now(),
      });
      inserted++;
    }
    return { inserted };
  },
});

// ══════════════════════════════════════════════════════
// Internal — used by the HTTP layer / CLI.
// ══════════════════════════════════════════════════════

export const _list = internalQuery({
  args: {
    userId: v.id("users"),
    enabledOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("skills")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    const filtered = args.enabledOnly ? rows.filter((s) => s.enabled) : rows;
    filtered.sort((a, b) => a.name.localeCompare(b.name));
    return { data: filtered, count: filtered.length };
  },
});

export const _get = internalQuery({
  args: { userId: v.id("users"), id: v.id("skills") },
  handler: async (ctx, args) => {
    const skill = await ctx.db.get(args.id);
    if (!skill || skill.userId !== args.userId) return null;
    return skill;
  },
});

export const _getByName = internalQuery({
  args: { userId: v.id("users"), name: v.string() },
  handler: async (ctx, args) => {
    const skill = await ctx.db
      .query("skills")
      .withIndex("by_userId_name", (q) => q.eq("userId", args.userId).eq("name", args.name))
      .unique();
    return skill ?? null;
  },
});

export const _create = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    summary: v.string(),
    body: v.string(),
    triggers: v.optional(v.array(v.string())),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!SLUG_RE.test(args.name)) {
      throw new Error("Skill name must be lowercase alphanumeric with dashes only");
    }
    const dupe = await ctx.db
      .query("skills")
      .withIndex("by_userId_name", (q) => q.eq("userId", args.userId).eq("name", args.name))
      .unique();
    if (dupe) throw new Error("A skill with this name already exists");

    const id = await ctx.db.insert("skills", {
      userId: args.userId,
      name: args.name,
      summary: args.summary,
      body: args.body,
      triggers: args.triggers,
      enabled: args.enabled ?? true,
      updatedAt: Date.now(),
    });
    const row = await ctx.db.get(id);
    await ctx.db.insert("mutationLog", {
      userId: args.userId, action: "create", tableName: "skills",
      recordId: id, beforeData: null, afterData: row,
    });
    return row;
  },
});

export const _update = internalMutation({
  args: {
    userId: v.id("users"),
    id: v.id("skills"),
    name: v.optional(v.string()),
    summary: v.optional(v.string()),
    body: v.optional(v.string()),
    triggers: v.optional(v.array(v.string())),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) throw new Error("Skill not found");

    if (args.name !== undefined && args.name !== existing.name) {
      if (!SLUG_RE.test(args.name)) {
        throw new Error("Skill name must be lowercase alphanumeric with dashes only");
      }
      const dupe = await ctx.db
        .query("skills")
        .withIndex("by_userId_name", (q) => q.eq("userId", args.userId).eq("name", args.name!))
        .unique();
      if (dupe && dupe._id !== args.id) {
        throw new Error("A skill with this name already exists");
      }
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.summary !== undefined) updates.summary = args.summary;
    if (args.body !== undefined) updates.body = args.body;
    if (args.triggers !== undefined) updates.triggers = args.triggers;
    if (args.enabled !== undefined) updates.enabled = args.enabled;

    await ctx.db.patch(args.id, updates);
    const after = await ctx.db.get(args.id);
    await ctx.db.insert("mutationLog", {
      userId: args.userId, action: "update", tableName: "skills",
      recordId: args.id, beforeData: existing, afterData: after,
    });
    return after;
  },
});

export const _remove = internalMutation({
  args: { userId: v.id("users"), id: v.id("skills") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) throw new Error("Skill not found");
    await ctx.db.delete(args.id);
    await ctx.db.insert("mutationLog", {
      userId: args.userId, action: "delete", tableName: "skills",
      recordId: args.id, beforeData: existing, afterData: null,
    });
    return { id: args.id };
  },
});

export const _seedDefaults = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("skills")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    const existingNames = new Set(existing.map((s) => s.name));
    let inserted = 0;
    for (const def of DEFAULT_SKILLS) {
      if (existingNames.has(def.name)) continue;
      await ctx.db.insert("skills", {
        userId: args.userId,
        name: def.name,
        summary: def.summary,
        body: def.body,
        triggers: def.triggers,
        enabled: true,
        updatedAt: Date.now(),
      });
      inserted++;
    }
    return { inserted };
  },
});
