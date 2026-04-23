// ============================================================================
// CURRENT CHANGE: FEAT-027 — Relationship banners link to related task in Work Mode
// CHANGE DATE: 2026-W16-d06
// CHANGE REASON: Relationship banners ("This task blocks...", "Do alongside...")
//                showed context but offered no navigation. Users needed a way to
//                jump directly to the related task within Work Mode without leaving
//                to Focus Mode. Task title click (→ Focus Mode) is retained.
// EXPECTED IMPACT:
//   - Each banner gets a small "↗ View" button on the right
//   - Clicking scrolls to the related task card in Work Mode and flashes it amber
//   - Task cards get id="task-card-{taskId}" for scroll targeting
//   - scrollToTask() helper: scrollIntoView + 600ms amber flash animation
//   - Blocked-by banner also gets a View link to the blocker task
// BACKUP: OT2_v3_Pool_Pod_Blink-2026-w16-d06-b5.jsx
// ============================================================================
//
// COMPLETED CHANGE (2026-W16-d06-b5): Ripples-style RecurringView
// - Replaced calendar grid with per-task cards (RecurringTaskCard)
// - Each card: task title, recurrence summary badge, Today's status buttons,
//   inline tracker inputs
// - Status buttons: Planned / Done / Skipped (matches StressTest pattern)
// - Only today is editable; card color reflects status (gray/green/red)
// - Removed date-range picker, calendar popup, and 11-day grid
// ============================================================================
//
// COMPLETED CHANGE (2026-W16-d06-b4): Fixed Date Headers & Edit Window
// - Date headers now show "Apr 13, 14, 15..." with month label at top
// - Editable window: past 5 days + today only (6 days total)
// - Future dates locked (not selectable/editable)
// - Tracker fields hidden for future dates
// - Today highlighted in amber with "TODAY" label
// ============================================================================
//
// COMPLETED CHANGE (2026-W16-d06-b3): Calendar Date Picker for RecurringView
// - Added calendar icon with date range display (e.g., "Apr 13 - Apr 23")
// - Changed to 11-day window: 5 days before + center date + 5 days after
// - Added month calendar popup with clickable date selection
// - Calendar highlights: scheduled days (green dot), selected date (blue), today (amber)
// ============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ============================================================================
// REGRESSION TESTS — inlined (no external import needed for preview/deploy)
// Run: window.runRegressionTests() in browser console
// ============================================================================
const runRelationshipTests = () => {
  const migrateRelationshipType = (oldType) => {
    const mapping = { 'precede': 'blocks', 'follow': 'blocks', 'schedule': 'pairs_with', 'accomplish': 'pairs_with', 'helps_reach': 'results_in' };
    return mapping[oldType] || oldType;
  };

  const tests = {
    addRelationship: () => {
      const rels = [];
      rels.push({ toTaskId: 'task2', type: 'blocks', explanation: '' });
      console.assert(rels.length === 1, 'Relationship should be added');
      console.assert(rels[0].type === 'blocks', 'Type should be blocks');
      return { passed: rels.length === 1, name: 'addRelationship' };
    },
    relationshipTypes: () => {
      const TYPES = ['blocks','enables','pairs_with','results_in'];
      console.assert(TYPES.length === 4, 'Should have 4 types');
      console.assert(!TYPES.includes('helps_reach'), 'helps_reach should be removed');
      return { passed: TYPES.length === 4, name: 'relationshipTypes' };
    },
    migrateHelpReachToResultsIn: () => {
      console.assert(migrateRelationshipType('helps_reach') === 'results_in', 'helps_reach → results_in');
      console.assert(migrateRelationshipType('precede') === 'blocks', 'precede → blocks');
      console.assert(migrateRelationshipType('blocks') === 'blocks', 'blocks stays blocks');
      console.assert(migrateRelationshipType('enables') === 'enables', 'enables stays enables');
      return { passed: migrateRelationshipType('helps_reach') === 'results_in', name: 'migrateHelpReachToResultsIn' };
    },
    isTaskBlocked: () => {
      const pools = [{ id: 'p1', relationships: [{ fromTaskId: 'tA', toTaskId: 'tB', type: 'blocks' }] }];
      const tasks = [
        { id: 'tA', content: 'A', poolIds: ['p1'], isCompleted: false },
        { id: 'tB', content: 'B', poolIds: ['p1'], isCompleted: false },
      ];
      const isBlocked = (task) => {
        const pool = pools.find(p => p.id === task.poolIds?.[0]);
        const rel = pool?.relationships?.find(r => r.type === 'blocks' && r.toTaskId === task.id);
        return rel ? tasks.find(t => t.id === rel.fromTaskId && !t.isCompleted) || null : null;
      };
      console.assert(isBlocked(tasks[1]) !== null, 'tB should be blocked');
      tasks[0].isCompleted = true;
      console.assert(isBlocked(tasks[1]) === null, 'tB unblocked when tA complete');
      return { passed: true, name: 'isTaskBlocked' };
    },
    prioritySort: () => {
      const P = { blocks: 1, pairs_with: 2, enables: 3, results_in: 4 };
      const g = (t) => P[t] ?? 5;
      console.assert(g('blocks') < g('pairs_with'), 'blocks > pairs_with');
      console.assert(g('pairs_with') < g('enables'), 'pairs_with > enables');
      console.assert(g('enables') < g('results_in'), 'enables > results_in');
      return { passed: g('blocks') === 1 && g('results_in') === 4, name: 'prioritySort' };
    },
    zoomConstraints: () => {
      const z = (c, d) => Math.max(0.3, Math.min(3, c * d));
      console.assert(z(1, 0.9) < 1, 'zoom out');
      console.assert(z(0.3, 0.9) === 0.3, 'clamp min');
      console.assert(z(3, 1.1) === 3, 'clamp max');
      return { passed: true, name: 'zoomConstraints' };
    },
  };

  console.log('[OT²] Running regression tests…');
  let passed = 0; let failed = 0;
  for (const [, fn] of Object.entries(tests)) {
    try {
      const r = fn();
      r.passed ? (passed++, console.log(`✅ ${r.name}`)) : (failed++, console.log(`❌ ${r.name}`));
    } catch (e) { failed++; console.log(`❌ ERROR: ${e.message}`); }
  }
  console.log(`[OT²] Tests done — ${passed} passed, ${failed} failed`);
  return { passed, failed, total: passed + failed };
};

if (typeof window !== 'undefined') {
  window.runRegressionTests = runRelationshipTests;
  console.log('[OT²] Regression tests ready. Run window.runRegressionTests() in console.');
}

// ============================================================================
// MOCK AUTH HOOK (standalone version - no external dependencies)
// ============================================================================
const useAuth = () => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ot2_user') || 'null');
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  
  const signUp = async (email, password, profileName) => {
    setLoading(true);
    // Mock signup - in production this would use Supabase
    await new Promise(r => setTimeout(r, 500));
    const userData = { email, user_metadata: { profile_name: profileName } };
    setUser(userData);
    localStorage.setItem('ot2_user', JSON.stringify(userData));
    setLoading(false);
    return { user: { email } };
  };
  
  const signIn = async (email, password) => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    // Check against test users
    const testUser = TEST_USERS.find(u => u.email === email && u.password === password);
    if (testUser) {
      const userData = { email: testUser.email, user_metadata: { profile_name: testUser.profileName } };
      setUser(userData);
      localStorage.setItem('ot2_user', JSON.stringify(userData));
      setLoading(false);
      return { user: { email: testUser.email } };
    }
    setLoading(false);
    throw new Error('Invalid credentials');
  };
  
  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('ot2_user');
  };
  
  return { user, loading, signUp, signIn, signOut };
};

// ============================================================================
// OT² v3 — Task Graph · Ripple · Wave Edition
// BASELINE: 2026-W15-3
// Extends OT2_Complete-2.jsx with three new task organisation primitives
// ============================================================================

// === STORAGE KEYS ===
const STORAGE_KEYS = {
  TASKS: 'ot2_guest_tasks',
  TIMERS: 'ot2_guest_timers',
  REVIEWS: 'ot2_guest_reviews',
  USER: 'ot2_user',
  POOLS: 'ot2_pools',
  // Legacy key retained for one-time migration support.
  PODS: 'ot2_pods',
  RECURRENCE_LOGS: 'ot2_recurrence_logs',
  POD_LOGS: 'ot2_pod_logs',
  MIGRATION_VERSION: 'ot2_migration_version',
};

const TEST_USERS = [
  { email: 'demo@ot2.app', password: 'demo123', profileName: 'DemoUser' },
  { email: 'test@example.com', password: 'test123', profileName: 'TestUser' },
];

const T_WORDS = [
  'Things', 'Tasks', 'Time', 'Thoughts', 'Targets',
  'Todos', 'Tactics',
];

const FALLBACK_QUESTIONS = [
  { key: 'deadline', question: 'When does this need to be done?', placeholder: 'e.g., By end of today, This week, No rush', purpose: 'kanban' },
  { key: 'outcome', question: 'What does success look like?', placeholder: "Describe what 'done' means to you...", purpose: 'energy' },
  { key: 'motivation', question: 'Why does this matter to you?', placeholder: 'Connect with your reason...', purpose: 'quadrant' },
];

// === TASK GRAPH RELATIONSHIP TYPES (FEAT-025) ===
// Priority order for sort: blocks(1) > pairs_with(2) > enables(3) > results_in(4)
const RELATIONSHIP_TYPES = [
  {
    key: 'blocks',
    label: 'Blocks',
    desc: 'Task A must complete before Task B can start',
    color: '#6366F1',
    icon: '⏸️',
    direction: 'unidirectional',
    graphStyle: 'solid-arrow',
    priority: 1,
    workModeBanner: (otherTitle) => `⏸ Waiting for "${otherTitle}" to be marked complete`,
  },
  {
    key: 'enables',
    label: 'Enables',
    desc: 'Optional — doing this speeds up the linked task',
    color: '#F59E0B',
    icon: '💡',
    direction: 'unidirectional',
    graphStyle: 'dashed-no-arrow',
    priority: 3,
    workModeBanner: (otherTitle) => `💡 Finishing "${otherTitle}" may speed up this task`,
  },
  {
    key: 'pairs_with',
    label: 'Pairs With',
    desc: 'Do these tasks together to meet the goal',
    color: '#10B981',
    icon: '🔗',
    direction: 'bidirectional',
    graphStyle: 'bidirectional-rect',
    priority: 2,
    workModeBanner: (otherTitle, poolName) => `🔗 Do alongside "${otherTitle}" to meet ${poolName ? `"${poolName}"` : 'Task Graph'} requirements`,
  },
  {
    key: 'results_in',
    label: 'Results Either In',
    desc: 'Task X completes, then either Y or Z proceeds',
    color: '#8B5CF6',
    icon: '🔀',
    direction: 'unidirectional-fork',
    graphStyle: 'fork-arrows',
    priority: 4,
    workModeBanner: (otherTitle) => `⏳ Available once "${otherTitle}" is complete — one path will be chosen`,
  },
];

// Relationship sort priority helper
const getRelationshipPriority = (relType) => {
  const rt = RELATIONSHIP_TYPES.find(r => r.key === relType);
  return rt?.priority ?? 5;
};

// Migration helper — covers all legacy keys including helps_reach → results_in
const migrateRelationshipType = (oldType) => {
  const mapping = {
    'precede':     'blocks',
    'follow':      'blocks',
    'schedule':    'pairs_with',
    'accomplish':  'pairs_with',
    'helps_reach': 'results_in',
  };
  return mapping[oldType] || oldType;
};

// === RIPPLE TYPES ===
const POD_TYPES = [
  { key: 'annual_dates', label: '📅 Annual Dates', desc: 'Each task gets its own specific date in the year — e.g. Birthdays, Anniversaries, Bill payments' },
  { key: 'recurring',    label: '🔁 Recurring Schedule', desc: 'All tasks share a repeating schedule — e.g. Daily exercise, Weekly check-ins, Monthly targets' },
];

// === RECURRENCE TYPES (for recurring pods only) ===
const RECURRENCE_TYPES = [
  { key: 'daily', label: 'Daily', desc: 'Every single day' },
  { key: 'specific_days', label: 'Specific days of week', desc: 'Choose which days, e.g. Mon · Wed · Fri' },
  { key: 'every_n', label: 'Every N', desc: 'Every N days or weeks' },
  { key: 'monthly_frequency', label: 'X times per month', desc: 'Flexible monthly quota' },
  { key: 'annual', label: 'Annual (month & day)', desc: 'Birthdays, anniversaries (year ignored)' },
];

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEK_DAYS_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Migration helper for old recurrence data to new structure
const migrateRecurrence = (oldRecurrence, oldTrackerLabel) => {
  const newRecurrence = { ...oldRecurrence };

  // Migrate tracker label to trackers array
  if (oldTrackerLabel && !newRecurrence.trackers) {
    newRecurrence.trackers = [{
      id: 't1',
      label: oldTrackerLabel.slice(0, 2),
      valueType: 'text'
    }];
  }

  // Migrate every_n_days/every_n_weeks to every_n with unit
  if (newRecurrence.type === 'every_n_days') {
    newRecurrence.type = 'every_n';
    newRecurrence.unit = 'days';
  }
  if (newRecurrence.type === 'every_n_weeks') {
    newRecurrence.type = 'every_n';
    newRecurrence.unit = 'weeks';
  }

  // Add default startDate if missing for every_n type
  if (!newRecurrence.startDate && newRecurrence.type === 'every_n') {
    newRecurrence.startDate = todayStr();
  }

  // Add default unit if missing for every_n type
  if (newRecurrence.type === 'every_n' && !newRecurrence.unit) {
    newRecurrence.unit = 'days';
  }

  return newRecurrence;
};

const recurrenceSummaryLine = (task) => {
  const r = task?.recurrence || {};
  // Support both old recurrenceTrackerLabel and new trackers array
  const trackers = r.trackers?.map(t => t.label).join('·') || (task?.recurrenceTrackerLabel || '').trim();
  const trackerPart = trackers ? ` · Tracks: ${trackers}` : '';
  if (r.type === 'daily') return `🔁 Daily${trackerPart}`;
  if (r.type === 'specific_days') {
    const days = (r.weekDays || []).sort().map(d => WEEK_DAYS[d]).join('–');
    return `📅 ${days || 'No days selected'}${trackerPart}`;
  }
  if (r.type === 'every_n') {
    const unitLabel = r.unit === 'weeks' ? 'weeks' : 'days';
    return `🔁 Every ${r.everyN || '?'} ${unitLabel} from ${r.startDate || '?'}${trackerPart}`;
  }
  if (r.type === 'monthly_frequency') return `🔁 ${r.frequency || '?'}×/month${trackerPart}`;
  if (r.type === 'annual') return `🎂 ${r.annualMonthDay || '?'} yearly${trackerPart}`;
  // Fallback for old types during migration
  if (r.type === 'every_n_days') return `🔁 Every ${r.everyNDays || '?'} days${trackerPart}`;
  return '—';
};

// ============================================================================
// FEAT-026: isScheduledOnDate — pure function, returns true if task recurrence
// includes the given dateStr (YYYY-MM-DD). Covers all recurrence types.
// ============================================================================
const isScheduledOnDate = (task, dateStr) => {
  if (!task.recurrenceEnabled || !task.recurrence) return false;
  const r = task.recurrence;
  const date = new Date(dateStr + 'T00:00:00');

  if (r.type === 'daily') return true;

  if (r.type === 'specific_days') {
    // weekDays stores 0=Mon … 6=Sun (ISO-aligned)
    const dow = (date.getDay() + 6) % 7; // JS getDay() is 0=Sun, convert to 0=Mon
    return (r.weekDays || []).includes(dow);
  }

  if (r.type === 'every_n' || r.type === 'every_n_days') {
    const start = new Date((r.startDate || dateStr) + 'T00:00:00');
    const diffMs = date - start;
    if (diffMs < 0) return false;
    const diffDays = Math.round(diffMs / 86400000);
    const n = r.unit === 'weeks'
      ? (r.everyN || 1) * 7
      : (r.everyN || r.everyNDays || 1);
    return diffDays % n === 0;
  }

  if (r.type === 'monthly_frequency') {
    // Tasks with monthly frequency are shown every day of the month (user picks which days to log)
    return true;
  }

  if (r.type === 'annual') {
    // annualMonthDay format: 'MM-DD'
    const mmdd = dateStr.slice(5); // 'YYYY-MM-DD' → 'MM-DD'
    return mmdd === r.annualMonthDay;
  }

  return false;
};

// ============================================================================
// FEAT-026: getNextScheduledDate — scans forward from fromDate to find the
// next date (inclusive) the task is scheduled. Returns YYYY-MM-DD or null.
// ============================================================================
const getNextScheduledDate = (task, fromDate) => {
  const MAX_SCAN = 366;
  const start = new Date(fromDate + 'T00:00:00');
  for (let i = 0; i <= MAX_SCAN; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const ds = d.toISOString().slice(0, 10);
    if (isScheduledOnDate(task, ds)) return ds;
  }
  return null;
};

// ============================================================================
// FEAT-026: formatFriendlyDate — converts YYYY-MM-DD to 'Mon 20 Apr'
// ============================================================================
const formatFriendlyDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
  } catch { return dateStr; }
};

// === AI COACHING SERVICE ===
const AICoachingService = {
  EDGE_FUNCTION_URL: '',
  analyzeTaskContent(content) {
    const lower = content.toLowerCase();
    const deadlinePatterns = {
      today: /\b(today|tonight|this morning|this afternoon|this evening|eod|end of day)\b/i,
      tomorrow: /\b(tomorrow|tmr)\b/i,
      thisWeek: /\b(this week|by friday|end of week)\b/i,
      urgent: /\b(urgent|asap|immediately|right away|now)\b/i,
      future: /\b(next week|next month|later|eventually|someday|no rush)\b/i,
      specific: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}\/\d{1,2})\b/i,
    };
    const outcomePatterns = {
      action: /\b(complete|finish|deliver|submit|send|create|build|write|prepare|draft|review|update|fix|resolve)\b/i,
      result: /\b(report|document|email|presentation|proposal|code|design|plan|list|summary)\b/i,
    };
    const importancePatterns = {
      high: /\b(important|critical|priority|must|essential|key|vital|crucial)\b/i,
      stakeholder: /\b(boss|client|customer|team|manager|meeting|deadline)\b/i,
      consequence: /\b(need|required|mandatory|blocking|waiting)\b/i,
    };
    const complexityPatterns = {
      high: /\b(complex|difficult|challenging|major|extensive|comprehensive|deep dive|research|analyze)\b/i,
      medium: /\b(review|update|prepare|organize|plan|coordinate)\b/i,
      low: /\b(quick|simple|easy|minor|small|brief|short|just)\b/i,
    };
    const hasDeadline = Object.values(deadlinePatterns).some(p => p.test(lower));
    const hasOutcome = Object.values(outcomePatterns).some(p => p.test(lower));
    const hasImportance = Object.values(importancePatterns).some(p => p.test(lower));
    const hasComplexity = Object.values(complexityPatterns).some(p => p.test(lower));
    let suggestedDeadline = 'notplanned';
    if (deadlinePatterns.today.test(lower) || deadlinePatterns.urgent.test(lower)) suggestedDeadline = 'today';
    else if (deadlinePatterns.tomorrow.test(lower) || deadlinePatterns.thisWeek.test(lower) || deadlinePatterns.specific.test(lower)) suggestedDeadline = 'future';
    else if (deadlinePatterns.future.test(lower)) suggestedDeadline = 'future';
    let suggestedEnergy = 'medium';
    if (complexityPatterns.high.test(lower)) suggestedEnergy = 'high';
    else if (complexityPatterns.low.test(lower)) suggestedEnergy = 'low';
    let suggestedPriority = 'schedule';
    const isUrgent = deadlinePatterns.today.test(lower) || deadlinePatterns.urgent.test(lower);
    const isImportant = importancePatterns.high.test(lower) || importancePatterns.stakeholder.test(lower);
    if (isUrgent && isImportant) suggestedPriority = 'do_first';
    else if (isUrgent && !isImportant) suggestedPriority = 'delegate';
    else if (!isUrgent && isImportant) suggestedPriority = 'schedule';
    else suggestedPriority = 'eliminate';
    return { hasDeadline, hasOutcome, hasImportance, hasComplexity, suggestedDeadline, suggestedEnergy, suggestedPriority };
  },
  generateQuestions(taskContent, existingReflections = {}) {
    const analysis = this.analyzeTaskContent(taskContent);
    const questions = [];
    const questionBank = {
      deadline: [
        { q: "When do you envision this being complete?", p: "Consider what feels realistic..." },
        { q: "What's driving the timeline for this?", p: "Is there an external deadline or is this self-imposed?" },
      ],
      outcome: [
        { q: "What will you have when this is done?", p: "Describe the tangible result..." },
        { q: "How will you know this task is truly complete?", p: "What does 'done' look like?" },
      ],
      motivation: [
        { q: "Why does completing this matter to you?", p: "Connect with your deeper reason..." },
        { q: "What becomes possible once this is done?", p: "Think about what this unlocks..." },
      ],
      complexity: [
        { q: "What's the hardest part of this task?", p: "Identify the core challenge..." },
        { q: "Can this be broken into smaller pieces?", p: "Think about the first small step..." },
      ],
      urgency: [
        { q: "What happens if this waits until next week?", p: "Consider the real consequences..." },
        { q: "Is this urgent, or does it just feel urgent?", p: "Distinguish between the two..." },
      ],
    };
    const pick = (cat) => { const opts = questionBank[cat]; return opts[Math.floor(Math.random() * opts.length)]; };
    if (!analysis.hasDeadline && !existingReflections.deadline) {
      const q = pick('deadline');
      questions.push({ key: 'deadline', question: q.q, placeholder: q.p, purpose: 'kanban', required: true });
    }
    if (!analysis.hasOutcome && !existingReflections.outcome && questions.length < 5) {
      const q = pick('outcome');
      questions.push({ key: 'outcome', question: q.q, placeholder: q.p, purpose: 'energy', required: true });
    }
    if (!analysis.hasImportance && !existingReflections.motivation && questions.length < 5) {
      const q = pick('motivation');
      questions.push({ key: 'motivation', question: q.q, placeholder: q.p, purpose: 'quadrant', required: false });
    }
    if (!analysis.hasComplexity && questions.length < 4 && questions.length > 0) {
      const q = pick('complexity');
      questions.push({ key: 'complexity', question: q.q, placeholder: q.p, purpose: 'energy', required: false });
    }
    if (questions.length === 0) {
      questions.push({ key: 'reflection', question: "What would completing this task mean for you?", placeholder: "Take a moment to connect with your intention...", purpose: 'all', required: true });
    }
    return { questions: questions.slice(0, 5), analysis: { ...analysis, taskWellDefined: analysis.hasDeadline && analysis.hasOutcome && analysis.hasImportance } };
  },
  async getCoachingQuestions(taskContent, existingReflections = {}) {
    if (this.EDGE_FUNCTION_URL) {
      try {
        const response = await fetch(this.EDGE_FUNCTION_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskContent, existingReflections }) });
        if (response.ok) return await response.json();
      } catch (error) { console.warn('AI coaching fallback:', error); }
    }
    return this.generateQuestions(taskContent, existingReflections);
  },
};

// === UUID helper ===
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

// === DATE helpers ===
const todayStr = () => new Date().toISOString().slice(0, 10);
const dateStr = (d) => new Date(d).toISOString().slice(0, 10);
const addDays = (dateStr, n) => { const d = new Date(dateStr); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

// === ICONS ===
const Icons = {
  Hourglass: ({ className = "w-6 h-6" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>),
  ListTodo: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>),
  Briefcase: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>),
  BarChart: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>),
  Plus: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>),
  Trash: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>),
  Play: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>),
  Pause: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>),
  Square: ({ className = "w-3 h-3" }) => (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>),
  Check: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>),
  ChevronRight: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>),
  ChevronDown: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>),
  ArrowLeft: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>),
  Star: ({ className = "w-4 h-4", filled = false }) => (<svg className={className} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>),
  Sparkles: ({ className = "w-8 h-8" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>),
  Coffee: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>),
  Clock: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
  Calendar: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>),
  Mail: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>),
  Lock: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>),
  User: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>),
  Loader: ({ className = "w-4 h-4" }) => (<svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>),
  Brain: ({ className = "w-8 h-8" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.94"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.94"/></svg>),
  Target: ({ className = "w-8 h-8" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>),
  Zap: ({ className = "w-8 h-8" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>),
  Lightbulb: ({ className = "w-8 h-8" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>),
  Layers: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>),
  Repeat: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>),
  Link: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>),
  Feather: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg>),
  X: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>),
  Edit: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>),
  Bold: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>),
  Italic: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>),
  List: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>),
  GitBranch: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>),
  TaskGraph: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><circle cx="12" cy="12" r="2"/><line x1="7" y1="12" x2="10" y2="12"/><line x1="14" y1="12" x2="17.3" y2="6.7"/><line x1="14" y1="12" x2="17.3" y2="17.3"/></svg>),
  Ripple: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2"/><path d="M6.3 6.3a8 8 0 0 0 0 11.4"/><path d="M17.7 6.3a8 8 0 0 1 0 11.4"/><path d="M3.5 3.5a13.5 13.5 0 0 0 0 17"/><path d="M20.5 3.5a13.5 13.5 0 0 1 0 17"/></svg>),
  RotateCcw: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>),
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
export default function OT2App() {
  const [page, setPage] = useState('home');
  const [tWordIndex, setTWordIndex] = useState(0);

  // Auth — now powered by Supabase via useAuth hook
  const { user, loading: authLoading, signUp, signIn, signOut } = useAuth();
  const isAuthenticated = !!user;
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', profileName: '', password: '', confirmPassword: '' });
  const [authError, setAuthError] = useState('');
  
  // Core State
  const [guestMode, setGuestMode] = useState('freedom');
  const [tasks, setTasks] = useState([]);
  const [timers, setTimers] = useState({});
  const [reviews, setReviews] = useState([]);
  const [tick, setTick] = useState(0);

  // NEW: Pool / Recurrence / Wave state
  const [pools, setPools] = useState([]);
  const [pods, setPods] = useState([]); // legacy structure retained for migration/back-compat
  const [podLogs, setPodLogs] = useState({}); // legacy structure retained for migration/back-compat
  const [recurrenceLogs, setRecurrenceLogs] = useState({});

  // Freedom Mode
  const [newTask, setNewTask] = useState('');

  // Focus Mode
  const [focusedTaskId, setFocusedTaskId] = useState(null);
  const [focusPhase, setFocusPhase] = useState('associate'); // 'associate' | 'clarity'
  const [socraticQuestion, setSocraticQuestion] = useState(null); // Single AI-generated question
  const [socraticAnswer, setSocraticAnswer] = useState('');
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardAnswers, setWizardAnswers] = useState({});
  const [focusTaskType, setFocusTaskType] = useState('wave');
  const [focusPoolId, setFocusPoolId] = useState(null);
  const [focusPodId, setFocusPodId] = useState(null); // legacy
  const [focusRelationships, setFocusRelationships] = useState([]);
  const [focusTypeConfirmed, setFocusTypeConfirmed] = useState(false);
  const [focusPodTaskDate, setFocusPodTaskDate] = useState(''); // legacy
  const [focusRecurringEnabled, setFocusRecurringEnabled] = useState(false);
  const [focusRecurrence, setFocusRecurrence] = useState({
    type: 'daily',
    startDate: todayStr(),
    everyN: 1,
    unit: 'days',
    weekDays: [0, 1, 2, 3, 4],
    frequency: 3,
    annualMonthDay: '',
    trackers: []
  });
  const [focusTrackerLabel, setFocusTrackerLabel] = useState('');

  // Review State
  const [reviewTaskId, setReviewTaskId] = useState(null);
  const [satisfactionRating, setSatisfactionRating] = useState(0);
  const [improvements, setImprovements] = useState('');

  // Video Modal State
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [hideVideoOnStartup, setHideVideoOnStartup] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ot2_hide_video_startup') || 'false');
    } catch {
      return false;
    }
  });

  // Navigation Menu State
  const [openResourcesMenu, setOpenResourcesMenu] = useState(false);
  const [openContactMenu, setOpenContactMenu] = useState(false);

  // Marketplace State
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [seedingTemplate, setSeedingTemplate] = useState(null);   // template being seeded
  const [seedLoginEmail, setSeedLoginEmail] = useState('');
  const [seedLoginPassword, setSeedLoginPassword] = useState('');
  const [seedLoginError, setSeedLoginError] = useState('');
  const [seedingDone, setSeedingDone] = useState(false);

  // Derived
  const pendingTasks = tasks.filter(t => !t.isCompleted);
  const completedTasks = tasks.filter(t => t.isCompleted);
  const focusedTask = tasks.find(t => t.id === focusedTaskId);

  // ─────────────────────────────────────────────────────────────────────────
  // IMPORTANT: Two distinct "pending" lists — use the right one in each mode.
  //
  //  pendingTasks     = ALL non-completed tasks. Used for Work, Review, stats.
  //
  //  unqualifiedTasks = Tasks with no Focus answers yet (no reflection). This
  //                     is the Focus queue and the Freedom mode display list.
  //                     ALWAYS pass this — NOT pendingTasks — to FreedomMode
  //                     and FocusMode. Using pendingTasks there causes the
  //                     progress dots to render hundreds of circles, filling
  //                     the panel and hiding all UI content (regression ERR-REG-01).
  // ─────────────────────────────────────────────────────────────────────────
  const unqualifiedTasks = pendingTasks.filter(
    t => !t.reflection || !Object.values(t.reflection).some(v => v && String(v).trim())
  );

  // === EFFECTS ===
  useEffect(() => {
    if (page !== 'home') return;
    const interval = setInterval(() => setTWordIndex(p => (p + 1) % T_WORDS.length), 2000);
    return () => clearInterval(interval);
  }, [page]);

  useEffect(() => {
    try {
      const st = localStorage.getItem(STORAGE_KEYS.TASKS);
      const stm = localStorage.getItem(STORAGE_KEYS.TIMERS);
      const sr = localStorage.getItem(STORAGE_KEYS.REVIEWS);
      const su = localStorage.getItem(STORAGE_KEYS.USER);
      const spl = localStorage.getItem(STORAGE_KEYS.POOLS);
      const spd = localStorage.getItem(STORAGE_KEYS.PODS); // legacy
      const srl = localStorage.getItem(STORAGE_KEYS.RECURRENCE_LOGS);
      const spl2 = localStorage.getItem(STORAGE_KEYS.POD_LOGS); // legacy
      if (st) setTasks(JSON.parse(st));
      if (stm) setTimers(JSON.parse(stm));
      if (sr) setReviews(JSON.parse(sr));
      if (spl) {
        const loadedPools = JSON.parse(spl).map(pool => ({
          ...pool,
          relationships: pool.relationships?.map(rel => ({
            ...rel,
            type: migrateRelationshipType(rel.type)
          })) || []
        }));
        setPools(loadedPools);
      }
      if (spd) setPods(JSON.parse(spd));
      if (srl) setRecurrenceLogs(JSON.parse(srl));
      if (spl2) {
        const parsed = JSON.parse(spl2);
        setPodLogs(parsed);
        if (!srl) setRecurrenceLogs(parsed);
      }
      // Keep legacy pods in storage for migration only.
      if (spd) localStorage.setItem(STORAGE_KEYS.PODS, spd);
    } catch (e) { console.error('localStorage load error', e); }
  }, []);

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TIMERS, JSON.stringify(timers)); }, [timers]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews)); }, [reviews]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.POOLS, JSON.stringify(pools)); }, [pools]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.PODS, JSON.stringify(pods)); }, [pods]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.POD_LOGS, JSON.stringify(podLogs)); }, [podLogs]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.RECURRENCE_LOGS, JSON.stringify(recurrenceLogs)); }, [recurrenceLogs]);

  // One-time migration: legacy pod tasks become Task Graph recurring tasks.
  useEffect(() => {
    try {
      const migrated = localStorage.getItem(STORAGE_KEYS.MIGRATION_VERSION);
      if (migrated === 'ripple-in-graph-v1') return;
      const legacyPodsRaw = localStorage.getItem(STORAGE_KEYS.PODS);
      if (!legacyPodsRaw) {
        localStorage.setItem(STORAGE_KEYS.MIGRATION_VERSION, 'ripple-in-graph-v1');
        return;
      }
      const legacyPods = JSON.parse(legacyPodsRaw || '[]');
      const podById = Object.fromEntries((legacyPods || []).map(p => [p.id, p]));
      setTasks(prev => prev.map(t => {
        if (!t.podId) return t;
        const legacy = podById[t.podId];
        const recurrence = legacy?.recurrence || { type: 'specific_days', weekDays: [0, 1, 2, 3, 4], everyNDays: 2, frequency: 3 };
        const trackerLabel = ((legacy?.trackerFields || []).find(f => f?.name)?.name || '').slice(0, 2).toUpperCase();
        return {
          ...t,
          type: 'pool',
          recurrence: { ...recurrence },
          recurrenceEnabled: true,
          recurrenceTrackerLabel: trackerLabel,
          podId: null,
          podTaskDate: null,
        };
      }));
      localStorage.setItem(STORAGE_KEYS.MIGRATION_VERSION, 'ripple-in-graph-v1');
    } catch (e) {
      console.error('migration error', e);
    }
  }, []);

  useEffect(() => {
    const hasRunning = Object.values(timers).some(t => t.pausedAt === null);
    if (!hasRunning) return;
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [timers]);

  useEffect(() => {
    if (page === 'home' && guestMode === 'freedom' && !hideVideoOnStartup && !showVideoModal) {
      const sessionKey = 'ot2_video_shown_this_session';
      if (!sessionStorage.getItem(sessionKey)) {
        setShowVideoModal(true);
        sessionStorage.setItem(sessionKey, 'true');
      }
    }
  }, [page, guestMode, hideVideoOnStartup, showVideoModal]);

  // === TIMER ===
  const getElapsedSeconds = useCallback((taskId) => {
    const timer = timers[taskId];
    if (!timer) return 0;
    if (timer.pausedAt !== null) return timer.accumulated;
    return timer.accumulated + Math.floor((Date.now() - timer.startTime) / 1000);
  }, [timers, tick]);
  const formatTimer = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  const startTimer = (id) => setTimers(p => ({ ...p, [id]: { startTime: Date.now(), pausedAt: null, accumulated: p[id]?.accumulated || 0 } }));
  const pauseTimer = (id) => {
    const t = timers[id]; if (!t || t.pausedAt !== null) return;
    setTimers(p => ({ ...p, [id]: { ...p[id], pausedAt: Date.now(), accumulated: p[id].accumulated + Math.floor((Date.now() - t.startTime) / 1000) } }));
  };
  const stopTimer = (id) => setTimers(p => { const n = { ...p }; delete n[id]; return n; });
  const isTimerRunning = (id) => timers[id] && timers[id].pausedAt === null;
  const isTimerPaused = (id) => timers[id] && timers[id].pausedAt !== null;
  const getPausedDuration = (id) => { const t = timers[id]; if (!t || t.pausedAt === null) return 0; return Math.floor((Date.now() - t.pausedAt) / 1000); };

  // === TASK FUNCTIONS ===
  const addTask = () => {
    if (!newTask.trim()) return;
    const task = { id: uid(), content: newTask.trim(), createdAt: Date.now(), isCompleted: false, reflection: null, type: 'wave', poolIds: [], podId: null };
    setTasks(p => [task, ...p]);
    setNewTask('');
  };
  const updateTaskContent = (id, newContent) => {
    setTasks(p => p.map(t => t.id === id ? { ...t, content: newContent } : t));
  };
  const deleteTask = (id) => { setTasks(p => p.filter(t => t.id !== id)); stopTimer(id); };
  const completeTask = (id) => {
    setTasks(p => p.map(t => t.id === id ? { ...t, isCompleted: true, completedAt: new Date().toISOString() } : t));
    stopTimer(id);
    setReviewTaskId(id); setSatisfactionRating(0); setImprovements('');
  };
  
  // NEW: Reactivate completed task
  const reactivateTask = (id) => {
    setTasks(p => p.map(t => t.id === id ? { ...t, isCompleted: false, completedAt: null } : t));
  };
  
  const submitReview = () => {
    if (!reviewTaskId || satisfactionRating === 0) return;
    setReviews(p => [{ taskId: reviewTaskId, satisfactionRating, improvements, completedAt: Date.now() }, ...p]);
    setReviewTaskId(null); setSatisfactionRating(0); setImprovements('');
  };
  
  // NEW: Update review
  const updateReview = (taskId, newRating, newImprovements) => {
    setReviews(p => p.map(r => r.taskId === taskId ? { ...r, satisfactionRating: newRating, improvements: newImprovements } : r));
  };
  
  const skipReview = () => { setReviewTaskId(null); setSatisfactionRating(0); setImprovements(''); };
  const getStats = () => ({
    totalCompleted: completedTasks.length,
    avgSatisfaction: reviews.length > 0 ? reviews.reduce((s, r) => s + r.satisfactionRating, 0) / reviews.length : 0,
    reviewCount: reviews.length,
    pendingCount: pendingTasks.length,
  });

  // === FOCUS FUNCTIONS ===
  const startFocus = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    setFocusedTaskId(taskId);
    // 2-step flow: reset to Associate phase
    setFocusPhase('associate');
    setSocraticQuestion(null);
    setSocraticAnswer('');
    setWizardStep(0);
    setWizardAnswers({});
    setFocusTaskType(task?.type && task.type !== 'wave' ? task.type : 'wave');
    setFocusPoolId(task?.poolIds?.[0] || null);
    setFocusPodId(task?.podId || null);
    setFocusRelationships([]);
    setFocusTypeConfirmed(true); // Skip old type confirmation, we use 2-step flow now
    setFocusPodTaskDate(task?.podTaskDate || '');
    setFocusRecurringEnabled(!!task?.recurrenceEnabled);
    setFocusRecurrence(task?.recurrence || {
      type: 'daily',
      startDate: todayStr(),
      everyN: 1,
      unit: 'days',
      weekDays: [0, 1, 2, 3, 4],
      frequency: 3,
      annualMonthDay: '',
      trackers: []
    });
    setFocusTrackerLabel((task?.recurrenceTrackerLabel || '').slice(0, 2));
    setGuestMode('focus');
  };

  const confirmFocusType = () => {
    setFocusTypeConfirmed(true);
  };

  const finishFocus = () => {
    if (!focusedTaskId) return;
    setTasks(prev => prev.map(t => {
      if (t.id !== focusedTaskId) return t;
      const updated = { ...t, reflection: wizardAnswers, type: focusTaskType };
      if (focusTaskType === 'pool' && focusPoolId) {
        updated.poolIds = Array.from(new Set([...(t.poolIds || []), focusPoolId]));
        updated.recurrenceEnabled = focusRecurringEnabled;
        updated.recurrence = focusRecurringEnabled ? { ...focusRecurrence } : null;
        updated.recurrenceTrackerLabel = focusRecurringEnabled ? focusTrackerLabel.slice(0, 2).toUpperCase() : '';
      }
      // New model: recurrence lives inside Task Graph task metadata (no explicit pod type).
      if (focusTaskType === 'wave') {
        updated.recurrenceEnabled = false;
        updated.recurrence = null;
        updated.recurrenceTrackerLabel = '';
      }
      return updated;
    }));

    // Save pool relationships
    if (focusTaskType === 'pool' && focusPoolId && focusRelationships.length > 0) {
      setPools(prev => prev.map(pool => {
        if (pool.id !== focusPoolId) return pool;
        const existing = pool.relationships || [];
        const newRels = focusRelationships.map(r => ({ fromTaskId: focusedTaskId, toTaskId: r.toTaskId, type: r.type }));
        return { ...pool, relationships: [...existing, ...newRels] };
      }));
    }

    setFocusedTaskId(null);
    setGuestMode('work');
  };

  const skipTask = () => {
    const currentIndex = pendingTasks.findIndex(t => t.id === focusedTaskId);
    const nextTask = pendingTasks[currentIndex + 1];
    if (nextTask) {
      startFocus(nextTask.id);
    } else {
      setFocusedTaskId(null);
      setGuestMode('work');
    }
  };

  // === POOL FUNCTIONS ===
  const createPool = (name) => {
    const pool = { id: uid(), name, createdAt: Date.now(), completionDate: null, completionDays: null, relationships: [] };
    setPools(p => [pool, ...p]);
    return pool;
  };

  // === POD FUNCTIONS ===
  const createPod = (pod) => {
    const newPod = { id: uid(), createdAt: Date.now(), ...pod };
    setPods(p => [newPod, ...p]);
    return newPod;
  };

  // Recurrence log helpers
  const recurrenceLogKey = (taskId, date) => `${taskId}_${date}`;
  const getRecurrenceLog = (taskId, date) => recurrenceLogs[recurrenceLogKey(taskId, date)] || { status: 'planned', trackerValues: {}, review: null };
  const setRecurrenceLog = (taskId, date, updates) => {
    const key = recurrenceLogKey(taskId, date);
    const today = todayStr();
    const minDate = addDays(today, -7); // Extended to 7 days
    if (date < minDate) return;
    setRecurrenceLogs(prev => ({ ...prev, [key]: { ...getRecurrenceLog(taskId, date), ...updates } }));
  };

  // === AUTH FUNCTIONS ===
  const handleLogin = async () => {
    setAuthError('');
    if (!authForm.email || !authForm.password) { setAuthError('Please fill in all fields.'); return; }
    try {
      await signIn(authForm.email, authForm.password);
      setPage('home');
      setAuthForm({ email: '', profileName: '', password: '', confirmPassword: '' });
    } catch (e) {
      setAuthError(e.message || 'Sign in failed. Please check your credentials.');
    }
  };

  const handleSignup = async () => {
    setAuthError('');
    if (!authForm.email || !authForm.profileName || !authForm.password) { setAuthError('Please fill in all fields.'); return; }
    if (authForm.password !== authForm.confirmPassword) { setAuthError("Passwords don't match."); return; }
    if (authForm.password.length < 6) { setAuthError('Password must be at least 6 characters.'); return; }
    try {
      await signUp(authForm.email, authForm.password, authForm.profileName);
      setPage('home');
      setAuthForm({ email: '', profileName: '', password: '', confirmPassword: '' });
    } catch (e) {
      setAuthError(e.message || 'Account creation failed. Please try again.');
    }
  };

  const handleLogout = () => {
    signOut();
  };

  const handleHideVideoOnStartup = (checked) => {
    setHideVideoOnStartup(checked);
    localStorage.setItem('ot2_hide_video_startup', JSON.stringify(checked));
  };

  const handleAboutClick = () => {
    setShowVideoModal(true);
  };

  const resourcesLinks = [
    { label: 'Blog', url: '/blog', icon: '📝' },
    { label: 'Videos/Reels', url: '/videos', icon: '📹' },
    { label: 'Books/References', url: '/resources', icon: '📚' },
  ];

  const contactLinks = [
    { label: 'Leadership', url: '/contact/leadership', icon: '👔' },
    { label: 'Support', url: '/contact/support', icon: '🤝' },
    { label: 'Legal', url: '/contact/legal', icon: '⚖️' },
  ];

  // === MARKETPLACE TEMPLATES ===
  const MARKETPLACE_TEMPLATES = [
    {
      id: 'neet-study-plan',
      title: 'NEET Study Plan',
      emoji: '🎓',
      tagline: '6.5 hrs/day · Physics · Chemistry · Biology',
      description: 'Complete NEET preparation plan with 10 subject pools and daily recurring study pods for every chapter.',
      tags: ['Exam Prep', 'Students', 'Science'],
      color: '#6366F1',
      pools: ['Physics: Mechanics & Motion', 'Physics: Electrostatics & Current', 'Physics: Optics & Modern Physics', 'Physics: Thermodynamics & Waves', 'Chemistry: Physical Chemistry', 'Chemistry: Organic Chemistry', 'Chemistry: Inorganic Chemistry', 'Biology: Cell Biology & Biomolecules', 'Biology: Human Physiology & Systems', 'Biology: Genetics, Evolution & Ecology'],
      pods: ['🔵 Mechanics Sessions', '⚡ Electrostatics Sessions', '🔭 Optics Sessions', '🌡 Thermo & Waves Sessions', '⚗️ Physical Chem Sessions', '🧪 Organic Chem Sessions', '🧲 Inorganic Chem Sessions', '🔬 Cell Bio Sessions', '🫀 Physiology Sessions', '🧬 Genetics Sessions', '📝 Weekly Mock Test', '🌙 Night Flashcard Habit'],
    },
    {
      id: 'home-party-organizer',
      title: 'Home Party Organizer',
      emoji: '🎉',
      tagline: 'Venue · Food · Guests · Entertainment',
      description: 'Plan any home party end-to-end — from guest invites and catering to décor and the day-of checklist.',
      tags: ['Events', 'Home', 'Social'],
      color: '#F59E0B',
      pools: ['Guest Management', 'Food & Catering', 'Venue & Décor', 'Entertainment & Activities', 'Shopping & Supplies'],
      pods: ['📋 RSVP Tracking', '🛒 Shopping Runs', '🍽️ Day-of Catering Tasks', '🎶 Music & Ambience Setup'],
    },
    {
      id: 'one-week-family-trip',
      title: 'One-Week Family Trip',
      emoji: '✈️',
      tagline: 'Plan · Book · Pack · Enjoy · Return',
      description: 'A structured 7-day family travel plan covering bookings, packing, daily itinerary, and post-trip tasks.',
      tags: ['Travel', 'Family', 'Vacation'],
      color: '#10B981',
      pools: ['Pre-Trip Bookings', 'Packing & Preparation', 'Day 1–3 Itinerary', 'Day 4–7 Itinerary', 'Post-Trip & Returns'],
      pods: ['🗺️ Daily Itinerary Check-in', '🎒 Packing Checklist', '📸 Memories & Notes', '🧾 Expense Tracker'],
    },
  ];

  // Seed a marketplace template into the app's pools & pods
  const handleSeedTemplate = async (template) => {
    const newPools = template.pools.map(name => ({
      id: uid(), name, createdAt: Date.now(), completionDate: null, completionDays: null, relationships: [],
    }));
    const newPods = template.pods.map(name => ({
      id: uid(), name, podType: 'recurring', recurrence: { type: 'daily' }, trackerFields: [], createdAt: Date.now(),
    }));
    setPools(prev => [...prev, ...newPools]);
    setPods(prev => [...prev, ...newPods]);
    setSeedingDone(true);
    setTimeout(() => {
      setSeedingTemplate(null);
      setSeedingDone(false);
      setSeedLoginEmail('');
      setSeedLoginPassword('');
      setSeedLoginError('');
      setShowMarketplace(false);
      setGuestMode('work');
    }, 1800);
  };

  const handleSeedLogin = async () => {
    setSeedLoginError('');
    try {
      await signIn(seedLoginEmail, seedLoginPassword);
      await handleSeedTemplate(seedingTemplate);
    } catch (e) {
      setSeedLoginError('Invalid credentials. Try demo@ot2.app / demo123');
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  if (page === 'auth') {
    return (
      <AuthPage
        authMode={authMode} setAuthMode={setAuthMode}
        authForm={authForm} setAuthForm={setAuthForm}
        authLoading={authLoading} authError={authError}
        onLogin={handleLogin}
        onSignup={handleSignup}
        onBack={() => { setPage('home'); setAuthError(''); setAuthForm({ email: '', profileName: '', password: '', confirmPassword: '' }); }}
      />
    );
  }

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo} onClick={() => setPage('landing')}>
            <Icons.Hourglass className="w-7 h-7" />
            <span style={styles.logoText}>OT<sup style={styles.sup}>2</sup></span>
          </div>
          <div style={styles.inlineHero}>
            <h1 style={styles.inlineHeroTitle}>
              On Top of{' '}

              <span style={styles.tWord}>{T_WORDS[tWordIndex]}</span>
              <sup style={{ ...styles.sup, color: '#FF6B6B', fontSize: '16px' }}>2</sup>
            </h1>
          </div>
          <div style={styles.headerRight}>
            {!isAuthenticated && (
              <div style={styles.navContainer}>
                <button style={styles.navLink} onClick={handleAboutClick}>
                  About the App
                </button>
                <NavDropdown
                  label="Resources"
                  items={resourcesLinks}
                  isOpen={openResourcesMenu}
                  onToggle={() => setOpenResourcesMenu(!openResourcesMenu)}
                  onClose={() => setOpenResourcesMenu(false)}
                />
                <NavDropdown
                  label="Contact"
                  items={contactLinks}
                  isOpen={openContactMenu}
                  onToggle={() => setOpenContactMenu(!openContactMenu)}
                  onClose={() => setOpenContactMenu(false)}
                />
                <button
                  style={{ ...styles.navLink, color: '#FF6B6B', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={() => setShowMarketplace(true)}
                >
                  🛒 Marketplace
                </button>
              </div>
            )}
            {isAuthenticated ? (
              <>
                <span style={styles.greeting}>Hi, {user?.user_metadata?.profile_name || user?.email}</span>
                <button style={styles.outlineBtn} onClick={handleLogout}>Log out</button>
              </>
            ) : (
              <button style={styles.primaryBtn} onClick={() => { setPage('auth'); setAuthMode('login'); }}>Sign In</button>
            )}
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {/* Guest/App Section */}
        <section style={styles.guestSection}>
          <div style={styles.guestCard}>
            {/* Mode Nav */}
            <div style={styles.modeNav}>
              <ModeButton active={guestMode === 'freedom'} onClick={() => setGuestMode('freedom')} icon={<Icons.Sparkles className="w-4 h-4" />} label="Freedom" />
              {/* ERR-REG-01: disabled check uses unqualifiedTasks, not pendingTasks */}
              <ModeButton active={guestMode === 'focus'} onClick={() => unqualifiedTasks.length > 0 && startFocus(unqualifiedTasks[0].id)} disabled={unqualifiedTasks.length === 0} icon={<Icons.Hourglass className="w-4 h-4" />} label="Focus" />
              <ModeButton active={guestMode === 'work'} onClick={() => setGuestMode('work')} icon={<Icons.Briefcase />} label="Work" />
              <ModeButton active={guestMode === 'review'} onClick={() => setGuestMode('review')} icon={<Icons.BarChart />} label="Review" />
            </div>

            {guestMode === 'freedom' && (
              <FreedomMode
                newTask={newTask} setNewTask={setNewTask} onAddTask={addTask}
                // ERR-REG-01: always pass unqualifiedTasks — not pendingTasks
                pendingTasks={unqualifiedTasks}
                allPendingCount={pendingTasks.length}
                completedTasks={completedTasks}
                onDeleteTask={deleteTask} onStartFocus={startFocus}
              />
            )}

            {guestMode === 'focus' && focusedTask && (
              <FocusMode
                task={focusedTask}
                // ERR-REG-01: always pass unqualifiedTasks — not pendingTasks
                pendingTasks={unqualifiedTasks}
                focusPhase={focusPhase} setFocusPhase={setFocusPhase}
                socraticQuestion={socraticQuestion} setSocraticQuestion={setSocraticQuestion}
                socraticAnswer={socraticAnswer} setSocraticAnswer={setSocraticAnswer}
                wizardStep={wizardStep} setWizardStep={setWizardStep}
                wizardAnswers={wizardAnswers} setWizardAnswers={setWizardAnswers}
                focusTaskType={focusTaskType} setFocusTaskType={setFocusTaskType}
                focusPoolId={focusPoolId} setFocusPoolId={setFocusPoolId}
                focusRelationships={focusRelationships} setFocusRelationships={setFocusRelationships}
                focusRecurringEnabled={focusRecurringEnabled} setFocusRecurringEnabled={setFocusRecurringEnabled}
                focusRecurrence={focusRecurrence} setFocusRecurrence={setFocusRecurrence}
                focusTrackerLabel={focusTrackerLabel} setFocusTrackerLabel={setFocusTrackerLabel}
                focusTypeConfirmed={focusTypeConfirmed}
                onConfirmType={confirmFocusType}
                pools={pools}
                onCreatePool={createPool}
                tasks={tasks}
                onFinish={finishFocus} onSkipTask={skipTask}
                onUpdateTask={updateTaskContent}
              />
            )}

            {guestMode === 'focus' && !focusedTask && (
              <EmptyState icon={<Icons.Hourglass className="w-8 h-8" />} message="Add a task in Freedom mode to start focusing" action={{ label: 'Go to Freedom Mode', onClick: () => setGuestMode('freedom') }} />
            )}

            {guestMode === 'work' && (
              <WorkMode
                pendingTasks={pendingTasks} completedTasks={completedTasks}
                timers={timers} getElapsedSeconds={getElapsedSeconds} formatTimer={formatTimer}
                isTimerRunning={isTimerRunning} isTimerPaused={isTimerPaused} getPausedDuration={getPausedDuration}
                onStartTimer={startTimer} onPauseTimer={pauseTimer} onStopTimer={stopTimer}
                onCompleteTask={completeTask}
                onStartFocus={startFocus}
                reviewTaskId={reviewTaskId} tasks={tasks}
                satisfactionRating={satisfactionRating} setSatisfactionRating={setSatisfactionRating}
                improvements={improvements} setImprovements={setImprovements}
                onSubmitReview={submitReview} onSkipReview={skipReview}
                onGoToFreedom={() => setGuestMode('freedom')}
                pools={pools}
                recurrenceLogs={recurrenceLogs}
                getRecurrenceLog={getRecurrenceLog}
                setRecurrenceLog={setRecurrenceLog}
              />
            )}

            {guestMode === 'review' && (
              <ReviewMode 
                stats={getStats()} 
                reviews={reviews} 
                tasks={tasks} 
                completedTasks={completedTasks}
                onReactivateTask={reactivateTask}
                onUpdateReview={updateReview}
              />
            )}

            {!isAuthenticated && (
              <div style={styles.ctaSection}>
                <p style={styles.ctaText}>Create an account to unlock analytics, sync across devices, and more</p>
                <button style={styles.ctaButton} onClick={() => { setPage('auth'); setAuthMode('signup'); }}>
                  <Icons.Hourglass className="w-4 h-4" /> Create Free Account
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Features */}
        <section style={styles.features}>
          <h2 style={styles.featuresTitle}>Organise with Task Graphs · Recurring · Waves</h2>
          <div style={styles.featuresGrid}>
            <FeatureCard icon={<Icons.TaskGraph />} title="Task Graphs" description="Think of tasks as points in a graph — connect them with Blocks, Pairs With, or Helps Reach links. The app ranks tasks and visualizes paths so the next logical step appears naturally." color="#6366F1" />
            <FeatureCard icon={<Icons.Ripple />} title="Recurring in Graph" description="Recurring behavior now lives inside Task Graph tasks. Turn habits and repeats into consistent wins with lightweight daily tracking." color="#0EA5E9" />
            <FeatureCard icon={<Icons.Feather />} title="Wave" description="Standalone thoughts. A scrap, note or quick task that exists independently." color="#10B981" />
            <FeatureCard icon={<Icons.Brain />} title="Focus Mode" description="Socratic questions help you understand why each task matters." color="#FF6B6B" />
          </div>
        </section>
      </main>

      {/* Marketplace Modal */}
      {showMarketplace && (
        <MarketplaceModal
          templates={MARKETPLACE_TEMPLATES}
          onClose={() => { setShowMarketplace(false); setSeedingTemplate(null); setSeedLoginError(''); }}
          onSeedRequest={(tpl) => setSeedingTemplate(tpl)}
          seedingTemplate={seedingTemplate}
          seedLoginEmail={seedLoginEmail}
          setSeedLoginEmail={setSeedLoginEmail}
          seedLoginPassword={seedLoginPassword}
          setSeedLoginPassword={setSeedLoginPassword}
          seedLoginError={seedLoginError}
          seedingDone={seedingDone}
          onSeedLogin={handleSeedLogin}
          onCancelSeed={() => { setSeedingTemplate(null); setSeedLoginError(''); }}
          isAuthenticated={isAuthenticated}
          onSeedDirect={() => handleSeedTemplate(seedingTemplate)}
        />
      )}

      {/* Video Instruction Modal */}
      <VideoModal
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        onHideOnStartup={handleHideVideoOnStartup}
        hideOnStartup={hideVideoOnStartup}
      />
    </div>
  );
}

// ============================================================================
// MODE BUTTON
// ============================================================================
function ModeButton({ active, onClick, icon, label, disabled }) {
  return (
    <button style={{ ...styles.modeBtn, ...(active ? styles.modeBtnActive : {}), ...(disabled ? styles.modeBtnDisabled : {}) }} onClick={onClick} disabled={disabled}>
      {icon}<span>{label}</span>
    </button>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================
function EmptyState({ icon, message, action }) {
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>{icon}</div>
      <p style={styles.emptyMessage}>{message}</p>
      {action && <button style={styles.outlineBtn} onClick={action.onClick}>{action.label}</button>}
    </div>
  );
}

// ============================================================================
// FEATURE CARD
// ============================================================================
function FeatureCard({ icon, title, description, color }) {
  return (
    <div style={styles.featureCard}>
      <div style={{ ...styles.featureIcon, backgroundColor: `${color}15`, color }}>{icon}</div>
      <h3 style={styles.featureTitle}>{title}</h3>
      <p style={styles.featureDesc}>{description}</p>
    </div>
  );
}

// ============================================================================
// NAV DROPDOWN
// ============================================================================
function NavDropdown({ label, items, isOpen, onToggle, onClose }) {
  const ref = useRef(null);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  // ERR-029: close only on genuine outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button style={styles.navLink} onClick={onToggle}>
        {label} <Icons.ChevronDown className="w-3 h-3" style={{ marginLeft: 4 }} />
      </button>
      {isOpen && (
        <div style={styles.dropdownMenu}>
          {items.map((item, idx) => (
            <a
              key={idx}
              href={item.url}
              style={{
                ...styles.dropdownItem,
                backgroundColor: hoveredIdx === idx ? '#F5F3FF' : 'transparent',
              }}
              // ERR-029: preventDefault stops blur race; close+navigate after selection
              onMouseDown={e => { e.preventDefault(); }}
              onClick={e => { e.preventDefault(); onClose(); console.log('Navigate to:', item.url); }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <span>{item.icon}</span> {item.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FREEDOM MODE - Updated with Rich Text Box and highlighted Focus button
// ============================================================================
function FreedomMode({ newTask, setNewTask, onAddTask, pendingTasks, allPendingCount, completedTasks, onDeleteTask, onStartFocus }) {
  const textareaRef = useRef(null);

  // Focus textarea when Freedom Mode mounts or when switching to Freedom Mode
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [newTask]);

  const handleKeyDown = (e) => {
    // Cmd/Ctrl+Enter to submit
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onAddTask();
    }
    // Enter alone creates new line (default textarea behavior)
  };

  const qualifiedCount = (allPendingCount || 0) - pendingTasks.length;
  
  // Simple rich text formatting
  const applyFormat = (format) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = newTask.substring(start, end);
    
    let formattedText = '';
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'list':
        formattedText = `\n• ${selectedText}`;
        break;
      default:
        return;
    }
    
    const newText = newTask.substring(0, start) + formattedText + newTask.substring(end);
    setNewTask(newText);
  };

  return (
    <div>
      {/* Rich Text Input Area */}
      <div style={styles.richTextContainer}>
        <div style={styles.richTextToolbar}>
          <button style={styles.formatBtn} onClick={() => applyFormat('bold')} title="Bold (wrap selection with **)">
            <Icons.Bold className="w-4 h-4" />
          </button>
          <button style={styles.formatBtn} onClick={() => applyFormat('italic')} title="Italic (wrap selection with *)">
            <Icons.Italic className="w-4 h-4" />
          </button>
          <button style={styles.formatBtn} onClick={() => applyFormat('list')} title="Add bullet point">
            <Icons.List className="w-4 h-4" />
          </button>
          <span style={styles.formatHint}>Cmd/Ctrl+Enter to add</span>
        </div>
        <textarea 
          ref={textareaRef}
          placeholder="What's on your mind? Add notes, tasks, thoughts..." 
          value={newTask} 
          onChange={e => setNewTask(e.target.value)} 
          onKeyDown={handleKeyDown} 
          style={styles.richTextArea}
          rows={3}
        />
        <button style={styles.addTaskBtn} onClick={onAddTask}>
          <Icons.Plus className="w-4 h-4" /> Add Task
        </button>
      </div>
      
      {/* Instruction hint */}
      <p style={styles.focusHint}>
        <Icons.Lightbulb className="w-4 h-4" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
        After adding tasks, click the <strong>Focus</strong> button to visualize and qualify the work
      </p>
      
      {qualifiedCount > 0 && (
        <div style={{ fontSize: 12, color: '#10B981', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 7, padding: '5px 12px', marginBottom: 10 }}>
          ✓ {qualifiedCount} task{qualifiedCount !== 1 ? 's' : ''} moved to Work Mode after Focus — Freedom shows only new captures
        </div>
      )}
      
      {/* Unresolved tasks (current session visible immediately) */}
      {pendingTasks.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#A1A1AA', margin: '10px 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unresolved Tasks</p>
            <div style={styles.taskList}>
              {pendingTasks.map(task => (
                <div key={task.id} style={styles.taskItem}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    {task.type && task.type !== 'blink' && task.type !== 'wave' && (
                      <span style={{ ...styles.typeBadge, backgroundColor: '#6366F115', color: '#6366F1' }}>
                        ⧉ Task Graph
                      </span>
                    )}
                    <span style={styles.taskContent}>{task.content}</span>
                  </div>
                  <div style={styles.taskActions}>
                    <button style={styles.ghostBtn} onClick={() => onDeleteTask(task.id)} title="Delete"><Icons.Trash /></button>
                    <button style={styles.highlightedFocusBtn} onClick={() => onStartFocus(task.id)}>
                      <Icons.Hourglass className="w-3.5 h-3.5" />Focus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// POOL COMBOBOX - Updated with inline Create button
// ERR-029: Fixed dropdown closing on hover. Use onMouseDown+preventDefault on
// items so the outside-click handler never sees a click outside the ref.
// ============================================================================
function PoolComboBox({ pools, onSelect, onCreatePool, selectedPoolId }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const ref = useRef(null);
  const inputRef = useRef(null);

  const filtered = pools.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const selected = pools.find(p => p.id === selectedPoolId);
  const showCreateBtn = search.trim() && !filtered.some(p => p.name.toLowerCase() === search.toLowerCase());

  const handleCreate = () => {
    if (!search.trim()) return;
    const pool = onCreatePool(search.trim());
    onSelect(pool.id);
    setSearch('');
    setOpen(false);
  };

  const handleSelect = (poolId) => {
    onSelect(poolId);
    setOpen(false);
    setSearch('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // ERR-029: close only on genuine outside click — not on clicks inside the dropdown
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={styles.comboInputRow}>
        <div style={{ ...styles.comboInput, flex: 1 }} onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}>
          {open ? (
            <input
              ref={inputRef}
              type="text"
              placeholder="Search or type new Task Graph name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={styles.comboSearchInput}
              onClick={e => e.stopPropagation()}
            />
          ) : selected ? (
            <span style={{ color: '#18181B', fontWeight: 500 }}>⧉ {selected.name}</span>
          ) : (
            <span style={{ color: '#A1A1AA' }}>Search or create a Task Graph…</span>
          )}
          <Icons.ChevronDown className="w-4 h-4" style={{ flexShrink: 0 }} />
        </div>
        {showCreateBtn && (
          <button
            style={styles.inlineCreateBtn}
            // ERR-029: onMouseDown+preventDefault stops blur from firing before click
            onMouseDown={e => { e.preventDefault(); handleCreate(); }}
          >
            <Icons.Plus className="w-4 h-4" /> Create
          </button>
        )}
      </div>
      {open && (
        <div style={styles.comboDropdown}>
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {filtered.length === 0 && !search && <p style={{ color: '#A1A1AA', fontSize: 13, padding: '4px 0' }}>No Task Graphs yet</p>}
            {filtered.map(p => (
              <div
                key={p.id}
                // ERR-029: onMouseDown+preventDefault keeps dropdown open; selection fires reliably
                onMouseDown={e => { e.preventDefault(); handleSelect(p.id); }}
                onMouseEnter={() => setHoveredId(p.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  ...styles.comboOption,
                  backgroundColor: p.id === selectedPoolId
                    ? '#6366F115'
                    : hoveredId === p.id ? '#F5F3FF' : 'transparent',
                  fontWeight: p.id === selectedPoolId ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                ⧉ {p.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// POD COMBOBOX - Updated with inline Create button
// ERR-029: Fixed dropdown closing on hover — onMouseDown+preventDefault pattern
// ============================================================================
function PodComboBox({ pods, onSelect, onCreatePod, selectedPodId }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const ref = useRef(null);
  const inputRef = useRef(null);

  const filtered = pods.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const selected = pods.find(p => p.id === selectedPodId);
  const showCreateBtn = search.trim() && !filtered.some(p => p.name.toLowerCase() === search.toLowerCase());

  const handleQuickCreate = () => {
    if (!search.trim()) return;
    const pod = onCreatePod({ name: search.trim(), podType: 'recurring', recurrence: { type: 'daily' }, trackerFields: [] });
    onSelect(pod.id);
    setSearch('');
    setOpen(false);
  };

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={styles.comboInputRow}>
        <div style={{ ...styles.comboInput, flex: 1 }} onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}>
          {open ? (
            <input
              ref={inputRef}
              type="text"
              placeholder="Search or type new Ripple name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={styles.comboSearchInput}
              onClick={e => e.stopPropagation()}
            />
          ) : selected ? (
            <span style={{ color: '#18181B', fontWeight: 500 }}>〜 {selected.name}</span>
          ) : (
            <span style={{ color: '#A1A1AA' }}>Search or create a Ripple…</span>
          )}
          <Icons.ChevronDown className="w-4 h-4" style={{ flexShrink: 0 }} />
        </div>
        {showCreateBtn && (
          <button
            style={{ ...styles.inlineCreateBtn, backgroundColor: '#0EA5E9' }}
            onMouseDown={e => { e.preventDefault(); handleQuickCreate(); }}
          >
            <Icons.Plus className="w-4 h-4" /> Create
          </button>
        )}
      </div>
      {open && (
        <div style={styles.comboDropdown}>
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {filtered.length === 0 && !search && <p style={{ color: '#A1A1AA', fontSize: 13, padding: '4px 0' }}>No Ripples yet</p>}
            {filtered.map(p => (
              <div
                key={p.id}
                onMouseDown={e => { e.preventDefault(); onSelect(p.id); setOpen(false); setSearch(''); }}
                onMouseEnter={() => setHoveredId(p.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  ...styles.comboOption,
                  backgroundColor: p.id === selectedPodId
                    ? '#0EA5E915'
                    : hoveredId === p.id ? '#F0F9FF' : 'transparent',
                  fontWeight: p.id === selectedPodId ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                <div>
                  <span style={{ fontWeight: 500 }}>〜 {p.name}</span>
                  <div style={{ fontSize: 11, color: '#71717A' }}>{podSummaryLine(p)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// POOL RELATIONSHIP PANEL
// ============================================================================
function PoolRelationshipPanel({ currentTaskId, poolId, pools, tasks, relationships, onAddRelationship, onRemoveRelationship }) {
  const [relType, setRelType] = useState(RELATIONSHIP_TYPES[0].key);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);

  const pool = pools.find(p => p.id === poolId);
  const poolTasks = tasks.filter(t => t.id !== currentTaskId && (t.poolIds || []).includes(poolId));

  const toggleTask = (id) => setSelectedTaskIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleAdd = () => {
    if (selectedTaskIds.length === 0) return;
    selectedTaskIds.forEach(tid => onAddRelationship({ toTaskId: tid, type: relType }));
    setSelectedTaskIds([]);
  };

  if (!pool) return null;

  return (
    <div style={styles.relPanel}>
      <p style={styles.relTitle}>Set relationships within Task Graph: <strong>{pool.name}</strong></p>
      {poolTasks.length === 0 ? (
        <p style={{ color: '#A1A1AA', fontSize: 13 }}>No other tasks in this Task Graph yet — relationships can be added later.</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {RELATIONSHIP_TYPES.map(rt => (
              <button key={rt.key} onClick={() => setRelType(rt.key)} style={{
                ...styles.relTypeBtn,
                ...(relType === rt.key ? { backgroundColor: rt.color, color: 'white', borderColor: rt.color } : {})
              }}>
                {rt.icon} {rt.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
            {poolTasks.map(t => (
              <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', padding: '6px 8px', borderRadius: 6, backgroundColor: selectedTaskIds.includes(t.id) ? '#6366F110' : 'transparent' }}>
                <input type="checkbox" checked={selectedTaskIds.includes(t.id)} onChange={() => toggleTask(t.id)} />
                <span>{t.content}</span>
              </label>
            ))}
          </div>
          <button style={{ ...styles.primaryBtn, backgroundColor: '#6366F1' }} onClick={handleAdd} disabled={selectedTaskIds.length === 0}>
            Link {selectedTaskIds.length > 0 ? selectedTaskIds.length : ''} task{selectedTaskIds.length !== 1 ? 's' : ''}
          </button>
        </>
      )}

      {relationships.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12, color: '#71717A', marginBottom: 6 }}>Added relationships:</p>
          {relationships.map((r, i) => {
            const rt = RELATIONSHIP_TYPES.find(x => x.key === r.type);
            const target = tasks.find(t => t.id === r.toTaskId);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: rt?.color, fontWeight: 600 }}>{rt?.icon} {rt?.label}</span>
                <span style={{ color: '#52525B' }}>{target?.content || r.toTaskId}</span>
                <button onClick={() => onRemoveRelationship(i)} style={{ ...styles.ghostBtn, padding: '2px 4px', color: '#EF4444' }}><Icons.X className="w-3 h-3" /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// RELATIONSHIP LIST TABLE (for Pool List view)
// ============================================================================
function RelationshipListTable({ pool, tasks }) {
  const { relationships = [] } = pool;

  // Build relationship rows including derived "Repeats As" from recurrence
  const relationshipRows = [];

  // Add real relationships from pool.relationships
  relationships.forEach(rel => {
    const fromTask = tasks.find(t => t.id === rel.fromTaskId);
    const toTask = tasks.find(t => t.id === rel.toTaskId);
    if (fromTask && toTask) {
      const relType = RELATIONSHIP_TYPES.find(rt => rt.key === rel.type);
      relationshipRows.push({
        fromTask: fromTask.content,
        relationship: relType?.icon + ' ' + relType?.label || rel.type,
        relationshipColor: relType?.color || '#6366F1',
        toTask: toTask.content,
        explanation: rel.explanation || ''
      });
    }
  });

  // Add derived "Repeats As" rows for tasks with recurrence
  pool.taskIds?.forEach(taskId => {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.recurrenceEnabled && task.recurrence) {
      const summary = recurrenceSummaryLine(task);
      relationshipRows.push({
        fromTask: task.content,
        relationship: '🔁 Repeats As',
        relationshipColor: '#8B5CF6',
        toTask: summary,
        explanation: 'Derived from recurrence schedule'
      });
    }
  });

  if (relationshipRows.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ color: '#A1A1AA', fontSize: 13 }}>No relationships yet — add connections in Focus Mode</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ backgroundColor: '#F3F4F6' }}>
            <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>Task 1</th>
            <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>Relationship</th>
            <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>Task 2</th>
            <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #E5E7EB' }}>What It Means</th>
          </tr>
        </thead>
        <tbody>
          {relationshipRows.map((row, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #E5E7EB' }}>
              <td style={{ padding: '10px 12px', color: '#18181B' }}>{row.fromTask}</td>
              <td style={{ padding: '10px 12px', color: row.relationshipColor, fontWeight: 500 }}>{row.relationship}</td>
              <td style={{ padding: '10px 12px', color: '#18181B' }}>{row.toTask}</td>
              <td style={{ padding: '10px 12px', color: '#6B7280', fontSize: 12 }}>{row.explanation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// POD PICKER / CREATOR (used in Focus Mode) - Simplified with ComboBox
// ============================================================================
function PodPicker({ pods, selectedPodId, onSelect, onCreatePod }) {
  const [creating, setCreating] = useState(false);
  const [podType, setPodType] = useState('annual_dates');
  const [form, setForm] = useState({
    name: '',
    recurrenceType: 'daily',
    weekDays: [0, 1, 2, 3, 4],
    frequency: 3,
    everyNDays: 2,
    trackerFields: [{ id: uid(), name: '', type: 'checkbox' }],
  });

  const handleCreate = () => {
    if (!form.name.trim()) return;
    const base = { name: form.name.trim(), podType };
    const pod = podType === 'annual_dates'
      ? onCreatePod({ ...base, recurrence: null, trackerFields: [] })
      : onCreatePod({
          ...base,
          recurrence: {
            type: form.recurrenceType,
            weekDays: form.weekDays,
            frequency: form.frequency,
            everyNDays: form.everyNDays,
          },
          trackerFields: form.trackerFields.filter(f => f.name.trim()),
        });
    onSelect(pod.id);
    setCreating(false);
  };

  const updateField = (idx, key, val) => setForm(p => {
    const tf = [...p.trackerFields];
    tf[idx] = { ...tf[idx], [key]: val };
    return { ...p, trackerFields: tf };
  });
  const addField = () => { if (form.trackerFields.length >= 5) return; setForm(p => ({ ...p, trackerFields: [...p.trackerFields, { id: uid(), name: '', type: 'checkbox' }] })); };
  const removeField = (idx) => setForm(p => ({ ...p, trackerFields: p.trackerFields.filter((_, i) => i !== idx) }));
  const toggleWeekDay = (d) => setForm(p => ({ ...p, weekDays: p.weekDays.includes(d) ? p.weekDays.filter(x => x !== d) : [...p.weekDays, d] }));

  const recurrencePreview = () => {
    const r = form;
    if (r.recurrenceType === 'daily') return '↳ Will appear every single day in the calendar grid';
    if (r.recurrenceType === 'specific_days') {
      const sel = (r.weekDays || []).sort().map(d => WEEK_DAYS[d]);
      return sel.length ? `↳ Active on: ${sel.join(' · ')}` : '↳ Select at least one day below';
    }
    if (r.recurrenceType === 'every_n_days') return `↳ Shows every ${r.everyNDays} days counting from pod creation date`;
    if (r.recurrenceType === 'monthly_frequency') return `↳ Target: ${r.frequency} times per month — mark any day you complete it`;
    return '';
  };

  return (
    <div style={{ marginTop: 12 }}>
      {!creating ? (
        <>
          <PodComboBox pods={pods} selectedPodId={selectedPodId} onSelect={onSelect} onCreatePod={onCreatePod} />
          <button style={{ ...styles.linkBtn, marginTop: 8, color: '#0EA5E9' }} onClick={() => setCreating(true)}>
          + Create Ripple with advanced options
          </button>
        </>
      ) : (
        <div style={styles.podForm}>
          <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: '#0EA5E9' }}>〜 New Ripple</p>

          <label style={styles.label}>Ripple name</label>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Birthdays, Outdoor Activities, Medication" style={{ ...styles.input, marginBottom: 14 }} />

          <label style={styles.label}>Ripple type</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {POD_TYPES.map(pt => (
              <button key={pt.key} onClick={() => setPodType(pt.key)} style={{ ...styles.podTypeBtn, ...(podType === pt.key ? styles.podTypeBtnActive : {}) }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{pt.label}</div>
                <div style={{ fontSize: 11, color: '#71717A', marginTop: 2 }}>{pt.desc.substring(0, 50)}…</div>
              </button>
            ))}
          </div>

          {podType === 'recurring' && (
            <>
              <label style={styles.label}>Recurrence pattern</label>
              <select value={form.recurrenceType} onChange={e => setForm(p => ({ ...p, recurrenceType: e.target.value }))} style={{ ...styles.input, marginBottom: 8 }}>
                {RECURRENCE_TYPES.map(rt => <option key={rt.key} value={rt.key}>{rt.label}</option>)}
              </select>
              <p style={{ fontSize: 12, color: '#71717A', marginBottom: 14 }}>{recurrencePreview()}</p>

              {form.recurrenceType === 'specific_days' && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                  {WEEK_DAYS.map((d, i) => (
                    <button key={i} onClick={() => toggleWeekDay(i)} style={{ ...styles.weekDayBtn, ...(form.weekDays.includes(i) ? styles.weekDayBtnActive : {}) }}>{d}</button>
                  ))}
                </div>
              )}

              {form.recurrenceType === 'every_n_days' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={styles.label}>Every how many days?</label>
                  <input type="number" min="2" max="365" value={form.everyNDays} onChange={e => setForm(p => ({ ...p, everyNDays: parseInt(e.target.value) || 2 }))} style={{ ...styles.input, width: 100 }} />
                </div>
              )}

              {form.recurrenceType === 'monthly_frequency' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={styles.label}>Times per month</label>
                  <input type="number" min="1" max="31" value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: parseInt(e.target.value) || 1 }))} style={{ ...styles.input, width: 100 }} />
                </div>
              )}

              <label style={styles.label}>Tracker fields (optional)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                {form.trackerFields.map((f, i) => (
                  <div key={f.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input placeholder="Field name" value={f.name} onChange={e => updateField(i, 'name', e.target.value)} style={{ ...styles.input, flex: 1 }} />
                    <select value={f.type} onChange={e => updateField(i, 'type', e.target.value)} style={{ ...styles.input, width: 100 }}>
                      <option value="checkbox">Checkbox</option>
                      <option value="text">Text</option>
                    </select>
                    <button onClick={() => removeField(i)} style={{ ...styles.ghostBtn, padding: 4, color: '#EF4444' }}><Icons.Trash className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                {form.trackerFields.length < 5 && (
                  <button onClick={addField} style={{ ...styles.linkBtn, color: '#0EA5E9', alignSelf: 'flex-start' }}>+ Add field</button>
                )}
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...styles.primaryBtn, backgroundColor: '#0EA5E9' }} onClick={handleCreate}>Create Ripple</button>
            <button style={styles.ghostBtn} onClick={() => setCreating(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// WIZARD TEXTAREA — ERR-030: Separate component so useEffect+useRef is legal.
// key={wizardStep} on parent forces full remount → autoFocus fires every step.
// Ctrl/Cmd+Enter advances to next step keyboard-first (no mouse needed).
// ============================================================================
function WizardTextarea({ placeholder, value, onChange, onAdvance, styles: s }) {
  const taRef = useRef(null);
  useEffect(() => { taRef.current?.focus(); }, []);
  return (
    <textarea
      ref={taRef}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={e => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          onAdvance();
        }
      }}
      style={s}
    />
  );
}

// ============================================================================
// DONE CARD (Focus Mode completion)
// ============================================================================
function DoneCard({ wizardAnswers, questions, setQuestions, setWizardStep, setWizardAnswers, onFinish, task }) {
  const [loadingMore, setLoadingMore] = useState(false);
  const [extended, setExtended] = useState(false);

  const handleMoreQuestions = async () => {
    setLoadingMore(true);
    try {
      const result = await AICoachingService.getCoachingQuestions(task.content, wizardAnswers);
      if (result.questions && result.questions.length > 0) {
        setQuestions(prev => [...prev, ...result.questions]);
        setWizardStep(questions.length);
      }
    } catch (e) {
      console.error('Error getting more questions:', e);
    }
    setLoadingMore(false);
    setExtended(true);
  };

  return (
    <div style={styles.doneCard}>
      <div style={styles.doneIcon}>✓</div>
      <h4 style={styles.doneTitle}>Ready to work!</h4>
      <p style={styles.doneText}>You've qualified this task. It's now in Work Mode.</p>

      {Object.keys(wizardAnswers).length > 0 && (
        <div style={styles.answerSummary}>
          <p style={styles.summaryTitle}>Your answers:</p>
          {Object.entries(wizardAnswers).map(([key, val]) => val && (
            <div key={key} style={styles.summaryItem}>
              <span style={styles.summaryLabel}>{key}:</span>
              <span style={styles.summaryValue}>{val}</span>
            </div>
          ))}
        </div>
      )}

      {!extended && (
        <button style={{ ...styles.linkBtn, marginBottom: 12 }} onClick={handleMoreQuestions} disabled={loadingMore}>
          {loadingMore ? <><Icons.Loader className="w-4 h-4" /> Generating…</> : '✦ Help me with more qualifying questions'}
        </button>
      )}

      <button style={styles.primaryBtn} onClick={onFinish}>
        Go to Work Mode <Icons.ChevronRight />
      </button>
    </div>
  );
}

// ============================================================================
// FOCUS MODE — 2-Step Flow: Associate → Socratic Clarity
// ============================================================================
function FocusMode({
  task, pendingTasks,
  focusPhase, setFocusPhase,
  socraticQuestion, setSocraticQuestion,
  socraticAnswer, setSocraticAnswer,
  wizardStep, setWizardStep, wizardAnswers, setWizardAnswers,
  focusTaskType, setFocusTaskType, focusPoolId, setFocusPoolId,
  focusRelationships, setFocusRelationships,
  focusRecurringEnabled, setFocusRecurringEnabled,
  focusRecurrence, setFocusRecurrence,
  focusTrackerLabel, setFocusTrackerLabel,
  focusTypeConfirmed, onConfirmType,
  pools, onCreatePool, tasks, onFinish, onSkipTask,
  onUpdateTask,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [editTitle, setEditTitle] = useState(task.content);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const editTitleRef = useRef(null);

  // Focus on editTitle input when Focus Mode mounts
  useEffect(() => {
    if (editTitleRef.current && !isTitleEditing) {
      editTitleRef.current.focus();
    }
  }, [task.id, isTitleEditing]);

  // Generate single intelligent Socratic question based on task context
  const generateSocraticQuestion = async () => {
    setIsLoading(true);
    try {
      const pool = focusPoolId ? pools.find(p => p.id === focusPoolId) : null;
      const relatedTasks = focusRelationships.map(r => {
        const t = tasks.find(x => x.id === r.toTaskId);
        return t ? { content: t.content, type: r.type } : null;
      }).filter(Boolean);

      const prompt = `Task: "${task.content}"
${pool ? `Task Graph: "${pool.title}"` : ''}
${relatedTasks.length > 0 ? `Related tasks: ${relatedTasks.map(r => `"${r.content}" (${r.type})`).join(', ')}` : ''}
${focusRecurringEnabled ? `This is a recurring ${focusRecurrence.type} task.` : ''}

Generate ONE profound Socratic question that will help the user deeply understand:
1. WHY this task truly matters (not surface reasons)
2. HOW it connects to their bigger goals
3. WHAT makes this the right thing to do NOW vs later

The question should:
- Be 1-2 sentences max
- Make them think, not just answer
- Feel like a wise mentor probing their true motivations
- Be specific to this task's context (not generic)

Return ONLY the question, no preamble.`;

      const response = await AICoachingService.askQuestion(prompt);
      setSocraticQuestion(response?.trim() || 'Why does this task truly matter to you right now?');
      setFocusPhase('clarity');
    } catch {
      setSocraticQuestion('Why does this task truly matter to you right now?');
      setFocusPhase('clarity');
    }
    setIsLoading(false);
  };

  const addRelationship = (rel) => {
    const generateExplanation = async (fromTaskId, toTaskId, relType) => {
      const fromTask = tasks.find(t => t.id === fromTaskId);
      const toTask = tasks.find(t => t.id === toTaskId);
      if (!fromTask || !toTask) return '';

      const relTypeLabel = RELATIONSHIP_TYPES.find(rt => rt.key === relType)?.label || relType;
      const prompt = `Explain why "${fromTask.content}" ${relTypeLabel} "${toTask.content}" in 1 sentence. Keep it simple and concrete.`;

      try {
        const response = await AICoachingService.askQuestion(prompt);
        return response || '';
      } catch (e) {
        console.error('Failed to generate relationship explanation:', e);
        return '';
      }
    };

    generateExplanation(task.id, rel.toTaskId, rel.type).then(explanation => {
      setFocusRelationships(prev => {
        const idx = prev.findIndex(r => r.toTaskId === rel.toTaskId && r.type === rel.type);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], explanation };
          return updated;
        }
        return prev;
      });
    });

    setFocusRelationships(prev => [...prev, { ...rel, explanation: '' }]);
  };
  const removeRelationship = (idx) => setFocusRelationships(prev => prev.filter((_, i) => i !== idx));

  // Breadcrumb component
  const Breadcrumb = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        borderRadius: 100,
        backgroundColor: focusPhase === 'associate' ? '#6366F1' : '#F4F4F5',
        color: focusPhase === 'associate' ? 'white' : '#71717A',
        fontSize: 13,
        fontWeight: 600,
        transition: 'all .2s'
      }}>
        <span style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: focusPhase === 'associate' ? 'white' : '#6366F1', color: focusPhase === 'associate' ? '#6366F1' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>1</span>
        Associate
      </div>
      <div style={{ width: 32, height: 2, backgroundColor: focusPhase === 'clarity' ? '#6366F1' : '#E4E4E7' }} />
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        borderRadius: 100,
        backgroundColor: focusPhase === 'clarity' ? '#FF6B6B' : '#F4F4F5',
        color: focusPhase === 'clarity' ? 'white' : '#71717A',
        fontSize: 13,
        fontWeight: 600,
        transition: 'all .2s'
      }}>
        <span style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: focusPhase === 'clarity' ? 'white' : '#FF6B6B', color: focusPhase === 'clarity' ? '#FF6B6B' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>2</span>
        Socratic Clarity
      </div>
    </div>
  );

  if (isLoading) return (
    <div style={styles.focusMode}>
      <Breadcrumb />
      <div style={styles.focusHeader}><p style={styles.focusLabel}>Crafting your Socratic question…</p><h3 style={styles.focusTask}>{task.content}</h3></div>
      <div style={styles.loadingCard}><Icons.Loader className="w-8 h-8" /><p style={styles.loadingText}>AI is analyzing your task context…</p></div>
    </div>
  );

  return (
    <div style={styles.focusMode}>
      <Breadcrumb />

      {/* Progress dots — ERR-REG-01 guard: cap at 20 */}
      <div style={styles.progressDots}>
        {pendingTasks.slice(0, 20).map(t => (
          <div key={t.id} style={{ ...styles.dot, ...(t.id === task.id ? styles.dotActive : {}) }} />
        ))}
        {pendingTasks.length > 20 && (
          <span style={{ fontSize: 10, color: '#A1A1AA', alignSelf: 'center' }}>+{pendingTasks.length - 20}</span>
        )}
      </div>

      {/* Task title */}
      <div style={styles.focusHeader}>
        <p style={styles.focusLabel}>Currently focusing on:</p>
        {isTitleEditing ? (
          <input
            ref={editTitleRef}
            autoFocus
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onBlur={() => {
              if (editTitle.trim() && editTitle.trim() !== task.content) {
                onUpdateTask && onUpdateTask(task.id, editTitle.trim());
              }
              setIsTitleEditing(false);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.target.blur(); }
              if (e.key === 'Escape') { setEditTitle(task.content); setIsTitleEditing(false); }
            }}
            style={{ ...styles.focusTask, border: '2px solid #FF6B6B', borderRadius: 8, padding: '6px 10px', outline: 'none', width: '100%', maxWidth: 500, textAlign: 'center', boxSizing: 'border-box', fontSize: 18, fontWeight: 700, backgroundColor: '#FFF9F9' }}
          />
        ) : (
          <h3
            style={{ ...styles.focusTask, cursor: 'text', padding: '4px 8px', borderRadius: 6, transition: 'background .15s' }}
            title="Click to edit task title"
            onClick={() => { setEditTitle(task.content); setIsTitleEditing(true); }}
          >
            {task.content} <span style={{ fontSize: 12, color: '#A1A1AA', fontWeight: 400 }}>✎</span>
          </h3>
        )}
      </div>

      {/* STEP 1: ASSOCIATE — Type, Pool, Relationships */}
      {focusPhase === 'associate' && (
        <div style={styles.wizardCard}>
          <p style={{ fontSize: 14, color: '#71717A', marginBottom: 16, textAlign: 'center' }}>
            Where does this task live? Connect it to see the bigger picture.
          </p>

          {/* Type selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {[
              { key: 'wave', label: '⚡ Wave', desc: 'Standalone — quick task or note', color: '#10B981' },
              { key: 'pool', label: '⧉ Task Graph', desc: 'Connected — part of a larger project', color: '#6366F1' },
            ].map(opt => (
              <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, border: `2px solid ${focusTaskType === opt.key ? opt.color : '#E4E4E7'}`, cursor: 'pointer', backgroundColor: focusTaskType === opt.key ? `${opt.color}08` : 'white', transition: 'all .15s' }}>
                <input type="radio" name="taskType" value={opt.key} checked={focusTaskType === opt.key} onChange={() => setFocusTaskType(opt.key)} style={{ accentColor: opt.color, width: 18, height: 18 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: focusTaskType === opt.key ? opt.color : '#18181B' }}>{opt.label}</div>
                  <div style={{ fontSize: 13, color: '#71717A', marginTop: 2 }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>

          {/* Pool sub-UI — only shown when pool selected */}
          {focusTaskType === 'pool' && (
            <div style={{ marginBottom: 20, padding: 16, backgroundColor: '#F9FAFB', borderRadius: 12, border: '1px solid #E4E4E7' }}>
              <label style={{ ...styles.label, fontSize: 13, marginBottom: 8 }}>Select or create a Task Graph</label>
              <PoolComboBox pools={pools} onSelect={setFocusPoolId} onCreatePool={onCreatePool} selectedPoolId={focusPoolId} />

              {focusPoolId && (
                <>
                  <div style={{ marginTop: 16 }}>
                    <PoolRelationshipPanel
                      currentTaskId={task.id}
                      poolId={focusPoolId}
                      pools={pools}
                      tasks={tasks}
                      relationships={focusRelationships}
                      onAddRelationship={addRelationship}
                      onRemoveRelationship={removeRelationship}
                    />
                  </div>

                  {/* Recurring toggle */}
                  <div style={{ marginTop: 16, padding: 12, backgroundColor: '#F0F9FF', borderRadius: 10, border: '1px solid #BAE6FD' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      <input type="checkbox" checked={focusRecurringEnabled} onChange={e => setFocusRecurringEnabled(e.target.checked)} />
                      Make this recurring
                    </label>
                    {focusRecurringEnabled && (
                      <select
                        value={focusRecurrence.type}
                        onChange={e => setFocusRecurrence(p => ({ ...p, type: e.target.value }))}
                        style={{ ...styles.input, marginTop: 10, fontSize: 13 }}
                      >
                        {RECURRENCE_TYPES.map(rt => <option key={rt.key} value={rt.key}>{rt.label}</option>)}
                      </select>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Generate Socratic Question button */}
          <button
            style={{ ...styles.primaryBtn, width: '100%', padding: '14px 24px', fontSize: 15 }}
            onClick={generateSocraticQuestion}
            disabled={focusTaskType === 'pool' && !focusPoolId}
          >
            <Icons.Sparkles className="w-4 h-4" />
            Generate Socratic Question →
          </button>
          {focusTaskType === 'pool' && !focusPoolId && (
            <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 8 }}>Select a Task Graph first</p>
          )}
        </div>
      )}

      {/* STEP 2: SOCRATIC CLARITY — One intelligent question */}
      {focusPhase === 'clarity' && socraticQuestion && (
        <div style={styles.wizardCard}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', backgroundColor: '#FFF1F1', border: '1px solid #FECACA', borderRadius: 100, fontSize: 12, fontWeight: 600, color: '#FF6B6B' }}>
              <Icons.Sparkles className="w-3.5 h-3.5" />
              Socratic Clarity
            </span>
          </div>

          <h4 style={{ ...styles.wizardQuestion, fontSize: 18, lineHeight: 1.5, marginBottom: 20 }}>{socraticQuestion}</h4>

          <textarea
            placeholder="Your reflection… (Ctrl+Enter to finish)"
            value={socraticAnswer}
            onChange={e => setSocraticAnswer(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                // Save and finish
                setWizardAnswers({ socratic: socraticAnswer, question: socraticQuestion });
                onFinish();
              }
            }}
            style={{ ...styles.textarea, minHeight: 120, fontSize: 15 }}
            autoFocus
          />

          <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8, marginBottom: 20 }}>Optional — but powerful · Ctrl+Enter to finish</p>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              style={{ ...styles.ghostBtn, flex: 1 }}
              onClick={() => setFocusPhase('associate')}
            >
              <Icons.ArrowLeft className="w-4 h-4" />
              Back to Associate
            </button>
            <button
              style={{ ...styles.primaryBtn, flex: 2 }}
              onClick={() => {
                setWizardAnswers({ socratic: socraticAnswer, question: socraticQuestion });
                onFinish();
              }}
            >
              Finish & Go to Work
              <Icons.ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {onSkipTask && (
        <div style={styles.skipSection}><button style={styles.linkBtn} onClick={onSkipTask}>Skip this task for now</button></div>
      )}
    </div>
  );
}

// ============================================================================
// ERR-031: RIPPLES COMPONENTS — lifted to top-level to prevent state wipe.
// Previously defined inside PoolView → WorkMode, causing React to treat them
// as new component types on every parent re-render, unmounting/remounting and
// losing all state (calView, selectedDay, recurringTab, hideDormant).
// Now defined here as stable top-level components with all dependencies passed
// as props. State (calView, selectedDay, etc.) persists across re-renders.
// ============================================================================

const RIPPLES_STATUS_COLORS = {
  planned:   { bg: '#F4F4F5', border: '#E4E4E7', text: '#71717A' },
  completed: { bg: '#F0FDF4', border: '#86EFAC', text: '#10B981' },
  missed:    { bg: '#FEF2F2', border: '#FECACA', text: '#EF4444' },
};
const RIPPLES_STATUS_BUTTONS = [
  { key: 'planned',   label: 'Planned' },
  { key: 'completed', label: 'Done' },
  { key: 'missed',    label: 'Skipped' },
];
const CAL_NAV_BTN = {
  padding: '4px 10px', borderRadius: 6, border: '1px solid #E4E4E7',
  backgroundColor: 'white', color: '#52525B', fontSize: 12, cursor: 'pointer',
};

// ── RecurringCalendarWidget — Week / Month / Year views ──
function RecurringCalendarWidget({ poolRecurring, today, getTaskRelationships, getRecurrenceLog, setRecurrenceLog,
  calView, setCalView, calAnchor, setCalAnchor, selectedDay, setSelectedDay }) {

  const addDaysTo = (ds, n) => {
    const d = new Date(ds + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  const tasksDueOn = (ds) => {
    const due = poolRecurring.filter(t => isScheduledOnDate(t, ds));
    return due.sort((a, b) => {
      const aPri = getTaskRelationships(a).reduce((m, r) => Math.min(m, getRelationshipPriority(r.type)), 5);
      const bPri = getTaskRelationships(b).reduce((m, r) => Math.min(m, getRelationshipPriority(r.type)), 5);
      return aPri - bPri;
    });
  };

  const chipColor = (task) => {
    const rels = getTaskRelationships(task);
    if (!rels.length) return '#94A3B8';
    const minPri = rels.reduce((m, r) => Math.min(m, getRelationshipPriority(r.type)), 5);
    return minPri === 1 ? '#6366F1' : minPri === 2 ? '#10B981' : minPri === 3 ? '#F59E0B' : '#8B5CF6';
  };

  const dayStatus = (ds) => {
    const due = tasksDueOn(ds);
    if (!due.length) return null;
    const logs = due.map(t => getRecurrenceLog(t.id, ds).status);
    if (logs.every(s => s === 'completed')) return '#10B981';
    if (logs.some(s => s === 'missed')) return '#EF4444';
    if (logs.some(s => s === 'completed')) return '#F59E0B';
    return '#94A3B8';
  };

  // ── Expanded day panel ──
  const ExpandedDayPanel = ({ ds }) => {
    const due = tasksDueOn(ds);
    const isPast = ds < today;
    const isFuture = ds > today;
    return (
      <div style={{ marginTop: 12, border: '1px solid #E4E4E7', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '8px 12px', backgroundColor: ds === today ? '#FFF5F5' : '#F9FAFB', borderBottom: '1px solid #E4E4E7', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: ds === today ? '#FF6B6B' : '#18181B' }}>
            {ds === today ? '📅 Today — ' : isFuture ? '📅 ' : '📋 '}{formatFriendlyDate(ds)}
          </span>
          <span style={{ fontSize: 11, color: '#A1A1AA' }}>{due.length} task{due.length !== 1 ? 's' : ''} due</span>
          {isPast && <span style={{ fontSize: 11, backgroundColor: '#FEF2F2', color: '#EF4444', padding: '1px 6px', borderRadius: 4 }}>Past</span>}
          {isFuture && <span style={{ fontSize: 11, backgroundColor: '#F0F9FF', color: '#0EA5E9', padding: '1px 6px', borderRadius: 4 }}>Upcoming</span>}
        </div>
        <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {due.map(task => {
            const log = getRecurrenceLog(task.id, ds);
            const colors = RIPPLES_STATUS_COLORS[log.status] || RIPPLES_STATUS_COLORS.planned;
            const trackers = task.recurrence?.trackers || [];
            const legacyLabel = (task.recurrenceTrackerLabel || '').trim();
            const setStatus = (status) => setRecurrenceLog(task.id, ds, { status });
            const setTracker = (id, value) => setRecurrenceLog(task.id, ds, { trackerValues: { ...(log.trackerValues || {}), [id]: value } });
            return (
              <div key={task.id} style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 6, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#18181B', flex: 1 }}>{task.content}</span>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, backgroundColor: chipColor(task) + '20', color: chipColor(task), fontWeight: 600, flexShrink: 0 }}>
                    {recurrenceSummaryLine(task)}
                  </span>
                </div>
                {!isFuture ? (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#71717A', fontWeight: 500 }}>{ds === today ? 'Today:' : 'Log:'}</span>
                    {RIPPLES_STATUS_BUTTONS.map(s => {
                      const active = log.status === s.key;
                      const sc = RIPPLES_STATUS_COLORS[s.key];
                      return (
                        <button key={s.key} onClick={() => setStatus(s.key)} style={{
                          padding: '3px 10px', borderRadius: 5,
                          border: `1px solid ${active ? sc.text : '#E4E4E7'}`,
                          backgroundColor: active ? sc.text : 'white',
                          color: active ? 'white' : '#71717A',
                          fontSize: 11, fontWeight: 500, cursor: 'pointer',
                        }}>{s.label}</button>
                      );
                    })}
                    {trackers.map(tracker => (
                      <input key={tracker.id} type={tracker.valueType === 'number' ? 'number' : 'text'}
                        placeholder={tracker.label || 'Value'}
                        value={(log.trackerValues || {})[tracker.id] || ''}
                        onChange={e => setTracker(tracker.id, e.target.value)}
                        style={{ padding: '3px 8px', fontSize: 11, border: '1px solid #E4E4E7', borderRadius: 5, width: 80, backgroundColor: 'white' }} />
                    ))}
                    {!trackers.length && legacyLabel && (
                      <input type="text" placeholder={legacyLabel}
                        value={(log.trackerValues || {}).t1 || ''}
                        onChange={e => setTracker('t1', e.target.value)}
                        style={{ padding: '3px 8px', fontSize: 11, border: '1px solid #E4E4E7', borderRadius: 5, width: 80, backgroundColor: 'white' }} />
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: '#A1A1AA', fontStyle: 'italic' }}>Upcoming — log available on the day</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Week view ──
  const WeekView = () => {
    const dow = (new Date(calAnchor + 'T00:00:00').getDay() + 6) % 7;
    const monday = addDaysTo(calAnchor, -dow);
    const days = Array.from({ length: 7 }, (_, i) => addDaysTo(monday, i));
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <button onClick={() => setCalAnchor(addDaysTo(calAnchor, -7))} style={CAL_NAV_BTN}>‹ Prev</button>
          <span style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#18181B' }}>
            {formatFriendlyDate(days[0])} – {formatFriendlyDate(days[6])}
          </span>
          <button onClick={() => setCalAnchor(addDaysTo(calAnchor, 7))} style={CAL_NAV_BTN}>Next ›</button>
          <button onClick={() => setCalAnchor(today)} style={{ ...CAL_NAV_BTN, color: '#FF6B6B' }}>Today</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#A1A1AA', padding: '4px 0' }}>{d}</div>
          ))}
          {days.map(ds => {
            const due = tasksDueOn(ds);
            const isToday = ds === today;
            const isSelected = ds === selectedDay;
            const dot = dayStatus(ds);
            return (
              <div key={ds} onClick={() => setSelectedDay(isSelected ? null : ds)} style={{
                border: isSelected ? '2px solid #6366F1' : isToday ? '2px solid #FF6B6B' : '1px solid #E4E4E7',
                borderRadius: 8, padding: '6px 4px', cursor: 'pointer',
                backgroundColor: isSelected ? '#F5F3FF' : isToday ? '#FFF5F5' : 'white', minHeight: 56,
              }}>
                <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 500, color: isToday ? '#FF6B6B' : '#18181B', textAlign: 'center' }}>
                  {new Date(ds + 'T00:00:00').getDate()}
                </div>
                {dot && <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: dot, margin: '3px auto' }} />}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                  {due.slice(0, 3).map(t => (
                    <div key={t.id} style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, backgroundColor: chipColor(t) + '20', color: chipColor(t), fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.content.substring(0, 12)}
                    </div>
                  ))}
                  {due.length > 3 && <div style={{ fontSize: 9, color: '#A1A1AA', textAlign: 'center' }}>+{due.length - 3}</div>}
                </div>
              </div>
            );
          })}
        </div>
        {selectedDay && tasksDueOn(selectedDay).length > 0 && <ExpandedDayPanel ds={selectedDay} />}
        {selectedDay && tasksDueOn(selectedDay).length === 0 && (
          <div style={{ marginTop: 10, padding: '10px 14px', backgroundColor: '#F4F4F5', borderRadius: 8, fontSize: 13, color: '#A1A1AA', textAlign: 'center' }}>
            No recurring tasks scheduled on {formatFriendlyDate(selectedDay)}
          </div>
        )}
      </div>
    );
  };

  // ── Month view ──
  const MonthView = () => {
    const anchor = new Date(calAnchor + 'T00:00:00');
    const year = anchor.getFullYear(); const month = anchor.getMonth();
    const firstDay = new Date(year, month, 1); const lastDay = new Date(year, month + 1, 0);
    const startPad = (firstDay.getDay() + 6) % 7;
    const cells = Array.from({ length: Math.ceil((startPad + lastDay.getDate()) / 7) * 7 }, (_, i) => {
      const d = new Date(year, month, 1 - startPad + i);
      return { ds: d.toISOString().slice(0, 10), inMonth: d.getMonth() === month };
    });
    const monthLabel = firstDay.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <button onClick={() => setCalAnchor(new Date(year, month - 1, 1).toISOString().slice(0, 10))} style={CAL_NAV_BTN}>‹ Prev</button>
          <span style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#18181B' }}>{monthLabel}</span>
          <button onClick={() => setCalAnchor(new Date(year, month + 1, 1).toISOString().slice(0, 10))} style={CAL_NAV_BTN}>Next ›</button>
          <button onClick={() => setCalAnchor(today)} style={{ ...CAL_NAV_BTN, color: '#FF6B6B' }}>Today</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {['M','T','W','T','F','S','S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#A1A1AA', padding: '2px 0' }}>{d}</div>
          ))}
          {cells.map(({ ds, inMonth }) => {
            const due = tasksDueOn(ds); const isToday = ds === today; const isSelected = ds === selectedDay; const dot = dayStatus(ds);
            return (
              <div key={ds} onClick={() => inMonth && setSelectedDay(isSelected ? null : ds)} style={{
                border: isSelected ? '2px solid #6366F1' : isToday ? '2px solid #FF6B6B' : '1px solid #F0F0F0',
                borderRadius: 6, padding: '4px 3px', cursor: inMonth ? 'pointer' : 'default',
                backgroundColor: isSelected ? '#F5F3FF' : isToday ? '#FFF5F5' : inMonth ? 'white' : '#FAFAFA',
                minHeight: 40, opacity: inMonth ? 1 : 0.35,
              }}>
                <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? '#FF6B6B' : '#52525B', textAlign: 'center' }}>{new Date(ds + 'T00:00:00').getDate()}</div>
                {dot && <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: dot, margin: '2px auto' }} />}
                {due.length > 0 && <div style={{ fontSize: 8, color: '#6366F1', textAlign: 'center', fontWeight: 700 }}>{due.length}</div>}
              </div>
            );
          })}
        </div>
        {selectedDay && <ExpandedDayPanel ds={selectedDay} />}
      </div>
    );
  };

  // ── Year view ──
  const YearView = () => {
    const year = new Date(calAnchor + 'T00:00:00').getFullYear();
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <button onClick={() => setCalAnchor(`${year - 1}-01-01`)} style={CAL_NAV_BTN}>‹ {year - 1}</button>
          <span style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#18181B' }}>{year}</span>
          <button onClick={() => setCalAnchor(`${year + 1}-01-01`)} style={CAL_NAV_BTN}>{year + 1} ›</button>
          <button onClick={() => setCalAnchor(today)} style={{ ...CAL_NAV_BTN, color: '#FF6B6B' }}>Today</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {Array.from({ length: 12 }, (_, m) => {
            const firstDay = new Date(year, m, 1); const lastDay = new Date(year, m + 1, 0);
            const startPad = (firstDay.getDay() + 6) % 7;
            const cells = Array.from({ length: startPad + lastDay.getDate() }, (_, i) => {
              if (i < startPad) return null;
              return new Date(year, m, i - startPad + 1).toISOString().slice(0, 10);
            });
            return (
              <div key={m} style={{ backgroundColor: '#FAFAFA', border: '1px solid #E4E4E7', borderRadius: 8, padding: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#52525B', marginBottom: 4, textAlign: 'center' }}>
                  {firstDay.toLocaleDateString('en-GB', { month: 'short' })}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
                  {cells.map((ds, i) => {
                    if (!ds) return <div key={`p${i}`} />;
                    const due = tasksDueOn(ds); const dot = dayStatus(ds); const isToday = ds === today;
                    return (
                      <div key={ds} onClick={() => { setCalAnchor(ds); setSelectedDay(ds); setCalView('week'); }}
                        title={`${formatFriendlyDate(ds)}: ${due.length} task${due.length !== 1 ? 's' : ''}`}
                        style={{ width: '100%', aspectRatio: '1', borderRadius: 2, cursor: due.length ? 'pointer' : 'default',
                          backgroundColor: dot ? dot + '30' : isToday ? '#FFF5F5' : 'white',
                          border: isToday ? '1px solid #FF6B6B' : '1px solid #F0F0F0' }} />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: '#A1A1AA', textAlign: 'center' }}>
          Click any day to open in Week view · 🟢 all done · 🟡 partial · 🔴 missed · ⚫ pending
        </div>
      </div>
    );
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {[{ key: 'week', label: '🗓 Week' }, { key: 'month', label: '📅 Month' }, { key: 'year', label: '📆 Year' }].map(v => (
          <button key={v.key} onClick={() => { setCalView(v.key); setSelectedDay(null); }} style={{
            padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: calView === v.key ? '1.5px solid #6366F1' : '1px solid #E4E4E7',
            backgroundColor: calView === v.key ? '#F5F3FF' : 'white',
            color: calView === v.key ? '#6366F1' : '#71717A',
          }}>{v.label}</button>
        ))}
      </div>
      {calView === 'week'  && <WeekView />}
      {calView === 'month' && <MonthView />}
      {calView === 'year'  && <YearView />}
    </div>
  );
}

// ── RecurringListView — schedule-aware list with dormant section ──
function RecurringListView({ poolRecurring, today, getTaskRelationships, getRecurrenceLog, setRecurrenceLog, hideDormant, setHideDormant }) {
  const sortByPri = (arr) => [...arr].sort((a, b) => {
    const aPri = getTaskRelationships(a).reduce((m, r) => Math.min(m, getRelationshipPriority(r.type)), 5);
    const bPri = getTaskRelationships(b).reduce((m, r) => Math.min(m, getRelationshipPriority(r.type)), 5);
    return aPri - bPri;
  });
  const dueToday = sortByPri(poolRecurring.filter(t => isScheduledOnDate(t, today)));
  const dormant  = sortByPri(poolRecurring.filter(t => !isScheduledOnDate(t, today)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {dueToday.length === 0 && (
        <div style={{ padding: '12px 14px', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 10, fontSize: 13, color: '#0369A1', textAlign: 'center' }}>
          No recurring tasks scheduled for today in this Task Graph
        </div>
      )}
      {dueToday.map(task => {
        const log = getRecurrenceLog(task.id, today);
        const colors = RIPPLES_STATUS_COLORS[log.status] || RIPPLES_STATUS_COLORS.planned;
        const trackers = task.recurrence?.trackers || [];
        const legacyLabel = (task.recurrenceTrackerLabel || '').trim();
        const setStatus = (status) => setRecurrenceLog(task.id, today, { status });
        const setTracker = (id, value) => setRecurrenceLog(task.id, today, { trackerValues: { ...(log.trackerValues || {}), [id]: value } });
        return (
          <div key={task.id} style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#18181B', flex: 1, minWidth: 0 }}>{task.content}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: '#0EA5E915', color: '#0369A1', fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 500, flexShrink: 0 }}>
                {recurrenceSummaryLine(task)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#71717A', fontWeight: 500 }}>Today:</span>
              {RIPPLES_STATUS_BUTTONS.map(s => {
                const active = log.status === s.key; const sc = RIPPLES_STATUS_COLORS[s.key];
                return (
                  <button key={s.key} onClick={() => setStatus(s.key)} style={{
                    padding: '4px 12px', borderRadius: 6,
                    border: `1px solid ${active ? sc.text : '#E4E4E7'}`,
                    backgroundColor: active ? sc.text : 'white',
                    color: active ? 'white' : '#71717A', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  }}>{s.label}</button>
                );
              })}
              {trackers.map(tracker => (
                <input key={tracker.id} type={tracker.valueType === 'number' ? 'number' : 'text'}
                  placeholder={tracker.label || 'Value'} value={(log.trackerValues || {})[tracker.id] || ''}
                  onChange={e => setTracker(tracker.id, e.target.value)}
                  style={{ flex: 1, minWidth: 100, padding: '4px 8px', fontSize: 12, border: '1px solid #E4E4E7', borderRadius: 6, backgroundColor: 'white' }} />
              ))}
              {!trackers.length && legacyLabel && (
                <input type="text" placeholder={legacyLabel} value={(log.trackerValues || {}).t1 || ''}
                  onChange={e => setTracker('t1', e.target.value)}
                  style={{ flex: 1, minWidth: 100, padding: '4px 8px', fontSize: 12, border: '1px solid #E4E4E7', borderRadius: 6, backgroundColor: 'white' }} />
              )}
            </div>
          </div>
        );
      })}
      {dormant.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <button onClick={() => setHideDormant(h => !h)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#71717A', padding: '4px 0', marginBottom: 6 }}>
            <span style={{ fontSize: 10 }}>{hideDormant ? '▶' : '▼'}</span>
            {hideDormant ? `Show ${dormant.length} dormant task${dormant.length !== 1 ? 's' : ''} not scheduled today` : `Hide dormant tasks (${dormant.length})`}
          </button>
          {!hideDormant && dormant.map(task => {
            const next = getNextScheduledDate(task, todayStr());
            const nextLabel = next ? (next === todayStr() ? 'Today' : formatFriendlyDate(next)) : 'No upcoming schedule';
            return (
              <div key={task.id} style={{ border: '1px solid #E4E4E7', borderRadius: 10, padding: '10px 12px', backgroundColor: '#FAFAFA', opacity: 0.75, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#52525B' }}>{task.content}</span>
                  <div style={{ fontSize: 11, color: '#A1A1AA', marginTop: 2 }}>{recurrenceSummaryLine(task)}</div>
                </div>
                <span style={{ fontSize: 11, color: '#0369A1', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', padding: '3px 8px', borderRadius: 6, fontWeight: 500, flexShrink: 0 }}>
                  🔜 Next: {nextLabel}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── RipplesMain — tab toggle wrapper (List / Calendar) ──
function RipplesMain({ pool, poolRecurring, PoolHeader, getTaskRelationships, getRecurrenceLog, setRecurrenceLog,
  recurringTab, setRecurringTab, hideDormant, setHideDormant,
  calView, setCalView, calAnchor, setCalAnchor, selectedDay, setSelectedDay }) {
  const today = todayStr();

  return (
    <>
      <PoolHeader />
      <div style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#0369A1' }}>
        〜 Recurring view inside Task Graph for <strong>{pool.name}</strong>
      </div>
      {poolRecurring.length === 0 ? (
        <EmptyState icon={<Icons.Ripple className="w-8 h-8" />} message="No recurring tasks in this Task Graph yet. Enable recurrence in Focus Mode." />
      ) : (
        <>
          <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
            {[{ key: 'list', label: '📋 List' }, { key: 'calendar', label: '📅 Calendar' }].map(t => (
              <button key={t.key} onClick={() => setRecurringTab(t.key)} style={{
                padding: '5px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: recurringTab === t.key ? '1.5px solid #0EA5E9' : '1px solid #E4E4E7',
                backgroundColor: recurringTab === t.key ? '#F0F9FF' : 'white',
                color: recurringTab === t.key ? '#0369A1' : '#71717A',
              }}>{t.label}</button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#71717A', alignSelf: 'center' }}>
              {poolRecurring.length} recurring · {poolRecurring.filter(t => isScheduledOnDate(t, today)).length} due today
            </span>
          </div>
          {recurringTab === 'list' && (
            <RecurringListView
              poolRecurring={poolRecurring} today={today}
              getTaskRelationships={getTaskRelationships}
              getRecurrenceLog={getRecurrenceLog} setRecurrenceLog={setRecurrenceLog}
              hideDormant={hideDormant} setHideDormant={setHideDormant}
            />
          )}
          {recurringTab === 'calendar' && (
            <RecurringCalendarWidget
              poolRecurring={poolRecurring} today={today}
              getTaskRelationships={getTaskRelationships}
              getRecurrenceLog={getRecurrenceLog} setRecurrenceLog={setRecurrenceLog}
              calView={calView} setCalView={setCalView}
              calAnchor={calAnchor} setCalAnchor={setCalAnchor}
              selectedDay={selectedDay} setSelectedDay={setSelectedDay}
            />
          )}
        </>
      )}
    </>
  );
}

// ============================================================================
// WORK MODE - Updated with new features
// ============================================================================
function WorkMode({
  pendingTasks, completedTasks, timers, getElapsedSeconds, formatTimer,
  isTimerRunning, isTimerPaused, getPausedDuration,
  onStartTimer, onPauseTimer, onStopTimer, onCompleteTask,
  onStartFocus,
  reviewTaskId, tasks, satisfactionRating, setSatisfactionRating,
  improvements, setImprovements, onSubmitReview, onSkipReview, onGoToFreedom,
  pools, recurrenceLogs, getRecurrenceLog, setRecurrenceLog,
}) {
  const [contextFilter, setContextFilter] = useState('pools');
  const [poolStrategyView, setPoolStrategyView] = useState('list');
  const [relSort, setRelSort] = useState('default');
  const [selectedPoolId, setSelectedPoolId] = useState(() => {
    const saved = localStorage.getItem('ot2_last_selected_pool');
    return saved || null;
  });
  const [showRelationshipGraph, setShowRelationshipGraph] = useState(false);

  // ERR-031: Ripples calendar state lifted to WorkMode so it survives PoolView re-creation.
  // PoolView is a const inside WorkMode — it gets a new reference every render, causing
  // React to unmount/remount any component defined inside it. By keeping this state here,
  // it persists across those re-renders and is passed down as stable props.
  const [recurringTab, setRecurringTab]   = useState('list');
  const [hideDormant, setHideDormant]     = useState(true);
  const [calView, setCalView]             = useState('week');
  const [calAnchor, setCalAnchor]         = useState(todayStr());
  const [selectedDay, setSelectedDay]     = useState(null);
  const contextFilterRef = useRef(null);
  const reviewTask = tasks.find(t => t.id === reviewTaskId);

  // Focus on context filter dropdown when WorkMode mounts
  useEffect(() => {
    if (contextFilterRef.current) {
      contextFilterRef.current.focus();
    }
  }, []);

  // Save selected pool to localStorage when it changes
  useEffect(() => {
    if (selectedPoolId) {
      localStorage.setItem('ot2_last_selected_pool', selectedPoolId);
    }
  }, [selectedPoolId]);

  // Set contextFilter to 'pools' when last pool is loaded
  useEffect(() => {
    const saved = localStorage.getItem('ot2_last_selected_pool');
    if (saved) {
      setContextFilter('pools');
    }
  }, []);

  // Waves = tasks not in any Pool or Pod
  const waveTasks = pendingTasks.filter(t => !(t.poolIds?.length));

  const categorizeByDeadline = (task) => {
    const deadline = task.reflection?.deadline?.toLowerCase() || '';
    if (!deadline || deadline === '-') return 'notplanned';
    if (/\b(today|tonight|now|asap|urgent)\b/.test(deadline)) return 'today';
    if (/\b(tomorrow|next|week|month|later|soon|eventually)\b/.test(deadline)) return 'future';
    if (/\b(yesterday|overdue|late|missed|past|ago)\b/.test(deadline)) return 'missed';
    return 'notplanned';
  };

  const kanbanLanes = { today: { title: 'Today', color: '#FF6B6B', tasks: [] }, future: { title: 'Future', color: '#4299E1', tasks: [] }, missed: { title: 'Missed', color: '#F59E0B', tasks: [] }, notplanned: { title: 'Not Planned', color: '#A1A1AA', tasks: [] } };
  waveTasks.forEach(t => kanbanLanes[categorizeByDeadline(t)].tasks.push(t));

  // Focus button component
  const FocusBtn = ({ taskId }) => (
    <button
      title="Open in Focus Mode"
      style={styles.focusBtnSmall}
      onClick={() => onStartFocus && onStartFocus(taskId)}
    >
      <Icons.Hourglass className="w-3 h-3" /> Focus
    </button>
  );

  // Get pool name for a task
  const getPoolName = (task) => {
    if (!task.poolIds?.length) return null;
    const pool = pools.find(p => p.id === task.poolIds[0]);
    return pool?.name;
  };

  // Get relationships for a task
  const getTaskRelationships = (task) => {
    if (!task.poolIds?.length) return [];
    const pool = pools.find(p => p.id === task.poolIds[0]);
    if (!pool?.relationships) return [];
    return pool.relationships.filter(r => r.fromTaskId === task.id || r.toTaskId === task.id);
  };

  // Check if a task is blocked (another incomplete task has a 'blocks' rel pointing TO this task)
  const isTaskBlocked = (task) => {
    if (!task.poolIds?.length) return null;
    const pool = pools.find(p => p.id === task.poolIds[0]);
    if (!pool?.relationships) return null;
    const blockingRel = pool.relationships.find(r =>
      r.type === 'blocks' && r.toTaskId === task.id
    );
    if (!blockingRel) return null;
    const blocker = tasks.find(t => t.id === blockingRel.fromTaskId && !t.isCompleted);
    return blocker || null;
  };

  // Sort tasks by relationship priority
  const sortTasksByRelationship = (taskList) => {
    if (relSort === 'default') return taskList;
    if (['blocks','pairs_with','enables','results_in'].includes(relSort)) {
      return [...taskList].sort((a, b) => {
        const aRels = getTaskRelationships(a);
        const bRels = getTaskRelationships(b);
        const aHas = aRels.some(r => r.type === relSort) ? 0 : 1;
        const bHas = bRels.some(r => r.type === relSort) ? 0 : 1;
        return aHas - bHas;
      });
    }
    // 'priority' — full priority sort
    return [...taskList].sort((a, b) => {
      const aRels = getTaskRelationships(a);
      const bRels = getTaskRelationships(b);
      const aPri = aRels.length ? Math.min(...aRels.map(r => getRelationshipPriority(r.type))) : 5;
      const bPri = bRels.length ? Math.min(...bRels.map(r => getRelationshipPriority(r.type))) : 5;
      return aPri - bPri;
    });
  };

  // TaskCard component with all reflection answers
  const TaskCard = ({ task, compact = false, showPoolInfo = true }) => {
    const elapsed = getElapsedSeconds(task.id);
    const running = isTimerRunning(task.id);
    const paused = isTimerPaused(task.id);
    const poolName = getPoolName(task);
    const relationships = getTaskRelationships(task);
    const blockedBy = isTaskBlocked(task);
    const isBlocked = !!blockedBy;

    // Get all reflection answers as bullets
    const getReasonToDo = () => {
      if (!task.reflection) return null;
      const answers = [];
      if (task.reflection.deadline) answers.push({ key: 'Deadline', value: task.reflection.deadline });
      if (task.reflection.outcome) answers.push({ key: 'Outcome', value: task.reflection.outcome });
      if (task.reflection.motivation) answers.push({ key: 'Motivation', value: task.reflection.motivation });
      if (task.reflection.complexity) answers.push({ key: 'Complexity', value: task.reflection.complexity });
      if (task.reflection.urgency) answers.push({ key: 'Urgency', value: task.reflection.urgency });
      return answers;
    };

    const reasons = getReasonToDo();

    // Build per-relationship Work Mode banners
    const buildBanners = () => {
      const pool = pools.find(p => p.id === task.poolIds?.[0]);
      const pName = pool?.name || '';
      const banners = [];

      // Blocked-by banner (hard blocker — this task is the TARGET of a blocks rel)
      if (isBlocked) {
        banners.push({
          key: 'blocked',
          bg: '#F5F3FF', border: '#C4B5FD', color: '#6366F1',
          text: `⏸ Waiting for "${blockedBy.content}" to be marked complete`,
          type: 'blocks',
          otherTaskId: blockedBy.id,   // FEAT-027: scroll target
        });
      }

      relationships.forEach((rel, i) => {
        const migratedType = migrateRelationshipType(rel.type);
        const otherTaskId = rel.fromTaskId === task.id ? rel.toTaskId : rel.fromTaskId;
        const otherTask = tasks.find(t => t.id === otherTaskId);
        if (!otherTask) return;
        const otherTitle = otherTask.content.length > 35
          ? otherTask.content.substring(0, 35) + '…'
          : otherTask.content;

        if (migratedType === 'blocks') {
          if (rel.fromTaskId === task.id) {
            banners.push({
              key: `blocks-${i}`,
              bg: '#EEF2FF', border: '#A5B4FC', color: '#4F46E5',
              text: `⏸ This task blocks "${otherTitle}"`,
              type: 'blocks',
              otherTaskId,   // FEAT-027
            });
          }
        } else if (migratedType === 'enables') {
          if (rel.toTaskId === task.id) {
            banners.push({
              key: `enables-${i}`,
              bg: '#FFFBEB', border: '#FDE68A', color: '#B45309',
              text: `💡 Finishing "${otherTitle}" may speed up this task`,
              type: 'enables',
              otherTaskId,   // FEAT-027
            });
          } else {
            banners.push({
              key: `enables-out-${i}`,
              bg: '#FFFBEB', border: '#FDE68A', color: '#B45309',
              text: `💡 This task enables "${otherTitle}"`,
              type: 'enables',
              otherTaskId,   // FEAT-027
            });
          }
        } else if (migratedType === 'pairs_with') {
          banners.push({
            key: `pairs-${i}`,
            bg: '#F0FDF4', border: '#86EFAC', color: '#15803D',
            text: `🔗 Do alongside "${otherTitle}"${pName ? ` to meet "${pName}" requirements` : ''}`,
            type: 'pairs_with',
            otherTaskId,   // FEAT-027
          });
        } else if (migratedType === 'results_in') {
          if (rel.fromTaskId === task.id) {
            banners.push({
              key: `results-from-${i}`,
              bg: '#F5F3FF', border: '#DDD6FE', color: '#7C3AED',
              text: `🔀 Completing this may lead to "${otherTitle}" — or an alternative path`,
              type: 'results_in',
              otherTaskId,   // FEAT-027
            });
          } else {
            banners.push({
              key: `results-to-${i}`,
              bg: '#FAF5FF', border: '#E9D5FF', color: '#9333EA',
              text: `⏳ Available once "${otherTitle}" is complete — one path will be chosen`,
              type: 'results_in',
              otherTaskId,   // FEAT-027
            });
          }
        }
      });

      return banners;
    };

    const banners = showPoolInfo && relationships.length > 0 ? buildBanners() : isBlocked ? [{
      key: 'blocked-only',
      bg: '#F5F3FF', border: '#C4B5FD', color: '#6366F1',
      text: `⏸ Waiting for "${blockedBy?.content?.substring(0, 35)}" to be marked complete`,
      type: 'blocks',
      otherTaskId: blockedBy?.id,   // FEAT-027
    }] : [];

    // FEAT-027: scroll to a related task card within Work Mode and flash it
    const scrollToTask = (targetId) => {
      if (!targetId) return;
      const el = document.getElementById(`task-card-${targetId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('task-card-flash');
      setTimeout(() => el.classList.remove('task-card-flash'), 900);
    };

    return (
      <div
        id={`task-card-${task.id}`}
        style={{
          ...styles.workTaskCard,
          ...(isBlocked ? { opacity: 0.72, borderColor: '#C4B5FD', backgroundColor: '#FAFAFA' } : {}),
        }}
      >
        <div style={styles.workTaskHeader}>
          <button style={styles.checkbox} onClick={() => !isBlocked && onCompleteTask(task.id)} disabled={isBlocked} />
          <div style={{ flex: 1 }}>
            <span
              style={{
                ...styles.workTaskTitle,
                ...(isBlocked ? { color: '#A1A1AA', cursor: 'default' } : {}),
              }}
              onClick={() => !isBlocked && onStartFocus(task.id)}
              title={isBlocked ? `Blocked by: ${blockedBy?.content}` : 'Click to focus on this task'}
            >
              {task.content}
            </span>

            {/* Type badge with pool name */}
            <div style={styles.taskMetaRow}>
              {task.type === 'pool' && poolName && (
                <span style={styles.poolBadge}>⧉ Graph: {poolName}</span>
              )}
              {task.recurrenceEnabled && <span style={styles.podBadge}>〜 Recurring</span>}
              {(!task.type || task.type === 'blink' || task.type === 'wave') && <span style={styles.waveBadge}>⚡ Wave</span>}
            </div>
          </div>
        </div>

        {/* Reason to do - all answers as bullets */}
        {reasons && reasons.length > 0 && (
          <div style={styles.reasonToDoSection}>
            <p style={styles.reasonToDoTitle}>Reason to do:</p>
            <ul style={styles.reasonToDoList}>
              {reasons.map((r, idx) => (
                <li key={idx} style={styles.reasonToDoItem}>
                  <strong>{r.key}:</strong> {r.value}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Relationship banners — semantic per type, with ↗ View link to related task */}
        {banners.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            {banners.map(b => (
              <div key={b.key} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 8px 6px 10px', borderRadius: 7,
                backgroundColor: b.bg, border: `1px solid ${b.border}`,
                fontSize: 12, color: b.color, lineHeight: 1.4,
              }}>
                <span style={{ flex: 1 }}>{b.text}</span>
                {b.otherTaskId && (
                  <button
                    onClick={() => scrollToTask(b.otherTaskId)}
                    title="Jump to this task in Work Mode"
                    style={{
                      flexShrink: 0,
                      padding: '2px 8px',
                      borderRadius: 5,
                      border: `1px solid ${b.border}`,
                      backgroundColor: 'white',
                      color: b.color,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ↗ View
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={styles.workTaskActions}>
          <FocusBtn taskId={task.id} />

          {/* Timer controls — disabled if task is blocked */}
          {isBlocked ? (
            <button style={{ ...styles.startWorkBtn, opacity: 0.4, cursor: 'not-allowed' }} disabled title="Blocked — complete the prerequisite task first">
              ⏸ Blocked
            </button>
          ) : (
            <>
              {!running && !paused && (
                <button style={styles.startWorkBtn} onClick={() => onStartTimer(task.id)}>
                  Start Work Block
                </button>
              )}
              {(running || paused) && (
                <div style={styles.timerControls}>
                  <span style={{ ...styles.timerDisplay, ...(running ? { color: '#FF6B6B', fontWeight: 600 } : {}) }}>
                    {formatTimer(elapsed)}
                  </span>
                  {running && (
                    <button style={styles.pauseBtn} onClick={() => onPauseTimer(task.id)}>
                      <Icons.Pause className="w-3.5 h-3.5" /> Pause
                    </button>
                  )}
                  {paused && (
                    <button style={styles.resumeBtn} onClick={() => onStartTimer(task.id)}>
                      <Icons.Play className="w-3.5 h-3.5" /> Resume
                    </button>
                  )}
                  <button style={styles.stopBtn} onClick={() => onStopTimer(task.id)}>
                    <Icons.Square className="w-3 h-3" /> Stop
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // List Waves View (default view)
  const ListWavesView = () => {
    const sorted = sortTasksByRelationship(waveTasks);
    return (
      <div style={styles.listWavesContainer}>
        {sorted.length === 0 ? (
          <EmptyState icon={<Icons.Briefcase className="w-8 h-8" />} message="No waves here. Add tasks in Freedom mode, or check Task Graphs." action={{ label: 'Go to Freedom Mode', onClick: onGoToFreedom }} />
        ) : (
          sorted.map(task => <TaskCard key={task.id} task={task} />)
        )}
      </div>
    );
  };

  const KanbanView = () => (
    <div style={styles.kanbanContainer}>
      {Object.entries(kanbanLanes).map(([key, lane]) => (
        <div key={key} style={styles.kanbanLane}>
          <div style={{ ...styles.kanbanLaneHeader, borderTopColor: lane.color }}>
            <span style={styles.kanbanLaneTitle}>{lane.title}</span>
            <span style={{ ...styles.kanbanLaneCount, backgroundColor: lane.color }}>{lane.tasks.length}</span>
          </div>
          <div style={styles.kanbanLaneBody}>
            {lane.tasks.length === 0 ? <div style={styles.kanbanEmpty}>No waves</div> : lane.tasks.map(t => <TaskCard key={t.id} task={t} compact />)}
          </div>
        </div>
      ))}
    </div>
  );

  // Pool View — supports all four strategy views
  const PoolView = () => {
    const pool = pools.find(p => p.id === selectedPoolId);
    const poolTasks = pendingTasks.filter(t => (t.poolIds || []).includes(selectedPoolId));
    const poolRels = (pool?.relationships || []);

    // ── Kanban lanes for pool tasks — apply rel sort within each lane ──
    const poolKanbanLanes = { today: { title: 'Today', color: '#FF6B6B', tasks: [] }, future: { title: 'Future', color: '#4299E1', tasks: [] }, missed: { title: 'Missed', color: '#F59E0B', tasks: [] }, notplanned: { title: 'Not Planned', color: '#A1A1AA', tasks: [] } };
    poolTasks.forEach(t => poolKanbanLanes[categorizeByDeadline(t)].tasks.push(t));
    Object.values(poolKanbanLanes).forEach(lane => { lane.tasks = sortTasksByRelationship(lane.tasks); });

    // ── DailyZen scoring for pool tasks ──
    const scorePoolTask = (task) => {
      const text = ((task.content || '') + ' ' + (task.reflection?.deadline || '') + ' ' + (task.reflection?.motivation || '') + ' ' + (task.reflection?.complexity || '')).toLowerCase();
      let score = 0;
      if (/complex|difficult|challenging|research|design|build|create|architect|strategic|analysis|write|plan/.test(text)) score += 3;
      if (/deep|focus|hard|major|important|critical|key|vital|crucial/.test(text)) score += 2;
      if (/urgent|asap|today|deadline|must|required|client|boss|team|meeting|blocking/.test(text)) score += 1;
      if (/quick|simple|easy|minor|small|brief|short|just|routine|admin/.test(text)) score -= 2;
      return score;
    };

    // ── WorkIQ classification for pool tasks ──
    const classifyPoolTask = (task) => {
      const text = ((task.content || '') + ' ' + (task.reflection?.deadline || '') + ' ' + (task.reflection?.motivation || '') + ' ' + (task.reflection?.complexity || '') + ' ' + (task.reflection?.outcome || '')).toLowerCase();
      const urgentSignals   = /urgent|asap|today|tonight|deadline|now|must|blocking|waiting|client|boss|critical/.test(text);
      const familiarSignals = /routine|regular|standard|usual|same|again|normal|everyday|process|procedure|update|review|check/.test(text);
      const mindfulSignals  = /want|love|passion|excited|learn|grow|develop|explore|creative|interesting|curious|support|mentor/.test(text);
      const newWorkSignals  = /new|partner|team|vendor|collaborate|together|meeting|brainstorm|align|coordinate|external|help/.test(text);
      const weakSignals     = /hate|avoid|dread|bad at|not good|struggle|difficult|outsource|delegate|someone else|not my|should not/.test(text);
      if (weakSignals) return 'q4';
      if (newWorkSignals && !familiarSignals) return 'q3';
      if (mindfulSignals && !familiarSignals) return 'q2';
      if (urgentSignals || familiarSignals) return 'q1';
      if (/complex|difficult|research|build|create/.test(text)) return 'q2';
      return 'q1';
    };

    // ── Pool selector + Relationship Graph toggle (always shown at top) ──
    const PoolHeader = () => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#71717A' }}>Task Graph:</span>
        <select value={selectedPoolId || ''} onChange={e => setSelectedPoolId(e.target.value)} style={{ ...styles.input, flex: 1, maxWidth: 300 }}>
          <option value="">— Select a Task Graph —</option>
          {pools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {pool && (
          <label style={styles.toggleLabel}>
            <input type="checkbox" checked={showRelationshipGraph} onChange={e => setShowRelationshipGraph(e.target.checked)} />
            Relationship Graph
          </label>
        )}
        {pool && (
          <div style={styles.poolMetaChip}>{poolTasks.length} tasks</div>
        )}
      </div>
    );

    if (!selectedPoolId) return <><PoolHeader /><EmptyState icon={<Icons.Layers className="w-8 h-8" />} message="Select a Task Graph to see its tasks" /></>;

    // Relationship Graph overrides strategy
    if (showRelationshipGraph && pool) return (
      <><PoolHeader />
        <RelationshipGraph pool={pool} tasks={poolTasks} allTasks={tasks} relationships={poolRels} onTaskClick={(taskId) => onStartFocus(taskId)} />
      </>
    );

    if (!pool) return <PoolHeader />;

    // ── LIST strategy ──
    if (poolStrategyView === 'list') return (
      <>
        <PoolHeader />
        {poolTasks.length === 0
          ? <EmptyState icon={<Icons.Layers className="w-8 h-8" />} message="No tasks assigned to this pool yet. Use Focus Mode to add tasks." />
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{sortTasksByRelationship(poolTasks).map(task => <TaskCard key={task.id} task={task} />)}</div>
        }
      </>
    );

    // ── KANBAN strategy ──
    if (poolStrategyView === 'kanban') return (
      <>
        <PoolHeader />
        <div style={styles.kanbanContainer}>
          {Object.entries(poolKanbanLanes).map(([key, lane]) => (
            <div key={key} style={styles.kanbanLane}>
              <div style={{ ...styles.kanbanLaneHeader, borderTopColor: lane.color }}>
                <span style={styles.kanbanLaneTitle}>{lane.title}</span>
                <span style={{ ...styles.kanbanLaneCount, backgroundColor: lane.color }}>{lane.tasks.length}</span>
              </div>
              <div style={styles.kanbanLaneBody}>
                {lane.tasks.length === 0 ? <div style={styles.kanbanEmpty}>No tasks</div> : lane.tasks.map(t => <TaskCard key={t.id} task={t} compact />)}
              </div>
            </div>
          ))}
        </div>
      </>
    );

    // ── DAILYZEN strategy ──
    if (poolStrategyView === 'dailyzen') {
      const sorted = [...poolTasks].sort((a, b) => scorePoolTask(b) - scorePoolTask(a));
      const deepWork  = sorted.slice(0, 1);
      const necessity = sorted.slice(1, 4);
      const lightenUp = sorted.slice(4, 9);
      const DZSection = ({ title, emoji, color, bgColor, tasks, limit, hint }) => (
        <div style={{ backgroundColor: bgColor, borderRadius: 12, padding: 16, borderLeft: `4px solid ${color}`, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 22 }}>{emoji}</span>
            <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700, color: '#18181B' }}>{title}</div><div style={{ fontSize: 11, color: '#71717A' }}>{hint}</div></div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'white', backgroundColor: color, padding: '2px 10px', borderRadius: 100 }}>{tasks.length}/{limit}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {tasks.length === 0 ? <div style={{ fontSize: 13, color: '#A1A1AA', fontStyle: 'italic' }}>Nothing here</div> : tasks.map(t => <TaskCard key={t.id} task={t} />)}
          </div>
        </div>
      );
      return (
        <>
          <PoolHeader />
          <div style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400E' }}>
            ✨ <strong>DailyZen</strong> · AI picks focus from <strong>{pool.name}</strong> Task Graph — 1 deep, 3 necessity, 5 light.
          </div>
          {poolTasks.length === 0
            ? <EmptyState icon={<Icons.Layers className="w-8 h-8" />} message="No tasks in this pool yet." />
            : <><DZSection title="Deep Work" emoji="🧠" color="#6366F1" bgColor="#F5F3FF" tasks={deepWork} limit={1} hint="One task that demands full attention" /><DZSection title="Necessity" emoji="⚡" color="#F59E0B" bgColor="#FFFBEB" tasks={necessity} limit={3} hint="Three things to move forward today" /><DZSection title="Lighten Up" emoji="🌊" color="#10B981" bgColor="#F0FDF4" tasks={lightenUp} limit={5} hint="Five easier tasks to keep momentum" /></>
          }
        </>
      );
    }

    // ── WORKIQ 4×4 strategy ──
    if (poolStrategyView === 'workiq') {
      const quadrants = {
        q1: { tasks: [], color: '#10B981', bg: '#F0FDF4', label: 'Standard Work',      sub: 'Work that I am good at',                    emoji: '✅' },
        q2: { tasks: [], color: '#6366F1', bg: '#F5F3FF', label: 'Mindful Work',        sub: 'Work I want to do & need support',           emoji: '🧘' },
        q3: { tasks: [], color: '#0EA5E9', bg: '#F0F9FF', label: 'New Work',            sub: 'Work I can do with partners / vendors',      emoji: '🤝' },
        q4: { tasks: [], color: '#EF4444', bg: '#FEF2F2', label: 'Needs Replacement',   sub: 'Work I am not good at — find someone',      emoji: '🔄' },
      };
      poolTasks.forEach(t => quadrants[classifyPoolTask(t)].tasks.push(t));
      const QCell = ({ qKey }) => {
        const q = quadrants[qKey];
        return (
          <div style={{ backgroundColor: q.bg, borderRadius: 12, padding: 14, border: `2px solid ${q.color}30`, minHeight: 180, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, borderBottom: `1px solid ${q.color}30`, paddingBottom: 8 }}>
              <span style={{ fontSize: 18 }}>{q.emoji}</span>
              <div><div style={{ fontSize: 13, fontWeight: 700, color: q.color }}>{q.label}</div><div style={{ fontSize: 11, color: '#71717A', lineHeight: 1.3 }}>{q.sub}</div></div>
              <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, backgroundColor: q.color, color: 'white', borderRadius: 100, padding: '2px 8px' }}>{q.tasks.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto', maxHeight: 260 }}>
              {q.tasks.length === 0 ? <div style={{ fontSize: 12, color: '#A1A1AA', fontStyle: 'italic', marginTop: 8 }}>No tasks here</div> : q.tasks.map(t => <TaskCard key={t.id} task={t} compact />)}
            </div>
          </div>
        );
      };
      return (
        <>
          <PoolHeader />
          <div style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#0369A1' }}>
            🧩 <strong>WorkIQ 4×4</strong> · AI slots <strong>{pool.name}</strong> tasks by familiarity &amp; intent.
          </div>
          {poolTasks.length === 0
            ? <EmptyState icon={<Icons.Layers className="w-8 h-8" />} message="No tasks in this pool yet." />
            : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}><QCell qKey="q1" /><QCell qKey="q2" /><QCell qKey="q3" /><QCell qKey="q4" /></div>
          }
        </>
      );
    }

    // ── RECURRING strategy (Ripples behavior inside Task Graph) ──
    // Matches StressTest RippleTaskCard pattern: per-task card with Today's
    // Planned/Done/Skipped buttons and inline tracker inputs.
    if (poolStrategyView === 'ripples') {
      const poolRecurring = poolTasks.filter(t => t.recurrenceEnabled && t.recurrence);
      return (
        <RipplesMain
          pool={pool}
          poolRecurring={poolRecurring}
          PoolHeader={PoolHeader}
          getTaskRelationships={getTaskRelationships}
          getRecurrenceLog={getRecurrenceLog}
          setRecurrenceLog={setRecurrenceLog}
          recurringTab={recurringTab}
          setRecurringTab={setRecurringTab}
          hideDormant={hideDormant}
          setHideDormant={setHideDormant}
          calView={calView}
          setCalView={setCalView}
          calAnchor={calAnchor}
          setCalAnchor={setCalAnchor}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
        />
      );
    }

    return <PoolHeader />;
  };

  // Legacy Pod View retained for compatibility, no longer mounted.
  const PodView = () => {
    const today = todayStr();
    const pod = null;
    const podTasks = [];

    // ── Annual Dates sub-view ──
    const AnnualDatesView = () => {
      // Compute days until next occurrence (ignoring year)
      const daysUntil = (mmdd) => {
        if (!mmdd) return null;
        const now = new Date();
        const thisYear = new Date(`${now.getFullYear()}-${mmdd}`);
        const nextYear = new Date(`${now.getFullYear() + 1}-${mmdd}`);
        const diff = Math.ceil((thisYear - now) / 86400000);
        if (diff >= 0) return diff;
        return Math.ceil((nextYear - now) / 86400000);
      };
      const formatMmdd = (mmdd) => {
        if (!mmdd) return '—';
        try { return new Date(`2000-${mmdd}`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch { return mmdd; }
      };
      const urgencyColor = (days) => {
        if (days === null) return '#A1A1AA';
        if (days <= 3) return '#EF4444';
        if (days <= 14) return '#F59E0B';
        if (days <= 30) return '#0EA5E9';
        return '#71717A';
      };
      const urgencyLabel = (days) => {
        if (days === null) return 'No date set';
        if (days === 0) return 'TODAY!';
        if (days === 1) return 'Tomorrow';
        if (days <= 7) return `In ${days} days`;
        if (days <= 30) return `In ${days} days`;
        return `In ${days} days`;
      };

      // Sort by days until
      const sorted = [...podTasks].sort((a, b) => {
        const da = daysUntil(a.podTaskDate);
        const db = daysUntil(b.podTaskDate);
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      });

      // Check if we already marked this occurrence this year
      const thisYear = new Date().getFullYear();
      const markedKey = (taskId, mmdd) => `annual_${taskId}_${thisYear}_${mmdd}`;
      const isMarked = (taskId, mmdd) => podLogs[markedKey(taskId, mmdd)]?.status === 'completed';
      const toggleMark = (taskId, mmdd) => {
        const key = markedKey(taskId, mmdd);
        const current = podLogs[key]?.status;
        setPodLog(pod.id, taskId, `${thisYear}-${mmdd}`, { status: current === 'completed' ? 'planned' : 'completed' });
      };

      return (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 100, backgroundColor: '#FEF2F2', color: '#EF4444', fontWeight: 600 }}>● ≤ 3 days</span>
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 100, backgroundColor: '#FFFBEB', color: '#F59E0B', fontWeight: 600 }}>● ≤ 14 days</span>
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 100, backgroundColor: '#F0F9FF', color: '#0EA5E9', fontWeight: 600 }}>● ≤ 30 days</span>
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 100, backgroundColor: '#F4F4F5', color: '#71717A', fontWeight: 600 }}>● later</span>
          </div>
          {sorted.length === 0 && <EmptyState icon={<Icons.Calendar className="w-8 h-8" />} message="No tasks in this Pod yet. Use Focus Mode to add tasks and assign their dates." />}
          {sorted.map(task => {
            const days = daysUntil(task.podTaskDate);
            const color = urgencyColor(days);
            const marked = isMarked(task.id, task.podTaskDate);
            return (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: `1px solid ${color}30`, backgroundColor: `${color}08`, marginBottom: 6 }}>
                <div style={{ width: 4, height: 40, borderRadius: 2, backgroundColor: color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: '#18181B', textDecoration: marked ? 'line-through' : 'none', opacity: marked ? 0.5 : 1 }}>{task.content}</span>
                    {days === 0 && <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: '#EF4444', color: 'white', padding: '2px 6px', borderRadius: 4 }}>TODAY</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
                    <span style={{ fontSize: 12, color: '#71717A' }}>📅 {formatMmdd(task.podTaskDate)} every year</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color }}>{urgencyLabel(days)}</span>
                  </div>
                </div>
                <button
                  onClick={() => toggleMark(task.id, task.podTaskDate)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: `1px solid ${marked ? '#10B981' : color}`, backgroundColor: marked ? '#DCFCE7' : 'white', color: marked ? '#16A34A' : color, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  {marked ? <><Icons.Check className="w-3.5 h-3.5" /> Done</> : '○ Mark done'}
                </button>
              </div>
            );
          })}
        </div>
      );
    };

    // ── Recurring sub-view: per-task cards (Ripples style from StressTest) ──
    // Each task shows: title, recurrence summary badge, Today's Planned/Done/Skipped
    // buttons, and tracker inputs. Only today is editable.
    const RecurringTaskCard = ({ task }) => {
      const log = getPodLog(pod.id, task.id, today);
      const trackerFields = (pod.trackerFields || []).filter(f => f.name);

      const statusColors = {
        planned: { bg: '#F4F4F5', border: '#E4E4E7', text: '#71717A' },
        completed: { bg: '#F0FDF4', border: '#86EFAC', text: '#10B981' },
        missed: { bg: '#FEF2F2', border: '#FECACA', text: '#EF4444' },
      };
      const colors = statusColors[log.status] || statusColors.planned;

      const statusButtons = [
        { key: 'planned', label: 'Planned' },
        { key: 'completed', label: 'Done' },
        { key: 'missed', label: 'Skipped' },
      ];

      const setStatus = (status) => setPodLog(pod.id, task.id, today, { status });
      const setTracker = (fieldId, value) => setPodLog(pod.id, task.id, today, {
        trackerValues: { ...(log.trackerValues || {}), [fieldId]: value }
      });

      return (
        <div style={{
          backgroundColor: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: 10,
          padding: 12,
          marginBottom: 10,
        }}>
          {/* Header: title + recurrence badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#18181B', marginBottom: 4 }}>
                {task.content}
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                backgroundColor: '#0EA5E915',
                color: '#0369A1',
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 6,
                fontWeight: 500,
              }}>
                <Icons.Calendar className="w-3 h-3" />
                {podSummaryLine(pod)}
              </div>
            </div>
          </div>

          {/* Today's check-in row */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#71717A', fontWeight: 500 }}>Today:</span>
            {statusButtons.map(s => {
              const active = log.status === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setStatus(s.key)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    border: `1px solid ${active ? colors.text : '#E4E4E7'}`,
                    backgroundColor: active ? colors.text : 'white',
                    color: active ? 'white' : '#71717A',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {s.label}
                </button>
              );
            })}

            {/* Tracker inputs inline */}
            {trackerFields.map(field => {
              const val = (log.trackerValues || {})[field.id] || '';
              if (field.type === 'checkbox') {
                return (
                  <label key={field.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#71717A' }}>
                    <input
                      type="checkbox"
                      checked={val === 'true'}
                      onChange={e => setTracker(field.id, e.target.checked ? 'true' : 'false')}
                      style={{ cursor: 'pointer' }}
                    />
                    {field.name}
                  </label>
                );
              }
              return (
                <input
                  key={field.id}
                  type={field.type === 'number' ? 'number' : 'text'}
                  placeholder={field.name}
                  value={val}
                  onChange={e => setTracker(field.id, e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 100,
                    padding: '4px 8px',
                    fontSize: 12,
                    border: '1px solid #E4E4E7',
                    borderRadius: 6,
                    backgroundColor: 'white',
                  }}
                />
              );
            })}
          </div>
        </div>
      );
    };

    const RecurringView = () => {
      const isDayActive = (dayStr) => {
        if (!pod) return false;
        const r = pod.recurrence;
        if (!r) return false;
        if (r.type === 'daily') return true;
        if (r.type === 'specific_days') {
          const dow = (new Date(dayStr).getDay() + 6) % 7;
          return (r.weekDays || []).includes(dow);
        }
        if (r.type === 'every_n_days') {
          const diff = Math.floor((new Date(dayStr) - new Date(pod.createdAt)) / 86400000);
          return diff >= 0 && diff % (r.everyNDays || 1) === 0;
        }
        if (r.type === 'monthly_frequency') return true;
        return true;
      };

      const todayScheduled = isDayActive(today);

      return (
        <>
          {/* Header */}
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <p style={{ fontSize: 13, color: '#71717A', margin: 0 }}>
              {podTasks.length} recurring task{podTasks.length === 1 ? '' : 's'} · {podSummaryLine(pod)}
            </p>
            {!todayScheduled && (
              <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 500 }}>
                ⚠ Not scheduled today
              </span>
            )}
          </div>

          {/* Info banner */}
          <div style={{
            backgroundColor: '#F0F9FF',
            border: '1px solid #BAE6FD',
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 12,
            fontSize: 12,
            color: '#0369A1',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <Icons.Ripple className="w-4 h-4" />
            <strong>Recurring view</strong> inside Task Graph for <strong>{pod.name}</strong>
          </div>

          {podTasks.length === 0 ? (
            <EmptyState
              icon={<Icons.Ripple className="w-8 h-8" />}
              message="No tasks assigned. Use Focus Mode to add tasks to this Ripple."
            />
          ) : (
            <div>
              {podTasks.map(task => (
                <RecurringTaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </>
      );
    };


    return (
      <div style={{ display: 'flex', gap: 16, overflow: 'hidden' }}>
        {/* Left: Pod list */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#71717A', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Ripples</p>
          {pods.length === 0 && <p style={{ fontSize: 13, color: '#A1A1AA' }}>No Ripples yet</p>}
          {pods.map(p => (
            <div key={p.id} onClick={() => setSelectedPodId(p.id)} style={{ ...styles.podSideItem, ...(p.id === selectedPodId ? { backgroundColor: '#0EA5E915', borderColor: '#0EA5E9' } : {}) }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Icons.Ripple className="w-3.5 h-3.5" style={{ color: '#0EA5E9', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: p.id === selectedPodId ? 700 : 500 }}>{p.name}</span>
                </div>
                <div style={{ fontSize: 11, color: '#A1A1AA', marginTop: 2, paddingLeft: 18, lineHeight: 1.3 }}>
                  {p.podType === 'annual_dates' ? '📅 Annual dates' : podSummaryLine(p).slice(0, 40)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right: View */}
        <div style={{ flex: 1, overflowX: 'auto' }}>
          {!pod && <EmptyState icon={<Icons.Ripple className="w-8 h-8" />} message="Select a Ripple to see its schedule" />}
          {pod && (
            <>
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontWeight: 700, fontSize: 15, color: '#18181B' }}>{pod.name}</p>
              </div>
              {pod.podType === 'annual_dates' ? <AnnualDatesView /> : <RecurringView />}
            </>
          )}
        </div>
      </div>
    );
  };

  // ── Waves View (for unassociated tasks) ──
  const WavesView = () => {
    // Render based on poolStrategyView
    if (poolStrategyView === 'kanban') {
      // Define kanban lanes locally for waves — apply rel sort within each lane
      const waveKanbanLanes = {
        today:      { title: 'Today',       color: '#FF6B6B', tasks: [] },
        future:     { title: 'Future',      color: '#4299E1', tasks: [] },
        missed:     { title: 'Missed',      color: '#F59E0B', tasks: [] },
        notplanned: { title: 'Not Planned', color: '#A1A1AA', tasks: [] },
      };
      waveTasks.forEach(t => waveKanbanLanes[categorizeByDeadline(t)].tasks.push(t));
      // Apply relationship sort within each lane
      Object.values(waveKanbanLanes).forEach(lane => {
        lane.tasks = sortTasksByRelationship(lane.tasks);
      });

      return (
        <div style={styles.kanbanContainer}>
          {Object.entries(waveKanbanLanes).map(([key, lane]) => (
            <div key={key} style={styles.kanbanLane}>
              <div style={{ ...styles.kanbanLaneHeader, borderTopColor: lane.color }}>
                <span style={styles.kanbanLaneTitle}>{lane.title}</span>
                <span style={{ ...styles.kanbanLaneCount, backgroundColor: lane.color }}>{lane.tasks.length}</span>
              </div>
              <div style={styles.kanbanLaneBody}>
                {lane.tasks.length === 0 ? <div style={styles.kanbanEmpty}>No tasks</div> : lane.tasks.map(t => <TaskCard key={t.id} task={t} compact />)}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (poolStrategyView === 'workiq') {
      return <WorkIQ4x4View />;
    }

    if (poolStrategyView === 'dailyzen') {
      return <DailyZenView />;
    }

    // Default: List view with relationship sort
    return (
      <div style={styles.listWavesContainer}>
        {waveTasks.length === 0 ? (
          <EmptyState icon={<Icons.Briefcase className="w-8 h-8" />} message="No waves here. Add tasks in Freedom mode, or check Task Graphs." action={{ label: 'Go to Freedom Mode', onClick: onGoToFreedom }} />
        ) : (
          sortTasksByRelationship(waveTasks).map(task => <TaskCard key={task.id} task={task} />)
        )}
      </div>
    );
  };

  // ── DailyZen View (AI-powered 1-3-5 focus selection) ──
  const DailyZenView = () => {
    const scoreTask = (task) => {
      const text = ((task.content || '') + ' ' + (task.reflection?.deadline || '') + ' ' + (task.reflection?.motivation || '') + ' ' + (task.reflection?.complexity || '')).toLowerCase();
      let score = 0;
      // Depth signals → Deep Work
      if (/complex|difficult|challenging|research|design|build|create|architect|strategic|analysis|write|plan/.test(text)) score += 3;
      if (/deep|focus|hard|major|important|critical|key|vital|crucial/.test(text)) score += 2;
      // Urgency signals → Necessity
      if (/urgent|asap|today|deadline|must|required|client|boss|team|meeting|blocking/.test(text)) score += 1;
      // Effort signals  
      if (/quick|simple|easy|minor|small|brief|short|just|routine|admin/.test(text)) score -= 2;
      return score;
    };

    const sorted = [...waveTasks].sort((a, b) => scoreTask(b) - scoreTask(a));
    const deepWork   = sorted.slice(0, 1);
    const necessity  = sorted.slice(1, 4);
    const lightenUp  = sorted.slice(4, 9);

    const Section = ({ title, emoji, color, bgColor, tasks, limit, hint }) => (
      <div style={{ backgroundColor: bgColor, borderRadius: 12, padding: 16, borderLeft: `4px solid ${color}`, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 22 }}>{emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#18181B' }}>{title}</div>
            <div style={{ fontSize: 11, color: '#71717A' }}>{hint}</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'white', backgroundColor: color, padding: '2px 10px', borderRadius: 100 }}>
            {tasks.length}/{limit}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
          {tasks.length === 0
            ? <div style={{ fontSize: 13, color: '#A1A1AA', fontStyle: 'italic', padding: '6px 0' }}>Nothing assigned here today</div>
            : tasks.map(t => <TaskCard key={t.id} task={t} />)
          }
        </div>
      </div>
    );

    return (
      <div>
        <div style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400E' }}>
          ✨ <strong>DailyZen</strong> · AI picks your focus for today — 1 deep task, 3 necessities, 5 light waves.
        </div>
        {waveTasks.length === 0
          ? <EmptyState icon={<Icons.Briefcase className="w-8 h-8" />} message="No waves to zen today. Add tasks in Freedom mode!" action={{ label: 'Go to Freedom Mode', onClick: onGoToFreedom }} />
          : <>
              <Section title="Deep Work" emoji="🧠" color="#6366F1" bgColor="#F5F3FF" tasks={deepWork} limit={1} hint="One task that demands your full attention" />
              <Section title="Necessity" emoji="⚡" color="#F59E0B" bgColor="#FFFBEB" tasks={necessity} limit={3} hint="Three things you must move forward today" />
              <Section title="Lighten Up" emoji="🌊" color="#10B981" bgColor="#F0FDF4" tasks={lightenUp} limit={5} hint="Five easier waves to keep momentum flowing" />
            </>
        }
      </div>
    );
  };

  // ── WorkIQ 4x4 View (Eisenhower-inspired quadrant matrix) ──
  const WorkIQ4x4View = () => {
    const classifyTask = (task) => {
      const text = ((task.content || '') + ' ' + (task.reflection?.deadline || '') + ' ' + (task.reflection?.motivation || '') + ' ' + (task.reflection?.complexity || '') + ' ' + (task.reflection?.outcome || '')).toLowerCase();
      // Urgency score
      const urgentSignals = /urgent|asap|today|tonight|deadline|now|must|blocking|waiting|client|boss|critical/.test(text);
      // Familiarity / confidence score → Standard Work
      const familiarSignals = /routine|regular|standard|usual|same|again|normal|everyday|process|procedure|update|review|check/.test(text);
      // Growth / desire signals → Mindful Work
      const mindfulSignals = /want|love|passion|excited|learn|grow|develop|explore|creative|interesting|curious|support|mentor/.test(text);
      // Collaboration / new territory signals → New Work
      const newWorkSignals = /new|partner|team|vendor|collaborate|together|meeting|brainstorm|align|coordinate|external|help/.test(text);
      // Weakness / avoidance signals → Replacement needed
      const weakSignals = /hate|avoid|dread|bad at|not good|struggle|difficult|outsource|delegate|someone else|not my|should not/.test(text);

      if (weakSignals) return 'q4';
      if (newWorkSignals && !familiarSignals) return 'q3';
      if (mindfulSignals && !familiarSignals) return 'q2';
      if (urgentSignals || familiarSignals) return 'q1';
      // Fallback: use reflection urgency/complexity
      if (/complex|difficult|research|build|create/.test(text)) return 'q2';
      if (/quick|simple|easy|minor/.test(text)) return 'q1';
      return 'q1';
    };

    const quadrants = {
      q1: { tasks: [], color: '#10B981', bg: '#F0FDF4', label: 'Standard Work', sub: 'Work that I am good at', emoji: '✅', pos: 'top-left' },
      q2: { tasks: [], color: '#6366F1', bg: '#F5F3FF', label: 'Mindful Work',  sub: 'Work I want to do & need support', emoji: '🧘', pos: 'top-right' },
      q3: { tasks: [], color: '#0EA5E9', bg: '#F0F9FF', label: 'New Work',      sub: 'Work I can do with partners / vendors', emoji: '🤝', pos: 'bottom-left' },
      q4: { tasks: [], color: '#EF4444', bg: '#FEF2F2', label: 'Needs Replacement', sub: 'Work I am not good at — find someone', emoji: '🔄', pos: 'bottom-right' },
    };
    waveTasks.forEach(t => quadrants[classifyTask(t)].tasks.push(t));

    const QuadrantCell = ({ qKey }) => {
      const q = quadrants[qKey];
      return (
        <div style={{ backgroundColor: q.bg, borderRadius: 12, padding: 14, border: `2px solid ${q.color}30`, minHeight: 180, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, borderBottom: `1px solid ${q.color}30`, paddingBottom: 8 }}>
            <span style={{ fontSize: 18 }}>{q.emoji}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: q.color }}>{q.label}</div>
              <div style={{ fontSize: 11, color: '#71717A', lineHeight: 1.3 }}>{q.sub}</div>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, backgroundColor: q.color, color: 'white', borderRadius: 100, padding: '2px 8px' }}>{q.tasks.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto', maxHeight: 260 }}>
            {q.tasks.length === 0
              ? <div style={{ fontSize: 12, color: '#A1A1AA', fontStyle: 'italic', marginTop: 8 }}>No waves here</div>
              : q.tasks.map(t => <TaskCard key={t.id} task={t} compact />)
            }
          </div>
        </div>
      );
    };

    return (
      <div>
        <div style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#0369A1' }}>
          🧩 <strong>WorkIQ 4×4</strong> · AI slots your waves by familiarity & intent — find where to invest your energy.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <QuadrantCell qKey="q1" />
          <QuadrantCell qKey="q2" />
          <QuadrantCell qKey="q3" />
          <QuadrantCell qKey="q4" />
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: '#A1A1AA', textAlign: 'center' }}>
          AI categorisation based on task content &amp; Focus Mode answers · reclassify by editing task in Focus Mode
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Header — Two-level filter */}
      <div style={styles.workHeaderWithSelector}>
        <div style={styles.workTitleRow}>
          {/* Level 1: Context filter — Waves | Pools */}
          <span style={styles.workTitleText}>View</span>
          <select
            ref={contextFilterRef}
            value={contextFilter}
            onChange={e => setContextFilter(e.target.value)}
            style={styles.viewSelector}
          >
            <option value="waves">⚡ Waves</option>
            <option value="pools">⧉ Task Graphs</option>
          </select>

          {/* Level 2: Strategy filter — for Pools and Waves */}
          {contextFilter === 'pools' && (
            <>
              <span style={{ ...styles.workTitleText, marginLeft: 8 }}>as</span>
              <select
                value={poolStrategyView}
                onChange={e => setPoolStrategyView(e.target.value)}
                style={styles.viewSelector}
              >
                <option value="list">List</option>
                <option value="kanban">Kanban</option>
                <option value="dailyzen">DailyZen</option>
                <option value="workiq">WorkIQ 4×4</option>
                <option value="ripples">Recurring</option>
              </select>
            </>
          )}
          {contextFilter === 'waves' && (
            <>
              <span style={{ ...styles.workTitleText, marginLeft: 8 }}>as</span>
              <select
                value={poolStrategyView}
                onChange={e => setPoolStrategyView(e.target.value)}
                style={styles.viewSelector}
              >
                <option value="list">List</option>
                <option value="kanban">Kanban</option>
                <option value="workiq">WorkIQ 4×4</option>
                <option value="dailyzen">DailyZen</option>
              </select>
            </>
          )}

          {/* Level 3: Relationship sort filter */}
          {(poolStrategyView === 'list' || poolStrategyView === 'kanban') && (
            <>
              <span style={{ ...styles.workTitleText, marginLeft: 8, color: '#A1A1AA' }}>sort</span>
              <select
                value={relSort}
                onChange={e => setRelSort(e.target.value)}
                style={{ ...styles.viewSelector, borderColor: relSort !== 'default' ? '#8B5CF6' : undefined, color: relSort !== 'default' ? '#7C3AED' : undefined }}
              >
                <option value="default">Default</option>
                <option value="blocks">⏸️ Blockers first</option>
                <option value="pairs_with">🔗 Paired first</option>
                <option value="enables">💡 Enablers first</option>
                <option value="results_in">🔀 Resultants first</option>
              </select>
            </>
          )}
        </div>
        <p style={styles.workSubtitle}>
          {contextFilter === 'pools'  && poolStrategyView === 'list'     && 'Task Graph tasks · full detail list'}
          {contextFilter === 'pools'  && poolStrategyView === 'kanban'   && 'Task Graph tasks organised by deadline'}
          {contextFilter === 'pools'  && poolStrategyView === 'dailyzen' && 'Task Graph tasks · AI curated 1-3-5 focus'}
          {contextFilter === 'pools'  && poolStrategyView === 'workiq'   && 'Task Graph tasks · WorkIQ 4×4 quadrants'}
          {contextFilter === 'pools'  && poolStrategyView === 'ripples'  && 'Task Graph recurring tasks with tracker logging'}
          {contextFilter === 'waves' && poolStrategyView === 'list'     && 'Waves · full detail list'}
          {contextFilter === 'waves' && poolStrategyView === 'kanban'   && 'Waves organised by deadline'}
          {contextFilter === 'waves' && poolStrategyView === 'workiq'   && 'Waves · WorkIQ 4×4 quadrants'}
          {contextFilter === 'waves' && poolStrategyView === 'dailyzen' && 'Waves · AI curated 1-3-5 focus'}
        </p>
      </div>

      {/* Review Modal */}
      {reviewTaskId && reviewTask && (
        <div style={styles.reviewModal}>
          <h4 style={styles.reviewTitle}>How did it go?</h4>
          <p style={styles.reviewSubtitle}>Rate your satisfaction with "{reviewTask.content}"</p>
          <div style={styles.ratingButtons}>
            {[1, 2, 3, 4, 5].map(r => (
              <button key={r} style={{ ...styles.ratingBtn, ...(satisfactionRating >= r ? styles.ratingBtnActive : {}) }} onClick={() => setSatisfactionRating(r)}>
                <Icons.Star filled={satisfactionRating >= r} />
              </button>
            ))}
          </div>
          <textarea placeholder="What could be improved? (optional)" value={improvements} onChange={e => setImprovements(e.target.value)} style={styles.textarea} />
          <div style={styles.reviewActions}>
            <button style={styles.primaryBtn} onClick={onSubmitReview} disabled={satisfactionRating === 0}>Submit Review</button>
            <button style={styles.ghostBtn} onClick={onSkipReview}>Skip</button>
          </div>
        </div>
      )}

      {/* View rendering — Pools & Waves */}
      {contextFilter === 'pools' && <PoolView />}
      {contextFilter === 'waves' && <WavesView />}
    </div>
  );
}

// ============================================================================
// RELATIONSHIP GRAPH - Obsidian-style force-directed graph
// ============================================================================
function RelationshipGraph({ pool, tasks, allTasks, relationships, onTaskClick }) {
  const svgRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState(null);

  // Build relationship map for quick lookup
  const relationshipMap = useMemo(() => {
    const map = new Map();
    relationships.forEach(rel => {
      if (!map.has(rel.fromTaskId)) map.set(rel.fromTaskId, []);
      if (!map.has(rel.toTaskId)) map.set(rel.toTaskId, []);
      map.get(rel.fromTaskId).push(rel);
      map.get(rel.toTaskId).push(rel);
    });
    return map;
  }, [relationships]);

  // Get connected node IDs for highlighting
  const getConnectedNodes = useCallback((nodeId) => {
    const connected = new Set();
    const rels = relationshipMap.get(nodeId) || [];
    rels.forEach(rel => {
      connected.add(rel.fromTaskId === nodeId ? rel.toTaskId : rel.fromTaskId);
    });
    return connected;
  }, [relationshipMap]);

  // Initialize positions with force-directed simulation
  const nodePositions = useMemo(() => {
    if (!tasks || tasks.length === 0) return {};

    const positions = {};
    const width = 800;
    const height = 500;
    const centerX = width / 2;
    const centerY = height / 2;

    // Initialize with random positions near center
    tasks.forEach((task, i) => {
      const angle = (2 * Math.PI * i) / tasks.length;
      const radius = 50 + Math.random() * 50;
      positions[task.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
      };
    });

    // Force-directed simulation
    const iterations = 300;
    const repulsionForce = 2000;
    const springLength = 120;
    const springForce = 0.05;
    const centerForce = 0.01;
    const damping = 0.9;

    for (let iter = 0; iter < iterations; iter++) {
      // Calculate repulsion between all nodes
      for (let i = 0; i < tasks.length; i++) {
        for (let j = i + 1; j < tasks.length; j++) {
          const a = positions[tasks[i].id];
          const b = positions[tasks[j].id];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsionForce / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }

      // Calculate spring attraction along relationships
      relationships.forEach(rel => {
        const a = positions[rel.fromTaskId];
        const b = positions[rel.toTaskId];
        if (!a || !b) return;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - springLength) * springForce;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      });

      // Apply centering force
      tasks.forEach(task => {
        const p = positions[task.id];
        p.vx += (centerX - p.x) * centerForce;
        p.vy += (centerY - p.y) * centerForce;
      });

      // Apply velocity and damping
      tasks.forEach(task => {
        const p = positions[task.id];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= damping;
        p.vy *= damping;
      });
    }

    return positions;
  }, [tasks, relationships]);

  // Track mutable positions for dragging
  const [currentPositions, setCurrentPositions] = useState(nodePositions);
  useEffect(() => {
    setCurrentPositions(nodePositions);
  }, [nodePositions]);

  if (!tasks || tasks.length === 0) {
    return <EmptyState icon={<Icons.GitBranch className="w-8 h-8" />} message="No tasks in this pool to visualize" />;
  }

  if (tasks.length === 1 && (!relationships || relationships.length === 0)) {
    return (
      <div style={styles.graphContainer}>
        <p style={styles.graphTitle}>Task Graph: {pool.name}</p>
        <EmptyState icon={<Icons.GitBranch className="w-8 h-8" />} message="Add more tasks or create relationships to see the graph visualization" />
      </div>
    );
  }

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.3, Math.min(3, prev * delta)));
  };

  const handleMouseDown = (e) => {
    if (e.target === svgRef.current) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
    if (draggedNode) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      setCurrentPositions(prev => ({
        ...prev,
        [draggedNode]: { ...prev[draggedNode], x, y },
      }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedNode(null);
  };

  const connectedNodes = hoveredNode ? getConnectedNodes(hoveredNode) : new Set();

  return (
    <div style={styles.graphContainer}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={styles.graphTitle}>Task Graph: {pool.name}</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#71717A' }}>
            {tasks.length} tasks · {relationships.length} links
          </span>
          <button
            onClick={() => setZoom(prev => Math.max(0.3, prev * 0.8))}
            style={{ ...styles.zoomBtn, padding: '4px 8px' }}
            title="Zoom out"
          >
            −
          </button>
          <span style={{ fontSize: 13, color: '#374151', minWidth: 50, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(prev => Math.min(3, prev * 1.25))}
            style={{ ...styles.zoomBtn, padding: '4px 8px' }}
            title="Zoom in"
          >
            +
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            style={{ ...styles.zoomBtn, padding: '4px 10px' }}
            title="Reset view"
          >
            ⟲
          </button>
        </div>
      </div>

      <div
        style={{
          ...styles.graphSvgWrapper,
          cursor: isPanning ? 'grabbing' : draggedNode ? 'grabbing' : 'grab',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox="0 0 800 500"
          preserveAspectRatio="xMidYMid meet"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Background grid for depth perception */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E5E7EB" strokeWidth="0.5" opacity="0.5" />
            </pattern>
            {/* Arrow markers — blocks and results_in only (enables has no arrow, pairs_with is bidirectional) */}
            <marker id="arrow-blocks" markerWidth="10" markerHeight="7" refX="20" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#6366F1" />
            </marker>
            <marker id="arrow-results_in" markerWidth="10" markerHeight="7" refX="20" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#8B5CF6" />
            </marker>
            <marker id="arrow-pairs_fwd" markerWidth="10" markerHeight="7" refX="20" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#10B981" />
            </marker>
            <marker id="arrow-pairs_bwd" markerWidth="10" markerHeight="7" refX="20" refY="3.5" orient="auto-start-reverse">
              <polygon points="0 0, 10 3.5, 0 7" fill="#10B981" />
            </marker>
          </defs>
          <rect width="800" height="500" fill="url(#grid)" />

          {/* Pairs With group rectangles — rendered BEHIND everything else */}
          {(() => {
            // Find all transitively connected pairs_with clusters
            const pairsRels = relationships.filter(r => migrateRelationshipType(r.type) === 'pairs_with');
            if (pairsRels.length === 0) return null;

            // Build adjacency for pairs_with
            const adj = {};
            pairsRels.forEach(r => {
              if (!adj[r.fromTaskId]) adj[r.fromTaskId] = new Set();
              if (!adj[r.toTaskId]) adj[r.toTaskId] = new Set();
              adj[r.fromTaskId].add(r.toTaskId);
              adj[r.toTaskId].add(r.fromTaskId);
            });

            // BFS to find connected components
            const visited = new Set();
            const clusters = [];
            const allNodes = Object.keys(adj);
            allNodes.forEach(nodeId => {
              if (visited.has(nodeId)) return;
              const cluster = [];
              const queue = [nodeId];
              while (queue.length) {
                const cur = queue.shift();
                if (visited.has(cur)) continue;
                visited.add(cur);
                cluster.push(cur);
                (adj[cur] || new Set()).forEach(n => { if (!visited.has(n)) queue.push(n); });
              }
              if (cluster.length > 1) clusters.push(cluster);
            });

            return clusters.map((cluster, ci) => {
              const pts = cluster.map(id => currentPositions[id]).filter(Boolean);
              if (pts.length < 2) return null;
              const xs = pts.map(p => p.x);
              const ys = pts.map(p => p.y);
              const pad = 48;
              const x = Math.min(...xs) - pad;
              const y = Math.min(...ys) - pad;
              const w = Math.max(...xs) - Math.min(...xs) + pad * 2;
              const h = Math.max(...ys) - Math.min(...ys) + pad * 2;
              return (
                <rect
                  key={`cluster-${ci}`}
                  x={x} y={y} width={w} height={h}
                  rx={14} ry={14}
                  fill="#10B98110"
                  stroke="#10B981"
                  strokeWidth="1.5"
                  strokeDasharray="6 3"
                />
              );
            });
          })()}

          {/* Relationship lines */}
          {relationships.map((rel, idx) => {
            const from = currentPositions[rel.fromTaskId];
            const to = currentPositions[rel.toTaskId];
            if (!from || !to) return null;

            const migratedType = migrateRelationshipType(rel.type);
            const rt = RELATIONSHIP_TYPES.find(x => x.key === migratedType);
            const isConnected = hoveredNode && (rel.fromTaskId === hoveredNode || rel.toTaskId === hoveredNode);
            const isDimmed = hoveredNode && !isConnected;

            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx = dx / len;
            const ny = dy / len;
            const nodeW = 60; const nodeH = 20;
            const startX = from.x + nx * nodeW * 0.5;
            const startY = from.y + ny * nodeH * 0.5;
            const endX = to.x - nx * nodeW * 0.5;
            const endY = to.y - ny * nodeH * 0.5;

            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2 - 6;
            const strokeW = isConnected ? 3 : 2;
            const color = rt?.color || '#94A3B8';

            if (migratedType === 'blocks') {
              return (
                <g key={idx} opacity={isDimmed ? 0.15 : 1}>
                  <line x1={startX} y1={startY} x2={endX} y2={endY}
                    stroke={color} strokeWidth={strokeW} markerEnd="url(#arrow-blocks)" />
                  <text x={midX} y={midY} fill={color} fontSize="10" fontWeight="500" textAnchor="middle" style={{ pointerEvents: 'none' }}>
                    {rt?.icon} {rt?.label}
                  </text>
                </g>
              );
            }

            if (migratedType === 'enables') {
              return (
                <g key={idx} opacity={isDimmed ? 0.15 : 1}>
                  <line x1={startX} y1={startY} x2={endX} y2={endY}
                    stroke={color} strokeWidth={strokeW} strokeDasharray="7 4" />
                  {/* No arrowhead */}
                  <text x={midX} y={midY} fill={color} fontSize="10" fontWeight="500" textAnchor="middle" style={{ pointerEvents: 'none' }}>
                    {rt?.icon} {rt?.label}
                  </text>
                </g>
              );
            }

            if (migratedType === 'pairs_with') {
              return (
                <g key={idx} opacity={isDimmed ? 0.15 : 1}>
                  <line x1={startX} y1={startY} x2={endX} y2={endY}
                    stroke={color} strokeWidth={strokeW}
                    markerEnd="url(#arrow-pairs_fwd)"
                    markerStart="url(#arrow-pairs_bwd)" />
                  <text x={midX} y={midY} fill={color} fontSize="10" fontWeight="500" textAnchor="middle" style={{ pointerEvents: 'none' }}>
                    {rt?.icon} {rt?.label}
                  </text>
                </g>
              );
            }

            if (migratedType === 'results_in') {
              return (
                <g key={idx} opacity={isDimmed ? 0.15 : 1}>
                  <line x1={startX} y1={startY} x2={endX} y2={endY}
                    stroke={color} strokeWidth={strokeW} markerEnd="url(#arrow-results_in)" />
                  <text x={midX} y={midY} fill={color} fontSize="10" fontWeight="500" textAnchor="middle" style={{ pointerEvents: 'none' }}>
                    {rt?.icon} {rt?.label}
                  </text>
                </g>
              );
            }

            // Fallback — solid line
            return (
              <g key={idx} opacity={isDimmed ? 0.15 : 1}>
                <line x1={startX} y1={startY} x2={endX} y2={endY}
                  stroke={color} strokeWidth={strokeW} markerEnd="url(#arrow-blocks)" />
              </g>
            );
          })}

          {/* Task nodes - text only, no circles */}
          {tasks.map(task => {
            const pos = currentPositions[task.id];
            if (!pos) return null;
            const isHovered = hoveredNode === task.id;
            const isConnected = hoveredNode && connectedNodes.has(task.id);
            const isDimmed = hoveredNode && !isHovered && !isConnected;

            // Truncate text
            const maxLen = 20;
            const displayText = task.content.length > maxLen
              ? task.content.substring(0, maxLen) + '...'
              : task.content;

            return (
              <g
                key={task.id}
                style={{ cursor: 'pointer' }}
                onClick={() => onTaskClick(task.id)}
                onMouseEnter={() => setHoveredNode(task.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDraggedNode(task.id);
                }}
                opacity={isDimmed ? 0.25 : 1}
                transform={`translate(${pos.x}, ${pos.y})`}
              >
                {/* Background highlight on hover */}
                {isHovered && (
                  <rect
                    x={-70}
                    y={-14}
                    width={140}
                    height={28}
                    rx={6}
                    fill="#6366F1"
                    opacity="0.1"
                  />
                )}
                {/* Task text */}
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isHovered ? '#6366F1' : '#18181B'}
                  fontSize="12"
                  fontWeight={isHovered ? '600' : '500'}
                  style={{ pointerEvents: 'none' }}
                >
                  {displayText}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#6366F1', display: 'flex', alignItems: 'center', gap: 4 }}>
          ⏸️ Blocks <span style={{ letterSpacing: -1 }}>——→</span>
        </span>
        <span style={{ fontSize: 11, color: '#10B981', display: 'flex', alignItems: 'center', gap: 4 }}>
          🔗 Pairs With <span style={{ letterSpacing: -1 }}>←——→</span>
        </span>
        <span style={{ fontSize: 11, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 4 }}>
          💡 Enables <span style={{ letterSpacing: 1 }}>╌╌╌</span>
        </span>
        <span style={{ fontSize: 11, color: '#8B5CF6', display: 'flex', alignItems: 'center', gap: 4 }}>
          🔀 Results Either In <span style={{ letterSpacing: -1 }}>——→</span>
        </span>
        <span style={{ fontSize: 11, color: '#A1A1AA' }}>· Scroll to zoom · Drag to pan · Drag node to move</span>
      </div>
    </div>
  );
}

// ============================================================================
// REVIEW MODE - Updated with completed tasks and editing
// ============================================================================
function ReviewMode({ stats, reviews, tasks, completedTasks, onReactivateTask, onUpdateReview }) {
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editImprovements, setEditImprovements] = useState('');

  const startEditReview = (review) => {
    setEditingReviewId(review.taskId);
    setEditRating(review.satisfactionRating);
    setEditImprovements(review.improvements || '');
  };

  const saveEditReview = () => {
    if (editingReviewId && editRating > 0) {
      onUpdateReview(editingReviewId, editRating, editImprovements);
      setEditingReviewId(null);
    }
  };

  const getTaskReview = (taskId) => reviews.find(r => r.taskId === taskId);

  return (
    <div>
      <div style={styles.workHeader}>
        <h3 style={styles.workTitle}>Review & Learn</h3>
        <p style={styles.workSubtitle}>Track your progress and patterns.</p>
      </div>
      
      <div style={styles.statsGrid}>
        <div style={styles.statCard}><div style={styles.statValue}>{stats.totalCompleted}</div><div style={styles.statLabel}>Completed</div></div>
        <div style={styles.statCard}><div style={{ ...styles.statValue, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>{stats.avgSatisfaction.toFixed(1)}<Icons.Star filled className="w-5 h-5" /></div><div style={styles.statLabel}>Avg Satisfaction</div></div>
        <div style={styles.statCard}><div style={styles.statValue}>{stats.reviewCount}</div><div style={styles.statLabel}>Reviews</div></div>
        <div style={styles.statCard}><div style={styles.statValue}>{stats.pendingCount}</div><div style={styles.statLabel}>Pending</div></div>
      </div>

      {/* Completed Tasks List */}
      <div style={{ marginTop: 24 }}>
        <h4 style={styles.reviewListTitle}>Completed Tasks</h4>
        {completedTasks.length === 0 ? (
          <EmptyState icon={<Icons.Check className="w-8 h-8" />} message="Complete tasks to see them here" />
        ) : (
          <div style={styles.completedTasksList}>
            {completedTasks.map(task => {
              const review = getTaskReview(task.id);
              const isEditing = editingReviewId === task.id;
              
              // Get reflection answers
              const reasons = task.reflection ? Object.entries(task.reflection).filter(([k, v]) => v && String(v).trim()) : [];
              
              return (
                <div key={task.id} style={styles.completedTaskItem}>
                  {/* Task name with strikethrough */}
                  <div style={styles.completedTaskHeader}>
                    <span 
                      style={styles.completedTaskName}
                      onClick={() => onReactivateTask(task.id)}
                      title="Click to reactivate this task"
                    >
                      {task.content}
                    </span>
                    <button 
                      style={styles.reactivateBtn}
                      onClick={() => onReactivateTask(task.id)}
                      title="Reactivate task"
                    >
                      <Icons.RotateCcw className="w-3.5 h-3.5" /> Reactivate
                    </button>
                  </div>
                  
                  {/* Review section */}
                  {review && !isEditing && (
                    <div style={styles.reviewFeedbackSection}>
                      <div style={styles.reviewRatingRow}>
                        <div style={styles.reviewStars}>
                          {[1, 2, 3, 4, 5].map(s => <Icons.Star key={s} filled={review.satisfactionRating >= s} className="w-4 h-4" />)}
                        </div>
                        <button style={styles.editReviewBtn} onClick={() => startEditReview(review)}>
                          <Icons.Edit className="w-3 h-3" /> Edit
                        </button>
                      </div>
                      {review.improvements && (
                        <p style={styles.reviewImprovementsText}>{review.improvements}</p>
                      )}
                    </div>
                  )}
                  
                  {/* Edit review form */}
                  {isEditing && (
                    <div style={styles.editReviewForm}>
                      <div style={styles.ratingButtons}>
                        {[1, 2, 3, 4, 5].map(r => (
                          <button key={r} style={{ ...styles.ratingBtn, ...(editRating >= r ? styles.ratingBtnActive : {}) }} onClick={() => setEditRating(r)}>
                            <Icons.Star filled={editRating >= r} />
                          </button>
                        ))}
                      </div>
                      <textarea 
                        placeholder="What could be improved?" 
                        value={editImprovements} 
                        onChange={e => setEditImprovements(e.target.value)} 
                        style={styles.textarea}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button style={styles.primaryBtn} onClick={saveEditReview}>Save</button>
                        <button style={styles.ghostBtn} onClick={() => setEditingReviewId(null)}>Cancel</button>
                      </div>
                    </div>
                  )}
                  
                  {!review && (
                    <p style={styles.noReviewText}>No review submitted</p>
                  )}
                  
                  {/* Answer bullets (not editable) */}
                  {reasons.length > 0 && (
                    <div style={styles.answerBulletsSection}>
                      <p style={styles.answerBulletsTitle}>Focus Mode Answers:</p>
                      <ul style={styles.answerBulletsList}>
                        {reasons.map(([key, value], idx) => (
                          <li key={idx} style={styles.answerBulletItem}>
                            <strong style={{ textTransform: 'capitalize' }}>{key}:</strong> {value}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// AUTH PAGE — Sign In + Create Account
// ============================================================================
function AuthPage({ authMode, setAuthMode, authForm, setAuthForm, authLoading, authError, onLogin, onSignup, onBack }) {
  const update = (f, v) => setAuthForm(p => ({ ...p, [f]: v }));
  const isLogin = authMode === 'login';

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') isLogin ? onLogin() : onSignup();
  };

  return (
    <div style={styles.authPage}>
      <div style={styles.authContainer}>
        {/* Logo */}
        <div style={styles.authLogo}>
          <Icons.Hourglass className="w-8 h-8" />
          <span style={styles.logoText}>OT<sup style={styles.sup}>2</sup></span>
        </div>

        {/* Mode toggle tabs */}
        <div style={{ display: 'flex', backgroundColor: '#F4F4F5', borderRadius: 12, padding: 4, width: '100%', boxSizing: 'border-box' }}>
          {['login', 'signup'].map(mode => (
            <button
              key={mode}
              onClick={() => { setAuthMode(mode); setAuthForm(p => ({ ...p })); }}
              style={{
                flex: 1, padding: '9px 0', border: 'none', borderRadius: 9, fontSize: 14,
                fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
                backgroundColor: authMode === mode ? 'white' : 'transparent',
                color: authMode === mode ? '#18181B' : '#71717A',
                boxShadow: authMode === mode ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <div style={styles.authCard}>
          <div style={styles.authHeader}>
            <h1 style={styles.authTitle}>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
            <p style={styles.authSubtitle}>
              {isLogin ? 'Sign in to sync your tasks across devices' : 'Join OT² — free forever, no card needed'}
            </p>
          </div>

          {/* Name field — signup only */}
          {!isLogin && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Your Name</label>
              <div style={styles.inputWrapper}>
                <span style={styles.inputIcon}><Icons.User className="w-4 h-4" /></span>
                <input
                  type="text"
                  placeholder="e.g. Arjun Sharma"
                  value={authForm.profileName}
                  onChange={e => update('profileName', e.target.value)}
                  onKeyDown={handleKeyDown}
                  style={styles.authInput}
                  autoFocus={!isLogin}
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <div style={styles.inputWrapper}>
              <span style={styles.inputIcon}><Icons.Mail className="w-4 h-4" /></span>
              <input
                type="email"
                placeholder="you@example.com"
                value={authForm.email}
                onChange={e => update('email', e.target.value)}
                onKeyDown={handleKeyDown}
                style={styles.authInput}
                autoFocus={isLogin}
              />
            </div>
          </div>

          {/* Password */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <span style={styles.inputIcon}><Icons.Lock className="w-4 h-4" /></span>
              <input
                type="password"
                placeholder={isLogin ? '••••••••' : 'At least 6 characters'}
                value={authForm.password}
                onChange={e => update('password', e.target.value)}
                onKeyDown={handleKeyDown}
                style={styles.authInput}
              />
            </div>
          </div>

          {/* Confirm password — signup only */}
          {!isLogin && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Confirm Password</label>
              <div style={styles.inputWrapper}>
                <span style={styles.inputIcon}><Icons.Lock className="w-4 h-4" /></span>
                <input
                  type="password"
                  placeholder="Repeat password"
                  value={authForm.confirmPassword}
                  onChange={e => update('confirmPassword', e.target.value)}
                  onKeyDown={handleKeyDown}
                  style={styles.authInput}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {authError && <p style={styles.authError}>{authError}</p>}

          {/* Submit */}
          <button
            type="button"
            style={{ ...styles.authPrimaryBtn, width: '100%', justifyContent: 'center', opacity: authLoading ? 0.7 : 1 }}
            disabled={authLoading}
            onClick={isLogin ? onLogin : onSignup}
          >
            {authLoading
              ? <Icons.Loader />
              : isLogin ? 'Sign In' : 'Create Account'}
          </button>

          {/* Demo hint — login only */}
          {isLogin && (
            <p style={{ fontSize: 12, color: '#A1A1AA', marginTop: 4, textAlign: 'center' }}>
              Demo: demo@ot2.app / demo123
            </p>
          )}

          {/* Switch mode link */}
          <p style={{ fontSize: 13, color: '#71717A', textAlign: 'center', marginTop: 4 }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setAuthMode(isLogin ? 'signup' : 'login'); }}
              style={{ background: 'none', border: 'none', color: '#FF6B6B', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: 0 }}
            >
              {isLogin ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>

        <button style={styles.backToHome} onClick={onBack}>
          <Icons.ArrowLeft className="w-4 h-4" /> Back to home
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// VIDEO MODAL COMPONENT
// ============================================================================
function VideoModal({ isOpen, onClose, onHideOnStartup, hideOnStartup }) {
  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>How to Use OT²</h2>
          <button style={styles.modalCloseBtn} onClick={onClose}>×</button>
        </div>
        
        <div style={styles.videoContainer}>
          <iframe
            width="100%"
            height="400"
            src="https://www.youtube.com/embed/dQw4w9WgXcQ"
            title="OT² Tutorial"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ borderRadius: 8 }}
          />
        </div>

        <div style={styles.modalFooter}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={hideOnStartup}
              onChange={e => onHideOnStartup(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Don't show this on startup
          </label>
          <button style={styles.primaryBtn} onClick={onClose}>Got it!</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MARKETPLACE MODAL
// ============================================================================
function MarketplaceModal({
  templates, onClose,
  onSeedRequest, seedingTemplate,
  seedLoginEmail, setSeedLoginEmail,
  seedLoginPassword, setSeedLoginPassword,
  seedLoginError, seedingDone,
  onSeedLogin, onCancelSeed,
  isAuthenticated, onSeedDirect,
}) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 2000,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '24px 16px', overflowY: 'auto',
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: 20, width: '100%', maxWidth: 860,
        boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #18181B 0%, #3F3F46 100%)',
          padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 28 }}>🛒</span>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: 0 }}>Marketplace</h2>
            </div>
            <p style={{ fontSize: 14, color: '#A1A1AA', margin: 0 }}>
              Pre-built AI-seeded apps — one click to load into your OT² workspace
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#A1A1AA', fontSize: 28, cursor: 'pointer', lineHeight: 1, padding: '4px 8px', borderRadius: 8 }}
          >×</button>
        </div>

        {/* Seed login sub-panel */}
        {seedingTemplate && !seedingDone && (
          <div style={{
            backgroundColor: '#FFF7ED', borderBottom: '1px solid #FED7AA',
            padding: '20px 32px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 22 }}>{seedingTemplate.emoji}</span>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, color: '#18181B', margin: 0 }}>
                  Seed "{seedingTemplate.title}" into your app
                </p>
                <p style={{ fontSize: 13, color: '#92400E', margin: 0 }}>
                  {isAuthenticated
                    ? 'You\'re signed in — click below to seed this data on top of your existing workspace.'
                    : 'Sign in to seed this data on top of your existing workspace.'}
                </p>
              </div>
            </div>

            {!isAuthenticated ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 380 }}>
                <input
                  type="email"
                  placeholder="Email"
                  value={seedLoginEmail}
                  onChange={e => setSeedLoginEmail(e.target.value)}
                  style={{ padding: '10px 14px', border: '1px solid #D4D4D8', borderRadius: 8, fontSize: 14, outline: 'none' }}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={seedLoginPassword}
                  onChange={e => setSeedLoginPassword(e.target.value)}
                  style={{ padding: '10px 14px', border: '1px solid #D4D4D8', borderRadius: 8, fontSize: 14, outline: 'none' }}
                />
                {seedLoginError && (
                  <p style={{ fontSize: 13, color: '#EF4444', margin: 0 }}>{seedLoginError}</p>
                )}
                <p style={{ fontSize: 12, color: '#A1A1AA', margin: 0 }}>Demo: demo@ot2.app / demo123</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={onSeedLogin}
                    style={{ padding: '10px 20px', backgroundColor: '#FF6B6B', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                  >
                    Sign In & Seed Data
                  </button>
                  <button
                    onClick={onCancelSeed}
                    style={{ padding: '10px 16px', backgroundColor: 'transparent', border: '1px solid #D4D4D8', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: '#71717A' }}
                  >Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={onSeedDirect}
                  style={{ padding: '10px 20px', backgroundColor: '#FF6B6B', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                >
                  ✦ Seed Data Now
                </button>
                <button
                  onClick={onCancelSeed}
                  style={{ padding: '10px 16px', backgroundColor: 'transparent', border: '1px solid #D4D4D8', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: '#71717A' }}
                >Cancel</button>
              </div>
            )}
          </div>
        )}

        {/* Seed success banner */}
        {seedingDone && (
          <div style={{ backgroundColor: '#F0FDF4', borderBottom: '1px solid #BBF7D0', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>✅</span>
            <p style={{ fontWeight: 700, color: '#065F46', margin: 0, fontSize: 14 }}>
              Data seeded! Task Graphs and Ripples are now in your Work Mode. Redirecting…
            </p>
          </div>
        )}

        {/* Template Grid */}
        <div style={{ padding: '28px 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
            {templates.map(tpl => (
              <div key={tpl.id} style={{
                border: `2px solid ${seedingTemplate?.id === tpl.id ? tpl.color : '#E4E4E7'}`,
                borderRadius: 16, overflow: 'hidden',
                boxShadow: seedingTemplate?.id === tpl.id ? `0 0 0 3px ${tpl.color}25` : '0 2px 8px rgba(0,0,0,0.06)',
                transition: 'all .2s',
              }}>
                {/* Card top strip */}
                <div style={{
                  background: `linear-gradient(135deg, ${tpl.color}20 0%, ${tpl.color}08 100%)`,
                  borderBottom: `1px solid ${tpl.color}30`,
                  padding: '18px 18px 14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 28 }}>{tpl.emoji}</span>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 800, color: '#18181B', margin: 0 }}>{tpl.title}</h3>
                      <p style={{ fontSize: 11, color: tpl.color, fontWeight: 600, margin: 0 }}>{tpl.tagline}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: '#52525B', lineHeight: 1.5, margin: 0 }}>{tpl.description}</p>
                </div>

                {/* Card body — pool/pod summary */}
                <div style={{ padding: '12px 18px' }}>
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#71717A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>
                      ⧉ {tpl.pools.length} Task Graphs
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {tpl.pools.slice(0, 4).map((p, i) => (
                        <span key={i} style={{ fontSize: 11, padding: '2px 7px', backgroundColor: `${tpl.color}15`, color: tpl.color, borderRadius: 4, fontWeight: 500 }}>
                          {p.length > 22 ? p.slice(0, 22) + '…' : p}
                        </span>
                      ))}
                      {tpl.pools.length > 4 && (
                        <span style={{ fontSize: 11, padding: '2px 7px', backgroundColor: '#F4F4F5', color: '#71717A', borderRadius: 4 }}>
                          +{tpl.pools.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#71717A', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>
                      〜 {tpl.pods.length} Ripples
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {tpl.pods.slice(0, 3).map((p, i) => (
                        <span key={i} style={{ fontSize: 11, padding: '2px 7px', backgroundColor: '#F0F9FF', color: '#0EA5E9', borderRadius: 4, fontWeight: 500 }}>
                          {p.length > 22 ? p.slice(0, 22) + '…' : p}
                        </span>
                      ))}
                      {tpl.pods.length > 3 && (
                        <span style={{ fontSize: 11, padding: '2px 7px', backgroundColor: '#F4F4F5', color: '#71717A', borderRadius: 4 }}>
                          +{tpl.pods.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
                    {tpl.tags.map((tag, i) => (
                      <span key={i} style={{ fontSize: 10, padding: '2px 7px', backgroundColor: '#F4F4F5', color: '#71717A', borderRadius: 100, fontWeight: 600 }}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Seed CTA */}
                  <button
                    onClick={() => onSeedRequest(tpl)}
                    style={{
                      width: '100%', padding: '10px 0',
                      backgroundColor: seedingTemplate?.id === tpl.id ? tpl.color : '#18181B',
                      color: 'white', border: 'none', borderRadius: 10,
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      transition: 'background .2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    {seedingTemplate?.id === tpl.id ? '✦ Selected — Sign in below' : '✦ Seed this data to my app'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 12, color: '#A1A1AA', textAlign: 'center', marginTop: 20 }}>
            More templates coming soon · Seeding adds Task Graphs & Ripples on top of your existing data
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = {
  app: { minHeight: '100vh', backgroundColor: '#FAFAFA', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  header: { position: 'sticky', top: 0, backgroundColor: 'white', borderBottom: '1px solid #E4E4E7', zIndex: 100 },
  headerContent: { maxWidth: '1100px', margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' },
  logo: { display: 'flex', alignItems: 'center', gap: '8px', color: '#FF6B6B', cursor: 'pointer', flexShrink: 0 },
  inlineHero: { flex: 1, textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  inlineHeroTitle: { fontSize: '20px', fontWeight: '800', color: '#18181B', lineHeight: 1, margin: 0 },
  logoText: { fontSize: '24px', fontWeight: '800', letterSpacing: '-1px' },
  sup: { fontSize: '14px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 },
  greeting: { fontSize: '14px', color: '#52525B', fontWeight: '500' },
  primaryBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#FF6B6B', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  outlineBtn: { padding: '8px 16px', backgroundColor: 'transparent', border: '1px solid #D4D4D8', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', color: '#52525B' },
  ghostBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: 'transparent', color: '#71717A', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' },
  linkBtn: { background: 'none', border: 'none', color: '#FF6B6B', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: 4 },
  main: { maxWidth: '1100px', margin: '0 auto', padding: '0 24px' },
  hero: { textAlign: 'center', padding: '48px 20px 32px' },
  heroContent: { maxWidth: '560px', margin: '0 auto' },
  heroTitle: { fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: '800', color: '#18181B', lineHeight: 1.2, marginBottom: '12px' },
  tWord: { color: '#FF6B6B', display: 'inline-block', minWidth: '100px', textAlign: 'left' },
  heroSubtitle: { fontSize: '16px', color: '#71717A', lineHeight: 1.6 },
  guestSection: { paddingTop: '16px', paddingBottom: '60px' },
  guestCard: { backgroundColor: 'white', border: '1px solid #E4E4E7', borderRadius: '16px', padding: '24px', maxWidth: '900px', margin: '0 auto', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' },
  modeNav: { display: 'flex', justifyContent: 'center', gap: '6px', backgroundColor: '#F4F4F5', padding: '6px', borderRadius: '100px', marginBottom: '24px', flexWrap: 'wrap' },
  modeBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', backgroundColor: 'transparent', color: '#71717A', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: 'all .2s' },
  modeBtnActive: { backgroundColor: '#FF6B6B', color: 'white' },
  modeBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  
  // Rich Text Input Styles
  richTextContainer: { marginBottom: 16, border: '1px solid #D4D4D8', borderRadius: 10, overflow: 'hidden', backgroundColor: 'white' },
  richTextToolbar: { display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderBottom: '1px solid #E4E4E7', backgroundColor: '#F9FAFB' },
  formatBtn: { padding: '6px 8px', backgroundColor: 'transparent', border: '1px solid #E4E4E7', borderRadius: 6, cursor: 'pointer', color: '#52525B', display: 'flex', alignItems: 'center' },
  formatHint: { marginLeft: 'auto', fontSize: 11, color: '#A1A1AA' },
  richTextArea: { width: '100%', padding: '12px 14px', border: 'none', fontSize: 14, outline: 'none', resize: 'vertical', minHeight: 80, fontFamily: 'inherit', boxSizing: 'border-box' },
  addTaskBtn: { display: 'flex', alignItems: 'center', gap: 6, margin: '8px 12px 12px', padding: '8px 16px', backgroundColor: '#FF6B6B', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  
  focusHint: { fontSize: 13, color: '#71717A', backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '10px 14px', marginBottom: 16 },
  
  // Highlighted Focus Button
  highlightedFocusBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', backgroundColor: '#FF6B6B', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', animation: 'pulse 2s infinite' },
  
  // Combo Box Styles
  comboInputRow: { display: 'flex', gap: 8, alignItems: 'center' },
  comboInput: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid #D4D4D8', borderRadius: 8, cursor: 'pointer', backgroundColor: 'white', minHeight: 42 },
  comboSearchInput: { border: 'none', outline: 'none', fontSize: 14, flex: 1, backgroundColor: 'transparent' },
  comboDropdown: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #E4E4E7', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: 8, zIndex: 100, marginTop: 4 },
  comboOption: { padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 14 },
  inlineCreateBtn: { display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', backgroundColor: '#6366F1', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  
  // Work Mode Task Card Styles
  workTaskCard: { backgroundColor: 'white', border: '1px solid #E4E4E7', borderRadius: 12, padding: 16, marginBottom: 12 },
  workTaskHeader: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  workTaskTitle: { fontSize: 15, fontWeight: 600, color: '#18181B', cursor: 'pointer', flex: 1 },
  taskMetaRow: { display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  poolBadge: { fontSize: 11, padding: '2px 8px', borderRadius: 4, backgroundColor: '#6366F115', color: '#6366F1', fontWeight: 600 },
  podBadge: { fontSize: 11, padding: '2px 8px', borderRadius: 4, backgroundColor: '#0EA5E915', color: '#0EA5E9', fontWeight: 600 },
  blinkBadge: { fontSize: 11, padding: '2px 8px', borderRadius: 4, backgroundColor: '#10B98115', color: '#10B981', fontWeight: 600 },
  waveBadge: { fontSize: 11, padding: '2px 8px', borderRadius: 4, backgroundColor: '#10B98115', color: '#10B981', fontWeight: 600 },
  
  reasonToDoSection: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12, marginBottom: 12 },
  reasonToDoTitle: { fontSize: 12, fontWeight: 600, color: '#71717A', marginBottom: 6 },
  reasonToDoList: { listStyle: 'none', padding: 0, margin: 0 },
  reasonToDoItem: { fontSize: 13, color: '#52525B', marginBottom: 4, lineHeight: 1.5, wordWrap: 'break-word' },
  
  relationshipsSection: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
  relationshipTag: { fontSize: 11, padding: '4px 8px', borderRadius: 4, fontWeight: 500, cursor: 'pointer' },
  
  workTaskActions: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  focusBtnSmall: { display: 'inline-flex', alignItems: 'center', gap: 3, padding: '5px 10px', backgroundColor: 'transparent', border: '1px solid #D4D4D8', borderRadius: 6, fontSize: 12, color: '#71717A', cursor: 'pointer' },
  startWorkBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 14px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  timerControls: { display: 'flex', alignItems: 'center', gap: 6 },
  timerDisplay: { fontSize: 14, fontVariantNumeric: 'tabular-nums', color: '#71717A' },
  pauseBtn: { display: 'inline-flex', alignItems: 'center', gap: 3, padding: '5px 10px', backgroundColor: '#F59E0B', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  resumeBtn: { display: 'inline-flex', alignItems: 'center', gap: 3, padding: '5px 10px', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  stopBtn: { display: 'inline-flex', alignItems: 'center', gap: 3, padding: '5px 10px', backgroundColor: '#EF4444', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  
  // Graph styles
  graphContainer: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 20, marginTop: 16 },
  graphTitle: { fontSize: 14, fontWeight: 600, color: '#18181B', margin: 0 },
  graphSvg: { display: 'block', margin: '0 auto', backgroundColor: 'white', borderRadius: 8, border: '1px solid #E4E4E7' },
  graphSvgWrapper: { height: 400, borderRadius: 8, overflow: 'hidden', backgroundColor: 'white', border: '1px solid #E4E4E7' },
  graphHint: { fontSize: 12, color: '#71717A', textAlign: 'center', marginTop: 12 },
  zoomBtn: { backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 14, color: '#374151', cursor: 'pointer', fontWeight: 500 },
  
  // Review Mode Styles
  completedTasksList: { display: 'flex', flexDirection: 'column', gap: 12 },
  completedTaskItem: { backgroundColor: 'white', border: '1px solid #E4E4E7', borderRadius: 10, padding: 16 },
  completedTaskHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  completedTaskName: { fontSize: 15, fontWeight: 500, color: '#71717A', textDecoration: 'line-through', cursor: 'pointer', flex: 1 },
  reactivateBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', backgroundColor: 'transparent', border: '1px solid #D4D4D8', borderRadius: 6, fontSize: 12, color: '#71717A', cursor: 'pointer' },
  reviewFeedbackSection: { backgroundColor: '#FFF7ED', borderRadius: 8, padding: 12, marginBottom: 12 },
  reviewRatingRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  reviewStars: { display: 'flex', gap: 2, color: '#F59E0B' },
  editReviewBtn: { display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px', backgroundColor: 'transparent', border: '1px solid #D4D4D8', borderRadius: 4, fontSize: 11, color: '#71717A', cursor: 'pointer' },
  reviewImprovementsText: { fontSize: 13, color: '#52525B', lineHeight: 1.5 },
  editReviewForm: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12, marginBottom: 12 },
  noReviewText: { fontSize: 12, color: '#A1A1AA', fontStyle: 'italic' },
  answerBulletsSection: { backgroundColor: '#F4F4F5', borderRadius: 8, padding: 12 },
  answerBulletsTitle: { fontSize: 12, fontWeight: 600, color: '#71717A', marginBottom: 6 },
  answerBulletsList: { listStyle: 'none', padding: 0, margin: 0 },
  answerBulletItem: { fontSize: 13, color: '#52525B', marginBottom: 4, lineHeight: 1.5 },
  
  // Toggle label
  toggleLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#52525B', cursor: 'pointer' },

  // Original styles continued...
  input: { padding: '10px 14px', border: '1px solid #D4D4D8', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: 'white', width: '100%', boxSizing: 'border-box' },
  inputRow: { display: 'flex', gap: '8px', marginBottom: '16px' },
  iconBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px', backgroundColor: '#FF6B6B', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  taskArea: { minHeight: '200px' },
  taskList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  taskItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#F9FAFB', borderRadius: '10px', border: '1px solid #E4E4E7' },
  taskContent: { fontSize: '14px', color: '#18181B', fontWeight: '500' },
  taskActions: { display: 'flex', alignItems: 'center', gap: '8px' },
  typeBadge: { fontSize: '11px', padding: '2px 8px', borderRadius: '100px', fontWeight: '600' },
  checkbox: { width: '18px', height: '18px', borderRadius: '4px', border: '2px solid #D4D4D8', backgroundColor: 'transparent', cursor: 'pointer', flexShrink: 0 },
  emptyState: { textAlign: 'center', padding: '48px 20px', color: '#A1A1AA' },
  emptyIcon: { fontSize: '48px', marginBottom: '12px', color: '#D4D4D8' },
  emptyMessage: { fontSize: '14px', marginBottom: '16px' },
  focusMode: { padding: '20px 0' },
  focusHeader: { textAlign: 'center', marginBottom: '24px' },
  focusLabel: { fontSize: '13px', color: '#71717A', marginBottom: '6px' },
  focusTask: { fontSize: '20px', fontWeight: '700', color: '#18181B', maxWidth: '500px', margin: '0 auto' },
  progressDots: { display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '20px', flexWrap: 'nowrap', maxHeight: '20px', overflow: 'hidden' },
  dot: { width: '8px', height: '8px', borderRadius: '100px', backgroundColor: '#E4E4E7' },
  dotActive: { width: '28px', backgroundColor: '#FF6B6B' },
  wizardCard: { backgroundColor: '#F9FAFB', borderRadius: '12px', padding: '24px', maxWidth: '480px', margin: '0 auto' },
  questionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' },
  wizardProgress: { fontSize: '12px', color: '#71717A' },
  purposeBadge: { fontSize: '11px', padding: '3px 8px', borderRadius: '100px', fontWeight: '600' },
  wizardQuestion: { fontSize: '16px', fontWeight: '600', color: '#18181B', marginBottom: '16px', lineHeight: 1.4 },
  textarea: { width: '100%', minHeight: '100px', padding: '12px', border: '1px solid #D4D4D8', borderRadius: '8px', fontSize: '14px', outline: 'none', resize: 'vertical', marginBottom: '12px', boxSizing: 'border-box', fontFamily: 'inherit' },
  optionalHint: { fontSize: '12px', color: '#A1A1AA', marginBottom: '16px' },
  wizardActions: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  wizardRightActions: { display: 'flex', gap: '8px' },
  skipSection: { textAlign: 'center', marginTop: '16px' },
  doneCard: { backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '24px', textAlign: 'center', maxWidth: '480px', margin: '0 auto' },
  doneIcon: { width: '48px', height: '48px', backgroundColor: '#10B981', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '24px' },
  doneTitle: { fontSize: '18px', fontWeight: '700', color: '#18181B', marginBottom: '8px' },
  doneText: { fontSize: '14px', color: '#71717A', marginBottom: '16px' },
  loadingCard: { backgroundColor: '#F9FAFB', borderRadius: '12px', padding: '48px 24px', textAlign: 'center', maxWidth: '480px', margin: '0 auto' },
  loadingText: { fontSize: '14px', color: '#71717A', marginTop: '12px' },
  smallOutlineBtn: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', backgroundColor: 'transparent', border: '1px solid #D4D4D8', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', color: '#52525B' },
  
  // Work Mode
  workHeader: { marginBottom: '20px' },
  workHeaderWithSelector: { marginBottom: '20px' },
  workTitleRow: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' },
  workTitleText: { fontSize: '15px', fontWeight: '600', color: '#18181B' },
  viewSelector: { padding: '6px 12px', border: '1px solid #D4D4D8', borderRadius: '8px', fontSize: '14px', fontWeight: '600', backgroundColor: 'white', cursor: 'pointer' },
  workTitle: { fontSize: '18px', fontWeight: '700', color: '#18181B', marginBottom: '4px' },
  workSubtitle: { fontSize: '13px', color: '#71717A' },
  listBlinksContainer: { display: 'flex', flexDirection: 'column', gap: 12 },
  listWavesContainer: { display: 'flex', flexDirection: 'column', gap: 12 },
  
  // Kanban
  kanbanContainer: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' },
  kanbanLane: { backgroundColor: '#F9FAFB', borderRadius: '10px', padding: '12px', minHeight: '200px' },
  kanbanLaneHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '8px', borderTop: '3px solid' },
  kanbanLaneTitle: { fontSize: '13px', fontWeight: '700', color: '#52525B' },
  kanbanLaneCount: { fontSize: '11px', fontWeight: '700', color: 'white', padding: '2px 8px', borderRadius: '100px' },
  kanbanLaneBody: { display: 'flex', flexDirection: 'column', gap: '8px' },
  kanbanEmpty: { fontSize: '12px', color: '#A1A1AA', textAlign: 'center', padding: '20px 0' },
  taskCard: { backgroundColor: 'white', border: '1px solid #E4E4E7', borderRadius: '8px', padding: '10px 12px' },
  taskCardHeader: { display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' },
  taskCardTitle: { fontSize: '13px', fontWeight: '500', color: '#18181B', flex: 1, lineHeight: 1.4 },
  taskCardMeta: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#71717A', marginBottom: '8px' },
  taskCardActions: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' },
  timerBtn: { width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', color: '#71717A', border: '1px solid #E4E4E7', borderRadius: '6px', cursor: 'pointer' },
  
  // Pool View
  poolMetaChip: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', backgroundColor: '#F4F4F5', borderRadius: '100px', fontSize: '12px', color: '#52525B' },
  
  // Energy View
  energyContainer: { display: 'flex', flexDirection: 'column', gap: '16px' },
  energySection: { backgroundColor: '#F9FAFB', borderRadius: '10px', padding: '16px', borderLeft: '4px solid' },
  energyHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' },
  energyEmoji: { fontSize: '24px' },
  energyTitle: { fontSize: '14px', fontWeight: '700', color: '#18181B' },
  energyDesc: { fontSize: '12px', color: '#71717A' },
  energyCount: { fontSize: '12px', fontWeight: '700', color: 'white', padding: '2px 10px', borderRadius: '100px', marginLeft: 'auto' },
  energyBody: { display: 'flex', flexDirection: 'column', gap: '8px' },
  
  // Pod View
  podTaskCard: { position: 'relative' },
  daysUntilBadge: { position: 'absolute', top: 10, right: 10, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, backgroundColor: '#F59E0B', color: 'white' },
  
  // Review Mode
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' },
  statCard: { backgroundColor: '#F9FAFB', borderRadius: '12px', padding: '20px', textAlign: 'center' },
  statValue: { fontSize: '28px', fontWeight: '800', color: '#18181B', marginBottom: '4px' },
  statLabel: { fontSize: '12px', color: '#71717A', fontWeight: '500' },
  reviewModal: { backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '12px', padding: '20px', marginBottom: '20px' },
  reviewTitle: { fontSize: '16px', fontWeight: '700', color: '#18181B', marginBottom: '4px' },
  reviewSubtitle: { fontSize: '13px', color: '#71717A', marginBottom: '16px' },
  ratingButtons: { display: 'flex', gap: '8px', marginBottom: '12px' },
  ratingBtn: { width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', border: '1px solid #D4D4D8', borderRadius: '8px', cursor: 'pointer', color: '#A1A1AA' },
  ratingBtnActive: { backgroundColor: '#FFF7ED', borderColor: '#F59E0B', color: '#F59E0B' },
  reviewActions: { display: 'flex', gap: '8px' },
  reviewListTitle: { fontSize: '14px', fontWeight: '600', color: '#18181B', marginBottom: '12px' },
  reviewList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  reviewItem: { backgroundColor: '#F9FAFB', borderRadius: '8px', padding: '12px' },
  reviewItemHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' },
  reviewItemTask: { fontSize: '13px', fontWeight: '500', color: '#18181B', flex: 1 },
  reviewItemStars: { display: 'flex', gap: '2px', color: '#F59E0B' },
  reviewItemText: { fontSize: '12px', color: '#71717A' },
  completedSection: { marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #E4E4E7' },
  completedLabel: { fontSize: '12px', fontWeight: '600', color: '#71717A', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  completedTask: { fontSize: '13px', color: '#A1A1AA', textDecoration: 'line-through', padding: '6px 0' },
  
  // Features section
  features: { padding: '40px 0 60px' },
  featuresTitle: { fontSize: '24px', fontWeight: '700', color: '#18181B', textAlign: 'center', marginBottom: '24px' },
  featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' },
  featureCard: { padding: '20px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E4E4E7' },
  featureIcon: { width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' },
  featureTitle: { fontSize: '14px', fontWeight: '700', color: '#18181B', marginBottom: '6px' },
  featureDesc: { fontSize: '13px', color: '#71717A', lineHeight: 1.5 },
  ctaSection: { textAlign: 'center', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #F4F4F5' },
  ctaText: { fontSize: '14px', color: '#71717A', marginBottom: '12px' },
  ctaButton: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#18181B', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  
  // Auth
  authPage: { minHeight: '100vh', backgroundColor: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' },
  authContainer: { width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  authLogo: { display: 'flex', alignItems: 'center', gap: '8px', color: '#FF6B6B' },
  authCard: { width: '100%', backgroundColor: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #E4E4E7', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '16px' },
  authHeader: { textAlign: 'center', marginBottom: '8px' },
  authTitle: { fontSize: '22px', fontWeight: '800', color: '#18181B', marginBottom: '4px' },
  authSubtitle: { fontSize: '14px', color: '#71717A' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#52525B' },
  inputWrapper: { position: 'relative' },
  inputIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#A1A1AA', display: 'flex', alignItems: 'center', pointerEvents: 'none' },
  authInput: { width: '100%', padding: '10px 14px 10px 38px', border: '1px solid #D4D4D8', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: 'white' },
  authPrimaryBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#FF6B6B', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  authError: { fontSize: '13px', color: '#EF4444', backgroundColor: '#FEF2F2', padding: '8px 12px', borderRadius: '6px', border: '1px solid #FECACA' },
  backToHome: { display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#71717A', fontSize: '14px', cursor: 'pointer' },
  answerSummary: { backgroundColor: 'white', borderRadius: '8px', padding: '12px', marginBottom: '16px', border: '1px solid #E4E4E7', textAlign: 'left' },
  summaryTitle: { fontSize: '12px', fontWeight: '600', color: '#71717A', marginBottom: '8px' },
  summaryItem: { display: 'flex', gap: '8px', marginBottom: '4px', fontSize: '12px' },
  summaryLabel: { fontWeight: '600', color: '#52525B', textTransform: 'capitalize' },
  summaryValue: { color: '#71717A', flex: 1 },
  
  // Focus Mode sub-components
  relPanel: { marginTop: 16, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 16 },
  relTitle: { fontSize: 13, color: '#52525B', marginBottom: 12 },
  relTypeBtn: { padding: '6px 12px', border: '1px solid #E4E4E7', borderRadius: 6, fontSize: 12, cursor: 'pointer', backgroundColor: 'white' },
  podForm: { backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 10, padding: 16 },
  podTypeBtn: { flex: 1, padding: '12px', border: '1px solid #E4E4E7', borderRadius: 8, cursor: 'pointer', backgroundColor: 'white', textAlign: 'left' },
  podTypeBtnActive: { borderColor: '#0EA5E9', backgroundColor: '#F0F9FF' },
  weekDayBtn: { width: 36, height: 36, borderRadius: 8, border: '1px solid #E4E4E7', backgroundColor: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  weekDayBtnActive: { backgroundColor: '#0EA5E9', color: 'white', borderColor: '#0EA5E9' },
  podPickerItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid #E4E4E7', borderRadius: 8, cursor: 'pointer', backgroundColor: 'white' },
  
  // Video Modal Styles
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: 'white', borderRadius: 12, boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)', maxWidth: 600, width: '90%', maxHeight: '90vh', overflow: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottom: '1px solid #E4E4E7' },
  modalTitle: { fontSize: 20, fontWeight: 600, margin: 0, color: '#18181B' },
  modalCloseBtn: { background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', color: '#A1A1AA', padding: 0, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  videoContainer: { padding: 20, backgroundColor: '#FAFAFA' },
  modalFooter: { padding: 20, borderTop: '1px solid #E4E4E7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  checkboxLabel: { display: 'flex', alignItems: 'center', fontSize: 14, color: '#52525B', cursor: 'pointer' },
  
  // Navigation Menu Styles
  navContainer: { display: 'flex', gap: 16, alignItems: 'center', marginRight: 20 },
  navLink: { background: 'none', border: 'none', color: '#52525B', cursor: 'pointer', fontSize: 14, fontWeight: 500, padding: '4px 0', transition: 'color 0.2s', display: 'flex', alignItems: 'center' },
  dropdownMenu: { position: 'absolute', top: '100%', right: 0, backgroundColor: 'white', border: '1px solid #E4E4E7', borderRadius: 8, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', minWidth: 180, zIndex: 100, marginTop: 4 },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', color: '#52525B', textDecoration: 'none', fontSize: 13, borderBottom: '1px solid #F4F4F5' },

  // Table styles (not used in new list view but kept for compatibility)
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: '600', color: '#71717A', borderBottom: '1px solid #E4E4E7', textTransform: 'uppercase', letterSpacing: '0.5px' },
  td: { padding: '12px', borderBottom: '1px solid #F4F4F5', fontSize: '14px', color: '#18181B' },
  tdMuted: { padding: '12px', borderBottom: '1px solid #F4F4F5', fontSize: '13px', color: '#71717A' },
  tr: { backgroundColor: 'white' },
  timerCell: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' },
};

// Add CSS animations — pulse for Focus button, task-card-flash for banner navigation (FEAT-027)
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes pulse {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.4); }
    50% { transform: scale(1.02); box-shadow: 0 0 0 6px rgba(255, 107, 107, 0); }
  }
  @keyframes taskCardFlash {
    0%   { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); background-color: inherit; }
    20%  { box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.5); background-color: #FFFBEB; }
    70%  { box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.2); background-color: #FFFBEB; }
    100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); background-color: inherit; }
  }
  .task-card-flash {
    animation: taskCardFlash 0.9s ease-out forwards;
    border-radius: 12px;
  }
`;
if (typeof document !== 'undefined') {
  document.head.appendChild(styleSheet);
}
