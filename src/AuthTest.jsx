// src/AuthTest.jsx — DELETE this file after Step 8 is confirmed working
import React, { useState } from 'react';
import { supabase } from './supabase.js';

export default function AuthTest() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [log, setLog]           = useState([]);

  const add = (msg) => setLog(p => [`${new Date().toLocaleTimeString()} — ${msg}`, ...p]);

  const signUp = async () => {
    add('Signing up...');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { profile_name: name } },
    });
    if (error) { add(`❌ Sign up error: ${error.message}`); return; }
    add(`✅ Sign up success — user id: ${data.user?.id}`);
  };

  const signIn = async () => {
    add('Signing in...');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { add(`❌ Sign in error: ${error.message}`); return; }
    add(`✅ Signed in as: ${data.user?.email}`);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    add('👋 Signed out');
  };

  const checkSession = async () => {
    const { data } = await supabase.auth.getSession();
    add(data.session ? `✅ Session active — ${data.session.user.email}` : '⚠️ No active session');
  };

  const checkProfile = async () => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) { add(`❌ Profile error: ${error.message}`); return; }
    add(`✅ Profile: ${JSON.stringify(data)}`);
  };

  return (
    <div style={{ padding: 40, fontFamily: 'monospace', maxWidth: 500 }}>
      <h2>OT² Auth Test</h2>
      <input placeholder="Name"     value={name}     onChange={e => setName(e.target.value)}     style={inp} /><br />
      <input placeholder="Email"    value={email}    onChange={e => setEmail(e.target.value)}    style={inp} /><br />
      <input placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={inp} type="password" /><br />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
        <button onClick={signUp}>Sign Up</button>
        <button onClick={signIn}>Sign In</button>
        <button onClick={signOut}>Sign Out</button>
        <button onClick={checkSession}>Check Session</button>
        <button onClick={checkProfile}>Check Profile</button>
      </div>

      <div style={{ backgroundColor: '#0f0f0f', color: '#a3e635', padding: 16, borderRadius: 8, minHeight: 200, fontSize: 12 }}>
        {log.length === 0 && <span style={{ color: '#444' }}>Output appears here...</span>}
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}

const inp = { display: 'block', margin: '6px 0', padding: '8px 12px', width: '100%', fontSize: 14, boxSizing: 'border-box' };