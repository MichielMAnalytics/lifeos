import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

// ── Prefix-based ID resolution ──────────────────────────
// The CLI displays truncated 8-char IDs. These resolvers
// match a prefix back to the full Convex document ID,
// scoped to the authenticated user for data isolation.

export const resolveTask = internalQuery({
  args: { userId: v.id("users"), prefix: v.string() },
  handler: async (ctx, { userId, prefix }) => {
    const docs = await ctx.db
      .query("tasks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(500);
    const match = docs.find((d) => (d._id as string).startsWith(prefix));
    return match?._id ?? null;
  },
});

export const resolveGoal = internalQuery({
  args: { userId: v.id("users"), prefix: v.string() },
  handler: async (ctx, { userId, prefix }) => {
    const docs = await ctx.db
      .query("goals")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(500);
    const match = docs.find((d) => (d._id as string).startsWith(prefix));
    return match?._id ?? null;
  },
});

export const resolveProject = internalQuery({
  args: { userId: v.id("users"), prefix: v.string() },
  handler: async (ctx, { userId, prefix }) => {
    const docs = await ctx.db
      .query("projects")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(500);
    const match = docs.find((d) => (d._id as string).startsWith(prefix));
    return match?._id ?? null;
  },
});

export const resolveReminder = internalQuery({
  args: { userId: v.id("users"), prefix: v.string() },
  handler: async (ctx, { userId, prefix }) => {
    const docs = await ctx.db
      .query("reminders")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(500);
    const match = docs.find((d) => (d._id as string).startsWith(prefix));
    return match?._id ?? null;
  },
});

export const resolveReview = internalQuery({
  args: { userId: v.id("users"), prefix: v.string() },
  handler: async (ctx, { userId, prefix }) => {
    const docs = await ctx.db
      .query("reviews")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(500);
    const match = docs.find((d) => (d._id as string).startsWith(prefix));
    return match?._id ?? null;
  },
});

export const resolveResource = internalQuery({
  args: { userId: v.id("users"), prefix: v.string() },
  handler: async (ctx, { userId, prefix }) => {
    const docs = await ctx.db
      .query("resources")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(500);
    const match = docs.find((d) => (d._id as string).startsWith(prefix));
    return match?._id ?? null;
  },
});

export const resolveIdea = internalQuery({
  args: { userId: v.id("users"), prefix: v.string() },
  handler: async (ctx, { userId, prefix }) => {
    const docs = await ctx.db
      .query("ideas")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(500);
    const match = docs.find((d) => (d._id as string).startsWith(prefix));
    return match?._id ?? null;
  },
});

export const resolveThought = internalQuery({
  args: { userId: v.id("users"), prefix: v.string() },
  handler: async (ctx, { userId, prefix }) => {
    const docs = await ctx.db
      .query("thoughts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(500);
    const match = docs.find((d) => (d._id as string).startsWith(prefix));
    return match?._id ?? null;
  },
});

export const resolveWin = internalQuery({
  args: { userId: v.id("users"), prefix: v.string() },
  handler: async (ctx, { userId, prefix }) => {
    const docs = await ctx.db
      .query("wins")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(500);
    const match = docs.find((d) => (d._id as string).startsWith(prefix));
    return match?._id ?? null;
  },
});

export const resolveApiKey = internalQuery({
  args: { userId: v.id("users"), prefix: v.string() },
  handler: async (ctx, { userId, prefix }) => {
    const docs = await ctx.db
      .query("apiKeys")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(500);
    const match = docs.find((d) => (d._id as string).startsWith(prefix));
    return match?._id ?? null;
  },
});

export const resolveFoodLog = internalQuery({
  args: { userId: v.id("users"), prefix: v.string() },
  handler: async (ctx, { userId, prefix }) => {
    const docs = await ctx.db
      .query("foodLog")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(500);
    const match = docs.find((d) => (d._id as string).startsWith(prefix));
    return match?._id ?? null;
  },
});

export const resolveWorkout = internalQuery({
  args: { userId: v.id("users"), prefix: v.string() },
  handler: async (ctx, { userId, prefix }) => {
    const docs = await ctx.db
      .query("workouts")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(500);
    const match = docs.find((d) => (d._id as string).startsWith(prefix));
    return match?._id ?? null;
  },
});

export const resolveProgramme = internalQuery({
  args: { userId: v.id("users"), prefix: v.string() },
  handler: async (ctx, { userId, prefix }) => {
    const docs = await ctx.db
      .query("programmes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(500);
    const match = docs.find((d) => (d._id as string).startsWith(prefix));
    return match?._id ?? null;
  },
});

export const resolveVisionBoard = internalQuery({
  args: { userId: v.id("users"), prefix: v.string() },
  handler: async (ctx, { userId, prefix }) => {
    const docs = await ctx.db
      .query("visionBoard")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(500);
    const match = docs.find((d) => (d._id as string).startsWith(prefix));
    return match?._id ?? null;
  },
});
