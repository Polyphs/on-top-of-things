import React, { useState } from 'react';

// ============================================================================
// INVESTOR LANDING PAGE
// Shown after gate entry. Routes to either the main app or the scale demo.
// Both demos share localStorage keys — seeding the stress test overwrites
// main app data. This is intentional: stress data is realistic task data.
// ============================================================================

const PILLARS = [
  { icon: '⚡', label: 'Fast Capture',      desc: 'Freedom Mode — dump without judgment' },
  { icon: '🎯', label: 'Socratic Clarity',  desc: 'Focus Mode — question-driven qualification' },
  { icon: '⏱',  label: 'Timed Execution',  desc: 'Work Mode — Pool · Pod · Blink views' },
  { icon: '🧘', label: 'Zen Learnings',     desc: 'Review Mode — patterns & satisfaction' },
];

const DEMOS = [
  {
    key: 'app',
    icon: '🚀',
    title: 'Live Feature Demo',
    subtitle: 'OT² v3 — Full app',
    badge: 'RECOMMENDED',
    badgeColor: '#FF6B6B',
    description: 'The complete OT² experience. Add tasks in Freedom Mode, qualify them with Socratic coaching in Focus Mode, then manage via Pool · Pod · Blink views in Work Mode.',
    features: [
      'AI Socratic coaching in Focus Mode',
      'Pool · Pod · Blink task organisation',
      'Pool relationships (Precede / Follow / Schedule / Accomplish)',
      'Annual date Pods (birthdays, bills) + Recurring Pods (habits)',
      'Kanban · Quadrant · Energy · Journal work views',
      'Timers, reviews, star ratings',
    ],
    color: '#FF6B6B',
    bg: 'linear-gradient(135deg, rgba(255,107,107,0.06) 0%, rgba(255,107,107,0.02) 100%)',
    border: 'rgba(255,107,107,0.2)',
    cta: 'Open Live Demo →',
  },
  {
    key: 'stress',
    icon: '📊',
    title: 'Scale & Performance Demo',
    subtitle: 'OT² Stress Test',
    badge: 'DEBUG MODE',
    badgeColor: '#F59E0B',
    description: 'Demonstrates how OT² handles production-scale data. Seeds 550+ tasks, 10 Pods, 20 Pools, 500 reviews. All views use virtualised rendering. Debug timing overlays show render latency per view.',
    features: [
      '200 Freedom tasks + 150 Blinks + 200 Pool tasks + 200 Pod tasks',
      '500 completed tasks with reviews and star ratings',
      'Virtualised list rendering (only ~20 DOM nodes at a time)',
      'Debug timing overlay — render ms per view, colour-coded',
      'Focus button on every Work Mode task row',
      'Pool overview grid + Annual date countdown',
    ],
    color: '#F59E0B',
    bg: 'linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(245,158,11,0.02) 100%)',
    border: 'rgba(245,158,11,0.2)',
    cta: 'Open Scale Demo →',
  },
];

export default function InvestorLanding({ onNavigate }) {
  const [hovering, setHovering] = useState(null);

  return (
    <div style={s.page}>
      {/* Background radial glow */}
      <div style={s.glow} />

      {/* Header */}
      <header style={s.header}>
        <div style={s.headerInner}>
          <div style={s.logo}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>
            </svg>
            <span style={s.logoText}>OT<sup style={{ fontSize: 13 }}>2</sup></span>
          </div>
          <div style={s.headerBadge}>
            <span style={{ color: '#FF6B6B', fontSize: 8 }}>●</span>
            &nbsp;Investor Preview · Confidential
          </div>
        </div>
      </header>

      <main style={s.main}>
        {/* Hero */}
        <div style={s.hero}>
          <div style={s.heroEyebrow}>On Top of Things²</div>
          <h1 style={s.heroTitle}>
            The task manager that<br />
            <span style={{ color: '#FF6B6B' }}>thinks with you</span>
          </h1>
          <p style={s.heroSub}>
            OT² uses Socratic coaching to qualify tasks before they hit your work queue —
            turning brain dump into structured, prioritised action.
          </p>

          {/* 4-pillar row */}
          <div style={s.pillars}>
            {PILLARS.map(p => (
              <div key={p.label} style={s.pillar}>
                <span style={s.pillarIcon}>{p.icon}</span>
                <div style={s.pillarLabel}>{p.label}</div>
                <div style={s.pillarDesc}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Demo cards */}
        <div style={s.cardsRow}>
          {DEMOS.map(demo => (
            <div
              key={demo.key}
              style={{
                ...s.card,
                background: demo.bg,
                border: `1px solid ${hovering === demo.key ? demo.color : demo.border}`,
                boxShadow: hovering === demo.key
                  ? `0 8px 40px ${demo.color}20, 0 2px 8px rgba(0,0,0,0.06)`
                  : '0 2px 12px rgba(0,0,0,0.05)',
                transform: hovering === demo.key ? 'translateY(-3px)' : 'translateY(0)',
              }}
              onMouseEnter={() => setHovering(demo.key)}
              onMouseLeave={() => setHovering(null)}
            >
              {/* Badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={{ fontSize: 32 }}>{demo.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: demo.badgeColor, backgroundColor: `${demo.badgeColor}15`, padding: '3px 10px', borderRadius: 100 }}>
                  {demo.badge}
                </span>
              </div>

              <div style={s.cardTitle}>{demo.title}</div>
              <div style={s.cardSubtitle}>{demo.subtitle}</div>
              <p style={s.cardDesc}>{demo.description}</p>

              {/* Feature list */}
              <ul style={s.featureList}>
                {demo.features.map(f => (
                  <li key={f} style={s.featureItem}>
                    <span style={{ color: demo.color, fontWeight: 700, marginRight: 6 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* Storage note for stress test */}
              {demo.key === 'stress' && (
                <div style={s.note}>
                  ⓘ Seeding this demo overwrites the live demo's data. Use Reset in the stress test header to restore a clean state before switching back.
                </div>
              )}

              <button
                onClick={() => onNavigate(demo.key)}
                style={{
                  ...s.cta,
                  backgroundColor: demo.color,
                  boxShadow: `0 4px 14px ${demo.color}40`,
                }}
              >
                {demo.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div style={s.footer}>
          <p style={s.footerText}>
            algai.app · OT² is a product of ALG AI · Built with React + localStorage (no backend yet)
          </p>
          <p style={s.footerSub}>
            This preview is confidential. Please do not share the URL or access code.
          </p>
        </div>
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#F8F7F4',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  glow: {
    position: 'fixed',
    inset: 0,
    backgroundImage: `
      radial-gradient(ellipse at 15% 10%, rgba(255,107,107,0.09) 0%, transparent 55%),
      radial-gradient(ellipse at 85% 90%, rgba(66,153,225,0.07) 0%, transparent 55%)
    `,
    pointerEvents: 'none',
    zIndex: 0,
  },
  header: {
    position: 'sticky',
    top: 0,
    backgroundColor: 'rgba(248,247,244,0.85)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    zIndex: 100,
  },
  headerInner: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#FF6B6B',
  },
  logoText: {
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: '-1.5px',
    color: '#18181B',
    lineHeight: 1,
  },
  headerBadge: {
    fontSize: 11,
    color: '#71717A',
    backgroundColor: 'rgba(0,0,0,0.04)',
    padding: '4px 12px',
    borderRadius: 100,
    letterSpacing: '0.02em',
  },
  main: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '0 24px 60px',
    position: 'relative',
    zIndex: 1,
    animation: 'fadeIn .5s ease both',
  },
  hero: {
    textAlign: 'center',
    padding: '60px 0 40px',
    maxWidth: 680,
    margin: '0 auto',
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#A1A1AA',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 'clamp(32px, 5vw, 52px)',
    fontWeight: 800,
    color: '#18181B',
    lineHeight: 1.15,
    letterSpacing: '-1.5px',
    marginBottom: 20,
  },
  heroSub: {
    fontSize: 16,
    color: '#52525B',
    lineHeight: 1.7,
    marginBottom: 40,
    maxWidth: 540,
    margin: '0 auto 40px',
  },
  pillars: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
    marginTop: 40,
  },
  pillar: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: '16px 12px',
    border: '1px solid rgba(0,0,0,0.06)',
    textAlign: 'center',
  },
  pillarIcon: { fontSize: 22, display: 'block', marginBottom: 8 },
  pillarLabel: { fontSize: 13, fontWeight: 700, color: '#18181B', marginBottom: 4 },
  pillarDesc: { fontSize: 11, color: '#71717A', lineHeight: 1.4 },
  cardsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
    marginBottom: 40,
  },
  card: {
    borderRadius: 20,
    padding: '32px 28px',
    transition: 'all .2s ease',
    cursor: 'default',
    display: 'flex',
    flexDirection: 'column',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: '#18181B',
    letterSpacing: '-0.5px',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#A1A1AA',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  cardDesc: {
    fontSize: 14,
    color: '#52525B',
    lineHeight: 1.65,
    marginBottom: 20,
  },
  featureList: {
    listStyle: 'none',
    margin: '0 0 20px',
    padding: 0,
    flex: 1,
  },
  featureItem: {
    fontSize: 13,
    color: '#3F3F46',
    marginBottom: 8,
    lineHeight: 1.4,
    display: 'flex',
    alignItems: 'flex-start',
  },
  note: {
    fontSize: 11,
    color: '#71717A',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 8,
    padding: '8px 12px',
    marginBottom: 16,
    lineHeight: 1.5,
  },
  cta: {
    display: 'block',
    width: '100%',
    padding: '13px 0',
    color: 'white',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    letterSpacing: '-0.2px',
    marginTop: 'auto',
    transition: 'opacity .15s',
  },
  footer: {
    textAlign: 'center',
    paddingTop: 20,
    borderTop: '1px solid rgba(0,0,0,0.06)',
  },
  footerText: { fontSize: 13, color: '#A1A1AA', marginBottom: 4 },
  footerSub: { fontSize: 11, color: '#C4C4C4' },
};
