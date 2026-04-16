import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ============================================================================
// ⚙️  DEBUG FLAG — set to false to hide all timing overlays in production
// ============================================================================
const DEBUG_MODE = true;

// ============================================================================
// OT² STRESS TEST — Heavy data simulation
// 200 Freedom tasks · 550 Work tasks (150 blinks, 20 pools×10, 10 pods×20)
// 500 completed reviews · Debug render-timing overlays
// ============================================================================

const STORAGE_KEYS = {
  TASKS:    'ot2_guest_tasks',
  TIMERS:   'ot2_guest_timers',
  REVIEWS:  'ot2_guest_reviews',
  USER:     'ot2_user',
  POOLS:    'ot2_pools',
  PODS:     'ot2_pods',
  POD_LOGS: 'ot2_pod_logs',
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
// 🌱 DATA SEEDER
// Generates all stress-test data and writes to localStorage
// ============================================================================
const BLINK_TASKS = [
  'Reply to client about proposal revisions',
  'Order replacement ink cartridges',
  'Check flight status for Thursday trip',
  'Pay electricity bill before due date',
  'Renew gym membership',
  'Pick up dry cleaning',
  'Call dentist to reschedule appointment',
  'Book table for anniversary dinner',
  'Transfer money to savings account',
  'Update emergency contact details at HR',
  'Read chapter 4 of Atomic Habits',
  'Send thank you note to interviewer',
  'Clean out Downloads folder',
  'Update LinkedIn headline',
  'Return library books',
  'Buy birthday card for Priya',
  'Cancel unused streaming subscription',
  'Schedule car service appointment',
  'Submit expense report from last trip',
  'Refill prescription at pharmacy',
  'Research standing desk options',
  'Write performance self-review draft',
  'Backup laptop to external drive',
  'Review bank statement for anomalies',
  'Sign and return lease renewal',
  'Organize kitchen pantry',
  'Delete duplicate contacts from phone',
  'Send condolence message to Ramesh',
  'Update passport photo for renewal',
  'Print boarding passes for Sunday flight',
  'Water the balcony plants',
  'Fix squeaky door hinge',
  'Return Amazon package',
  'RSVP to Arjun\'s wedding',
  'Configure 2FA on email account',
  'Archive old project files',
  'Measure bedroom for new rug',
  'Find a plumber for kitchen tap',
  'Download updated tax forms',
  'Review terms for new credit card offer',
  'Schedule annual health check-up',
  'Send invoice to Freelance client #3',
  'Update will and testament',
  'Buy new running shoes',
  'Check on house plant health',
  'Forward utility bills to accountant',
  'Confirm hotel check-in time',
  'Back up phone contacts',
  'Set up auto-pay for internet bill',
  'Research noise-cancelling headphones',
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
  'Define acceptance criteria for {feature}',
  'Write unit tests for {module}',
  'Review pull request from {person}',
  'Update documentation for {component}',
  'Conduct user research session on {topic}',
  'Create wireframes for {screen}',
  'Analyse metrics for {event}',
  'Prepare demo script for {audience}',
  'Resolve bug in {area}',
  'Coordinate with {team} on {deliverable}',
];

const POD_CONFIGS = [
  { name: 'Morning Exercise', podType: 'recurring', recurrence: { type: 'daily' }, trackerFields: [{ id: uid(), name: 'Kms Run', type: 'text' }, { id: uid(), name: 'Calories Burned', type: 'text' }] },
  { name: 'Birthdays & Anniversaries', podType: 'annual_dates', recurrence: null, trackerFields: [] },
  { name: 'Medication', podType: 'recurring', recurrence: { type: 'daily' }, trackerFields: [{ id: uid(), name: 'Morning Dose', type: 'checkbox' }, { id: uid(), name: 'Evening Dose', type: 'checkbox' }] },
  { name: 'Weekly Review', podType: 'recurring', recurrence: { type: 'specific_days', weekDays: [4] }, trackerFields: [{ id: uid(), name: 'Items Reviewed', type: 'text' }] },
  { name: 'Outdoor Activities', podType: 'recurring', recurrence: { type: 'specific_days', weekDays: [0, 2, 5] }, trackerFields: [{ id: uid(), name: 'Kms Covered', type: 'text' }, { id: uid(), name: 'Activity Type', type: 'text' }] },
  { name: 'Bill Payments', podType: 'annual_dates', recurrence: null, trackerFields: [] },
  { name: 'Reading Habit', podType: 'recurring', recurrence: { type: 'daily' }, trackerFields: [{ id: uid(), name: 'Pages Read', type: 'text' }, { id: uid(), name: 'Done', type: 'checkbox' }] },
  { name: 'Guitar Practice', podType: 'recurring', recurrence: { type: 'specific_days', weekDays: [0, 1, 2, 3, 4] }, trackerFields: [{ id: uid(), name: 'Minutes Practiced', type: 'text' }, { id: uid(), name: 'Completed', type: 'checkbox' }] },
  { name: 'Check-ins & Catch-ups', podType: 'recurring', recurrence: { type: 'monthly_frequency', frequency: 4 }, trackerFields: [{ id: uid(), name: 'People Connected', type: 'text' }] },
  { name: 'Important Life Events', podType: 'annual_dates', recurrence: null, trackerFields: [] },
];

const POD_TASK_NAMES = [
  ['Morning jog', 'Evening walk', 'Cycling session', 'Swimming laps', 'Yoga flow', 'HIIT workout', 'Strength training', 'Stretching routine', 'Park run', 'Stair climb'],
  ['Wish Amma', 'Greet Rahul', 'Call Dad on birthday', 'Message Priya', 'Wish Sunita Anniversary', 'Call Uncle Raj', 'Wish Deepak', 'Message team on Diwali', 'Wish Mira graduation', 'Call Grandma'],
  ['Take morning BP tablet', 'Evening vitamin D', 'Morning iron supplement', 'Allergy pill before bed', 'Probiotic with breakfast', 'Vitamin B12 morning', 'Omega-3 evening', 'Zinc tablet morning', 'Magnesium before sleep', 'Antacid if needed'],
  ['Review open tasks', 'Check this week goals', 'Update project notes', 'Archive done items', 'Plan next week', 'Review decisions log', 'Check habit streaks', 'Retrospective notes', 'Inbox zero sweep', 'Update team status'],
  ['Walk in Aarey forest', 'Cycling in Powai', 'Swimming at club', 'Hike Sanjay Gandhi', 'Beach walk Juhu', 'Trek Khandala', 'Run at Carter Road', 'Badminton session', 'Tennis practice', 'Football with friends'],
  ['Pay electricity bill', 'Pay internet bill', 'Credit card payment', 'LIC premium due', 'SIP installment', 'Rent payment', 'Water bill', 'Gas cylinder booking', 'Property tax', 'Car insurance renewal'],
  ['Read Atomic Habits ch.5', 'Finish Deep Work part 2', 'Read HBR article', 'Continue Sapiens', 'Read design blog', 'Finish newsletter backlog', 'Read PM weekly digest', 'Continue 4-Hour Workweek', 'Read tech documentation', 'Finish last chapter'],
  ['Practice chords Cmaj7', 'Fingerpicking pattern 3', 'Learn new riff', 'Scales warmup', 'Strumming patterns', 'Learn Wonderwall intro', 'Practice barre chords', 'Jam along to backing track', 'Record progress video', 'Music theory exercise'],
  ['Call Vikram for catchup', 'Video call with mentor Sanjay', 'Message old colleague Deepa', 'LinkedIn connect with lead', 'Coffee with Anita', 'Call Rohit from college', 'Check in with team Priya', 'Network event follow-up', 'Message Karan about project', 'Call Mom weekly'],
  ['File income tax return', 'Portfolio review', 'Travel anniversary trip', 'Family photo session', 'Update insurance nominees', 'Write annual letter to kids', 'Heritage trip planning', 'Time capsule update', 'Year in review journal', 'Gratitude ritual Dec 31'],
];

const REVIEW_COMMENTS = [
  'Went smoothly, no blockers encountered.',
  'Took longer than expected due to dependencies.',
  'Great outcome, team was very responsive.',
  'Could have delegated parts of this.',
  'Better to break this into smaller chunks next time.',
  'Completed ahead of schedule. Good planning paid off.',
  'Needed more context upfront — will document better.',
  'Perfect timing, exactly when it was needed.',
  'Collaboration worked well on this one.',
  'Should have started earlier to avoid the rush.',
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  'Ut enim ad minim veniam, quis nostrud exercitation.',
  'Duis aute irure dolor in reprehenderit in voluptate velit.',
  'Excepteur sint occaecat cupidatat non proident.',
  'Found a better approach halfway through — updated process doc.',
  'External blocker caused delay, escalated correctly.',
  'Would benefit from a checklist template.',
  'Solid execution, repeatable next time.',
  'Stakeholder feedback was positive, will replicate.',
];

const DEADLINES = ['today', 'tomorrow', 'this week', 'next week', 'next month', 'no rush', 'by Friday', 'end of quarter', 'asap', 'whenever convenient'];
const OUTCOMES = [
  'Report delivered to stakeholder',
  'Feature shipped to production',
  'Client signed off',
  'Documentation updated',
  'Team aligned on approach',
  'Bug resolved and deployed',
  'Decision made with full context',
  'Process improved for next cycle',
  'Relationship strengthened',
  'Goal milestone reached',
];
const MOTIVATIONS = [
  'Directly impacts Q2 OKR',
  'Unblocks 3 other teammates',
  'Important for client retention',
  'Personal growth priority',
  'Team morale depends on it',
  'Financial impact if delayed',
  'Health is non-negotiable',
  'Long overdue, reduces tech debt',
  'Sets the foundation for future work',
  'Simply the right thing to do',
];

function generateSeedData() {
  const now = Date.now();
  const pools = POOL_NAMES.map((name, i) => ({
    id: `pool_${i}`,
    name,
    createdAt: now - i * 86400000,
    completionDate: null,
    completionDays: null,
    relationships: [],
  }));

  const pods = POD_CONFIGS.map((cfg, i) => ({
    id: `pod_${i}`,
    createdAt: now - i * 86400000 * 3,
    ...cfg,
  }));

  const tasks = [];

  // ── 200 Freedom/Blink tasks (pending, not yet focused) ──
  for (let i = 0; i < 200; i++) {
    const template = BLINK_TASKS[i % BLINK_TASKS.length];
    tasks.push({
      id: `blink_freedom_${i}`,
      content: i < BLINK_TASKS.length ? template : `${template} — variant ${Math.ceil(i / BLINK_TASKS.length)}`,
      createdAt: now - i * 3600000,
      isCompleted: false,
      reflection: null,
      type: 'blink',
      poolIds: [],
      podId: null,
    });
  }

  // ── 150 Blinks with reflections (work mode visible) ──
  for (let i = 0; i < 150; i++) {
    tasks.push({
      id: `blink_work_${i}`,
      content: `${BLINK_TASKS[i % BLINK_TASKS.length]} [B${i + 1}]`,
      createdAt: now - i * 7200000,
      isCompleted: false,
      reflection: {
        deadline: DEADLINES[i % DEADLINES.length],
        outcome: OUTCOMES[i % OUTCOMES.length],
        motivation: MOTIVATIONS[i % MOTIVATIONS.length],
        complexity: i % 3 === 0 ? 'high complexity, requires deep focus' : i % 3 === 1 ? 'medium, regular effort' : 'low, quick win',
      },
      type: 'blink',
      poolIds: [],
      podId: null,
    });
  }

  // ── 20 pools × 10 tasks = 200 pool tasks ──
  const features = ['auth flow', 'dashboard', 'payment module', 'onboarding', 'notifications', 'search', 'reporting', 'mobile app', 'API', 'admin panel'];
  const persons = ['Rahul', 'Priya', 'Amit', 'Sunita', 'Vikram', 'Deepa', 'Kiran', 'Anita', 'Suresh', 'Meena'];
  const teams = ['backend', 'design', 'QA', 'product', 'devops', 'data', 'support', 'sales', 'legal', 'finance'];

  for (let p = 0; p < 20; p++) {
    for (let t = 0; t < 10; t++) {
      const template = POOL_TASK_TEMPLATES[t]
        .replace('{feature}', features[t])
        .replace('{module}', features[(t + 1) % features.length])
        .replace('{person}', persons[t])
        .replace('{component}', features[(t + 2) % features.length])
        .replace('{topic}', features[(t + 3) % features.length])
        .replace('{screen}', features[(t + 4) % features.length])
        .replace('{event}', `Q${(p % 4) + 1} launch`)
        .replace('{audience}', persons[(t + p) % persons.length])
        .replace('{area}', features[(p + t) % features.length])
        .replace('{team}', teams[p % teams.length])
        .replace('{deliverable}', `milestone ${t + 1}`);

      const taskId = `pool_task_${p}_${t}`;
      tasks.push({
        id: taskId,
        content: `[${POOL_NAMES[p].split(':')[0].trim()}] ${template}`,
        createdAt: now - (p * 10 + t) * 3600000,
        isCompleted: false,
        reflection: {
          deadline: DEADLINES[(p + t) % DEADLINES.length],
          outcome: OUTCOMES[(p + t) % OUTCOMES.length],
          motivation: MOTIVATIONS[t % MOTIVATIONS.length],
        },
        type: 'pool',
        poolIds: [`pool_${p}`],
        podId: null,
      });

      // Add relationships between tasks in same pool
      if (t > 0) {
        pools[p].relationships.push({
          fromTaskId: taskId,
          toTaskId: `pool_task_${p}_${t - 1}`,
          type: ['precede', 'follow', 'schedule', 'accomplish'][t % 4],
        });
      }
    }
  }

  // ── 10 pods × 20 tasks = 200 pod tasks ──
  const annualDates = ['03-22','06-15','08-10','01-05','11-30','02-14','05-01','07-04','09-20','12-25','04-17','10-08'];
  for (let p = 0; p < 10; p++) {
    const pod = pods[p];
    const podTaskNames = POD_TASK_NAMES[p] || POD_TASK_NAMES[0];
    for (let t = 0; t < 20; t++) {
      const name = t < podTaskNames.length ? podTaskNames[t] : `${podTaskNames[t % podTaskNames.length]} (variation ${Math.floor(t / podTaskNames.length) + 1})`;
      tasks.push({
        id: `pod_task_${p}_${t}`,
        content: name,
        createdAt: now - (p * 20 + t) * 7200000,
        isCompleted: false,
        reflection: null,
        type: 'pod',
        poolIds: [],
        podId: pod.id,
        podTaskDate: pod.podType === 'annual_dates' ? annualDates[(p * 20 + t) % annualDates.length] : null,
      });
    }
  }

  // ── 500 completed tasks with reviews ──
  const reviews = [];
  for (let i = 0; i < 500; i++) {
    const taskId = `completed_${i}`;
    const completedAt = new Date(now - i * 86400000 * 0.5).toISOString();
    tasks.push({
      id: taskId,
      content: `${BLINK_TASKS[i % BLINK_TASKS.length]} [done-${i + 1}]`,
      createdAt: now - i * 90000000,
      isCompleted: true,
      completedAt,
      reflection: {
        deadline: DEADLINES[i % DEADLINES.length],
        outcome: OUTCOMES[i % OUTCOMES.length],
        motivation: MOTIVATIONS[i % MOTIVATIONS.length],
      },
      type: ['blink', 'blink', 'pool', 'blink', 'pool'][i % 5],
      poolIds: i % 5 === 2 || i % 5 === 4 ? [`pool_${i % 20}`] : [],
      podId: null,
    });
    reviews.push({
      taskId,
      satisfactionRating: (i % 5) + 1,
      improvements: REVIEW_COMMENTS[i % REVIEW_COMMENTS.length],
      completedAt: now - i * 86400000 * 0.5,
    });
  }

  return { tasks, pools, pods, reviews };
}

// ============================================================================
// SEED BUTTON PANEL (shown when data not yet seeded)
// ============================================================================
function SeederPanel({ onSeeded }) {
  const [seeding, setSeeding] = useState(false);
  const [progress, setProgress] = useState('');
  const [stats, setStats] = useState(null);

  const handleSeed = async () => {
    setSeeding(true);
    const t0 = performance.now();

    setProgress('Generating tasks…');
    await new Promise(r => setTimeout(r, 50));
    const data = generateSeedData();

    setProgress('Writing tasks to localStorage…');
    await new Promise(r => setTimeout(r, 50));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(data.tasks));

    setProgress('Writing pools…');
    await new Promise(r => setTimeout(r, 30));
    localStorage.setItem(STORAGE_KEYS.POOLS, JSON.stringify(data.pools));

    setProgress('Writing pods…');
    await new Promise(r => setTimeout(r, 30));
    localStorage.setItem(STORAGE_KEYS.PODS, JSON.stringify(data.pods));

    setProgress('Writing reviews…');
    await new Promise(r => setTimeout(r, 50));
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(data.reviews));

    localStorage.setItem(STORAGE_KEYS.TIMERS, JSON.stringify({}));
    localStorage.setItem(STORAGE_KEYS.POD_LOGS, JSON.stringify({}));
    localStorage.setItem(STORAGE_KEYS.SEEDED, '1');

    const elapsed = (performance.now() - t0).toFixed(0);
    const pending = data.tasks.filter(t => !t.isCompleted).length;
    const completed = data.tasks.filter(t => t.isCompleted).length;
    setStats({ pending, completed, pools: data.pools.length, pods: data.pods.length, reviews: data.reviews.length, elapsed });
    setSeeding(false);
    setProgress('');
    setTimeout(() => onSeeded(), 1500);
  };

  const handleClear = () => {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    window.location.reload();
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
      <div style={{ backgroundColor: '#1E293B', borderRadius: 16, padding: 40, maxWidth: 480, width: '100%', border: '1px solid #334155' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⚡</div>
          <h1 style={{ color: '#F8FAFC', fontSize: 22, fontWeight: 700, margin: 0 }}>OT² Stress Test</h1>
          <p style={{ color: '#94A3B8', fontSize: 13, marginTop: 8 }}>Generate heavy production-scale data to test UI performance</p>
        </div>

        <div style={{ backgroundColor: '#0F172A', borderRadius: 10, padding: 16, marginBottom: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            ['Freedom Mode', '200 blink tasks'],
            ['Work · Blinks', '150 focused tasks'],
            ['Work · Pools', '20 pools × 10 tasks'],
            ['Work · Pods', '10 pods × 20 tasks'],
            ['Completed', '500 tasks'],
            ['Reviews', '500 with ratings'],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ color: '#64748B', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
              <span style={{ color: '#38BDF8', fontSize: 13, fontWeight: 700 }}>{val}</span>
            </div>
          ))}
        </div>

        {progress && (
          <div style={{ backgroundColor: '#0F172A', borderRadius: 8, padding: 12, marginBottom: 16, color: '#A3E635', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
            {progress}
          </div>
        )}

        {stats && (
          <div style={{ backgroundColor: '#064E3B', borderRadius: 8, padding: 12, marginBottom: 16, color: '#6EE7B7', fontSize: 12 }}>
            ✅ Seeded in {stats.elapsed}ms — {(stats.pending + stats.completed).toLocaleString()} tasks · {stats.reviews.toLocaleString()} reviews
          </div>
        )}

        {!seeding && !stats && (
          <button
            onClick={handleSeed}
            style={{ width: '100%', padding: '14px', backgroundColor: '#0EA5E9', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 10 }}
          >
            🌱 Seed Heavy Data & Launch App
          </button>
        )}

        {seeding && (
          <div style={{ textAlign: 'center', color: '#94A3B8', padding: '14px', fontSize: 14 }}>Generating data…</div>
        )}

        <button
          onClick={handleClear}
          style={{ width: '100%', padding: '10px', backgroundColor: 'transparent', color: '#EF4444', border: '1px solid #EF444440', borderRadius: 10, fontSize: 13, cursor: 'pointer', marginTop: 6 }}
        >
          🗑 Clear all data & reset
        </button>

        {DEBUG_MODE && (
          <div style={{ marginTop: 16, padding: '8px 12px', backgroundColor: '#1a0a00', border: '1px solid #F59E0B40', borderRadius: 8, color: '#F59E0B', fontSize: 11, textAlign: 'center' }}>
            ⚙️ DEBUG_MODE = true · Timing overlays active
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// T_WORDS
// ============================================================================
const T_WORDS = ['Things', 'Tasks', 'Time', 'Thoughts', 'Targets', 'Todos', 'Tactics'];

const RELATIONSHIP_TYPES = [
  { key: 'precede',    label: 'Precedes',         color: '#6366F1', icon: '→' },
  { key: 'follow',     label: 'Follows',           color: '#0EA5E9', icon: '←' },
  { key: 'schedule',   label: 'Scheduled With',    color: '#10B981', icon: '⇔' },
  { key: 'accomplish', label: 'Accomplishes With',  color: '#F59E0B', icon: '⊕' },
];

const WEEK_DAYS_SHORT = ['M','T','W','T','F','S','S'];

const podSummaryLine = (pod) => {
  if (!pod) return '';
  if (pod.podType === 'annual_dates') return '📅 Annual date per task';
  const r = pod.recurrence || {};
  const trackers = (pod.trackerFields || []).filter(f => f.name).map(f => f.name).join(', ');
  const tp = trackers ? ` · ${trackers}` : '';
  if (r.type === 'daily') return `🔁 Every day${tp}`;
  if (r.type === 'specific_days') return `📅 ${(r.weekDays || []).sort().map(d => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][d]).join(', ')}${tp}`;
  if (r.type === 'every_n_days') return `🔁 Every ${r.everyNDays || '?'} days${tp}`;
  if (r.type === 'monthly_frequency') return `🗓 ${r.frequency || '?'}× per month${tp}`;
  return '—';
};

// ============================================================================
// ICONS (subset needed for Work / Review / Freedom views)
// ============================================================================
const Icons = {
  Hourglass: ({ className = 'w-6 h-6' }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>),
  Briefcase: ({ className = 'w-4 h-4' }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>),
  BarChart: ({ className = 'w-4 h-4' }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>),
  Sparkles: ({ className = 'w-4 h-4' }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>),
  Layers: ({ className = 'w-4 h-4' }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>),
  Repeat: ({ className = 'w-4 h-4' }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>),
  Play: ({ className = 'w-4 h-4' }) => (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>),
  Pause: ({ className = 'w-4 h-4' }) => (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>),
  Square: ({ className = 'w-3 h-3' }) => (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>),
  Check: ({ className = 'w-4 h-4' }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>),
  ChevronDown: ({ className = 'w-4 h-4' }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>),
  Star: ({ className = 'w-4 h-4', filled = false }) => (<svg className={className} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>),
  Clock: ({ className = 'w-4 h-4' }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
  Trash: ({ className = 'w-4 h-4' }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>),
  Plus: ({ className = 'w-4 h-4' }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>),
  Calendar: ({ className = 'w-4 h-4' }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>),
};

// ============================================================================
// VIRTUALISED LIST — renders only visible rows for performance
// Renders ~20 items at a time with scroll position tracking
// ============================================================================
function VirtualList({ items, rowHeight = 68, renderItem, containerStyle = {} }) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const containerHeight = 500;
  const totalHeight = items.length * rowHeight;
  const startIdx = Math.max(0, Math.floor(scrollTop / rowHeight) - 3);
  const endIdx = Math.min(items.length - 1, Math.ceil((scrollTop + containerHeight) / rowHeight) + 3);
  const visibleItems = items.slice(startIdx, endIdx + 1);

  return (
    <div
      ref={containerRef}
      onScroll={e => setScrollTop(e.target.scrollTop)}
      style={{ height: containerHeight, overflowY: 'auto', position: 'relative', ...containerStyle }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', top: startIdx * rowHeight, left: 0, right: 0 }}>
          {visibleItems.map((item, i) => (
            <div key={item.id || startIdx + i} style={{ height: rowHeight }}>
              {renderItem(item, startIdx + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================
export default function OT2StressTest() {
  const [seeded, setSeeded] = useState(() => !!localStorage.getItem(STORAGE_KEYS.SEEDED));
  const [guestMode, setGuestMode] = useState('freedom');
  const [tWordIndex, setTWordIndex] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [pools, setPools] = useState([]);
  const [pods, setPods] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [podLogs, setPodLogs] = useState({});
  const [timers, setTimers] = useState({});
  const [tick, setTick] = useState(0);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Focus Mode state
  const [focusedTaskId, setFocusedTaskId] = useState(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardAnswers, setWizardAnswers] = useState({});
  const [focusTypeConfirmed, setFocusTypeConfirmed] = useState(false);

  // Derived
  const pendingTasks = useMemo(() => tasks.filter(t => !t.isCompleted), [tasks]);
  const completedTasks = useMemo(() => tasks.filter(t => t.isCompleted), [tasks]);
  const focusedTask = useMemo(() => tasks.find(t => t.id === focusedTaskId), [tasks, focusedTaskId]);

  // FEAT-005: tasks with at least one answered reflection are excluded from Freedom
  const freedomTasks = useMemo(() =>
    pendingTasks.filter(t => !t.reflection || !Object.values(t.reflection).some(v => v && String(v).trim())),
    [pendingTasks]
  );

  // T-word rotator
  useEffect(() => {
    const i = setInterval(() => setTWordIndex(p => (p + 1) % T_WORDS.length), 2000);
    return () => clearInterval(i);
  }, []);

  // Load from localStorage
  useEffect(() => {
    if (!seeded) return;
    const t0 = performance.now();
    try {
      const st = localStorage.getItem(STORAGE_KEYS.TASKS);
      const sp = localStorage.getItem(STORAGE_KEYS.POOLS);
      const sd = localStorage.getItem(STORAGE_KEYS.PODS);
      const sr = localStorage.getItem(STORAGE_KEYS.REVIEWS);
      const sl = localStorage.getItem(STORAGE_KEYS.POD_LOGS);
      if (st) setTasks(JSON.parse(st));
      if (sp) setPools(JSON.parse(sp));
      if (sd) setPods(JSON.parse(sd));
      if (sr) setReviews(JSON.parse(sr));
      if (sl) setPodLogs(JSON.parse(sl));
    } catch (e) { console.error(e); }
    const elapsed = (performance.now() - t0).toFixed(1);
    if (DEBUG_MODE) console.log(`[DEBUG] localStorage load: ${elapsed}ms`);
    setDataLoaded(true);
  }, [seeded]);

  const getPodLog = (podId, taskId, date) => podLogs[`${podId}_${taskId}_${date}`] || { status: 'planned', trackerValues: {} };
  const setPodLog = (podId, taskId, date, updates) => {
    const key = `${podId}_${taskId}_${date}`;
    const today = todayStr();
    if (date < addDays(today, -5)) return;
    setPodLogs(prev => ({ ...prev, [key]: { ...(podLogs[key] || { status: 'planned', trackerValues: {} }), ...updates } }));
  };

  const completeTask = (id) => setTasks(p => p.map(t => t.id === id ? { ...t, isCompleted: true, completedAt: new Date().toISOString() } : t));

  // FEAT-004: startFocus — ERR-005: pre-populate from existing reflection
  const startFocus = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    setFocusedTaskId(taskId);
    setWizardStep(0);
    setWizardAnswers(task?.reflection ? { ...task.reflection } : {});
    setFocusTypeConfirmed(!!(task?.reflection && Object.values(task.reflection).some(v => v && String(v).trim())));
    setGuestMode('focus');
  };

  const finishFocus = () => {
    if (!focusedTaskId) return;
    setTasks(prev => prev.map(t =>
      t.id === focusedTaskId ? { ...t, reflection: { ...wizardAnswers } } : t
    ));
    setFocusedTaskId(null);
    setGuestMode('work');
  };

  const skipFocusTask = () => {
    // Move to next unqualified task or go to work
    const unqualified = pendingTasks.filter(t => !t.reflection || !Object.values(t.reflection).some(v => v));
    const currentIdx = unqualified.findIndex(t => t.id === focusedTaskId);
    const next = unqualified[currentIdx + 1];
    if (next) { startFocus(next.id); } else { setFocusedTaskId(null); setGuestMode('work'); }
  };

  // Timer stubs
  const getElapsedSeconds = useCallback((id) => { const t = timers[id]; if (!t) return 0; if (t.pausedAt !== null) return t.accumulated; return t.accumulated + Math.floor((Date.now() - t.startTime) / 1000); }, [timers, tick]);
  const formatTimer = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const startTimer = (id) => setTimers(p => ({ ...p, [id]: { startTime: Date.now(), pausedAt: null, accumulated: p[id]?.accumulated || 0 } }));
  const pauseTimer = (id) => { const t = timers[id]; if (!t || t.pausedAt !== null) return; setTimers(p => ({ ...p, [id]: { ...p[id], pausedAt: Date.now(), accumulated: p[id].accumulated + Math.floor((Date.now() - t.startTime) / 1000) } })); };
  const stopTimer = (id) => setTimers(p => { const n = { ...p }; delete n[id]; return n; });
  const isTimerRunning = (id) => !!(timers[id] && timers[id].pausedAt === null);
  const isTimerPaused = (id) => !!(timers[id] && timers[id].pausedAt !== null);

  useEffect(() => {
    const hasRunning = Object.values(timers).some(t => t.pausedAt === null);
    if (!hasRunning) return;
    const i = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(i);
  }, [timers]);

  if (!seeded) return <SeederPanel onSeeded={() => setSeeded(true)} />;

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <Icons.Hourglass className="w-6 h-6" />
            <span style={styles.logoText}>OT<sup style={styles.sup}>2</sup></span>
            {DEBUG_MODE && (
              <span style={{ fontSize: 10, backgroundColor: '#F59E0B', color: '#000', padding: '2px 7px', borderRadius: 100, fontFamily: 'monospace', fontWeight: 700, marginLeft: 4 }}>
                DEBUG · {tasks.length.toLocaleString()} tasks
              </span>
            )}
          </div>
          <div style={styles.headerRight}>
            <span style={{ fontSize: 13, color: '#71717A' }}>
              {pendingTasks.length.toLocaleString()} pending · {completedTasks.length.toLocaleString()} done
            </span>
            <button style={{ ...styles.outlineBtn, fontSize: 12, color: '#EF4444', borderColor: '#EF4444' }} onClick={() => { Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k)); window.location.reload(); }}>
              Reset data
            </button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {/* Hero */}
        <div style={styles.hero}>
          <div style={styles.heroContent}>
            <h1 style={styles.heroTitle}>
              On Top of <span style={styles.tWord}>{T_WORDS[tWordIndex]}</span><sup style={{ ...styles.sup, color: '#FF6B6B', fontSize: '28px' }}>2</sup>
            </h1>
            <p style={styles.heroSubtitle}>Fast capture, Socratic Clarity, Timed Execution, Zen Learnings.</p>
          </div>
        </div>

        <section style={styles.guestSection}>
          <div style={styles.guestCard}>
            {/* Mode Nav */}
            <div style={styles.modeNav}>
              {[
                { key: 'freedom', label: 'Freedom', icon: <Icons.Sparkles className="w-4 h-4" /> },
                { key: 'focus',   label: 'Focus',   icon: <Icons.Hourglass className="w-4 h-4" />, disabled: pendingTasks.length === 0 },
                { key: 'work',    label: 'Work',    icon: <Icons.Briefcase className="w-4 h-4" /> },
                { key: 'review',  label: 'Review',  icon: <Icons.BarChart className="w-4 h-4" /> },
              ].map(m => (
                <button
                  key={m.key}
                  disabled={m.disabled}
                  style={{ ...styles.modeBtn, ...(guestMode === m.key ? styles.modeBtnActive : {}), ...(m.disabled ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }}
                  onClick={() => {
                    if (m.disabled) return;
                    if (m.key === 'focus') {
                      // Start focus on first unqualified task
                      const first = freedomTasks[0] || pendingTasks[0];
                      if (first) startFocus(first.id);
                    } else {
                      setGuestMode(m.key);
                    }
                  }}
                >
                  {m.icon}<span>{m.label}</span>
                </button>
              ))}
            </div>

            {guestMode === 'freedom' && (
              <FreedomModeView
                pendingTasks={freedomTasks}
                allPendingCount={pendingTasks.length}
                completedTasks={completedTasks}
                onCompleteTask={completeTask}
                onStartFocus={startFocus}
              />
            )}

            {guestMode === 'focus' && focusedTask && (
              <FocusModeView
                task={focusedTask}
                pendingTasks={pendingTasks}
                freedomTasks={freedomTasks}
                wizardStep={wizardStep}
                setWizardStep={setWizardStep}
                wizardAnswers={wizardAnswers}
                setWizardAnswers={setWizardAnswers}
                focusTypeConfirmed={focusTypeConfirmed}
                setFocusTypeConfirmed={setFocusTypeConfirmed}
                onFinish={finishFocus}
                onSkipTask={skipFocusTask}
              />
            )}

            {guestMode === 'focus' && !focusedTask && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#A1A1AA' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                <p style={{ fontSize: 14, marginBottom: 16 }}>No task selected for Focus</p>
                <button style={{ ...styles.outlineBtn }} onClick={() => { const t = freedomTasks[0] || pendingTasks[0]; if (t) startFocus(t.id); }}>Start Focus on next task</button>
              </div>
            )}

            {guestMode === 'work' && (
              <WorkModeView
                pendingTasks={pendingTasks}
                completedTasks={completedTasks}
                tasks={tasks}
                pools={pools}
                pods={pods}
                podLogs={podLogs}
                getPodLog={getPodLog}
                setPodLog={setPodLog}
                getElapsedSeconds={getElapsedSeconds}
                formatTimer={formatTimer}
                isTimerRunning={isTimerRunning}
                isTimerPaused={isTimerPaused}
                onStartTimer={startTimer}
                onPauseTimer={pauseTimer}
                onStopTimer={stopTimer}
                onCompleteTask={completeTask}
                onStartFocus={startFocus}
              />
            )}

            {guestMode === 'review' && (
              <ReviewModeView
                reviews={reviews}
                tasks={tasks}
                completedTasks={completedTasks}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

// ============================================================================
// FREEDOM MODE VIEW — virtualised list of 200 tasks
// ============================================================================
function FreedomModeView({ pendingTasks, allPendingCount, completedTasks, onCompleteTask, onStartFocus }) {
  const { mark, display } = useDebugTimer('Freedom Mode');
  const [search, setSearch] = useState('');
  const [renderStart] = useState(() => performance.now());
  const [renderMs, setRenderMs] = useState(null);
  const qualifiedCount = (allPendingCount || 0) - pendingTasks.length;

  useEffect(() => {
    setRenderMs((performance.now() - renderStart).toFixed(1));
    mark('list rendered');
  }, []);

  const filtered = useMemo(() => {
    mark('filter start');
    const r = search ? pendingTasks.filter(t => t.content.toLowerCase().includes(search.toLowerCase())) : pendingTasks;
    mark('filter done');
    return r;
  }, [pendingTasks, search]);

  return (
    <div>
      {DEBUG_MODE && renderMs && (
        <div style={debugBanner}>⏱ Freedom view rendered in <strong>{renderMs}ms</strong> · {pendingTasks.length} unqualified tasks · showing {filtered.length}</div>
      )}
      {qualifiedCount > 0 && (
        <div style={{ fontSize: 12, color: '#10B981', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 7, padding: '5px 12px', marginBottom: 10 }}>
          ✓ {qualifiedCount} task{qualifiedCount !== 1 ? 's' : ''} moved to Work Mode after Focus — Freedom shows only new captures
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          placeholder={`Search ${pendingTasks.length} unqualified tasks…`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.input}
        />
      </div>
      <div style={{ marginBottom: 8, fontSize: 12, color: '#71717A' }}>
        {filtered.length.toLocaleString()} tasks · scroll to see all · virtualised rendering
      </div>
      <VirtualList
        items={filtered}
        rowHeight={60}
        containerStyle={{ border: '1px solid #E4E4E7', borderRadius: 10 }}
        renderItem={(task, idx) => (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #F4F4F5', backgroundColor: idx % 2 === 0 ? '#FAFAFA' : 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <button style={styles.checkbox} onClick={() => onCompleteTask(task.id)} />
              <span style={{ fontSize: 14, color: '#18181B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.content}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, marginLeft: 10 }}>
              <span style={{ fontSize: 11, color: '#A1A1AA' }}>#{idx + 1}</span>
              {onStartFocus && (
                <button
                  onClick={() => onStartFocus(task.id)}
                  style={{ fontSize: 11, padding: '3px 8px', border: '1px solid #D4D4D8', borderRadius: 5, backgroundColor: 'transparent', color: '#71717A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                >
                  <Icons.Hourglass className="w-3 h-3" /> Focus
                </button>
              )}
            </div>
          </div>
        )}
      />
      <div style={{ marginTop: 10, padding: '8px 12px', backgroundColor: '#F9FAFB', borderRadius: 8, fontSize: 12, color: '#71717A' }}>
        ✅ {completedTasks.length.toLocaleString()} tasks completed
      </div>
      <DebugOverlay label="Freedom" timings={display} taskCount={filtered.length} extra={`Unqualified: ${pendingTasks.length} · Qualified in Work: ${qualifiedCount}`} />
    </div>
  );
}

// ============================================================================
// FOCUS MODE VIEW — lightweight Socratic wizard for stress testing
// ============================================================================
const FALLBACK_QUESTIONS = [
  { key: 'deadline',   question: 'When does this need to be done?',    placeholder: 'e.g. by Friday, this week, no rush…',   purpose: 'kanban',   required: true },
  { key: 'outcome',    question: 'What does success look like?',        placeholder: "Describe what 'done' means…",           purpose: 'energy',   required: true },
  { key: 'motivation', question: 'Why does this matter to you?',        placeholder: 'Connect with your deeper reason…',      purpose: 'quadrant', required: false },
  { key: 'complexity', question: 'How hard is this task?',              placeholder: 'Simple, medium, or complex…',           purpose: 'energy',   required: false },
  { key: 'urgency',    question: 'Is this urgent or does it feel urgent?', placeholder: 'Consider real consequences of waiting…', purpose: 'quadrant', required: false },
];

function FocusModeView({ task, pendingTasks, freedomTasks, wizardStep, setWizardStep, wizardAnswers, setWizardAnswers, focusTypeConfirmed, setFocusTypeConfirmed, onFinish, onSkipTask }) {
  const { mark, display } = useDebugTimer('Focus Mode');
  const [renderStart] = useState(() => performance.now());
  const [renderMs, setRenderMs] = useState(null);
  const [extended, setExtended] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const questions = FALLBACK_QUESTIONS;
  const currentQ = questions[wizardStep];
  const totalQ = questions.length;
  const purposeColor = { kanban: '#4299E1', quadrant: '#48BB78', energy: '#F59E0B', all: '#FF6B6B' };

  useEffect(() => {
    setRenderMs((performance.now() - renderStart).toFixed(1));
    mark('mounted');
    // ERR-005: pre-fill answers from task.reflection
    if (task.reflection) {
      setWizardAnswers(prev => {
        const merged = { ...prev };
        questions.forEach(q => { if (!merged[q.key] && task.reflection[q.key]) merged[q.key] = task.reflection[q.key]; });
        return merged;
      });
    }
  }, [task.id]);

  const handleMoreQuestions = async () => {
    setLoadingMore(true);
    await new Promise(r => setTimeout(r, 600)); // simulate AI call
    setLoadingMore(false);
    setExtended(true);
    // Jump back to first unanswered question
    const firstUnanswered = questions.findIndex(q => !wizardAnswers[q.key]);
    if (firstUnanswered !== -1) setWizardStep(firstUnanswered);
  };

  const qualifiedCount = pendingTasks.length - freedomTasks.length;

  return (
    <div style={{ padding: '16px 0' }}>
      {DEBUG_MODE && renderMs && (
        <div style={debugBanner}>⏱ Focus view in <strong>{renderMs}ms</strong> · {pendingTasks.length} pending · {qualifiedCount} already qualified</div>
      )}

      {/* Progress dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
        {pendingTasks.slice(0, 20).map((t, i) => (
          <div key={t.id} style={{ width: t.id === task.id ? 28 : 8, height: 8, borderRadius: 100, backgroundColor: t.id === task.id ? '#FF6B6B' : '#E4E4E7', transition: 'all .3s' }} />
        ))}
        {pendingTasks.length > 20 && <span style={{ fontSize: 11, color: '#A1A1AA', alignSelf: 'center' }}>+{pendingTasks.length - 20} more</span>}
      </div>

      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: '#71717A', marginBottom: 6 }}>Currently focusing on:</p>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#18181B', maxWidth: 500, margin: '0 auto' }}>{task.content}</h3>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
          {task.type && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100, backgroundColor: task.type === 'pool' ? '#6366F115' : task.type === 'pod' ? '#0EA5E915' : '#10B98115', color: task.type === 'pool' ? '#6366F1' : task.type === 'pod' ? '#0EA5E9' : '#10B981', fontWeight: 600 }}>{task.type === 'pool' ? '⊕ Pool' : task.type === 'pod' ? '↻ Pod' : '⚡ Blink'}</span>}
        </div>
      </div>

      {/* Type confirmation gate — skip if already qualified */}
      {!focusTypeConfirmed ? (
        <div style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 24, maxWidth: 420, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: '#71717A', marginBottom: 14 }}>Where does this task live?</p>
          {[
            { key: 'blink', label: '⚡ Blink', desc: 'Standalone note', color: '#10B981' },
            { key: 'pool',  label: '⊕ Pool',  desc: 'Part of a group', color: '#6366F1' },
            { key: 'pod',   label: '↻ Pod',   desc: 'Recurring habit',  color: '#0EA5E9' },
          ].map(opt => (
            <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: '1px solid #E4E4E7', marginBottom: 6, cursor: 'pointer', backgroundColor: 'white' }}>
              <input type="radio" name={`type_${task.id}`} onChange={() => {}} />
              <div><div style={{ fontWeight: 600, fontSize: 13 }}>{opt.label}</div><div style={{ fontSize: 11, color: '#71717A' }}>{opt.desc}</div></div>
            </label>
          ))}
          <button style={{ marginTop: 8, padding: '9px 18px', backgroundColor: '#FF6B6B', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setFocusTypeConfirmed(true)}>
            Continue →
          </button>
        </div>
      ) : wizardStep < totalQ ? (
        <div style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 24, maxWidth: 460, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: '#71717A' }}>Question {wizardStep + 1} of {totalQ}</span>
            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 100, backgroundColor: `${purposeColor[currentQ.purpose] || '#FF6B6B'}20`, color: purposeColor[currentQ.purpose] || '#FF6B6B', fontWeight: 600 }}>
              {currentQ.purpose === 'kanban' ? '📅 Timeline' : currentQ.purpose === 'quadrant' ? '🎯 Priority' : '⚡ Effort'}
            </span>
          </div>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: '#18181B', marginBottom: 14 }}>{currentQ.question}</h4>
          <textarea
            key={`${task.id}_${currentQ.key}`}
            placeholder={currentQ.placeholder}
            value={wizardAnswers[currentQ.key] || ''}
            onChange={e => setWizardAnswers(p => ({ ...p, [currentQ.key]: e.target.value }))}
            autoFocus
            style={{ width: '100%', minHeight: 90, padding: 12, border: '1px solid #D4D4D8', borderRadius: 8, fontSize: 14, resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
          {!currentQ.required && <p style={{ fontSize: 11, color: '#A1A1AA', marginTop: 6 }}>Optional — skip if not relevant</p>}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
            <button style={{ padding: '7px 14px', backgroundColor: 'transparent', border: '1px solid #E4E4E7', borderRadius: 7, fontSize: 13, cursor: wizardStep === 0 ? 'not-allowed' : 'pointer', color: '#71717A', opacity: wizardStep === 0 ? 0.4 : 1 }} disabled={wizardStep === 0} onClick={() => setWizardStep(s => s - 1)}>← Back</button>
            <div style={{ display: 'flex', gap: 8 }}>
              {!currentQ.required && <button style={{ padding: '7px 14px', backgroundColor: 'transparent', border: '1px solid #E4E4E7', borderRadius: 7, fontSize: 13, cursor: 'pointer', color: '#71717A' }} onClick={() => setWizardStep(s => s + 1)}>Skip</button>}
              <button style={{ padding: '7px 18px', backgroundColor: '#FF6B6B', color: 'white', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }} onClick={() => setWizardStep(s => s + 1)}>
                {wizardStep === totalQ - 1 ? 'Finish' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 24, maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 100, backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 22 }}>✓</div>
          <h4 style={{ fontSize: 17, fontWeight: 700, color: '#18181B', marginBottom: 6 }}>Ready to work!</h4>
          <p style={{ fontSize: 13, color: '#71717A', marginBottom: 16 }}>Reflections captured. This task will move to Work Mode.</p>
          {/* Answers summary */}
          <div style={{ backgroundColor: 'white', border: '1px solid #E4E4E7', borderRadius: 8, padding: 12, marginBottom: 16, textAlign: 'left' }}>
            {questions.filter(q => wizardAnswers[q.key]).map(q => (
              <div key={q.key} style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#71717A', textTransform: 'uppercase', letterSpacing: 0.5 }}>{q.key}: </span>
                <span style={{ fontSize: 12, color: '#52525B' }}>{wizardAnswers[q.key]}</span>
              </div>
            ))}
          </div>
          {!extended && (
            <div style={{ marginBottom: 14 }}>
              <button onClick={handleMoreQuestions} disabled={loadingMore} style={{ background: 'none', border: 'none', color: '#4299E1', fontSize: 13, cursor: loadingMore ? 'default' : 'pointer', textDecoration: 'underline', opacity: loadingMore ? 0.6 : 1 }}>
                {loadingMore ? '⟳ Generating questions…' : '✦ Help me with more qualifying questions'}
              </button>
            </div>
          )}
          <button style={{ padding: '10px 22px', backgroundColor: '#FF6B6B', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 }} onClick={onFinish}>
            Go to Work Mode →
          </button>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 14 }}>
        <button style={{ background: 'none', border: 'none', color: '#A1A1AA', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }} onClick={onSkipTask}>Skip this task for now</button>
      </div>

      <DebugOverlay label="Focus" timings={display} taskCount={pendingTasks.length} extra={`Step ${wizardStep + 1}/${totalQ} · ${qualifiedCount} already in Work`} />
    </div>
  );
}

// ============================================================================
// WORK MODE VIEW — Table, Kanban, Pool, Pod with virtualisation
// ============================================================================
function WorkModeView({ pendingTasks, completedTasks, tasks, pools, pods, podLogs, getPodLog, setPodLog,
  getElapsedSeconds, formatTimer, isTimerRunning, isTimerPaused, onStartTimer, onPauseTimer, onStopTimer, onCompleteTask, onStartFocus }) {
  const [workView, setWorkView] = useState('table');
  const [selectedPoolId, setSelectedPoolId] = useState(null);
  const [selectedPodId, setSelectedPodId] = useState(null);
  const { mark, display } = useDebugTimer('Work Mode');
  const [renderMs, setRenderMs] = useState(null);
  const renderStart = useRef(performance.now());

  useEffect(() => {
    setRenderMs((performance.now() - renderStart.current).toFixed(1));
    mark('view mounted');
  }, [workView]);

  const categorizeByDeadline = (task) => {
    const d = task.reflection?.deadline?.toLowerCase() || '';
    if (!d) return 'notplanned';
    if (/today|tonight|now|asap|urgent/.test(d)) return 'today';
    if (/tomorrow|next|week|month|later|soon|friday/.test(d)) return 'future';
    if (/yesterday|overdue|late|missed/.test(d)) return 'missed';
    return 'notplanned';
  };

  // FEAT-004: reusable Focus button
  const FocusBtn = ({ taskId }) => onStartFocus ? (
    <button onClick={() => onStartFocus(taskId)} style={{ fontSize: 11, padding: '3px 7px', border: '1px solid #D4D4D8', borderRadius: 5, backgroundColor: 'transparent', color: '#71717A', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
      <Icons.Hourglass className="w-3 h-3" /> Focus
    </button>
  ) : null;

  const TaskRow = ({ task, idx }) => {
    const running = isTimerRunning(task.id);
    const paused = isTimerPaused(task.id);
    return (
      <div style={{ display: 'flex', alignItems: 'center', padding: '9px 12px', borderBottom: '1px solid #F4F4F5', backgroundColor: idx % 2 === 0 ? '#FAFAFA' : 'white', gap: 8 }}>
        <button style={styles.checkbox} onClick={() => onCompleteTask(task.id)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#18181B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.content}</div>
          {task.reflection?.deadline && <div style={{ fontSize: 11, color: '#A1A1AA', marginTop: 1 }}>{task.reflection.deadline}</div>}
        </div>
        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, backgroundColor: task.type === 'pool' ? '#6366F115' : task.type === 'pod' ? '#0EA5E915' : '#10B98115', color: task.type === 'pool' ? '#6366F1' : task.type === 'pod' ? '#0EA5E9' : '#10B981', fontWeight: 600, flexShrink: 0 }}>
          {task.type === 'pool' ? '⊕' : task.type === 'pod' ? '↻' : '⚡'}
        </span>
        <FocusBtn taskId={task.id} />
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          {!running && !paused && <button style={styles.timerBtn} onClick={() => onStartTimer(task.id)}><Icons.Play className="w-3.5 h-3.5" /></button>}
          {running && <><span style={{ fontSize: 12, color: '#FF6B6B', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatTimer(getElapsedSeconds(task.id))}</span><button style={styles.timerBtn} onClick={() => onPauseTimer(task.id)}><Icons.Pause className="w-3.5 h-3.5" /></button></>}
          {paused && <><span style={{ fontSize: 12, color: '#71717A', fontVariantNumeric: 'tabular-nums' }}>{formatTimer(getElapsedSeconds(task.id))}</span><button style={styles.timerBtn} onClick={() => onStartTimer(task.id)}><Icons.Play className="w-3.5 h-3.5" /></button></>}
          {(running || paused) && <button style={styles.timerBtn} onClick={() => onStopTimer(task.id)}><Icons.Square /></button>}
        </div>
      </div>
    );
  };

  const TableView = () => {
    const { mark: tm, display: td } = useDebugTimer('Table');
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const t0 = useRef(performance.now());
    const [ms, setMs] = useState(null);

    const filtered = useMemo(() => {
      let r = pendingTasks;
      if (typeFilter !== 'all') r = r.filter(t => t.type === typeFilter);
      if (search) r = r.filter(t => t.content.toLowerCase().includes(search.toLowerCase()));
      return r;
    }, [pendingTasks, typeFilter, search]);

    useEffect(() => { setMs((performance.now() - t0.current).toFixed(1)); tm('rendered'); }, []);

    return (
      <div>
        {DEBUG_MODE && ms && <div style={debugBanner}>⏱ Table rendered in <strong>{ms}ms</strong> · {pendingTasks.length} total · showing {filtered.length}</div>}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <input type="text" placeholder={`Search ${pendingTasks.length} tasks…`} value={search} onChange={e => setSearch(e.target.value)} style={{ ...styles.input, flex: 1, minWidth: 160 }} />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...styles.input, width: 130 }}>
            <option value="all">All types</option>
            <option value="blink">⚡ Blink</option>
            <option value="pool">⊕ Pool</option>
            <option value="pod">↻ Pod</option>
          </select>
        </div>
        <div style={{ fontSize: 12, color: '#71717A', marginBottom: 6 }}>{filtered.length.toLocaleString()} tasks · virtualised scroll</div>
        <VirtualList
          items={filtered}
          rowHeight={62}
          containerStyle={{ border: '1px solid #E4E4E7', borderRadius: 10 }}
          renderItem={(task, idx) => <TaskRow key={task.id} task={task} idx={idx} />}
        />
      </div>
    );
  };

  const KanbanView = () => {
    const t0 = useRef(performance.now());
    const [ms, setMs] = useState(null);
    useEffect(() => { setMs((performance.now() - t0.current).toFixed(1)); }, []);

    const lanes = { today: { title: 'Today', color: '#FF6B6B', tasks: [] }, future: { title: 'Future', color: '#4299E1', tasks: [] }, missed: { title: 'Missed', color: '#F59E0B', tasks: [] }, notplanned: { title: 'Not Planned', color: '#A1A1AA', tasks: [] } };
    pendingTasks.forEach(t => lanes[categorizeByDeadline(t)].tasks.push(t));

    return (
      <div>
        {DEBUG_MODE && ms && <div style={debugBanner}>⏱ Kanban in <strong>{ms}ms</strong> · {pendingTasks.length} tasks across 4 lanes</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {Object.entries(lanes).map(([key, lane]) => (
            <div key={key}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderTop: `3px solid ${lane.color}`, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#52525B' }}>{lane.title}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'white', backgroundColor: lane.color, padding: '1px 8px', borderRadius: 100 }}>{lane.tasks.length}</span>
              </div>
              <VirtualList
                items={lane.tasks}
                rowHeight={72}
                containerStyle={{ maxHeight: 400 }}
                renderItem={(task) => (
                  <div style={{ backgroundColor: 'white', border: '1px solid #E4E4E7', borderRadius: 8, padding: '8px 10px', marginBottom: 4 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                      <button style={styles.checkbox} onClick={() => onCompleteTask(task.id)} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#18181B', lineHeight: 1.4 }}>{task.content}</span>
                    </div>
                    {task.reflection?.outcome && <p style={{ fontSize: 11, color: '#71717A', margin: '4px 0 0 22px', lineHeight: 1.4 }}>{task.reflection.outcome}</p>}
                  </div>
                )}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const PoolView = () => {
    const t0 = useRef(performance.now());
    const [ms, setMs] = useState(null);
    useEffect(() => { setMs((performance.now() - t0.current).toFixed(1)); }, [selectedPoolId]);

    const pool = pools.find(p => p.id === selectedPoolId);
    const poolTasks = useMemo(() => pendingTasks.filter(t => (t.poolIds || []).includes(selectedPoolId)), [selectedPoolId, pendingTasks]);

    return (
      <div>
        {DEBUG_MODE && ms && <div style={debugBanner}>⏱ Pool view in <strong>{ms}ms</strong> · {pools.length} pools · {poolTasks.length} tasks in selection</div>}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#71717A' }}>Pool ({pools.length}):</span>
          <select value={selectedPoolId || ''} onChange={e => setSelectedPoolId(e.target.value)} style={{ ...styles.input, flex: 1, minWidth: 200 }}>
            <option value="">— Select a Pool —</option>
            {pools.map(p => <option key={p.id} value={p.id}>{p.name} ({pendingTasks.filter(t => (t.poolIds||[]).includes(p.id)).length} tasks)</option>)}
          </select>
        </div>
        {!selectedPoolId && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {pools.map(p => {
              const count = pendingTasks.filter(t => (t.poolIds||[]).includes(p.id)).length;
              return (
                <div key={p.id} onClick={() => setSelectedPoolId(p.id)} style={{ padding: '12px 14px', border: '1px solid #E4E4E7', borderRadius: 10, cursor: 'pointer', backgroundColor: 'white' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#6366F1' }}>⊕ {p.name}</div>
                  <div style={{ fontSize: 12, color: '#71717A', marginTop: 4 }}>{count} tasks</div>
                </div>
              );
            })}
          </div>
        )}
        {pool && (
          <div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#18181B' }}>{pool.name}</span>
              <span style={{ fontSize: 12, color: '#6366F1', backgroundColor: '#6366F115', padding: '2px 10px', borderRadius: 100 }}>{poolTasks.length} tasks</span>
              <button onClick={() => setSelectedPoolId(null)} style={{ ...styles.ghostBtn, fontSize: 12, marginLeft: 'auto' }}>← All pools</button>
            </div>
            <VirtualList items={poolTasks} rowHeight={80} containerStyle={{ border: '1px solid #E4E4E7', borderRadius: 10 }} renderItem={(task, idx) => (
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #F4F4F5', borderLeft: '3px solid #6366F1', backgroundColor: idx % 2 === 0 ? '#FAFAFA' : 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button style={styles.checkbox} onClick={() => onCompleteTask(task.id)} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#18181B' }}>{task.content}</span>
                </div>
                {task.reflection?.outcome && <p style={{ fontSize: 11, color: '#71717A', margin: '3px 0 0 24px' }}>{task.reflection.outcome} · {task.reflection.motivation}</p>}
              </div>
            )} />
          </div>
        )}
      </div>
    );
  };

  const PodView = () => {
    const t0 = useRef(performance.now());
    const [ms, setMs] = useState(null);
    useEffect(() => { setMs((performance.now() - t0.current).toFixed(1)); }, [selectedPodId]);

    const today = todayStr();
    const pod = pods.find(p => p.id === selectedPodId);
    const podTasks = useMemo(() => tasks.filter(t => t.podId === selectedPodId), [selectedPodId, tasks]);
    const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(addDays(today, -6), i)), [today]);

    const isDayActive = (dayStr) => {
      if (!pod) return false;
      const r = pod.recurrence;
      if (!r) return false;
      if (r.type === 'daily') return true;
      if (r.type === 'specific_days') { const dow = (new Date(dayStr).getDay() + 6) % 7; return (r.weekDays || []).includes(dow); }
      if (r.type === 'every_n_days') { const diff = Math.floor((new Date(dayStr) - new Date(pod.createdAt)) / 86400000); return diff >= 0 && diff % (r.everyNDays || 1) === 0; }
      if (r.type === 'monthly_frequency') return true;
      return true;
    };

    const daysUntil = (mmdd) => {
      if (!mmdd) return null;
      const now = new Date();
      const thisYear = new Date(`${now.getFullYear()}-${mmdd}`);
      const diff = Math.ceil((thisYear - now) / 86400000);
      if (diff >= 0) return diff;
      return Math.ceil((new Date(`${now.getFullYear() + 1}-${mmdd}`) - now) / 86400000);
    };

    return (
      <div style={{ display: 'flex', gap: 14 }}>
        <div style={{ width: 200, flexShrink: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#71717A', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Pods ({pods.length})</p>
          <div style={{ maxHeight: 450, overflowY: 'auto' }}>
            {pods.map(p => (
              <div key={p.id} onClick={() => setSelectedPodId(p.id)} style={{ ...styles.podSideItem, ...(p.id === selectedPodId ? { backgroundColor: '#0EA5E915', borderColor: '#0EA5E9' } : {}), marginBottom: 4 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#A1A1AA', marginTop: 1 }}>{podSummaryLine(p).slice(0, 35)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflowX: 'auto' }}>
          {DEBUG_MODE && ms && <div style={debugBanner}>⏱ Pod view in <strong>{ms}ms</strong> · {podTasks.length} tasks in pod</div>}
          {!pod && <div style={{ color: '#A1A1AA', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>Select a Pod to see its schedule</div>}
          {pod && pod.podType === 'annual_dates' && (
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#18181B', marginBottom: 12 }}>{pod.name} — Annual Dates</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 450, overflowY: 'auto' }}>
                {podTasks.map(task => {
                  const days_u = daysUntil(task.podTaskDate);
                  const color = days_u === null ? '#A1A1AA' : days_u <= 3 ? '#EF4444' : days_u <= 14 ? '#F59E0B' : days_u <= 30 ? '#0EA5E9' : '#71717A';
                  const mmdd = task.podTaskDate;
                  const label = mmdd ? (() => { try { return new Date(`2000-${mmdd}`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch { return mmdd; } })() : 'No date';
                  return (
                    <div key={task.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px', border: `1px solid ${color}30`, borderLeft: `4px solid ${color}`, borderRadius: 8, backgroundColor: `${color}06` }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{task.content}</span>
                        <span style={{ fontSize: 11, color: '#71717A', marginLeft: 8 }}>📅 {label}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color }}>{days_u !== null ? `in ${days_u}d` : '—'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {pod && pod.podType === 'recurring' && (
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#18181B', marginBottom: 4 }}>{pod.name}</p>
              <p style={{ fontSize: 12, color: '#71717A', marginBottom: 10 }}>{podSummaryLine(pod)}</p>
              <div style={{ overflowX: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: `150px repeat(14, 36px)`, gap: 2, marginBottom: 4 }}>
                  <div style={{ fontSize: 10, color: '#A1A1AA' }}>Task</div>
                  {days.map(d => {
                    const isT = d === today;
                    const active = isDayActive(d);
                    return (
                      <div key={d} style={{ textAlign: 'center', fontSize: 9, color: isT ? '#FF6B6B' : active ? '#18181B' : '#D4D4D8', fontWeight: isT ? 700 : 400, lineHeight: 1.3 }}>
                        <div>{WEEK_DAYS_SHORT[(new Date(d).getDay() + 6) % 7]}</div>
                        <div>{new Date(d).getDate()}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                  {podTasks.map(task => (
                    <div key={task.id} style={{ display: 'grid', gridTemplateColumns: `150px repeat(14, 36px)`, gap: 2, marginBottom: 3, alignItems: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={task.content}>{task.content}</div>
                      {days.map(d => {
                        const active = isDayActive(d);
                        if (!active) return <div key={d} style={{ textAlign: 'center', fontSize: 10, color: '#E4E4E7' }}>·</div>;
                        const log = getPodLog(pod.id, task.id, d);
                        const canEdit = d >= addDays(today, -5);
                        const cycle = (s) => { const c = ['planned','completed','missed']; return c[(c.indexOf(s)+1)%3]; };
                        const icon = { completed: '✅', missed: '❌', planned: '⬜' }[log.status] || '⬜';
                        return (
                          <div key={d} style={{ textAlign: 'center', cursor: canEdit ? 'pointer' : 'default', fontSize: 13 }} onClick={() => canEdit && setPodLog(pod.id, task.id, d, { status: cycle(log.status) })}>
                            {icon}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const views = ['table', 'kanban', '⊕ pools', '↻ pods'];

  return (
    <div>
      {DEBUG_MODE && renderMs && <div style={debugBanner}>⏱ Work Mode init <strong>{renderMs}ms</strong> · {pendingTasks.length} pending · {completedTasks.length} completed</div>}
      <div style={{ ...styles.workTitleRow, marginBottom: 14 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#18181B' }}>Visualise in</span>
        <select value={workView} onChange={e => setWorkView(e.target.value)} style={styles.viewSelector}>
          {views.map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
        </select>
        {DEBUG_MODE && <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>{pendingTasks.length} tasks</span>}
      </div>
      {workView === 'table'    && <TableView />}
      {workView === 'kanban'   && <KanbanView />}
      {workView === '⊕ pools' && <PoolView />}
      {workView === '↻ pods'  && <PodView />}
      <DebugOverlay label={`Work · ${workView}`} timings={display} taskCount={pendingTasks.length} extra={`${pools.length} pools · ${pods.length} pods`} />
    </div>
  );
}

// ============================================================================
// REVIEW MODE VIEW — virtualised 500 reviews with stat cards
// ============================================================================
function ReviewModeView({ reviews, tasks, completedTasks }) {
  const { mark, display } = useDebugTimer('Review Mode');
  const [filterRating, setFilterRating] = useState(0);
  const t0 = useRef(performance.now());
  const [ms, setMs] = useState(null);

  useEffect(() => {
    setMs((performance.now() - t0.current).toFixed(1));
    mark('rendered');
  }, []);

  const stats = useMemo(() => {
    const avg = reviews.length ? reviews.reduce((s, r) => s + r.satisfactionRating, 0) / reviews.length : 0;
    const dist = [1,2,3,4,5].map(r => ({ rating: r, count: reviews.filter(x => x.satisfactionRating === r).length }));
    return { avg, dist, total: reviews.length };
  }, [reviews]);

  const filtered = useMemo(() => filterRating ? reviews.filter(r => r.satisfactionRating === filterRating) : reviews, [reviews, filterRating]);

  return (
    <div>
      {DEBUG_MODE && ms && <div style={debugBanner}>⏱ Review view in <strong>{ms}ms</strong> · {reviews.length} reviews · {completedTasks.length} completed tasks</div>}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Completed', value: completedTasks.length.toLocaleString() },
          { label: 'Avg Rating', value: `${stats.avg.toFixed(1)} ★` },
          { label: 'Reviews', value: stats.total.toLocaleString() },
          { label: 'Pending', value: (tasks.filter(t => !t.isCompleted).length).toLocaleString() },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#18181B' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#71717A', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Rating distribution */}
      <div style={{ backgroundColor: '#F9FAFB', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#71717A', marginBottom: 8 }}>Rating Distribution</p>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 50 }}>
          {stats.dist.map(d => {
            const pct = stats.total ? (d.count / stats.total) * 100 : 0;
            const colors = ['#EF4444','#F97316','#F59E0B','#84CC16','#22C55E'];
            return (
              <div key={d.rating} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }} onClick={() => setFilterRating(filterRating === d.rating ? 0 : d.rating)}>
                <div style={{ fontSize: 10, color: '#71717A' }}>{d.count}</div>
                <div style={{ width: '100%', height: `${Math.max(4, pct * 0.4)}px`, backgroundColor: filterRating === d.rating ? colors[d.rating - 1] : `${colors[d.rating-1]}60`, borderRadius: 3 }} />
                <div style={{ fontSize: 10, color: colors[d.rating-1] }}>{'★'.repeat(d.rating)}</div>
              </div>
            );
          })}
        </div>
        {filterRating > 0 && <p style={{ fontSize: 11, color: '#0EA5E9', marginTop: 6 }}>Filtered: {filterRating}★ only ({filtered.length} reviews) · click bar to clear</p>}
      </div>

      <div style={{ fontSize: 12, color: '#71717A', marginBottom: 6 }}>{filtered.length.toLocaleString()} reviews · virtualised scroll</div>

      <VirtualList
        items={filtered}
        rowHeight={76}
        containerStyle={{ border: '1px solid #E4E4E7', borderRadius: 10 }}
        renderItem={(review, idx) => {
          const task = tasks.find(t => t.id === review.taskId);
          const colors = ['','#EF4444','#F97316','#F59E0B','#84CC16','#22C55E'];
          return (
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #F4F4F5', backgroundColor: idx % 2 === 0 ? '#FAFAFA' : 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#18181B', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task?.content || 'Unknown task'}</span>
                <span style={{ fontSize: 12, color: colors[review.satisfactionRating], fontWeight: 700, flexShrink: 0 }}>{'★'.repeat(review.satisfactionRating)}{'☆'.repeat(5 - review.satisfactionRating)}</span>
              </div>
              <p style={{ fontSize: 11, color: '#71717A', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{review.improvements}</p>
            </div>
          );
        }}
      />
      <DebugOverlay label="Review" timings={display} taskCount={filtered.length} extra={`Avg: ${stats.avg.toFixed(2)}★`} />
    </div>
  );
}

// ============================================================================
// DEBUG BANNER (inline, top of each view)
// ============================================================================
const debugBanner = DEBUG_MODE ? {
  display: 'flex', alignItems: 'center', gap: 8,
  backgroundColor: '#0F172A', color: '#94A3B8',
  fontSize: 11, fontFamily: 'monospace',
  padding: '6px 12px', borderRadius: 6, marginBottom: 10,
  border: '1px solid #1E293B',
} : { display: 'none' };

// ============================================================================
// STYLES
// ============================================================================
const styles = {
  app:               { minHeight: '100vh', backgroundColor: '#FAFAFA', fontFamily: "'Inter', -apple-system, sans-serif" },
  header:            { position: 'sticky', top: 0, backgroundColor: 'white', borderBottom: '1px solid #E4E4E7', zIndex: 100 },
  headerContent:     { maxWidth: '1100px', margin: '0 auto', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo:              { display: 'flex', alignItems: 'center', gap: 8, color: '#FF6B6B', cursor: 'pointer' },
  logoText:          { fontSize: 22, fontWeight: 800, letterSpacing: '-1px' },
  sup:               { fontSize: 12 },
  headerRight:       { display: 'flex', alignItems: 'center', gap: 12 },
  outlineBtn:        { padding: '6px 14px', backgroundColor: 'transparent', border: '1px solid #D4D4D8', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#52525B' },
  ghostBtn:          { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', backgroundColor: 'transparent', color: '#71717A', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' },
  timerBtn:          { width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', color: '#71717A', border: 'none', borderRadius: 6, cursor: 'pointer' },
  checkbox:          { width: 16, height: 16, borderRadius: 4, border: '2px solid #D4D4D8', backgroundColor: 'transparent', cursor: 'pointer', flexShrink: 0 },
  main:              { maxWidth: '1100px', margin: '0 auto', padding: '0 24px' },
  hero:              { textAlign: 'center', padding: '40px 20px 28px' },
  heroContent:       { maxWidth: 560, margin: '0 auto' },
  heroTitle:         { fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 800, color: '#18181B', lineHeight: 1.2, marginBottom: 10 },
  tWord:             { color: '#FF6B6B', display: 'inline-block', minWidth: 120 },
  heroSubtitle:      { fontSize: 15, color: '#71717A', lineHeight: 1.6 },
  guestSection:      { paddingBottom: 60 },
  guestCard:         { backgroundColor: 'white', border: '1px solid #E4E4E7', borderRadius: 16, padding: '20px 24px', maxWidth: 900, margin: '0 auto', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' },
  modeNav:           { display: 'flex', justifyContent: 'center', gap: 4, backgroundColor: '#F4F4F5', padding: 4, borderRadius: 100, marginBottom: 20, flexWrap: 'wrap' },
  modeBtn:           { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: 'transparent', color: '#71717A', border: 'none', borderRadius: 100, fontSize: 14, fontWeight: 500, cursor: 'pointer' },
  modeBtnActive:     { backgroundColor: '#FF6B6B', color: 'white' },
  input:             { padding: '9px 13px', border: '1px solid #D4D4D8', borderRadius: 8, fontSize: 14, outline: 'none', backgroundColor: 'white', width: '100%', boxSizing: 'border-box' },
  workTitleRow:      { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  viewSelector:      { padding: '6px 10px', border: '1px solid #D4D4D8', borderRadius: 8, fontSize: 14, fontWeight: 600, backgroundColor: 'white', cursor: 'pointer', color: '#18181B' },
  podSideItem:       { display: 'flex', alignItems: 'flex-start', gap: 6, padding: '8px 10px', borderRadius: 8, border: '1px solid #E4E4E7', cursor: 'pointer', backgroundColor: 'white' },
};
