# OT² · Running Changelog
**Codebase:** `OT2_v3_Pool_Pod_Blink.jsx` · `OT2_StressTest.jsx`  
**Current Baseline:** `2026-04-11 · Wave Edition · Post-FEAT-018`  
**Linked docs:** `feature-update-tracker.md` · `error-log.md`

> This document is a flat, running list of every completed change — features, fixes and terminology shifts — in plain language. One line or short paragraph per item. Newest entries at the top of each section.
> For full specs, design notes and file-level details see `feature-update-tracker.md` and `error-log.md`.

---

## 📋 Pending Features

| ID | Date | Summary |
|----|------|---------|

---

## ✅ Completed Features

| ID | Date | Summary |
|----|------|---------|
| FEAT-023 | 2026-04-16 | **Obsidian-style relationship graph visualization** — redesigned relationship graph with force-directed layout simulation; nodes repel each other while connected nodes attract; hover to highlight connections; relationship types shown with icons and colors (Blocks ⏸️, Pairs With 👥, Helps Reach 🎯, Repeats As 🔁) |
| FEAT-022 | 2026-04-16 | **Focus Mode navigation and task graph change handling** — clicking task title now always goes to initial Focus Mode screen (project/linkage selection) not questions page; added warning dialog when changing task graph that links to other tasks will be removed; relationships enforced to be within same task graph |
| FEAT-021 | 2026-04-16 | **Freedom Mode unresolved tasks UX** — current session tasks visible immediately below input; changed "Show pending Captures" to "Unresolved Tasks" header; removed toggle button for ADHD-friendly design |
| FEAT-019 | 2026-04-16 | **Relationship types redesign** — new ADHD-friendly types (Blocks ⏸️, Pairs With 👥, Helps Reach 🎯, Repeats As 🔁) replacing old types (Precedes, Follows, Scheduled With, Accomplishes With); data migration helper for backward compatibility; AI-generated "What It Means" explanations stored at relationship creation; RelationshipListTable component replacing List Waves view for Pools; updated all text references throughout app |
| FEAT-020 | 2026-04-16 | **Recurrence redesign** — new recurrence types (Daily, Specific weekdays, Every N with Days/Weeks toggle, X times per month, Annual); extended data shape with startDate, everyN, unit, trackers array; migration helper for old data; redesigned Focus Mode UI with type-specific blocks and tracker subsection (fixed alignment); extended recurrence logs structure with status, trackerValues, review fields; updated logging UI to support multiple trackers; updated recurrenceSummaryLine function |
| FEAT-018 | 2026-04-11 | **Tailwind polyfill** — SVG icon size classes (`w-3` → `w-10`) injected at runtime so icons render correctly in all deployment environments, not just Claude preview |
| FEAT-017 | 2026-04-11 | **Pool strategy filter** — Pools context now has the same `as [List / Kanban / DailyZen / WorkIQ 4×4]` dropdown as Waves; each context keeps its own independent strategy state |
| FEAT-016 | 2026-04-10 | **Work Mode two-level filter + Wave terminology** — see sub-items below |
| FEAT-015 | 2026-04-10 | **PodView PROTECTED** — component locked against accidental regression; do not modify without explicit request |
| FEAT-014 | 2026-04-08 | **Editable reviews** — users can edit satisfaction rating and improvement notes on completed tasks in Review Mode |
| FEAT-013 | 2026-04-08 | **Completed tasks in Review Mode** — completed tasks shown with strikethrough; "Reactivate" button moves them back to pending |
| FEAT-012 | 2026-04-08 | **Pool Relationship Graph** — SVG circular node graph inside Pool view; click a node to open that task in Focus Mode |
| FEAT-011 | 2026-04-08 | **Completed tasks hidden from Work Mode** — they move to Review Mode only |
| FEAT-010 | 2026-04-08 | **"Start Work Block" with Pause + Stop** — Play button replaced with labelled text button; both Pause and Stop shown simultaneously when timer is running |
| FEAT-009 | 2026-04-08 | **List Waves view** (was "List Blinks") — default Work Mode view; single-cell layout with task name, type badge, and "Reason to do" answer bullets |
| FEAT-008 | 2026-04-08 | **Pool/Pod ComboBox with inline Create** — search-as-you-type dropdowns; typing a new name surfaces an inline Create button |
| FEAT-007 | 2026-04-08 | **Focus button pulse animation** — red background + CSS pulse on Focus button in Freedom Mode to guide users to the next step |
| FEAT-006 | 2026-04-08 | **Rich text input in Freedom Mode** — multiline textarea with Bold / Italic / List toolbar; Enter = new line, Cmd+Enter = submit |
| FEAT-005 | 2026-03-22 | **Freedom Mode hides qualified tasks** — tasks with at least one Socratic answer are no longer shown in Freedom Mode |
| FEAT-004 | 2026-03-22 | **Focus button in Work Mode** — every task card has a ⏳ Focus button that jumps directly to Focus Mode for that task |
| FEAT-003 | 2026-03-22 | **Socratic answers inline in Work Mode** `[PLANNED]` — awaiting design decisions on collapse behaviour and table column format |
| FEAT-002 | 2026-03-22 | **"Help me with more questions" link** — appears on the Focus Mode completion card; calls AI coaching with existing answers as context; disappears after one use |
| FEAT-001 | 2026-03-22 | **Hero tagline** updated to "Fast capture, Socratic Clarity, Timed Execution, Zen Learnings" |

---

### FEAT-016 detail — Wave Terminology + Work Mode redesign (2026-04-10)

**Terminology — Blink → Wave (global):**
- Task type `'blink'` renamed to `'wave'` in all task objects, state initialisers, badge labels, and seed data
- Focus Mode type radio: "⚡ Blink" → "⚡ Wave"
- Landing page feature card, heading, and all UI labels updated
- `blinkBadge` style kept for backward compat; `waveBadge` added as canonical style

**Work Mode — Level 1 Context Filter (`Waves | Pools | Pods`):**
- Default: **Waves** — shows only standalone tasks (no Pool, no Pod assignment)
- Pool tasks are removed from Waves and appear only under Pools context
- Pod tasks are removed from Waves and appear only under Pods context

**Work Mode — Level 2 Strategy Filter (`List | Kanban | DailyZen | WorkIQ 4×4`):**
- Visible when context is Waves (or Pools, added in FEAT-017)
- Default: **List**

**DailyZen view** (replaced the old "Energy" view):
- AI scores each wave on content + reflection signals
- Surfaces: 🧠 **1 Deep Work** task · ⚡ **3 Necessity** tasks · 🌊 **5 Lighten Up** tasks
- Scoring: complexity/depth keywords → Deep Work; urgency/deadline keywords → Necessity; easy/quick keywords → Lighten Up

**WorkIQ 4×4 view** (new — Eisenhower-inspired):
- ✅ **Standard Work** (top-left) — routine, familiar, competent work
- 🧘 **Mindful Work** (top-right) — work you want to do but need support with
- 🤝 **New Work** (bottom-left) — work done with partners, team, or vendors
- 🔄 **Needs Replacement** (bottom-right) — work you're not good at; find someone else
- AI classifies using task content + all Focus Mode reflection answers

**Pod Work Mode hardening:**
- Future calendar dates: locked (35% opacity, non-interactive, tooltip "Future dates are locked")
- Historical edit window: extended from 5 days to **7 days past** (today inclusive)
- Legend text updated to reflect new rules

---

## 🐛 Pending Bug Fixes

| ID | Date | Summary |
|----|------|---------|

---

## 🐛 Completed Bug Fixes

| ID | Date | Summary |
|----|------|---------|
| ERR-020 | 2026-04-16 | **Work Mode last pool not persisted** — added localStorage persistence for selectedPoolId; last worked task graph now loads as default view when entering Work Mode |
| ERR-019 | 2026-04-16 | **Work Mode dropdown not focused** — added useRef to context filter dropdown and useEffect to focus it when WorkMode mounts for better UX |
| ERR-018 | 2026-04-16 | **Link task button not working in Focus Mode** — addRelationship function used undefined focusedTaskId instead of task.id; fixed to use task.id so relationships are properly created |
| ERR-017 | 2026-04-16 | **Duplicate relationship type** — removed "Repeats As" from RELATIONSHIP_TYPES since it's redundant with the recurring function; kept only Blocks, Pairs With, and Helps Reach |
| ERR-016 | 2026-04-16 | **Relationship graph arrows not showing** — arrow marker fill changed from hardcoded "#6366F1" to "currentColor" to properly inherit relationship type colors |
| ERR-015 | 2026-04-16 | **Relationship graph blank screen** — force-directed layout simulation in FEAT-023 caused rendering issues; reverted to simple circular layout with new relationship types (Blocks, Pairs With, Helps Reach, Repeats As) preserved; added null check and informative message for single task with no relationships case |
| ERR-014 | 2026-04-16 | **Focus Mode blank screen from Freedom Mode** — warning dialog in FocusMode referenced undefined variables (showPoolChangeWarning, cancelPoolChange, confirmPoolChange) from main component scope; removed warning dialog and unused state/functions; core FEAT-022 functionality (always go to initial screen) preserved |

| ID | Date | Summary |
|----|------|---------|
| ERR-012 | 2026-04-16 | **Dropdown missing unassociated tasks** — added Waves option to Work Mode context filter dropdown to show unassociated tasks |
| ERR-011 | 2026-04-16 | **Link button not responding** — added click handler to NavDropdown items to close dropdown and provide feedback |
| ERR-010 | 2026-04-16 | **Dropdown not retaining focus** — added focus management to PoolComboBox to retain focus after selection |
| ERR-013 | 2026-04-16 | **List view not showing tasks** — RelationshipListTable replacement only showed relationships, not tasks; reverted to original task card display |
| ERR-009 | 2026-04-11 | **Focus Mode grey gap** — progress dots rendered one dot per pending task with `flexWrap:wrap`; with 50–200 tasks this produced a massive grey grid. Fixed: capped at 20 dots + `+N` overflow counter, `flexWrap:nowrap`, `maxHeight:20px`, hidden when only 1 task |
| ERR-008 | 2026-04-10 | **Pod future dates were editable; 5-day window too short** — added `d <= today` guard; extended past edit window to 7 days; visual opacity cue added for locked cells |
| ERR-007 | 2026-04-10 | **PodView regressed during FEAT-006–014** — accidentally simplified; reverted to baseline 2026-W15-3 with full AnnualDatesView and RecurringView sub-components |
| ERR-006 | 2026-03-22 | **"Triumphs" still in revolving banner** — removed from `T_WORDS` array |
| ERR-005 | 2026-03-22 | **Focus Mode blank on re-entry** — `startFocus()` was clearing answers unconditionally; now seeds from `task.reflection` if present |
| ERR-004 | 2026-03-22 | **Annual date picker defaulted to year 2000** — input value now uses current year when no date pre-selected |
| ERR-003 | 2026-03-22 | **Pods view always reverted to latest pod** — same root cause as ERR-001; `selectedPoolId` lift applied to PoolView too |
| ERR-002 | 2026-03-22 | **"Tracks" and "Traction" in revolving banner** — removed from `T_WORDS` array |
| ERR-001 | 2026-03-22 | **Pod sidebar selection didn't persist** — `PodView` was declared inside `WorkMode` (inner arrow function); lifted `selectedPodId` state to `WorkMode` level |

---

## 🏗️ Architecture & State Notes

| Topic | Detail |
|-------|--------|
| **Task type field** | `'wave'` (standalone) · `'pool'` (in a pool) · `'pod'` (in a pod) |
| **Wave definition** | `pendingTasks.filter(t => !(t.poolIds?.length) && !t.podId)` |
| **Work Mode state** | `contextFilter` (`waves`/`pools`/`pods`) + `strategyView` (waves strategy) + `poolStrategyView` (pools strategy) |
| **PodView** | `selectedPodId` lifted to WorkMode; protected — do not modify without explicit request (FEAT-015) |
| **PoolView** | `selectedPoolId` lifted to WorkMode |
| **Icon sizing** | All SVG icons use Tailwind class names; polyfill injected in `styleSheet` at app mount |
| **Progress dots** | Capped at 20; `+N` counter for overflow; `flexWrap:nowrap`; `maxHeight:20px` |
| **Pod edit window** | `d <= today && d >= addDays(today, -7)` — today + past 7 days only |

---

## 📁 File Reference

| File | Role |
|------|------|
| `OT2_v3_Pool_Pod_Blink.jsx` | Main app — production component |
| `OT2_StressTest.jsx` | Stress test — 550 seeded tasks, debug overlays |
| `OT2_StressTest_baseline_2026-W15-3.jsx` | Read-only archived baseline (do not edit) |
| `feature-update-tracker.md` | Full spec for each feature request |
| `error-log.md` | Full root-cause and fix detail for each bug |
| `OT2_CHANGELOG.md` | This document — flat running summary |
| `00_EXECUTIVE_SUMMARY.md` | SIGMA strategic document (ALGAI product suite) |

---

_Last updated: 2026-04-11_
