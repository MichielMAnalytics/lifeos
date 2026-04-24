// ── Core entity types returned by the API ──

export interface User {
  id: string;
  _id?: string;
  email: string;
  name: string | null;
  timezone: string;
  created_at?: string;
  createdAt?: string;
}

export interface ApiKey {
  id: string;
  _id?: string;
  name: string | null;
  key_prefix?: string;
  keyPrefix?: string;
  last_used_at?: string | null;
  lastUsedAt?: string | null;
  created_at?: string;
  createdAt?: string;
}

export interface Task {
  id: string;
  _id?: string;
  title: string;
  notes: string | null;
  status: string;
  due_date?: string | null;
  dueDate?: string | null;
  project_id?: string | null;
  projectId?: string | null;
  goal_id?: string | null;
  goalId?: string | null;
  position: number;
  completed_at?: string | null;
  completedAt?: string | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  _id?: string;
  title: string;
  description: string | null;
  status: string;
  created_at?: string;
  createdAt?: string;
}

export interface Goal {
  id: string;
  _id?: string;
  title: string;
  description: string | null;
  status: string;
  target_date?: string | null;
  targetDate?: string | null;
  quarter: string | null;
  completed_at?: string | null;
  completedAt?: string | null;
  created_at?: string;
  createdAt?: string;
}

export interface GoalHealthInfo {
  status: string;
  score: number;
  tasks_total?: number;
  tasksTotal?: number;
  tasks_done?: number;
  tasksDone?: number;
  velocity: number;
}

export interface Journal {
  id: string;
  _id?: string;
  entry_date?: string;
  entryDate?: string;
  mit: string | null;
  p1: string | null;
  p2: string | null;
  notes: string | null;
  wins: string[];
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface ScheduleBlock {
  start: string;
  end: string;
  label: string;
  type: string;
  task_id?: string;
  taskId?: string;
}

export interface DayPlan {
  id: string;
  _id?: string;
  plan_date?: string;
  planDate?: string;
  wake_time?: string | null;
  wakeTime?: string | null;
  schedule: ScheduleBlock[];
  overflow: string[];
  mit_task_id?: string | null;
  mitTaskId?: string | null;
  p1_task_id?: string | null;
  p1TaskId?: string | null;
  p2_task_id?: string | null;
  p2TaskId?: string | null;
  mit_done?: boolean;
  mitDone?: boolean;
  p1_done?: boolean;
  p1Done?: boolean;
  p2_done?: boolean;
  p2Done?: boolean;
  created_at?: string;
  createdAt?: string;
}

export interface WeeklyGoal {
  title: string;
  status?: string;
  goal_id?: string;
  goalId?: string;
}

export interface WeeklyPlan {
  id: string;
  _id?: string;
  week_start?: string;
  weekStart?: string;
  theme: string | null;
  goals: WeeklyGoal[];
  review_score?: number | null;
  reviewScore?: number | null;
  created_at?: string;
  createdAt?: string;
}

export interface Idea {
  id: string;
  _id?: string;
  content: string;
  actionability: string | null;
  next_step?: string | null;
  nextStep?: string | null;
  project_id?: string | null;
  projectId?: string | null;
  created_at?: string;
  createdAt?: string;
}

export interface Thought {
  id: string;
  _id?: string;
  content: string;
  title: string | null;
  created_at?: string;
  createdAt?: string;
}

export interface Win {
  id: string;
  _id?: string;
  content: string;
  entry_date?: string;
  entryDate?: string;
  created_at?: string;
  createdAt?: string;
}

export interface Resource {
  id: string;
  _id?: string;
  title: string;
  url: string | null;
  content: string | null;
  type: string | null;
  created_at?: string;
  createdAt?: string;
}

export interface Review {
  id: string;
  _id?: string;
  review_type?: string;
  reviewType?: string;
  period_start?: string;
  periodStart?: string;
  period_end?: string;
  periodEnd?: string;
  content: Record<string, unknown>;
  score: number | null;
  created_at?: string;
  createdAt?: string;
}

export interface Reminder {
  id: string;
  _id?: string;
  title: string;
  body: string | null;
  scheduled_at?: string;
  scheduledAt?: string;
  status: string;
  snooze_count?: number;
  snoozeCount?: number;
  created_at?: string;
  createdAt?: string;
}

export interface Meeting {
  id: string;
  _id?: string;
  granolaId?: string;
  granola_id?: string;
  title: string;
  summary?: string | null;
  transcript?: string | null;
  transcriptTruncated?: boolean | null;
  transcript_truncated?: boolean | null;
  attendees?: string[] | null;
  startedAt?: number | null;
  started_at?: number | null;
  endedAt?: number | null;
  ended_at?: number | null;
  granolaUrl?: string | null;
  granola_url?: string | null;
  syncedAt?: number;
  synced_at?: number;
  createdAt?: string;
  created_at?: string;
}

export interface UpcomingMeeting {
  _id: string;
  id?: string;
  source: string;
  externalId?: string | null;
  title: string;
  description?: string | null;
  startedAt: number;
  endedAt: number;
  attendees: string[];
  location?: string | null;
  htmlLink?: string | null;
  updatedAt: number;
}

export interface MeetingPrep {
  _id: string;
  id?: string;
  upcomingMeetingId: string;
  title: string;
  agenda?: string | null;
  notes?: string | null;
  talkingPoints?: string | null;
  talkingPointsSource?: string | null;
  relatedMeetingIds: string[];
  relatedTaskIds: string[];
  relatedGoalIds: string[];
  contextRefreshedAt?: number | null;
  updatedAt: number;
}

export interface MeetingPrepView {
  prep: MeetingPrep;
  upcoming: UpcomingMeeting | null;
  relatedMeetings: Array<{
    _id: string;
    title: string;
    startedAt?: number;
    attendees?: string[];
    summary?: string;
  }>;
  relatedTasks: Array<{
    _id: string;
    title: string;
    status: string;
  }>;
  relatedGoals?: Array<{
    _id: string;
    title: string;
    status: string;
    targetDate?: string;
  }>;
}

export interface FinanceCategory {
  id: string;
  _id?: string;
  name: string;
  color?: string;
  isIncome?: boolean;
  is_income?: boolean;
  isDefault?: boolean;
  is_default?: boolean;
  parent_id?: string | null;
  parentId?: string | null;
}

export interface FinanceTransaction {
  id: string;
  _id?: string;
  externalId?: string;
  external_id?: string;
  date: string;
  description?: string;
  merchantRaw?: string | null;
  merchant_raw?: string | null;
  amount: number;
  currency: string;
  amountUsd?: number | null;
  amount_usd?: number | null;
  category_id?: string | null;
  categoryId?: string | null;
  status?: string;
  source: string | null;
  isIncome?: boolean;
  is_income?: boolean;
  suggestedCategoryId?: string | null;
  suggested_category_id?: string | null;
  suggestionConfidence?: number | null;
  suggestion_confidence?: number | null;
  suggestionSource?: string | null;
  suggestion_source?: string | null;
  merchant?: string | null;
  notes?: string | null;
  created_at?: string;
  createdAt?: string;
}

export interface FinanceStatement {
  id: string;
  _id?: string;
  source: string;
  filename: string;
  accountLabel?: string | null;
  account_label?: string | null;
  uploadedAt?: number;
  uploaded_at?: number;
  parsedCount: number;
  parsed_count?: number;
  skippedCount: number;
  skipped_count?: number;
}

export interface NetWorthSnapshot {
  id: string;
  _id?: string;
  date: string;
  breakdown: Record<string, number>;
  total: number;
  notes: string | null;
  created_at?: string;
  createdAt?: string;
}

export interface Identity {
  id: string;
  _id?: string;
  statement: string;
  updated_at?: number;
  updatedAt?: number;
  created_at?: string;
  createdAt?: string;
}

export interface VisionBoardItem {
  id: string;
  _id?: string;
  image_url?: string;
  imageUrl?: string;
  caption?: string | null;
  position: number;
  created_at?: string;
  createdAt?: string;
}

export interface Exercise {
  name: string;
  sets?: number | null;
  reps?: number | null;
  weight?: number | null;
  unit?: string | null;
}

export interface Workout {
  id: string;
  _id?: string;
  workout_date?: string;
  workoutDate?: string;
  type: string;
  title: string;
  duration_minutes?: number | null;
  durationMinutes?: number | null;
  exercises?: Exercise[] | null;
  notes: string | null;
  programme_id?: string | null;
  programmeId?: string | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface Programme {
  id: string;
  _id?: string;
  title: string;
  description: string | null;
  status: string;
  start_date?: string;
  startDate?: string;
  end_date?: string | null;
  endDate?: string | null;
  notes: string | null;
  current_week?: number;
  currentWeek?: number;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface HealthSummary {
  week_start?: string;
  weekStart?: string;
  week_end?: string;
  weekEnd?: string;
  total_workouts?: number;
  totalWorkouts?: number;
  total_duration_minutes?: number;
  totalDurationMinutes?: number;
  by_type?: Record<string, number>;
  byType?: Record<string, number>;
  workouts: Workout[];
}

export interface FoodLogEntry {
  id: string;
  _id?: string;
  entry_date?: string;
  entryDate?: string;
  name: string;
  meal_type?: string | null;
  mealType?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  quantity?: string | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface DailyMacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  entries: number;
}

export interface MutationLogEntry {
  id: string;
  _id?: string;
  action: string;
  table_name?: string;
  tableName?: string;
  record_id?: string;
  recordId?: string;
  before_data?: Record<string, unknown> | null;
  beforeData?: Record<string, unknown> | null;
  after_data?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  created_at?: string;
  createdAt?: string;
}

export interface DashboardConfig {
  _id: string | null;
  userId: string;
  navMode: string;
  navOrder: string[];
  navHidden: string[];
  pagePresets: Record<string, string>;
  customTheme?: Record<string, unknown>;
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
