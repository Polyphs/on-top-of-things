import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth.js';  // ← ADD THIS LINE

// ============================================================================
// OT² v3 — Pool · Pod · Blink Edition
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
// annual_dates: each task in the pod gets its own specific MM-DD date (birthdays, anniversaries, bill payments)
// recurring:    the pod has a shared recurrence schedule + tracker fields (habits, exercise, routines)
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
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
export default function OT2App() {
  const [page, setPage] = useState('home');
  const [tWordIndex, setTWordIndex] = useState(0);

  // Auth
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
  const [podLogs, setPodLogs] = useState({}); // { podId_taskId_date: { status, trackerValues } }

  // Freedom Mode
  const [newTask, setNewTask] = useState('');

  // Focus Mode
  const [focusedTaskId, setFocusedTaskId] = useState(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardAnswers, setWizardAnswers] = useState({});
  // NEW: Focus mode task-type selection
  const [focusTaskType, setFocusTaskType] = useState('blink');       // 'blink' | 'pool' | 'pod'
  const [focusPoolId, setFocusPoolId] = useState(null);
  const [focusPodId, setFocusPodId] = useState(null);
  const [focusRelationships, setFocusRelationships] = useState([]);  // [{ toTaskId, type }]
  const [focusTypeConfirmed, setFocusTypeConfirmed] = useState(false);
  const [focusPodTaskDate, setFocusPodTaskDate] = useState('');    // MM-DD for annual_dates pods

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
      if (su) { setUser(JSON.parse(su)); setIsAuthenticated(true); }
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

  // Auto-show video modal on Freedom Mode first load
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
    const task = { id: uid(), content: newTask.trim(), createdAt: Date.now(), isCompleted: false, reflection: null, type: 'blink', poolIds: [], podId: null };
    setTasks(p => [task, ...p]);
    setNewTask('');
  };
  const deleteTask = (id) => { setTasks(p => p.filter(t => t.id !== id)); stopTimer(id); };
  const completeTask = (id) => {
    setTasks(p => p.map(t => t.id === id ? { ...t, isCompleted: true, completedAt: new Date().toISOString() } : t));
    stopTimer(id);
    setReviewTaskId(id); setSatisfactionRating(0); setImprovements('');
  };
  const submitReview = () => {
    if (!reviewTaskId || satisfactionRating === 0) return;
    setReviews(p => [{ taskId: reviewTaskId, satisfactionRating, improvements, completedAt: Date.now() }, ...p]);
    setReviewTaskId(null); setSatisfactionRating(0); setImprovements('');
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
    setFocusTaskType(task?.type && task.type !== 'blink' ? task.type : 'blink');
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
        // For annual_dates pods, store the per-task MM-DD date
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
    // Retroactively editable up to 5 days
    const minDate = addDays(today, -5);
    if (date < minDate) return; // locked
    setPodLogs(prev => ({ ...prev, [key]: { ...getPodLog(podId, taskId, date), ...updates } }));
  };

  // === AUTH FUNCTIONS (stub) ===
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

            {guestMode === 'review' && <ReviewMode stats={getStats()} reviews={reviews} tasks={tasks} />}

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
          <h2 style={styles.featuresTitle}>Organise with Pools · Pods · Blinks</h2>
          <div style={styles.featuresGrid}>
            <FeatureCard icon={<Icons.Layers />} title="Pool" description="Loose-ended groupings. Sprint, goal, category, context — tasks relate to each other within a pool." color="#6366F1" />
            <FeatureCard icon={<Icons.Repeat />} title="Pod" description="Habit-like recurring tasks. Medicine, birthdays, exercise routines — with custom tracker fields." color="#0EA5E9" />
            <FeatureCard icon={<Icons.Feather />} title="Blink" description="Standalone thoughts. A scrap, note or quick task that exists independently." color="#10B981" />
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
// FREEDOM MODE
// ============================================================================
function FreedomMode({ newTask, setNewTask, onAddTask, pendingTasks, allPendingCount, completedTasks, onDeleteTask, onStartFocus }) {
  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onAddTask(); } };
  const qualifiedCount = (allPendingCount || 0) - pendingTasks.length;
  return (
    <div>
      <div style={styles.inputRow}>
        <input type="text" placeholder="What's on your mind?" value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={handleKeyDown} style={styles.input} />
        <button style={styles.iconBtn} onClick={onAddTask}><Icons.Plus /></button>
      </div>
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
                  {/* type badge */}
                  {task.type && task.type !== 'blink' && (
                    <span style={{ ...styles.typeBadge, backgroundColor: task.type === 'pool' ? '#6366F115' : '#0EA5E915', color: task.type === 'pool' ? '#6366F1' : '#0EA5E9' }}>
                      {task.type === 'pool' ? '⊕ Pool' : '↻ Pod'}
                    </span>
                  )}
                  <span style={styles.taskContent}>{task.content}</span>
                </div>
                <div style={styles.taskActions}>
                  <button style={styles.ghostBtn} onClick={() => onDeleteTask(task.id)} title="Delete"><Icons.Trash /></button>
                  <button style={styles.smallOutlineBtn} onClick={() => onStartFocus(task.id)}><Icons.Hourglass className="w-3.5 h-3.5" />Focus</button>
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
// POOL COMBOBOX
// ============================================================================
function PoolComboBox({ pools, onSelect, onCreatePool, selectedPoolId }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const filtered = pools.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const selected = pools.find(p => p.id === selectedPoolId);

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
      <div style={styles.comboInput} onClick={() => setOpen(true)}>
        {selected ? (
          <span style={{ color: '#18181B', fontWeight: 500 }}>⊕ {selected.name}</span>
        ) : (
          <span style={{ color: '#A1A1AA' }}>Search or create a Pool…</span>
        )}
        <Icons.ChevronDown className="w-4 h-4" />
      </div>
      {open && (
        <div style={styles.comboDropdown}>
          <input
            autoFocus
            type="text"
            placeholder="Search or type new pool name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...styles.input, marginBottom: 8 }}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
          />
          <div style={{ maxHeight: 160, overflowY: 'auto' }}>
            {filtered.length === 0 && !search && <p style={{ color: '#A1A1AA', fontSize: 13, padding: '4px 0' }}>No pools yet</p>}
            {filtered.map(p => (
              <div key={p.id} style={{ ...styles.comboOption, ...(p.id === selectedPoolId ? { backgroundColor: '#6366F115', fontWeight: 600 } : {}) }} onClick={() => { onSelect(p.id); setOpen(false); }}>
                ⊕ {p.name}
              </div>
            ))}
          </div>
          {search.trim() && !filtered.some(p => p.name.toLowerCase() === search.toLowerCase()) && (
            <button style={{ ...styles.primaryBtn, width: '100%', marginTop: 8, justifyContent: 'center', backgroundColor: '#6366F1' }} onClick={handleCreate}>
              <Icons.Plus className="w-4 h-4" /> Create "{search}"
            </button>
          )}
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
  // Tasks in this pool (excluding current task)
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
          {/* Relationship type buttons */}
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
          {/* Task multi-select */}
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

      {/* Show existing relationships */}
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
// POD PICKER / CREATOR (used in Focus Mode)
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

  // Recurrence description preview shown below the selector
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {pods.map(p => (
              <div key={p.id} onClick={() => onSelect(p.id)} style={{ ...styles.podPickerItem, ...(p.id === selectedPodId ? { borderColor: '#0EA5E9', backgroundColor: '#0EA5E910' } : {}) }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icons.Repeat className="w-4 h-4" style={{ color: '#0EA5E9', flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#71717A', marginTop: 2, paddingLeft: 22 }}>{podSummaryLine(p)}</div>
                </div>
                {p.id === selectedPodId && <Icons.Check className="w-4 h-4" style={{ color: '#0EA5E9', flexShrink: 0 }} />}
              </div>
            ))}
            {pods.length === 0 && <p style={{ color: '#A1A1AA', fontSize: 13 }}>No Pods yet — create one below.</p>}
          </div>
          <button style={{ ...styles.primaryBtn, backgroundColor: '#0EA5E9' }} onClick={() => setCreating(true)}>
            <Icons.Plus className="w-4 h-4" /> Create new Pod
          </button>
        </>
      ) : (
        <div style={styles.podForm}>
          <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: '#0EA5E9' }}>↻ New Pod</p>

          {/* Pod name */}
          <label style={styles.label}>Pod name</label>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Birthdays, Outdoor Activities, Medication" style={{ ...styles.input, marginBottom: 14 }} />

          {/* Pod type */}
          <label style={styles.label}>Pod type</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {POD_TYPES.map(pt => (
              <label key={pt.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, border: `2px solid ${podType === pt.key ? '#0EA5E9' : '#E4E4E7'}`, cursor: 'pointer', backgroundColor: podType === pt.key ? '#F0F9FF' : 'white' }}>
                <input type="radio" name="podType" value={pt.key} checked={podType === pt.key} onChange={() => setPodType(pt.key)} style={{ accentColor: '#0EA5E9', marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: podType === pt.key ? '#0369A1' : '#18181B' }}>{pt.label}</div>
                  <div style={{ fontSize: 12, color: '#71717A', marginTop: 2 }}>{pt.desc}</div>
                </div>
              </label>
            ))}
          </div>

          {/* Recurring-only options */}
          {podType === 'recurring' && (
            <>
              <label style={styles.label}>Recurrence schedule</label>
              <select value={form.recurrenceType} onChange={e => setForm(p => ({ ...p, recurrenceType: e.target.value }))} style={{ ...styles.input, marginBottom: 4 }}>
                {RECURRENCE_TYPES.map(r => <option key={r.key} value={r.key}>{r.label} — {r.desc}</option>)}
              </select>
              <p style={{ fontSize: 12, color: '#0EA5E9', marginBottom: 10, fontStyle: 'italic' }}>{recurrencePreview()}</p>

              {form.recurrenceType === 'specific_days' && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                  {WEEK_DAYS.map((d, i) => (
                    <button key={i} type="button" onClick={() => toggleWeekDay(i)} style={{ ...styles.dayBtn, ...(form.weekDays.includes(i) ? styles.dayBtnActive : {}) }}>{d}</button>
                  ))}
                </div>
              )}
              {form.recurrenceType === 'monthly_frequency' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <input type="number" min={1} max={31} value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: +e.target.value }))} style={{ ...styles.input, width: 70 }} />
                  <span style={{ fontSize: 13, color: '#71717A' }}>times per month</span>
                </div>
              )}
              {form.recurrenceType === 'every_n_days' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: '#71717A' }}>Every</span>
                  <input type="number" min={1} max={90} value={form.everyNDays} onChange={e => setForm(p => ({ ...p, everyNDays: +e.target.value }))} style={{ ...styles.input, width: 70 }} />
                  <span style={{ fontSize: 13, color: '#71717A' }}>days</span>
                </div>
              )}

              <label style={styles.label}>Tracker fields (up to 5) <span style={{ fontWeight: 400, color: '#A1A1AA' }}>— what do you want to log each occurrence?</span></label>
              {form.trackerFields.map((f, i) => (
                <div key={f.id} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                  <input value={f.name} onChange={e => updateField(i, 'name', e.target.value)} placeholder={['Kms walked / run', 'Minutes practiced', 'Calories burned', 'Pages read', 'Hours slept'][i] || 'Field name'} style={{ ...styles.input, flex: 1 }} />
                  <select value={f.type} onChange={e => updateField(i, 'type', e.target.value)} style={{ ...styles.input, width: 110 }}>
                    <option value="checkbox">✓ Done/Not done</option>
                    <option value="text">✏ Free input</option>
                  </select>
                  {form.trackerFields.length > 1 && <button type="button" onClick={() => removeField(i)} style={{ ...styles.ghostBtn, color: '#EF4444', padding: '4px' }}><Icons.X className="w-3.5 h-3.5" /></button>}
                </div>
              ))}
              {form.trackerFields.length < 5 && <button type="button" style={{ ...styles.ghostBtn, fontSize: 13, color: '#0EA5E9' }} onClick={addField}><Icons.Plus className="w-3.5 h-3.5" /> Add tracker field</button>}
            </>
          )}

          {podType === 'annual_dates' && (
            <div style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, padding: 12, fontSize: 13, color: '#0369A1', marginTop: 4 }}>
              📌 Each task you add to this Pod will be given its own specific date (day + month). No recurrence needed on the Pod itself.
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button type="button" style={{ ...styles.primaryBtn, backgroundColor: '#0EA5E9' }} onClick={handleCreate}>Create Pod</button>
            <button type="button" style={styles.ghostBtn} onClick={() => setCreating(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DONE CARD (extracted so it can manage its own loading state for extended Qs)
// ============================================================================
function DoneCard({ wizardAnswers, questions, setQuestions, setWizardStep, setWizardAnswers, onFinish, task }) {
  const [loadingMore, setLoadingMore] = useState(false);
  const [extended, setExtended] = useState(false); // hide link after one use

  const handleMoreQuestions = async () => {
    setLoadingMore(true);
    try {
      // Build a richer context string from existing answers so AI avoids repeating them
      const answeredContext = Object.entries(wizardAnswers)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');

      const prompt = `Task: "${task.content}"\n\nAlready answered:\n${answeredContext}\n\nGenerate exactly 3 more deep Socratic coaching questions that go BEYOND what has already been answered. Focus on uncovering hidden assumptions, potential blockers, or deeper motivation. Return JSON: { "questions": [{ "key": string, "question": string, "placeholder": string, "purpose": "all", "required": false }] }`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.content?.find(b => b.type === 'text')?.text || '';
        const clean = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        const newQs = (parsed.questions || []).slice(0, 3).map(q => ({ ...q, key: `ext_${Date.now()}_${q.key}` }));
        if (newQs.length > 0) {
          // Init answers for new keys
          const init = {};
          newQs.forEach(q => { init[q.key] = ''; });
          setWizardAnswers(prev => ({ ...prev, ...init }));
          setQuestions(prev => [...prev, ...newQs]);
          setWizardStep(questions.length); // jump to first new question
        }
      }
    } catch (e) {
      console.warn('Extended questions failed, using fallback', e);
      // Fallback: 3 hand-crafted deep questions
      const fallback = [
        { key: `ext_blockers_${Date.now()}`, question: 'What could prevent you from completing this?', placeholder: 'List any anticipated blockers or dependencies…', purpose: 'all', required: false },
        { key: `ext_first_step_${Date.now()}`, question: 'What is the single smallest first action you can take right now?', placeholder: 'Think in minutes, not hours…', purpose: 'all', required: false },
        { key: `ext_help_${Date.now()}`, question: 'Who or what could help you complete this faster?', placeholder: 'People, tools, resources, information…', purpose: 'all', required: false },
      ];
      const init = {};
      fallback.forEach(q => { init[q.key] = ''; });
      setWizardAnswers(prev => ({ ...prev, ...init }));
      setQuestions(prev => [...prev, ...fallback]);
      setWizardStep(questions.length);
    } finally {
      setLoadingMore(false);
      setExtended(true);
    }
  };

  return (
    <div style={styles.wizardCard}>
      <div style={styles.doneIcon}><Icons.Check className="w-8 h-8" /></div>
      <h4 style={styles.doneTitle}>Ready to work!</h4>
      <p style={styles.doneText}>You've reflected on this task. Focus is set.</p>
      {!extended && (
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <button
            style={{ background: 'none', border: 'none', color: '#4299E1', fontSize: 13, cursor: loadingMore ? 'default' : 'pointer', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: 5, opacity: loadingMore ? 0.6 : 1 }}
            onClick={handleMoreQuestions}
            disabled={loadingMore}
          >
            {loadingMore ? <><Icons.Loader className="w-3.5 h-3.5" /> Generating questions…</> : '✦ Help me with more qualifying questions'}
          </button>
        </div>
      )}
      <button style={styles.primaryBtn} onClick={onFinish}><Icons.Briefcase />Go to Work Mode</button>
    </div>
  );
}

// ============================================================================
// FOCUS MODE
// ============================================================================
function FocusMode({
  task, pendingTasks,
  wizardStep, setWizardStep, wizardAnswers, setWizardAnswers,
  focusTaskType, setFocusTaskType,
  focusPoolId, setFocusPoolId,
  focusPodId, setFocusPodId,
  focusRelationships, setFocusRelationships,
  focusPodTaskDate, setFocusPodTaskDate,
  focusTypeConfirmed, onConfirmType,
  pools, pods, onCreatePool, onCreatePod,
  tasks,
  onFinish, onSkipTask
}) {
  const [questions, setQuestions] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const result = await AICoachingService.getCoachingQuestions(task.content, task.reflection || {});
        setQuestions(result.questions || []);
        setAnalysis(result.analysis || null);
        const init = {};
        result.questions.forEach(q => {
          // ERR-005: prefer existing wizardAnswer → existing task reflection → empty string
          init[q.key] = wizardAnswers[q.key] || task.reflection?.[q.key] || '';
        });
        setWizardAnswers(prev => ({ ...prev, ...init }));
      } catch { setQuestions(FALLBACK_QUESTIONS); } finally { setIsLoading(false); }
    };
    if (task) { load(); setWizardStep(0); }
  }, [task?.id]);

  const currentQuestion = questions[wizardStep];
  const totalQuestions = questions.length;

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

      {/* ─── STEP 0: Task type selection (if not confirmed) ─── */}
      {!focusTypeConfirmed ? (
        <div style={styles.wizardCard}>
          <p style={{ fontSize: 13, color: '#71717A', marginBottom: 6 }}>Before we go deeper — where does this task live?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {[
              { key: 'blink', label: '⚡ Blink', desc: 'Standalone note / quick task', color: '#10B981' },
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
                          const val = e.target.value; // yyyy-MM-dd
                          if (val) setFocusPodTaskDate(val.slice(5)); // store MM-DD only
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
        /* ─── Socratic Questions ─── */
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
        /* ─── Done ─── */
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
// WORK MODE
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
  const [workView, setWorkView] = useState('table');
  // Lifted out of PoolView/PodView so selection survives WorkMode re-renders (ERR-001, ERR-003)
  const [selectedPoolId, setSelectedPoolId] = useState(null);
  const [selectedPodId, setSelectedPodId] = useState(null);
  const reviewTask = tasks.find(t => t.id === reviewTaskId);

  const categorizeByDeadline = (task) => {
    const deadline = task.reflection?.deadline?.toLowerCase() || '';
    if (!deadline || deadline === '-') return 'notplanned';
    if (/\b(today|tonight|now|asap|urgent)\b/.test(deadline)) return 'today';
    if (/\b(tomorrow|next|week|month|later|soon|eventually)\b/.test(deadline)) return 'future';
    if (/\b(yesterday|overdue|late|missed|past|ago)\b/.test(deadline)) return 'missed';
    return 'notplanned';
  };

  const kanbanLanes = { today: { title: 'Today', color: '#FF6B6B', tasks: [] }, future: { title: 'Future', color: '#4299E1', tasks: [] }, missed: { title: 'Missed', color: '#F59E0B', tasks: [] }, notplanned: { title: 'Not Planned', color: '#A1A1AA', tasks: [] } };
  pendingTasks.forEach(t => kanbanLanes[categorizeByDeadline(t)].tasks.push(t));

  // FEAT-004: Focus button shown on every task card in Work Mode
  const FocusBtn = ({ taskId }) => (
    <button
      title="Open in Focus Mode"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 7px', backgroundColor: 'transparent', border: '1px solid #D4D4D8', borderRadius: 5, fontSize: 11, color: '#71717A', cursor: 'pointer' }}
      onClick={() => onStartFocus && onStartFocus(taskId)}
    >
      <Icons.Hourglass className="w-3 h-3" /> Focus
    </button>
  );

  const TaskCard = ({ task, compact = false }) => {
    const elapsed = getElapsedSeconds(task.id);
    const running = isTimerRunning(task.id);
    const paused = isTimerPaused(task.id);
    return (
      <div style={styles.taskCard}>
        <div style={styles.taskCardHeader}>
          <button style={styles.checkbox} onClick={() => onCompleteTask(task.id)} />
          <span style={styles.taskCardTitle}>{task.content}</span>
          {task.type && task.type !== 'blink' && (
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, backgroundColor: task.type === 'pool' ? '#6366F115' : '#0EA5E915', color: task.type === 'pool' ? '#6366F1' : '#0EA5E9', fontWeight: 600 }}>
              {task.type === 'pool' ? '⊕' : '↻'}
            </span>
          )}
        </div>
        {!compact && task.reflection?.deadline && (
          <div style={styles.taskCardMeta}><Icons.Clock className="w-3 h-3" /><span>{task.reflection.deadline}</span></div>
        )}
        <div style={styles.taskCardActions}>
          <FocusBtn taskId={task.id} />
          {(running || paused) && <span style={{ ...styles.timerDisplay, ...(running ? { color: '#FF6B6B', fontWeight: 600 } : {}) }}>{formatTimer(elapsed)}</span>}
          {!running && !paused && <button style={styles.timerBtn} onClick={() => onStartTimer(task.id)}><Icons.Play className="w-3.5 h-3.5" /></button>}
          {running && <button style={styles.timerBtn} onClick={() => onPauseTimer(task.id)}><Icons.Pause className="w-3.5 h-3.5" /></button>}
          {paused && <button style={styles.timerBtn} onClick={() => onStartTimer(task.id)}><Icons.Play className="w-3.5 h-3.5" /></button>}
          {(running || paused) && <button style={styles.timerBtn} onClick={() => onStopTimer(task.id)}><Icons.Square /></button>}
        </div>
      </div>
    );
  };

  const TableView = () => (
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}></th>
            <th style={styles.th}>Task</th>
            <th style={styles.th}>Type</th>
            <th style={styles.th}>Deadline</th>
            <th style={styles.th}>Outcome</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pendingTasks.map(task => {
            const elapsed = getElapsedSeconds(task.id);
            const running = isTimerRunning(task.id);
            const paused = isTimerPaused(task.id);
            return (
              <tr key={task.id} style={styles.tr}>
                <td style={styles.td}><button style={styles.checkbox} onClick={() => onCompleteTask(task.id)} /></td>
                <td style={{ ...styles.td, fontWeight: 500 }}>{task.content}</td>
                <td style={styles.td}>
                  {task.type === 'pool' && <span style={{ color: '#6366F1', fontSize: 12 }}>⊕ Pool</span>}
                  {task.type === 'pod' && <span style={{ color: '#0EA5E9', fontSize: 12 }}>↻ Pod</span>}
                  {(!task.type || task.type === 'blink') && <span style={{ color: '#10B981', fontSize: 12 }}>⚡ Blink</span>}
                </td>
                <td style={styles.tdMuted}>{task.reflection?.deadline || '—'}</td>
                <td style={styles.tdMuted} title={task.reflection?.outcome}>{task.reflection?.outcome ? task.reflection.outcome.substring(0, 30) + '…' : '—'}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>
                  <div style={styles.timerCell}>
                    {/* FEAT-004: Focus button in table rows */}
                    <FocusBtn taskId={task.id} />
                    {(running || paused) && <span style={{ ...styles.timerDisplay, ...(running ? { color: '#FF6B6B', fontWeight: 600 } : {}) }}>{formatTimer(elapsed)}</span>}
                    {!running && !paused && <button style={styles.timerBtn} onClick={() => onStartTimer(task.id)}><Icons.Play className="w-3.5 h-3.5" /></button>}
                    {running && <button style={styles.timerBtn} onClick={() => onPauseTimer(task.id)}><Icons.Pause className="w-3.5 h-3.5" /></button>}
                    {paused && <button style={styles.timerBtn} onClick={() => onStartTimer(task.id)}><Icons.Play className="w-3.5 h-3.5" /></button>}
                    {(running || paused) && <button style={styles.timerBtn} onClick={() => onStopTimer(task.id)}><Icons.Square /></button>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
            {lane.tasks.length === 0 ? <div style={styles.kanbanEmpty}>No tasks</div> : lane.tasks.map(t => <TaskCard key={t.id} task={t} compact />)}
          </div>
        </div>
      ))}
    </div>
  );

  // ─── NEW: Pool View ───
  const PoolView = () => {
    const pool = pools.find(p => p.id === selectedPoolId);
    const poolTasks = pendingTasks.filter(t => (t.poolIds || []).includes(selectedPoolId));
    const poolRels = (pool?.relationships || []);

    const getRelLabel = (taskId) => {
      const rels = poolRels.filter(r => r.fromTaskId === taskId || r.toTaskId === taskId);
      return rels;
    };

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#71717A' }}>Pool:</span>
          <select value={selectedPoolId || ''} onChange={e => setSelectedPoolId(e.target.value)} style={{ ...styles.input, flex: 1 }}>
            <option value="">— Select a Pool —</option>
            {pools.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {!selectedPoolId && <EmptyState icon={<Icons.Layers className="w-8 h-8" />} message="Select a Pool to see its tasks" />}

        {pool && (
          <div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={styles.poolMetaChip}><span style={{ color: '#6366F1', fontWeight: 700 }}>⊕</span> {pool.name}</div>
              {pool.completionDate && <div style={styles.poolMetaChip}><Icons.Calendar className="w-3 h-3" /> {pool.completionDate}</div>}
              <div style={styles.poolMetaChip}>{poolTasks.length} tasks</div>
            </div>

            {poolTasks.length === 0 ? (
              <EmptyState icon={<Icons.Layers className="w-8 h-8" />} message="No tasks assigned to this pool yet. Use Focus Mode to add tasks." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {poolTasks.map(task => {
                  const rels = getRelLabel(task.id);
                  return (
                    <div key={task.id} style={{ ...styles.taskCard, borderLeft: '3px solid #6366F1' }}>
                      <div style={styles.taskCardHeader}>
                        <button style={styles.checkbox} onClick={() => onCompleteTask(task.id)} />
                        <span style={styles.taskCardTitle}>{task.content}</span>
                      </div>
                      {rels.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                          {rels.map((r, i) => {
                            const rt = RELATIONSHIP_TYPES.find(x => x.key === r.type);
                            const other = tasks.find(t => t.id === (r.fromTaskId === task.id ? r.toTaskId : r.fromTaskId));
                            return (
                              <span key={i} style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, backgroundColor: `${rt?.color}20`, color: rt?.color, fontWeight: 600 }}>
                                {rt?.icon} {rt?.label}: {other?.content?.substring(0, 20) || '…'}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      <div style={styles.taskCardActions}>
                        {!isTimerRunning(task.id) && !isTimerPaused(task.id) && <button style={styles.timerBtn} onClick={() => onStartTimer(task.id)}><Icons.Play className="w-3.5 h-3.5" /></button>}
                        {isTimerRunning(task.id) && <><span style={{ ...styles.timerDisplay, color: '#FF6B6B', fontWeight: 600 }}>{formatTimer(getElapsedSeconds(task.id))}</span><button style={styles.timerBtn} onClick={() => onPauseTimer(task.id)}><Icons.Pause className="w-3.5 h-3.5" /></button></>}
                        {isTimerPaused(task.id) && <><span style={styles.timerDisplay}>{formatTimer(getElapsedSeconds(task.id))}</span><button style={styles.timerBtn} onClick={() => onStartTimer(task.id)}><Icons.Play className="w-3.5 h-3.5" /></button></>}
                        {(isTimerRunning(task.id) || isTimerPaused(task.id)) && <button style={styles.timerBtn} onClick={() => onStopTimer(task.id)}><Icons.Square /></button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─── NEW: Pod View ───
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
                  const canEdit = d >= addDays(today, -5);
                  return (
                    <div key={d} style={{ textAlign: 'center', cursor: canEdit ? 'pointer' : 'default' }} title={canEdit ? 'Click to cycle: planned → done → missed' : 'Locked'} onClick={() => canEdit && setPodLog(pod.id, task.id, d, { status: cycleStatus(log.status) })}>
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
                    const canEdit = d >= addDays(today, -5);
                    if (field.type === 'checkbox') return (
                      <div key={d} style={{ textAlign: 'center' }}>
                        <input type="checkbox" checked={val === 'true'} disabled={!canEdit} onChange={e => setPodLog(pod.id, task.id, d, { trackerValues: { ...(log.trackerValues || {}), [field.id]: e.target.checked ? 'true' : 'false' } })} style={{ cursor: canEdit ? 'pointer' : 'default' }} />
                      </div>
                    );
                    return (
                      <input key={d} type="text" value={val} disabled={!canEdit} onChange={e => setPodLog(pod.id, task.id, d, { trackerValues: { ...(log.trackerValues || {}), [field.id]: e.target.value } })} style={{ width: '100%', fontSize: 10, padding: '2px 3px', border: '1px solid #E4E4E7', borderRadius: 3, textAlign: 'center', backgroundColor: canEdit ? 'white' : '#F9FAFB', color: '#18181B' }} />
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
            <span style={{ fontSize: 11, color: '#A1A1AA' }}>· = not scheduled · click to cycle · locked after 5 days</span>
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

  const EnergyView = () => {
    const categorizeEnergy = (task) => {
      const c = task.content.toLowerCase();
      const o = (task.reflection?.outcome || '').toLowerCase();
      const text = c + ' ' + o;
      if (/complex|difficult|build|create|research|design|major/.test(text)) return 'high';
      if (/quick|simple|easy|minor|routine|brief/.test(text)) return 'low';
      return 'medium';
    };
    const levels = { high: { title: 'High Energy Required', emoji: '🔥', color: '#EF4444', description: 'Deep work', tasks: [] }, medium: { title: 'Medium Energy', emoji: '⚡', color: '#F59E0B', description: 'Regular tasks', tasks: [] }, low: { title: 'Low Energy', emoji: '🌊', color: '#10B981', description: 'Easy wins', tasks: [] } };
    pendingTasks.forEach(t => levels[categorizeEnergy(t)].tasks.push(t));
    return (
      <div style={styles.energyContainer}>
        {['high', 'medium', 'low'].map(key => {
          const lv = levels[key];
          return (
            <div key={key} style={{ ...styles.energySection, borderLeftColor: lv.color }}>
              <div style={styles.energyHeader}>
                <span style={styles.energyEmoji}>{lv.emoji}</span>
                <div><div style={styles.energyTitle}>{lv.title}</div><div style={styles.energyDesc}>{lv.description}</div></div>
                <span style={{ ...styles.energyCount, backgroundColor: lv.color }}>{lv.tasks.length}</span>
              </div>
              <div style={styles.energyBody}>
                {lv.tasks.length === 0 ? <div style={styles.kanbanEmpty}>No tasks</div> : lv.tasks.map(t => <TaskCard key={t.id} task={t} />)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={styles.workHeaderWithSelector}>
        <div style={styles.workTitleRow}>
          <span style={styles.workTitleText}>Visualise your work in</span>
          <select value={workView} onChange={e => setWorkView(e.target.value)} style={styles.viewSelector}>
            <option value="table">Table</option>
            <option value="kanban">Kanban</option>
            <option value="energy">Energy</option>
            <option value="pool">⊕ Pools</option>
            <option value="pod">↻ Pods</option>
          </select>
        </div>
        <p style={styles.workSubtitle}>
          {workView === 'table' && 'All tasks in a detailed table'}
          {workView === 'kanban' && 'Tasks organised by deadline'}
          {workView === 'energy' && 'Tasks grouped by energy required'}
          {workView === 'pool' && 'Tasks inside a selected Pool with relationships'}
          {workView === 'pod' && 'Recurring Pod tasks — calendar heatmap view'}
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

      {pendingTasks.length === 0 && completedTasks.length === 0 && workView !== 'pool' && workView !== 'pod' ? (
        <EmptyState icon={<Icons.Briefcase className="w-8 h-8" />} message="No tasks yet. Add some in Freedom mode!" action={{ label: 'Go to Freedom Mode', onClick: onGoToFreedom }} />
      ) : (
        <>
          {workView === 'table' && <TableView />}
          {workView === 'kanban' && <KanbanView />}
          {workView === 'energy' && <EnergyView />}
          {workView === 'pool' && <PoolView />}
          {workView === 'pod' && <PodView />}

          {workView !== 'pool' && workView !== 'pod' && completedTasks.length > 0 && (
            <div style={styles.completedSection}>
              <p style={styles.completedLabel}>Completed</p>
              {completedTasks.map(t => <div key={t.id} style={styles.completedTask}>{t.content}</div>)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// REVIEW MODE
// ============================================================================
function ReviewMode({ stats, reviews, tasks }) {
  return (
    <div>
      <div style={styles.workHeader}><h3 style={styles.workTitle}>Review & Learn</h3><p style={styles.workSubtitle}>Track your progress and patterns.</p></div>
      <div style={styles.statsGrid}>
        <div style={styles.statCard}><div style={styles.statValue}>{stats.totalCompleted}</div><div style={styles.statLabel}>Completed</div></div>
        <div style={styles.statCard}><div style={{ ...styles.statValue, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>{stats.avgSatisfaction.toFixed(1)}<Icons.Star filled className="w-5 h-5" /></div><div style={styles.statLabel}>Avg Satisfaction</div></div>
        <div style={styles.statCard}><div style={styles.statValue}>{stats.reviewCount}</div><div style={styles.statLabel}>Reviews</div></div>
        <div style={styles.statCard}><div style={styles.statValue}>{stats.pendingCount}</div><div style={styles.statLabel}>Pending</div></div>
      </div>
      {reviews.length === 0 ? <EmptyState icon={<Icons.BarChart className="w-8 h-8" />} message="Complete tasks and submit reviews to see your progress" /> : (
        <div>
          <h4 style={styles.reviewListTitle}>Recent Reviews</h4>
          <div style={styles.reviewList}>
            {reviews.slice(0, 5).map((review, idx) => {
              const task = tasks.find(t => t.id === review.taskId);
              return (
                <div key={idx} style={styles.reviewItem}>
                  <div style={styles.reviewItemHeader}>
                    <span style={styles.reviewItemTask}>{task?.content || 'Unknown task'}</span>
                    <div style={styles.reviewItemStars}>{[1, 2, 3, 4, 5].map(s => <Icons.Star key={s} filled={review.satisfactionRating >= s} className="w-3.5 h-3.5" />)}</div>
                  </div>
                  {review.improvements && <p style={styles.reviewItemText}>{review.improvements}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
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
          <button style={styles.primaryBtn} onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// NAVIGATION DROPDOWN COMPONENT
// ============================================================================
function NavDropdown({ label, items, isOpen, onToggle, onClose }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      <button
        style={styles.navLink}
        onClick={onToggle}
      >
        {label} <span style={{ fontSize: 10 }}>▼</span>
      </button>
      {isOpen && (
        <div style={styles.dropdownMenu}>
          {items.map((item, idx) => (
            <a
              key={idx}
              href={item.url}
              style={styles.dropdownItem}
              onClick={onClose}
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
// STYLES
// ============================================================================
const styles = {
  app: { minHeight: '100vh', backgroundColor: '#FAFAFA', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  header: { position: 'sticky', top: 0, backgroundColor: 'white', borderBottom: '1px solid #E4E4E7', zIndex: 100 },
  headerContent: { maxWidth: '1200px', margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo: { display: 'flex', alignItems: 'center', gap: '8px', color: '#FF6B6B', cursor: 'pointer' },
  logoText: { fontSize: '24px', fontWeight: '800', letterSpacing: '-1px' },
  sup: { fontSize: '14px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  greeting: { color: '#71717A', fontSize: '14px' },
  primaryBtn: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#FF6B6B', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  outlineBtn: { padding: '8px 16px', backgroundColor: 'transparent', color: '#52525B', border: '1px solid #D4D4D8', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' },
  smallOutlineBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: 'transparent', color: '#52525B', border: '1px solid #D4D4D8', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' },
  ghostBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', backgroundColor: 'transparent', color: '#71717A', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' },
  iconBtn: { width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF6B6B', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  timerBtn: { width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', color: '#71717A', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  main: { maxWidth: '1200px', margin: '0 auto', padding: '0 24px' },
  hero: { textAlign: 'center', padding: '60px 20px 40px' },
  heroContent: { maxWidth: '600px', margin: '0 auto' },
  heroTitle: { fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: '800', color: '#18181B', lineHeight: 1.2, marginBottom: '16px' },
  tWord: { color: '#FF6B6B', display: 'inline-block', minWidth: '140px' },
  heroSubtitle: { fontSize: '16px', color: '#71717A', lineHeight: 1.6 },
  guestSection: { paddingBottom: '60px' },
  guestCard: { backgroundColor: 'white', border: '1px solid #E4E4E7', borderRadius: '16px', padding: '24px', maxWidth: '800px', margin: '0 auto', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' },
  modeNav: { display: 'flex', justifyContent: 'center', gap: '4px', backgroundColor: '#F4F4F5', padding: '4px', borderRadius: '100px', marginBottom: '24px', flexWrap: 'wrap' },
  modeBtn: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: 'transparent', color: '#71717A', border: 'none', borderRadius: '100px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' },
  modeBtnActive: { backgroundColor: '#FF6B6B', color: 'white' },
  modeBtnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  inputRow: { display: 'flex', gap: '8px', marginBottom: '16px' },
  input: { flex: 1, padding: '10px 14px', border: '1px solid #D4D4D8', borderRadius: '8px', fontSize: '15px', outline: 'none', backgroundColor: 'white' },
  taskArea: { minHeight: '200px' },
  taskList: { display: 'flex', flexDirection: 'column', gap: '4px' },
  taskItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '8px', backgroundColor: '#F9FAFB', gap: '12px' },
  taskContent: { flex: 1, fontSize: '15px', color: '#18181B' },
  taskActions: { display: 'flex', alignItems: 'center', gap: '8px' },
  typeBadge: { fontSize: 11, padding: '2px 6px', borderRadius: 4, fontWeight: 600, whiteSpace: 'nowrap' },
  completedSection: { marginTop: '24px', paddingTop: '16px', borderTop: '1px dashed #E4E4E7' },
  completedLabel: { fontSize: '13px', fontWeight: '600', color: '#71717A', marginBottom: '8px' },
  completedTask: { fontSize: '14px', color: '#A1A1AA', textDecoration: 'line-through', padding: '4px 0' },
  emptyState: { textAlign: 'center', padding: '48px 20px' },
  emptyIcon: { color: '#D4D4D8', marginBottom: '12px', display: 'flex', justifyContent: 'center' },
  emptyMessage: { color: '#71717A', fontSize: '14px', marginBottom: '16px' },
  // Focus
  focusMode: { padding: '20px 0' },
  progressDots: { display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '24px' },
  dot: { width: '8px', height: '8px', borderRadius: '100px', backgroundColor: '#E4E4E7', transition: 'all 0.3s' },
  dotActive: { width: '32px', backgroundColor: '#FF6B6B' },
  focusHeader: { textAlign: 'center', marginBottom: '24px' },
  focusLabel: { fontSize: '13px', color: '#71717A', marginBottom: '8px' },
  focusTask: { fontSize: '20px', fontWeight: '600', color: '#18181B' },
  wizardCard: { backgroundColor: '#F9FAFB', borderRadius: '12px', padding: '24px', maxWidth: '460px', margin: '0 auto' },
  questionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  wizardProgress: { fontSize: '13px', color: '#71717A' },
  wizardQuestion: { fontSize: '17px', fontWeight: '600', color: '#18181B', marginBottom: '16px' },
  purposeBadge: { fontSize: '11px', padding: '3px 8px', borderRadius: '100px', fontWeight: '600' },
  textarea: { width: '100%', minHeight: '100px', padding: '12px', border: '1px solid #D4D4D8', borderRadius: '8px', fontSize: '14px', resize: 'none', boxSizing: 'border-box' },
  optionalHint: { fontSize: '12px', color: '#A1A1AA', marginTop: '8px' },
  wizardActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' },
  wizardRightActions: { display: 'flex', gap: '8px', alignItems: 'center' },
  doneIcon: { width: '48px', height: '48px', backgroundColor: '#DCFCE7', color: '#16A34A', borderRadius: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' },
  doneTitle: { fontSize: '18px', fontWeight: '700', color: '#18181B', textAlign: 'center', marginBottom: '8px' },
  doneText: { color: '#71717A', fontSize: '14px', textAlign: 'center', marginBottom: '20px' },
  skipSection: { textAlign: 'center', marginTop: '16px' },
  linkBtn: { background: 'none', border: 'none', color: '#A1A1AA', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' },
  loadingCard: { textAlign: 'center', padding: '32px', color: '#A1A1AA' },
  loadingText: { marginTop: 12, fontSize: 14 },
  analysisChip: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, backgroundColor: '#FFF7ED', color: '#F59E0B', padding: '4px 10px', borderRadius: 100, marginTop: 8 },
  // Pool combobox
  comboInput: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid #D4D4D8', borderRadius: 8, cursor: 'pointer', backgroundColor: 'white', fontSize: 14 },
  comboDropdown: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #E4E4E7', borderRadius: 10, padding: 12, zIndex: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', marginTop: 4 },
  comboOption: { padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 14, color: '#18181B' },
  // Relationship panel
  relPanel: { backgroundColor: '#F9FAFB', border: '1px solid #E4E4E7', borderRadius: 10, padding: 14, marginTop: 12 },
  relTitle: { fontSize: 13, color: '#71717A', marginBottom: 10 },
  relTypeBtn: { padding: '5px 10px', border: '1px solid #D4D4D8', borderRadius: 6, fontSize: 12, cursor: 'pointer', backgroundColor: 'white', fontWeight: 500 },
  // Pod
  podPickerItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', border: '1px solid #E4E4E7', borderRadius: 8, cursor: 'pointer', backgroundColor: 'white' },
  podForm: { backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 10, padding: 16 },
  dayBtn: { width: 32, height: 32, border: '1px solid #D4D4D8', borderRadius: 6, fontSize: 12, cursor: 'pointer', backgroundColor: 'white', fontWeight: 500 },
  dayBtnActive: { backgroundColor: '#0EA5E9', color: 'white', borderColor: '#0EA5E9' },
  // Work mode
  workHeader: { marginBottom: '24px' },
  workHeaderWithSelector: { marginBottom: '24px' },
  workTitleRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' },
  workTitleText: { fontSize: '16px', fontWeight: '600', color: '#18181B' },
  workTitle: { fontSize: '20px', fontWeight: '700', color: '#18181B', marginBottom: '4px' },
  workSubtitle: { fontSize: '14px', color: '#71717A' },
  viewSelector: { padding: '6px 10px', border: '1px solid #D4D4D8', borderRadius: '8px', fontSize: '14px', fontWeight: '600', backgroundColor: 'white', cursor: 'pointer', color: '#18181B' },
  tableContainer: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: '600', color: '#71717A', borderBottom: '1px solid #E4E4E7' },
  tr: { borderBottom: '1px solid #F4F4F5' },
  td: { padding: '10px 12px', fontSize: '14px', color: '#18181B' },
  tdMuted: { padding: '10px 12px', fontSize: '13px', color: '#71717A', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  timerCell: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' },
  timerDisplay: { fontSize: '13px', color: '#71717A', fontVariantNumeric: 'tabular-nums', minWidth: '40px' },
  kanbanContainer: { display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' },
  kanbanLane: { flex: '0 0 200px', display: 'flex', flexDirection: 'column' },
  kanbanLaneHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '3px solid #ccc', marginBottom: '8px' },
  kanbanLaneTitle: { fontSize: '13px', fontWeight: '600', color: '#52525B' },
  kanbanLaneCount: { fontSize: '11px', fontWeight: '700', color: 'white', padding: '1px 7px', borderRadius: '100px' },
  kanbanLaneBody: { display: 'flex', flexDirection: 'column', gap: '6px' },
  kanbanEmpty: { fontSize: '12px', color: '#D4D4D8', textAlign: 'center', padding: '16px 0' },
  taskCard: { backgroundColor: 'white', border: '1px solid #E4E4E7', borderRadius: '8px', padding: '10px 12px' },
  taskCardHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' },
  taskCardTitle: { fontSize: '13px', fontWeight: '500', color: '#18181B', flex: 1 },
  taskCardMeta: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#A1A1AA', marginBottom: '4px' },
  taskCardActions: { display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' },
  checkbox: { width: '16px', height: '16px', borderRadius: '4px', border: '2px solid #D4D4D8', backgroundColor: 'transparent', cursor: 'pointer', flexShrink: 0 },
  energyContainer: { display: 'flex', flexDirection: 'column', gap: '12px' },
  energySection: { borderLeft: '4px solid #ccc', paddingLeft: '12px' },
  energyHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' },
  energyEmoji: { fontSize: '20px' },
  energyTitle: { fontSize: '14px', fontWeight: '600', color: '#18181B' },
  energyDesc: { fontSize: '12px', color: '#71717A' },
  energyCount: { fontSize: '12px', color: 'white', padding: '2px 8px', borderRadius: '100px', fontWeight: 700, marginLeft: 'auto' },
  energyBody: { display: 'flex', flexDirection: 'column', gap: '6px' },
  poolMetaChip: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '4px 10px', borderRadius: 100, backgroundColor: '#6366F110', color: '#6366F1', fontWeight: 500 },
  podSideItem: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRadius: 8, border: '1px solid #E4E4E7', cursor: 'pointer', marginBottom: 4, backgroundColor: 'white' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' },
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
  features: { padding: '40px 0 60px' },
  featuresTitle: { fontSize: '24px', fontWeight: '700', color: '#18181B', textAlign: 'center', marginBottom: '24px' },
  featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' },
  featureCard: { padding: '20px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E4E4E7' },
  featureIcon: { width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' },
  featureTitle: { fontSize: '14px', fontWeight: '700', color: '#18181B', marginBottom: '6px' },
  featureDesc: { fontSize: '13px', color: '#71717A', lineHeight: 1.5 },
  ctaSection: { textAlign: 'center', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #F4F4F5' },
  ctaText: { fontSize: '14px', color: '#71717A', marginBottom: '12px' },
  ctaButton: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#18181B', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
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
  answerSummary: { backgroundColor: 'white', borderRadius: '8px', padding: '12px', marginBottom: '16px', border: '1px solid #E4E4E7' },
  summaryTitle: { fontSize: '12px', fontWeight: '600', color: '#71717A', marginBottom: '8px' },
  summaryItem: { display: 'flex', gap: '8px', marginBottom: '4px', fontSize: '12px' },
  summaryLabel: { fontWeight: '600', color: '#52525B', textTransform: 'capitalize' },
  summaryValue: { color: '#71717A', flex: 1 },

  // Video Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    maxWidth: 600,
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottom: '1px solid #E4E4E7',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 600,
    margin: 0,
    color: '#18181B',
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    fontSize: 28,
    cursor: 'pointer',
    color: '#A1A1AA',
    padding: 0,
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoContainer: {
    padding: 20,
    backgroundColor: '#FAFAFA',
  },
  modalFooter: {
    padding: 20,
    borderTop: '1px solid #E4E4E7',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 14,
    color: '#52525B',
    cursor: 'pointer',
  },

  // Navigation Menu Styles
  navContainer: {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
    marginRight: 20,
  },
  navLink: {
    background: 'none',
    border: 'none',
    color: '#52525B',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    padding: '4px 0',
    transition: 'color 0.2s',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    backgroundColor: 'white',
    border: '1px solid #E4E4E7',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    minWidth: 180,
    zIndex: 100,
    marginTop: 4,
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    color: '#52525B',
    textDecoration: 'none',
    fontSize: 13,
    borderBottom: '1px solid #F4F4F5',
    transition: 'backgroundColor 0.2s',
  },
};
