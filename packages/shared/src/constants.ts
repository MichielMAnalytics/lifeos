export const TaskStatus = {
  TODO: 'todo',
  DONE: 'done',
  DROPPED: 'dropped',
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const ProjectStatus = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const GoalStatus = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  DROPPED: 'dropped',
} as const;
export type GoalStatus = (typeof GoalStatus)[keyof typeof GoalStatus];

export const GoalHealth = {
  ON_TRACK: 'on_track',
  AT_RISK: 'at_risk',
  OFF_TRACK: 'off_track',
  UNKNOWN: 'unknown',
} as const;
export type GoalHealth = (typeof GoalHealth)[keyof typeof GoalHealth];

export const ReviewType = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
} as const;
export type ReviewType = (typeof ReviewType)[keyof typeof ReviewType];

export const ReminderStatus = {
  PENDING: 'pending',
  DELIVERED: 'delivered',
  SNOOZED: 'snoozed',
  DONE: 'done',
} as const;
export type ReminderStatus = (typeof ReminderStatus)[keyof typeof ReminderStatus];

export const ResourceType = {
  ARTICLE: 'article',
  TOOL: 'tool',
  BOOK: 'book',
  VIDEO: 'video',
  OTHER: 'other',
} as const;
export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];

export const IdeaActionability = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;
export type IdeaActionability = (typeof IdeaActionability)[keyof typeof IdeaActionability];

export const DueFilter = {
  TODAY: 'today',
  TOMORROW: 'tomorrow',
  WEEK: 'week',
  OVERDUE: 'overdue',
  ALL: 'all',
} as const;
export type DueFilter = (typeof DueFilter)[keyof typeof DueFilter];

export const API_KEY_PREFIX = 'lifeos_sk_';
