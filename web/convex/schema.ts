import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  // ── Users (extends authTables.users with our custom fields) ──
  users: defineTable({
    // Convex Auth fields
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.float64()),
    image: v.optional(v.string()),
    name: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    // LifeOS custom fields
    timezone: v.optional(v.string()),
  }).index("email", ["email"]),

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

  // ── Identity (one per user) ────────────────────────
  identity: defineTable({
    userId: v.id("users"),
    statement: v.string(),     // "I am a builder who ships fast..."
    updatedAt: v.float64(),
  }).index("by_userId", ["userId"]),

  // ── Vision Board ─────────────────────────────────
  visionBoard: defineTable({
    userId: v.id("users"),
    imageUrl: v.string(),      // URL or Convex storage ID
    caption: v.optional(v.string()),
    position: v.float64(),     // for ordering
  }).index("by_userId", ["userId"]),

  // ── Journals ───────────────────────────────────────
  journals: defineTable({
    userId: v.id("users"),
    entryDate: v.string(), // "YYYY-MM-DD"
    mit: v.optional(v.string()),
    p1: v.optional(v.string()),
    p2: v.optional(v.string()),
    notes: v.optional(v.string()),
    wins: v.array(v.string()),
    // Phase 2 — Section 7I additions
    summary: v.optional(v.string()),         // one-line "headline" of the day
    mood: v.optional(v.float64()),            // 1-5 (Daylio scale)
    gratitudes: v.optional(v.array(v.string())),
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
    // Phase 2 — Section 12B+ addition: mark as reviewed
    reviewedAt: v.optional(v.float64()),
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
    tags: v.optional(v.array(v.string())),
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

  // ── Workouts ────────────────────────────────────────
  workouts: defineTable({
    userId: v.id("users"),
    workoutDate: v.string(), // "YYYY-MM-DD"
    type: v.string(), // "strength" | "cardio" | "mobility" | "sport" | "other"
    title: v.string(),
    durationMinutes: v.optional(v.float64()),
    exercises: v.optional(v.array(v.object({
      name: v.string(),
      sets: v.optional(v.float64()),
      reps: v.optional(v.float64()),
      weight: v.optional(v.float64()),
      unit: v.optional(v.string()), // "kg" | "lbs"
    }))),
    notes: v.optional(v.string()),
    programmeId: v.optional(v.id("programmes")),
    updatedAt: v.float64(),
  }).index("by_userId", ["userId"])
    .index("by_userId_workoutDate", ["userId", "workoutDate"]),

  // ── Programmes ─────────────────────────────────────
  programmes: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(), // "active" | "completed" | "archived"
    startDate: v.string(), // "YYYY-MM-DD"
    endDate: v.optional(v.string()), // "YYYY-MM-DD"
    notes: v.optional(v.string()),
    updatedAt: v.float64(),
  }).index("by_userId", ["userId"])
    .index("by_userId_status", ["userId", "status"]),

  // ── Food Log ────────────────────────────────────────
  foodLog: defineTable({
    userId: v.id("users"),
    entryDate: v.string(), // "YYYY-MM-DD"
    name: v.string(), // "Chicken breast", "Oatmeal", etc.
    mealType: v.optional(v.string()), // "breakfast" | "lunch" | "dinner" | "snack"
    calories: v.optional(v.float64()),
    protein: v.optional(v.float64()), // grams
    carbs: v.optional(v.float64()), // grams
    fat: v.optional(v.float64()), // grams
    quantity: v.optional(v.string()), // "200g", "1 cup", etc.
    updatedAt: v.float64(),
  }).index("by_userId", ["userId"])
    .index("by_userId_entryDate", ["userId", "entryDate"]),

  // ── Macro Goals ────────────────────────────────────
  macroGoals: defineTable({
    userId: v.id("users"),
    calories: v.float64(),
    protein: v.float64(), // grams
    carbs: v.float64(), // grams
    fat: v.float64(), // grams
    updatedAt: v.float64(),
  }).index("by_userId", ["userId"]),

  // ── Dashboard Config ───────────────────────────────
  dashboardConfig: defineTable({
    userId: v.id("users"),
    navMode: v.string(),           // "sidebar" | "header"
    navOrder: v.array(v.string()),
    navHidden: v.array(v.string()),
    pagePresets: v.any(),          // { today: "solopreneur", ideas: "content-creator", ... }
    customTheme: v.optional(v.any()), // custom color overrides
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

  // ═══════════════════════════════════════════════════════
  // Hosted deployment tables (ported from ClawNow)
  // ═══════════════════════════════════════════════════════

  // ── Balances ─────────────────────────────────────────
  balances: defineTable({
    userId: v.id("users"),
    amount: v.number(), // cents
  }).index("by_userId", ["userId"]),

  // ── Subscriptions ────────────────────────────────────
  subscriptions: defineTable({
    userId: v.id("users"),
    stripeSubscriptionId: v.string(),
    stripePriceId: v.string(),
    planType: v.union(
      v.literal("dashboard"),
      v.literal("byok"),
      v.literal("basic"),
      v.literal("standard"),
      v.literal("premium"),
    ),
    status: v.union(
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("unpaid"),
    ),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    includedCreditsCents: v.number(),
    createdAt: v.number(),
    lastUpdatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_stripeSubscriptionId", ["stripeSubscriptionId"]),

  // ── Deployment Settings (ClawNow's "userSettings") ───
  deploymentSettings: defineTable({
    userId: v.id("users"),
    apiKeySource: v.union(v.literal("ours"), v.literal("byok")),
    anthropicAuthMethod: v.optional(
      v.union(v.literal("api_key"), v.literal("setup_token")),
    ),
    anthropicKeyLength: v.optional(v.number()),
    openaiAuthMethod: v.optional(
      v.union(v.literal("api_key"), v.literal("chatgpt_oauth")),
    ),
    openaiKeyLength: v.optional(v.number()),
    googleKeyLength: v.optional(v.number()),
    moonshotKeyLength: v.optional(v.number()),
    minimaxKeyLength: v.optional(v.number()),
    telegramBotTokenLength: v.optional(v.number()),
    discordBotTokenLength: v.optional(v.number()),
    selectedModel: v.optional(v.string()),
    pendingDeploy: v.optional(v.boolean()),
    customEnvKeys: v.optional(v.array(v.object({ name: v.string(), valueLength: v.number() }))),
  }).index("by_userId", ["userId"]),

  // ── Deployments ──────────────────────────────────────
  deployments: defineTable({
    userId: v.id("users"),
    subdomain: v.string(),
    gatewayToken: v.string(),
    podSecret: v.string(),
    callbackJwt: v.string(),
    status: v.union(
      v.literal("provisioning"),
      v.literal("starting"),
      v.literal("running"),
      v.literal("error"),
      v.literal("deactivating"),
      v.literal("deactivated"),
      v.literal("suspended"),
    ),
    configHash: v.string(),
    targetImageTag: v.string(),
    podIp: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    deactivatedAt: v.optional(v.number()),
    pvcRetainUntil: v.optional(v.number()),
    createdAt: v.number(),
    lastUpdatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_subdomain", ["subdomain"])
    .index("by_podSecret", ["podSecret"])
    .index("by_status", ["status"]),

  // ── Coupons ──────────────────────────────────────────
  coupons: defineTable({
    code: v.string(),
    creditAmountCents: v.number(),
    maxUses: v.number(),
    currentUses: v.number(),
    expiresAt: v.optional(v.number()),
    description: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_code", ["code"]),

  // ── Coupon Redemptions ───────────────────────────────
  couponRedemptions: defineTable({
    couponId: v.id("coupons"),
    userId: v.id("users"),
    creditAmountCents: v.number(),
    redeemedAt: v.number(),
  })
    .index("by_couponId_userId", ["couponId", "userId"])
    .index("by_userId", ["userId"]),
});
