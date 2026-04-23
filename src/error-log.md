# OT² Error Log

> Format: Each entry has a status badge — `[OPEN]` · `[DEV COMPLETE]` · `[VERIFIED]`
> Baseline: **2026-W17-1** · Last updated: 2026-04-23

---

## ERR-034 · Annual recurrence date picker shows year 2000 instead of selected year `[DEV COMPLETE]`

**Reported:** 2026-04-23 (W17-d03)  
**Mode:** Focus Mode → Associate Step → Recurring Tasks

**Description:** When selecting an annual recurrence date using the date picker, the input displays the correct month/day but the year shows as "2000" instead of the current year (2026). The date picker UI itself shows 2026, but after selection the displayed value becomes "23-04-2000".

**Root Cause:** The annual recurrence date input uses `value={focusRecurrence.annualMonthDay ? `2000-${focusRecurrence.annualMonthDay}` : ''}` which hardcodes year 2000 as a placeholder. The `annualMonthDay` field only stores MM-DD format, not the full date. When parsing/displaying, the year 2000 is shown instead of being masked or replaced with current year.

**Fix:** Replaced `type="date"` input with `type="text"` input that accepts MM-DD format directly. Added input validation to allow only numbers and dashes. Added `onBlur` auto-formatting that converts "0501" to "05-01". Added placeholder text "MM-DD" and example hint "e.g., 01-25". This eliminates the year display issue entirely.

**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`

---

## ERR-033 · Freedom Mode tasks skip Socratic Clarity and go straight to Associate `[DEV COMPLETE]`

**Reported:** 2026-04-23 (W17-d03)  
**Mode:** Focus Mode → New Task Flow

**Description:** When a task is created in Freedom Mode and then opened in Focus Mode, it incorrectly starts at the "Associate" step (task type selection, pool assignment) instead of the "Socratic Clarity" step. The new flow (FEAT-037) requires ALL tasks to start with Socratic questions first, regardless of origin.

**Root Cause:** The `startFocus` function or `FocusMode` component initialization may be checking if a task already has associations (poolIds, type) and skipping the Socratic step. Alternatively, the `focusPhase` state may not be initialized to 'clarity' for new tasks from Freedom Mode.

**Fix:** Changed `setFocusPhase('associate')` to `setFocusPhase('clarity')` in the `startFocus` function. All tasks now enter Focus Mode at the Socratic Clarity step regardless of origin (Freedom Mode, existing tasks, etc.).

**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`

---

## ERR-032 · Recurring task dropdown menus not working after selection `[DEV COMPLETE]`

**Reported:** 2026-04-23 (W17-d03)  
**Mode:** Focus Mode → Associate Step
**Description:** After selecting a recurrence type from the dropdown (e.g., "Specific days of week"), the type-specific configuration blocks (week day buttons, Every N inputs, etc.) are not displayed. The dropdown appears to accept the selection but the UI doesn't update to show the relevant configuration options.
**Root Cause:** During FEAT-037 (2-Step Focus Mode rewrite), the type-specific recurrence configuration blocks were removed from the Associate step to simplify the UI, but this broke the expected behavior where selecting a recurrence type should reveal its configuration options.
**Fix:** Add back the type-specific recurrence configuration blocks (specific_days, every_n, monthly_frequency, annual) that respond to `focusRecurrence.type` changes. Display them conditionally below the recurrence type dropdown.
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`

---

## ERR-031 · Tagline removed during header refactor `[DEV COMPLETE]`

**Reported:** 2026-04-21 (W17-d01)  
**Mode:** Global Header
**Description:** During FEAT-028 (inline hero integration), the tagline "Fast capture, Socratic Clarity, Timed Execution, Zen Learnings" was accidentally removed from the header. Only the hero title remained.
**Root Cause:** The initial inline hero implementation only included the `<h1>` title, missing the `<p>` subtitle paragraph.
**Fix:** Added `inlineHeroSubtitle` style and restored the `<p>` tagline element inside the `inlineHero` wrapper div. Adjusted padding to accommodate the two-line header content.
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`

---

## ERR-030 · Focus Mode textarea loses focus on Next/Back/Skip `[DEV COMPLETE]`

**Reported:** 2026-04-18 (W16-d06)
**Mode:** Focus Mode → Socratic Questions
**Description:** After clicking Next/Back/Skip, the textarea on the new question was not focused. User had to click inside it before typing, then click Next again — requiring two mouse interactions per question.
**Root Cause:** `autoFocus` only fires on initial mount, not on re-renders when `wizardStep` changes.
**Fix:** Extracted `WizardTextarea` as a top-level React component (before `DoneCard`). Parent wizard card now has `key={wizardStep}` which forces a full remount on each step — `WizardTextarea`'s `useEffect` then calls `ref.current.focus()` immediately. Added Ctrl/Cmd+Enter keyboard shortcut to advance step without touching the mouse.
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`

---

## ERR-029 · Dropdown and combobox close on hover / require multiple clicks `[DEV COMPLETE]`

**Reported:** 2026-04-18 (W16-d06)
**Mode:** Focus Mode → Task Graph combobox; Focus Mode → Ripple combobox; Header nav dropdowns; Dormant task toggle
**Description:** Dropdowns closed when moving the mouse over items, requiring multiple attempts to click. Same issue on the "Show dormant tasks" disclosure toggle — the arrow was unresponsive on first click.
**Root Cause:** `document.addEventListener('mousedown', outsideClickHandler)` fired when the user pressed the mouse button *on a dropdown item*, because at that moment the item was technically inside the document but the focus was leaving the input — causing the handler to race and close the dropdown before the click registered on the item.
**Fix:** Changed all dropdown item interactions from `onClick` to `onMouseDown` with `e.preventDefault()`. This prevents the blur event from firing before selection and ensures the outside-click handler never sees the item click as an "outside" event. Added `onMouseEnter/Leave` hover highlighting to all items for clear visual feedback. Applied to: `PoolComboBox`, `PodComboBox`, `NavDropdown`.
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`

---

## ERR-028 · Data migration — `helps_reach` → `results_in` (FEAT-025) `[DEV COMPLETE]`

**Reported:** 2026-04-18
**Mode:** Global — localStorage task data, StressTest seeder
**Description:** FEAT-025 renames `helps_reach` to `results_in`. Any existing task relationships stored with `type: 'helps_reach'` must be silently migrated on load. StressTest seeder pools also referenced `helps_reach` in round-robin relationship assignment.
**Fix:** `migrateRelationshipType` extended: `'helps_reach' → 'results_in'`. Seeder updated to use `['blocks', 'pairs_with', 'enables', 'results_in']` array. Migration runs on every task load so no data loss occurs.
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`, `OT2_StressTest.jsx`

---

## ERR-027 · Focus Mode "Link tasks" button does nothing `[DEV COMPLETE]`

**Reported:** 2026-04-17
**Mode:** Focus Mode → Task Graph → Set relationships
**Description:** When selecting tasks and clicking "Link tasks" button, nothing happens. Relationships are not created and no error is shown.
**Root Cause:** Typo in `addRelationship` function inside `FocusMode` component. Line 1787 called `generateRelationship(task.id, ...)` but the async function was declared as `generateExplanation` (line 1769). This caused a `ReferenceError: generateRelationship is not defined` that silently failed.
**Fix:** Changed `generateRelationship(task.id, ...)` to `generateExplanation(task.id, ...)` on line 1787.
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`

---

## ERR-001 · Pods view — left panel selection does not persist `[DEV COMPLETE]`

**Reported:** 2026-03-22  
**Mode:** Work Mode → Pods view  
**Description:** Clicking a Pod on the left sidebar reverts the selection back to the last (most recently created) Pod.  
**Root Cause:** `PodView` was declared as an arrow function *inside* `WorkMode`. React treats it as a brand-new component on every parent re-render, resetting local `useState`.  
**Fix:** Lifted `selectedPodId` state up to `WorkMode` level so it survives re-renders.  
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`

---

## ERR-002 · Revolving banner includes "Tracks" and "Traction" `[DEV COMPLETE]`

**Reported:** 2026-03-22  
**Mode:** Landing page hero  
**Description:** The rotating T-words banner cycles through "Tracks" and "Traction" which are not product-meaningful words.  
**Fix:** Removed both from the `T_WORDS` array.  
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`

---

## ERR-003 · Pods view — latest Pod always default-selected even after clicking another `[DEV COMPLETE]`

**Reported:** 2026-03-22  
**Mode:** Work Mode → Pods view  
**Description:** Duplicate of root cause described in ERR-001. The `useState(pods[0]?.id)` initialiser inside the inner component function always re-ran.  
**Fix:** Same fix as ERR-001. Also applied the same fix to `PoolView`'s `selectedPoolId`.  
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`

---

## ERR-004 · Annual Date pod — date picker defaults to year 2000 `[DEV COMPLETE]`

**Reported:** 2026-03-22  
**Mode:** Focus Mode → Pod selection → Annual Dates  
**Description:** When an Annual Dates pod is selected in Focus Mode, the date input used `2000-MM-DD` as its value, causing the browser date picker to open at year 2000.  
**Fix:** Changed the input value to use the current year when no date is pre-selected.  
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`

---

## ERR-005 · Focus Mode — previous answers not shown for editing `[DEV COMPLETE]`

**Reported:** 2026-03-22  
**Mode:** Focus Mode — Socratic questioning wizard  
**Description:** When a task that was previously partially focused is re-entered, the wizard fields are blank — previous answers are lost.  
**Root Cause:** `startFocus()` called `setWizardAnswers({})` unconditionally, discarding any existing `task.reflection`.  
**Fix:** `startFocus()` now seeds `wizardAnswers` from `task.reflection` if present. FocusMode question-init effect uses `task.reflection?.[q.key]` as fallback.  
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`, `OT2_StressTest.jsx`

---

## ERR-006 · "Triumphs" still in revolving banner `[DEV COMPLETE]`

**Reported:** 2026-03-22  
**Mode:** Landing page hero  
**Description:** "Triumphs" was not removed in the previous banner cleanup (ERR-002 only removed "Tracks" and "Traction").  
**Fix:** Removed "Triumphs" from `T_WORDS` array.  
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`, `OT2_StressTest.jsx`

---

## ERR-007 · Pod View — functionality regressed during feature updates `[DEV COMPLETE]`

**Reported:** 2026-04-10  
**Mode:** Work Mode → Pods view  
**Description:** During FEAT-006 to FEAT-014 updates, PodView was inadvertently simplified — losing the left sidebar, AnnualDatesView urgency bands, RecurringView calendar grid, status cycling, and tracker fields.  
**Root Cause:** PodView was rewritten with a simpler implementation instead of preserving existing complex functionality.  
**Fix:** Reverted PodView to baseline 2026-W15-3 version with full AnnualDatesView and RecurringView sub-components.  
**Prevention:** PodView is now marked PROTECTED (FEAT-015).  
**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`

---

## ERR-008 · Pod View — future dates were editable; edit window too short `[DEV COMPLETE]`

**Reported:** 2026-04-10  
**Mode:** Work Mode → Pods → Recurring Schedule  
**Description:** Two issues in the RecurringView calendar grid:
1. Future-date cells were interactive — users could mark status or fill tracker fields for days not yet happened.
2. Historical edit window (5 days) was too restrictive; users needed to edit up to 7 days in the past.

**Fix:**
- Added `d <= today` guard to `canEdit`: future cells now show at 35% opacity, are non-interactive, tooltip reads "Future dates are locked".
- Extended past edit window from `addDays(today, -5)` to `addDays(today, -7)`.
- Updated legend text: "future dates locked · editable: today & past 7 days".

**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`

---

## ERR-009 · Deployment — SVG icons render oversized; layout broken outside Claude preview `[DEV COMPLETE]`

**Reported:** 2026-04-11  
**Mode:** All modes — visible only in production deployment, not in Claude preview  
**Description:** All SVG icon components use Tailwind class names (`w-4 h-4`, `w-8 h-8`, etc.) for sizing. Claude's preview environment has Tailwind loaded globally so icons render correctly there. In production deployments without Tailwind, icons fall back to their native unconstrained size — producing a giant lightbulb in Freedom Mode, oversized icons throughout, and broken layout spacing.

**Root Cause:** The app's inline CSS injection (`styleSheet`) only contained the `@keyframes pulse` animation — no Tailwind size utilities.

**Fix:** Added all 8 commonly-used Tailwind size utility classes (`w-3` through `w-10`, and their `h-` counterparts) directly into the `<style>` tag the app injects at startup. Self-contained, works in any environment.

**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`, `OT2_StressTest.jsx`

---

## ERR-010 · Focus Mode — progress dots block creates large empty gap between nav and content `[DEV COMPLETE]`

**Reported:** 2026-04-11  
**Mode:** Focus Mode — between mode nav bar and "Currently focusing on:" header  
**Description:** The progress dots strip renders one dot per pending task. With `flexWrap: 'wrap'` and 50–200+ tasks, it wraps into a massive multi-row grid that fills the entire space between the navigation bar and the focus card — appearing as a large grey dotted area.

**Root Cause:** `pendingTasks.map(...)` with no cap + `flexWrap: 'wrap'` + no height constraint.

**Fix:**
- Capped visible dots at **20 maximum** — if more tasks exist, a compact `+N` counter appears instead.
- Changed `flexWrap` to `'nowrap'` — dots stay on a single line and cannot wrap.
- Added `maxHeight: 20` as a hard ceiling.
- Dots section is hidden entirely when there is only 1 pending task (no progress to show).

**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`, `OT2_StressTest.jsx`

---

_Last updated: 2026-04-11_

---

## ERR-009 · Focus Mode — progress dots created massive grey gap in deployed build `[DEV COMPLETE]`

**Reported:** 2026-04-11  
**Mode:** Focus Mode — top of screen, between nav bar and "Currently focusing on:" header  
**Description:** A large grey dotted area appeared between the navigation bar and the focus card in the deployed app. It was not visible in Claude's preview environment. The gap scaled in height with the number of pending tasks — with 50–200 tasks it could fill the entire viewport.

**Root Cause:** The progress-dots strip rendered one `<div>` per pending task (`pendingTasks.map(…)`). The container style used `flexWrap: 'wrap'`, so with many tasks the dots wrapped into multiple rows and produced a dense grid. In Claude's preview there are typically few tasks, so the problem was invisible there.

**Fix (both files):**
- **Capped render at 20 dots** — additional tasks shown as a compact `+N` counter inline
- **`flexWrap: 'nowrap'`** — dots can never wrap to a second row
- **`maxHeight: 20px`** — hard ceiling enforced at the CSS level
- **Hidden when only 1 task** — a single dot for a single task adds no information
- Tooltip reads "Future dates are locked" / "Locked (older than 7 days)" to distinguish the two locked states  

**Files changed:** `OT2_v3_Pool_Pod_Blink.jsx`, `OT2_StressTest.jsx`

---

_Last updated: 2026-04-11_
