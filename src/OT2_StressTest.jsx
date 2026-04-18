import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ============================================================================
// ⚙️  DEBUG FLAG — set to false to hide all timing overlays in production
// ============================================================================
const DEBUG_MODE = true;

// ============================================================================
// OT² STRESS TEST — Heavy data simulation with FEAT-006 updates
// BASELINE: 2026-04-11 · Wave Edition · Post-FEAT-018
// 200 Freedom tasks · 550 Work tasks (150 waves, 20 pools×10, 10 pods×20)
// 500 completed reviews · Debug render-timing overlays
// INCLUDES: Rich text input, Pool/Pod ComboBox, List Waves view,
//           Relationship Graph, Updated ReviewMode with reactivation
// ============================================================================

const STORAGE_KEYS = {
  TASKS:    'ot2_guest_tasks',
  TIMERS:   'ot2_guest_timers',
  REVIEWS:  'ot2_guest_reviews',
  USER:     'ot2_user',
  POOLS:    'ot2_pools',
  PODS:     'ot2_pods',
  POD_LOGS: 'ot2_pod_logs',
  RECURRENCE_LOGS: 'ot2_recurrence_logs',
  MIGRATION_VERSION: 'ot2_migration_version',
  SEEDED:   'ot2_stress_seeded',
};

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const todayStr = () => new Date().toISOString().slice(0, 10);
const addDays = (ds, n) => { const d = new Date(ds); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

// ============================================================================
// 📊 DEBUG TIMER HOOK
// Returns { mark, elapsed } — mark() snapshots a label, elapsed shows ms since mount
// ============================================================================
function useDebugTimer(label) {
  const mountTime = useRef(performance.now());
  const marks = useRef([]);
  const [display, setDisplay] = useState([]);

  const mark = useCallback((name) => {
    if (!DEBUG_MODE) return;
    const ms = (performance.now() - mountTime.current).toFixed(1);
    marks.current.push({ name, ms });
    setDisplay([...marks.current]);
  }, []);

  useEffect(() => {
    if (!DEBUG_MODE) return;
    mark('mount');
  }, []);

  return { mark, display, mountTime };
}

// ============================================================================
// 🕐 DEBUG OVERLAY COMPONENT
// Shown bottom-right of each mode panel when DEBUG_MODE = true
// ============================================================================
function DebugOverlay({ label, timings, taskCount, extra }) {
  const [collapsed, setCollapsed] = useState(false);
  if (!DEBUG_MODE) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 12, right: 12, zIndex: 9999,
      backgroundColor: '#0F172A', color: '#94A3B8',
      borderRadius: 10, fontSize: 11, fontFamily: 'monospace',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      border: '1px solid #1E293B',
      minWidth: collapsed ? 'auto' : 220,
      transition: 'all .2s',
    }}>
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', cursor: 'pointer', borderBottom: collapsed ? 'none' : '1px solid #1E293B' }}
      >
        <span style={{ color: '#38BDF8', fontWeight: 700 }}>⏱ DEBUG · {label}</span>
        <span style={{ color: '#475569' }}>{collapsed ? '▲' : '▼'}</span>
      </div>
      {!collapsed && (
        <div style={{ padding: '8px 10px' }}>
          {taskCount !== undefined && (
            <div style={{ color: '#F59E0B', marginBottom: 6, fontWeight: 700 }}>
              {taskCount.toLocaleString()} tasks in view
            </div>
          )}
          {extra && <div style={{ color: '#A3E635', marginBottom: 6 }}>{extra}</div>}
          {timings.length === 0 && <div style={{ color: '#475569' }}>waiting…</div>}
          {timings.map((t, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
              <span style={{ color: '#CBD5E1' }}>{t.name}</span>
              <span style={{ color: t.ms > 200 ? '#EF4444' : t.ms > 50 ? '#F59E0B' : '#4ADE80' }}>
                {t.ms}ms
              </span>
            </div>
          ))}
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #1E293B', color: '#475569', fontSize: 10 }}>
            🔴 &gt;200ms · 🟡 &gt;50ms · 🟢 fast<br />
            Set DEBUG_MODE=false to hide
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================
const T_WORDS = ['Things', 'Tasks', 'Time', 'Thoughts', 'Targets', 'Todos', 'Tactics'];

const FALLBACK_QUESTIONS = [
  { key: 'deadline', question: 'When does this need to be done?', placeholder: 'e.g., By end of today, This week, No rush', purpose: 'kanban' },
  { key: 'outcome', question: 'What does success look like?', placeholder: "Describe what 'done' means to you...", purpose: 'energy' },
  { key: 'motivation', question: 'Why does this matter to you?', placeholder: 'Connect with your reason...', purpose: 'quadrant' },
];

const RELATIONSHIP_TYPES = [
  { key: 'blocks', label: 'Blocks', desc: 'Needs this done first', color: '#6366F1', icon: '⏸️' },
  { key: 'pairs_with', label: 'Pairs With', desc: 'Do these around the same time', color: '#10B981', icon: '👥' },
  { key: 'helps_reach', label: 'Helps Reach', desc: 'Both needed for this goal', color: '#F59E0B', icon: '🎯' },
];

const migrateRelationshipType = (oldType) => {
  const mapping = { 'precede': 'blocks', 'follow': 'blocks', 'schedule': 'pairs_with', 'accomplish': 'helps_reach' };
  return mapping[oldType] || oldType;
};

const POD_TYPES = [
  { key: 'annual_dates', label: '📅 Annual Dates', desc: 'Each task gets its own specific date in the year' },
  { key: 'recurring', label: '🔁 Recurring Schedule', desc: 'All tasks share a repeating schedule' },
];

const RECURRENCE_TYPES = [
  { key: 'daily', label: 'Daily', desc: 'Every single day' },
  { key: 'specific_days', label: 'Specific days of week', desc: 'Choose which days, e.g. Mon · Wed · Fri' },
  { key: 'every_n', label: 'Every N', desc: 'Every N days or weeks' },
  { key: 'monthly_frequency', label: 'X times per month', desc: 'Flexible monthly quota' },
  { key: 'annual', label: 'Annual (month & day)', desc: 'Birthdays, anniversaries (year ignored)' },
];

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEK_DAYS_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const migrateRecurrence = (oldRecurrence, oldTrackerLabel) => {
  const newRecurrence = { ...oldRecurrence };
  if (oldTrackerLabel && !newRecurrence.trackers) {
    newRecurrence.trackers = [{ id: 't1', label: oldTrackerLabel.slice(0, 2), valueType: 'text' }];
  }
  if (newRecurrence.type === 'every_n_days') { newRecurrence.type = 'every_n'; newRecurrence.unit = 'days'; }
  if (newRecurrence.type === 'every_n_weeks') { newRecurrence.type = 'every_n'; newRecurrence.unit = 'weeks'; }
  if (!newRecurrence.startDate && newRecurrence.type === 'every_n') { newRecurrence.startDate = todayStr(); }
  if (newRecurrence.type === 'every_n' && !newRecurrence.unit) { newRecurrence.unit = 'days'; }
  return newRecurrence;
};

const recurrenceSummaryLine = (task) => {
  const r = task?.recurrence || {};
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
  if (r.type === 'every_n_days') return `🔁 Every ${r.everyNDays || '?'} days${trackerPart}`;
  return '—';
};

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
  async askQuestion(prompt) {
    if (this.EDGE_FUNCTION_URL) {
      try {
        const response = await fetch(this.EDGE_FUNCTION_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
        if (response.ok) { const data = await response.json(); return data.answer || data.response || ''; }
      } catch (error) { console.warn('AI ask fallback:', error); }
    }
    return '';
  },
};

// ============================================================================
// 🌱 DATA SEEDER
// ============================================================================
const BLINK_TASKS = [
  'Reply to client about proposal revisions', 'Order replacement ink cartridges',
  'Check flight status for Thursday trip', 'Pay electricity bill before due date',
  'Renew gym membership', 'Pick up dry cleaning', 'Call dentist to reschedule',
  'Book table for anniversary dinner', 'Transfer money to savings account',
  'Update emergency contact details at HR', 'Read chapter 4 of Atomic Habits',
  'Send thank you note', 'Clean out Downloads folder', 'Update LinkedIn headline',
  'Return library books', 'Buy birthday card for Priya', 'Cancel unused subscription',
  'Schedule car service', 'Submit expense report', 'Refill prescription',
  'Research standing desk options', 'Write performance self-review',
  'Backup laptop to external drive', 'Review bank statement',
  'Sign and return lease renewal', 'Organize kitchen pantry',
  'Delete duplicate contacts', 'Send condolence message', 'Update passport photo',
  'Print boarding passes', 'Water the balcony plants', 'Fix squeaky door hinge',
  'Return Amazon package', 'RSVP to wedding', 'Configure 2FA on email',
  'Archive old project files', 'Measure bedroom for new rug', 'Find a plumber',
  'Download updated tax forms', 'Review terms for credit card offer',
  'Schedule annual health check-up', 'Send invoice to client',
  'Update will and testament', 'Buy new running shoes',
  'Check on house plant health', 'Forward utility bills',
  'Confirm hotel check-in time', 'Back up phone contacts',
  'Set up auto-pay for internet bill', 'Research noise-cancelling headphones',
];

const POOL_NAMES = [
  'Sprint Q2-2026', 'Goal: Launch v2.0', 'Project: Office Renovation',
  'Monthly Targets Jun', 'Complexity: High Focus', 'Goal: Personal Growth',
  'Sprint Q3-2026', 'Project: Client Portal', 'Context: At Computer',
  'Context: Phone Calls', 'Goal: Health & Fitness', 'Project: Team Onboarding',
  'Monthly Targets Jul', 'Estimation: 2h tasks', 'Sprint Q4-2026',
  'Goal: Financial Planning', 'Project: Brand Refresh', 'Context: Deep Work',
  'Complexity: Quick Wins', 'Project: Data Migration',
];

const POOL_TASK_TEMPLATES = [
  'Define acceptance criteria for {feature}', 'Write unit tests for {module}',
  'Review pull request from {person}', 'Update documentation for {component}',
  'Conduct user research on {topic}', 'Create wireframes for {screen}',
  'Analyse metrics for {event}', 'Prepare demo script for {audience}',
  'Resolve bug in {area}', 'Coordinate with {team} on {deliverable}',
];

const POD_CONFIGS = [
  { name: 'Morning Exercise', podType: 'recurring', recurrence: { type: 'daily' }, trackerFields: [{ id: uid(), name: 'Kms Run', type: 'text' }] },
  { name: 'Birthdays & Anniversaries', podType: 'annual_dates', recurrence: null, trackerFields: [] },
  { name: 'Medication', podType: 'recurring', recurrence: { type: 'daily' }, trackerFields: [{ id: uid(), name: 'Morning Dose', type: 'checkbox' }] },
  { name: 'Weekly Review', podType: 'recurring', recurrence: { type: 'specific_days', weekDays: [4] }, trackerFields: [] },
  { name: 'Outdoor Activities', podType: 'recurring', recurrence: { type: 'specific_days', weekDays: [0, 2, 5] }, trackerFields: [] },
  { name: 'Bill Payments', podType: 'annual_dates', recurrence: null, trackerFields: [] },
  { name: 'Reading Habit', podType: 'recurring', recurrence: { type: 'daily' }, trackerFields: [{ id: uid(), name: 'Pages Read', type: 'text' }] },
  { name: 'Guitar Practice', podType: 'recurring', recurrence: { type: 'specific_days', weekDays: [0, 1, 2, 3, 4] }, trackerFields: [] },
  { name: 'Check-ins & Catch-ups', podType: 'recurring', recurrence: { type: 'monthly_frequency', frequency: 4 }, trackerFields: [] },
  { name: 'Important Life Events', podType: 'annual_dates', recurrence: null, trackerFields: [] },
];

const POD_TASK_NAMES = [
  ['Morning jog', 'Evening walk', 'Cycling session', 'Swimming laps', 'Yoga flow', 'HIIT workout', 'Strength training', 'Stretching routine', 'Park run', 'Stair climb'],
  ['Wish Amma', 'Greet Rahul', 'Call Dad', 'Message Priya', 'Wish Sunita Anniversary', 'Call Uncle Raj', 'Wish Deepak', 'Message team on Diwali', 'Wish Mira graduation', 'Call Grandma'],
  ['Take morning BP tablet', 'Evening vitamin D', 'Morning iron supplement', 'Allergy pill', 'Probiotic with breakfast', 'Vitamin B12 morning', 'Omega-3 evening', 'Zinc tablet', 'Magnesium before sleep', 'Antacid if needed'],
  ['Review open tasks', 'Check week goals', 'Update project notes', 'Archive done items', 'Plan next week', 'Review decisions log', 'Check habit streaks', 'Retrospective notes', 'Inbox zero sweep', 'Update team status'],
  ['Walk in Aarey forest', 'Cycling in Powai', 'Swimming at club', 'Hike Sanjay Gandhi', 'Beach walk Juhu', 'Trek Khandala', 'Run at Carter Road', 'Badminton session', 'Tennis practice', 'Football with friends'],
  ['Pay electricity bill', 'Pay internet bill', 'Credit card payment', 'LIC premium due', 'SIP installment', 'Rent payment', 'Water bill', 'Gas cylinder booking', 'Property tax', 'Car insurance renewal'],
  ['Read Atomic Habits ch.5', 'Finish Deep Work part 2', 'Read HBR article', 'Continue Sapiens', 'Read design blog', 'Finish newsletter backlog', 'Read PM weekly digest', 'Continue 4-Hour Workweek', 'Read tech documentation', 'Finish last chapter'],
  ['Practice chords Cmaj7', 'Fingerpicking pattern 3', 'Learn new riff', 'Scales warmup', 'Strumming patterns', 'Learn Wonderwall intro', 'Practice barre chords', 'Jam along to backing track', 'Record progress video', 'Music theory exercise'],
  ['Call Vikram for catchup', 'Video call with mentor', 'Message old colleague', 'LinkedIn connect with lead', 'Coffee with Anita', 'Call Rohit from college', 'Check in with team Priya', 'Network event follow-up', 'Message Karan about project', 'Call Mom weekly'],
  ['File income tax return', 'Portfolio review', 'Travel anniversary trip', 'Family photo session', 'Update insurance nominees', 'Write annual letter to kids', 'Heritage trip planning', 'Time capsule update', 'Year in review journal', 'Gratitude ritual Dec 31'],
];

const REVIEW_COMMENTS = [
  'Went smoothly, no blockers encountered.', 'Took longer than expected due to dependencies.',
  'Great outcome, team was very responsive.', 'Could have delegated parts of this.',
  'Better to break this into smaller chunks next time.', 'Completed ahead of schedule.',
  'Needed more context upfront.', 'Perfect timing, exactly when it was needed.',
  'Collaboration worked well on this one.', 'Should have started earlier to avoid the rush.',
];

const DEADLINES = ['today', 'tomorrow', 'this week', 'next week', 'next month', 'no rush', 'by Friday', 'end of quarter', 'asap', 'whenever convenient'];
const OUTCOMES = ['Report delivered', 'Feature shipped', 'Client signed off', 'Documentation updated', 'Team aligned', 'Bug resolved', 'Decision made', 'Process improved', 'Relationship strengthened', 'Goal reached'];
const MOTIVATIONS = ['Directly impacts Q2 OKR', 'Unblocks 3 teammates', 'Important for client', 'Personal growth priority', 'Team morale depends on it', 'Financial impact if delayed', 'Health is non-negotiable', 'Long overdue', 'Sets the foundation', 'Simply the right thing'];

function generateSeedData() {
  const now = Date.now();
  const pools = POOL_NAMES.map((name, i) => ({
    id: `pool_${i}`, name, createdAt: now - i * 86400000, completionDate: null, completionDays: null, relationships: [],
  }));

  const pods = POD_CONFIGS.map((cfg, i) => ({ id: `pod_${i}`, createdAt: now - i * 86400000 * 3, ...cfg }));

  const tasks = [];

  // 200 Freedom/Wave tasks (pending, not yet focused)
  for (let i = 0; i < 200; i++) {
    const template = BLINK_TASKS[i % BLINK_TASKS.length];
    tasks.push({
      id: `wave_freedom_${i}`, content: i < BLINK_TASKS.length ? template : `${template} — variant ${Math.ceil(i / BLINK_TASKS.length)}`,
      createdAt: now - i * 3600000, isCompleted: false, reflection: null, type: 'wave', poolIds: [],
    });
  }

  // 150 Waves with reflections (work mode visible)
  for (let i = 0; i < 150; i++) {
    tasks.push({
      id: `wave_work_${i}`, content: `${BLINK_TASKS[i % BLINK_TASKS.length]} [B${i + 1}]`,
      createdAt: now - i * 7200000, isCompleted: false,
      reflection: { deadline: DEADLINES[i % DEADLINES.length], outcome: OUTCOMES[i % OUTCOMES.length], motivation: MOTIVATIONS[i % MOTIVATIONS.length], complexity: i % 3 === 0 ? 'high complexity' : i % 3 === 1 ? 'medium' : 'low' },
      type: 'wave', poolIds: [],
    });
  }

  // 20 pools × 10 tasks = 200 pool tasks
  const features = ['auth flow', 'dashboard', 'payment module', 'onboarding', 'notifications', 'search', 'reporting', 'mobile app', 'API', 'admin panel'];
  const persons = ['Rahul', 'Priya', 'Amit', 'Sunita', 'Vikram', 'Deepa', 'Kiran', 'Anita', 'Suresh', 'Meena'];
  const teams = ['backend', 'design', 'QA', 'product', 'devops', 'data', 'support', 'sales', 'legal', 'finance'];

  for (let p = 0; p < 20; p++) {
    for (let t = 0; t < 10; t++) {
      const template = POOL_TASK_TEMPLATES[t].replace('{feature}', features[t]).replace('{module}', features[(t + 1) % features.length])
        .replace('{person}', persons[t]).replace('{component}', features[(t + 2) % features.length]).replace('{topic}', features[(t + 3) % features.length])
        .replace('{screen}', features[(t + 4) % features.length]).replace('{event}', `Q${(p % 4) + 1} launch`).replace('{audience}', persons[(t + p) % persons.length])
        .replace('{area}', features[(p + t) % features.length]).replace('{team}', teams[p % teams.length]).replace('{deliverable}', `milestone ${t + 1}`);

      const taskId = `pool_task_${p}_${t}`;
      const isRecurring = p % 5 === 0 && t > 2; // some pool tasks have recurrence
      tasks.push({
        id: taskId, content: `[${POOL_NAMES[p].split(':')[0].trim()}] ${template}`,
        createdAt: now - (p * 10 + t) * 3600000, isCompleted: false,
        reflection: { deadline: DEADLINES[(p + t) % DEADLINES.length], outcome: OUTCOMES[(p + t) % OUTCOMES.length], motivation: MOTIVATIONS[t % MOTIVATIONS.length] },
        type: 'pool', poolIds: [`pool_${p}`],
        recurrenceEnabled: isRecurring,
        recurrence: isRecurring ? { type: ['daily', 'specific_days', 'every_n'][t % 3], weekDays: [0, 2, 4], everyN: 3, unit: 'days', startDate: todayStr(), frequency: 3, annualMonthDay: '', trackers: [] } : null,
        recurrenceTrackerLabel: isRecurring ? 'Progress' : '',
      });

      if (t > 0) {
        pools[p].relationships.push({ fromTaskId: taskId, toTaskId: `pool_task_${p}_${t - 1}`, type: ['blocks', 'pairs_with', 'helps_reach'][t % 3] });
      }
    }
  }

  // 10 pods × 20 tasks = 200 recurring pool tasks (converted from pod tasks)
  const annualDates = ['03-22','06-15','08-10','01-05','11-30','02-14','05-01','07-04','09-20','12-25','04-17','10-08'];
  for (let p = 0; p < 10; p++) {
    const pod = pods[p];
    const podTaskNames = POD_TASK_NAMES[p] || POD_TASK_NAMES[0];
    const isAnnual = pod.podType === 'annual_dates';
    for (let t = 0; t < 20; t++) {
      const name = t < podTaskNames.length ? podTaskNames[t] : `${podTaskNames[t % podTaskNames.length]} (variation ${Math.floor(t / podTaskNames.length) + 1})`;
      const recType = isAnnual ? 'annual' : (pod.recurrence?.type || 'daily');
      tasks.push({
        id: `pod_task_${p}_${t}`, content: name, createdAt: now - (p * 20 + t) * 7200000, isCompleted: false, reflection: null,
        type: 'pool', poolIds: [],
        recurrenceEnabled: true,
        recurrence: isAnnual
          ? { type: 'annual', annualMonthDay: annualDates[(p * 20 + t) % annualDates.length], trackers: [] }
          : migrateRecurrence(pod.recurrence || { type: 'daily' }, ''),
        recurrenceTrackerLabel: (pod.trackerFields || []).filter(f => f.name).map(f => f.name).join(', ') || '',
      });
    }
  }

  // 500 completed tasks with reviews
  const reviews = [];
  for (let i = 0; i < 500; i++) {
    const taskId = `completed_${i}`;
    const completedAt = new Date(now - i * 86400000 * 0.5).toISOString();
    tasks.push({
      id: taskId, content: `${BLINK_TASKS[i % BLINK_TASKS.length]} [done-${i + 1}]`,
      createdAt: now - i * 90000000, isCompleted: true, completedAt,
      reflection: { deadline: DEADLINES[i % DEADLINES.length], outcome: OUTCOMES[i % OUTCOMES.length], motivation: MOTIVATIONS[i % MOTIVATIONS.length] },
      type: ['wave', 'wave', 'pool', 'wave', 'pool'][i % 5], poolIds: i % 5 === 2 || i % 5 === 4 ? [`pool_${i % 20}`] : [],
    });
    reviews.push({
      taskId, date: completedAt.slice(0, 10), satisfactionRating: (i % 5) + 1, improvements: REVIEW_COMMENTS[i % REVIEW_COMMENTS.length],
    });
  }

  return { tasks, pools, pods, reviews };
}


// ============================================================================
// ICONS
// ============================================================================
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
  Loader: ({ className = "w-4 h-4" }) => (<svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>),
  Brain: ({ className = "w-8 h-8" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.94"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.94"/></svg>),
  Target: ({ className = "w-8 h-8" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>),
  Layers: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>),
  Repeat: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>),
  Link: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>),
  X: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>),
  Edit: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>),
  Bold: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>),
  Italic: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>),
  List: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>),
  Lightbulb: ({ className = "w-8 h-8" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>),
  RotateCcw: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>),
  Network: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="6" rx="1"/><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><path d="M12 8v4m0 0-5 4m5-4 5 4"/></svg>),
  Coffee: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>),
  Clock: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
  Calendar: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>),
  Mail: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>),
  Lock: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>),
  User: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>),
  Feather: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg>),
  Zap: ({ className = "w-8 h-8" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>),
  GitBranch: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>),
  TaskGraph: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><circle cx="12" cy="12" r="2"/><line x1="7" y1="12" x2="10" y2="12"/><line x1="14" y1="12" x2="17.3" y2="6.7"/><line x1="14" y1="12" x2="17.3" y2="17.3"/></svg>),
  Ripple: ({ className = "w-4 h-4" }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2"/><path d="M6.3 6.3a8 8 0 0 0 0 11.4"/><path d="M17.7 6.3a8 8 0 0 1 0 11.4"/><path d="M3.5 3.5a13.5 13.5 0 0 0 0 17"/><path d="M20.5 3.5a13.5 13.5 0 0 1 0 17"/></svg>),
};


// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
export default function OT2StressTestApp() {
  const { mark: debugMark, display: debugTimings } = useDebugTimer('App');
  const [page, setPage] = useState('home');
  const [guestMode, setGuestMode] = useState('freedom');
  const [newTask, setNewTask] = useState('');
  const [tasks, setTasks] = useState([]);
  const [timers, setTimers] = useState({});
  const [reviews, setReviews] = useState([]);
  const [pools, setPools] = useState([]);
  const [pods, setPods] = useState([]); // legacy structure retained for migration/back-compat
  const [podLogs, setPodLogs] = useState({}); // legacy structure retained for migration/back-compat
  const [recurrenceLogs, setRecurrenceLogs] = useState({});

  // Focus mode state
  const [focusedTaskId, setFocusedTaskId] = useState(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardAnswers, setWizardAnswers] = useState({});
  const [focusTaskType, setFocusTaskType] = useState('wave');
  const [focusPoolId, setFocusPoolId] = useState(null);
  const [focusRelationships, setFocusRelationships] = useState([]);
  const [focusTypeConfirmed, setFocusTypeConfirmed] = useState(false);
  const [focusRecurringEnabled, setFocusRecurringEnabled] = useState(false);
  const [focusRecurrence, setFocusRecurrence] = useState({
    type: 'daily', startDate: todayStr(), everyN: 1, unit: 'days',
    weekDays: [0, 1, 2, 3, 4], frequency: 3, annualMonthDay: '', trackers: []
  });
  const [focusTrackerLabel, setFocusTrackerLabel] = useState('');

  // Review state
  const [reviewTaskId, setReviewTaskId] = useState(null);
  const [satisfactionRating, setSatisfactionRating] = useState(0);
  const [improvements, setImprovements] = useState('');

  // Seed data on mount
  useEffect(() => {
    debugMark('seeding start');
    const alreadySeeded = localStorage.getItem(STORAGE_KEYS.SEEDED);
    if (!alreadySeeded) {
      const data = generateSeedData();
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(data.tasks));
      localStorage.setItem(STORAGE_KEYS.POOLS, JSON.stringify(data.pools));
      localStorage.setItem(STORAGE_KEYS.PODS, JSON.stringify(data.pods));
      localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(data.reviews));
      localStorage.setItem(STORAGE_KEYS.RECURRENCE_LOGS, JSON.stringify({}));
      localStorage.setItem(STORAGE_KEYS.SEEDED, 'true');
      setTasks(data.tasks);
      setPools(data.pools);
      setPods(data.pods);
      setReviews(data.reviews);
      setRecurrenceLogs({});
    } else {
      setTasks(JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || '[]'));
      setPools(JSON.parse(localStorage.getItem(STORAGE_KEYS.POOLS) || '[]'));
      setPods(JSON.parse(localStorage.getItem(STORAGE_KEYS.PODS) || '[]'));
      setReviews(JSON.parse(localStorage.getItem(STORAGE_KEYS.REVIEWS) || '[]'));
      setRecurrenceLogs(JSON.parse(localStorage.getItem(STORAGE_KEYS.RECURRENCE_LOGS) || '{}'));
    }
    debugMark('seeding done');
  }, []);

  // One-time migration: legacy pod data → Task Graph recurring tasks
  useEffect(() => {
    const migVersion = localStorage.getItem(STORAGE_KEYS.MIGRATION_VERSION);
    if (migVersion === '2') return; // already migrated
    debugMark('migration start');
    setTasks(prev => {
      let changed = false;
      const next = prev.map(t => {
        // Migrate old relationship types in pool relationships
        if (t.poolIds?.length && t.type === 'pool') {
          // nothing to change on task itself
        }
        // Migrate pod tasks → pool tasks with recurrence
        if (t.type === 'pod' && t.podId) {
          changed = true;
          const pod = pods.find(p => p.id === t.podId);
          return {
            ...t,
            type: 'pool',
            poolIds: [], // pod tasks become wave tasks with recurrence
            podId: null,
            recurrenceEnabled: true,
            recurrence: pod ? migrateRecurrence(pod.recurrence || {}, '') : { type: 'daily' },
            recurrenceTrackerLabel: '',
          };
        }
        // Migrate old recurrence types
        if (t.recurrence?.type === 'every_n_days') {
          changed = true;
          return { ...t, recurrence: migrateRecurrence(t.recurrence, t.recurrenceTrackerLabel) };
        }
        return t;
      });
      if (changed) localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(next));
      return changed ? next : prev;
    });
    // Migrate pool relationship types
    setPools(prev => {
      let changed = false;
      const next = prev.map(p => {
        if (!p.relationships?.length) return p;
        const newRels = p.relationships.map(r => {
          const newType = migrateRelationshipType(r.type);
          if (newType !== r.type) { changed = true; return { ...r, type: newType }; }
          return r;
        });
        return changed ? { ...p, relationships: newRels } : p;
      });
      if (changed) localStorage.setItem(STORAGE_KEYS.POOLS, JSON.stringify(next));
      return changed ? next : prev;
    });
    localStorage.setItem(STORAGE_KEYS.MIGRATION_VERSION, '2');
    debugMark('migration done');
  }, []);

  // Derived lists
  const pendingTasks = useMemo(() => tasks.filter(t => !t.isCompleted), [tasks]);
  const completedTasks = useMemo(() => tasks.filter(t => t.isCompleted), [tasks]);
  const freedomTasks = useMemo(() => pendingTasks.filter(t => !t.reflection || !Object.values(t.reflection).some(v => v && String(v).trim())), [pendingTasks]);
  const workTasks = useMemo(() => pendingTasks.filter(t => t.reflection && Object.values(t.reflection).some(v => v && String(v).trim())), [pendingTasks]);

  // Persist changes
  useEffect(() => { if (tasks.length) localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { if (pools.length) localStorage.setItem(STORAGE_KEYS.POOLS, JSON.stringify(pools)); }, [pools]);
  useEffect(() => { if (pods.length) localStorage.setItem(STORAGE_KEYS.PODS, JSON.stringify(pods)); }, [pods]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.RECURRENCE_LOGS, JSON.stringify(recurrenceLogs)); }, [recurrenceLogs]);
  useEffect(() => { if (reviews.length) localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews)); }, [reviews]);

  // Task operations
  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks(prev => [{ id: uid(), content: newTask.trim(), createdAt: Date.now(), isCompleted: false, reflection: null, type: 'wave', poolIds: [] }, ...prev]);
    setNewTask('');
  };

  const updateTaskContent = (taskId, newContent) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, content: newContent } : t));
  };

  const deleteTask = (id) => setTasks(prev => prev.filter(t => t.id !== id));

  const completeTask = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, isCompleted: true, completedAt: new Date().toISOString() } : t));
    setReviewTaskId(id);
    setSatisfactionRating(0);
    setImprovements('');
  };

  const reactivateTask = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, isCompleted: false, completedAt: null } : t));
  };

  // Derived: focused task object from ID
  const focusedTask = focusedTaskId ? tasks.find(t => t.id === focusedTaskId) : null;

  // Focus mode
  const startFocus = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    setFocusedTaskId(taskId);
    setWizardStep(0);
    setWizardAnswers(task.reflection || {});
    setFocusTaskType(task.type || 'wave');
    setFocusPoolId(task.poolIds?.[0] || null);
    setFocusRelationships([]);
    setFocusTypeConfirmed(!!task.type && task.type !== 'wave');
    setFocusRecurringEnabled(task.recurrenceEnabled || false);
    setFocusRecurrence(task.recurrence || { type: 'daily', startDate: todayStr(), everyN: 1, unit: 'days', weekDays: [0, 1, 2, 3, 4], frequency: 3, annualMonthDay: '', trackers: [] });
    setFocusTrackerLabel(task.recurrenceTrackerLabel || '');
    setGuestMode('focus');
  };

  const confirmFocusType = () => setFocusTypeConfirmed(true);

  const finishFocus = () => {
    if (!focusedTaskId) return;
    const taskId = focusedTaskId;
    setTasks(prev => prev.map(t => t.id === taskId ? {
      ...t, reflection: { ...t.reflection, ...wizardAnswers },
      type: focusTaskType,
      poolIds: focusTaskType === 'pool' && focusPoolId ? [focusPoolId] : [],
      recurrenceEnabled: focusTaskType === 'pool' && focusRecurringEnabled,
      recurrence: focusTaskType === 'pool' && focusRecurringEnabled ? focusRecurrence : null,
      recurrenceTrackerLabel: focusTaskType === 'pool' && focusRecurringEnabled ? focusTrackerLabel : '',
    } : t));
    // Add relationships to pool
    if (focusTaskType === 'pool' && focusPoolId && focusRelationships.length > 0) {
      setPools(prev => prev.map(p => p.id === focusPoolId ? {
        ...p, relationships: [...(p.relationships || []), ...focusRelationships.map(r => ({ ...r, fromTaskId: taskId }))]
      } : p));
    }
    setFocusedTaskId(null);
    setGuestMode('work');
  };

  const skipTask = () => {
    const idx = freedomTasks.findIndex(t => t.id === focusedTaskId);
    const next = freedomTasks[idx + 1] || freedomTasks[0];
    if (next) startFocus(next.id);
    else { setFocusedTaskId(null); setGuestMode('freedom'); }
  };

  // Recurrence log helpers
  const recurrenceLogKey = (taskId, date) => `${taskId}_${date}`;
  const getRecurrenceLog = (taskId, date) => recurrenceLogs[recurrenceLogKey(taskId, date)] || { status: 'planned', trackerValues: {} };
  const setRecurrenceLog = (taskId, date, data) => {
    setRecurrenceLogs(prev => ({ ...prev, [recurrenceLogKey(taskId, date)]: { ...getRecurrenceLog(taskId, date), ...data } }));
  };

  // Pool/Pod creation
  const createPool = (name) => {
    const pool = { id: uid(), name: typeof name === 'string' ? name : name.name, createdAt: Date.now(), completionDate: null, relationships: [] };
    setPools(prev => [...prev, pool]);
    return pool;
  };

  const createPod = (config) => {
    const pod = { id: uid(), createdAt: Date.now(), ...config };
    setPods(prev => [...prev, pod]);
    return pod;
  };

  // Timer operations
  const isTimerRunning = (taskId) => timers[taskId]?.running || false;
  const isTimerPaused = (taskId) => timers[taskId]?.paused || false;

  const getElapsedSeconds = (taskId) => {
    const t = timers[taskId];
    if (!t) return 0;
    if (t.running) return Math.floor((Date.now() - t.startTime) / 1000) + (t.accumulated || 0);
    return t.accumulated || 0;
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startTimer = (taskId) => {
    setTimers(prev => ({
      ...prev, [taskId]: { ...prev[taskId], running: true, paused: false, startTime: Date.now(), accumulated: prev[taskId]?.accumulated || 0 }
    }));
  };

  const pauseTimer = (taskId) => {
    setTimers(prev => {
      const t = prev[taskId];
      if (!t?.running) return prev;
      return { ...prev, [taskId]: { ...t, running: false, paused: true, accumulated: Math.floor((Date.now() - t.startTime) / 1000) + (t.accumulated || 0) } };
    });
  };

  const stopTimer = (taskId) => {
    setTimers(prev => ({ ...prev, [taskId]: { running: false, paused: false, startTime: null, accumulated: 0 } }));
  };

  // Review
  const submitReview = () => {
    if (!reviewTaskId || satisfactionRating === 0) return;
    setReviews(prev => [...prev, { taskId: reviewTaskId, date: todayStr(), satisfactionRating, improvements }]);
    setReviewTaskId(null);
    setSatisfactionRating(0);
    setImprovements('');
  };

  const skipReview = () => {
    setReviewTaskId(null);
    setSatisfactionRating(0);
    setImprovements('');
  };

  const updateReview = (taskId, rating, text) => {
    setReviews(prev => prev.map(r => r.taskId === taskId ? { ...r, satisfactionRating: rating, improvements: text } : r));
  };

  // Stats
  const getStats = () => ({
    totalCompleted: completedTasks.length,
    avgSatisfaction: reviews.length ? reviews.reduce((sum, r) => sum + r.satisfactionRating, 0) / reviews.length : 0,
    reviewCount: reviews.length,
    pendingCount: pendingTasks.length,
  });

  // Reset seed data
  const resetSeedData = () => {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    window.location.reload();
  };

  const taskCounts = {
    freedom: freedomTasks.length,
    work: workTasks.length,
    completed: completedTasks.length,
    total: tasks.length,
  };

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <Icons.Hourglass className="w-6 h-6" />
            <span style={styles.logoText}>OT<sup style={styles.sup}>2</sup></span>
            <span style={styles.stressLabel}>STRESS TEST</span>
          </div>
          <button style={styles.resetBtn} onClick={resetSeedData}>🔄 Reset Data</button>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.guestSection}>
          <div style={styles.guestCard}>
            {/* Mode Nav */}
            <div style={styles.modeNav}>
              <ModeButton active={guestMode === 'freedom'} onClick={() => setGuestMode('freedom')} icon={<Icons.Sparkles className="w-4 h-4" />} label={`Freedom (${taskCounts.freedom})`} />
              <ModeButton active={guestMode === 'focus'} onClick={() => freedomTasks.length > 0 && startFocus(freedomTasks[0].id)} disabled={freedomTasks.length === 0} icon={<Icons.Hourglass className="w-4 h-4" />} label="Focus" />
              <ModeButton active={guestMode === 'work'} onClick={() => setGuestMode('work')} icon={<Icons.Briefcase />} label={`Work (${taskCounts.work})`} />
              <ModeButton active={guestMode === 'review'} onClick={() => setGuestMode('review')} icon={<Icons.BarChart />} label={`Review (${taskCounts.completed})`} />
            </div>

            {guestMode === 'freedom' && (
              <FreedomMode
                newTask={newTask} setNewTask={setNewTask} onAddTask={addTask}
                pendingTasks={freedomTasks} allPendingCount={pendingTasks.length}
                completedTasks={completedTasks}
                onDeleteTask={deleteTask} onStartFocus={startFocus}
              />
            )}

            {guestMode === 'focus' && focusedTask && (
              <FocusMode
                task={focusedTask} pendingTasks={freedomTasks}
                wizardStep={wizardStep} setWizardStep={setWizardStep}
                wizardAnswers={wizardAnswers} setWizardAnswers={setWizardAnswers}
                focusTaskType={focusTaskType} setFocusTaskType={setFocusTaskType}
                focusPoolId={focusPoolId} setFocusPoolId={setFocusPoolId}
                focusRelationships={focusRelationships} setFocusRelationships={setFocusRelationships}
                focusTypeConfirmed={focusTypeConfirmed} onConfirmType={confirmFocusType}
                focusRecurringEnabled={focusRecurringEnabled} setFocusRecurringEnabled={setFocusRecurringEnabled}
                focusRecurrence={focusRecurrence} setFocusRecurrence={setFocusRecurrence}
                focusTrackerLabel={focusTrackerLabel} setFocusTrackerLabel={setFocusTrackerLabel}
                pools={pools} tasks={tasks}
                onCreatePool={createPool}
                onUpdateTask={updateTaskContent}
                onFinish={finishFocus} onSkipTask={skipTask}
              />
            )}

            {guestMode === 'focus' && !focusedTask && (
              <EmptyState icon={<Icons.Hourglass className="w-8 h-8" />} message="Add a task in Freedom mode to start focusing" action={{ label: 'Go to Freedom Mode', onClick: () => setGuestMode('freedom') }} />
            )}

            {guestMode === 'work' && (
              <WorkMode
                pendingTasks={workTasks} completedTasks={completedTasks}
                timers={timers} getElapsedSeconds={getElapsedSeconds} formatTimer={formatTimer}
                isTimerRunning={isTimerRunning} isTimerPaused={isTimerPaused}
                onStartTimer={startTimer} onPauseTimer={pauseTimer} onStopTimer={stopTimer}
                onCompleteTask={completeTask} onStartFocus={startFocus}
                reviewTaskId={reviewTaskId} tasks={tasks}
                satisfactionRating={satisfactionRating} setSatisfactionRating={setSatisfactionRating}
                improvements={improvements} setImprovements={setImprovements}
                onSubmitReview={submitReview} onSkipReview={skipReview}
                onGoToFreedom={() => setGuestMode('freedom')}
                pools={pools}
                recurrenceLogs={recurrenceLogs} getRecurrenceLog={getRecurrenceLog} setRecurrenceLog={setRecurrenceLog}
              />
            )}

            {guestMode === 'review' && (
              <ReviewMode
                stats={getStats()} reviews={reviews} tasks={tasks}
                completedTasks={completedTasks}
                onReactivateTask={reactivateTask}
                onUpdateReview={updateReview}
              />
            )}
          </div>
        </section>
      </main>

      <DebugOverlay label={guestMode.toUpperCase()} timings={debugTimings} taskCount={taskCounts.total} extra={`Freedom:${taskCounts.freedom} Work:${taskCounts.work} Done:${taskCounts.completed}`} />
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
// FREEDOM MODE - Updated with Rich Text and Highlighted Focus Button
// ============================================================================
function FreedomMode({ newTask, setNewTask, onAddTask, pendingTasks, allPendingCount, completedTasks, onDeleteTask, onStartFocus }) {
  const { mark, display } = useDebugTimer('Freedom');
  const textareaRef = useRef(null);
  const qualifiedCount = (allPendingCount || 0) - pendingTasks.length;

  useEffect(() => { mark('rendered'); }, [pendingTasks.length]);

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onAddTask();
    }
  };

  const applyFormat = (format) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = newTask.substring(start, end);
    let formattedText = '';
    switch (format) {
      case 'bold': formattedText = `**${selectedText}**`; break;
      case 'italic': formattedText = `*${selectedText}*`; break;
      case 'list': formattedText = `\n• ${selectedText}`; break;
      default: return;
    }
    const newText = newTask.substring(0, start) + formattedText + newTask.substring(end);
    setNewTask(newText);
  };

  return (
    <div>
      <div style={styles.richTextContainer}>
        <div style={styles.richTextToolbar}>
          <button style={styles.formatBtn} onClick={() => applyFormat('bold')} title="Bold"><Icons.Bold className="w-4 h-4" /></button>
          <button style={styles.formatBtn} onClick={() => applyFormat('italic')} title="Italic"><Icons.Italic className="w-4 h-4" /></button>
          <button style={styles.formatBtn} onClick={() => applyFormat('list')} title="Bullet"><Icons.List className="w-4 h-4" /></button>
          <span style={styles.formatHint}>Cmd/Ctrl+Enter to add</span>
        </div>
        <textarea 
          ref={textareaRef}
          placeholder="What's on your mind? Add notes, tasks, thoughts..." 
          value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={handleKeyDown} 
          style={styles.richTextArea} rows={3}
        />
        <button style={styles.addTaskBtn} onClick={onAddTask}><Icons.Plus className="w-4 h-4" /> Add Task</button>
      </div>
      
      <p style={styles.focusHint}>
        <Icons.Lightbulb className="w-4 h-4" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
        After adding tasks, click the <strong>Focus</strong> button to visualize and qualify the work
      </p>
      
      {qualifiedCount > 0 && (
        <div style={{ fontSize: 12, color: '#10B981', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 7, padding: '5px 12px', marginBottom: 10 }}>
          ✓ {qualifiedCount} task{qualifiedCount !== 1 ? 's' : ''} moved to Work Mode after Focus
        </div>
      )}
      
      <div style={styles.taskArea}>
        {pendingTasks.length === 0 ? (
          <EmptyState icon={<Icons.Sparkles />} message="Add your first task to get started" />
        ) : (
          <div style={styles.taskList}>
            {pendingTasks.slice(0, 50).map(task => (
              <div key={task.id} style={styles.taskItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  {task.type !== 'wave' && task.poolIds?.length > 0 && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, backgroundColor: '#6366F115', color: '#6366F1', fontWeight: 600 }}>⧉ Graph</span>}
                  {task.recurrenceEnabled && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, backgroundColor: '#0EA5E915', color: '#0EA5E9', fontWeight: 600 }}>〜 Recurring</span>}
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
            {pendingTasks.length > 50 && <p style={{ color: '#71717A', fontSize: 12, textAlign: 'center', padding: 12 }}>... and {pendingTasks.length - 50} more tasks</p>}
          </div>
        )}
      </div>
      <DebugOverlay label="FREEDOM" timings={display} taskCount={pendingTasks.length} />
    </div>
  );
}

// ============================================================================
// POOL COMBOBOX - Updated with inline Create button
// ============================================================================
function PoolComboBox({ pools, onSelect, onCreatePool, selectedPoolId, inputRef }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

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

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={styles.comboInputRow}>
        <div style={{ ...styles.comboInput, flex: 1 }} onClick={() => setOpen(true)}>
          {open ? (
            <input ref={inputRef} autoFocus type="text" placeholder="Search or type new Task Graph name…" value={search} onChange={e => setSearch(e.target.value)} style={styles.comboSearchInput} onClick={e => e.stopPropagation()} />
          ) : selected ? (
            <span style={{ color: '#18181B', fontWeight: 500 }}>⧉ {selected.name}</span>
          ) : (
            <span style={{ color: '#A1A1AA' }}>Search or create a Task Graph…</span>
          )}
          <Icons.ChevronDown className="w-4 h-4" style={{ flexShrink: 0 }} />
        </div>
        {showCreateBtn && (
          <button style={styles.inlineCreateBtn} onClick={handleCreate}><Icons.Plus className="w-4 h-4" /> Create</button>
        )}
      </div>
      {open && (
        <div style={styles.comboDropdown}>
          {filtered.length === 0 && !showCreateBtn && <div style={{ padding: 12, color: '#A1A1AA', fontSize: 13 }}>No Task Graphs yet</div>}
          {filtered.map(p => (
            <div key={p.id} onClick={() => { onSelect(p.id); setOpen(false); setSearch(''); }} style={{ ...styles.comboOption, ...(p.id === selectedPoolId ? { backgroundColor: '#6366F110' } : {}) }}>
              <span>⧉ {p.name}</span>
              {p.id === selectedPoolId && <Icons.Check className="w-4 h-4" style={{ color: '#6366F1' }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// POOL RELATIONSHIP PANEL - Add relationships between tasks in a pool
// ============================================================================
function PoolRelationshipPanel({ poolId, pools, tasks, relationships, setRelationships }) {
  const pool = pools.find(p => p.id === poolId);
  const poolTasks = tasks.filter(t => t.poolIds?.includes(poolId));
  const [relType, setRelType] = useState(RELATIONSHIP_TYPES[0].key);
  const [relTarget, setRelTarget] = useState('');

  if (!pool) return null;

  const handleAdd = () => {
    if (!relTarget) return;
    setRelationships(prev => [...prev, { toTaskId: relTarget, type: relType }]);
    setRelTarget('');
  };

  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#18181B', marginBottom: 6 }}>
        <Icons.GitBranch className="w-3.5 h-3.5" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
        Relationships in this Task Graph
      </p>
      <RelationshipListTable relationships={[...(pool.relationships || []), ...relationships]} tasks={tasks} />
      {poolTasks.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
          <select value={relType} onChange={e => setRelType(e.target.value)} style={{ ...styles.select, flex: '0 0 auto' }}>
            {RELATIONSHIP_TYPES.map(rt => <option key={rt.key} value={rt.key}>{rt.icon} {rt.label}</option>)}
          </select>
          <select value={relTarget} onChange={e => setRelTarget(e.target.value)} style={{ ...styles.select, flex: 1 }}>
            <option value="">Link to task…</option>
            {poolTasks.map(t => <option key={t.id} value={t.id}>{t.content.slice(0, 40)}</option>)}
          </select>
          <button style={styles.ghostBtn} onClick={handleAdd} disabled={!relTarget}><Icons.Link className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// RELATIONSHIP LIST TABLE - Display relationships in a compact table
// ============================================================================
function RelationshipListTable({ relationships, tasks }) {
  if (!relationships?.length) return <p style={{ fontSize: 12, color: '#A1A1AA', fontStyle: 'italic' }}>No relationships yet</p>;
  return (
    <div style={{ fontSize: 12, maxHeight: 120, overflowY: 'auto' }}>
      {relationships.map((r, i) => {
        const rt = RELATIONSHIP_TYPES.find(t => t.key === r.type) || RELATIONSHIP_TYPES[0];
        const toTask = tasks.find(t => t.id === r.toTaskId);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', borderBottom: '1px solid #F4F4F5' }}>
            <span style={{ color: rt.color, fontWeight: 600 }}>{rt.icon}</span>
            <span style={{ color: '#71717A' }}>{rt.label}</span>
            <span style={{ color: '#18181B', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{toTask?.content?.slice(0, 30) || r.toTaskId}</span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// DONE CARD - Shown after completing focus qualification
// ============================================================================
function DoneCard({ task, reflection, poolName, recurrenceLabel, onDone, onSkip }) {
  return (
    <div style={styles.wizardCard}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#10B98115', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <Icons.Check className="w-8 h-8" style={{ color: '#10B981' }} />
        </div>
        <h4 style={{ fontSize: 18, fontWeight: 700, color: '#18181B' }}>Task Qualified!</h4>
        <p style={{ fontSize: 13, color: '#71717A', marginTop: 4 }}>Ready for your work session</p>
      </div>
      {/* Info strip */}
      <div style={{ backgroundColor: '#F4F4F5', borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 12 }}>
        {poolName && <div style={{ marginBottom: 4 }}><span style={{ color: '#6366F1', fontWeight: 600 }}>⧉ {poolName}</span></div>}
        {recurrenceLabel && <div style={{ marginBottom: 4 }}><span style={{ color: '#0EA5E9', fontWeight: 600 }}>〜 {recurrenceLabel}</span></div>}
        {reflection?.deadline && <div><span style={{ color: '#71717A' }}>When:</span> {reflection.deadline}</div>}
        {reflection?.outcome && <div><span style={{ color: '#71717A' }}>Outcome:</span> {reflection.outcome}</div>}
        {reflection?.motivation && <div><span style={{ color: '#71717A' }}>Why:</span> {reflection.motivation}</div>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={styles.primaryBtn} onClick={onDone}>Done — Go to Work Mode</button>
        <button style={styles.ghostBtn} onClick={onSkip}>Focus on Next Task</button>
      </div>
    </div>
  );
}


// ============================================================================
// FOCUS MODE - v3 parity with AI coaching, title editing, recurring in Task Graph
// ============================================================================
function FocusMode({
  task, pendingTasks, wizardStep, setWizardStep, wizardAnswers, setWizardAnswers,
  focusTaskType, setFocusTaskType, focusPoolId, setFocusPoolId,
  focusRelationships, setFocusRelationships,
  focusTypeConfirmed, onConfirmType,
  focusRecurringEnabled, setFocusRecurringEnabled,
  focusRecurrence, setFocusRecurrence,
  focusTrackerLabel, setFocusTrackerLabel,
  pools, tasks, onCreatePool, onUpdateTask,
  onFinish, onSkipTask,
}) {
  const { mark, display } = useDebugTimer('Focus');
  const [coachingResult, setCoachingResult] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.content);
  const poolInputRef = useRef(null);

  useEffect(() => { mark('rendered'); }, [wizardStep]);

  // Generate AI coaching questions on mount
  useEffect(() => {
    if (focusTypeConfirmed && !coachingResult) {
      const result = AICoachingService.generateQuestions(task.content, task.reflection || {});
      setCoachingResult(result);
    }
  }, [focusTypeConfirmed]);

  const questions = coachingResult?.questions || FALLBACK_QUESTIONS;
  const totalQuestions = questions.length;
  const currentQuestion = questions[wizardStep];

  const saveTitle = () => {
    if (titleDraft.trim() && titleDraft !== task.content && onUpdateTask) {
      onUpdateTask(task.id, titleDraft.trim());
    }
    setEditingTitle(false);
  };

  const poolName = focusPoolId ? pools.find(p => p.id === focusPoolId)?.name : null;
  const recurrenceLabel = focusRecurringEnabled ? recurrenceSummaryLine({ recurrence: focusRecurrence, recurrenceTrackerLabel: focusTrackerLabel }) : null;

  return (
    <div style={styles.focusMode}>
      <DebugOverlay label="FOCUS" timings={display} taskCount={1} />
      
      {pendingTasks.length > 1 && (
        <div style={styles.progressDots}>
          {pendingTasks.slice(0, 20).map(t => (
            <div key={t.id} style={{ ...styles.dot, ...(t.id === task.id ? styles.dotActive : {}) }} />
          ))}
          {pendingTasks.length > 20 && (
            <span style={{ fontSize: 11, color: '#A1A1AA', alignSelf: 'center', marginLeft: 4 }}>+{pendingTasks.length - 20}</span>
          )}
        </div>
      )}

      <div style={styles.focusHeader}>
        <p style={styles.focusLabel}>Currently focusing on:</p>
        {editingTitle ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input value={titleDraft} onChange={e => setTitleDraft(e.target.value)} style={{ ...styles.textarea, minHeight: 36, padding: '6px 10px' }} autoFocus onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }} />
            <button style={styles.ghostBtn} onClick={saveTitle}><Icons.Check className="w-4 h-4" /></button>
            <button style={styles.ghostBtn} onClick={() => setEditingTitle(false)}><Icons.X className="w-4 h-4" /></button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <h3 style={styles.focusTask}>{task.content}</h3>
            <button style={{ ...styles.ghostBtn, padding: '2px 6px' }} onClick={() => { setTitleDraft(task.content); setEditingTitle(true); }} title="Edit title"><Icons.Edit className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>

      {/* Info strip */}
      {focusTypeConfirmed && (poolName || recurrenceLabel) && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {poolName && <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, backgroundColor: '#6366F115', color: '#6366F1', fontWeight: 600 }}>⧉ {poolName}</span>}
          {recurrenceLabel && <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, backgroundColor: '#0EA5E915', color: '#0EA5E9', fontWeight: 600 }}>〜 {recurrenceLabel}</span>}
        </div>
      )}

      {!focusTypeConfirmed ? (
        <div style={styles.wizardCard}>
          <p style={{ fontSize: 13, color: '#71717A', marginBottom: 6 }}>Where does this task live?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {[
              { key: 'wave', label: '⚡ Wave', desc: 'Standalone note / quick task', color: '#10B981' },
              { key: 'pool', label: '⧉ Task Graph', desc: 'Part of a project with relationships & recurring', color: '#6366F1' },
            ].map(opt => (
              <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `2px solid ${focusTaskType === opt.key ? opt.color : '#E4E4E7'}`, cursor: 'pointer', backgroundColor: focusTaskType === opt.key ? `${opt.color}10` : 'white' }}>
                <input type="radio" name="taskType" value={opt.key} checked={focusTaskType === opt.key} onChange={() => setFocusTaskType(opt.key)} style={{ accentColor: opt.color }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: focusTaskType === opt.key ? opt.color : '#18181B' }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: '#71717A' }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>

          {focusTaskType === 'pool' && (
            <div style={{ marginBottom: 16 }}>
              <label style={styles.label}>Select or create a Task Graph</label>
              <PoolComboBox pools={pools} onSelect={setFocusPoolId} onCreatePool={onCreatePool} selectedPoolId={focusPoolId} inputRef={poolInputRef} />

              {/* Recurring toggle inside Task Graph */}
              <div style={{ marginTop: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={focusRecurringEnabled} onChange={e => setFocusRecurringEnabled(e.target.checked)} style={{ accentColor: '#0EA5E9' }} />
                  <Icons.Ripple className="w-3.5 h-3.5" style={{ color: '#0EA5E9' }} />
                  <span style={{ fontWeight: 500 }}>This task repeats</span>
                </label>
                {focusRecurringEnabled && (
                  <div style={{ marginTop: 8, padding: 10, backgroundColor: '#F0F9FF', borderRadius: 8, border: '1px solid #BAE6FD' }}>
                    <select value={focusRecurrence.type} onChange={e => setFocusRecurrence(prev => ({ ...prev, type: e.target.value }))} style={styles.select}>
                      {RECURRENCE_TYPES.map(rt => <option key={rt.key} value={rt.key}>{rt.label}</option>)}
                    </select>
                    {focusRecurrence.type === 'specific_days' && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                        {WEEK_DAYS_SHORT.map((d, i) => (
                          <button key={i} onClick={() => setFocusRecurrence(prev => ({ ...prev, weekDays: prev.weekDays?.includes(i) ? prev.weekDays.filter(x => x !== i) : [...(prev.weekDays || []), i].sort() }))} style={{ width: 28, height: 28, borderRadius: 6, border: `1.5px solid ${focusRecurrence.weekDays?.includes(i) ? '#0EA5E9' : '#E4E4E7'}`, backgroundColor: focusRecurrence.weekDays?.includes(i) ? '#0EA5E920' : 'white', fontSize: 11, fontWeight: 600, color: focusRecurrence.weekDays?.includes(i) ? '#0EA5E9' : '#71717A', cursor: 'pointer' }}>{d}</button>
                        ))}
                      </div>
                    )}
                    {focusRecurrence.type === 'every_n' && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#71717A' }}>Every</span>
                        <input type="number" min={1} value={focusRecurrence.everyN || 1} onChange={e => setFocusRecurrence(prev => ({ ...prev, everyN: parseInt(e.target.value) || 1 }))} style={{ ...styles.select, width: 50 }} />
                        <select value={focusRecurrence.unit || 'days'} onChange={e => setFocusRecurrence(prev => ({ ...prev, unit: e.target.value }))} style={styles.select}>
                          <option value="days">days</option>
                          <option value="weeks">weeks</option>
                        </select>
                      </div>
                    )}
                    {focusRecurrence.type === 'monthly_frequency' && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#71717A' }}>×</span>
                        <input type="number" min={1} max={31} value={focusRecurrence.frequency || 3} onChange={e => setFocusRecurrence(prev => ({ ...prev, frequency: parseInt(e.target.value) || 3 }))} style={{ ...styles.select, width: 50 }} />
                        <span style={{ fontSize: 12, color: '#71717A' }}>times per month</span>
                      </div>
                    )}
                    {focusRecurrence.type === 'annual' && (
                      <input type="text" placeholder="MM-DD (e.g. 03-22)" value={focusRecurrence.annualMonthDay || ''} onChange={e => setFocusRecurrence(prev => ({ ...prev, annualMonthDay: e.target.value }))} style={{ ...styles.select, marginTop: 6, width: '100%' }} />
                    )}
                    <div style={{ marginTop: 8 }}>
                      <input type="text" placeholder="Tracker label (e.g. Kms Run, Pages Read)" value={focusTrackerLabel} onChange={e => setFocusTrackerLabel(e.target.value)} style={{ ...styles.select, width: '100%' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Relationship panel */}
              {focusPoolId && (
                <PoolRelationshipPanel poolId={focusPoolId} pools={pools} tasks={tasks} relationships={focusRelationships} setRelationships={setFocusRelationships} />
              )}
            </div>
          )}

          <button style={styles.primaryBtn} onClick={onConfirmType} disabled={focusTaskType === 'pool' && !focusPoolId}>
            Continue <Icons.ChevronRight />
          </button>
        </div>
      ) : wizardStep < totalQuestions && currentQuestion ? (
        <div style={styles.wizardCard}>
          <div style={styles.questionHeader}>
            <p style={styles.wizardProgress}>Question {wizardStep + 1} of {totalQuestions}</p>
            {coachingResult?.analysis?.taskWellDefined && <span style={{ fontSize: 11, color: '#10B981', backgroundColor: '#F0FDF4', padding: '2px 6px', borderRadius: 4 }}>✓ Well defined</span>}
          </div>
          <h4 style={styles.wizardQuestion}>{currentQuestion.question}</h4>
          <textarea
            placeholder={currentQuestion.placeholder}
            value={wizardAnswers[currentQuestion.key] || ''}
            onChange={e => setWizardAnswers(p => ({ ...p, [currentQuestion.key]: e.target.value }))}
            style={styles.textarea}
            autoFocus
          />
          <div style={styles.wizardActions}>
            <button style={styles.ghostBtn} onClick={() => setWizardStep(s => Math.max(0, s - 1))} disabled={wizardStep === 0}><Icons.ArrowLeft />Back</button>
            <div style={styles.wizardRightActions}>
              <button style={styles.ghostBtn} onClick={() => setWizardStep(s => s + 1)}>Skip</button>
              <button style={styles.primaryBtn} onClick={() => setWizardStep(s => s + 1)}>{wizardStep === totalQuestions - 1 ? 'Finish' : 'Next'}<Icons.ChevronRight /></button>
            </div>
          </div>
        </div>
      ) : (
        <DoneCard
          task={task}
          reflection={wizardAnswers}
          poolName={poolName}
          recurrenceLabel={recurrenceLabel}
          onDone={onFinish}
          onSkip={onSkipTask}
        />
      )}

      {onSkipTask && (
        <div style={styles.skipSection}><button style={styles.linkBtn} onClick={onSkipTask}>Skip this task for now</button></div>
      )}
    </div>
  );
}


// ============================================================================
// WORK MODE - Updated with List Waves view and new features
// ============================================================================
function WorkMode({
  pendingTasks, completedTasks, timers, getElapsedSeconds, formatTimer,
  isTimerRunning, isTimerPaused, onStartTimer, onPauseTimer, onStopTimer, onCompleteTask,
  onStartFocus, reviewTaskId, tasks, satisfactionRating, setSatisfactionRating,
  improvements, setImprovements, onSubmitReview, onSkipReview, onGoToFreedom,
  pools, recurrenceLogs, getRecurrenceLog, setRecurrenceLog,
}) {
  const { mark, display } = useDebugTimer('Work');
  const [contextFilter, setContextFilter] = useState('waves');
  const [strategyView, setStrategyView] = useState('list');
  const [poolStrategyView, setPoolStrategyView] = useState('list');
  const [selectedPoolId, setSelectedPoolId] = useState(null);
  const [showRelationshipGraph, setShowRelationshipGraph] = useState(false);
  const reviewTask = tasks.find(t => t.id === reviewTaskId);

  const waveTasks = pendingTasks.filter(t => !(t.poolIds?.length) && !t.recurrenceEnabled);
  const rippleTasks = pendingTasks.filter(t => t.recurrenceEnabled);

  useEffect(() => { mark('rendered'); }, [pendingTasks.length, contextFilter, strategyView]);

  const getPoolName = (task) => {
    if (!task.poolIds?.length) return null;
    const pool = pools.find(p => p.id === task.poolIds[0]);
    return pool?.name;
  };

  const getTaskRelationships = (task) => {
    if (!task.poolIds?.length) return [];
    const pool = pools.find(p => p.id === task.poolIds[0]);
    if (!pool?.relationships) return [];
    return pool.relationships.filter(r => r.fromTaskId === task.id || r.toTaskId === task.id);
  };

  const categorizeByDeadline = (task) => {
    const deadline = task.reflection?.deadline?.toLowerCase() || '';
    if (!deadline || deadline === '-') return 'notplanned';
    if (/\b(today|tonight|now|asap|urgent)\b/.test(deadline)) return 'today';
    if (/\b(tomorrow|next|week|month|later|soon|eventually)\b/.test(deadline)) return 'future';
    if (/\b(yesterday|overdue|late|missed|past|ago)\b/.test(deadline)) return 'missed';
    return 'notplanned';
  };

  const scoreTask = (task) => {
    const text = ((task.content || '') + ' ' + (task.reflection?.deadline || '') + ' ' + (task.reflection?.motivation || '') + ' ' + (task.reflection?.complexity || '')).toLowerCase();
    let score = 0;
    if (/complex|difficult|challenging|research|design|build|create|architect|strategic|analysis|write|plan/.test(text)) score += 3;
    if (/deep|focus|hard|major|important|critical|key|vital|crucial/.test(text)) score += 2;
    if (/urgent|asap|today|deadline|must|required|client|boss|team|meeting|blocking/.test(text)) score += 1;
    if (/quick|simple|easy|minor|small|brief|short|just|routine|admin/.test(text)) score -= 2;
    return score;
  };

  const classifyTask = (task) => {
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
    return 'q1';
  };

  const TaskCard = ({ task, compact = false }) => {
    const elapsed = getElapsedSeconds(task.id);
    const running = isTimerRunning(task.id);
    const paused = isTimerPaused(task.id);
    const poolName = getPoolName(task);
    const relationships = getTaskRelationships(task);
    
    const getReasonToDo = () => {
      if (!task.reflection) return null;
      const answers = [];
      if (task.reflection.deadline) answers.push({ key: 'Deadline', value: task.reflection.deadline });
      if (task.reflection.outcome) answers.push({ key: 'Outcome', value: task.reflection.outcome });
      if (task.reflection.motivation) answers.push({ key: 'Motivation', value: task.reflection.motivation });
      if (task.reflection.complexity) answers.push({ key: 'Complexity', value: task.reflection.complexity });
      return answers;
    };
    
    const reasons = getReasonToDo();

    return (
      <div style={styles.workTaskCard}>
        <div style={styles.workTaskHeader}>
          <button style={styles.checkbox} onClick={() => onCompleteTask(task.id)} />
          <div style={{ flex: 1 }}>
            <span style={styles.workTaskTitle} onClick={() => onStartFocus(task.id)} title="Click to focus">{task.content}</span>
            <div style={styles.taskMetaRow}>
              {task.type === 'pool' && poolName && <span style={styles.poolBadge}>⧉ {poolName}</span>}
              {task.recurrenceEnabled && <span style={styles.podBadge}>〜 {recurrenceSummaryLine(task)}</span>}
              {(!task.type || task.type === 'wave') && !task.recurrenceEnabled && <span style={styles.waveBadge}>⚡ Wave</span>}
            </div>
          </div>
        </div>
        
        {!compact && reasons && reasons.length > 0 && (
          <div style={styles.reasonToDoSection}>
            <p style={styles.reasonToDoTitle}>Reason to do:</p>
            <ul style={styles.reasonToDoList}>
              {reasons.map((r, idx) => (
                <li key={idx} style={styles.reasonToDoItem}><strong>{r.key}:</strong> {r.value}</li>
              ))}
            </ul>
          </div>
        )}
        
        {relationships.length > 0 && (
          <div style={styles.relationshipsSection}>
            {relationships.map((rel, idx) => {
              const rt = RELATIONSHIP_TYPES.find(x => x.key === rel.type);
              const otherTaskId = rel.fromTaskId === task.id ? rel.toTaskId : rel.fromTaskId;
              const otherTask = tasks.find(t => t.id === otherTaskId);
              return (
                <span key={idx} style={{ ...styles.relationshipTag, backgroundColor: `${rt?.color}15`, color: rt?.color }} onClick={() => onStartFocus(otherTaskId)} title="Click to navigate">
                  {rt?.icon} {rt?.label}: {otherTask?.content?.substring(0, 20)}…
                </span>
              );
            })}
          </div>
        )}
        
        <div style={styles.workTaskActions}>
          <button style={styles.focusBtnSmall} onClick={() => onStartFocus(task.id)}><Icons.Hourglass className="w-3 h-3" /> Focus</button>
          {!running && !paused && (
            <button style={styles.startWorkBtn} onClick={() => onStartTimer(task.id)}>Start Work Block</button>
          )}
          {(running || paused) && (
            <div style={styles.timerControls}>
              <span style={{ ...styles.timerDisplay, ...(running ? { color: '#FF6B6B', fontWeight: 600 } : {}) }}>{formatTimer(elapsed)}</span>
              {running && <button style={styles.pauseBtn} onClick={() => onPauseTimer(task.id)}><Icons.Pause className="w-3.5 h-3.5" /> Pause</button>}
              {paused && <button style={styles.resumeBtn} onClick={() => onStartTimer(task.id)}><Icons.Play className="w-3.5 h-3.5" /> Resume</button>}
              <button style={styles.stopBtn} onClick={() => onStopTimer(task.id)}><Icons.Square className="w-3 h-3" /> Stop</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Shared strategy renderer — accepts any task list
  const StrategyRenderer = ({ taskList, strategy, emptyMsg }) => {
    if (strategy === 'list') return (
      <div style={styles.listWavesContainer}>
        {taskList.length === 0
          ? <EmptyState icon={<Icons.Briefcase className="w-8 h-8" />} message={emptyMsg} action={{ label: 'Go to Freedom Mode', onClick: onGoToFreedom }} />
          : taskList.slice(0, 50).map(task => <TaskCard key={task.id} task={task} />)
        }
        {taskList.length > 50 && <p style={{ color: '#71717A', fontSize: 12, textAlign: 'center', padding: 12 }}>… and {taskList.length - 50} more</p>}
      </div>
    );

    if (strategy === 'kanban') {
      const lanes = { today: { title: 'Today', color: '#FF6B6B', tasks: [] }, future: { title: 'Future', color: '#4299E1', tasks: [] }, missed: { title: 'Missed', color: '#F59E0B', tasks: [] }, notplanned: { title: 'Not Planned', color: '#A1A1AA', tasks: [] } };
      taskList.forEach(t => lanes[categorizeByDeadline(t)].tasks.push(t));
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {Object.entries(lanes).map(([key, lane]) => (
            <div key={key} style={{ backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, borderTop: `3px solid ${lane.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{lane.title}</span>
                <span style={{ fontSize: 11, backgroundColor: lane.color, color: 'white', borderRadius: 100, padding: '2px 8px' }}>{lane.tasks.length}</span>
              </div>
              {lane.tasks.slice(0, 20).map(t => <TaskCard key={t.id} task={t} compact />)}
            </div>
          ))}
        </div>
      );
    }

    if (strategy === 'dailyzen') {
      const sorted = [...taskList].sort((a, b) => scoreTask(b) - scoreTask(a));
      const deepWork = sorted.slice(0, 1), necessity = sorted.slice(1, 4), lightenUp = sorted.slice(4, 9);
      const DZSec = ({ title, emoji, color, bgColor, tasks, limit, hint }) => (
        <div style={{ backgroundColor: bgColor, borderRadius: 12, padding: 14, borderLeft: `4px solid ${color}`, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>{emoji}</span>
            <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div><div style={{ fontSize: 11, color: '#71717A' }}>{hint}</div></div>
            <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: color, color: 'white', borderRadius: 100, padding: '2px 8px' }}>{tasks.length}/{limit}</span>
          </div>
          {tasks.length === 0 ? <div style={{ fontSize: 12, color: '#A1A1AA', fontStyle: 'italic' }}>Nothing here</div> : tasks.map(t => <TaskCard key={t.id} task={t} />)}
        </div>
      );
      return (
        <>
          <div style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#92400E' }}>✨ <strong>DailyZen</strong> · 1 deep · 3 necessity · 5 lighten-up</div>
          <DZSec title="Deep Work" emoji="🧠" color="#6366F1" bgColor="#F5F3FF" tasks={deepWork} limit={1} hint="Full attention" />
          <DZSec title="Necessity" emoji="⚡" color="#F59E0B" bgColor="#FFFBEB" tasks={necessity} limit={3} hint="Must move forward" />
          <DZSec title="Lighten Up" emoji="🌊" color="#10B981" bgColor="#F0FDF4" tasks={lightenUp} limit={5} hint="Keep momentum" />
        </>
      );
    }

    if (strategy === 'workiq') {
      const quadrants = {
        q1: { tasks: [], color: '#10B981', bg: '#F0FDF4', label: 'Standard Work', sub: 'Work that I am good at', emoji: '✅' },
        q2: { tasks: [], color: '#6366F1', bg: '#F5F3FF', label: 'Mindful Work',  sub: 'Work I want to do & need support', emoji: '🧘' },
        q3: { tasks: [], color: '#0EA5E9', bg: '#F0F9FF', label: 'New Work',      sub: 'Work I can do with partners / vendors', emoji: '🤝' },
        q4: { tasks: [], color: '#EF4444', bg: '#FEF2F2', label: 'Needs Replacement', sub: 'Work I am not good at — find someone', emoji: '🔄' },
      };
      taskList.forEach(t => quadrants[classifyTask(t)].tasks.push(t));
      return (
        <>
          <div style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#0369A1' }}>🧩 <strong>WorkIQ 4×4</strong> · AI quadrant classification</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {Object.entries(quadrants).map(([qKey, q]) => (
              <div key={qKey} style={{ backgroundColor: q.bg, borderRadius: 10, padding: 12, border: `2px solid ${q.color}30`, minHeight: 160 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, borderBottom: `1px solid ${q.color}30`, paddingBottom: 6 }}>
                  <span>{q.emoji}</span>
                  <div><div style={{ fontSize: 12, fontWeight: 700, color: q.color }}>{q.label}</div><div style={{ fontSize: 10, color: '#71717A' }}>{q.sub}</div></div>
                  <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, backgroundColor: q.color, color: 'white', borderRadius: 100, padding: '1px 6px' }}>{q.tasks.length}</span>
                </div>
                {q.tasks.slice(0, 10).map(t => <TaskCard key={t.id} task={t} compact />)}
              </div>
            ))}
          </div>
        </>
      );
    }
    return null;
  };

  // Review popup
  if (reviewTask) {
    return (
      <div style={styles.reviewPopup}>
        <h3 style={styles.reviewPopupTitle}>How did it go?</h3>
        <p style={styles.reviewPopupTask}>{reviewTask.content}</p>
        <div style={styles.ratingButtons}>
          {[1, 2, 3, 4, 5].map(r => (
            <button key={r} style={{ ...styles.ratingBtn, ...(satisfactionRating === r ? styles.ratingBtnActive : {}) }} onClick={() => setSatisfactionRating(r)}>
              <Icons.Star filled={satisfactionRating >= r} />
            </button>
          ))}
        </div>
        <textarea placeholder="What could be improved?" value={improvements} onChange={e => setImprovements(e.target.value)} style={styles.textarea} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={styles.primaryBtn} onClick={onSubmitReview} disabled={satisfactionRating === 0}>Submit Review</button>
          <button style={styles.ghostBtn} onClick={onSkipReview}>Skip</button>
        </div>
      </div>
    );
  }

  // Pool context helpers
  const selectedPool = pools.find(p => p.id === selectedPoolId);
  const poolTasksForView = pendingTasks.filter(t => (t.poolIds || []).includes(selectedPoolId));

  return (
    <div>
      {/* Two-level filter header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, color: '#71717A', fontWeight: 500 }}>View</span>
        <select value={contextFilter} onChange={e => setContextFilter(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #D4D4D8', borderRadius: 8, fontSize: 14, backgroundColor: 'white' }}>
          <option value="waves">⚡ Waves</option>
          <option value="pools">⧉ Task Graphs</option>
          <option value="ripples">〜 Ripples</option>
        </select>
        {(contextFilter === 'waves' || contextFilter === 'pools') && (
          <>
            <span style={{ fontSize: 14, color: '#71717A', fontWeight: 500 }}>as</span>
            <select
              value={contextFilter === 'waves' ? strategyView : poolStrategyView}
              onChange={e => contextFilter === 'waves' ? setStrategyView(e.target.value) : setPoolStrategyView(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #D4D4D8', borderRadius: 8, fontSize: 14, backgroundColor: 'white' }}
            >
              <option value="list">List</option>
              <option value="kanban">Kanban</option>
              <option value="dailyzen">DailyZen</option>
              <option value="workiq">WorkIQ 4×4</option>
            </select>
          </>
        )}
      </div>
      <p style={{ fontSize: 13, color: '#A1A1AA', marginBottom: 16 }}>
        {contextFilter === 'waves' && `${waveTasks.length} standalone waves`}
        {contextFilter === 'pools' && 'Tasks inside a selected Task Graph'}
        {contextFilter === 'ripples' && `${rippleTasks.length} recurring tasks`}
      </p>

      {/* Waves context */}
      {contextFilter === 'waves' && (
        <StrategyRenderer taskList={waveTasks} strategy={strategyView} emptyMsg="No waves. Add tasks in Freedom mode!" />
      )}

      {/* Pools context */}
      {contextFilter === 'pools' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#71717A' }}>Task Graph:</span>
            <select value={selectedPoolId || ''} onChange={e => setSelectedPoolId(e.target.value)} style={{ ...styles.input, flex: 1, maxWidth: 300 }}>
              <option value="">— Select a Task Graph —</option>
              {pools.map(p => <option key={p.id} value={p.id}>⧉ {p.name}</option>)}
            </select>
            {selectedPool && (
              <label style={styles.toggleLabel}>
                <input type="checkbox" checked={showRelationshipGraph} onChange={e => setShowRelationshipGraph(e.target.checked)} />
                Relationship Graph
              </label>
            )}
            {selectedPool && <span style={{ fontSize: 12, color: '#71717A' }}>{poolTasksForView.length} tasks</span>}
          </div>

          {!selectedPoolId && <EmptyState icon={<Icons.TaskGraph className="w-8 h-8" />} message="Select a Task Graph to see its tasks" />}

          {selectedPool && showRelationshipGraph && (
            <RelationshipGraph poolId={selectedPoolId} pools={pools} tasks={tasks} onTaskClick={onStartFocus} />
          )}

          {selectedPool && !showRelationshipGraph && (
            <StrategyRenderer taskList={poolTasksForView} strategy={poolStrategyView} emptyMsg="No tasks in this pool yet. Use Focus Mode to add tasks." />
          )}
        </div>
      )}

      {/* Ripples context */}
      {contextFilter === 'ripples' && (
        <div>
          <div style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#0369A1' }}>
            <Icons.Ripple className="w-4 h-4" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            <strong>Ripples</strong> · Recurring tasks with daily check-ins
          </div>
          {rippleTasks.length === 0 ? (
            <EmptyState icon={<Icons.Ripple className="w-8 h-8" />} message="No recurring tasks yet. Enable recurrence in Focus Mode!" />
          ) : (
            <div style={styles.listWavesContainer}>
              {rippleTasks.slice(0, 50).map(task => (
                <RippleTaskCard key={task.id} task={task} getRecurrenceLog={getRecurrenceLog} setRecurrenceLog={setRecurrenceLog} onCompleteTask={onCompleteTask} onStartFocus={onStartFocus} />
              ))}
              {rippleTasks.length > 50 && <p style={{ color: '#71717A', fontSize: 12, textAlign: 'center', padding: 12 }}>… and {rippleTasks.length - 50} more</p>}
            </div>
          )}
        </div>
      )}

      <DebugOverlay label="WORK" timings={display} taskCount={pendingTasks.length} />
    </div>
  );
}

// ============================================================================
// RELATIONSHIP GRAPH
// ============================================================================
function RelationshipGraph({ poolId, pools, tasks, onTaskClick }) {
  const [hoveredNode, setHoveredNode] = useState(null);
  const pool = pools.find(p => p.id === poolId);
  const poolTasks = tasks.filter(t => t.poolIds?.includes(poolId) && !t.isCompleted);
  const relationships = pool?.relationships || [];

  if (poolTasks.length === 0) {
    return <EmptyState icon={<Icons.Network className="w-8 h-8" />} message="No tasks in this pool yet" />;
  }

  const width = 500, height = 300, centerX = width / 2, centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 50;

  const nodePositions = {};
  poolTasks.forEach((task, i) => {
    const angle = (i / poolTasks.length) * 2 * Math.PI - Math.PI / 2;
    nodePositions[task.id] = { x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) };
  });

  return (
    <div style={styles.graphContainer}>
      <h4 style={styles.graphTitle}>⧉ {pool?.name} — Relationship Graph</h4>
      <svg width={width} height={height} style={styles.graphSvg}>
        <defs>
          {RELATIONSHIP_TYPES.map(rt => (
            <marker key={rt.key} id={`arrow-${rt.key}`} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill={rt.color} />
            </marker>
          ))}
        </defs>
        {relationships.map((rel, idx) => {
          const from = nodePositions[rel.fromTaskId];
          const to = nodePositions[rel.toTaskId];
          if (!from || !to) return null;
          const rt = RELATIONSHIP_TYPES.find(x => x.key === rel.type);
          const dx = to.x - from.x, dy = to.y - from.y;
          const angle = Math.atan2(dy, dx);
          const arrowLen = 8;
          const endX = to.x - 32 * Math.cos(angle), endY = to.y - 32 * Math.sin(angle);
          return (
            <g key={idx}>
              <line x1={from.x} y1={from.y} x2={endX} y2={endY} stroke={rt?.color || '#D4D4D8'} strokeWidth="2" strokeDasharray={rel.type === 'pairs_with' ? '5,5' : undefined} markerEnd={`url(#arrow-${rel.type})`} />
              <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 5} textAnchor="middle" fill={rt?.color} fontSize="10" fontWeight="600">{rt?.icon}</text>
            </g>
          );
        })}
        {poolTasks.map(task => {
          const pos = nodePositions[task.id];
          const isHovered = hoveredNode === task.id;
          return (
            <g key={task.id} style={{ cursor: 'pointer' }} onClick={() => onTaskClick(task.id)} onMouseEnter={() => setHoveredNode(task.id)} onMouseLeave={() => setHoveredNode(null)}>
              <circle cx={pos.x} cy={pos.y} r={isHovered ? 35 : 28} fill={isHovered ? '#6366F1' : 'white'} stroke="#6366F1" strokeWidth="2" />
              <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" fill={isHovered ? 'white' : '#18181B'} fontSize="10" fontWeight="500">{task.content.substring(0, 12)}…</text>
            </g>
          );
        })}
      </svg>
      <p style={styles.graphHint}>Click on a node to focus on that task</p>
    </div>
  );
}


// ============================================================================
// RIPPLE TASK CARD - For recurring tasks with check-in logging
// ============================================================================
function RippleTaskCard({ task, getRecurrenceLog, setRecurrenceLog, onCompleteTask, onStartFocus }) {
  const today = todayStr();
  const log = getRecurrenceLog(task.id, today);
  const [trackerValue, setTrackerValue] = useState(log.trackerValues?.['t1'] || '');

  const statusColors = {
    planned: { bg: '#F4F4F5', border: '#E4E4E7', text: '#71717A' },
    done: { bg: '#F0FDF4', border: '#86EFAC', text: '#10B981' },
    skipped: { bg: '#FEF2F2', border: '#FECACA', text: '#EF4444' },
  };
  const colors = statusColors[log.status] || statusColors.planned;

  const handleStatusChange = (newStatus) => {
    setRecurrenceLog(task.id, today, { status: newStatus, trackerValues: { 't1': trackerValue } });
  };

  return (
    <div style={{ ...styles.workTaskCard, backgroundColor: colors.bg, borderColor: colors.border }}>
      <div style={styles.workTaskHeader}>
        <div style={{ flex: 1 }}>
          <span style={styles.workTaskTitle} onClick={() => onStartFocus(task.id)}>{task.content}</span>
          <div style={styles.taskMetaRow}>
            <span style={{ ...styles.podBadge, backgroundColor: '#0EA5E915' }}>〜 {recurrenceSummaryLine(task)}</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#71717A' }}>Today:</span>
        {['planned', 'done', 'skipped'].map(s => (
          <button key={s} onClick={() => handleStatusChange(s)} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${log.status === s ? colors.text : '#E4E4E7'}`, backgroundColor: log.status === s ? colors.text : 'white', color: log.status === s ? 'white' : '#71717A', fontSize: 12, fontWeight: 500, textTransform: 'capitalize', cursor: 'pointer' }}>{s}</button>
        ))}
        {task.recurrenceTrackerLabel && (
          <input
            type="text"
            placeholder={task.recurrenceTrackerLabel}
            value={trackerValue}
            onChange={e => { setTrackerValue(e.target.value); setRecurrenceLog(task.id, today, { trackerValues: { 't1': e.target.value } }); }}
            style={{ ...styles.select, flex: 1, minWidth: 80, padding: '4px 8px', fontSize: 12 }}
          />
        )}
        <button style={styles.focusBtnSmall} onClick={() => onStartFocus(task.id)}><Icons.Hourglass className="w-3 h-3" /></button>
        <button style={styles.checkbox} onClick={() => onCompleteTask(task.id)} title="Mark as complete for today" />
      </div>
    </div>
  );
}


// ============================================================================
// REVIEW MODE - Updated with completed tasks and editing
// ============================================================================
function ReviewMode({ stats, reviews, tasks, completedTasks, onReactivateTask, onUpdateReview }) {
  const { mark, display } = useDebugTimer('Review');
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editImprovements, setEditImprovements] = useState('');

  useEffect(() => { mark('rendered'); }, [completedTasks.length]);

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

      <div style={{ marginTop: 24 }}>
        <h4 style={styles.reviewListTitle}>Completed Tasks ({completedTasks.length})</h4>
        {completedTasks.length === 0 ? (
          <EmptyState icon={<Icons.Check className="w-8 h-8" />} message="Complete tasks to see them here" />
        ) : (
          <div style={styles.completedTasksList}>
            {completedTasks.map(task => {
              const review = getTaskReview(task.id);
              const isEditing = editingReviewId === task.id;
              const reasons = task.reflection ? Object.entries(task.reflection).filter(([k, v]) => v && String(v).trim()) : [];
              
              return (
                <div key={task.id} style={styles.completedTaskItem}>
                  <div style={styles.completedTaskHeader}>
                    <span style={styles.completedTaskName} onClick={() => onReactivateTask(task.id)} title="Click to reactivate">{task.content}</span>
                    <button style={styles.reactivateBtn} onClick={() => onReactivateTask(task.id)} title="Reactivate task">
                      <Icons.RotateCcw className="w-3.5 h-3.5" /> Reactivate
                    </button>
                  </div>
                  
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
                      {review.improvements && <p style={styles.reviewImprovementsText}>{review.improvements}</p>}
                    </div>
                  )}
                  
                  {isEditing && (
                    <div style={styles.editReviewForm}>
                      <div style={styles.ratingButtons}>
                        {[1, 2, 3, 4, 5].map(r => (
                          <button key={r} style={{ ...styles.ratingBtn, ...(editRating === r ? styles.ratingBtnActive : {}) }} onClick={() => setEditRating(r)}>
                            <Icons.Star filled={editRating >= r} />
                          </button>
                        ))}
                      </div>
                      <textarea placeholder="What could be improved?" value={editImprovements} onChange={e => setEditImprovements(e.target.value)} style={styles.textarea} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button style={styles.primaryBtn} onClick={saveEditReview}>Save</button>
                        <button style={styles.ghostBtn} onClick={() => setEditingReviewId(null)}>Cancel</button>
                      </div>
                    </div>
                  )}
                  
                  {!review && <p style={styles.noReviewText}>No review submitted</p>}
                  
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

      <DebugOverlay label="REVIEW" timings={display} taskCount={completedTasks.length} />
    </div>
  );
}


// ============================================================================
// STYLES
// ============================================================================
const styles = {
  app: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#F9FAFB', minHeight: '100vh' },
  header: { backgroundColor: 'white', borderBottom: '1px solid #E4E4E7', padding: '12px 20px', position: 'sticky', top: 0, zIndex: 100 },
  headerContent: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto' },
  logo: { display: 'flex', alignItems: 'center', gap: 8, color: '#FF6B6B', cursor: 'pointer' },
  logoText: { fontWeight: 800, fontSize: 20, color: '#18181B' },
  sup: { fontSize: 14, color: '#FF6B6B', verticalAlign: 'super' },
  stressLabel: { fontSize: 10, fontWeight: 700, backgroundColor: '#EF4444', color: 'white', padding: '2px 6px', borderRadius: 4, marginLeft: 8 },
  resetBtn: { padding: '8px 16px', backgroundColor: '#EF4444', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  main: { maxWidth: 900, margin: '0 auto', padding: '20px' },
  guestSection: { marginTop: 20 },
  guestCard: { backgroundColor: 'white', borderRadius: 16, padding: 24, border: '1px solid #E4E4E7', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' },
  
  // Mode buttons
  modeNav: { display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  modeBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', backgroundColor: '#F4F4F5', color: '#71717A', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .15s' },
  modeBtnActive: { backgroundColor: '#FF6B6B', color: 'white' },
  modeBtnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  
  // Rich Text Input
  richTextContainer: { marginBottom: 16, border: '1px solid #E4E4E7', borderRadius: 10, overflow: 'hidden' },
  richTextToolbar: { display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderBottom: '1px solid #E4E4E7', backgroundColor: '#F9FAFB' },
  formatBtn: { padding: '6px 8px', backgroundColor: 'transparent', border: '1px solid #E4E4E7', borderRadius: 4, cursor: 'pointer', color: '#52525B' },
  formatHint: { marginLeft: 'auto', fontSize: 11, color: '#A1A1AA' },
  richTextArea: { width: '100%', padding: 12, border: 'none', outline: 'none', resize: 'vertical', fontFamily: 'inherit', fontSize: 14, minHeight: 80, boxSizing: 'border-box' },
  addTaskBtn: { display: 'flex', alignItems: 'center', gap: 6, margin: '12px', padding: '10px 20px', backgroundColor: '#FF6B6B', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  focusHint: { fontSize: 13, color: '#71717A', backgroundColor: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: 8, padding: '10px 14px', marginBottom: 16 },
  highlightedFocusBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 14px', backgroundColor: '#FF6B6B', color: 'white', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', animation: 'pulse 2s infinite' },
  
  // Task items
  taskArea: { minHeight: 200 },
  taskList: { display: 'flex', flexDirection: 'column', gap: 8 },
  taskItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#F9FAFB', borderRadius: 10, border: '1px solid #E4E4E7' },
  taskContent: { fontSize: 14, color: '#18181B', fontWeight: 500 },
  taskActions: { display: 'flex', alignItems: 'center', gap: 8 },
  
  // Combo boxes
  comboInputRow: { display: 'flex', gap: 8 },
  comboInput: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid #E4E4E7', borderRadius: 8, backgroundColor: 'white', cursor: 'pointer', minHeight: 44 },
  comboSearchInput: { border: 'none', outline: 'none', fontSize: 14, flex: 1, backgroundColor: 'transparent' },
  comboDropdown: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #E4E4E7', borderRadius: 8, marginTop: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: 200, overflowY: 'auto' },
  comboOption: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #F4F4F5' },
  inlineCreateBtn: { display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', backgroundColor: '#6366F1', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  
  // Work Mode
  workHeader: { marginBottom: 20 },
  workTitle: { fontSize: 20, fontWeight: 700, color: '#18181B', marginBottom: 4 },
  workSubtitle: { fontSize: 14, color: '#71717A' },
  viewToggle: { display: 'flex', gap: 8, marginBottom: 16 },
  viewToggleBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#F4F4F5', color: '#71717A', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  viewToggleBtnActive: { backgroundColor: '#18181B', color: 'white' },
  listWavesContainer: { display: 'flex', flexDirection: 'column', gap: 12 },
  
  // Work Task Card
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
  
  // Graph
  graphContainer: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 20, marginTop: 16 },
  graphTitle: { fontSize: 14, fontWeight: 600, color: '#18181B', marginBottom: 16 },
  graphSvg: { display: 'block', margin: '0 auto', backgroundColor: 'white', borderRadius: 8, border: '1px solid #E4E4E7' },
  graphHint: { fontSize: 12, color: '#71717A', textAlign: 'center', marginTop: 12 },
  
  // Review Mode
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
  statCard: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 16, textAlign: 'center' },
  statValue: { fontSize: 28, fontWeight: 800, color: '#18181B' },
  statLabel: { fontSize: 12, color: '#71717A', marginTop: 4 },
  reviewListTitle: { fontSize: 16, fontWeight: 600, color: '#18181B', marginBottom: 12 },
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
  
  toggleLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#52525B', cursor: 'pointer' },
  
  // Review popup
  reviewPopup: { backgroundColor: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: 12, padding: 24, textAlign: 'center' },
  reviewPopupTitle: { fontSize: 18, fontWeight: 700, color: '#18181B', marginBottom: 8 },
  reviewPopupTask: { fontSize: 14, color: '#71717A', marginBottom: 20, fontStyle: 'italic' },
  ratingButtons: { display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 },
  ratingBtn: { width: 44, height: 44, borderRadius: 10, border: '1px solid #E4E4E7', backgroundColor: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4D4D8' },
  ratingBtnActive: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B', color: '#F59E0B' },
  
  // Focus mode
  focusMode: { padding: '20px 0' },
  focusHeader: { textAlign: 'center', marginBottom: 24 },
  focusLabel: { fontSize: 13, color: '#71717A', marginBottom: 6 },
  focusTask: { fontSize: 20, fontWeight: 700, color: '#18181B', maxWidth: 500, margin: '0 auto' },
  progressDots: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 16, flexWrap: 'nowrap', overflow: 'hidden', maxHeight: 20 },
  dot: { width: 8, height: 8, borderRadius: 100, backgroundColor: '#E4E4E7' },
  dotActive: { width: 28, backgroundColor: '#FF6B6B' },
  wizardCard: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 24, maxWidth: 480, margin: '0 auto' },
  questionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  wizardProgress: { fontSize: 12, color: '#71717A' },
  wizardQuestion: { fontSize: 16, fontWeight: 600, color: '#18181B', marginBottom: 16, lineHeight: 1.4 },
  wizardActions: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  wizardRightActions: { display: 'flex', gap: 8 },
  skipSection: { textAlign: 'center', marginTop: 16 },
  linkBtn: { background: 'none', border: 'none', color: '#71717A', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' },
  
  // Common
  input: { padding: '10px 14px', border: '1px solid #D4D4D8', borderRadius: 8, fontSize: 14, outline: 'none', backgroundColor: 'white', width: '100%', boxSizing: 'border-box' },
  textarea: { width: '100%', minHeight: 100, padding: 12, border: '1px solid #D4D4D8', borderRadius: 8, fontSize: 14, outline: 'none', resize: 'vertical', marginBottom: 12, boxSizing: 'border-box', fontFamily: 'inherit' },
  select: { padding: '8px 12px', border: '1px solid #D4D4D8', borderRadius: 8, fontSize: 14, outline: 'none', backgroundColor: 'white', cursor: 'pointer' },
  primaryBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 20px', backgroundColor: '#FF6B6B', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  ghostBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', backgroundColor: 'transparent', border: 'none', color: '#71717A', fontSize: 13, cursor: 'pointer' },
  outlineBtn: { padding: '8px 14px', backgroundColor: 'transparent', border: '1px solid #E4E4E7', color: '#18181B', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  checkbox: { width: 18, height: 18, borderRadius: 4, border: '2px solid #D4D4D8', backgroundColor: 'transparent', cursor: 'pointer', flexShrink: 0 },
  emptyState: { textAlign: 'center', padding: '48px 20px', color: '#A1A1AA' },
  emptyIcon: { fontSize: 48, marginBottom: 12, color: '#D4D4D8' },
  emptyMessage: { fontSize: 14, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: 600, color: '#52525B', marginBottom: 6, display: 'block' },
};

// Add CSS animation for highlighted focus button
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes pulse {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.4); }
    50% { transform: scale(1.02); box-shadow: 0 0 0 6px rgba(255, 107, 107, 0); }
  }
  /* Tailwind size utilities — needed outside Claude preview */
  .w-3    { width:  12px !important; }  .h-3    { height: 12px !important; }
  .w-3\\.5 { width: 14px !important; } .h-3\\.5 { height: 14px !important; }
  .w-4    { width:  16px !important; }  .h-4    { height: 16px !important; }
  .w-5    { width:  20px !important; }  .h-5    { height: 20px !important; }
  .w-6    { width:  24px !important; }  .h-6    { height: 24px !important; }
  .w-8    { width:  32px !important; }  .h-8    { height: 32px !important; }
  .w-10   { width:  40px !important; }  .h-10   { height: 40px !important; }
`;
if (typeof document !== 'undefined') {
  document.head.appendChild(styleSheet);
}

