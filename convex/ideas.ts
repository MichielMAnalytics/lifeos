import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── list ──────────────────────────────────────────────

export const list = query({
  args: {
    actionability: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let results = await ctx.db
      .query("ideas")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    if (args.actionability !== undefined) {
      results = results.filter((i) => i.actionability === args.actionability);
    }

    return { data: results, count: results.length };
  },
});

// ── create ────────────────────────────────────────────

export const create = mutation({
  args: {
    content: v.string(),
    actionability: v.optional(v.string()),
    nextStep: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const ideaId = await ctx.db.insert("ideas", {
      userId,
      content: args.content,
      actionability: args.actionability,
      nextStep: args.nextStep,
    });

    const idea = await ctx.db.get(ideaId);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "create",
      tableName: "ideas",
      recordId: ideaId,
      beforeData: null,
      afterData: idea,
    });

    return idea;
  },
});

// ── update ────────────────────────────────────────────

export const update = mutation({
  args: {
    id: v.id("ideas"),
    content: v.optional(v.string()),
    actionability: v.optional(v.string()),
    nextStep: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Idea not found");
    }

    const updates: Record<string, unknown> = {};
    if (args.content !== undefined) updates.content = args.content;
    if (args.actionability !== undefined) updates.actionability = args.actionability;
    if (args.nextStep !== undefined) updates.nextStep = args.nextStep;

    await ctx.db.patch(args.id, updates);
    const updated = await ctx.db.get(args.id);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "update",
      tableName: "ideas",
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
    id: v.id("ideas"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Idea not found");
    }

    await ctx.db.delete(args.id);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "delete",
      tableName: "ideas",
      recordId: args.id,
      beforeData: existing,
      afterData: null,
    });

    return { id: args.id };
  },
});

// ── promote ──────────────────────────────────────────

export const promote = mutation({
  args: {
    id: v.id("ideas"),
    projectTitle: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Idea not found");
    }

    // Create a new project from the idea
    const projectId = await ctx.db.insert("projects", {
      userId,
      title: args.projectTitle,
      status: "active",
    });

    const project = await ctx.db.get(projectId);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "create",
      tableName: "projects",
      recordId: projectId,
      beforeData: null,
      afterData: project,
    });

    // Link the idea to the new project
    await ctx.db.patch(args.id, { projectId });
    const updatedIdea = await ctx.db.get(args.id);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "update",
      tableName: "ideas",
      recordId: args.id,
      beforeData: existing,
      afterData: updatedIdea,
    });

    return { idea: updatedIdea, project };
  },
});

// ── Internal functions (for HTTP router) ─────────────

export const _list = internalQuery({
  args: {
    userId: v.id("users"),
    actionability: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let results = await ctx.db
      .query("ideas")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    if (args.actionability !== undefined) {
      results = results.filter((i) => i.actionability === args.actionability);
    }

    return { data: results, count: results.length };
  },
});

export const _create = internalMutation({
  args: {
    userId: v.id("users"),
    content: v.string(),
    actionability: v.optional(v.string()),
    nextStep: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ideaId = await ctx.db.insert("ideas", {
      userId: args.userId,
      content: args.content,
      actionability: args.actionability,
      nextStep: args.nextStep,
    });

    const idea = await ctx.db.get(ideaId);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "create",
      tableName: "ideas",
      recordId: ideaId,
      beforeData: null,
      afterData: idea,
    });

    return idea;
  },
});

export const _update = internalMutation({
  args: {
    userId: v.id("users"),
    id: v.id("ideas"),
    content: v.optional(v.string()),
    actionability: v.optional(v.string()),
    nextStep: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error("Idea not found");
    }

    const updates: Record<string, unknown> = {};
    if (args.content !== undefined) updates.content = args.content;
    if (args.actionability !== undefined) updates.actionability = args.actionability;
    if (args.nextStep !== undefined) updates.nextStep = args.nextStep;

    await ctx.db.patch(args.id, updates);
    const updated = await ctx.db.get(args.id);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "update",
      tableName: "ideas",
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
    id: v.id("ideas"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error("Idea not found");
    }

    await ctx.db.delete(args.id);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "delete",
      tableName: "ideas",
      recordId: args.id,
      beforeData: existing,
      afterData: null,
    });

    return { id: args.id };
  },
});

export const _promote = internalMutation({
  args: {
    userId: v.id("users"),
    id: v.id("ideas"),
    projectTitle: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error("Idea not found");
    }

    const projectId = await ctx.db.insert("projects", {
      userId: args.userId,
      title: args.projectTitle,
      status: "active",
    });

    const project = await ctx.db.get(projectId);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "create",
      tableName: "projects",
      recordId: projectId,
      beforeData: null,
      afterData: project,
    });

    await ctx.db.patch(args.id, { projectId });
    const updatedIdea = await ctx.db.get(args.id);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "update",
      tableName: "ideas",
      recordId: args.id,
      beforeData: existing,
      afterData: updatedIdea,
    });

    return { idea: updatedIdea, project };
  },
});
