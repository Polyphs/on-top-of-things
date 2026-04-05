import React, { useState, useEffect, useRef } from 'react';
import OT2_v3App from './OT2_v3_Pool_Pod_Blink.jsx';

// ============================================================================
// 🔑 ACCESS CODE — change this to whatever passphrase you want to share
//    with investors. It is compiled into the bundle, so treat it like a
//    light deterrent, not a security wall.
// ============================================================================
const ACCESS_CODE = 'ot2-2026';

// Session key — investor stays unlocked for the browser session
const SESSION_KEY = 'ot2_investor_unlocked';

// ============================================================================
// GATE SCREEN
// ============================================================================
function GateScreen({ onUnlock }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div style={gateStyles.page}>
      {/* Background texture */}
      <div style={gateStyles.bg} />

      <div style={{ ...gateStyles.card, ...(shaking ? gateStyles.shake : {}) }}>
        {/* Logo */}
        <div style={gateStyles.logoRow}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>
          </svg>
          <span style={gateStyles.logoText}>OT<sup style={{ fontSize: 14 }}>2</sup></span>
        </div>

        {/* Headline */}
        <div style={gateStyles.headline}>Investor Preview</div>
        <p style={gateStyles.sub}>
          Enter your access code to continue.<br />
          Shared privately — please do not distribute.
        </p>

        {/* Input */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <input
            ref={inputRef}
            type="password"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Access code"
            style={{
              ...gateStyles.input,
              ...(error ? gateStyles.inputError : {}),
            }}
            autoComplete="off"
            spellCheck={false}
          />
          {/* Lock icon inside input */}
          <div style={gateStyles.inputIcon}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={error ? '#EF4444' : '#A1A1AA'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
        </div>

        {/* Error message */}
        <div style={{ height: 20, marginBottom: 6 }}>
          {error && (
            <p style={gateStyles.errorText}>
              {attempts >= 3
                ? 'Need the access code? Contact the team.'
                : 'Incorrect code — try again.'}
            </p>
          )}
        </div>

        {/* Button */}
        <button onClick={handleSubmit} style={gateStyles.button}>
          Enter Preview →
        </button>

        {/* Footer note */}
        <p style={gateStyles.footer}>
          algai.app · OT² is a product of ALG AI
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-6px); }
          80%       { transform: translateX(6px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const gateStyles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F7F4',
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  bg: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `radial-gradient(circle at 20% 20%, rgba(255,107,107,0.07) 0%, transparent 60%),
                      radial-gradient(circle at 80% 80%, rgba(66,153,225,0.06) 0%, transparent 60%)`,
    pointerEvents: 'none',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: '44px 40px 36px',
    maxWidth: 400,
    width: '100%',
    boxShadow: '0 4px 6px rgba(0,0,0,0.04), 0 20px 60px rgba(0,0,0,0.08)',
    border: '1px solid rgba(0,0,0,0.06)',
    animation: 'fadeIn .4s ease both',
    position: 'relative',
    zIndex: 1,
  },
  shake: {
    animation: 'shake 0.45s ease',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
    color: '#FF6B6B',
  },
  logoText: {
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: '-1.5px',
    color: '#18181B',
    lineHeight: 1,
  },
  headline: {
    fontSize: 22,
    fontWeight: 800,
    color: '#18181B',
    letterSpacing: '-0.5px',
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    color: '#71717A',
    lineHeight: 1.6,
    marginBottom: 28,
  },
  input: {
    width: '100%',
    padding: '12px 14px 12px 42px',
    fontSize: 15,
    border: '1.5px solid #E4E4E7',
    borderRadius: 10,
    outline: 'none',
    fontFamily: 'inherit',
    color: '#18181B',
    backgroundColor: '#FAFAFA',
    transition: 'border-color .15s',
    letterSpacing: '0.08em',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FFF5F5',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    marginTop: 2,
  },
  button: {
    width: '100%',
    padding: '13px 0',
    backgroundColor: '#18181B',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    letterSpacing: '-0.2px',
    marginBottom: 28,
    transition: 'background-color .15s',
  },
  footer: {
    fontSize: 12,
    color: '#A1A1AA',
    textAlign: 'center',
  },
};

// ============================================================================
// INVESTOR BADGE — small persistent indicator that this is a preview build
// ============================================================================
function InvestorBadge() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      left: 16,
      zIndex: 9998,
      backgroundColor: 'rgba(24,24,27,0.85)',
      backdropFilter: 'blur(8px)',
      color: 'white',
      fontSize: 11,
      fontFamily: "'DM Sans', sans-serif",
      padding: '5px 10px 5px 12px',
      borderRadius: 100,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
      letterSpacing: '0.02em',
    }}>
      <span style={{ color: '#FF6B6B', fontSize: 8 }}>●</span>
      Investor Preview · algai.app/ot2
      <button
        onClick={() => setVisible(false)}
        style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', padding: '0 2px', fontSize: 14, lineHeight: 1 }}
        title="Dismiss"
      >×</button>
    </div>
  );
}

// ============================================================================
// ROOT APP
// ============================================================================
export default function App() {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === '1'
  );

  if (!unlocked) {
    return <GateScreen onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <>
      <OT2App />
      <InvestorBadge />
    </>
  );
}
