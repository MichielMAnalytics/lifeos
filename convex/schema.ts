import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  // ── Users ──────────────────────────────────────────
  users: defineTable({
    email: v.string(),
    password_hash: v.string(),
    name: v.optional(v.string()),
    timezone: v.string(),
  }).index("by_email", ["email"]),

  // ── API Keys ───────────────────────────────────────
  apiKeys: defineTable({
    userId: v.id("users"),
    keyPrefix: v.string(),
    keyHash: v.string(),
    name: v.optional(v.string()),
    lastUsedAt: v.optional(v.float64()),
  }).index("by_userId", ["userId"])
    .index("by_keyPrefix", ["keyPrefix"]),

  // ── Tasks ──────────────────────────────────────────
  tasks: defineTable({
    userId: v.id("users"),
    title: v.string(),
    notes: v.optional(v.string()),
    status: v.string(), // "todo" | "done" | "dropped"
    dueDate: v.optional(v.string()), // "YYYY-MM-DD"
    projectId: v.optional(v.id("projects")),
    goalId: v.optional(v.id("goals")),
    position: v.float64(),
    completedAt: v.optional(v.float64()),
    updatedAt: v.float64(),
  }).index("by_userId_status", ["userId", "status"])
    .index("by_userId_dueDate", ["userId", "dueDate"])
    .index("by_userId", ["userId"]),

  // ── Projects ───────────────────────────────────────
  projects: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(), // "active" | "completed" | "archived"
  }).index("by_userId", ["userId"])
    .index("by_userId_status", ["userId", "status"]),

  // ── Goals ──────────────────────────────────────────
  goals: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(), // "active" | "completed" | "dropped"
    targetDate: v.optional(v.string()),
    quarter: v.optional(v.string()), // "2026-Q1"
    completedAt: v.optional(v.float64()),
  }).index("by_userId", ["userId"])
    .index("by_userId_status", ["userId", "status"]),

  // ── Journals ───────────────────────────────────────
  journals: defineTable({
    userId: v.id("users"),
    entryDate: v.string(), // "YYYY-MM-DD"
    mit: v.optional(v.string()),
    p1: v.optional(v.string()),
    p2: v.optional(v.string()),
    notes: v.optional(v.string()),
    wins: v.array(v.string()),
    updatedAt: v.float64(),
  }).index("by_userId_entryDate", ["userId", "entryDate"]),

  // ── Day Plans ──────────────────────────────────────
  dayPlans: defineTable({
    userId: v.id("users"),
    planDate: v.string(), // "YYYY-MM-DD"
    wakeTime: v.optional(v.string()), // "07:00"
    schedule: v.array(v.object({
      start: v.string(),
      end: v.string(),
      label: v.string(),
      type: v.string(),
      taskId: v.optional(v.string()),
    })),
    overflow: v.array(v.string()),
    mitTaskId: v.optional(v.id("tasks")),
    p1TaskId: v.optional(v.id("tasks")),
    p2TaskId: v.optional(v.id("tasks")),
    mitDone: v.boolean(),
    p1Done: v.boolean(),
    p2Done: v.boolean(),
  }).index("by_userId_planDate", ["userId", "planDate"]),

  // ── Weekly Plans ───────────────────────────────────
  weeklyPlans: defineTable({
    userId: v.id("users"),
    weekStart: v.string(), // "YYYY-MM-DD" (Monday)
    theme: v.optional(v.string()),
    goals: v.array(v.object({
      title: v.string(),
      status: v.optional(v.string()),
      goalId: v.optional(v.string()),
    })),
    reviewScore: v.optional(v.float64()),
  }).index("by_userId_weekStart", ["userId", "weekStart"]),

  // ── Ideas ──────────────────────────────────────────
  ideas: defineTable({
    userId: v.id("users"),
    content: v.string(),
    actionability: v.optional(v.string()), // "high" | "medium" | "low"
    nextStep: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
  }).index("by_userId", ["userId"]),

  // ── Thoughts ───────────────────────────────────────
  thoughts: defineTable({
    userId: v.id("users"),
    content: v.string(),
    title: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  // ── Wins ───────────────────────────────────────────
  wins: defineTable({
    userId: v.id("users"),
    content: v.string(),
    entryDate: v.string(), // "YYYY-MM-DD"
  }).index("by_userId", ["userId"])
    .index("by_userId_entryDate", ["userId", "entryDate"]),

  // ── Resources ──────────────────────────────────────
  resources: defineTable({
    userId: v.id("users"),
    title: v.string(),
    url: v.optional(v.string()),
    content: v.optional(v.string()),
    type: v.optional(v.string()), // "article" | "tool" | "book" | "video" | "other"
  }).index("by_userId", ["userId"]),

  // ── Reviews ────────────────────────────────────────
  reviews: defineTable({
    userId: v.id("users"),
    reviewType: v.string(), // "daily" | "weekly" | "monthly" | "quarterly"
    periodStart: v.string(),
    periodEnd: v.string(),
    content: v.any(),
    score: v.optional(v.float64()),
  }).index("by_userId", ["userId"]),

  // ── Reminders ──────────────────────────────────────
  reminders: defineTable({
    userId: v.id("users"),
    title: v.string(),
    body: v.optional(v.string()),
    scheduledAt: v.float64(), // epoch ms
    status: v.string(), // "pending" | "delivered" | "snoozed" | "done"
    snoozeCount: v.float64(),
  }).index("by_userId", ["userId"])
    .index("by_userId_status", ["userId", "status"]),

  // ── Finance Categories ─────────────────────────────
  financeCategories: defineTable({
    userId: v.id("users"),
    name: v.string(),
    parentId: v.optional(v.id("financeCategories")),
  }).index("by_userId", ["userId"]),

  // ── Finance Transactions ───────────────────────────
  financeTransactions: defineTable({
    userId: v.id("users"),
    date: v.string(), // "YYYY-MM-DD"
    amount: v.float64(), // stored as cents for precision
    currency: v.string(),
    categoryId: v.optional(v.id("financeCategories")),
    merchant: v.optional(v.string()),
    notes: v.optional(v.string()),
    source: v.optional(v.string()),
    externalId: v.optional(v.string()),
  }).index("by_userId", ["userId"])
    .index("by_userId_date", ["userId", "date"]),

  // ── Net Worth Snapshots ────────────────────────────
  netWorthSnapshots: defineTable({
    userId: v.id("users"),
    date: v.string(),
    breakdown: v.any(), // { crypto: number, stocks: number, ... }
    total: v.float64(),
    notes: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  // ── Mutation Log ───────────────────────────────────
  mutationLog: defineTable({
    userId: v.id("users"),
    action: v.string(),
    tableName: v.string(),
    recordId: v.string(), // stringified Convex ID
    beforeData: v.optional(v.any()),
    afterData: v.optional(v.any()),
  }).index("by_userId", ["userId"]),
});
