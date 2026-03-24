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

// Page-level section components
import { TasksBucketed } from './sections/tasks-bucketed';
import { TasksByGoal } from './sections/tasks-by-goal';
import { TasksKanban } from './sections/tasks-kanban';
import { TasksFlat } from './sections/tasks-flat';
import { ProjectsGrid } from './sections/projects-grid';
import { GoalsGrid } from './sections/goals-grid';
import { GoalsTimeline } from './sections/goals-timeline';
import { GoalsOkr } from './sections/goals-okr';
import { JournalTimeline } from './sections/journal-timeline';
import { JournalEditor } from './sections/journal-editor';
import { JournalList } from './sections/journal-list';
import { IdeasGrid } from './sections/ideas-grid';
import { IdeasPriority } from './sections/ideas-priority';
import { DayPlan } from './sections/day-plan';
import { WeeklyPlan } from './sections/weekly-plan';
import { ReviewsTimeline } from './sections/reviews-timeline';

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

  // Tasks page sections
  'tasks-bucketed': TasksBucketed,
  'tasks-by-goal': TasksByGoal,
  'tasks-kanban': TasksKanban,
  'tasks-flat': TasksFlat,

  // Projects page sections
  'projects-grid': ProjectsGrid,

  // Goals page sections
  'goals-grid': GoalsGrid,
  'goals-timeline': GoalsTimeline,
  'goals-okr': GoalsOkr,

  // Journal page sections
  'journal-timeline': JournalTimeline,
  'journal-editor': JournalEditor,
  'journal-list': JournalList,

  // Ideas page sections
  'ideas-grid': IdeasGrid,
  'ideas-priority': IdeasPriority,

  // Plan page sections
  'day-plan': DayPlan,
  'weekly-plan': WeeklyPlan,

  // Reviews page sections
  'reviews-timeline': ReviewsTimeline,
};

export function SectionRenderer({ section }: { section: SectionDef }) {
  const Component = SECTION_MAP[section.id];
  if (!Component) return null;
  return <Component />;
}
