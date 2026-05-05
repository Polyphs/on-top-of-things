import React, { useState, useEffect, useRef } from 'react';
import InvestorLanding from './InvestorLanding.jsx';
import OT2App from './OT2_v3_Pool_Pod_Blink.jsx';
import OT2StressTest from './OT2_StressTest.jsx';
import OT2Landing from './mkt-ot2-landing.jsx';
import OT2Blog from './mkt-ot2-blog.jsx';
import BlogCMSEnhanced from './mkt-ot2-blog-cms-enhanced.jsx';

// ============================================================================
// 🔑 ACCESS CODE — change before sharing with new investor groups
// ============================================================================
const ACCESS_CODE = 'ot2-2026';
const SESSION_KEY  = 'ot2_investor_unlocked';

// ============================================================================
// GATE SCREEN
// ============================================================================
function GateScreen({ onUnlock }) {
  const [value, setValue]       = useState('');
  const [error, setError]       = useState(false);
  const [shaking, setShaking]   = useState(false);
  const [attempts, setAttempts] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (value.trim().toLowerCase() === ACCESS_CODE.toLowerCase()) {
      sessionStorage.setItem(SESSION_KEY, '1');
      onUnlock();
    } else {
      setError(true);
      setShaking(true);
      setAttempts(a => a + 1);
      setTimeout(() => setShaking(false), 500);
      setTimeout(() => setError(false), 2500);
      setValue('');
      inputRef.current?.focus();
    }
  };

  return (
    <div style={gs.page}>
      <div style={gs.bg} />
      <div style={{ ...gs.card, ...(shaking ? gs.shake : {}) }}>
        <div style={gs.logoRow}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>
          </svg>
          <span style={gs.logoText}>OT<sup style={{ fontSize: 14 }}>2</sup></span>
        </div>
        <div style={gs.headline}>Investor Preview</div>
        <p style={gs.sub}>Enter your access code to continue.<br />Shared privately — please do not distribute.</p>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <input
            ref={inputRef}
            type="password"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Access code"
            style={{ ...gs.input, ...(error ? gs.inputError : {}) }}
            autoComplete="off"
          />
          <div style={gs.inputIcon}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={error ? '#EF4444' : '#A1A1AA'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
        </div>
        <div style={{ height: 20, marginBottom: 6 }}>
          {error && <p style={gs.errorText}>{attempts >= 3 ? 'Need the access code? Contact the team.' : 'Incorrect code — try again.'}</p>}
        </div>
        <button onClick={handleSubmit} style={gs.button}>Enter Preview →</button>
        <p style={gs.footer}>algai.app · OT² is a product of ALG AI</p>
      </div>
      <style>{`
        @keyframes shake  { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

const gs = {
  page:       { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'#F8F7F4', padding:24, position:'relative', overflow:'hidden' },
  bg:         { position:'absolute', inset:0, backgroundImage:'radial-gradient(circle at 20% 20%, rgba(255,107,107,0.07) 0%, transparent 60%), radial-gradient(circle at 80% 80%, rgba(66,153,225,0.06) 0%, transparent 60%)', pointerEvents:'none' },
  card:       { backgroundColor:'white', borderRadius:20, padding:'44px 40px 36px', maxWidth:400, width:'100%', boxShadow:'0 4px 6px rgba(0,0,0,0.04), 0 20px 60px rgba(0,0,0,0.08)', border:'1px solid rgba(0,0,0,0.06)', animation:'fadeIn .4s ease both', position:'relative', zIndex:1 },
  shake:      { animation:'shake 0.45s ease' },
  logoRow:    { display:'flex', alignItems:'center', gap:10, marginBottom:28, color:'#FF6B6B' },
  logoText:   { fontSize:28, fontWeight:800, letterSpacing:'-1.5px', color:'#18181B', lineHeight:1 },
  headline:   { fontSize:22, fontWeight:800, color:'#18181B', letterSpacing:'-0.5px', marginBottom:8 },
  sub:        { fontSize:14, color:'#71717A', lineHeight:1.6, marginBottom:28 },
  input:      { width:'100%', padding:'12px 14px 12px 42px', fontSize:15, border:'1.5px solid #E4E4E7', borderRadius:10, outline:'none', fontFamily:'inherit', color:'#18181B', backgroundColor:'#FAFAFA', letterSpacing:'0.08em', boxSizing:'border-box' },
  inputError: { borderColor:'#EF4444', backgroundColor:'#FFF5F5' },
  inputIcon:  { position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' },
  errorText:  { fontSize:13, color:'#EF4444', marginTop:2 },
  button:     { width:'100%', padding:'13px 0', backgroundColor:'#18181B', color:'white', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit', marginBottom:28 },
  footer:     { fontSize:12, color:'#A1A1AA', textAlign:'center' },
};

// ============================================================================
// DEMO TOP BAR — fixed bar at top of each demo letting investor go back
// ============================================================================
function DemoTopBar({ label, onBack }) {
  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:99999, backgroundColor:'rgba(24,24,27,0.92)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
      <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:'#A1A1AA', fontSize:13, cursor:'pointer', fontFamily:'inherit', padding:'4px 0' }}>
        ← Back to Investor Index
      </button>
      <span style={{ fontSize:11, color:'#71717A', letterSpacing:'0.05em', fontWeight:600 }}>{label}</span>
      <span style={{ fontSize:10, color:'#FF6B6B', fontWeight:700, letterSpacing:'0.08em' }}>● INVESTOR PREVIEW</span>
    </div>
  );
}

// ============================================================================
// URL ROUTING HELPER
// ============================================================================
function getCurrentPath() {
  const path = window.location.pathname;
  
  // Handle directory-based URLs
  if (path === '/ot2/' || path === '/ot2' || path.endsWith('/home')) return 'home';
  if (path.endsWith('/blog')) return 'blog';
  if (path.endsWith('/admin')) return 'admin';
  if (path.endsWith('/app/') || path === '/ot2/app') return 'app';
  
  return 'home'; // default to home
}

// ============================================================================
// PUBLIC NAVIGATION BAR
// ============================================================================
function PublicNavBar() {
  const currentPath = getCurrentPath();
  
  return (
    <div style={{ 
      position: 'sticky', 
      top: 0, 
      zIndex: 100, 
      background: 'rgba(255, 255, 255, 0.95)', 
      backdropFilter: 'blur(10px)', 
      borderBottom: '1px solid rgba(0, 0, 0, 0.05)', 
      padding: '1rem 2rem' 
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <div style={{ 
          fontSize: '24px', 
          fontWeight: 500, 
          background: 'linear-gradient(135deg, #0369a1, #0891b2)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent', 
          backgroundClip: 'text',
          letterSpacing: '-1px',
          cursor: 'pointer'
        }} onClick={() => window.location.href = '/ot2/'}>
          OT²
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <a 
            href="/ot2/" 
            style={{ 
              color: currentPath === 'home' ? '#0369a1' : '#0891b2', 
              textDecoration: 'none', 
              fontWeight: 500, 
              transition: 'color 0.3s ease',
              borderBottom: currentPath === 'home' ? '2px solid #0369a1' : 'none',
              paddingBottom: '2px'
            }}
          >
            Home
          </a>
          <a 
            href="/ot2/blog" 
            style={{ 
              color: currentPath === 'blog' ? '#0369a1' : '#0891b2', 
              textDecoration: 'none', 
              fontWeight: 500, 
              transition: 'color 0.3s ease',
              borderBottom: currentPath === 'blog' ? '2px solid #0369a1' : 'none',
              paddingBottom: '2px'
            }}
          >
            Blog
          </a>
          <a 
            href="/ot2/app/" 
            style={{ 
              display: 'inline-block', 
              padding: '0.75rem 1.5rem', 
              background: '#0891b2', 
              color: 'white', 
              borderRadius: '6px', 
              textDecoration: 'none', 
              fontWeight: 500, 
              transition: 'all 0.3s ease' 
            }}
            onMouseEnter={(e) => { 
              e.target.style.background = '#0369a1'; 
              e.target.style.transform = 'translateY(-2px)'; 
            }}
            onMouseLeave={(e) => { 
              e.target.style.background = '#0891b2'; 
              e.target.style.transform = 'translateY(0)'; 
            }}
          >
            Open OT² →
          </a>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ROOT APP — URL-based routing with public/private access
// ============================================================================
export default function App() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');
  const [view, setView] = useState('landing'); // for investor demo navigation
  const [currentPath, setCurrentPath] = useState(getCurrentPath());

  // Update path when URL changes
  useEffect(() => {
    const handlePopState = () => setCurrentPath(getCurrentPath());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Public pages - no access code required
  if (currentPath === 'home') {
    return (
      <>
        <PublicNavBar />
        <div style={{ paddingTop: 0 }}>
          <OT2Landing />
        </div>
      </>
    );
  }

  if (currentPath === 'blog') {
    return (
      <>
        <PublicNavBar />
        <div style={{ paddingTop: 0 }}>
          <OT2Blog />
        </div>
      </>
    );
  }

  if (currentPath === 'admin') {
    return <BlogCMSEnhanced />;
  }

  // App access - requires access code
  if (currentPath === 'app') {
    if (!unlocked) return <GateScreen onUnlock={() => setUnlocked(true)} />;
    
    return (
      <>
        <DemoTopBar label="OT² v3 — Live Feature Demo" onBack={() => window.location.href = '/ot2/'} />
        <div style={{ paddingTop: 41 }}><OT2App /></div>
      </>
    );
  }

  // Fallback to investor demo for legacy routes
  if (!unlocked) return <GateScreen onUnlock={() => setUnlocked(true)} />;

  if (view === 'app') return (
    <>
      <DemoTopBar label="OT² v3 — Live Feature Demo" onBack={() => setView('landing')} />
      <div style={{ paddingTop: 41 }}><OT2App /></div>
    </>
  );

  if (view === 'stress') return (
    <>
      <DemoTopBar label="OT² Scale & Performance Demo" onBack={() => setView('landing')} />
      <div style={{ paddingTop: 41 }}><OT2StressTest /></div>
    </>
  );

  return <InvestorLanding onNavigate={setView} />;
}
