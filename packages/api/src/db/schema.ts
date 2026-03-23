import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  boolean,
  integer,
  jsonb,
  numeric,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ── Users ──────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  timezone: varchar('timezone', { length: 50 }).default('UTC').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── API Keys ───────────────────────────────────────────

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  key_prefix: varchar('key_prefix', { length: 12 }).notNull(),
  key_hash: varchar('key_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }),
  last_used_at: timestamp('last_used_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Tasks ──────────────────────────────────────────────

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  notes: text('notes'),
  status: varchar('status', { length: 20 }).default('todo').notNull(),
  due_date: date('due_date'),
  project_id: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  goal_id: uuid('goal_id').references(() => goals.id, { onDelete: 'set null' }),
  position: integer('position').default(0).notNull(),
  completed_at: timestamp('completed_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('tasks_user_status_idx').on(t.user_id, t.status),
  index('tasks_user_due_idx').on(t.user_id, t.due_date),
]);

// ── Projects ───────────────────────────────────────────

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Goals ──────────────────────────────────────────────

export const goals = pgTable('goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  target_date: date('target_date'),
  quarter: varchar('quarter', { length: 10 }),
  completed_at: timestamp('completed_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Journals ───────────────────────────────────────────

export const journals = pgTable('journals', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  entry_date: date('entry_date').notNull(),
  mit: text('mit'),
  p1: text('p1'),
  p2: text('p2'),
  notes: text('notes'),
  wins: jsonb('wins').default(sql`'[]'::jsonb`).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('journals_user_date_idx').on(t.user_id, t.entry_date),
]);

// ── Day Plans ──────────────────────────────────────────

export const dayPlans = pgTable('day_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  plan_date: date('plan_date').notNull(),
  wake_time: varchar('wake_time', { length: 5 }),
  schedule: jsonb('schedule').default(sql`'[]'::jsonb`).notNull(),
  overflow: jsonb('overflow').default(sql`'[]'::jsonb`).notNull(),
  mit_task_id: uuid('mit_task_id').references(() => tasks.id, { onDelete: 'set null' }),
  p1_task_id: uuid('p1_task_id').references(() => tasks.id, { onDelete: 'set null' }),
  p2_task_id: uuid('p2_task_id').references(() => tasks.id, { onDelete: 'set null' }),
  mit_done: boolean('mit_done').default(false).notNull(),
  p1_done: boolean('p1_done').default(false).notNull(),
  p2_done: boolean('p2_done').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('day_plans_user_date_idx').on(t.user_id, t.plan_date),
]);

// ── Weekly Plans ───────────────────────────────────────

export const weeklyPlans = pgTable('weekly_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  week_start: date('week_start').notNull(),
  theme: varchar('theme', { length: 255 }),
  goals: jsonb('goals').default(sql`'[]'::jsonb`).notNull(),
  review_score: integer('review_score'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('weekly_plans_user_week_idx').on(t.user_id, t.week_start),
]);

// ── Ideas ──────────────────────────────────────────────

export const ideas = pgTable('ideas', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  actionability: varchar('actionability', { length: 20 }),
  next_step: text('next_step'),
  project_id: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Thoughts ───────────────────────────────────────────

export const thoughts = pgTable('thoughts', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  title: varchar('title', { length: 255 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Wins ───────────────────────────────────────────────

export const wins = pgTable('wins', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  entry_date: date('entry_date').default(sql`CURRENT_DATE`).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Resources ──────────────────────────────────────────

export const resources = pgTable('resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  url: text('url'),
  content: text('content'),
  type: varchar('type', { length: 50 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Reviews ────────────────────────────────────────────

export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  review_type: varchar('review_type', { length: 20 }).notNull(),
  period_start: date('period_start').notNull(),
  period_end: date('period_end').notNull(),
  content: jsonb('content').notNull(),
  score: integer('score'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Reminders ──────────────────────────────────────────

export const reminders = pgTable('reminders', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body'),
  scheduled_at: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  snooze_count: integer('snooze_count').default(0).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Finance Categories ─────────────────────────────────

export const financeCategories = pgTable('finance_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  parent_id: uuid('parent_id'),
});

// ── Finance Transactions ───────────────────────────────

export const financeTransactions = pgTable('finance_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  category_id: uuid('category_id').references(() => financeCategories.id, { onDelete: 'set null' }),
  merchant: varchar('merchant', { length: 255 }),
  notes: text('notes'),
  source: varchar('source', { length: 50 }),
  external_id: varchar('external_id', { length: 255 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('fin_tx_user_date_idx').on(t.user_id, t.date),
]);

// ── Net Worth Snapshots ────────────────────────────────

export const netWorthSnapshots = pgTable('net_worth_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  breakdown: jsonb('breakdown').notNull(),
  total: numeric('total', { precision: 14, scale: 2 }).notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Mutation Log ───────────────────────────────────────

export const mutationLog = pgTable('mutation_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 50 }).notNull(),
  table_name: varchar('table_name', { length: 50 }).notNull(),
  record_id: uuid('record_id').notNull(),
  before_data: jsonb('before_data'),
  after_data: jsonb('after_data'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('mutation_log_user_created_idx').on(t.user_id, t.created_at),
]);
