import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── list ──────────────────────────────────────────────

export const list = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let results;
    if (args.status !== undefined) {
      results = await ctx.db
        .query("reminders")
        .withIndex("by_userId_status", (q) =>
          q.eq("userId", userId).eq("status", args.status!),
        )
        .collect();
    } else {
      results = await ctx.db
        .query("reminders")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();
    }

    // Sort by scheduledAt ascending
    results.sort((a, b) => a.scheduledAt - b.scheduledAt);

    return { data: results, count: results.length };
  },
});

// ── create ────────────────────────────────────────────

export const create = mutation({
  args: {
    title: v.string(),
    body: v.optional(v.string()),
    scheduledAt: v.float64(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const reminderId = await ctx.db.insert("reminders", {
      userId,
      title: args.title,
      body: args.body,
      scheduledAt: args.scheduledAt,
      status: "pending",
      snoozeCount: 0,
    });

    const reminder = await ctx.db.get(reminderId);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "create",
      tableName: "reminders",
      recordId: reminderId,
      beforeData: null,
      afterData: reminder,
    });

    return reminder;
  },
});

// ── update ────────────────────────────────────────────

export const update = mutation({
  args: {
    id: v.id("reminders"),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    scheduledAt: v.optional(v.float64()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Reminder not found");
    }

    const updates: Record<string, unknown> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.body !== undefined) updates.body = args.body;
    if (args.scheduledAt !== undefined) updates.scheduledAt = args.scheduledAt;
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(args.id, updates);
    const updated = await ctx.db.get(args.id);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "update",
      tableName: "reminders",
      recordId: args.id,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  },
});

// ── remove ────────────────────────────────────────────

export const remove = mutation({
  args: {
    id: v.id("reminders"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Reminder not found");
    }

    await ctx.db.delete(args.id);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "delete",
      tableName: "reminders",
      recordId: args.id,
      beforeData: existing,
      afterData: null,
    });

    return { id: args.id };
  },
});

// ── snooze ───────────────────────────────────────────

export const snooze = mutation({
  args: {
    id: v.id("reminders"),
    minutes: v.float64(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Reminder not found");
    }

    const newScheduledAt = existing.scheduledAt + args.minutes * 60_000;

    await ctx.db.patch(args.id, {
      scheduledAt: newScheduledAt,
      snoozeCount: existing.snoozeCount + 1,
      status: "snoozed",
    });

    const updated = await ctx.db.get(args.id);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "update",
      tableName: "reminders",
      recordId: args.id,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  },
});

// ── markDone ─────────────────────────────────────────

export const markDone = mutation({
  args: {
    id: v.id("reminders"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Reminder not found");
    }

    await ctx.db.patch(args.id, { status: "done" });
    const updated = await ctx.db.get(args.id);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "complete",
      tableName: "reminders",
      recordId: args.id,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  },
});

// ── Internal functions (for HTTP router) ─────────────

export const _list = internalQuery({
  args: {
    userId: v.id("users"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let results;
    if (args.status !== undefined) {
      results = await ctx.db
        .query("reminders")
        .withIndex("by_userId_status", (q) =>
          q.eq("userId", args.userId).eq("status", args.status!),
        )
        .collect();
    } else {
      results = await ctx.db
        .query("reminders")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .collect();
    }

    results.sort((a, b) => a.scheduledAt - b.scheduledAt);

    return { data: results, count: results.length };
  },
});

export const _create = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.optional(v.string()),
    scheduledAt: v.float64(),
  },
  handler: async (ctx, args) => {
    const reminderId = await ctx.db.insert("reminders", {
      userId: args.userId,
      title: args.title,
      body: args.body,
      scheduledAt: args.scheduledAt,
      status: "pending",
      snoozeCount: 0,
    });

    const reminder = await ctx.db.get(reminderId);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "create",
      tableName: "reminders",
      recordId: reminderId,
      beforeData: null,
      afterData: reminder,
    });

    return reminder;
  },
});

export const _update = internalMutation({
  args: {
    userId: v.id("users"),
    id: v.id("reminders"),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    scheduledAt: v.optional(v.float64()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error("Reminder not found");
    }

    const updates: Record<string, unknown> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.body !== undefined) updates.body = args.body;
    if (args.scheduledAt !== undefined) updates.scheduledAt = args.scheduledAt;
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(args.id, updates);
    const updated = await ctx.db.get(args.id);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "update",
      tableName: "reminders",
      recordId: args.id,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  },
});

export const _remove = internalMutation({
  args: {
    userId: v.id("users"),
    id: v.id("reminders"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error("Reminder not found");
    }

    await ctx.db.delete(args.id);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "delete",
      tableName: "reminders",
      recordId: args.id,
      beforeData: existing,
      afterData: null,
    });

    return { id: args.id };
  },
});

export const _snooze = internalMutation({
  args: {
    userId: v.id("users"),
    id: v.id("reminders"),
    minutes: v.float64(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error("Reminder not found");
    }

    const newScheduledAt = existing.scheduledAt + args.minutes * 60_000;

    await ctx.db.patch(args.id, {
      scheduledAt: newScheduledAt,
      snoozeCount: existing.snoozeCount + 1,
      status: "snoozed",
    });

    const updated = await ctx.db.get(args.id);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "update",
      tableName: "reminders",
      recordId: args.id,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  },
});

export const _markDone = internalMutation({
  args: {
    userId: v.id("users"),
    id: v.id("reminders"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error("Reminder not found");
    }

    await ctx.db.patch(args.id, { status: "done" });
    const updated = await ctx.db.get(args.id);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "complete",
      tableName: "reminders",
      recordId: args.id,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  },
});
