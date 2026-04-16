import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// MOCK AUTH HOOK (standalone version - no external dependencies)
// ============================================================================
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const signUp = async (email, password, profileName) => {
    setLoading(true);
    // Mock signup - in production this would use Supabase
    await new Promise(r => setTimeout(r, 500));
    setUser({ email, user_metadata: { profile_name: profileName } });
    setLoading(false);
    return { user: { email } };
  };
  
  const signIn = async (email, password) => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    // Demo credentials
    if (email === 'demo@ot2.app' && password === 'demo123') {
      setUser({ email, user_metadata: { profile_name: 'DemoUser' } });
      setLoading(false);
      return { user: { email } };
    }
    setLoading(false);
    throw new Error('Invalid credentials');
  };
  
  const signOut = async () => {
    setUser(null);
  };
  
  return { user, loading, signUp, signIn, signOut };
};

// ============================================================================
// OT² v3 — Pool · Pod · Wave Edition
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
  PODS: 'ot2_pods',
  POD_LOGS: 'ot2_pod_logs',
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

// === POOL RELATIONSHIP TYPES ===
const RELATIONSHIP_TYPES = [
  { key: 'precede', label: 'Precedes', desc: 'This task comes before', color: '#6366F1', icon: '→' },
  { key: 'follow', label: 'Follows', desc: 'This task comes after', color: '#0EA5E9', icon: '←' },
  { key: 'schedule', label: 'Scheduled With', desc: 'Same sprint / period', color: '#10B981', icon: '⇔' },
  { key: 'accomplish', label: 'Accomplishes With', desc: 'Together meet a goal', color: '#F59E0B', icon: '⊕' },
];

// === POD TYPES ===
const POD_TYPES = [
  { key: 'annual_dates', label: '📅 Annual Dates', desc: 'Each task gets its own specific date in the year — e.g. Birthdays, Anniversaries, Bill payments' },
  { key: 'recurring',    label: '🔁 Recurring Schedule', desc: 'All tasks share a repeating schedule — e.g. Daily exercise, Weekly check-ins, Monthly targets' },
];

// === RECURRENCE TYPES (for recurring pods only) ===
const RECURRENCE_TYPES = [
  { key: 'daily',             label: 'Daily',                  desc: 'Every single day' },
  { key: 'specific_days',     label: 'Specific days of week',  desc: 'Choose which days, e.g. Mon · Wed · Fri' },
  { key: 'every_n_days',      label: 'Every N days',           desc: 'e.g. Every 3 days, Every 2 weeks' },
  { key: 'monthly_frequency', label: 'X times per month',      desc: 'e.g. 3 times a month, on any days you choose' },
];

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEK_DAYS_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Build a human-readable summary for a pod shown in the picker list
const podSummaryLine = (pod) => {
  if (pod.podType === 'annual_dates') return '📅 Annual date per task (birthdays / anniversaries)';
  const r = pod.recurrence || {};
  const trackers = (pod.trackerFields || []).filter(f => f.name).map(f => f.name).join(', ');
  const trackerPart = trackers ? ` · Tracks: ${trackers}` : '';
  if (r.type === 'daily') return `🔁 Every day${trackerPart}`;
  if (r.type === 'specific_days') {
    const days = (r.weekDays || []).sort().map(d => WEEK_DAYS[d]).join(', ');
    return `📅 ${days || 'No days selected'}${trackerPart}`;
  }
  if (r.type === 'every_n_days') return `🔁 Every ${r.everyNDays || '?'} days${trackerPart}`;
  if (r.type === 'monthly_frequency') return `🗓 ${r.frequency || '?'}× per month${trackerPart}`;
  return '—';
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

  // NEW: Pool / Pod / Blink state
  const [pools, setPools] = useState([]);
  const [pods, setPods] = useState([]);
  const [podLogs, setPodLogs] = useState({});

  // Freedom Mode
  const [newTask, setNewTask] = useState('');

  // Focus Mode
  const [focusedTaskId, setFocusedTaskId] = useState(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardAnswers, setWizardAnswers] = useState({});
  const [focusTaskType, setFocusTaskType] = useState('wave');
  const [focusPoolId, setFocusPoolId] = useState(null);
  const [focusPodId, setFocusPodId] = useState(null);
  const [focusRelationships, setFocusRelationships] = useState([]);
  const [focusTypeConfirmed, setFocusTypeConfirmed] = useState(false);
  const [focusPodTaskDate, setFocusPodTaskDate] = useState('');

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

  // Derived
  const pendingTasks = tasks.filter(t => !t.isCompleted);
  const completedTasks = tasks.filter(t => t.isCompleted);
  const focusedTask = tasks.find(t => t.id === focusedTaskId);

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
      const spd = localStorage.getItem(STORAGE_KEYS.PODS);
      const spl2 = localStorage.getItem(STORAGE_KEYS.POD_LOGS);
      if (st) setTasks(JSON.parse(st));
      if (stm) setTimers(JSON.parse(stm));
      if (sr) setReviews(JSON.parse(sr));
      if (spl) setPools(JSON.parse(spl));
      if (spd) setPods(JSON.parse(spd));
      if (spl2) setPodLogs(JSON.parse(spl2));
    } catch (e) { console.error('localStorage load error', e); }
  }, []);

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TIMERS, JSON.stringify(timers)); }, [timers]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews)); }, [reviews]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.POOLS, JSON.stringify(pools)); }, [pools]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.PODS, JSON.stringify(pods)); }, [pods]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.POD_LOGS, JSON.stringify(podLogs)); }, [podLogs]);

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
    setWizardStep(0);
    // ERR-005: pre-populate from existing reflection so prior answers are editable
    setWizardAnswers(task?.reflection ? { ...task.reflection } : {});
    setFocusTaskType(task?.type && task.type !== 'wave' ? task.type : 'wave');
    setFocusPoolId(task?.poolIds?.[0] || null);
    setFocusPodId(task?.podId || null);
    setFocusRelationships([]);
    setFocusTypeConfirmed(!!(task?.reflection)); // skip type step if already qualified
    setFocusPodTaskDate(task?.podTaskDate || '');
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
      }
      if (focusTaskType === 'pod' && focusPodId) {
        updated.podId = focusPodId;
        updated.type = 'pod';
        if (focusPodTaskDate) updated.podTaskDate = focusPodTaskDate;
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

  // POD LOG helpers
  const podLogKey = (podId, taskId, date) => `${podId}_${taskId}_${date}`;
  const getPodLog = (podId, taskId, date) => podLogs[podLogKey(podId, taskId, date)] || { status: 'planned', trackerValues: {} };
  const setPodLog = (podId, taskId, date, updates) => {
    const key = podLogKey(podId, taskId, date);
    const today = todayStr();
    const minDate = addDays(today, -5);
    if (date < minDate) return;
    setPodLogs(prev => ({ ...prev, [key]: { ...getPodLog(podId, taskId, date), ...updates } }));
  };

  // === AUTH FUNCTIONS ===
  const handleLogin = async () => {
    setAuthError('');
    if (!authForm.email || !authForm.password) { setAuthError('Please fill all fields'); return; }
    const { error } = await signIn(authForm.email, authForm.password);
    if (error) { setAuthError(error.message); return; }
    setPage('home');
    setAuthForm({ email: '', profileName: '', password: '', confirmPassword: '' });
  };

  const handleSignup = async () => {
    setAuthError('');
    if (!authForm.email || !authForm.profileName || !authForm.password) { setAuthError('Please fill all fields'); return; }
    if (authForm.password !== authForm.confirmPassword) { setAuthError("Passwords don't match"); return; }
    if (authForm.password.length < 6) { setAuthError('Password must be at least 6 characters'); return; }
    const { error } = await signUp(authForm.email, authForm.password, authForm.profileName);
    if (error) { setAuthError(error.message); return; }
    setPage('home');
    setAuthForm({ email: '', profileName: '', password: '', confirmPassword: '' });
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
        onBack={() => setPage('home')}
      />
    );
  }

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo} onClick={() => setPage('home')}>
            <Icons.Hourglass className="w-6 h-6" />
            <span style={styles.logoText}>OT<sup style={styles.sup}>2</sup></span>
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
        {/* Hero */}
        <div style={styles.hero}>
          <div style={styles.heroContent}>
            <h1 style={styles.heroTitle}>
              On Top of{' '}
              <span style={styles.tWord}>{T_WORDS[tWordIndex]}</span>
              <sup style={{ ...styles.sup, color: '#FF6B6B', fontSize: '28px' }}>2</sup>
            </h1>
            <p style={styles.heroSubtitle}>Fast capture, Socratic Clarity, Timed Execution, Zen Learnings.</p>
          </div>
        </div>

        {/* Guest/App Section */}
        <section style={styles.guestSection}>
          <div style={styles.guestCard}>
            {/* Mode Nav */}
            <div style={styles.modeNav}>
              <ModeButton active={guestMode === 'freedom'} onClick={() => setGuestMode('freedom')} icon={<Icons.Sparkles className="w-4 h-4" />} label="Freedom" />
              <ModeButton active={guestMode === 'focus'} onClick={() => pendingTasks.length > 0 && startFocus(pendingTasks[0].id)} disabled={pendingTasks.length === 0} icon={<Icons.Hourglass className="w-4 h-4" />} label="Focus" />
              <ModeButton active={guestMode === 'work'} onClick={() => setGuestMode('work')} icon={<Icons.Briefcase />} label="Work" />
              <ModeButton active={guestMode === 'review'} onClick={() => setGuestMode('review')} icon={<Icons.BarChart />} label="Review" />
            </div>

            {guestMode === 'freedom' && (
              <FreedomMode
                newTask={newTask} setNewTask={setNewTask} onAddTask={addTask}
                // FEAT-005: only unqualified tasks (no answered reflection) stay in Freedom
                pendingTasks={pendingTasks.filter(t => !t.reflection || !Object.values(t.reflection).some(v => v && String(v).trim()))}
                allPendingCount={pendingTasks.length}
                completedTasks={completedTasks}
                onDeleteTask={deleteTask} onStartFocus={startFocus}
              />
            )}

            {guestMode === 'focus' && focusedTask && (
              <FocusMode
                task={focusedTask}
                pendingTasks={pendingTasks}
                wizardStep={wizardStep} setWizardStep={setWizardStep}
                wizardAnswers={wizardAnswers} setWizardAnswers={setWizardAnswers}
                focusTaskType={focusTaskType} setFocusTaskType={setFocusTaskType}
                focusPoolId={focusPoolId} setFocusPoolId={setFocusPoolId}
                focusPodId={focusPodId} setFocusPodId={setFocusPodId}
                focusRelationships={focusRelationships} setFocusRelationships={setFocusRelationships}
                focusPodTaskDate={focusPodTaskDate} setFocusPodTaskDate={setFocusPodTaskDate}
                focusTypeConfirmed={focusTypeConfirmed}
                onConfirmType={confirmFocusType}
                pools={pools} pods={pods}
                onCreatePool={createPool} onCreatePod={createPod}
                tasks={tasks}
                onFinish={finishFocus} onSkipTask={skipTask}
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
                pools={pools} pods={pods}
                podLogs={podLogs} getPodLog={getPodLog} setPodLog={setPodLog}
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

            <div style={styles.ctaSection}>
              <p style={styles.ctaText}>Create an account to unlock analytics, sync across devices, and more</p>
              <button style={styles.ctaButton} onClick={() => { setPage('auth'); setAuthMode('signup'); }}>
                <Icons.Hourglass className="w-4 h-4" /> Create Free Account
              </button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section style={styles.features}>
          <h2 style={styles.featuresTitle}>Organise with Pools · Pods · Waves</h2>
          <div style={styles.featuresGrid}>
            <FeatureCard icon={<Icons.Layers />} title="Pool" description="Loose-ended groupings. Sprint, goal, category, context — tasks relate to each other within a pool." color="#6366F1" />
            <FeatureCard icon={<Icons.Repeat />} title="Pod" description="Habit-like recurring tasks. Medicine, birthdays, exercise routines — with custom tracker fields." color="#0EA5E9" />
            <FeatureCard icon={<Icons.Feather />} title="Wave" description="Standalone thoughts. A scrap, note or quick task that exists independently." color="#10B981" />
            <FeatureCard icon={<Icons.Brain />} title="Focus Mode" description="Socratic questions help you understand why each task matters." color="#FF6B6B" />
          </div>
        </section>
      </main>

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
            <a key={idx} href={item.url} style={styles.dropdownItem}>
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
      
      <div style={styles.taskArea}>
        {pendingTasks.length === 0 ? (
          <EmptyState icon={<Icons.Sparkles />} message="Add your first task to get started" />
        ) : (
          <div style={styles.taskList}>
            {pendingTasks.map(task => (
              <div key={task.id} style={styles.taskItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  {task.type && task.type !== 'blink' && task.type !== 'wave' && (
                    <span style={{ ...styles.typeBadge, backgroundColor: task.type === 'pool' ? '#6366F115' : '#0EA5E915', color: task.type === 'pool' ? '#6366F1' : '#0EA5E9' }}>
                      {task.type === 'pool' ? '⊕ Pool' : '↻ Pod'}
                    </span>
                  )}
                  <span style={styles.taskContent}>{task.content}</span>
                </div>
                <div style={styles.taskActions}>
                  <button style={styles.ghostBtn} onClick={() => onDeleteTask(task.id)} title="Delete"><Icons.Trash /></button>
                  {/* HIGHLIGHTED FOCUS BUTTON */}
                  <button style={styles.highlightedFocusBtn} onClick={() => onStartFocus(task.id)}>
                    <Icons.Hourglass className="w-3.5 h-3.5" />Focus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// POOL COMBOBOX - Updated with inline Create button
// ============================================================================
function PoolComboBox({ pools, onSelect, onCreatePool, selectedPoolId }) {
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
            <input
              autoFocus
              type="text"
              placeholder="Search or type new pool name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={styles.comboSearchInput}
              onClick={e => e.stopPropagation()}
            />
          ) : selected ? (
            <span style={{ color: '#18181B', fontWeight: 500 }}>⊕ {selected.name}</span>
          ) : (
            <span style={{ color: '#A1A1AA' }}>Search or create a Pool…</span>
          )}
          <Icons.ChevronDown className="w-4 h-4" style={{ flexShrink: 0 }} />
        </div>
        {/* Inline Create Button */}
        {showCreateBtn && (
          <button style={styles.inlineCreateBtn} onClick={handleCreate}>
            <Icons.Plus className="w-4 h-4" /> Create
          </button>
        )}
      </div>
      {open && (
        <div style={styles.comboDropdown}>
          <div style={{ maxHeight: 160, overflowY: 'auto' }}>
            {filtered.length === 0 && !search && <p style={{ color: '#A1A1AA', fontSize: 13, padding: '4px 0' }}>No pools yet</p>}
            {filtered.map(p => (
              <div key={p.id} style={{ ...styles.comboOption, ...(p.id === selectedPoolId ? { backgroundColor: '#6366F115', fontWeight: 600 } : {}) }} onClick={() => { onSelect(p.id); setOpen(false); setSearch(''); }}>
                ⊕ {p.name}
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
// ============================================================================
function PodComboBox({ pods, onSelect, onCreatePod, selectedPodId }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const ref = useRef(null);

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
        <div style={{ ...styles.comboInput, flex: 1 }} onClick={() => setOpen(true)}>
          {open ? (
            <input
              autoFocus
              type="text"
              placeholder="Search or type new pod name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={styles.comboSearchInput}
              onClick={e => e.stopPropagation()}
            />
          ) : selected ? (
            <span style={{ color: '#18181B', fontWeight: 500 }}>↻ {selected.name}</span>
          ) : (
            <span style={{ color: '#A1A1AA' }}>Search or create a Pod…</span>
          )}
          <Icons.ChevronDown className="w-4 h-4" style={{ flexShrink: 0 }} />
        </div>
        {showCreateBtn && (
          <button style={{ ...styles.inlineCreateBtn, backgroundColor: '#0EA5E9' }} onClick={handleQuickCreate}>
            <Icons.Plus className="w-4 h-4" /> Create
          </button>
        )}
      </div>
      {open && (
        <div style={styles.comboDropdown}>
          <div style={{ maxHeight: 160, overflowY: 'auto' }}>
            {filtered.length === 0 && !search && <p style={{ color: '#A1A1AA', fontSize: 13, padding: '4px 0' }}>No pods yet</p>}
            {filtered.map(p => (
              <div key={p.id} style={{ ...styles.comboOption, ...(p.id === selectedPodId ? { backgroundColor: '#0EA5E915', fontWeight: 600 } : {}) }} onClick={() => { onSelect(p.id); setOpen(false); setSearch(''); }}>
                <div>
                  <span style={{ fontWeight: 500 }}>↻ {p.name}</span>
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
      <p style={styles.relTitle}>Set relationships within <strong>{pool.name}</strong></p>
      {poolTasks.length === 0 ? (
        <p style={{ color: '#A1A1AA', fontSize: 13 }}>No other tasks in this pool yet — relationships can be added later.</p>
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
            + Create pod with advanced options
          </button>
        </>
      ) : (
        <div style={styles.podForm}>
          <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: '#0EA5E9' }}>↻ New Pod</p>

          <label style={styles.label}>Pod name</label>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Birthdays, Outdoor Activities, Medication" style={{ ...styles.input, marginBottom: 14 }} />

          <label style={styles.label}>Pod type</label>
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
            <button style={{ ...styles.primaryBtn, backgroundColor: '#0EA5E9' }} onClick={handleCreate}>Create Pod</button>
            <button style={styles.ghostBtn} onClick={() => setCreating(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
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
// FOCUS MODE
// ============================================================================
function FocusMode({
  task, pendingTasks,
  wizardStep, setWizardStep, wizardAnswers, setWizardAnswers,
  focusTaskType, setFocusTaskType, focusPoolId, setFocusPoolId,
  focusPodId, setFocusPodId, focusRelationships, setFocusRelationships,
  focusPodTaskDate, setFocusPodTaskDate,
  focusTypeConfirmed, onConfirmType,
  pools, pods, onCreatePool, onCreatePod, tasks, onFinish, onSkipTask,
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    const loadQuestions = async () => {
      setIsLoading(true);
      try {
        const result = await AICoachingService.getCoachingQuestions(task.content, wizardAnswers);
        setQuestions(result.questions || FALLBACK_QUESTIONS);
      } catch {
        setQuestions(FALLBACK_QUESTIONS);
      }
      setIsLoading(false);
    };
    loadQuestions();
  }, [task.id]);

  // ERR-005: pre-fill answers from task.reflection
  useEffect(() => {
    if (task.reflection) {
      setWizardAnswers(prev => {
        const merged = { ...prev };
        questions.forEach(q => { if (!merged[q.key] && task.reflection[q.key]) merged[q.key] = task.reflection[q.key]; });
        return merged;
      });
    }
  }, [task.id, questions]);

  const totalQuestions = questions.length;
  const currentQuestion = questions[wizardStep];

  const addRelationship = (rel) => setFocusRelationships(prev => [...prev, rel]);
  const removeRelationship = (idx) => setFocusRelationships(prev => prev.filter((_, i) => i !== idx));

  const getPurposeColor = (p) => ({ kanban: '#4299E1', quadrant: '#48BB78', energy: '#F59E0B', all: '#FF6B6B' }[p] || '#FF6B6B');

  if (isLoading) return (
    <div style={styles.focusMode}>
      <div style={styles.focusHeader}><p style={styles.focusLabel}>Analysing your task…</p><h3 style={styles.focusTask}>{task.content}</h3></div>
      <div style={styles.loadingCard}><Icons.Loader className="w-8 h-8" /><p style={styles.loadingText}>Generating coaching questions…</p></div>
    </div>
  );

  return (
    <div style={styles.focusMode}>
      {/* Progress dots */}
      <div style={styles.progressDots}>
        {pendingTasks.map(t => (
          <div key={t.id} style={{ ...styles.dot, ...(t.id === task.id ? styles.dotActive : {}) }} />
        ))}
      </div>

      <div style={styles.focusHeader}>
        <p style={styles.focusLabel}>Currently focusing on:</p>
        <h3 style={styles.focusTask}>{task.content}</h3>
      </div>

      {/* STEP 0: Task type selection (if not confirmed) */}
      {!focusTypeConfirmed ? (
        <div style={styles.wizardCard}>
          <p style={{ fontSize: 13, color: '#71717A', marginBottom: 6 }}>Before we go deeper — where does this task live?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {[
              { key: 'wave', label: '⚡ Wave', desc: 'Standalone note / quick task', color: '#10B981' },
              { key: 'pool', label: '⊕ Pool', desc: 'Part of a group / project / sprint', color: '#6366F1' },
              { key: 'pod', label: '↻ Pod', desc: 'Recurring habit / scheduled routine', color: '#0EA5E9' },
            ].map(opt => (
              <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `2px solid ${focusTaskType === opt.key ? opt.color : '#E4E4E7'}`, cursor: 'pointer', backgroundColor: focusTaskType === opt.key ? `${opt.color}10` : 'white', transition: 'all .15s' }}>
                <input type="radio" name="taskType" value={opt.key} checked={focusTaskType === opt.key} onChange={() => setFocusTaskType(opt.key)} style={{ accentColor: opt.color }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: focusTaskType === opt.key ? opt.color : '#18181B' }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: '#71717A' }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>

          {/* Pool sub-UI */}
          {focusTaskType === 'pool' && (
            <div style={{ marginBottom: 16 }}>
              <label style={styles.label}>Select or create a Pool</label>
              <PoolComboBox pools={pools} onSelect={setFocusPoolId} onCreatePool={onCreatePool} selectedPoolId={focusPoolId} />
              {focusPoolId && (
                <PoolRelationshipPanel
                  currentTaskId={task.id}
                  poolId={focusPoolId}
                  pools={pools}
                  tasks={tasks}
                  relationships={focusRelationships}
                  onAddRelationship={addRelationship}
                  onRemoveRelationship={removeRelationship}
                />
              )}
            </div>
          )}

          {/* Pod sub-UI */}
          {focusTaskType === 'pod' && (
            <div style={{ marginBottom: 16 }}>
              <label style={styles.label}>Select or create a Pod</label>
              <PodPicker pods={pods} selectedPodId={focusPodId} onSelect={setFocusPodId} onCreatePod={onCreatePod} />

              {/* Date picker for annual_dates pods */}
              {focusPodId && (() => {
                const selPod = pods.find(p => p.id === focusPodId);
                if (!selPod || selPod.podType !== 'annual_dates') return null;
                return (
                  <div style={{ marginTop: 14, backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 10, padding: 14 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0369A1', marginBottom: 8 }}>
                      📅 When in the year does <em>"{task.content}"</em> happen?
                    </p>
                    <p style={{ fontSize: 12, color: '#71717A', marginBottom: 10 }}>
                      Pick the day and month only — the year is ignored, this recurs annually.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="date"
                        value={focusPodTaskDate ? `${new Date().getFullYear()}-${focusPodTaskDate}` : `${new Date().toISOString().slice(0, 10)}`}
                        onChange={e => {
                          const val = e.target.value;
                          if (val) setFocusPodTaskDate(val.slice(5));
                        }}
                        style={{ ...styles.input, flex: 1 }}
                      />
                      {focusPodTaskDate && (
                        <span style={{ fontSize: 13, color: '#0369A1', fontWeight: 600 }}>
                          📌 {new Date(`${new Date().getFullYear()}-${focusPodTaskDate}`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <button style={styles.primaryBtn} onClick={onConfirmType} disabled={
            (focusTaskType === 'pool' && !focusPoolId) ||
            (focusTaskType === 'pod' && !focusPodId) ||
            (focusTaskType === 'pod' && focusPodId && (() => { const p = pods.find(x => x.id === focusPodId); return p?.podType === 'annual_dates' && !focusPodTaskDate; })())
          }>
            Continue <Icons.ChevronRight />
          </button>
        </div>
      ) : wizardStep < totalQuestions && currentQuestion ? (
        /* Socratic Questions */
        <div style={styles.wizardCard}>
          <div style={styles.questionHeader}>
            <p style={styles.wizardProgress}>Question {wizardStep + 1} of {totalQuestions}</p>
            <span style={{ ...styles.purposeBadge, backgroundColor: getPurposeColor(currentQuestion.purpose) + '20', color: getPurposeColor(currentQuestion.purpose) }}>
              {currentQuestion.purpose === 'kanban' && '📅 Timeline'}
              {currentQuestion.purpose === 'quadrant' && '🎯 Priority'}
              {currentQuestion.purpose === 'energy' && '⚡ Effort'}
              {currentQuestion.purpose === 'all' && '✨ Clarity'}
            </span>
          </div>
          <h4 style={styles.wizardQuestion}>{currentQuestion.question}</h4>
          <textarea
            placeholder={currentQuestion.placeholder}
            value={wizardAnswers[currentQuestion.key] || ''}
            onChange={e => setWizardAnswers(p => ({ ...p, [currentQuestion.key]: e.target.value }))}
            style={styles.textarea}
            autoFocus
          />
          {!currentQuestion.required && <p style={styles.optionalHint}>Optional — skip if not relevant</p>}
          <div style={styles.wizardActions}>
            <button style={styles.ghostBtn} onClick={() => setWizardStep(s => Math.max(0, s - 1))} disabled={wizardStep === 0}><Icons.ArrowLeft />Back</button>
            <div style={styles.wizardRightActions}>
              {!currentQuestion.required && <button style={styles.ghostBtn} onClick={() => setWizardStep(s => s + 1)}>Skip</button>}
              <button style={styles.primaryBtn} onClick={() => setWizardStep(s => s + 1)}>{wizardStep === totalQuestions - 1 ? 'Finish' : 'Next'}<Icons.ChevronRight /></button>
            </div>
          </div>
        </div>
      ) : (
        /* Done */
        <DoneCard
          wizardAnswers={wizardAnswers}
          questions={questions}
          setQuestions={setQuestions}
          setWizardStep={setWizardStep}
          setWizardAnswers={setWizardAnswers}
          onFinish={onFinish}
          task={task}
        />
      )}

      {onSkipTask && (
        <div style={styles.skipSection}><button style={styles.linkBtn} onClick={onSkipTask}>Skip this task for now</button></div>
      )}
    </div>
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
  pools, pods, podLogs, getPodLog, setPodLog,
}) {
  const [contextFilter, setContextFilter] = useState('waves');
  const [strategyView, setStrategyView] = useState('list');
  const [poolStrategyView, setPoolStrategyView] = useState('list');
  const [selectedPoolId, setSelectedPoolId] = useState(null);
  const [selectedPodId, setSelectedPodId] = useState(null);
  const [showRelationshipGraph, setShowRelationshipGraph] = useState(false);
  const reviewTask = tasks.find(t => t.id === reviewTaskId);

  // Waves = tasks not in any Pool or Pod
  const waveTasks = pendingTasks.filter(t => !(t.poolIds?.length) && !t.podId);

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

  // TaskCard component with all reflection answers
  const TaskCard = ({ task, compact = false, showPoolInfo = true }) => {
    const elapsed = getElapsedSeconds(task.id);
    const running = isTimerRunning(task.id);
    const paused = isTimerPaused(task.id);
    const poolName = getPoolName(task);
    const relationships = getTaskRelationships(task);
    
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

    return (
      <div style={styles.workTaskCard}>
        <div style={styles.workTaskHeader}>
          <button style={styles.checkbox} onClick={() => onCompleteTask(task.id)} />
          <div style={{ flex: 1 }}>
            <span 
              style={styles.workTaskTitle} 
              onClick={() => onStartFocus(task.id)}
              title="Click to focus on this task"
            >
              {task.content}
            </span>
            
            {/* Type badge with pool name */}
            <div style={styles.taskMetaRow}>
              {task.type === 'pool' && poolName && (
                <span style={styles.poolBadge}>Pool: {poolName}</span>
              )}
              {task.type === 'pod' && <span style={styles.podBadge}>↻ Pod</span>}
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
        
        {/* Pool relationships */}
        {showPoolInfo && relationships.length > 0 && (
          <div style={styles.relationshipsSection}>
            {relationships.map((rel, idx) => {
              const rt = RELATIONSHIP_TYPES.find(x => x.key === rel.type);
              const otherTaskId = rel.fromTaskId === task.id ? rel.toTaskId : rel.fromTaskId;
              const otherTask = tasks.find(t => t.id === otherTaskId);
              return (
                <span 
                  key={idx} 
                  style={{ ...styles.relationshipTag, backgroundColor: `${rt?.color}15`, color: rt?.color }}
                  onClick={() => onStartFocus(otherTaskId)}
                  title="Click to navigate to this task"
                >
                  {rt?.icon} {rt?.label}: {otherTask?.content?.substring(0, 25)}…
                </span>
              );
            })}
          </div>
        )}
        
        {/* Actions */}
        <div style={styles.workTaskActions}>
          <FocusBtn taskId={task.id} />
          
          {/* Timer controls - Updated with Start Work Block / Pause / Stop */}
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
        </div>
      </div>
    );
  };

  // List Waves View (default view)
  const ListWavesView = () => (
    <div style={styles.listWavesContainer}>
      {waveTasks.length === 0 ? (
        <EmptyState icon={<Icons.Briefcase className="w-8 h-8" />} message="No waves here. Add tasks in Freedom mode, or check Pools & Pods!" action={{ label: 'Go to Freedom Mode', onClick: onGoToFreedom }} />
      ) : (
        waveTasks.map(task => <TaskCard key={task.id} task={task} />)
      )}
    </div>
  );

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

    // ── Kanban lanes for pool tasks ──
    const poolKanbanLanes = { today: { title: 'Today', color: '#FF6B6B', tasks: [] }, future: { title: 'Future', color: '#4299E1', tasks: [] }, missed: { title: 'Missed', color: '#F59E0B', tasks: [] }, notplanned: { title: 'Not Planned', color: '#A1A1AA', tasks: [] } };
    poolTasks.forEach(t => poolKanbanLanes[categorizeByDeadline(t)].tasks.push(t));

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
        <span style={{ fontSize: 14, fontWeight: 600, color: '#71717A' }}>Pool:</span>
        <select value={selectedPoolId || ''} onChange={e => setSelectedPoolId(e.target.value)} style={{ ...styles.input, flex: 1, maxWidth: 300 }}>
          <option value="">— Select a Pool —</option>
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

    if (!selectedPoolId) return <><PoolHeader /><EmptyState icon={<Icons.Layers className="w-8 h-8" />} message="Select a Pool to see its tasks" /></>;

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
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{poolTasks.map(task => <TaskCard key={task.id} task={task} />)}</div>
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
            ✨ <strong>DailyZen</strong> · AI picks focus from <strong>{pool.name}</strong> — 1 deep, 3 necessity, 5 light.
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

    return <PoolHeader />;
  };

  // Pod View
  const PodView = () => {
    const today = todayStr();
    const pod = pods.find(p => p.id === selectedPodId);
    const podTasks = tasks.filter(t => t.podId === selectedPodId);

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

    // ── Recurring sub-view (calendar grid) ──
    const RecurringView = () => {
      const days = Array.from({ length: 14 }, (_, i) => addDays(addDays(today, -6), i));

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

      const statusIcon = (s) => ({ completed: '✅', missed: '❌', planned: '⬜' }[s] || '⬜');
      const cycleStatus = (cur) => { const c = ['planned','completed','missed']; return c[(c.indexOf(cur)+1)%3]; };

      return (
        <>
          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 12, color: '#71717A' }}>{podSummaryLine(pod)} · {podTasks.length} tasks assigned</p>
          </div>

          {/* Day header */}
          <div style={{ display: 'grid', gridTemplateColumns: `160px repeat(14, 38px)`, gap: 3, marginBottom: 4, overflowX: 'auto' }}>
            <div style={{ fontSize: 11, color: '#A1A1AA', padding: '2px 4px' }}>Task / Tracker</div>
            {days.map(d => {
              const isT = d === today;
              const active = isDayActive(d);
              return (
                <div key={d} style={{ textAlign: 'center', fontSize: 10, color: isT ? '#FF6B6B' : (active ? '#18181B' : '#D4D4D8'), fontWeight: isT ? 700 : 400, lineHeight: 1.3 }}>
                  <div>{WEEK_DAYS_SHORT[(new Date(d).getDay() + 6) % 7]}</div>
                  <div>{new Date(d).getDate()}</div>
                </div>
              );
            })}
          </div>

          {podTasks.length === 0 && <p style={{ fontSize: 13, color: '#A1A1AA', padding: '8px 0' }}>No tasks assigned. Use Focus Mode to add tasks to this Pod.</p>}

          {podTasks.map(task => (
            <div key={task.id}>
              <div style={{ display: 'grid', gridTemplateColumns: `160px repeat(14, 38px)`, gap: 3, marginBottom: 2, alignItems: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#18181B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 4px' }} title={task.content}>{task.content}</div>
                {days.map(d => {
                  const active = isDayActive(d);
                  if (!active) return <div key={d} style={{ textAlign: 'center', fontSize: 12, color: '#E4E4E7' }}>·</div>;
                  const log = getPodLog(pod.id, task.id, d);
                  const canEdit = d <= today && d >= addDays(today, -7);
                  return (
                    <div key={d} style={{ textAlign: 'center', cursor: canEdit ? 'pointer' : 'default', opacity: d > today ? 0.35 : 1 }} title={d > today ? 'Future dates are locked' : canEdit ? 'Click to cycle: planned → done → missed' : 'Locked (older than 7 days)'} onClick={() => canEdit && setPodLog(pod.id, task.id, d, { status: cycleStatus(log.status) })}>
                      <span style={{ fontSize: 14 }}>{statusIcon(log.status)}</span>
                    </div>
                  );
                })}
              </div>
              {(pod.trackerFields || []).filter(f => f.name).map(field => (
                <div key={field.id} style={{ display: 'grid', gridTemplateColumns: `160px repeat(14, 38px)`, gap: 3, marginBottom: 2, alignItems: 'center' }}>
                  <div style={{ fontSize: 11, color: '#71717A', paddingLeft: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>↳ {field.name}</div>
                  {days.map(d => {
                    const active = isDayActive(d);
                    if (!active) return <div key={d} />;
                    const log = getPodLog(pod.id, task.id, d);
                    const val = (log.trackerValues || {})[field.id] || '';
                    const canEdit = d <= today && d >= addDays(today, -7);
                    if (field.type === 'checkbox') return (
                      <div key={d} style={{ textAlign: 'center', opacity: d > today ? 0.35 : 1 }}>
                        <input type="checkbox" checked={val === 'true'} disabled={!canEdit} onChange={e => setPodLog(pod.id, task.id, d, { trackerValues: { ...(log.trackerValues || {}), [field.id]: e.target.checked ? 'true' : 'false' } })} style={{ cursor: canEdit ? 'pointer' : 'default' }} />
                      </div>
                    );
                    return (
                      <input key={d} type="text" value={val} disabled={!canEdit} onChange={e => setPodLog(pod.id, task.id, d, { trackerValues: { ...(log.trackerValues || {}), [field.id]: e.target.value } })} style={{ width: '100%', fontSize: 10, padding: '2px 3px', border: '1px solid #E4E4E7', borderRadius: 3, textAlign: 'center', backgroundColor: canEdit ? 'white' : '#F9FAFB', color: canEdit ? '#18181B' : '#A1A1AA', opacity: d > today ? 0.35 : 1 }} />
                    );
                  })}
                </div>
              ))}
              <div style={{ height: 8 }} />
            </div>
          ))}

          <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
            {[['planned','⬜','#D4D4D8'],['completed','✅','#10B981'],['missed','❌','#EF4444']].map(([s,icon,color]) => (
              <span key={s} style={{ fontSize: 11, color, display: 'flex', alignItems: 'center', gap: 4 }}>{icon} {s}</span>
            ))}
            <span style={{ fontSize: 11, color: '#A1A1AA' }}>· = not scheduled · click to cycle · future dates locked · editable: today &amp; past 7 days</span>
          </div>
        </>
      );
    };

    return (
      <div style={{ display: 'flex', gap: 16, overflow: 'hidden' }}>
        {/* Left: Pod list */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#71717A', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Pods</p>
          {pods.length === 0 && <p style={{ fontSize: 13, color: '#A1A1AA' }}>No pods yet</p>}
          {pods.map(p => (
            <div key={p.id} onClick={() => setSelectedPodId(p.id)} style={{ ...styles.podSideItem, ...(p.id === selectedPodId ? { backgroundColor: '#0EA5E915', borderColor: '#0EA5E9' } : {}) }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Icons.Repeat className="w-3.5 h-3.5" style={{ color: '#0EA5E9', flexShrink: 0 }} />
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
          {!pod && <EmptyState icon={<Icons.Repeat className="w-8 h-8" />} message="Select a Pod to see its schedule" />}
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
          {/* Level 1: Context filter */}
          <span style={styles.workTitleText}>View</span>
          <select
            value={contextFilter}
            onChange={e => setContextFilter(e.target.value)}
            style={styles.viewSelector}
          >
            <option value="waves">⚡ Waves</option>
            <option value="pools">⊕ Pools</option>
            <option value="pods">↻ Pods</option>
          </select>

          {/* Level 2: Strategy filter — for Waves and Pools */}
          {(contextFilter === 'waves' || contextFilter === 'pools') && (
            <>
              <span style={{ ...styles.workTitleText, marginLeft: 8 }}>as</span>
              <select
                value={contextFilter === 'waves' ? strategyView : poolStrategyView}
                onChange={e => contextFilter === 'waves' ? setStrategyView(e.target.value) : setPoolStrategyView(e.target.value)}
                style={styles.viewSelector}
              >
                <option value="list">List</option>
                <option value="kanban">Kanban</option>
                <option value="dailyzen">DailyZen</option>
                <option value="workiq">WorkIQ 4×4</option>
              </select>
            </>
          )}
        </div>
        <p style={styles.workSubtitle}>
          {contextFilter === 'waves'  && strategyView === 'list'    && `${waveTasks.length} standalone waves · full detail list`}
          {contextFilter === 'waves'  && strategyView === 'kanban'  && 'Waves organised by deadline'}
          {contextFilter === 'waves'  && strategyView === 'dailyzen' && '1 deep · 3 necessity · 5 lighten-up — AI curated'}
          {contextFilter === 'waves'  && strategyView === 'workiq'  && 'AI-slotted into your WorkIQ 4×4 quadrants'}
          {contextFilter === 'pools'  && poolStrategyView === 'list'     && 'Pool tasks · full detail list'}
          {contextFilter === 'pools'  && poolStrategyView === 'kanban'   && 'Pool tasks organised by deadline'}
          {contextFilter === 'pools'  && poolStrategyView === 'dailyzen' && 'Pool tasks · AI curated 1-3-5 focus'}
          {contextFilter === 'pools'  && poolStrategyView === 'workiq'   && 'Pool tasks · WorkIQ 4×4 quadrants'}
          {contextFilter === 'pods'   && 'Recurring Pod tasks — calendar heatmap view'}
        </p>
      </div>

      {/* Review Modal */}
      {reviewTaskId && reviewTask && (
        <div style={styles.reviewModal}>
          <h4 style={styles.reviewTitle}>How did it go?</h4>
          <p style={styles.reviewSubtitle}>Rate your satisfaction with "{reviewTask.content}"</p>
          <div style={styles.ratingButtons}>
            {[1, 2, 3, 4, 5].map(r => (
              <button key={r} style={{ ...styles.ratingBtn, ...(satisfactionRating === r ? styles.ratingBtnActive : {}) }} onClick={() => setSatisfactionRating(r)}>
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

      {/* View rendering */}
      {contextFilter === 'waves' && waveTasks.length === 0 && strategyView !== 'dailyzen' && strategyView !== 'workiq' ? (
        <EmptyState icon={<Icons.Briefcase className="w-8 h-8" />} message="No standalone waves. Add tasks in Freedom mode, or they may be in Pools / Pods!" action={{ label: 'Go to Freedom Mode', onClick: onGoToFreedom }} />
      ) : (
        <>
          {contextFilter === 'waves'  && strategyView === 'list'    && <ListWavesView />}
          {contextFilter === 'waves'  && strategyView === 'kanban'  && <KanbanView />}
          {contextFilter === 'waves'  && strategyView === 'dailyzen' && <DailyZenView />}
          {contextFilter === 'waves'  && strategyView === 'workiq'  && <WorkIQ4x4View />}
          {contextFilter === 'pools'  && <PoolView />}
          {contextFilter === 'pods'   && <PodView />}
        </>
      )}
    </div>
  );
}

// ============================================================================
// RELATIONSHIP GRAPH - Visual representation of task relationships
// ============================================================================
function RelationshipGraph({ pool, tasks, allTasks, relationships, onTaskClick }) {
  const [hoveredNode, setHoveredNode] = useState(null);
  
  if (tasks.length === 0) {
    return <EmptyState icon={<Icons.GitBranch className="w-8 h-8" />} message="No tasks in this pool to visualize" />;
  }

  // Calculate positions for nodes in a circular layout
  const centerX = 300;
  const centerY = 200;
  const radius = 150;
  const nodePositions = {};
  
  tasks.forEach((task, idx) => {
    const angle = (2 * Math.PI * idx) / tasks.length - Math.PI / 2;
    nodePositions[task.id] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  return (
    <div style={styles.graphContainer}>
      <p style={styles.graphTitle}>Relationship Graph for Pool: {pool.name}</p>
      <svg width="600" height="400" style={styles.graphSvg}>
        {/* Draw relationship arrows */}
        {relationships.map((rel, idx) => {
          const from = nodePositions[rel.fromTaskId];
          const to = nodePositions[rel.toTaskId];
          if (!from || !to) return null;
          
          const rt = RELATIONSHIP_TYPES.find(x => x.key === rel.type);
          
          // Calculate arrow direction
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const nx = dx / len;
          const ny = dy / len;
          
          // Offset from node centers
          const startX = from.x + nx * 30;
          const startY = from.y + ny * 30;
          const endX = to.x - nx * 30;
          const endY = to.y - ny * 30;
          
          return (
            <g key={idx}>
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={rt?.color || '#94A3B8'}
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
              <text
                x={(startX + endX) / 2}
                y={(startY + endY) / 2 - 8}
                fill={rt?.color || '#71717A'}
                fontSize="10"
                textAnchor="middle"
              >
                {rt?.label}
              </text>
            </g>
          );
        })}
        
        {/* Arrow marker definition */}
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#6366F1" />
          </marker>
        </defs>
        
        {/* Draw task nodes */}
        {tasks.map(task => {
          const pos = nodePositions[task.id];
          const isHovered = hoveredNode === task.id;
          
          return (
            <g 
              key={task.id}
              style={{ cursor: 'pointer' }}
              onClick={() => onTaskClick(task.id)}
              onMouseEnter={() => setHoveredNode(task.id)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isHovered ? 35 : 28}
                fill={isHovered ? '#6366F1' : 'white'}
                stroke="#6366F1"
                strokeWidth="2"
              />
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={isHovered ? 'white' : '#18181B'}
                fontSize="10"
                fontWeight="500"
              >
                {task.content.substring(0, 12)}…
              </text>
            </g>
          );
        })}
      </svg>
      <p style={styles.graphHint}>Click on a node to focus on that task</p>
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
                          <button key={r} style={{ ...styles.ratingBtn, ...(editRating === r ? styles.ratingBtnActive : {}) }} onClick={() => setEditRating(r)}>
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
// AUTH PAGE
// ============================================================================
function AuthPage({ authMode, setAuthMode, authForm, setAuthForm, authLoading, authError, onLogin, onBack }) {
  const update = (f, v) => setAuthForm(p => ({ ...p, [f]: v }));
  return (
    <div style={styles.authPage}>
      <div style={styles.authContainer}>
        <div style={styles.authLogo}><Icons.Hourglass className="w-8 h-8" /><span style={styles.logoText}>OT<sup style={styles.sup}>2</sup></span></div>
        <div style={styles.authCard}>
          <div style={styles.authHeader}><h1 style={styles.authTitle}>Welcome Back</h1><p style={styles.authSubtitle}>Sign in to sync your tasks</p></div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <div style={styles.inputWrapper}><Icons.Mail style={styles.inputIcon} /><input type="email" placeholder="you@example.com" value={authForm.email} onChange={e => update('email', e.target.value)} style={styles.authInput} /></div>
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}><Icons.Lock style={styles.inputIcon} /><input type="password" placeholder="••••••••" value={authForm.password} onChange={e => update('password', e.target.value)} style={styles.authInput} /></div>
          </div>
          {authError && <p style={styles.authError}>{authError}</p>}
          <button type="button" style={{ ...styles.authPrimaryBtn, width: '100%' }} disabled={authLoading} onClick={onLogin}>
            {authLoading ? <Icons.Loader /> : 'Sign In'}
          </button>
          <p style={{ fontSize: 12, color: '#71717A', marginTop: 12, textAlign: 'center' }}>Demo: demo@ot2.app / demo123</p>
        </div>
        <button style={styles.backToHome} onClick={onBack}><Icons.ArrowLeft className="w-4 h-4" />Back to home</button>
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
// STYLES
// ============================================================================
const styles = {
  app: { minHeight: '100vh', backgroundColor: '#FAFAFA', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  header: { position: 'sticky', top: 0, backgroundColor: 'white', borderBottom: '1px solid #E4E4E7', zIndex: 100 },
  headerContent: { maxWidth: '1100px', margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo: { display: 'flex', alignItems: 'center', gap: '8px', color: '#FF6B6B', cursor: 'pointer' },
  logoText: { fontSize: '24px', fontWeight: '800', letterSpacing: '-1px' },
  sup: { fontSize: '14px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  greeting: { fontSize: '14px', color: '#52525B', fontWeight: '500' },
  primaryBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#FF6B6B', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  outlineBtn: { padding: '8px 16px', backgroundColor: 'transparent', border: '1px solid #D4D4D8', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', color: '#52525B' },
  ghostBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: 'transparent', color: '#71717A', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' },
  linkBtn: { background: 'none', border: 'none', color: '#FF6B6B', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: 4 },
  main: { maxWidth: '1100px', margin: '0 auto', padding: '0 24px' },
  hero: { textAlign: 'center', padding: '48px 20px 32px' },
  heroContent: { maxWidth: '560px', margin: '0 auto' },
  heroTitle: { fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: '800', color: '#18181B', lineHeight: 1.2, marginBottom: '12px' },
  tWord: { color: '#FF6B6B', display: 'inline-block', minWidth: '140px', textAlign: 'left' },
  heroSubtitle: { fontSize: '16px', color: '#71717A', lineHeight: 1.6 },
  guestSection: { paddingBottom: '60px' },
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
  graphTitle: { fontSize: 14, fontWeight: 600, color: '#18181B', marginBottom: 16 },
  graphSvg: { display: 'block', margin: '0 auto', backgroundColor: 'white', borderRadius: 8, border: '1px solid #E4E4E7' },
  graphHint: { fontSize: 12, color: '#71717A', textAlign: 'center', marginTop: 12 },
  
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
  progressDots: { display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' },
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
  inputIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#A1A1AA', width: 16, height: 16 },
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

// Add CSS animation for highlighted focus button
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes pulse {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.4); }
    50% { transform: scale(1.02); box-shadow: 0 0 0 6px rgba(255, 107, 107, 0); }
  }
`;
if (typeof document !== 'undefined') {
  document.head.appendChild(styleSheet);
}
