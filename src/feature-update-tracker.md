# OT² Feature Update Tracker

> Format: Each entry has a status badge — `[PLANNED]` · `[IN PROGRESS]` · `[DEV COMPLETE]` · `[VERIFIED]`
> Baseline: **2026-W16-1** · Last updated: 2026-04-11

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
