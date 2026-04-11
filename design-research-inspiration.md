# LifeOS Design Research

Cross-cutting inspiration from best-in-class productivity, wellness, and AI tools. Concrete hex codes, px values, and pattern observations — synthesized into actionable options for LifeOS.

---

## Part 1 — Per-app observations

### Linear

- **Colors (dark, the canonical Linear):** bg `#08090A`, surface `#101113` / `#16171B`, border `#1F2023`, text `#F7F8F8`, muted `#8A8F98`. Accent is the iconic indigo `#5E6AD2` with hover `#7A82E0` and a faint glow `rgba(94,106,210,0.12)`. Status colors: backlog `#BEC2C8`, todo `#E2E2E2`, in-progress `#F2C94C`, done `#5E6AD2`, canceled `#95A2B3`.
- **Typography:** Inter Variable. Body 13px, headings 14–22px, semibold 600 for hierarchy. Letter-spacing `-0.012em` for headings.
- **Icons:** Custom SVG set, 16px default, stroke `1.5`. Outline-only, never filled. Match cursor sizing.
- **Layout:** Fixed left sidebar 240px, content max-width none (full-bleed lists). Density: list rows 32px tall, 12px horizontal padding. Section padding 24px.
- **Delight:** Cmd+K palette is the spine of the app. Cmd+. for status changes, J/K vim navigation, instant page transitions (no spinners — optimistic everything). Subtle scale-down on click (`scale(0.98)`). Issue IDs (LIN-1234) are first-class citizens.
- **Integrations:** A "Settings → Integrations" gallery with 32px square logos in a grid, "Connect" buttons, status pill `Connected` in green when active.
- **AI ("Linear Asks"):** Inline within issues, summon with Cmd+K → "Ask AI". Streamed responses appear as a card with a sparkle icon, no avatar. Tool actions render as collapsible "Created issue LIN-1234" pills.

### Vercel dashboard

- **Colors:** True OLED black `#000000`, surface `#0A0A0A`, border `#262626`, text `#EDEDED`, muted `#A1A1A1`. Accent is white text on black, with the geometric Vercel triangle as the only "color" mark. Semantic: success `#0070F3` (yes, blue is success), warning `#F5A623`, danger `#E00`. Geist is the typeface.
- **Typography:** Geist Sans (variable). 14px body, 13px tabular for metrics, 24px H1. Geist Mono for code/IDs.
- **Icons:** Geist Icons (their own set), 16px, 1.5 stroke, monochromatic.
- **Layout:** Top header (no sidebar). Project page uses a 12-column grid with cards at 16px gap. Cards have 1px border, no shadow, `border-radius: 8px`.
- **Delight:** Skeleton loaders that match exact content shape. Project favicons rendered live from screenshots. "Deploy from Git" inline drag-and-drop.
- **Integrations:** Marketplace UI with logos at 48×48 in rounded squares, "Add Integration" button, post-install banner "Installed in 2 projects".
- **AI (v0 in dashboard):** Lives at top-right as a diamond icon, opens a slide-over panel from the right. Streams markdown + code blocks, action chips like "Apply to project".

### Arc browser

- **Colors:** Highly user-themable via "Spaces" — each space has a 2-color gradient (e.g., `#FF6B9D → #FFC371`). Default space: dark `#1C1C1E`, light `#F2F2F7`. Sidebar is the canvas, websites the content.
- **Layout:** Vertical sidebar (200px wide, rounded inner content area with margin around it — windowed, not edge-to-edge). The "rounded everything" look (`border-radius: 12px` on the web view itself).
- **Delight:** Command bar (Cmd+T) replaces address bar entirely. Tabs auto-archive after 12hr. "Little Arc" floating windows. Easels and Notes inline.
- **Inspirational lesson for LifeOS:** Treating the chrome (sidebar) as a *room* rather than a panel — generous margin around the content makes everything feel premium.

### Cron / Notion Calendar

- **Colors:** Dark mode bg `#1C1C1E`, light `#FFFFFF`, calendar event cells use 8% opacity tints of vibrant accents. Today indicator: a red `#FF3B30` line.
- **Typography:** Inter, 12–13px event titles, tabular numerals for times.
- **Icons:** Custom minimal set, 14px, outline.
- **Layout:** Left sidebar 220px showing connected calendars as toggleable colored dots. Main view week-grid with hour labels at 11px.
- **Delight:** Cmd+K to jump to date, type natural language ("next thu 3pm"). Time zone slider at the bottom. Drag-to-create event with live duration label.
- **Integrations:** Connected accounts shown as Google/iCloud/Outlook icons in a stacked list with sync status dots.

### Raycast

- **Colors:** Window bg `#1C1C1E` (translucent vibrancy on macOS), surface row hover `#2C2C2E`, accent `#FF6363` (their signature coral). Text `#FFFFFF`, muted `#8E8E93`.
- **Typography:** SF Pro at 14px main row, 11px secondary.
- **Icons:** Custom Raycast icon set, 18px square with 6px corner radius, vibrant colored squares (each command has its own color tile).
- **Layout:** 750×475px floating window. Single-column list with 36px tall rows. 16px horizontal padding.
- **Delight:** Inline AI in the same command bar. Quicklinks. Snippets that expand on type. Window management. Per-command keyboard shortcuts shown right-aligned in the row in faint gray.
- **AI (Raycast AI):** Lives in the same command bar — just type "@" or invoke "Ask AI" as a command. Responses stream into a panel below. Tool calls render as named chips ("Read Linear Issue LIN-123").

### Superhuman

- **Colors:** Dark bg `#1A1A1A`, surface `#222222`, accent purple `#A78BFA`, send button `#34D399`. Tasteful, almost zero color usage.
- **Typography:** Inter at 14px. Sender names bold 600, preview lines muted.
- **Layout:** 3-pane: sidebar 220px / list 400px / reader flex. Density: list rows 56px tall (room for sender, subject, preview).
- **Delight:** Every action has a keyboard shortcut. The "Cmd+K" command palette is fully navigable by keyboard. Read statuses, undo send, follow-up reminders, splits.
- **Inspirational lesson:** Onboarding that *teaches* shortcuts is core to retention.

### Things 3

- **Colors:** Light: bg `#F5F5F7`, surface `#FFFFFF`, text `#000000`, muted `#86868B`, accent blue `#007AFF`. Dark: bg `#1C1C1E`, surface `#2C2C2E`. Iconic "areas" use yellow `#FFCC00`.
- **Typography:** SF Pro Rounded — the rounded variant gives it warmth. 16px task titles, 13px notes.
- **Icons:** Custom rounded set, 20px. Filled for selection states.
- **Layout:** Sidebar 240px, content centered max-width 720px. Lots of whitespace. Task rows 32px with a circular checkbox on the left.
- **Delight:** "Magic Plus" — a draggable (+) button you flick anywhere on screen to capture into a list. Today's tasks animate away when checked off (slide + fade). Natural language date input ("tomorrow at noon").

### Notion

- **Colors (light):** bg `#FFFFFF`, surface `#F7F6F3` (ivory), text `#37352F` (warm near-black), muted `#787774`, border `#E9E9E7`. Accents are 10 muted color blocks (`#E9E5E3`, `#FADEC9`, `#FDECC8`, etc.) used for callouts and tags. Dark: `#191919` / `#252525`. Notion's color palette is *desaturated and warm* — never pure black or pure white.
- **Typography:** Default `ui-sans-serif`, "Default Serif" (Lyon Text), or "Default Mono" (iA Writer Mono). 16px body, generous line-height 1.6.
- **Icons:** Custom + emoji-as-icon. Page emoji is the killer feature.
- **Layout:** Sidebar 240px, content column 720px max with side margin auto. Block-based — every paragraph has a +/⋮ handle on hover.
- **Delight:** Slash menu (`/`) for everything. Drag handles. Sync blocks. Database views (table, board, gallery, timeline).
- **AI (Notion AI):** Inline space key in any block, or Cmd+J for a dedicated panel. Generates inside the document — output appears as a normal block you can accept/discard/regenerate.

### Sunsama

- **Colors:** Warm whites `#FAF9F7`, surface `#FFFFFF`, text `#2D2D2D`, muted `#7C7C7C`, accent teal `#4FB6A0` and a gentle peach `#F5A88E`. Deeply opinionated *warm* palette — feels more like a journal than a dashboard.
- **Typography:** Inter at 14–15px, with a slightly serif feel from generous letter spacing.
- **Icons:** Phosphor Icons (regular weight), 16px.
- **Layout:** Day-column kanban (Mon-Fri), each column 280px wide. Task cards with rounded corners (10px), soft shadow `0 1px 3px rgba(0,0,0,0.04)`.
- **Delight:** Daily planning ritual is the entire UX — a guided morning flow with checkpoints. Time estimates per task auto-totalled at the bottom of each day. Calendar overlay.
- **Inspirational lesson:** Opinionated rituals > flexible features.

### Height

- **Colors:** Dark bg `#0F0F10`, surface `#1A1A1B`, accent electric `#5E5CE6`, semantic colors via subtle pills.
- **Layout:** Hybrid — left sidebar with collapsible groups. Multi-tab interface at the top.
- **Delight:** Built-in chat per task. AI auto-categorization. Customizable everything.

### Pitch

- **Colors:** Dark bg `#1A1A1A`, surface `#252525`, accent vibrant `#FF6B35` (coral). Lots of color in the templates themselves.
- **Typography:** Custom "Pitch Sans" — playful, friendly geometric sans.
- **Layout:** Left sidebar slides for content type, top toolbar contextual.
- **Delight:** Real-time multiplayer cursors, AI design suggestions, smart slide layouts.

### Figma

- **Colors:** Bg `#1E1E1E`, surface `#2C2C2C`, panels `#383838`, border `#444444`, text `#FFFFFF`, muted `#B3B3B3`. Accent: the Figma blue `#0D99FF`. Selection cyan `#00B6F0`. Comments yellow `#FFCD29`.
- **Typography:** Inter at 11–12px (very compact), 13px for body.
- **Icons:** Custom Figma icon set, 16px default.
- **Layout:** Two side panels (left layers 240px, right inspector 240px) + top toolbar 40px high. Canvas in the middle. Density is *high*.
- **Delight:** Multiplayer cursors with names, observation mode, live commenting, version history scrubber.

### Cursor (AI code editor)

- **Colors:** Inherits VS Code dark `#1E1E1E`, surface `#252526`, accent `#0098FF`. The AI panel uses a subtle violet tint to differentiate.
- **AI panel:** Right sidebar (~400px wide), composer at the bottom, conversation streams above. Cmd+K for inline edits, Cmd+L for chat, Cmd+I for composer. *The keyboard model is the breakthrough.*
- **Tool calls:** Render as collapsible cards with file paths, diff previews, and "Accept/Reject" buttons. Each tool call has an icon (file, terminal, search).
- **Inspirational lesson for LifeOS Life Coach:** Multiple invocation surfaces (inline edit vs chat vs composer) for different intents.

### Claude.ai

- **Colors:** Light bg `#FAF9F7` (warm ivory — Anthropic's signature), surface `#FFFFFF`, text `#1F1E1D`, muted `#757472`, accent `#C96442` (terracotta). Dark mode `#1F1E1D` / `#262524`.
- **Typography:** Tiempos serif for the brand and message rendering, Styrene B / Inter for UI. Body 16px, line-height 1.7 in conversations.
- **Layout:** Sidebar 260px with conversation list, main column 768px max-width centered. Composer pinned to bottom with attached files as chips above.
- **Delight:** Artifacts (right pane that splits from chat for code/docs), Projects, file uploads with previews.
- **AI patterns:** Streaming tokens with a soft cursor. Tool use ("Searching the web…") renders as inline gray italic status, replaced by a result card when done.

### ChatGPT

- **Colors:** Light `#FFFFFF` / surface `#F7F7F8` / `#ECECF1` / text `#0D0D0D`. Dark `#212121` / `#2F2F2F` / `#FFFFFF`. Accent green `#10A37F` (the brand).
- **Layout:** Sidebar 260px with collapsible folders. Composer pinned bottom with a `+` button for attachments and tools.
- **Delight:** Custom GPTs as a sidebar section, voice mode with animated orb, model switcher in the header.

### Perplexity

- **Colors:** Dark `#191A1A` / surface `#202222` / accent teal `#20B8CD`. Light `#FBFBFA` / surface `#FFFFFF`.
- **Layout:** Centered single column, search bar dominant. Source citations as numbered chips inline with text.
- **Delight:** Citation pills `[1] [2] [3]` that expand to a card on hover. "Related questions" at the bottom. "Pro Search" reasoning steps shown collapsibly.

### Apple Reminders / Notes / Health / Journal

- **Colors:** System UI — `systemBackground`, `secondarySystemBackground`. Reminders: accent per list (red `#FF3B30`, orange `#FF9500`, yellow `#FFCC00`, green `#34C759`, blue `#007AFF`, purple `#AF52DE`, pink `#FF2D55`). The 7-color system.
- **Typography:** SF Pro across the board. 17px body, 13px secondary.
- **Health app:** Categories as colored circular icons (heart = red, activity = orange, sleep = teal). Big numbers at the top of cards (32–40px), label at 13px.
- **Journal app:** Soft gradients per entry, photo as hero, body in serif (New York). Suggestion chips at the top ("Reflect on your day", "Recent activity").
- **Inspirational lesson:** The 7-color list system is the most copyable pattern in productivity software.

### Stoic

- **Colors:** Cream `#F4EEE1`, accent terracotta `#C96442`, deep navy text `#1F1E1D`. Dark mode is a deep blue-black `#0F1419`.
- **Typography:** Serif (Tiempos / Lyon) for prompts, sans for UI.
- **Delight:** Daily prompts feel like an old leather journal. Mood tracker with hand-drawn icons.

### Reflect

- **Colors:** Dark `#0E0E10`, surface `#1A1A1D`, text `#E5E5E5`, accent `#5E6AD2` (Linear-like indigo). Light is warm `#FBFBF8`.
- **Typography:** Inter UI, but body in a serif (New York or similar).
- **Delight:** Bidirectional links visualized as a graph. AI ("Reflect AI") is invoked with `++` in the editor. Voice notes auto-transcribe.

### Mem

- **Colors:** White `#FFFFFF`, surface `#FAFAFA`, text `#1A1A1A`, accent `#7C3AED` (violet). Dark `#0F0F11`.
- **Delight:** Floating capture bar (Cmd+Shift+M) from anywhere in macOS. Auto-tagging via AI.

### Daylio

- **Colors:** White, with five mood colors: rad `#75D701`, good `#7BC4F0`, meh `#FFCC2E`, bad `#FF8E2D`, awful `#FF5A48`. The 5-color mood scale is iconic.
- **Layout:** Bottom tab bar (mobile-first). Calendar view with mood-colored squares.

### Future (fitness coaching)

- **Colors:** Black `#000000` / surface `#1C1C1E` / accent acid green `#C5FF00`. Coach photos as the hero.
- **Typography:** Custom geometric sans, all-caps for emphasis.
- **Inspirational lesson:** Coach-as-relationship UX — chat is the entire interface, not a feature.

### Levels (CGM)

- **Colors:** Black `#000000`, surface `#101010`, accent variable based on glucose zone — green `#00D27A` (in range), yellow `#FFCC00` (caution), red `#FF3B30` (high). The graph is the hero.
- **Layout:** Single big metric at the top, line graph below, food log as cards.

### Whoop

- **Colors:** Dark only `#000000` / `#0A0A0A`. Three brand colors mapped to recovery: red `#E50914` (low), yellow `#FFCC00` (medium), green `#00D27A` (high).
- **Layout:** Three big numbers (Recovery, Strain, Sleep) on the home screen. Everything else is a drill-down.

### Oura

- **Colors:** Cream `#F8F4ED` (light), `#000000` (dark), accent gold `#D4A24C`, ring colors (Sleep `#88C9EC`, Activity `#7EE08F`, Readiness `#9B7EE0`). Three rings = three pillars.
- **Layout:** Big circular score at the top, stat cards below.

### Mymind

- **Colors:** Cream `#F4F0EA`, near-black `#1A1A1A`, no other colors. Aggressive minimalism.
- **Typography:** Custom serif (Tiempos), generous sizes.
- **Layout:** Pinterest-style masonry of saved items.
- **Delight:** Auto-tagging, no folders, search-first.

### Are.na

- **Colors:** White `#FFFFFF`, text `#000000`. Pure black-on-white. Border `#E5E5E5`.
- **Typography:** Custom sans (`Söhne`-like), 14px.
- **Layout:** Channels and blocks, masonry. "No-design" design.

### Akiflow

- **Colors:** Light `#F8F8F9`, surface `#FFFFFF`, accent purple `#6366F1`. Calendar-on-the-right.
- **Layout:** Inbox + day plan side-by-side.
- **Delight:** Universal capture from any app via shortcut. Snooze with natural language.

### Amie

- **Colors:** White `#FFFFFF`, accent vibrant blue `#0066FF`, with playful gradients in headers.
- **Typography:** Inter, friendly weight 500.
- **Delight:** Tasks as "todo blocks" you can drag onto the calendar. Stickers and emoji on tasks. Background music built in.

### Vimcal

- **Colors:** Dark `#0E0E10`, accent indigo `#6366F1`. Light cream `#FAFAFA`.
- **Delight:** Fastest calendar in existence. `Cmd+K` for everything. Hold-to-preview on hover. Time zones in the sidebar.

### Centered

- **Colors:** Dark `#0F0F12`, accent gradient orange-pink `#FF6B6B → #FFC371`.
- **Delight:** Focus music + AI coach that nudges you back to your task. Pomodoro built in.

---

## Part 2 — Synthesis

### 1. Color palette options for LifeOS (10)

Each palette includes: background, surface, surface-hover, border, text, text-muted, accent, accent-hover, accent-glow, success, warning, danger.

#### A. **Graphite** — *editorial & calm, Linear-meets-Vercel*
```
bg            #08090A
bg-subtle     #0D0E10
surface       #131418
surface-hover #1A1B1F
border        #23252B
text          #F7F8F8
text-muted    #8A8F98
accent        #5E6AD2
accent-hover  #7A82E0
accent-glow   rgba(94,106,210,0.12)
success       #4CC38A
warning       #F2C94C
danger        #EB5757
```
*Mood: serious, fast, executive. Inspiration: Linear + Vercel.*

#### B. **Atelier** — *warm ivory & terracotta, Anthropic-style*
```
bg            #FAF9F7
bg-subtle     #F4F2EE
surface       #FFFFFF
surface-hover #F0EDE7
border        #E6E2DA
text          #1F1E1D
text-muted    #757472
accent        #C96442
accent-hover  #B5573A
accent-glow   rgba(201,100,66,0.10)
success       #5B8A6A
warning       #C49A3E
danger        #B85A4A
```
*Mood: warm, literary, like a leather journal. Inspiration: Claude.ai + Stoic + Mymind.*

#### C. **Onyx Pulse** — *OLED black with violet pulse*
```
bg            #000000
bg-subtle     #0A0A0B
surface       #101113
surface-hover #17181B
border        #1F2024
text          #EDEDED
text-muted    #A1A1A1
accent        #8B5CF6
accent-hover  #A78BFA
accent-glow   rgba(139,92,246,0.18)
success       #10B981
warning       #F59E0B
danger        #EF4444
```
*Mood: powerful, AI-native, premium. Inspiration: Vercel + Cursor + Linear v2.*

#### D. **Pearl** — *light and refined, Notion + Things*
```
bg            #FFFFFF
bg-subtle     #FBFAF8
surface       #F7F6F3
surface-hover #EFEEEA
border        #E3E2DE
text          #37352F
text-muted    #787774
accent        #2383E2
accent-hover  #1972C9
accent-glow   rgba(35,131,226,0.10)
success       #4DAB9A
warning       #D9730D
danger        #E03E3E
```
*Mood: classic, neutral, daylight productivity. Inspiration: Notion + Things 3.*

#### E. **Cobalt Night** — *deep navy with cyan accent, Oura-inspired*
```
bg            #0B1320
bg-subtle     #0F1A2C
surface       #15233A
surface-hover #1B2D48
border        #243957
text          #E6EDF7
text-muted    #8FA0BC
accent        #38BDF8
accent-hover  #0EA5E9
accent-glow   rgba(56,189,248,0.15)
success       #34D399
warning       #FBBF24
danger        #F87171
```
*Mood: deep focus, late-night work, calm intensity. Inspiration: Oura + Cron.*

#### F. **Bone** — *paper white with charcoal, archival*
```
bg            #F5F2EB
bg-subtle     #ECE8DE
surface       #FFFFFF
surface-hover #F0EDE3
border        #DDD8CB
text          #1A1816
text-muted    #6B655B
accent        #1A1816
accent-hover  #2C2924
accent-glow   rgba(26,24,22,0.05)
success       #4F7A5C
warning       #B8862F
danger        #A8483A
```
*Mood: monochrome, archival, like a Moleskine. Inspiration: Are.na + Mymind.*

#### G. **Aurora** — *zen cream with sage*
```
bg            #F7F4ED
bg-subtle     #EFEBE0
surface       #FFFFFF
surface-hover #F2EEE3
border        #DDD7C9
text          #2A2723
text-muted    #6B665B
accent        #4E7A5E
accent-hover  #3F6650
accent-glow   rgba(78,122,94,0.10)
success       #5C8B6E
warning       #C49A3E
danger        #BC5A4A
```
*Mood: balanced, biophilic, journaling-friendly. Inspiration: Stoic + Sunsama.*

#### H. **Synthwave** — *deep purple with magenta-amber*
```
bg            #0F0A1E
bg-subtle     #150E26
surface       #1C1530
surface-hover #251D3D
border        #2F2649
text          #F0E6FF
text-muted    #B0A0CC
accent        #F472B6
accent-hover  #EC4899
accent-glow   rgba(244,114,182,0.20)
success       #86EFAC
warning       #FCD34D
danger        #FB7185
```
*Mood: night-owl creator, playful intensity. Inspiration: Pitch + Centered.*

#### I. **Forest Floor** — *deep moss greens*
```
bg            #0A1310
bg-subtle     #0F1B16
surface       #14241D
surface-hover #1B3025
border        #22402F
text          #DCE8E0
text-muted    #8FA89A
accent        #84CC16
accent-hover  #65A30D
accent-glow   rgba(132,204,22,0.15)
success       #4ADE80
warning       #FACC15
danger        #F87171
```
*Mood: grounded, natural, slow productivity. Inspiration: Oak journals + Future app dark mode.*

#### J. **Solar** — *high-contrast warm white with sun-orange*
```
bg            #FFFBF5
bg-subtle     #FFF5E6
surface       #FFFFFF
surface-hover #FFF0DC
border        #F0E0C8
text          #1F1A14
text-muted    #6B5F4D
accent        #F97316
accent-hover  #EA580C
accent-glow   rgba(249,115,22,0.12)
success       #16A34A
warning       #CA8A04
danger        #DC2626
```
*Mood: morning energy, optimistic, alarm-clock wake-up. Inspiration: Sunsama + Apple Journal.*

> **Recommendation:** Ship **Graphite** (default dark) and **Atelier** (default light). Keep **Onyx Pulse** as the "Life Coach mode" theme — its violet plays well with AI features. Add **Pearl** as the second light option.

---

### 2. Icon system options (5)

| Library | Style | Default size | Pros | Cons | LifeOS fit |
|---|---|---|---|---|---|
| **Lucide** | Outline, 1.5 stroke | 24px (use at 16/18) | 1400+ icons, tree-shakeable, MIT, the React community standard, matches Linear's vibe | Slightly thin at 16px on retina | **Top recommendation** — already the de-facto standard, generous coverage for productivity (Calendar, Target, Brain, Sparkles) |
| **Phosphor** | 6 weights (thin → fill, bold, duotone) | 20px | Best variety per icon, beautiful rounded geometry, has *both* outline and filled in one library for selected/unselected states | Slightly larger bundle | Strong second — Sunsama uses it. Pick if you want the "rounded warmth" feel |
| **Tabler Icons** | Outline 1.5 stroke, super geometric | 24px | 4500+ icons (largest free set), MIT, very consistent | Can feel "techy" rather than warm | Good for power-user mode |
| **Heroicons** | Outline + Solid | 24px | Made by Tailwind team, clean | Only ~300 icons, gaps for productivity (no Goal/Habit specific) | Skip — coverage too thin |
| **Custom set** | Bespoke | 16/20/24px | Brand differentiation, no licensing concerns | 100+ hours of work, maintenance burden | Phase 2 — only after the app has a stable feature set |

**Recommended icon usage rules:**
- Sidebar nav icons: 18px outline, 1.5 stroke
- Inline action icons (in buttons): 16px outline
- Empty state hero icons: 32px outline at `--text-muted`
- Active/selected state: switch to filled variant (or use 1px → 2px stroke as a fallback)
- Color: always inherit `currentColor` — never hardcode

---

### 3. Layout density options (5)

#### Comfort 1 — **Spacious** (Things 3 / Sunsama)
- Sidebar width: **260px**
- Content max-width: **720px**, centered
- Page padding: **48px** vertical / **40px** horizontal
- Card padding: **24px**
- Section gap: **32px**
- List row height: **44px** with **16px** horizontal padding
- Border radius: **12px**
- Body font: **15px** / line-height **1.55**

#### Comfort 2 — **Editorial** (Notion / Claude.ai)
- Sidebar width: **240px**
- Content max-width: **768px**
- Page padding: **40px** / **32px**
- Card padding: **20px**
- Section gap: **24px**
- List row height: **40px** with **12px** padding
- Border radius: **8px**
- Body font: **15px** / line-height **1.6**

#### Standard — **Balanced** (Linear-style, recommended default)
- Sidebar width: **240px**
- Content max-width: **1100px** (or full bleed for lists)
- Page padding: **32px** / **24px**
- Card padding: **16px**
- Section gap: **20px**
- List row height: **36px** with **12px** padding
- Border radius: **8px**
- Body font: **14px** / line-height **1.5**

#### Compact — **Power user** (Cursor / Vercel)
- Sidebar width: **220px**
- Content max-width: full bleed
- Page padding: **24px** / **20px**
- Card padding: **12px**
- Section gap: **16px**
- List row height: **32px** with **10px** padding
- Border radius: **6px**
- Body font: **13px** / line-height **1.45**

#### Dense — **Pro / Developer** (Figma / Height)
- Sidebar width: **200px** (collapsible to 48px)
- Content max-width: full bleed
- Page padding: **16px** / **16px**
- Card padding: **8px**
- Section gap: **12px**
- List row height: **28px** with **8px** padding
- Border radius: **4px**
- Body font: **12px** / line-height **1.4**

> **Recommendation:** Default to **Standard** but expose density as a setting (`comfortable | balanced | compact`). Tie this to the existing page-preset system — `journaler` preset → Comfort 2, `developer` preset → Compact, `executive` preset → Standard.

---

### 4. AI assistant placement options for Life Coach (7)

| # | Placement | How invoked | Pattern | Pros | Cons | Reference |
|---|---|---|---|---|---|---|
| **1** | **Right slide-over panel** | Click sparkle icon (top-right) or `Cmd+J` | Panel slides in from right (~420px wide), pushes content. Persists across pages. | Always discoverable, room for streaming + tool calls, doesn't obscure work | Takes screen real estate; mobile needs full-screen variant | Cursor, Notion AI |
| **2** | **Command palette + AI mode** | `Cmd+K` then type or `@` to enter AI mode | Same Cmd+K spine, AI is just one of the verbs. Streaming response in the palette itself. | Single keyboard model for everything; unifies search + create + ask | Less room for long answers; tool call cards feel cramped | Raycast AI, Linear Asks |
| **3** | **Persistent floating orb (FAB)** | Click circular FAB bottom-right | Click expands to a chat bubble that floats above content | Always visible, mobile-friendly | Looks consumer/widget-y; obscures bottom content; not "premium" | Intercom, Drift |
| **4** | **Inline at the top of every page** | Visible composer pinned under the page header | A "Hey Coach…" input bar on every page that streams a response below itself | Discoverable, contextual to current page, encourages use | Always present even when unwanted | Perplexity homepage, ChatGPT |
| **5** | **Dedicated `/coach` page** | Click "Life Coach" in nav | Full-page chat with conversation list sidebar (mini Claude.ai inside LifeOS) | Room for everything, conversation history, files, projects | Context-switching out of work | Claude.ai, ChatGPT |
| **6** | **Inline block insertion** | Type `/coach` or press Space in any editable field | Generates output inside the journal/note as a normal block you can accept/edit | Feels native to writing flows; no context switch | Hard to do tool calls; only useful in editors | Notion AI inline |
| **7** | **Hybrid (recommended)** | All of above wired together | `Cmd+K` quick ask, `Cmd+J` for slide-over panel, `/coach` page for long sessions, `/` slash for inline insertion | Matches user intent: quick question vs conversation vs writing | More to build and onboard | Cursor (Cmd+K, Cmd+L, Cmd+I) |

> **Recommendation:** Ship **option 7 hybrid**. Phase 1: build the right slide-over panel (`Cmd+J`) and the `/coach` page first — they share the same chat component. Phase 2: add Cmd+K AI mode and inline `/coach` slash command. The right-slide-over should: (a) show streaming markdown responses, (b) render tool calls as collapsible cards with icons matching the entity (Task, Goal, Journal), (c) have a "Pin to page" button so the conversation persists when navigating, (d) include a context chip showing what page you're on so the coach knows.

---

### 5. Inspiration grab bag — 15 small delightful features

1. **Magic Plus button (Things 3)** — A draggable `+` button that follows your cursor; flick it onto a list to capture there. LifeOS analogy: a floating capture button that you drop onto Today / Ideas / Wins to route the capture.
2. **Cmd+K for everything (Linear / Raycast)** — Universal command palette with fuzzy search, recent items, and verb-noun grammar ("complete task buy milk"). Non-negotiable for v1.
3. **Optimistic transitions (Linear)** — Pages change instantly; mutations apply optimistically and roll back on error. Combined with subtle `scale(0.98)` on click, the UI feels alive.
4. **Page emoji (Notion)** — Let users set an emoji as the icon for goals, projects, and journals. Single best personalization feature per dollar of effort.
5. **Natural language dates (Sunsama / Vimcal)** — Type "next thu", "in 3 days", "tomorrow 9am" anywhere a date is needed. Use chrono-node.
6. **Citation chips for AI (Perplexity)** — When Life Coach references a task or journal entry, render it as a numbered chip `[1]` that opens a peek card on hover.
7. **Slash menu (Notion)** — `/` in any text field to insert: callout, today's tasks, last journal entry, weekly review template.
8. **Time-zone slider (Cron)** — A horizontal hour scrubber at the bottom of the day plan that lets you compare zones if you're traveling.
9. **Mood scale icons (Daylio)** — 5-step mood scale (rad → awful) with the iconic color ramp `#75D701 → #7BC4F0 → #FFCC2E → #FF8E2D → #FF5A48`. Plug into the journal table directly.
10. **Skeleton loaders that match exact shape (Vercel)** — No spinners. Show the silhouette of the actual content while loading.
11. **Onboarding shortcut training (Superhuman)** — A guided 30-minute first session that teaches keyboard shortcuts via interactive challenges. Earn a "shortcut belt" (white → black).
12. **Streak rings (Oura / Apple Activity)** — Three concentric rings for daily completion of MIT/P1/P2 — the iconic Apple pattern but tied to your day plan instead of fitness.
13. **Drag-to-calendar (Amie / Akiflow)** — Drag a task from the inbox onto a time slot to schedule it. Drag from an idea to a project to promote.
14. **Conversation pins (Cursor)** — Pin a Life Coach conversation to a specific goal or project so it stays attached. Re-opening that goal restores the conversation.
15. **Spotlight focus mode (Centered)** — Cmd+Shift+F enters "focus mode": dims everything except the current task card, starts a Pomodoro, optionally plays ambient music. Auto-prompts you to log a win when complete.

**Bonus #16 — Undo as a first-class citizen (Linear / Superhuman)** — Cmd+Z works on every mutation across the app, surfaced via a brief toast "Task completed — Undo". Already half-built via `mutationLog`.

**Bonus #17 — Shape-of-the-week (Whoop)** — A small horizontal sparkline showing your last 7 days of "wins captured" or "MIT completion" in the sidebar — passive accountability.

---

## Cross-cutting recommendations

- **Typography:** Ship **Satoshi** (already default) but pair it with **New York / Tiempos / Source Serif** for journal entries — the serif/sans contrast is what makes Claude.ai and Stoic feel literary. Use **JetBrains Mono** for IDs, dates, and code blocks.
- **Borders over shadows:** Linear, Vercel, and Cursor all use 1px borders instead of shadows for cards. It scales better across themes and feels more architectural.
- **Tabular numerals:** Always use `font-feature-settings: "tnum"` for any column of numbers (calorie counts, durations, scores). It's a 1-line CSS change with massive impact.
- **Motion budget:** Cap transitions at **150–200ms** with `cubic-bezier(0.4, 0, 0.2, 1)`. Linear's whole "snappy" feel comes from never exceeding 200ms.
- **Empty states:** Treat them as opportunities, not failures. Sunsama's empty Today says "Nothing planned yet — what's the one thing that would make today a win?" with a capture input directly below.
- **Accent restraint:** Linear, Vercel, and Cursor each use exactly *one* accent color and only for primary actions and the current/selected state. Resist the urge to color-code every entity type — let icons do that work instead.
