# OT² Feature Parity — v3 vs StressTest

> This tracks which features exist in each file so we can sync them incrementally.
> Status: `[v3 only]` · `[stress only]` · `[both]` · `[sync pending]`

---

## Core Architecture

| Feature | v3 (OT2_v3_Pool_Pod_Blink) | StressTest (OT2_StressTest) |
|---|---|---|
| localStorage persistence | ✅ All 7 keys | ✅ All 7 keys + SEEDED |
| `useMemo` for derived state | ❌ plain filter | ✅ pendingTasks, completedTasks, freedomTasks |
| VirtualList (virtualised rendering) | ❌ renders all DOM nodes | ✅ ~20 visible nodes at a time |
| DEBUG_MODE timing overlays | ❌ | ✅ per-view ms, colour-coded |
| Data seeder (SeederPanel) | ❌ | ✅ 550+ tasks, 500 reviews |
| Auth system (login/signup) | ✅ | ❌ |
| Timer localStorage persistence | ✅ | ❌ (timers reset on reload) |

---

## Freedom Mode

| Feature | v3 | StressTest |
|---|---|---|
| Add task input + Enter key | ✅ | ❌ (demo only, no add) |
| Delete task button | ✅ | ❌ |
| Focus button per task | ✅ | ✅ |
| FEAT-005: hide qualified tasks | ✅ | ✅ |
| Qualified-tasks count hint banner | ✅ | ✅ |
| Search/filter tasks | ❌ | ✅ (virtualised) |
| Task index number | ❌ | ✅ (#N) |

---

## Focus Mode

| Feature | v3 | StressTest |
|---|---|---|
| Progress dots | ✅ | ✅ (capped at 20 + overflow count) |
| Blink / Pool / Pod type selection | ✅ full (radio + sub-UI) | ✅ simplified (radio only, no sub-UI) |
| Pool ComboBox (search + create) | ✅ | ❌ `[sync pending]` |
| Pool Relationship Panel | ✅ | ❌ `[sync pending]` |
| Pod Picker + Pod Creator | ✅ full | ❌ `[sync pending]` |
| Annual date picker per task | ✅ | ❌ `[sync pending]` |
| AI Coaching Service (dynamic questions) | ✅ (Anthropic API + local fallback) | ❌ fallback only |
| Pre-fill answers from task.reflection | ✅ ERR-005 | ✅ ERR-005 |
| Skip type gate if already qualified | ✅ | ✅ |
| DoneCard with AI "more questions" link | ✅ (real API call) | ✅ (600ms simulated) |
| Answer summary on done card | ❌ | ✅ |
| focusPodTaskDate state | ✅ | ❌ |

---

## Work Mode Views

| View | v3 | StressTest |
|---|---|---|
| Table view | ✅ | ✅ virtualised |
| Kanban view | ✅ | ✅ virtualised per lane |
| Quadrant / Eisenhower Matrix | ✅ | ❌ `[sync pending]` |
| Energy view (high/medium/low) | ✅ | ❌ `[sync pending]` |
| Journal / Week calendar view | ✅ | ❌ `[sync pending]` |
| Pool view | ✅ | ✅ + overview grid |
| Pod view — annual dates (countdown) | ✅ | ✅ |
| Pod view — recurring (calendar grid) | ✅ | ✅ |
| FEAT-004: Focus button on task rows | ✅ (FocusBtn) | ✅ (FocusBtn) |
| selectedPoolId / selectedPodId lifted (ERR-001) | ✅ | ✅ |
| Review modal after task complete | ✅ | ❌ |

---

## Review Mode

| Feature | v3 | StressTest |
|---|---|---|
| Stat cards (completed, avg rating, etc.) | ✅ | ✅ |
| Rating distribution bar chart | ❌ | ✅ `[sync pending — add to v3]` |
| Filter by star rating | ❌ | ✅ `[sync pending — add to v3]` |
| Virtualised review list | ❌ | ✅ |
| Submit review after task complete | ✅ | ❌ (no completeTask review flow) |

---

## Header / Navigation

| Feature | v3 | StressTest |
|---|---|---|
| Video modal (About the App) | ✅ | ❌ |
| Resources / Contact nav dropdowns | ✅ | ❌ |
| Task count in header | ❌ | ✅ (DEBUG_MODE) |
| Reset data button | ❌ | ✅ |

---

## Sync Priority (next iterations)

1. **Add VirtualList to v3** — most impactful, prevents DOM slowdown with real user data
2. **Add Quadrant + Energy views to StressTest** — investors see the full Work Mode
3. **Add Review rating distribution chart to v3** — nice visual
4. **Add useMemo to v3 derived state** — minor perf win
5. **Add Pool/Pod sub-UI to StressTest Focus Mode** — so both show full Pool/Pod creation

---

_Last updated: 2026-04-05_
