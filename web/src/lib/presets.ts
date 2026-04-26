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
export type PageKey = "life-coach" | "today" | "tasks" | "projects" | "goals" | "journal" | "ideas" | "thoughts" | "plan" | "reviews" | "resources" | "schedules" | "health" | "meetings" | "finance" | "marketing";

// Pages that are admin-only — invisible in nav for non-admin users and
// gated server-side. Source of truth for both client (nav.tsx) and server
// (per-page guards). Add a page key here to gate it; remove to ship.
export const ADMIN_ONLY_PAGES: PageKey[] = ["meetings", "marketing"];

// ═══════════════════════════════════════════════════════════
// Every persona appears on every page.
// 7 personas: default, solopreneur, content-creator, developer, executive, minimalist, journaler
// ═══════════════════════════════════════════════════════════

export const PAGE_PRESETS: Record<PageKey, Record<PresetKey, PagePreset>> = {

  // ── LIFE COACH (custom page, no presets) ──────────────
  "life-coach": {
    default: { name: "Default", description: "Life Coach", sections: [] },
  },

  // ── TODAY ─────────────────────────────────────────────
  today: {
    // Section 1A — Sunsama Two-Pane. The TodayShell component renders a real
    // page-level two-column layout: priorities + today's tasks + done today on
    // the LEFT (40%), and the day plan timeline (with its internal sidebar
    // hidden) on the RIGHT (60%). Everything else — date nav, status bar,
    // quote — stays as full-width sections above/below the shell.
    default: {
      name: "Default",
      description: "Sunsama-style two-pane (Section 1A pick)",
      sections: [
        { id: "day-nav", label: "Date Navigation", span: "full" },
        { id: "task-status-bar", label: "Task Status", span: "full" },
        { id: "weekly-priorities", label: "This Week", span: "full" },
        { id: "today-shell", label: "Today Two-Pane", span: "full" },
        { id: "quotes", label: "Daily Quote", span: "full" },
      ],
    },
    solopreneur: {
      name: "Solopreneur",
      description: "Execution-focused for founders",
      sections: [
        { id: "day-nav", label: "Date Navigation", span: "full" },
        { id: "task-status-bar", label: "Task Status", span: "full" },
        { id: "priorities-checklist", label: "Priorities", span: "full" },
        { id: "day-timeline", label: "Day Plan", span: "half" },
        { id: "goals-at-risk", label: "Goals at Risk", span: "half" },
      ],
    },
    "content-creator": {
      name: "Content Creator",
      description: "Ideas pipeline and content focus",
      sections: [
        { id: "day-nav", label: "Date Navigation", span: "full" },
        { id: "task-status-bar", label: "Task Status", span: "full" },
        { id: "priorities-checklist", label: "Priorities", span: "full" },
        { id: "ideas-pipeline", label: "Ideas Pipeline", span: "half" },
        { id: "day-timeline", label: "Day Plan", span: "half" },
      ],
    },
    developer: {
      name: "Developer",
      description: "Compact, data-dense, no fluff",
      sections: [
        { id: "day-nav", label: "Date Navigation", span: "full" },
        { id: "task-status-bar", label: "Task Status", span: "full" },
        { id: "priorities-checklist", label: "Priorities", span: "full" },
        { id: "day-timeline", label: "Day Plan", span: "full" },
      ],
    },
    executive: {
      name: "Executive",
      description: "High-level metrics and weekly themes",
      sections: [
        { id: "day-nav", label: "Date Navigation", span: "full" },
        { id: "task-status-bar", label: "Task Status", span: "full" },
        { id: "priorities-checklist", label: "Priorities", span: "full" },
        { id: "weekly-theme", label: "Weekly Theme", span: "half" },
        { id: "day-timeline", label: "Day Plan", span: "half" },
      ],
    },
    minimalist: {
      name: "Minimalist",
      description: "Just the essentials",
      sections: [
        { id: "priorities-checklist", label: "Priorities", span: "full" },
        { id: "day-timeline", label: "Day Plan", span: "full" },
      ],
    },
    journaler: {
      name: "Journaler",
      description: "Reflection-first daily view",
      sections: [
        { id: "day-nav", label: "Date Navigation", span: "full" },
        { id: "task-status-bar", label: "Task Status", span: "full" },
        { id: "priorities-checklist", label: "Priorities", span: "full" },
        { id: "journal-today", label: "Journal", span: "half" },
        { id: "quotes", label: "Daily Quote", span: "half" },
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

  // ── GOALS (Compass) ─────────────────────────────────
  goals: {
    default: {
      name: "Default",
      description: "Identity, vision, and quarterly goals",
      sections: [
        { id: "identity-statement", label: "Identity", span: "full" },
        { id: "vision-board", label: "Vision Board", span: "full" },
        { id: "quarterly-goals", label: "Goals", span: "full" },
      ],
    },
    solopreneur: {
      name: "Solopreneur",
      description: "Goals with execution focus",
      sections: [
        { id: "identity-statement", label: "Identity", span: "full" },
        { id: "quarterly-goals", label: "Goals", span: "half" },
        { id: "goals-at-risk", label: "At Risk", span: "half" },
      ],
    },
    "content-creator": {
      name: "Content Creator",
      description: "Goals with ideas alignment",
      sections: [
        { id: "identity-statement", label: "Identity", span: "full" },
        { id: "vision-board", label: "Vision Board", span: "full" },
        { id: "quarterly-goals", label: "Goals", span: "half" },
        { id: "ideas-pipeline", label: "Ideas", span: "half" },
      ],
    },
    developer: {
      name: "Developer",
      description: "Compact goals with identity",
      sections: [
        { id: "identity-statement", label: "Identity", span: "full" },
        { id: "quarterly-goals", label: "Goals", span: "full" },
      ],
    },
    executive: {
      name: "Executive",
      description: "Vision-driven OKR view",
      sections: [
        { id: "identity-statement", label: "Identity", span: "full" },
        { id: "quarterly-goals", label: "Goals", span: "half" },
        { id: "goals-okr", label: "OKRs", span: "half" },
      ],
    },
    minimalist: {
      name: "Minimalist",
      description: "Identity and goals only",
      sections: [
        { id: "identity-statement", label: "Identity", span: "full" },
        { id: "quarterly-goals", label: "Goals", span: "full" },
      ],
    },
    journaler: {
      name: "Journaler",
      description: "Vision with reflection",
      sections: [
        { id: "identity-statement", label: "Identity", span: "full" },
        { id: "vision-board", label: "Vision Board", span: "full" },
        { id: "quarterly-goals", label: "Goals", span: "half" },
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

  // ── THOUGHTS ────────────────────────────────────────────
  thoughts: {
    default: {
      name: "Default",
      description: "Expandable thought journal",
      sections: [{ id: "thoughts-list", label: "Thoughts", span: "full" }],
    },
    solopreneur: {
      name: "Solopreneur",
      description: "Thoughts with goals context",
      sections: [
        { id: "thoughts-list", label: "Thoughts", span: "half" },
        { id: "goals-at-risk", label: "Goals", span: "half" },
      ],
    },
    "content-creator": {
      name: "Content Creator",
      description: "Thoughts with ideas pipeline",
      sections: [
        { id: "thoughts-list", label: "Thoughts", span: "half" },
        { id: "ideas-pipeline", label: "Ideas", span: "half" },
      ],
    },
    developer: {
      name: "Developer",
      description: "Compact thought list",
      sections: [{ id: "thoughts-list", label: "Thoughts", span: "full" }],
    },
    executive: {
      name: "Executive",
      description: "Thoughts with weekly theme",
      sections: [
        { id: "thoughts-list", label: "Thoughts", span: "half" },
        { id: "weekly-theme", label: "Weekly Theme", span: "half" },
      ],
    },
    minimalist: {
      name: "Minimalist",
      description: "Just thoughts",
      sections: [{ id: "thoughts-list", label: "Thoughts", span: "full" }],
    },
    journaler: {
      name: "Journaler",
      description: "Thoughts with journal context",
      sections: [
        { id: "thoughts-list", label: "Thoughts", span: "half" },
        { id: "journal-today", label: "Journal", span: "half" },
      ],
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
      description: "Horizon cascade with day and week",
      sections: [
        { id: "horizon", label: "Horizon", span: "full" },
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
      description: "Review schedule and completed reviews",
      sections: [
        { id: "reviews-schedule", label: "Schedule", span: "full" },
        { id: "reviews-timeline", label: "Past Reviews", span: "full" },
      ],
    },
    solopreneur: {
      name: "Solopreneur",
      description: "Reviews with goal tracking",
      sections: [
        { id: "reviews-schedule", label: "Schedule", span: "half" },
        { id: "goals-at-risk", label: "Goals", span: "half" },
        { id: "reviews-timeline", label: "Past Reviews", span: "full" },
      ],
    },
    "content-creator": {
      name: "Content Creator",
      description: "Reviews with ideas retrospective",
      sections: [
        { id: "reviews-schedule", label: "Schedule", span: "half" },
        { id: "ideas-pipeline", label: "Ideas", span: "half" },
        { id: "reviews-timeline", label: "Past Reviews", span: "full" },
      ],
    },
    developer: {
      name: "Developer",
      description: "Compact schedule and review log",
      sections: [
        { id: "reviews-schedule", label: "Schedule", span: "full" },
        { id: "reviews-timeline", label: "Past Reviews", span: "full" },
      ],
    },
    executive: {
      name: "Executive",
      description: "Reviews with weekly theme context",
      sections: [
        { id: "reviews-schedule", label: "Schedule", span: "half" },
        { id: "weekly-theme", label: "Weekly Theme", span: "half" },
        { id: "reviews-timeline", label: "Past Reviews", span: "full" },
      ],
    },
    minimalist: {
      name: "Minimalist",
      description: "Schedule and reviews only",
      sections: [
        { id: "reviews-schedule", label: "Schedule", span: "full" },
        { id: "reviews-timeline", label: "Past Reviews", span: "full" },
      ],
    },
    journaler: {
      name: "Journaler",
      description: "Reviews with journal reflection",
      sections: [
        { id: "reviews-schedule", label: "Schedule", span: "half" },
        { id: "journal-today", label: "Journal", span: "half" },
        { id: "reviews-timeline", label: "Past Reviews", span: "full" },
      ],
    },
  },

  // ── RESOURCES ──────────────────────────────────────
  resources: {
    default: {
      name: "Default",
      description: "Database view of resources",
      sections: [{ id: "resources-database", label: "Resources", span: "full" }],
    },
    solopreneur: {
      name: "Solopreneur",
      description: "Resources database for founders",
      sections: [{ id: "resources-database", label: "Resources", span: "full" }],
    },
    "content-creator": {
      name: "Content Creator",
      description: "Resources with ideas pipeline",
      sections: [
        { id: "resources-database", label: "Resources", span: "half" },
        { id: "ideas-pipeline", label: "Ideas", span: "half" },
      ],
    },
    developer: {
      name: "Developer",
      description: "Compact resource database",
      sections: [{ id: "resources-database", label: "Resources", span: "full" }],
    },
    executive: {
      name: "Executive",
      description: "Resources library",
      sections: [{ id: "resources-database", label: "Resources", span: "full" }],
    },
    minimalist: {
      name: "Minimalist",
      description: "Just resources",
      sections: [{ id: "resources-database", label: "Resources", span: "full" }],
    },
    journaler: {
      name: "Journaler",
      description: "Resources with journal reflection",
      sections: [
        { id: "resources-database", label: "Resources", span: "half" },
        { id: "journal-today", label: "Journal", span: "half" },
      ],
    },
  },

  // ── SCHEDULES ──────────────────────────────────────
  schedules: {
    default: {
      name: "Default",
      description: "Weekly calendar, reminders, and routines",
      sections: [
        { id: "calendar-weekly", label: "Weekly View", span: "full" },
        { id: "reminders-upcoming", label: "Reminders", span: "half" },
        { id: "routines", label: "Routines", span: "half" },
      ],
    },
    solopreneur: {
      name: "Solopreneur",
      description: "Calendar with goals context",
      sections: [
        { id: "calendar-weekly", label: "Weekly View", span: "full" },
        { id: "reminders-upcoming", label: "Reminders", span: "half" },
        { id: "goals-at-risk", label: "Goals at Risk", span: "half" },
      ],
    },
    "content-creator": {
      name: "Content Creator",
      description: "Calendar with ideas pipeline",
      sections: [
        { id: "calendar-weekly", label: "Weekly View", span: "full" },
        { id: "reminders-upcoming", label: "Reminders", span: "half" },
        { id: "ideas-pipeline", label: "Ideas", span: "half" },
      ],
    },
    developer: {
      name: "Developer",
      description: "Compact calendar view",
      sections: [
        { id: "calendar-weekly", label: "Weekly View", span: "full" },
        { id: "reminders-upcoming", label: "Reminders", span: "full" },
      ],
    },
    executive: {
      name: "Executive",
      description: "Calendar with weekly theme",
      sections: [
        { id: "calendar-weekly", label: "Weekly View", span: "full" },
        { id: "reminders-upcoming", label: "Reminders", span: "half" },
        { id: "weekly-theme", label: "Weekly Theme", span: "half" },
      ],
    },
    minimalist: {
      name: "Minimalist",
      description: "Calendar only",
      sections: [
        { id: "calendar-weekly", label: "Weekly View", span: "full" },
      ],
    },
    journaler: {
      name: "Journaler",
      description: "Calendar with journal context",
      sections: [
        { id: "calendar-weekly", label: "Weekly View", span: "full" },
        { id: "reminders-upcoming", label: "Reminders", span: "half" },
        { id: "journal-today", label: "Journal", span: "half" },
      ],
    },
  },
  // ── MEETINGS ────────────────────────────────────────────
  // Four layout candidates surfaced in the /meetings inspiration chooser.
  // Picking one writes `dashboardConfig.pagePresets.meetings`, so the
  // /meetings page renders that layout going forward. The 4 personas
  // beyond the first reuse one of the four — keep all 7 keys present so
  // page-config logic stays uniform across pages.
  meetings: {
    default: {
      name: "Timeline",
      description: "Reverse-chronological cards with summary previews",
      sections: [{ id: "meetings-timeline", label: "Meetings", span: "full" }],
    },
    solopreneur: {
      name: "Cards",
      description: "Magazine-style: latest meeting hero, the rest in a grid",
      sections: [{ id: "meetings-cards", label: "Meetings", span: "full" }],
    },
    "content-creator": {
      name: "Cards",
      description: "Magazine-style: latest meeting hero, the rest in a grid",
      sections: [{ id: "meetings-cards", label: "Meetings", span: "full" }],
    },
    developer: {
      name: "Compact",
      description: "Dense rows, fast scan",
      sections: [{ id: "meetings-list", label: "Meetings", span: "full" }],
    },
    executive: {
      name: "Kanban",
      description: "Columns by week — Today / This week / Last week",
      sections: [{ id: "meetings-kanban", label: "Meetings", span: "full" }],
    },
    minimalist: {
      name: "Compact",
      description: "Dense rows, fast scan",
      sections: [{ id: "meetings-list", label: "Meetings", span: "full" }],
    },
    journaler: {
      name: "Timeline",
      description: "Reverse-chronological cards with summary previews",
      sections: [{ id: "meetings-timeline", label: "Meetings", span: "full" }],
    },
  },

  // ── FINANCE ─────────────────────────────────────────────
  // Four candidate layouts the user picks from in /finance/inspiration.
  // The "default" is the inbox-first layout — that's the fastest path to
  // value (categorise the backlog so the rest is meaningful). Other
  // personas reuse one of the four (no need to invent fresh layouts per
  // persona). Section IDs map to the four `finance-*` components.
  finance: {
    default: {
      name: "Inbox first",
      description: "Triage queue at the top, monthly summary below",
      sections: [
        { id: "finance-inbox", label: "Inbox", span: "full" },
        { id: "finance-monthly-summary", label: "This month", span: "full" },
      ],
    },
    solopreneur: {
      name: "Reports first",
      description: "Monthly summary in the hero slot, transactions below",
      sections: [
        { id: "finance-monthly-summary", label: "This month", span: "full" },
        { id: "finance-transactions", label: "All transactions", span: "full" },
      ],
    },
    "content-creator": {
      name: "Inbox first",
      description: "Triage queue at the top, monthly summary below",
      sections: [
        { id: "finance-inbox", label: "Inbox", span: "full" },
        { id: "finance-monthly-summary", label: "This month", span: "full" },
      ],
    },
    developer: {
      name: "Ledger",
      description: "Dense transactions table with filters, no chrome",
      sections: [
        { id: "finance-transactions", label: "Transactions", span: "full" },
      ],
    },
    executive: {
      name: "Reports first",
      description: "Monthly summary hero + transactions ledger",
      sections: [
        { id: "finance-monthly-summary", label: "This month", span: "full" },
        { id: "finance-transactions", label: "All transactions", span: "full" },
      ],
    },
    minimalist: {
      name: "Summary only",
      description: "Just this month's numbers",
      sections: [
        { id: "finance-monthly-summary", label: "This month", span: "full" },
      ],
    },
    journaler: {
      name: "Inbox first",
      description: "Triage queue + monthly summary",
      sections: [
        { id: "finance-inbox", label: "Inbox", span: "full" },
        { id: "finance-monthly-summary", label: "This month", span: "full" },
      ],
    },
  },

  // ── HEALTH ──────────────────────────────────────────────
  health: {
    default: {
      name: "Default",
      description: "Workouts, programme, nutrition, and weekly macro trend",
      sections: [
        { id: "active-programme", label: "Programme", span: "half" },
        { id: "nutrition-plan", label: "Nutrition", span: "half" },
        { id: "macros-trend", label: "Weekly Macros", span: "full" },
        { id: "food-log", label: "Food Diary", span: "full" },
        { id: "workout-log", label: "Workout Log", span: "full" },
      ],
    },
    solopreneur: {
      name: "Solopreneur",
      description: "Quick health overview",
      sections: [
        { id: "active-programme", label: "Programme", span: "half" },
        { id: "nutrition-plan", label: "Nutrition", span: "half" },
        { id: "food-log", label: "Food Diary", span: "full" },
        { id: "workout-log", label: "Workout Log", span: "full" },
      ],
    },
    "content-creator": {
      name: "Content Creator",
      description: "Health and energy tracking",
      sections: [
        { id: "nutrition-plan", label: "Nutrition", span: "full" },
        { id: "food-log", label: "Food Diary", span: "full" },
        { id: "workout-log", label: "Workout Log", span: "full" },
      ],
    },
    developer: {
      name: "Developer",
      description: "Compact health data",
      sections: [
        { id: "active-programme", label: "Programme", span: "half" },
        { id: "nutrition-plan", label: "Nutrition", span: "half" },
        { id: "food-log", label: "Food Diary", span: "full" },
        { id: "workout-log", label: "Workout Log", span: "full" },
      ],
    },
    executive: {
      name: "Executive",
      description: "High-level health metrics",
      sections: [
        { id: "active-programme", label: "Programme", span: "half" },
        { id: "nutrition-plan", label: "Nutrition", span: "half" },
        { id: "food-log", label: "Food Diary", span: "full" },
        { id: "workout-log", label: "Workout Log", span: "full" },
      ],
    },
    minimalist: {
      name: "Minimalist",
      description: "Just the essentials",
      sections: [
        { id: "workout-log", label: "Workout Log", span: "full" },
      ],
    },
    journaler: {
      name: "Journaler",
      description: "Health with reflection focus",
      sections: [
        { id: "active-programme", label: "Programme", span: "half" },
        { id: "nutrition-plan", label: "Nutrition", span: "half" },
        { id: "workout-log", label: "Workout Log", span: "full" },
      ],
    },
  },

  // ── MARKETING ──────────────────────────────────────────
  // Admin-only placeholder for now. The marketing page exposes growth/
  // distribution work — landing-page experiments, content calendar,
  // outreach lists. Layouts will get fleshed out once we have the data
  // model nailed; until then every preset renders the same single
  // placeholder section.
  marketing: {
    default: {
      name: "Default",
      description: "Marketing workspace placeholder",
      sections: [{ id: "marketing-placeholder", label: "Marketing", span: "full" }],
    },
    solopreneur: {
      name: "Default",
      description: "Marketing workspace placeholder",
      sections: [{ id: "marketing-placeholder", label: "Marketing", span: "full" }],
    },
    "content-creator": {
      name: "Default",
      description: "Marketing workspace placeholder",
      sections: [{ id: "marketing-placeholder", label: "Marketing", span: "full" }],
    },
    developer: {
      name: "Default",
      description: "Marketing workspace placeholder",
      sections: [{ id: "marketing-placeholder", label: "Marketing", span: "full" }],
    },
    executive: {
      name: "Default",
      description: "Marketing workspace placeholder",
      sections: [{ id: "marketing-placeholder", label: "Marketing", span: "full" }],
    },
    minimalist: {
      name: "Default",
      description: "Marketing workspace placeholder",
      sections: [{ id: "marketing-placeholder", label: "Marketing", span: "full" }],
    },
    journaler: {
      name: "Default",
      description: "Marketing workspace placeholder",
      sections: [{ id: "marketing-placeholder", label: "Marketing", span: "full" }],
    },
  },
};

export const ALL_PRESET_KEYS = ["default", "solopreneur", "content-creator", "developer", "executive", "minimalist", "journaler"];

export const DEFAULT_NAV_ORDER: PageKey[] = [
  "life-coach", "today", "tasks", "journal", "projects", "goals", "ideas", "thoughts", "resources", "meetings", "marketing", "reviews", "schedules", "health", "finance",
];

export function getPreset(page: PageKey, presetKey: string): PagePreset {
  const pagePresets = PAGE_PRESETS[page];
  return pagePresets[presetKey] ?? pagePresets["default"];
}

export function getPresetsForPage(page: PageKey): Record<string, PagePreset> {
  return PAGE_PRESETS[page];
}
