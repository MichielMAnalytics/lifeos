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
        .query("projects")
        .withIndex("by_userId_status", (q) =>
          q.eq("userId", userId).eq("status", args.status!),
        )
        .collect();
    } else {
      results = await ctx.db
        .query("projects")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();
    }

    return results;
  },
});

// ── get ───────────────────────────────────────────────

export const get = query({
  args: {
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.id);
    if (!project || project.userId !== userId) {
      return null;
    }

    // Fetch tasks belonging to this project
    const projectTasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const filteredTasks = projectTasks.filter(
      (t) => t.projectId === args.id,
    );

    return { ...project, tasks: filteredTasks };
  },
});

// ── create ────────────────────────────────────────────

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const projectId = await ctx.db.insert("projects", {
      userId,
      title: args.title,
      description: args.description,
      status: args.status ?? "active",
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

    return project;
  },
});

// ── update ────────────────────────────────────────────

export const update = mutation({
  args: {
    id: v.id("projects"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Project not found");
    }

    const updates: Record<string, unknown> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(args.id, updates);
    const updated = await ctx.db.get(args.id);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "update",
      tableName: "projects",
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
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Project not found");
    }

    await ctx.db.delete(args.id);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "delete",
      tableName: "projects",
      recordId: args.id,
      beforeData: existing,
      afterData: null,
    });

    return { id: args.id };
  },
});

// ── setImpactFilter ──────────────────────────────────
// Writes (or rewrites) Dan Sullivan's Impact Filter onto a project. The
// wizard enforces the "8 success criteria" discipline before calling this;
// the mutation itself accepts any non-empty array so future tools can write
// shorter drafts without bouncing off the validator.

export const setImpactFilter = mutation({
  args: {
    id: v.id("projects"),
    purpose: v.string(),
    importance: v.string(),
    idealOutcome: v.string(),
    worstResult: v.string(),
    bestResult: v.string(),
    successCriteria: v.array(v.string()),
    who: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Project not found");
    }

    const now = Date.now();
    const impactFilter = {
      purpose: args.purpose,
      importance: args.importance,
      idealOutcome: args.idealOutcome,
      worstResult: args.worstResult,
      bestResult: args.bestResult,
      successCriteria: args.successCriteria,
      who: args.who,
      completedAt: existing.impactFilter?.completedAt ?? now,
      updatedAt: now,
    };

    await ctx.db.patch(args.id, { impactFilter });
    const updated = await ctx.db.get(args.id);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "update",
      tableName: "projects",
      recordId: args.id,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  },
});

// ── clearImpactFilter ────────────────────────────────
// `replace` instead of `patch` for the same reason as dayPlans.clearPriority:
// patch with explicit undefined doesn't reliably drop optional fields once
// the value is serialized.

export const clearImpactFilter = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Project not found");
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, _creationTime, impactFilter: _f, ...rest } = existing;
    await ctx.db.replace(args.id, rest);
    const updated = await ctx.db.get(args.id);

    await ctx.db.insert("mutationLog", {
      userId,
      action: "update",
      tableName: "projects",
      recordId: args.id,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  },
});

// ── Internal versions of impact filter mutations (for HTTP/CLI) ──

export const _setImpactFilter = internalMutation({
  args: {
    userId: v.id("users"),
    id: v.id("projects"),
    purpose: v.string(),
    importance: v.string(),
    idealOutcome: v.string(),
    worstResult: v.string(),
    bestResult: v.string(),
    successCriteria: v.array(v.string()),
    who: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error("Project not found");
    }
    const now = Date.now();
    const impactFilter = {
      purpose: args.purpose,
      importance: args.importance,
      idealOutcome: args.idealOutcome,
      worstResult: args.worstResult,
      bestResult: args.bestResult,
      successCriteria: args.successCriteria,
      who: args.who,
      completedAt: existing.impactFilter?.completedAt ?? now,
      updatedAt: now,
    };
    await ctx.db.patch(args.id, { impactFilter });
    const updated = await ctx.db.get(args.id);
    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "update",
      tableName: "projects",
      recordId: args.id,
      beforeData: existing,
      afterData: updated,
    });
    return updated;
  },
});

export const _clearImpactFilter = internalMutation({
  args: { userId: v.id("users"), id: v.id("projects") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error("Project not found");
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, _creationTime, impactFilter: _f, ...rest } = existing;
    await ctx.db.replace(args.id, rest);
    const updated = await ctx.db.get(args.id);
    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "update",
      tableName: "projects",
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
        .query("projects")
        .withIndex("by_userId_status", (q) =>
          q.eq("userId", args.userId).eq("status", args.status!),
        )
        .collect();
    } else {
      results = await ctx.db
        .query("projects")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .collect();
    }

    return { data: results, count: results.length };
  },
});

export const _get = internalQuery({
  args: {
    userId: v.id("users"),
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id);
    if (!project || project.userId !== args.userId) {
      return null;
    }

    const projectTasks = await ctx.db
      .query("tasks")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const filteredTasks = projectTasks.filter(
      (t) => t.projectId === args.id,
    );

    return { ...project, tasks: filteredTasks };
  },
});

export const _create = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const projectId = await ctx.db.insert("projects", {
      userId: args.userId,
      title: args.title,
      description: args.description,
      status: args.status ?? "active",
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

    return project;
  },
});

export const _update = internalMutation({
  args: {
    userId: v.id("users"),
    id: v.id("projects"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error("Project not found");
    }

    const updates: Record<string, unknown> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(args.id, updates);
    const updated = await ctx.db.get(args.id);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "update",
      tableName: "projects",
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
    id: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== args.userId) {
      throw new Error("Project not found");
    }

    await ctx.db.delete(args.id);

    await ctx.db.insert("mutationLog", {
      userId: args.userId,
      action: "delete",
      tableName: "projects",
      recordId: args.id,
      beforeData: existing,
      afterData: null,
    });

    return { id: args.id };
  },
});
