// ── Core entity types returned by the API ──

export interface User {
  id: string;
  email: string;
  name: string | null;
  timezone: string;
  created_at: string;
}

export interface ApiKey {
  id: string;
  name: string | null;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  notes: string | null;
  status: string;
  due_date: string | null;
  project_id: string | null;
  goal_id: string | null;
  position: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  status: string;
  target_date: string | null;
  quarter: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface GoalHealthInfo {
  status: string;
  score: number;
  tasks_total: number;
  tasks_done: number;
  velocity: number;
}

export interface Journal {
  id: string;
  entry_date: string;
  mit: string | null;
  p1: string | null;
  p2: string | null;
  notes: string | null;
  wins: string[];
  created_at: string;
  updated_at: string;
}

export interface ScheduleBlock {
  start: string;
  end: string;
  label: string;
  type: string;
  task_id?: string;
}

export interface DayPlan {
  id: string;
  plan_date: string;
  wake_time: string | null;
  schedule: ScheduleBlock[];
  overflow: string[];
  mit_task_id: string | null;
  p1_task_id: string | null;
  p2_task_id: string | null;
  mit_done: boolean;
  p1_done: boolean;
  p2_done: boolean;
  created_at: string;
}

export interface WeeklyGoal {
  title: string;
  status?: string;
  goal_id?: string;
}

export interface WeeklyPlan {
  id: string;
  week_start: string;
  theme: string | null;
  goals: WeeklyGoal[];
  review_score: number | null;
  created_at: string;
}

export interface Idea {
  id: string;
  content: string;
  actionability: string | null;
  next_step: string | null;
  project_id: string | null;
  created_at: string;
}

export interface Thought {
  id: string;
  content: string;
  title: string | null;
  created_at: string;
}

export interface Win {
  id: string;
  content: string;
  entry_date: string;
  created_at: string;
}

export interface Resource {
  id: string;
  title: string;
  url: string | null;
  content: string | null;
  type: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  review_type: string;
  period_start: string;
  period_end: string;
  content: Record<string, unknown>;
  score: number | null;
  created_at: string;
}

export interface Reminder {
  id: string;
  title: string;
  body: string | null;
  scheduled_at: string;
  status: string;
  snooze_count: number;
  created_at: string;
}

export interface FinanceCategory {
  id: string;
  name: string;
  parent_id: string | null;
}

export interface FinanceTransaction {
  id: string;
  date: string;
  amount: number;
  currency: string;
  category_id: string | null;
  merchant: string | null;
  notes: string | null;
  source: string | null;
  created_at: string;
}

export interface NetWorthSnapshot {
  id: string;
  date: string;
  breakdown: Record<string, number>;
  total: number;
  notes: string | null;
  created_at: string;
}

export interface MutationLogEntry {
  id: string;
  action: string;
  table_name: string;
  record_id: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
}

// ── API Response Wrappers ──

export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
  count: number;
}

export interface ApiErrorResponse {
  error: string;
  details?: unknown;
}

// ── Trigger Responses ──

export interface MorningBriefing {
  overdue_tasks: Task[];
  today_tasks: Task[];
  plan: DayPlan | null;
  goals_at_risk: Goal[];
}

export interface DailyReviewPrompt {
  plan: DayPlan | null;
  tasks_completed_today: Task[];
  journal: Journal | null;
  wins_today: Win[];
}

export interface WeeklyReviewData {
  weekly_plan: WeeklyPlan | null;
  tasks_completed: Task[];
  goals: Goal[];
  journals: Journal[];
  wins: Win[];
}
