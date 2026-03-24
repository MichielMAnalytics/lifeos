import { query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const LIMIT = 20;

function matches(text: string | undefined | null, query: string): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(query);
}

const validTypes = ["tasks", "goals", "ideas", "thoughts", "journal", "resources"] as const;
type SearchType = (typeof validTypes)[number];

function parseTypes(types: string | undefined): SearchType[] {
  if (types) {
    const parsed = types
      .split(",")
      .map((t) => t.trim())
      .filter((t): t is SearchType => (validTypes as readonly string[]).includes(t));

    if (parsed.length === 0) {
      throw new Error("No valid types specified");
    }
    return parsed;
  }
  return [...validTypes];
}

export const search = query({
  args: {
    q: v.string(),
    types: v.optional(v.string()), // comma-separated: "tasks,goals,ideas,journal,resources"
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const q = args.q.trim().toLowerCase();
    if (q.length === 0) {
      throw new Error("Query parameter q is required");
    }

    const typesToSearch = parseTypes(args.types);

    const results: Record<string, unknown[]> = {};

    if (typesToSearch.includes("tasks")) {
      const allTasks = await ctx.db
        .query("tasks")
        .withIndex("by_userId", (qb) => qb.eq("userId", userId))
        .collect();

      results.tasks = allTasks
        .filter((t) => matches(t.title, q) || matches(t.notes, q))
        .slice(0, LIMIT);
    }

    if (typesToSearch.includes("goals")) {
      const allGoals = await ctx.db
        .query("goals")
        .withIndex("by_userId", (qb) => qb.eq("userId", userId))
        .collect();

      results.goals = allGoals
        .filter((g) => matches(g.title, q) || matches(g.description, q))
        .slice(0, LIMIT);
    }

    if (typesToSearch.includes("ideas")) {
      const allIdeas = await ctx.db
        .query("ideas")
        .withIndex("by_userId", (qb) => qb.eq("userId", userId))
        .collect();

      results.ideas = allIdeas
        .filter((i) => matches(i.content, q))
        .slice(0, LIMIT);
    }

    if (typesToSearch.includes("thoughts")) {
      const allThoughts = await ctx.db
        .query("thoughts")
        .withIndex("by_userId", (qb) => qb.eq("userId", userId))
        .collect();

      results.thoughts = allThoughts
        .filter((t) => matches(t.content, q) || matches(t.title, q))
        .slice(0, LIMIT);
    }

    if (typesToSearch.includes("journal")) {
      const allJournals = await ctx.db
        .query("journals")
        .withIndex("by_userId_entryDate", (qb) => qb.eq("userId", userId))
        .collect();

      results.journal = allJournals
        .filter(
          (j) =>
            matches(j.mit, q) ||
            matches(j.p1, q) ||
            matches(j.p2, q) ||
            matches(j.notes, q),
        )
        .slice(0, LIMIT);
    }

    if (typesToSearch.includes("resources")) {
      const allResources = await ctx.db
        .query("resources")
        .withIndex("by_userId", (qb) => qb.eq("userId", userId))
        .collect();

      results.resources = allResources
        .filter((r) => matches(r.title, q) || matches(r.content, q))
        .slice(0, LIMIT);
    }

    return results;
  },
});

// ── Internal functions (for HTTP router) ─────────────

export const _search = internalQuery({
  args: {
    userId: v.id("users"),
    q: v.string(),
    types: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const q = args.q.trim().toLowerCase();
    if (q.length === 0) {
      throw new Error("Query parameter q is required");
    }

    const typesToSearch = parseTypes(args.types);

    const results: Record<string, unknown[]> = {};

    if (typesToSearch.includes("tasks")) {
      const allTasks = await ctx.db
        .query("tasks")
        .withIndex("by_userId", (qb) => qb.eq("userId", args.userId))
        .collect();

      results.tasks = allTasks
        .filter((t) => matches(t.title, q) || matches(t.notes, q))
        .slice(0, LIMIT);
    }

    if (typesToSearch.includes("goals")) {
      const allGoals = await ctx.db
        .query("goals")
        .withIndex("by_userId", (qb) => qb.eq("userId", args.userId))
        .collect();

      results.goals = allGoals
        .filter((g) => matches(g.title, q) || matches(g.description, q))
        .slice(0, LIMIT);
    }

    if (typesToSearch.includes("ideas")) {
      const allIdeas = await ctx.db
        .query("ideas")
        .withIndex("by_userId", (qb) => qb.eq("userId", args.userId))
        .collect();

      results.ideas = allIdeas
        .filter((i) => matches(i.content, q))
        .slice(0, LIMIT);
    }

    if (typesToSearch.includes("thoughts")) {
      const allThoughts = await ctx.db
        .query("thoughts")
        .withIndex("by_userId", (qb) => qb.eq("userId", args.userId))
        .collect();

      results.thoughts = allThoughts
        .filter((t) => matches(t.content, q) || matches(t.title, q))
        .slice(0, LIMIT);
    }

    if (typesToSearch.includes("journal")) {
      const allJournals = await ctx.db
        .query("journals")
        .withIndex("by_userId_entryDate", (qb) => qb.eq("userId", args.userId))
        .collect();

      results.journal = allJournals
        .filter(
          (j) =>
            matches(j.mit, q) ||
            matches(j.p1, q) ||
            matches(j.p2, q) ||
            matches(j.notes, q),
        )
        .slice(0, LIMIT);
    }

    if (typesToSearch.includes("resources")) {
      const allResources = await ctx.db
        .query("resources")
        .withIndex("by_userId", (qb) => qb.eq("userId", args.userId))
        .collect();

      results.resources = allResources
        .filter((r) => matches(r.title, q) || matches(r.content, q))
        .slice(0, LIMIT);
    }

    return { data: results };
  },
});
