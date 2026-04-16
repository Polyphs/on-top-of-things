// src/useAuth.js
// Handles all Supabase auth — sign up, sign in, sign out, session restore
import { useState, useEffect } from 'react';
import { supabase } from './supabase.js';

export function useAuth() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // true while checking session on mount

  useEffect(() => {
    // Check if a session already exists (page refresh, returning user)
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // Listen for login / logout events
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signUp = async (email, password, profileName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { profile_name: profileName } },
    });
    if (error) return { error };
    return { user: data.user };
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };
    return { user: data.user };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/ot2',
    });
    if (error) return { error };
    return { success: true };
  };

  return { user, loading, signUp, signIn, signOut, resetPassword };
}