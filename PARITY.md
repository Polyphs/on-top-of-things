# OT² StressTest v3 Parity Status

**Last Updated:** 2026-04-17  
**Source:** OT2_v3_Pool_Pod_Blink.jsx → OT2_StressTest.jsx

## Summary

This document tracks the feature parity between the v3 Pool/Pod/Blink codebase and the StressTest implementation. The goal is to bring StressTest to full v3 feature parity while retaining its debug overlays, performance instrumentation, and seed data generation capabilities.

---

## ✅ Completed (High Priority)

### 1. Constants & Helpers
- [x] `RELATIONSHIP_TYPES` updated to v3 (`blocks`, `pairs_with`, `helps_reach`)
- [x] `RECURRENCE_TYPES` updated with `every_n` (days/weeks) and `annual`
- [x] `migrateRelationshipType()` helper for backward compatibility
- [x] `migrateRecurrence()` helper for data migration
- [x] `recurrenceSummaryLine()` replaces `podSummaryLine()`
- [x] `AICoachingService` with `generateQuestions()` and `analyzeTaskContent()`
- [x] `STORAGE_KEYS` updated with `RECURRENCE_LOGS` and `MIGRATION_VERSION`

### 2. Main App State & Functions
- [x] `recurrenceLogs` state added with persistence
- [x] `focusedTaskId` (string) replaces `focusedTask` (object)
- [x] `focusRecurringEnabled`, `focusRecurrence`, `focusTrackerLabel` states
- [x] Removed `focusPodId`, `focusPodTaskDate` states
- [x] `startFocus()` initializes recurrence state
- [x] `finishFocus()` saves recurrence data to tasks
- [x] `updateTaskContent()` function for title editing
- [x] `recurrenceLogKey()`, `getRecurrenceLog()`, `setRecurrenceLog()` helpers
- [x] Migration useEffect for legacy pod data → recurring tasks

### 3. Seed Data Generator
- [x] New relationship types (`blocks`, `pairs_with`, `helps_reach`)
- [x] Recurrence fields added to pool tasks
- [x] Pod tasks converted to pool tasks with recurrence
- [x] Removed `podId` and `podTaskDate` from tasks

### 4. Components

#### FreedomMode
- [x] Added `completedTasks` prop
- [x] Task Graph badge (⧉) for non-wave tasks
- [x] Recurring badge (〜) for tasks with `recurrenceEnabled`

#### PoolComboBox
- [x] "Task Graph" terminology
- [x] ⧉ icon instead of ⊕
- [x] `inputRef` prop for focus management

#### PodComboBox
- [x] **REMOVED** (replaced by in-Task-Graph recurrence)

#### PoolRelationshipPanel (NEW)
- [x] Shows existing relationships in pool
- [x] Add new relationships between tasks
- [x] Uses GitBranch icon

#### RelationshipListTable (NEW)
- [x] Compact table display of relationships
- [x] Shows icon, type label, and linked task name

#### DoneCard (NEW)
- [x] Info strip showing pool/recurrence/reflection data
- [x] "Task Qualified!" success state
- [x] Done and Skip buttons

#### FocusMode
- [x] Removed Pod type option
- [x] Added recurring toggle inside Task Graph
- [x] Full recurrence editor (type, days, every N, monthly, annual)
- [x] Tracker label input
- [x] AI coaching integration with `AICoachingService.generateQuestions()`
- [x] Title editing with Edit icon
- [x] Info strip showing pool/recurrence context
- [x] Uses DoneCard component for success state
- [x] Question header with "Well defined" badge when applicable

#### WorkMode
- [x] Removed pods from props (using recurrence helpers instead)
- [x] Added Ripples context (〜) for recurring tasks
- [x] `RippleTaskCard` component with daily check-in buttons
- [x] Task Graph (⧉) and Recurring (〜) badges
- [x] Removed 30-item cap from context

#### ReviewMode
- [x] Removed 30-item cap from completed tasks list

#### RelationshipGraph
- [x] Arrow markers for relationship lines
- [x] Updated to use new relationship types
- [x] ⧉ Task Graph title

### 5. Icons
- [x] Added: TaskGraph, Ripple, GitBranch, Coffee, Clock, Calendar, Mail, Lock, User, Feather, Zap, X, Edit, Bold, Italic, List, Lightbulb, RotateCcw

### 6. Styles
- [x] Added `select` style for dropdown inputs
- [x] Updated badge colors for v3 consistency

---

## 🔄 Migration Path

1. **First load with new code:**
   - Migration useEffect runs (version check)
   - Old pod tasks converted to pool tasks with `recurrenceEnabled: true`
   - Old recurrence types migrated (`every_n_days` → `every_n` with `unit: 'days'`)
   - Old relationship types migrated via `migrateRelationshipType()`
   - Migration version stored in localStorage

2. **LocalStorage keys preserved:**
   - `ot2_pods` and `ot2_pod_logs` retained for reference
   - New key: `ot2_recurrence_logs` for daily check-ins

---

## 📝 Known Differences (StressTest Retained)

| Feature | v3 | StressTest |
|---------|-----|------------|
| Debug overlays | ❌ | ✅ DEBUG_MODE |
| Performance timing | ❌ | ✅ useDebugTimer |
| Seed data generation | Manual | ✅ generateSeedData() |
| Task counts | Normal | ✅ 200+ freedom, 550+ work, 500+ completed |
| Stress testing | ❌ | ✅ Built-in |

---

## 🎯 Next Steps (If Any)

All planned parity items have been implemented. The codebase now has full v3 feature parity while retaining all StressTest-specific instrumentation.

---

## File Locations

- **v3 Source:** `src/OT2_v3_Pool_Pod_Blink.jsx`
- **StressTest Target:** `src/OT2_StressTest.jsx`
- **This Document:** `PARITY.md`
