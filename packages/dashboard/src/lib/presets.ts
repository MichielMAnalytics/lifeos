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

// ═══════════════════════════════════════════════════════════
// Every persona appears on every page.
// 7 personas: default, solopreneur, content-creator, developer, executive, minimalist, journaler
// ═══════════════════════════════════════════════════════════

export const PAGE_PRESETS: Record<PageKey, Record<PresetKey, PagePreset>> = {

  // ── TODAY ─────────────────────────────────────────────
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
      description: "High-level metrics and weekly themes",
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

  // ── TASKS ─────────────────────────────────────────────
  tasks: {
    default: {
      name: "Default",
      description: "Bucketed by due date",
      sections: [{ id: "tasks-bucketed", label: "Tasks", span: "full" }],
    },
    solopreneur: {
      name: "Solopreneur",
      description: "Grouped by goal for strategic focus",
      sections: [{ id: "tasks-by-goal", label: "Tasks by Goal", span: "full" }],
    },
    "content-creator": {
      name: "Content Creator",
      description: "Tasks alongside your ideas",
      sections: [
        { id: "tasks-bucketed", label: "Tasks", span: "half" },
        { id: "ideas-pipeline", label: "Ideas", span: "half" },
      ],
    },
    developer: {
      name: "Developer",
      description: "Kanban-style board",
      sections: [{ id: "tasks-kanban", label: "Kanban Board", span: "full" }],
    },
    executive: {
      name: "Executive",
      description: "Tasks with goal context",
      sections: [
        { id: "tasks-by-goal", label: "By Goal", span: "half" },
        { id: "goals-at-risk", label: "Goals at Risk", span: "half" },
      ],
    },
    minimalist: {
      name: "Minimalist",
      description: "Flat list, no grouping",
      sections: [{ id: "tasks-flat", label: "All Tasks", span: "full" }],
    },
    journaler: {
      name: "Journaler",
      description: "Tasks with daily reflection",
      sections: [
        { id: "tasks-bucketed", label: "Tasks", span: "half" },
        { id: "journal-today", label: "Journal", span: "half" },
      ],
    },
  },

  // ── PROJECTS ──────────────────────────────────────────
  projects: {
    default: {
      name: "Default",
      description: "Project cards grid",
      sections: [{ id: "projects-grid", label: "Projects", span: "full" }],
    },
    solopreneur: {
      name: "Solopreneur",
      description: "Projects with linked goals",
      sections: [
        { id: "projects-grid", label: "Projects", span: "half" },
        { id: "goals-at-risk", label: "Goals at Risk", span: "half" },
      ],
    },
    "content-creator": {
      name: "Content Creator",
      description: "Projects with ideas backlog",
      sections: [
        { id: "projects-grid", label: "Projects", span: "half" },
        { id: "ideas-pipeline", label: "Ideas", span: "half" },
      ],
    },
    developer: {
      name: "Developer",
      description: "Compact project list",
      sections: [{ id: "projects-grid", label: "Projects", span: "full" }],
    },
    executive: {
      name: "Executive",
      description: "Projects with weekly context",
      sections: [
        { id: "projects-grid", label: "Projects", span: "half" },
        { id: "weekly-theme", label: "Weekly Theme", span: "half" },
      ],
    },
    minimalist: {
      name: "Minimalist",
      description: "Just projects",
      sections: [{ id: "projects-grid", label: "Projects", span: "full" }],
    },
    journaler: {
      name: "Journaler",
      description: "Projects with reflection",
      sections: [
        { id: "projects-grid", label: "Projects", span: "half" },
        { id: "journal-today", label: "Journal", span: "half" },
      ],
    },
  },

  // ── GOALS ─────────────────────────────────────────────
  goals: {
    default: {
      name: "Default",
      description: "Card grid with health indicators",
      sections: [{ id: "goals-grid", label: "Goals", span: "full" }],
    },
    solopreneur: {
      name: "Solopreneur",
      description: "Quarterly timeline view",
      sections: [{ id: "goals-timeline", label: "Timeline", span: "full" }],
    },
    "content-creator": {
      name: "Content Creator",
      description: "Goals with ideas alignment",
      sections: [
        { id: "goals-grid", label: "Goals", span: "half" },
        { id: "ideas-pipeline", label: "Ideas", span: "half" },
      ],
    },
    developer: {
      name: "Developer",
      description: "Compact goals with task counts",
      sections: [{ id: "goals-grid", label: "Goals", span: "full" }],
    },
    executive: {
      name: "Executive",
      description: "OKR-style nested view",
      sections: [{ id: "goals-okr", label: "OKRs", span: "full" }],
    },
    minimalist: {
      name: "Minimalist",
      description: "Active goals only",
      sections: [{ id: "goals-grid", label: "Goals", span: "full" }],
    },
    journaler: {
      name: "Journaler",
      description: "Goals with reflection context",
      sections: [
        { id: "goals-grid", label: "Goals", span: "half" },
        { id: "wins-today", label: "Today's Wins", span: "half" },
      ],
    },
  },

  // ── JOURNAL ───────────────────────────────────────────
  journal: {
    default: {
      name: "Default",
      description: "Timeline view of entries",
      sections: [{ id: "journal-timeline", label: "Timeline", span: "full" }],
    },
    solopreneur: {
      name: "Solopreneur",
      description: "Journal with goals progress",
      sections: [
        { id: "journal-timeline", label: "Journal", span: "half" },
        { id: "goals-at-risk", label: "Goals", span: "half" },
      ],
    },
    "content-creator": {
      name: "Content Creator",
      description: "Journal with ideas capture",
      sections: [
        { id: "journal-timeline", label: "Journal", span: "half" },
        { id: "ideas-pipeline", label: "Ideas", span: "half" },
      ],
    },
    developer: {
      name: "Developer",
      description: "Compact journal list",
      sections: [{ id: "journal-list", label: "Entries", span: "full" }],
    },
    executive: {
      name: "Executive",
      description: "Journal with weekly theme",
      sections: [
        { id: "journal-timeline", label: "Journal", span: "half" },
        { id: "weekly-theme", label: "Weekly Theme", span: "half" },
      ],
    },
    minimalist: {
      name: "Minimalist",
      description: "Simple entry list",
      sections: [{ id: "journal-list", label: "Entries", span: "full" }],
    },
    journaler: {
      name: "Journaler",
      description: "Full-page writing editor",
      sections: [{ id: "journal-editor", label: "Editor", span: "full" }],
    },
  },

  // ── IDEAS ─────────────────────────────────────────────
  ideas: {
    default: {
      name: "Default",
      description: "Card grid with quick add",
      sections: [{ id: "ideas-grid", label: "Ideas", span: "full" }],
    },
    solopreneur: {
      name: "Solopreneur",
      description: "Priority-sorted by actionability",
      sections: [{ id: "ideas-priority", label: "By Priority", span: "full" }],
    },
    "content-creator": {
      name: "Content Creator",
      description: "Pipeline: capture → develop → publish",
      sections: [{ id: "ideas-pipeline", label: "Pipeline", span: "full" }],
    },
    developer: {
      name: "Developer",
      description: "Compact idea list",
      sections: [{ id: "ideas-grid", label: "Ideas", span: "full" }],
    },
    executive: {
      name: "Executive",
      description: "Ideas with goal alignment",
      sections: [
        { id: "ideas-grid", label: "Ideas", span: "half" },
        { id: "goals-at-risk", label: "Goals", span: "half" },
      ],
    },
    minimalist: {
      name: "Minimalist",
      description: "Just the ideas",
      sections: [{ id: "ideas-grid", label: "Ideas", span: "full" }],
    },
    journaler: {
      name: "Journaler",
      description: "Ideas with daily reflection",
      sections: [
        { id: "ideas-grid", label: "Ideas", span: "half" },
        { id: "journal-today", label: "Journal", span: "half" },
      ],
    },
  },

  // ── PLAN ──────────────────────────────────────────────
  plan: {
    default: {
      name: "Default",
      description: "Day and week at a glance",
      sections: [
        { id: "day-plan", label: "Day Plan", span: "half" },
        { id: "weekly-plan", label: "Weekly Plan", span: "half" },
      ],
    },
    solopreneur: {
      name: "Solopreneur",
      description: "Plan with goals and tasks",
      sections: [
        { id: "day-plan", label: "Day Plan", span: "full" },
        { id: "goals-at-risk", label: "Goals at Risk", span: "half" },
        { id: "weekly-plan", label: "Weekly Plan", span: "half" },
      ],
    },
    "content-creator": {
      name: "Content Creator",
      description: "Plan with content pipeline",
      sections: [
        { id: "day-plan", label: "Day Plan", span: "half" },
        { id: "ideas-pipeline", label: "Content Ideas", span: "half" },
        { id: "weekly-plan", label: "Weekly Plan", span: "full" },
      ],
    },
    developer: {
      name: "Developer",
      description: "Day plan focus, compact",
      sections: [
        { id: "day-plan", label: "Day Plan", span: "full" },
      ],
    },
    executive: {
      name: "Executive",
      description: "Weekly strategy view",
      sections: [
        { id: "weekly-plan", label: "Weekly Plan", span: "full" },
        { id: "day-plan", label: "Day Plan", span: "full" },
      ],
    },
    minimalist: {
      name: "Minimalist",
      description: "Today only",
      sections: [
        { id: "day-plan", label: "Day Plan", span: "full" },
      ],
    },
    journaler: {
      name: "Journaler",
      description: "Plan with reflection",
      sections: [
        { id: "day-plan", label: "Day Plan", span: "half" },
        { id: "journal-today", label: "Journal", span: "half" },
        { id: "weekly-plan", label: "Weekly Plan", span: "full" },
      ],
    },
  },

  // ── REVIEWS ───────────────────────────────────────────
  reviews: {
    default: {
      name: "Default",
      description: "Review timeline",
      sections: [{ id: "reviews-timeline", label: "Reviews", span: "full" }],
    },
    solopreneur: {
      name: "Solopreneur",
      description: "Reviews with goal progress",
      sections: [
        { id: "reviews-timeline", label: "Reviews", span: "half" },
        { id: "goals-at-risk", label: "Goals", span: "half" },
      ],
    },
    "content-creator": {
      name: "Content Creator",
      description: "Reviews with ideas retrospective",
      sections: [
        { id: "reviews-timeline", label: "Reviews", span: "half" },
        { id: "ideas-pipeline", label: "Ideas", span: "half" },
      ],
    },
    developer: {
      name: "Developer",
      description: "Compact review list",
      sections: [{ id: "reviews-timeline", label: "Reviews", span: "full" }],
    },
    executive: {
      name: "Executive",
      description: "Reviews with weekly theme",
      sections: [
        { id: "reviews-timeline", label: "Reviews", span: "half" },
        { id: "weekly-theme", label: "Weekly Theme", span: "half" },
      ],
    },
    minimalist: {
      name: "Minimalist",
      description: "Just reviews",
      sections: [{ id: "reviews-timeline", label: "Reviews", span: "full" }],
    },
    journaler: {
      name: "Journaler",
      description: "Reviews with journal context",
      sections: [
        { id: "reviews-timeline", label: "Reviews", span: "half" },
        { id: "journal-today", label: "Journal", span: "half" },
      ],
    },
  },
};

export const ALL_PRESET_KEYS = ["default", "solopreneur", "content-creator", "developer", "executive", "minimalist", "journaler"];

export const DEFAULT_NAV_ORDER: PageKey[] = [
  "today", "tasks", "projects", "goals", "journal", "ideas", "plan", "reviews",
];

export function getPreset(page: PageKey, presetKey: string): PagePreset {
  const pagePresets = PAGE_PRESETS[page];
  return pagePresets[presetKey] ?? pagePresets["default"];
}

export function getPresetsForPage(page: PageKey): Record<string, PagePreset> {
  return PAGE_PRESETS[page];
}
