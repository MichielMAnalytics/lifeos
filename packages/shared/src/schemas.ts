import { z } from 'zod';

// ── Tasks ──────────────────────────────────────────────

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  notes: z.string().optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  project_id: z.string().uuid().optional(),
  goal_id: z.string().uuid().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  notes: z.string().optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: z.enum(['todo', 'done', 'dropped']).optional(),
  project_id: z.string().uuid().nullable().optional(),
  goal_id: z.string().uuid().nullable().optional(),
  position: z.number().int().optional(),
});

export const bulkCompleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

// ── Projects ───────────────────────────────────────────

export const createProjectSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
});

export const updateProjectSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
});

// ── Goals ──────────────────────────────────────────────

export const createGoalSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  quarter: z.string().regex(/^\d{4}-Q[1-4]$/).optional(),
});

export const updateGoalSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'completed', 'dropped']).optional(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  quarter: z.string().regex(/^\d{4}-Q[1-4]$/).nullable().optional(),
});

// ── Journal ────────────────────────────────────────────

export const upsertJournalSchema = z.object({
  mit: z.string().optional(),
  p1: z.string().optional(),
  p2: z.string().optional(),
  notes: z.string().optional(),
  wins: z.array(z.string()).optional(),
});

// ── Day Plans ──────────────────────────────────────────

export const scheduleBlockSchema = z.object({
  start: z.string(), // "07:00"
  end: z.string(),   // "08:30"
  label: z.string(),
  type: z.enum(['wake', 'mit', 'p1', 'p2', 'task', 'event', 'break', 'lunch', 'other']),
  task_id: z.string().uuid().optional(),
});

export const upsertDayPlanSchema = z.object({
  wake_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  schedule: z.array(scheduleBlockSchema).optional(),
  overflow: z.array(z.string().uuid()).optional(),
  mit_task_id: z.string().uuid().nullable().optional(),
  p1_task_id: z.string().uuid().nullable().optional(),
  p2_task_id: z.string().uuid().nullable().optional(),
  mit_done: z.boolean().optional(),
  p1_done: z.boolean().optional(),
  p2_done: z.boolean().optional(),
});

// ── Weekly Plans ───────────────────────────────────────

export const weeklyGoalSchema = z.object({
  title: z.string(),
  status: z.enum(['not_started', 'in_progress', 'done', 'dropped']).optional(),
  goal_id: z.string().uuid().optional(),
});

export const upsertWeeklyPlanSchema = z.object({
  theme: z.string().max(255).optional(),
  goals: z.array(weeklyGoalSchema).optional(),
  review_score: z.number().int().min(1).max(10).optional(),
});

// ── Ideas ──────────────────────────────────────────────

export const createIdeaSchema = z.object({
  content: z.string().min(1),
  actionability: z.enum(['high', 'medium', 'low']).optional(),
  next_step: z.string().optional(),
});

export const updateIdeaSchema = z.object({
  content: z.string().min(1).optional(),
  actionability: z.enum(['high', 'medium', 'low']).optional(),
  next_step: z.string().nullable().optional(),
});

export const promoteIdeaSchema = z.object({
  project_title: z.string().min(1).max(255),
});

// ── Thoughts ───────────────────────────────────────────

export const createThoughtSchema = z.object({
  content: z.string().min(1),
  title: z.string().max(255).optional(),
});

// ── Wins ───────────────────────────────────────────────

export const createWinSchema = z.object({
  content: z.string().min(1),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// ── Resources ──────────────────────────────────────────

export const createResourceSchema = z.object({
  title: z.string().min(1).max(255),
  url: z.string().optional(),
  content: z.string().optional(),
  type: z.enum(['article', 'tool', 'book', 'video', 'other']).optional(),
});

export const updateResourceSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  url: z.string().optional(),
  content: z.string().optional(),
  type: z.enum(['article', 'tool', 'book', 'video', 'other']).optional(),
});

// ── Reviews ────────────────────────────────────────────

export const createReviewSchema = z.object({
  review_type: z.enum(['daily', 'weekly', 'monthly', 'quarterly']),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  content: z.record(z.unknown()),
  score: z.number().int().min(1).max(10).optional(),
});

// ── Reminders ──────────────────────────────────────────

export const createReminderSchema = z.object({
  title: z.string().min(1).max(255),
  body: z.string().optional(),
  scheduled_at: z.string().datetime(),
});

export const updateReminderSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  body: z.string().optional(),
  scheduled_at: z.string().datetime().optional(),
  status: z.enum(['pending', 'delivered', 'snoozed', 'done']).optional(),
});

export const snoozeReminderSchema = z.object({
  minutes: z.number().int().min(1).max(10080).default(60),
});

// ── Finance ────────────────────────────────────────────

export const createTransactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number(),
  currency: z.string().length(3).default('USD'),
  category_id: z.string().uuid().optional(),
  merchant: z.string().max(255).optional(),
  notes: z.string().optional(),
  source: z.string().max(50).optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  parent_id: z.string().uuid().optional(),
});

export const createNetWorthSnapshotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  breakdown: z.record(z.number()),
  total: z.number(),
  notes: z.string().optional(),
});

// ── Auth ───────────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().max(255).optional(),
  timezone: z.string().max(50).default('UTC'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
});

// ── Search ─────────────────────────────────────────────

export const searchSchema = z.object({
  q: z.string().min(1).max(500),
  type: z.string().optional(), // comma-separated: "tasks,goals,ideas"
});
