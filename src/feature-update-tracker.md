# OT² Feature Update Tracker

> Format: Each entry has a status badge — `[PLANNED]` · `[IN PROGRESS]` · `[DEV COMPLETE]` · `[VERIFIED]`
> Baseline: **2026-W17-1** · Last updated: 2026-04-23 · FEAT-040 DEV COMPLETE

---

## FEAT-037 · Focus Mode — 2-Step Flow (Socratic Clarity → Associate) `[DEV COMPLETE]`

**Requested:** 2026-04-23 (W17-d03) · Revised 2026-04-23  
**Location:** Focus Mode

**Description:** Streamlined Focus Mode with revised flow: Start with Socratic reflection to understand the task deeply, then use AI-suggested associations based on answers.

- **Step 1: Socratic Clarity** — 3 profound questions displayed on ONE page. Each question is greyed out until user focuses on its answer box (progressive disclosure). Questions drawn from static pool covering WHY (purpose), HOW (approach), and WHY NOW (urgency). All 3 answers captured before moving forward.
- **Step 2: Associate** — AI analyzes Socratic answers and suggests: (a) whether this should be Wave or Task Graph, (b) which existing Pool it likely belongs to, (c) which tasks it might relate to (pairing suggestions). User reviews AI suggestions and confirms/modifies. Then sets recurrence if applicable.

**Key improvements:**
- **Breadcrumb navigation** showing current step (Socratic Clarity → Associate)
- **3 questions on one page** — no clicking Next/Back between questions
- **Progressive focus** — Questions greyed until focused, reducing visual overwhelm
- **AI-powered association suggestions** based on Socratic answers
- **Fixed recurring task menus** — Type-specific blocks now display correctly

**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`  
**Backups:** `OT2_v3_Pool_Pod_Blink-2026-w17-d03-b1.jsx`, `OT2_v3_Pool_Pod_Blink-2026-w17-d03-b2.jsx`

---

## FEAT-038 · ADHD-Friendly Kanban Redesign — Today, Next, Waitlist, Paused `[DEV COMPLETE]`

**Requested:** 2026-04-23 (W17-d03)  
**Location:** Work Mode → Kanban View

**Description:** Replaced deadline-based Kanban columns (Today/Future/Missed/Not Planned) with ADHD-centric workflow lanes that guide users through a natural task lifecycle. Columns now reflect task *state* rather than arbitrary deadlines.

- **Today** — Tasks that demand immediate attention: recurring tasks, tasks with Socratic answers that are blockers/enablers, or relationship-critical items. Color: Red (#FF6B6B) for urgency.
- **Next** — Qualified tasks (have Socratic answers from Focus Mode) with explicit timelines/deadlines. Ready to schedule. Color: Blue (#3B82F6) for clarity.
- **Waitlist** — Tasks qualified through Focus Mode but not yet started (no timer activity) or missing deadlines. The "someday" queue. Color: Purple (#A855F7) for possibility.
- **Paused** — Tasks inactive for 10+ days (no edits, no timer activity). AI-suggested for review/archival. Color: Grey (#9CA3AF) for dormancy.

**Key improvements:**
- **State-based workflow** mirrors how ADHD brains actually process work (urgent → planned → someday → stale)
- **Automatic categorization** via `categorizeForKanban()` function using Socratic answers, recurrence, relationships, timer activity, and `updatedAt` timestamps
- **Progressive qualification** — Tasks naturally flow: Waitlist (just captured) → Next (qualified with deadline) → Today (do now) → Paused (stale)
- **Visual subtitles** explain each column's purpose ("Do now", "Qualified & timed", etc.)
- **Contextual empty states** guide users ("No qualified tasks — use Focus Mode")
- **Automatic stale detection** — 10-day inactivity threshold moves tasks to Paused

**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`  
**Backup:** `OT2_v3_Pool_Pod_Blink-2026-w17-d03-b3.jsx`

---

## FEAT-040 · Marketplace Seeding Update (Latest Architecture) `[DEV COMPLETE]`

**Requested:** 2026-04-23 (W17-d03)  
**Location:** Marketplace Modal & Seeding Logic

**Description:** The Marketplace functionality (pre-built AI-seeded apps) has been rewritten to mirror the latest OT² architecture. It no longer creates legacy "Pods", but instead correctly seeds data using the unified `Task Graph` + `Ripples` (recurring tasks) + `One-off Tasks` structure.

**Key improvements:**
- **Schema Update:** Replaced legacy `pools` and `pods` keys in `MARKETPLACE_TEMPLATES` with `taskGraphs`, `ripples`, and `tasks`.
- **Accurate Ripples Seeding:** Seeded ripples are now created correctly as `tasks` with `type: 'pool'` and `recurrenceEnabled: true`.
- **Rich Seed Data:** Included base Socratic answers (`reflection`) for each seeded task (e.g., urgency, deadline, why/how/now). This ensures that immediately after seeding, the Kanban board populates beautifully into 'Today', 'Next', and 'Waitlist' lanes based on the new ADHD categorization rules.
- **One-off Tasks:** Each template now also seeds a handful of one-off tasks (e.g., "Buy NCERT Textbooks", "Book Flights") to provide immediate value.
- **UI Updates:** The Marketplace modal renders the exact count of Task Graphs, Ripples, and pre-seeded tasks.

**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`  
**Backup:** `OT2_v3_Pool_Pod_Blink-2026-w17-d03-b6.jsx`

---

## FEAT-039 · Drag-and-Drop Task Reordering with Persistent Position `[DEV COMPLETE]`

**Requested:** 2026-04-23 (W17-d03)  
**Location:** Work Mode → Kanban, WorkIQ 4×4, DailyZen

**Description:** Users can now drag and drop tasks between columns, quadrants, and zones. Manual positioning overrides AI categorization and persists across sessions. This gives users agency to reclassify tasks based on their current context and priorities.

**Supported Views:**
- **Kanban** — Drag between Today/Next/Waitlist/Paused columns
- **WorkIQ 4×4** — Drag between Standard/Mindful/New/Replacement quadrants  
- **DailyZen** — Drag between Deep Work/Necessity/Lighten Up zones

**Implementation Details:**
- **Native HTML5 Drag & Drop API** — No external dependencies, lightweight
- **`manualPosition` task field** — Stores `kanbanLane`, `workIQQuadrant`, `dailyZenZone` overrides
- **`updateTaskManualPosition()` function** — Updates task with manual classification
- **Categorization functions updated** — Check `manualPosition` first, then fall back to AI logic
- **`DraggableTaskCard` wrapper** — Handles `dragstart` with JSON payload `{taskId, dragType}`
- **Drop zone visual feedback** — Highlight on drag over, dashed border, opacity changes
- **Updated help text** — "AI suggests, you decide" messaging across views

**Key improvements:**
- **User agency** — Override AI suggestions when context changes
- **Visual feedback** — Clear indication of drop targets during drag
- **Persistence** — Manual positions saved to localStorage via task state
- **Cross-view consistency** — Same drag-and-drop pattern in all three strategy views
- **Graceful fallback** — Empty zones show "Drop here" hint during drag

**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`  
**Backup:** `OT2_v3_Pool_Pod_Blink-2026-w17-d03-b5.jsx`

---

## FEAT-036 · ADHD UX Enhancements — Micro-Prompts, Time Anchor, Dopamine Loop `[PLANNED]`

**Requested:** 2026-04-23 (W17-d03)  
**Location:** Freedom Mode & Work Mode

**Description:** Low-cognitive-load features targeting ADHD personas. 
- **Rotating Micro-Prompts:** Freedom Mode input cycles prompts every 5 seconds ("What's on your mind?", "What are you avoiding?") to break blank-page paralysis.
- **Time Anchor (Visual Timer):** Work Mode timer shows a shrinking progress bar/circle, not just numbers, to combat time blindness.
- **Micro-Celebration:** Satisfying confetti/sound on task complete for dopamine reward.
- **Guilt-Free Reset:** "Fresh Start" button appears after 48h absence — moves all overdue to "Paused" state, preventing task bankruptcy shame.

---

## FEAT-035 · User-Contributed Marketplace `[PLANNED]`

**Requested:** 2026-04-23 (W17-d03)  
**Location:** Marketplace Modal & Supabase backend

**Description:** Transition from hardcoded `MARKETPLACE_TEMPLATES` to user-generated marketplace.
- **Creator Flow:** Export successful Task Graph → anonymize personal data → publish as template.
- **Pricing:** Standardized tiers (Free / Standard ~$5). Stripe Connect for automatic 70/30 revenue split (creator/platform).
- **IP Protection:** Supabase RLS ensures `payload` JSON only readable after purchase/unlock.

---

## FEAT-034 · Notifications & Reminders `[PLANNED]`

**Requested:** 2026-04-23 (W17-d03)  
**Location:** Global & Settings

**Description:** Multi-channel reminder architecture:
- **Phase 1 (Free):** Browser push notifications, daily digest at chosen time.
- **Phase 2 (Premium Coral):** WhatsApp/Telegram/SMS via Twilio API.
- **Phase 3:** Alarm-style wake-up notifications for critical routines (fullscreen + audio).

---

## FEAT-033 · AI Architect (Task Graph Generation) `[PLANNED]`

**Requested:** 2026-04-23 (W17-d03)  
**Location:** Freedom Mode

**Description:** AI-driven marketplace seeding. Toggle "AI Architect" in Freedom Mode → multiline project prompt → Supabase Edge Function → GPT-4o generates complete Task Graph (Pools, Pods, Tasks, Relationships) with Socratic clarifying questions → Preview → Seed.

---

## FEAT-032 · Review Mode — Star Rating Highlight Fix `[DEV COMPLETE]`

**Requested:** 2026-04-22 (W17-d02)  
**Location:** Review Mode

**Description:** Star rating buttons now highlight all stars ≤ selected rating. Fixed by changing `editRating === r` to `editRating >= r` in button style logic. Applied to both initial review form and edit review form.

**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`  
**Backup:** None (docs update)

---

## FEAT-031 · Review Mode — Hide CTA for Authenticated Users `[DEV COMPLETE]`

**Requested:** 2026-04-22 (W17-d02)  
**Location:** Review Mode bottom

**Description:** "Create Free Account" button and promotional text now hidden via `{!isAuthenticated && (...)}` check when user is signed in.

**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`  
**Backup:** None (docs update)

---

## FEAT-030 · Auth — Support all TEST_USERS in signIn `[DEV COMPLETE]`

**Requested:** 2026-04-22 (W17-d02)  
**Location:** `useAuth` hook

**Description:** `signIn` function now iterates through `TEST_USERS` array instead of hardcoded single demo check. Supports `demo@ot2.app` and `test@example.com`.

**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`  
**Backup:** None (docs update)

---

## FEAT-029 · Auth — Session Persistence via localStorage `[DEV COMPLETE]`

**Requested:** 2026-04-22 (W17-d02)  
**Location:** `useAuth` hook

**Description:** User sessions persist across page refreshes and Netlify deployments.
- `useState` initializer reads from `localStorage.getItem('ot2_user')`
- `signIn`/`signUp` write to `localStorage.setItem('ot2_user', JSON.stringify(userData))`
- `signOut` removes the key

**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`  
**Backup:** None (docs update)

---

## FEAT-028 · Header Banner — Inline Hero Integration `[DEV COMPLETE]`

**Requested:** 2026-04-21 (W17-d01)  
**Location:** Global header

**Description:** Eliminated separate hero section to maximize content area. Moved hero title (with rotating T-words) and tagline inline into sticky header between logo and user actions. Added `inlineHero`, `inlineHeroTitle`, `inlineHeroSubtitle` styles.

**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`  
**Backup:** None (docs update)

---

## FEAT-027 · Work Mode — Relationship banners link to related task via ↗ View `[DEV COMPLETE]`

**Requested:** 2026-04-20 (W17-d01)
**Location:** Work Mode → TaskCard relationship banners

**Description:** Each relationship banner ("⏸ Waiting for...", "🔗 Do alongside...", "💡 Finishing X may speed up...", "🔀 Completing this may lead to...", "⏳ Available once...") now has a small **↗ View** button on the right side. Clicking it scrolls to the related task card within Work Mode and highlights it with a brief amber flash animation. The task title click (→ Focus Mode for editing) is unchanged.

**Implementation:**
- `otherTaskId` added to every banner object in `buildBanners()` and the `blocked-only` fallback banner
- `scrollToTask(targetId)` helper: `getElementById('task-card-{id}')` → `scrollIntoView({behavior:'smooth', block:'center'})` → adds `task-card-flash` CSS class for 900ms
- Task card root `<div>` gets `id={task-card-{task.id}}` for scroll targeting
- `@keyframes taskCardFlash` injected into the global `styleSheet`: amber glow `#FFFBEB` background + `rgba(251,191,36)` box-shadow ring, fades out over 900ms
- `.task-card-flash` CSS class applied transiently via `classList.add/remove`
- View button styled to match banner color (border, text) with white background — visually cohesive per relationship type

**Behaviour preserved:** Task title click still opens Focus Mode. Focus button still opens Focus Mode. Only the ↗ View button scrolls within Work Mode.

**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`
**Backup:** `OT2_v3_Pool_Pod_Blink-2026-w16-d06-b5.jsx`

---

## FEAT-026 · Recurring Tasks — Schedule-Aware Display + Calendar Widget `[DEV COMPLETE]`

**Requested:** 2026-04-18 (W16-d06)
**Location:** Work Mode → Task Graphs → Recurring view

**Description:** Recurring tasks now respect their actual schedule. Tasks not due today show a dormant state instead of active check-in buttons.

**Changes:**
- `isScheduledOnDate(task, dateStr)` — pure helper, covers all recurrence types (daily, specific_days, every_n, monthly_frequency, annual)
- `getNextScheduledDate(task, fromDate)` — scans forward up to 366 days for next due date
- `formatFriendlyDate(dateStr)` — formats YYYY-MM-DD to "Mon 20 Apr"
- **Due today** → full interactive card with Planned/Done/Skipped + trackers, sorted by relationship priority (blocks → pairs_with → enables → results_in → unlinked)
- **Not due today (dormant)** → muted card, title + "🔜 Next: Mon 20 Apr", no action buttons
- **"Hide dormant" toggle** (default ON) — collapsed by default, expandable
- **List / Calendar tab toggle** above the recurring section
- **`RecurringCalendarWidget`** — three views:
  - **Week**: 7-column Mon–Sun grid, day chips colour-coded by relationship priority, click to expand day detail
  - **Month**: full calendar grid, dot indicator per day (green=all done, amber=partial, red=missed, grey=pending)
  - **Year**: 12 mini heatmap months, click day → jumps to Week view on that date
- **Expanded day panel**: shows full task cards for any selected day; past/today show log buttons; future shows "Upcoming — log available on the day"
- Task count badge: "N recurring · M due today"

**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`, `codingstandards.md`
**Backup:** `OT2_v3_Pool_Pod_Blink-2026-w16-d06-b1.jsx`

---

## FEAT-025 · Relationship Type Redesign — 4 Semantic Types with Work Mode Behaviour + Sort Filter `[DEV COMPLETE]`

**Requested:** 2026-04-18
**Location:** Focus Mode → Task Graph relationships; Work Mode → all views (List, Kanban, DailyZen, WorkIQ 4×4); Relationship Graph SVG

**Description:** Replace the existing 3 relationship types (`blocks`, `pairs_with`, `helps_reach`) with 4 semantically richer types that drive real behaviour in Work Mode views and the relationship graph visualisation.

### New Relationship Types

| Key | Label | Direction | Meaning |
|---|---|---|---|
| `blocks` | **Blocks** | Unidirectional → | Task A must complete before Task B can start. Task B is locked in Work Mode until A is marked complete. |
| `enables` | **Enables** | Unidirectional ╌╌ (dashed, no arrowhead) | Task C is optional but speeds up Task D. Task D shows a soft suggestion nudge. |
| `pairs_with` | **Pairs With** | Bidirectional ↔ | Task E and F must be done together. Both show the other task's title and the shared Task Graph goal. |
| `results_in` | **Results Either In** | Unidirectional → fork | Task X upon completion determines whether Task Y or Task Z proceeds. Both Y and Z are soft-locked until X completes, but only one will be chosen. |

### Work Mode Behaviour per Type

- **Blocks:** Timer and task title on the blocked task are greyed/disabled. Banner: *"⏸ Waiting for [Task A] to be marked complete"*
- **Enables:** Soft suggestion on the enabled task: *"💡 Finishing [Task C] may speed up this task"*
- **Pairs With:** Both tasks show: *"🔗 Do alongside [Task F] to meet [Graph title] requirements"*
- **Results Either In:** Downstream tasks Y and Z show: *"⏳ Available once [Task X] is complete — one path will be chosen"*

### Priority Sort Order (all views)
1. 🔴 Blocker tasks (tasks that are currently blocking others)
2. 🟣 Paired tasks
3. 🟡 Enabler tasks
4. 🔵 Resultant-Either tasks
5. ⚪ Unlinked waves

### Sort Filter
Dropdown added to List / Kanban / DailyZen / WorkIQ 4×4 headers alongside existing strategy dropdown: `Sort by: [Default] [Blockers first] [Paired] [Enablers] [Resultants]`

### Graph Visualisation
- **Blocks:** Solid directed arrow →, indigo `#6366F1`
- **Enables:** Dashed line ╌╌, no arrowhead, amber `#F59E0B`
- **Pairs With:** Bidirectional ↔, green `#10B981`; all transitively paired tasks share one bounding rectangle
- **Results Either In:** Two separate solid arrows from X → Y and X → Z, violet `#8B5CF6`

### Data Migration
`helps_reach` → `results_in` via `migrateRelationshipType`. Old seeded data in StressTest updated to use new keys.

**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`, `OT2_StressTest.jsx`, `relationship-regression-tests.jsx`

---

## FEAT-001 · Hero subtext updated `[DEV COMPLETE]`

**Requested:** 2026-03-22  
**Description:** Change the landing page hero subtitle from "Capture fast. Focus deep. Execute with clarity." to the four-pillar tagline:  
> **"Fast capture, Socratic Clarity, Timed Execution, Zen Learnings"**  
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`

---

## FEAT-002 · Focus Mode — "Help me with more qualifying questions" AI link `[DEV COMPLETE]`

**Requested:** 2026-03-22  
**Location:** Focus Mode — the "Ready to work!" completion card, above the "Go to Work Mode" button  
**Description:** Add a small link: *"Help me with more qualifying questions"*. When clicked, it calls the AI coaching service using all previous answers as context and generates 3 additional Socratic questions. The user answers them and they are appended to `wizardAnswers`. The link disappears after it has been used once per task to prevent infinite loops.  
**Design notes:**  
- Uses existing `AICoachingService.getCoachingQuestions()` pattern  
- Passes `existingReflections: wizardAnswers` so AI knows what has already been answered  
- Appends the 3 new questions to the existing question list and resumes the wizard  
- Link is hidden once extended questions have been requested  
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`

---

## FEAT-003 · Work Mode — show Socratic answers inline below tasks `[PLANNED]`

**Requested:** 2026-03-22  
**Location:** Work Mode — all views (List, Kanban, DailyZen, WorkIQ 4×4, Pool, Pods)  
**Description:** All answers captured during Focus Mode Socratic questioning should be displayed in Work Mode views. In card-based views they appear as a short paragraph below the task title. In List view they show as labeled bullets in a "Reason to do" section.  
**Design notes to confirm before dev:**  
- Should the paragraph be collapsed by default (click to expand) or always visible?  
- Should empty answers be hidden or shown as "—"?  
**Status:** Awaiting design decisions above before implementation.  
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx` _(pending)_

---

## FEAT-004 · Focus Mode accessible from Work Mode task click `[DEV COMPLETE]`

**Requested:** 2026-03-22  
**Location:** Work Mode — all views  
**Description:** Each task card in Work Mode has a Focus button (⏳). Clicking it sets that task as the focused task and switches directly to Focus Mode.  
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`, `OT2_StressTest.jsx`

---

## FEAT-005 · Freedom Mode hides tasks already qualified in Focus Mode `[DEV COMPLETE]`

**Requested:** 2026-03-22  
**Location:** Freedom Mode task list  
**Description:** Tasks that have at least one non-empty Socratic answer are no longer shown in Freedom Mode. Freedom Mode is for raw, unqualified captures only.  
**Logic:** A task is hidden from Freedom if `task.reflection` exists and `Object.values(task.reflection).some(v => v && v.trim())` is true.  
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`, `OT2_StressTest.jsx`

---

## FEAT-006 · Freedom Mode — Rich Text Input with Multiline Support `[DEV COMPLETE]`

**Requested:** 2026-04-08  
**Location:** Freedom Mode — task input area  
**Description:** The text input has been upgraded to a multiline textarea with a rich text toolbar (Bold, Italic, List buttons). Enter key creates new lines; Cmd/Ctrl+Enter submits the task. Added instruction hint below: "After adding tasks, click the Focus button to visualize and qualify the work."  
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`, `OT2_StressTest.jsx`

---

## FEAT-007 · Freedom Mode — Highlighted Focus Button `[DEV COMPLETE]`

**Requested:** 2026-04-08  
**Location:** Freedom Mode — task list items  
**Description:** The Focus button on each task is now highlighted with a red background and pulse animation to draw attention and guide ADHD users to the next step.  
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`, `OT2_StressTest.jsx`

---

## FEAT-008 · Focus Mode — Pool/Pod ComboBox with Inline Create `[DEV COMPLETE]`

**Requested:** 2026-04-08  
**Location:** Focus Mode — Pool and Pod selection  
**Description:** The Pool and Pod selection dropdowns are now combo boxes with search functionality. When typing a name that doesn't exist, an inline "Create" button appears next to the input field.  
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`

---

## FEAT-009 · Work Mode — "List Waves" View with "Reason to Do" `[DEV COMPLETE]`

**Requested:** 2026-04-08  
**Location:** Work Mode — default view (previously "List Blinks", now "List Waves")  
**Description:** The default Work Mode view shows task name, type badge, and all Focus Mode answers as labeled bullets in a "Reason to do" section. Labels include: Deadline, Outcome, Motivation, Complexity, Urgency.  
**Note:** Originally called "List Blinks" — renamed to "List Waves" in FEAT-016.  
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`, `OT2_StressTest.jsx`

---

## FEAT-010 · Work Mode — "Start Work Block" with Pause & Stop Buttons `[DEV COMPLETE]`

**Requested:** 2026-04-08  
**Location:** Work Mode — timer controls  
**Description:** The Play button has been replaced with "Start Work Block" text button. When running, both Pause AND Stop buttons are shown simultaneously.  
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`, `OT2_StressTest.jsx`

---

## FEAT-011 · Work Mode — Completed Tasks Hidden (Move to Review) `[DEV COMPLETE]`

**Requested:** 2026-04-08  
**Location:** Work Mode — all views  
**Description:** Completed tasks are now completely hidden from Work Mode. They only appear in Review Mode.  
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`, `OT2_StressTest.jsx`

---

## FEAT-012 · Work Mode — Pool Relationship Graph Visualization `[DEV COMPLETE]`

**Requested:** 2026-04-08  
**Location:** Work Mode → Pools context  
**Description:** Inside Pool view, a "Relationship Graph" toggle shows an interactive SVG flowchart with circular node layout. Nodes represent tasks in the pool; clicking a node navigates to Focus Mode for that task.  
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`, `OT2_StressTest.jsx`

---

## FEAT-013 · Review Mode — Completed Tasks with Reactivation `[DEV COMPLETE]`

**Requested:** 2026-04-08  
**Location:** Review Mode  
**Description:** Completed tasks appear in Review Mode with strikethrough styling. Clicking "Reactivate" moves a task back to pending status in Work Mode.  
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`, `OT2_StressTest.jsx`

---

## FEAT-014 · Review Mode — Editable Reviews `[DEV COMPLETE]`

**Requested:** 2026-04-08  
**Location:** Review Mode — completed task cards  
**Description:** Users can edit their review feedback and rating for completed tasks by clicking an Edit button.  
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`, `OT2_StressTest.jsx`

---

## FEAT-015 · Pod View — PROTECTED Component (Do Not Modify) `[LOCKED]`

**Established:** 2026-04-10  
**Location:** Work Mode → Pods view  
**Description:** The PodView component is marked as **PROTECTED**. See original FEAT-015 entry for full spec.  
**Protected sub-components:** Left sidebar · AnnualDatesView · RecurringView  
**Files:** `OT2_v3_Pool_Pod_Blink.jsx`

---

## FEAT-016 · Work Mode — Two-Level Filter, DailyZen, WorkIQ 4×4 & Wave Terminology `[DEV COMPLETE]`

**Requested:** 2026-04-10  
**Location:** Work Mode (all strategy views) · Global terminology  

**Terminology — "Waves":**
- All task/note objects formerly called "Blinks" are now called **Waves** across all documents and code.
- Task `type: 'blink'` renamed to `type: 'wave'` in all state, seed data, and badge labels.
- FeatureCard, landing page heading, Focus Mode type selector all updated.
- Backward-compat guard kept: tasks with legacy `type: 'blink'` still render the Wave badge.

**Work Mode — Level 1 Context Filter** (`Waves | Pools | Pods`):
- Default context is **Waves** — shows only standalone tasks (no Pool/Pod assignment).
- Pool tasks are hidden from Waves view; appear only in Pools context.
- Pod tasks are hidden from Waves view; appear only in Pods context.

**Work Mode — Level 2 Strategy Filter** (`List | Kanban | DailyZen | WorkIQ 4×4`):
- Visible when Waves or Pools context is selected (see FEAT-017 for Pools).
- Default strategy is **List**.
- **DailyZen** (replaces "Energy"): AI scores each wave and presents 1 Deep Work / 3 Necessity / 5 Lighten Up tasks.
- **WorkIQ 4×4** (new, Eisenhower-inspired): AI slots waves into four quadrants:
  - Q1 (✅ Standard Work): Work that I am good at
  - Q2 (🧘 Mindful Work): Work I want to do & need support
  - Q3 (🤝 New Work): Work I can do with partners / vendors
  - Q4 (🔄 Needs Replacement): Work I am not good at — find someone

**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`, `OT2_StressTest.jsx`, `feature-update-tracker.md`, `error-log.md`

---

## FEAT-017 · Work Mode — Pool Strategy Views (List / Kanban / DailyZen / WorkIQ 4×4) `[DEV COMPLETE]`

**Requested:** 2026-04-11  
**Location:** Work Mode → Pools context  
**Description:** The Pools context now shares the same Level 2 strategy dropdown as Waves. After selecting a Pool, users can view its tasks in any of the four strategies — each with its own independent state so switching Pool strategy doesn't affect the Wave strategy setting.

**Implementation:**
- Added `poolStrategyView` state (default `'list'`) separate from `strategyView`.
- The `as [strategy]` dropdown appears for both `waves` and `pools` contexts.
- `OT2_StressTest.jsx`: shared `StrategyRenderer` component accepts any task list + strategy, reused for both Waves and Pool contexts — no logic duplication.
- Relationship Graph toggle continues to work in all Pool strategies (overrides strategy when checked).

**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`, `OT2_StressTest.jsx`

---

## FEAT-018 · Pod Work Mode — Future Date Lockout & Extended Edit Window `[DEV COMPLETE]`

**Requested:** 2026-04-10  
**Location:** Work Mode → Pods context → RecurringView calendar grid  
**Description:** Two policy changes to Pod calendar interaction:
1. **Future dates locked**: cells for dates after today are dimmed (35% opacity), non-clickable, and show tooltip "Future dates are locked". Applies to both status cycling and all tracker fields.
2. **Edit window extended**: historical edit window changed from 5 days to **7 days** (today inclusive). Entries older than 7 days are locked with tooltip "Locked (older than 7 days)".
3. **Selected Pod retained**: `selectedPodId` state lives at WorkMode level — survives context filter switches.

**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`

---

_Last updated: 2026-04-11_

---

## FEAT-017 · Work Mode — Pool Context gets full Strategy Filter `[DEV COMPLETE]`

**Requested:** 2026-04-11  
**Location:** Work Mode → Pools context  
**Description:** The strategy-view dropdown (`List | Kanban | DailyZen | WorkIQ 4×4`) that was introduced in FEAT-016 for the Waves context is now also available when the Pools context is selected. Each context maintains its own independent strategy state (`strategyView` for Waves, `poolStrategyView` for Pools) so switching strategies in one context does not affect the other.

**Pool strategy behaviours:**
- **List** — flat `TaskCard` list of tasks in the selected pool (default)
- **Kanban** — deadline lanes (Today / Future / Missed / Not Planned) populated from pool tasks only
- **DailyZen** — AI 1 Deep Work / 3 Necessity / 5 Lighten Up, scored from pool tasks, banner names the pool
- **WorkIQ 4×4** — quadrant grid from pool tasks, banner names the pool
- Relationship Graph toggle overrides the strategy when checked

**UX:** The `as [strategy ▼]` dropdown appears in the header whenever the context is Waves **or** Pools; it is hidden for Pods (Pods has its own fixed calendar view).  
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`, `OT2_StressTest.jsx`

---

## FEAT-018 · Global — Tailwind size-class polyfill injected at runtime `[DEV COMPLETE]`

**Requested:** 2026-04-11  
**Location:** Global — `styleSheet` injected on app mount  
**Description:** All SVG icons use Tailwind class names (`w-3`, `w-4`, `w-6`, `w-8`, etc.) for sizing. In Claude's preview environment Tailwind is globally loaded, so icons render correctly. In external deployments (Vercel, Netlify, raw React) Tailwind is absent and icons fall back to their native unconstrained dimensions, producing giant icons and layout gaps.

**Fix:** The existing `styleSheet` injection (used for the `@keyframes pulse` animation) now also injects CSS rules for every Tailwind size class used by the icon set: `w-3 / h-3` through `w-10 / h-10`. The rules use `!important` to ensure they take precedence even if a partial Tailwind build is present.  
**Classes covered:** `.w-3`, `.h-3`, `.w-3\.5`, `.h-3\.5`, `.w-4`, `.h-4`, `.w-5`, `.h-5`, `.w-6`, `.h-6`, `.w-8`, `.h-8`, `.w-10`, `.h-10`  
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`, `OT2_StressTest.jsx`

---

_Last updated: 2026-04-11_
