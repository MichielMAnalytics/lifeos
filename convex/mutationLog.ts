import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx } from "./_generated/server";
import type { TableNames } from "./_generated/dataModel";
import type { WithoutSystemFields } from "convex/server";
import type { Doc } from "./_generated/dataModel";

/**
 * Dynamic insert helper for undo operations.
 * Accepts Record<string, unknown> (from beforeData) and asserts the correct
 * document shape via generics. This avoids `as any` while handling the
 * inherently dynamic nature of undo re-inserts.
 */
async function dynamicInsert<T extends TableNames>(
  ctx: MutationCtx,
  table: T,
  data: Record<string, unknown>,
) {
  // The data originates from a previously valid document (beforeData).
  // We assert it matches the expected schema shape for this table.
  await ctx.db.insert(table, data as unknown as WithoutSystemFields<Doc<T>>);
}

// ── list ──────────────────────────────────────────────

export const list = query({
  args: {
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let limit = args.limit ?? 10;
    if (limit < 1) limit = 1;
    if (limit > 50) limit = 50;

    const results = await ctx.db
      .query("mutationLog")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    return { data: results, count: results.length };
  },
});

// ── undo ──────────────────────────────────────────────

export const undo = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get most recent mutation for this user
    const entries = await ctx.db
      .query("mutationLog")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(1);

    const entry = entries[0];
    if (!entry) {
      throw new Error("No mutations to undo");
    }

    const action = entry.action;
    const tableName = entry.tableName as
      | "tasks"
      | "projects"
      | "goals"
      | "journals"
      | "dayPlans"
      | "weeklyPlans"
      | "ideas"
      | "thoughts"
      | "wins"
      | "resources"
      | "reviews"
      | "reminders"
      | "financeTransactions"
      | "financeCategories"
      | "netWorthSnapshots";

    const isCreate = action === "create" || action.startsWith("create_");
    const isUpdate =
      action === "update" ||
      action.startsWith("update_") ||
      action.startsWith("complete");
    const isDelete = action === "delete" || action.startsWith("delete_");

    if (isCreate) {
      // Undo create: delete the record
      const recordId = entry.recordId;
      // We need to validate the recordId belongs to the correct table.
      // Since recordId is stored as Id<string>, we use the tableName to determine
      // the correct table to query. We use a switch to avoid `as any`.
      switch (tableName) {
        case "tasks": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "tasks" });
          if (record && record.userId === userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "projects": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "projects" });
          if (record && record.userId === userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "goals": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "goals" });
          if (record && record.userId === userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "journals": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "journals" });
          if (record && record.userId === userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "dayPlans": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "dayPlans" });
          if (record && record.userId === userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "weeklyPlans": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "weeklyPlans" });
          if (record && record.userId === userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "ideas": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "ideas" });
          if (record && record.userId === userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "thoughts": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "thoughts" });
          if (record && record.userId === userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "wins": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "wins" });
          if (record && record.userId === userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "resources": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "resources" });
          if (record && record.userId === userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "reviews": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "reviews" });
          if (record && record.userId === userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "reminders": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "reminders" });
          if (record && record.userId === userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "financeTransactions": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "financeTransactions" });
          if (record && record.userId === userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "financeCategories": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "financeCategories" });
          if (record && record.userId === userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "netWorthSnapshots": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "netWorthSnapshots" });
          if (record && record.userId === userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
      }
    } else if (isUpdate) {
      // Undo update: restore beforeData via patch
      if (!entry.beforeData) {
        throw new Error("No before_data available for undo");
      }

      const beforeData = entry.beforeData as Record<string, unknown>;
      const { _id, _creationTime, userId: _userId, ...restoreData } = beforeData;

      // We need to verify ownership and patch the record
      const recordId = entry.recordId;
      switch (tableName) {
        case "tasks": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "tasks" });
          if (record && record.userId === userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "projects": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "projects" });
          if (record && record.userId === userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "goals": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "goals" });
          if (record && record.userId === userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "journals": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "journals" });
          if (record && record.userId === userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "dayPlans": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "dayPlans" });
          if (record && record.userId === userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "weeklyPlans": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "weeklyPlans" });
          if (record && record.userId === userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "ideas": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "ideas" });
          if (record && record.userId === userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "thoughts": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "thoughts" });
          if (record && record.userId === userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "wins": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "wins" });
          if (record && record.userId === userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "resources": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "resources" });
          if (record && record.userId === userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "reviews": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "reviews" });
          if (record && record.userId === userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "reminders": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "reminders" });
          if (record && record.userId === userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "financeTransactions": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "financeTransactions" });
          if (record && record.userId === userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "financeCategories": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "financeCategories" });
          if (record && record.userId === userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "netWorthSnapshots": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "netWorthSnapshots" });
          if (record && record.userId === userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
      }
    } else if (isDelete) {
      // Undo delete: re-insert beforeData
      if (!entry.beforeData) {
        throw new Error("No before_data available for undo");
      }

      const beforeData = entry.beforeData as Record<string, unknown>;
      const { _id, _creationTime, ...insertData } = beforeData;
      // Re-insert into the correct table
      await dynamicInsert(ctx, tableName, insertData);
    } else {
      throw new Error(`Cannot undo action: ${action}`);
    }

    // Delete the log entry
    await ctx.db.delete(entry._id);

    return {
      undone: action,
      table: tableName,
      recordId: String(entry.recordId),
    };
  },
});

// ── Internal functions (for HTTP router) ─────────────

export const _list = internalQuery({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    let limit = args.limit ?? 10;
    if (limit < 1) limit = 1;
    if (limit > 50) limit = 50;

    const results = await ctx.db
      .query("mutationLog")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    return { data: results, count: results.length };
  },
});

export const _undo = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("mutationLog")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(1);

    const entry = entries[0];
    if (!entry) {
      throw new Error("No mutations to undo");
    }

    const action = entry.action;
    const tableName = entry.tableName as
      | "tasks"
      | "projects"
      | "goals"
      | "journals"
      | "dayPlans"
      | "weeklyPlans"
      | "ideas"
      | "thoughts"
      | "wins"
      | "resources"
      | "reviews"
      | "reminders"
      | "financeTransactions"
      | "financeCategories"
      | "netWorthSnapshots";

    const isCreate = action === "create" || action.startsWith("create_");
    const isUpdate =
      action === "update" ||
      action.startsWith("update_") ||
      action.startsWith("complete");
    const isDelete = action === "delete" || action.startsWith("delete_");

    if (isCreate) {
      const recordId = entry.recordId;
      switch (tableName) {
        case "tasks": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "tasks" });
          if (record && record.userId === args.userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "projects": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "projects" });
          if (record && record.userId === args.userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "goals": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "goals" });
          if (record && record.userId === args.userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "journals": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "journals" });
          if (record && record.userId === args.userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "dayPlans": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "dayPlans" });
          if (record && record.userId === args.userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "weeklyPlans": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "weeklyPlans" });
          if (record && record.userId === args.userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "ideas": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "ideas" });
          if (record && record.userId === args.userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "thoughts": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "thoughts" });
          if (record && record.userId === args.userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "wins": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "wins" });
          if (record && record.userId === args.userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "resources": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "resources" });
          if (record && record.userId === args.userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "reviews": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "reviews" });
          if (record && record.userId === args.userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "reminders": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "reminders" });
          if (record && record.userId === args.userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "financeTransactions": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "financeTransactions" });
          if (record && record.userId === args.userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "financeCategories": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "financeCategories" });
          if (record && record.userId === args.userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
        case "netWorthSnapshots": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "netWorthSnapshots" });
          if (record && record.userId === args.userId) {
            await ctx.db.delete(record._id);
          }
          break;
        }
      }
    } else if (isUpdate) {
      if (!entry.beforeData) {
        throw new Error("No before_data available for undo");
      }

      const beforeData = entry.beforeData as Record<string, unknown>;
      const { _id, _creationTime, userId: _userId, ...restoreData } = beforeData;

      const recordId = entry.recordId;
      switch (tableName) {
        case "tasks": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "tasks" });
          if (record && record.userId === args.userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "projects": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "projects" });
          if (record && record.userId === args.userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "goals": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "goals" });
          if (record && record.userId === args.userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "journals": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "journals" });
          if (record && record.userId === args.userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "dayPlans": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "dayPlans" });
          if (record && record.userId === args.userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "weeklyPlans": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "weeklyPlans" });
          if (record && record.userId === args.userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "ideas": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "ideas" });
          if (record && record.userId === args.userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "thoughts": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "thoughts" });
          if (record && record.userId === args.userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "wins": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "wins" });
          if (record && record.userId === args.userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "resources": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "resources" });
          if (record && record.userId === args.userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "reviews": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "reviews" });
          if (record && record.userId === args.userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "reminders": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "reminders" });
          if (record && record.userId === args.userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "financeTransactions": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "financeTransactions" });
          if (record && record.userId === args.userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "financeCategories": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "financeCategories" });
          if (record && record.userId === args.userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
        case "netWorthSnapshots": {
          const record = await ctx.db.get(recordId as typeof recordId & { __tableName: "netWorthSnapshots" });
          if (record && record.userId === args.userId) {
            await ctx.db.patch(record._id, restoreData);
          }
          break;
        }
      }
    } else if (isDelete) {
      if (!entry.beforeData) {
        throw new Error("No before_data available for undo");
      }

      const beforeData = entry.beforeData as Record<string, unknown>;
      const { _id, _creationTime, ...insertData } = beforeData;
      await dynamicInsert(ctx, tableName, insertData);
    } else {
      throw new Error(`Cannot undo action: ${action}`);
    }

    await ctx.db.delete(entry._id);

    return {
      undone: action,
      table: tableName,
      recordId: String(entry.recordId),
    };
  },
});
