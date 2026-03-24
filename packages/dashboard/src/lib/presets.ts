export type SectionSpan = "full" | "half";

export interface SectionDef {
  id: string;
  label: string;
  span: SectionSpan;
}

export interface PagePreset {
  name: string;
  description: string;
  sections: SectionDef[];
}

export type PresetKey = string;
export type PageKey = "today" | "tasks" | "projects" | "goals" | "journal" | "ideas" | "plan" | "reviews";

// All available section IDs across the app:
// today: greeting, quick-capture, focus-rings, tasks-today, journal-today, overdue-alert, goals-at-risk, ideas-pipeline, weekly-theme, wins-today
// tasks: tasks-bucketed, tasks-by-goal, tasks-kanban, tasks-flat
// goals: goals-grid, goals-timeline, goals-okr
// journal: journal-timeline, journal-editor, journal-list
// ideas: ideas-grid, ideas-pipeline, ideas-priority
// plan: day-plan, weekly-plan
// reviews: reviews-timeline

export const PAGE_PRESETS: Record<PageKey, Record<PresetKey, PagePreset>> = {
  today: {
    default: {
      name: "Default",
      description: "Balanced overview of your day",
      sections: [
        { id: "greeting", label: "Greeting", span: "full" },
        { id: "quick-capture", label: "Quick Capture", span: "full" },
        { id: "focus-rings", label: "Focus", span: "full" },
        { id: "tasks-today", label: "Today's Tasks", span: "half" },
        { id: "journal-today", label: "Journal", span: "half" },
      ],
    },
    solopreneur: {
      name: "Solopreneur",
      description: "Execution-focused for founders",
      sections: [
        { id: "greeting", label: "Greeting", span: "full" },
        { id: "focus-rings", label: "Focus", span: "full" },
        { id: "goals-at-risk", label: "Goals at Risk", span: "half" },
        { id: "tasks-today", label: "Tasks", span: "half" },
        { id: "quick-capture", label: "Quick Capture", span: "full" },
      ],
    },
    "content-creator": {
      name: "Content Creator",
      description: "Ideas pipeline and content focus",
      sections: [
        { id: "greeting", label: "Greeting", span: "full" },
        { id: "ideas-pipeline", label: "Ideas Pipeline", span: "half" },
        { id: "tasks-today", label: "Tasks", span: "half" },
        { id: "journal-today", label: "Journal", span: "full" },
      ],
    },
    developer: {
      name: "Developer",
      description: "Compact, data-dense, no fluff",
      sections: [
        { id: "overdue-alert", label: "Overdue", span: "full" },
        { id: "tasks-today", label: "Tasks", span: "full" },
        { id: "focus-rings", label: "Focus", span: "full" },
      ],
    },
    executive: {
      name: "Executive",
      description: "High-level metrics and delegation",
      sections: [
        { id: "greeting", label: "Greeting", span: "full" },
        { id: "weekly-theme", label: "Weekly Theme", span: "full" },
        { id: "goals-at-risk", label: "Goals", span: "half" },
        { id: "tasks-today", label: "Tasks", span: "half" },
      ],
    },
    minimalist: {
      name: "Minimalist",
      description: "Just the essentials",
      sections: [
        { id: "focus-rings", label: "Focus", span: "full" },
        { id: "tasks-today", label: "Tasks", span: "full" },
      ],
    },
    journaler: {
      name: "Journaler",
      description: "Reflection-first daily view",
      sections: [
        { id: "greeting", label: "Greeting", span: "full" },
        { id: "journal-today", label: "Journal", span: "full" },
        { id: "wins-today", label: "Wins", span: "half" },
        { id: "focus-rings", label: "Focus", span: "half" },
      ],
    },
  },
  tasks: {
    default: {
      name: "Default",
      description: "Bucketed by due date",
      sections: [{ id: "tasks-bucketed", label: "Tasks", span: "full" }],
    },
    solopreneur: {
      name: "Solopreneur",
      description: "Grouped by goal",
      sections: [{ id: "tasks-by-goal", label: "Tasks by Goal", span: "full" }],
    },
    developer: {
      name: "Developer",
      description: "Kanban columns",
      sections: [{ id: "tasks-kanban", label: "Kanban Board", span: "full" }],
    },
    minimalist: {
      name: "Minimalist",
      description: "Flat list",
      sections: [{ id: "tasks-flat", label: "All Tasks", span: "full" }],
    },
  },
  projects: {
    default: {
      name: "Default",
      description: "Project cards",
      sections: [{ id: "projects-grid", label: "Projects", span: "full" }],
    },
  },
  goals: {
    default: {
      name: "Default",
      description: "Card grid with health",
      sections: [{ id: "goals-grid", label: "Goals", span: "full" }],
    },
    solopreneur: {
      name: "Solopreneur",
      description: "Quarterly timeline",
      sections: [{ id: "goals-timeline", label: "Timeline", span: "full" }],
    },
    executive: {
      name: "Executive",
      description: "OKR-style view",
      sections: [{ id: "goals-okr", label: "OKRs", span: "full" }],
    },
  },
  journal: {
    default: {
      name: "Default",
      description: "Timeline view",
      sections: [{ id: "journal-timeline", label: "Timeline", span: "full" }],
    },
    journaler: {
      name: "Journaler",
      description: "Full editor",
      sections: [{ id: "journal-editor", label: "Editor", span: "full" }],
    },
    minimalist: {
      name: "Minimalist",
      description: "Simple list",
      sections: [{ id: "journal-list", label: "Entries", span: "full" }],
    },
  },
  ideas: {
    default: {
      name: "Default",
      description: "Card grid",
      sections: [{ id: "ideas-grid", label: "Ideas", span: "full" }],
    },
    "content-creator": {
      name: "Content Creator",
      description: "Pipeline view",
      sections: [{ id: "ideas-pipeline", label: "Pipeline", span: "full" }],
    },
    solopreneur: {
      name: "Solopreneur",
      description: "Priority sorted",
      sections: [{ id: "ideas-priority", label: "By Priority", span: "full" }],
    },
  },
  plan: {
    default: {
      name: "Default",
      description: "Day and week at a glance",
      sections: [
        { id: "day-plan", label: "Day Plan", span: "half" },
        { id: "weekly-plan", label: "Weekly Plan", span: "half" },
      ],
    },
  },
  reviews: {
    default: {
      name: "Default",
      description: "Review timeline",
      sections: [{ id: "reviews-timeline", label: "Reviews", span: "full" }],
    },
  },
};

export const DEFAULT_NAV_ORDER: PageKey[] = [
  "today",
  "tasks",
  "projects",
  "goals",
  "journal",
  "ideas",
  "plan",
  "reviews",
];

export function getPreset(page: PageKey, presetKey: string): PagePreset {
  const pagePresets = PAGE_PRESETS[page];
  return pagePresets[presetKey] ?? pagePresets["default"];
}

export function getPresetsForPage(page: PageKey): Record<string, PagePreset> {
  return PAGE_PRESETS[page];
}
