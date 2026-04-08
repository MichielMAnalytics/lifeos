'use client';

import { type SectionDef } from '@/lib/presets';

// Import all section components
import { Greeting } from './sections/greeting';
import { QuickCapture } from './sections/quick-capture';
import { FocusRings } from './sections/focus-rings';
import { TasksToday } from './sections/tasks-today';
import { JournalToday } from './sections/journal-today';
import { OverdueAlert } from './sections/overdue-alert';
import { GoalsAtRisk } from './sections/goals-at-risk';
import { IdeasPipeline } from './sections/ideas-pipeline';
import { WeeklyTheme } from './sections/weekly-theme';
import { WinsToday } from './sections/wins-today';
import { DayNav } from './sections/day-nav';
import { PrioritiesChecklist } from './sections/priorities-checklist';
import { DayTimeline } from './sections/day-timeline';
import { Quotes } from './sections/quotes';
import { TaskStatusBar } from './sections/task-status-bar';
import { TodayShell } from './sections/today-shell';

// Page-level section components
import { TasksBucketed } from './sections/tasks-bucketed';
import { TasksByGoal } from './sections/tasks-by-goal';
import { TasksKanban } from './sections/tasks-kanban';
import { TasksFlat } from './sections/tasks-flat';
import { ProjectsGrid } from './sections/projects-grid';
import { GoalsGrid } from './sections/goals-grid';
import { GoalsTimeline } from './sections/goals-timeline';
import { GoalsOkr } from './sections/goals-okr';
import { IdentityStatement } from './sections/identity-statement';
import { VisionBoard } from './sections/vision-board';
import { QuarterlyGoals } from './sections/quarterly-goals';
import { JournalTimeline } from './sections/journal-timeline';
import { JournalEditor } from './sections/journal-editor';
import { JournalList } from './sections/journal-list';
import { IdeasGrid } from './sections/ideas-grid';
import { IdeasPriority } from './sections/ideas-priority';
import { DayPlan } from './sections/day-plan';
import { WeeklyPlan } from './sections/weekly-plan';
import { ReviewsTimeline } from './sections/reviews-timeline';
import { ReviewsSchedule } from './sections/reviews-schedule';
import { WeeklyReviewForm } from './sections/weekly-review-form';
import { QuarterlyReviewForm } from './sections/quarterly-review-form';
import { ThoughtsList } from './sections/thoughts-list';
import { ResourcesGrid } from './sections/resources-grid';
import { CalendarWeekly } from './sections/calendar-weekly';
import { RemindersUpcoming } from './sections/reminders-upcoming';
import { WorkoutLog } from './sections/workout-log';
import { ActiveProgramme } from './sections/active-programme';
import { HealthSummary } from './sections/health-summary';
import { NutritionPlan } from './sections/nutrition-plan';
import { FoodLog } from './sections/food-log';
import { MacrosTrend } from './sections/macros-trend';

const SECTION_MAP: Record<string, React.ComponentType> = {
  // Today page sections
  'greeting': Greeting,
  'quick-capture': QuickCapture,
  'focus-rings': FocusRings,
  'tasks-today': TasksToday,
  'journal-today': JournalToday,
  'overdue-alert': OverdueAlert,
  'goals-at-risk': GoalsAtRisk,
  'ideas-pipeline': IdeasPipeline,
  'weekly-theme': WeeklyTheme,
  'wins-today': WinsToday,
  'day-nav': DayNav,
  'priorities-checklist': PrioritiesChecklist,
  'day-timeline': DayTimeline,
  'quotes': Quotes,
  'task-status-bar': TaskStatusBar,
  'today-shell': TodayShell,

  // Tasks page sections
  'tasks-bucketed': TasksBucketed,
  'tasks-by-goal': TasksByGoal,
  'tasks-kanban': TasksKanban,
  'tasks-flat': TasksFlat,

  // Projects page sections
  'projects-grid': ProjectsGrid,

  // Goals / Compass page sections
  'goals-grid': GoalsGrid,
  'goals-timeline': GoalsTimeline,
  'goals-okr': GoalsOkr,
  'identity-statement': IdentityStatement,
  'vision-board': VisionBoard,
  'quarterly-goals': QuarterlyGoals,

  // Journal page sections
  'journal-timeline': JournalTimeline,
  'journal-editor': JournalEditor,
  'journal-list': JournalList,

  // Thoughts page sections
  'thoughts-list': ThoughtsList,

  // Ideas page sections
  'ideas-grid': IdeasGrid,
  'ideas-priority': IdeasPriority,

  // Plan page sections
  'day-plan': DayPlan,
  'weekly-plan': WeeklyPlan,

  // Reviews page sections
  'reviews-timeline': ReviewsTimeline,
  'reviews-schedule': ReviewsSchedule,
  'weekly-review-form': WeeklyReviewForm,
  'quarterly-review-form': QuarterlyReviewForm,

  // Resources page sections
  'resources-database': ResourcesGrid,
  'resources-grid': ResourcesGrid,

  // Calendar page sections
  'calendar-weekly': CalendarWeekly,
  'reminders-upcoming': RemindersUpcoming,

  // Health page sections
  'workout-log': WorkoutLog,
  'active-programme': ActiveProgramme,
  'health-summary': HealthSummary,
  'nutrition-plan': NutritionPlan,
  'food-log': FoodLog,
  'macros-trend': MacrosTrend,
};

export function SectionRenderer({ section }: { section: SectionDef }) {
  const Component = SECTION_MAP[section.id];
  if (!Component) return null;
  return <Component />;
}
