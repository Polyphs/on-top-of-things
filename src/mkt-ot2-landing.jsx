import React, { useState, useEffect } from 'react';

export default function OT2Landing() {
  const [scrollY, setScrollY] = useState(0);
  const [bannerIndex, setBannerIndex] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-rotate banners every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % 2);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const banners = [
    {
      title: "Act on What Matters, NOW!",
      description: "Todo lists capture \"what you want to do\". OT² goes further to help you act on what you truly need to do, right now.",
      color: "#0891b2",
      textColor: "white",
      useBgGradient: true
    },
    {
      title: "Clarity through Questions",
      description: "Transform how you work by understanding what matters most. OT² combines Socratic coaching with mindful productivity.",
      color: "#d4f1f9",
      textColor: "#1a1a1a",
      useBgGradient: false
    }
  ];

  const currentBanner = banners[bannerIndex];

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", sans-serif', color: '#1a1a1a', background: '#ffffff', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Rotating Banner Carousel */}
      <div style={{ 
        background: currentBanner.useBgGradient ? `linear-gradient(135deg, ${currentBanner.color} 0%, rgba(8, 145, 178, 0.8) 100%)` : currentBanner.color,
        color: currentBanner.textColor || 'white',
        position: 'relative',
        padding: '2.5rem 2rem',
        textAlign: 'center',
        overflow: 'hidden'
      }} className="banner-carousel">
        <button 
          className="banner-arrow prev" 
          onClick={() => setBannerIndex((prev) => (prev - 1 + 2) % 2)}
          style={{ color: currentBanner.textColor || 'white' }}
        >
          ‹
        </button>
        <div className="banner-content" style={{ color: currentBanner.textColor || 'white' }}>
          <h2 style={{ color: currentBanner.textColor || 'white' }}>{currentBanner.title}</h2>
          <p style={{ color: currentBanner.textColor || 'white', opacity: currentBanner.useBgGradient ? 0.95 : 1 }} dangerouslySetInnerHTML={{ __html: currentBanner.description }} />
          <div className="banner-controls">
            {banners.map((_, idx) => (
              <div
                key={idx}
                className={`banner-dot ${idx === bannerIndex ? 'active' : ''}`}
                onClick={() => setBannerIndex(idx)}
                style={{
                  background: idx === bannerIndex ? (currentBanner.useBgGradient ? 'white' : '#0891b2') : `rgba(${currentBanner.useBgGradient ? '255, 255, 255' : '8, 145, 178'}, 0.5)`,
                  borderColor: currentBanner.useBgGradient ? 'rgba(255, 255, 255, 0.7)' : 'rgba(8, 145, 178, 0.7)'
                }}
              />
            ))}
          </div>
        </div>
        <button 
          className="banner-arrow next" 
          onClick={() => setBannerIndex((prev) => (prev + 1) % 2)}
          style={{ color: currentBanner.textColor || 'white' }}
        >
          ›
        </button>
      </div>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { background: #ffffff; }
        
        .banner-carousel { 
          position: relative; 
          text-align: center; 
          overflow: hidden;
        }
        
        .banner-content { 
          max-width: 1000px; 
          margin: 0 auto; 
          animation: fadeInUp 0.6s ease-out;
        }
        
        .banner-carousel h2 { 
          font-size: 2rem; 
          margin-bottom: 0.75rem; 
          font-weight: 500;
        }
        
        .banner-carousel p { 
          font-size: 1.1rem; 
          line-height: 1.6; 
        }
        
        .banner-controls { 
          display: flex; 
          justify-content: center; 
          gap: 1rem; 
          margin-top: 1.5rem; 
        }
        
        .banner-dot { 
          width: 10px; 
          height: 10px; 
          border-radius: 50%; 
          cursor: pointer; 
          transition: all 0.3s ease; 
        }
        
        .banner-dot.active { 
          width: 30px; 
          border-radius: 5px; 
        }
        
        .banner-arrow { 
          position: absolute; 
          top: 50%; 
          transform: translateY(-50%); 
          background: rgba(0, 0, 0, 0.15); 
          border: none; 
          width: 40px; 
          height: 40px; 
          border-radius: 50%; 
          cursor: pointer; 
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: bold;
        }
        
        .banner-arrow:hover { 
          background: rgba(0, 0, 0, 0.25); 
        }
        
        .banner-arrow.prev { left: 2rem; }
        .banner-arrow.next { right: 2rem; }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .navbar { 
          position: sticky; 
          top: 0; 
          z-index: 100; 
          background: rgba(255, 255, 255, 0.95); 
          backdrop-filter: blur(10px); 
          border-bottom: 1px solid rgba(0, 0, 0, 0.05); 
          padding: 1rem 2rem; 
          animation: slideDown 0.4s ease-out;
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .nav-container { 
          max-width: 1200px; 
          margin: 0 auto; 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
        }
        
        .nav-brand { 
          font-size: 24px; 
          font-weight: 500; 
          background: linear-gradient(135deg, #0369a1, #0891b2); 
          -webkit-background-clip: text; 
          -webkit-text-fill-color: transparent; 
          background-clip: text;
          letter-spacing: -1px;
        }
        
        .nav-link { 
          display: inline-block; 
          padding: 0.75rem 1.5rem; 
          background: #0891b2; 
          color: white; 
          border-radius: 6px; 
          text-decoration: none; 
          font-weight: 500; 
          transition: all 0.3s ease; 
        }
        
        .nav-link:hover { 
          background: #0369a1; 
          transform: translateY(-2px); 
          box-shadow: 0 8px 16px rgba(6, 105, 161, 0.2); 
        }
        
        .hero { 
          padding: 6rem 2rem; 
          text-align: center; 
          background: linear-gradient(135deg, rgba(6, 105, 161, 0.05) 0%, rgba(8, 145, 178, 0.05) 100%); 
          position: relative; 
          overflow: hidden; 
        }
        
        .hero::before { 
          content: ''; 
          position: absolute; 
          top: -50%; 
          right: -10%; 
          width: 500px; 
          height: 500px; 
          border-radius: 50%; 
          background: rgba(8, 145, 178, 0.1); 
          z-index: 0; 
        }
        
        .hero-content { 
          max-width: 900px; 
          margin: 0 auto; 
          position: relative; 
          z-index: 1; 
          animation: fadeInUp 0.8s ease-out 0.2s both;
        }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .hero h1 { 
          font-size: 3.5rem; 
          font-weight: 500; 
          line-height: 1.2; 
          margin-bottom: 1rem; 
          color: #1a1a1a;
        }
        
        .hero .tagline { 
          font-size: 1.3rem; 
          color: #666; 
          margin-bottom: 2rem; 
          font-weight: 400; 
          line-height: 1.6;
        }
        
        .usp { 
          display: inline-block; 
          padding: 0.75rem 1.5rem; 
          background: rgba(8, 145, 178, 0.1); 
          border: 1px solid rgba(8, 145, 178, 0.3); 
          border-radius: 6px; 
          color: #0891b2; 
          font-weight: 500; 
          margin-bottom: 2rem; 
        }
        
        .pillars { 
          max-width: 1200px; 
          margin: 4rem auto; 
          padding: 0 2rem; 
        }
        
        .pillars-title { 
          text-align: center; 
          font-size: 2.5rem; 
          font-weight: 500; 
          margin-bottom: 3rem; 
          color: #1a1a1a;
        }
        
        .pillars-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
          gap: 2rem; 
        }
        
        .pillar { 
          background: #f8f9fa; 
          padding: 2rem; 
          border-radius: 12px; 
          border-left: 4px solid #0891b2; 
          transition: all 0.3s ease; 
          position: relative; 
        }
        
        .pillar:nth-child(2) { border-left-color: #06b6d4; }
        .pillar:nth-child(3) { border-left-color: #0284c7; }
        .pillar:nth-child(4) { border-left-color: #0369a1; }
        
        .pillar:hover { 
          transform: translateY(-8px); 
          box-shadow: 0 12px 24px rgba(6, 105, 161, 0.1); 
        }
        
        .pillar-num { 
          font-size: 2.5rem; 
          font-weight: 500; 
          color: #0891b2; 
          margin-bottom: 0.5rem; 
        }
        
        .pillar h3 { 
          font-size: 1.3rem; 
          font-weight: 500; 
          margin-bottom: 0.75rem; 
          color: #1a1a1a;
        }
        
        .pillar p { 
          color: #666; 
          line-height: 1.6; 
        }
        
        .benefits { 
          background: linear-gradient(135deg, rgba(6, 105, 161, 0.05) 0%, rgba(8, 145, 178, 0.05) 100%); 
          padding: 4rem 2rem; 
          margin: 4rem 0; 
        }
        
        .benefits-content { 
          max-width: 1200px; 
          margin: 0 auto; 
        }
        
        .benefits-title { 
          font-size: 2rem; 
          font-weight: 500; 
          margin-bottom: 2rem; 
          text-align: center; 
          color: #1a1a1a;
        }
        
        .benefit-list { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
          gap: 1.5rem; 
        }
        
        .benefit-item { 
          padding: 1.5rem; 
          background: #ffffff; 
          border-radius: 8px; 
          border-top: 3px solid #0891b2; 
        }
        
        .benefit-item h4 { 
          font-size: 1.1rem; 
          font-weight: 500; 
          margin-bottom: 0.5rem; 
          color: #0369a1; 
        }
        
        .benefit-item p { 
          color: #666; 
          font-size: 0.95rem; 
          line-height: 1.6; 
        }
        
        .cta-section { 
          padding: 4rem 2rem; 
          text-align: center; 
          background: linear-gradient(135deg, #0369a1 0%, #0891b2 100%); 
          color: white; 
        }
        
        .cta-content { 
          max-width: 800px; 
          margin: 0 auto; 
        }
        
        .cta-section h2 { 
          font-size: 2rem; 
          font-weight: 500; 
          margin-bottom: 1rem; 
        }
        
        .cta-section p { 
          font-size: 1.1rem; 
          margin-bottom: 2rem; 
          opacity: 0.95; 
        }
        
        .cta-button { 
          display: inline-block; 
          padding: 1rem 2.5rem; 
          background: white; 
          color: #0369a1; 
          border: none; 
          border-radius: 6px; 
          font-weight: 600; 
          font-size: 1rem; 
          cursor: pointer; 
          transition: all 0.3s ease; 
          text-decoration: none; 
        }
        
        .cta-button:hover { 
          transform: scale(1.05); 
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15); 
        }
        
        .footer { 
          padding: 3rem 2rem; 
          background: #f8f9fa; 
          border-top: 1px solid #e0e0e0; 
        }
        
        .footer-content { 
          max-width: 1200px; 
          margin: 0 auto; 
          text-align: center; 
          color: #666; 
        }
        
        .footer-links { 
          margin-bottom: 1.5rem; 
        }
        
        .footer-links a { 
          color: #0891b2; 
          text-decoration: none; 
          margin: 0 1rem; 
          transition: color 0.3s ease; 
        }
        
        .footer-links a:hover { 
          color: #0369a1; 
        }
        
        .footer-text { 
          font-size: 0.9rem; 
        }
        
        @media (max-width: 768px) {
          .hero h1 { font-size: 2rem; }
          .hero .tagline { font-size: 1rem; }
          .pillars-title { font-size: 1.8rem; }
          .nav-container { flex-direction: column; gap: 1rem; }
          .cta-section h2 { font-size: 1.5rem; }
        }
      `}</style>

      {/* Navigation handled by PublicNavBar in App.jsx */}

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Act on what you need to do, NOW!</h1>
          <p className="tagline">Todo lists capture "what you want to do". OT² goes further to help you <strong>act on what you need to do, right now</strong>.</p>
          <div className="usp">Private. Mindful. Impactful.</div>
        </div>
      </section>

      {/* Four Pillars */}
      <section className="pillars">
        <h2 className="pillars-title">Four pillars of focus</h2>
        <div className="pillars-grid">
          <div className="pillar">
            <div className="pillar-num">01</div>
            <h3>Fast capture</h3>
            <p>Quickly jot down ideas without friction. Capture what's on your mind in seconds, not paragraphs. Your inbox, your way.</p>
          </div>
          <div className="pillar">
            <div className="pillar-num">02</div>
            <h3>Socratic clarity</h3>
            <p>Dig deeper with intelligent questions. OT² coaches you to understand the 'why' behind your work, revealing what truly matters.</p>
          </div>
          <div className="pillar">
            <div className="pillar-num">03</div>
            <h3>Timed execution</h3>
            <p>Work with intention, not distraction. Execute focused work sessions aligned with your energy and priorities.</p>
          </div>
          <div className="pillar">
            <div className="pillar-num">04</div>
            <h3>Zen learnings</h3>
            <p>Reflect and grow. Review your work patterns and build lasting habits through mindful retrospectives.</p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="benefits">
        <div className="benefits-content">
          <h2 className="benefits-title">Why OT² works</h2>
          <div className="benefit-list">
            <div className="benefit-item">
              <h4>🔒 Privacy first</h4>
              <p>All data stays on your device. No tracking, no analytics, no third-party access.</p>
            </div>
            <div className="benefit-item">
              <h4>💭 ADHD friendly</h4>
              <p>Designed for how you actually work—flexible, forgiving, and focus-oriented.</p>
            </div>
            <div className="benefit-item">
              <h4>🧠 Socratic coaching</h4>
              <p>AI-powered questions guide your thinking, not your decisions. You stay in control.</p>
            </div>
            <div className="benefit-item">
              <h4>📊 Multiple views</h4>
              <p>Kanban, Table, Quadrant, Energy Pool—organize work the way your brain prefers.</p>
            </div>
            <div className="benefit-item">
              <h4>⏱️ Timed sessions</h4>
              <p>Work with intention using built-in timers aligned with your natural rhythms.</p>
            </div>
            <div className="benefit-item">
              <h4>🌊 Marine impact</h4>
              <p>Part of a movement. Your subscription supports ocean conservation initiatives.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to rethink how you work?</h2>
          <p>Start free for 14 days. No credit card required. Join thousands discovering clarity through questions.</p>
          <a href="/ot2/app/" className="cta-button">Launch OT²</a>
        </div>
      </section>

      {/* Blog Section */}
      <section style={{ padding: '4rem 2rem', background: '#ffffff', borderTop: '1px solid #e0e0e0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 500, marginBottom: '3rem', textAlign: 'center', color: '#1a1a1a' }}>Latest insights</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
            <a href="https://algai.app/blog/systems-not-goals" style={{ textDecoration: 'none', color: 'inherit', background: '#f8f9fa', padding: '2rem', borderRadius: '12px', border: '1px solid #e0e0e0', transition: 'all 0.3s ease' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(6, 105, 161, 0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 500, marginBottom: '0.5rem', color: '#0891b2' }}>Systems, not goals</h3>
              <p style={{ color: '#666', lineHeight: 1.6, marginBottom: '1rem' }}>Why you don't rise to the level of your goals—you fall to the level of your systems.</p>
              <span style={{ color: '#0891b2', fontWeight: 500 }}>Read more →</span>
            </a>
            <a href="https://algai.app/blog/personal-coach" style={{ textDecoration: 'none', color: 'inherit', background: '#f8f9fa', padding: '2rem', borderRadius: '12px', border: '1px solid #e0e0e0', transition: 'all 0.3s ease' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(6, 105, 161, 0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 500, marginBottom: '0.5rem', color: '#0891b2' }}>Your personal Socratic coach</h3>
              <p style={{ color: '#666', lineHeight: 1.6, marginBottom: '1rem' }}>Stop paying for programs that don't stick. Get Socrates as your 1-1 coach, always with you.</p>
              <span style={{ color: '#0891b2', fontWeight: 500 }}>Read more →</span>
            </a>
            <a href="https://algai.app/blog/assisted-intelligence" style={{ textDecoration: 'none', color: 'inherit', background: '#f8f9fa', padding: '2rem', borderRadius: '12px', border: '1px solid #e0e0e0', transition: 'all 0.3s ease' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(6, 105, 161, 0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 500, marginBottom: '0.5rem', color: '#0891b2' }}>AI as assisted intelligence</h3>
              <p style={{ color: '#666', lineHeight: 1.6, marginBottom: '1rem' }}>In the AI craze, we remember: AI assists your thinking. It doesn't replace your effort.</p>
              <span style={{ color: '#0891b2', fontWeight: 500 }}>Read more →</span>
            </a>
          </div>
          <div style={{ textAlign: 'center' }}>
            <a href="/ot2/blog" style={{ display: 'inline-block', padding: '0.75rem 1.5rem', background: '#0891b2', color: 'white', borderRadius: '6px', textDecoration: 'none', fontWeight: 500, transition: 'all 0.3s ease' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#0369a1'; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#0891b2'; e.currentTarget.style.transform = 'translateY(0)'; }}>View all posts</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-links">
            <a href="https://algai.app">ALGAI Home</a>
            <a href="https://algai.app/privacy">Privacy</a>
            <a href="https://algai.app/contact">Contact</a>
          </div>
          <p className="footer-text">© 2026 ALGAI. Building the future of mindful productivity.</p>
        </div>
      </footer>
    </div>
  );
}
