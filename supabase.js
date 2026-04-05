import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[OT²] Supabase env vars not set — running in guest/localStorage mode.\n' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable cloud sync.'
  )
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

// ─── AUTH ────────────────────────────────────────────────────────────────────

export async function signInWithPassword(email, password) {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') }
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  if (!supabase) return
  return supabase.auth.signOut()
}

export function onAuthStateChange(callback) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null)
  })
  return () => data.subscription.unsubscribe()
}

export async function getCurrentUser() {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data?.user ?? null
}

// ─── TASKS ───────────────────────────────────────────────────────────────────

export async function fetchTasks(userId) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
  if (error) { console.error('[OT²] fetchTasks error:', error); return [] }
  return data
}

export async function createTask(task) {
  if (!supabase) return null
  const { data, error } = await supabase.from('tasks').insert(task).select().single()
  if (error) { console.error('[OT²] createTask error:', error); return null }
  return data
}

export async function updateTask(taskId, updates) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single()
  if (error) { console.error('[OT²] updateTask error:', error); return null }
  return data
}

export async function deleteTask(taskId) {
  if (!supabase) return
  await supabase.from('tasks').delete().eq('id', taskId)
}

// ─── REFLECTIONS ─────────────────────────────────────────────────────────────

export async function fetchReflections(taskId) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('reflections')
    .select('*')
    .eq('task_id', taskId)
  if (error) { console.error('[OT²] fetchReflections error:', error); return [] }
  return data
}

export async function upsertReflection(reflection) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('reflections')
    .upsert(reflection, { onConflict: 'task_id,question_key' })
    .select()
    .single()
  if (error) { console.error('[OT²] upsertReflection error:', error); return null }
  return data
}

// ─── REVIEWS ─────────────────────────────────────────────────────────────────

export async function fetchReviews(userId) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('task_reviews')
    .select('*, tasks(content)')
    .eq('user_id', userId)
    .order('reviewed_at', { ascending: false })
  if (error) { console.error('[OT²] fetchReviews error:', error); return [] }
  return data
}

export async function createReview(review) {
  if (!supabase) return null
  const { data, error } = await supabase.from('task_reviews').insert(review).select().single()
  if (error) { console.error('[OT²] createReview error:', error); return null }
  return data
}

// ─── TIMER SESSIONS ──────────────────────────────────────────────────────────

export async function startTimerSession(taskId, userId) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('timer_sessions')
    .insert({ task_id: taskId, user_id: userId, started_at: new Date().toISOString(), status: 'running' })
    .select()
    .single()
  if (error) { console.error('[OT²] startTimerSession error:', error); return null }
  return data
}

export async function endTimerSession(sessionId, durationSeconds) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('timer_sessions')
    .update({ status: 'completed', ended_at: new Date().toISOString(), duration_seconds: durationSeconds })
    .eq('id', sessionId)
    .select()
    .single()
  if (error) { console.error('[OT²] endTimerSession error:', error); return null }
  return data
}

// ─── POOLS ───────────────────────────────────────────────────────────────────

export async function fetchPools(userId) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('pools')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) { console.error('[OT²] fetchPools error:', error); return [] }
  return data
}

export async function upsertPool(pool) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('pools')
    .upsert(pool, { onConflict: 'id' })
    .select()
    .single()
  if (error) { console.error('[OT²] upsertPool error:', error); return null }
  return data
}

export async function deletePool(poolId) {
  if (!supabase) return
  await supabase.from('pools').delete().eq('id', poolId)
}

// ─── PODS ────────────────────────────────────────────────────────────────────

export async function fetchPods(userId) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('pods')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) { console.error('[OT²] fetchPods error:', error); return [] }
  return data
}

export async function upsertPod(pod) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('pods')
    .upsert(pod, { onConflict: 'id' })
    .select()
    .single()
  if (error) { console.error('[OT²] upsertPod error:', error); return null }
  return data
}

// ─── OTP AUTH (via Edge Functions) ───────────────────────────────────────────

export async function sendOTP(email, type = 'signup', profileName = '') {
  if (!supabase) return { success: false, error: 'Supabase not configured' }
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const res = await fetch(`${supabaseUrl}/functions/v1/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, type, profile_name: profileName }),
  })
  return res.json()
}

export async function verifyOTP(email, code, type, password, profileName) {
  if (!supabase) return { success: false, error: 'Supabase not configured' }
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const res = await fetch(`${supabaseUrl}/functions/v1/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, type, password, profile_name: profileName }),
  })
  return res.json()
}

// ─── EDGE FUNCTION: AI COACHING ──────────────────────────────────────────────

export function getEdgeFunctionUrl() {
  const url = import.meta.env.VITE_SUPABASE_URL
  return url ? `${url}/functions/v1/generate-coaching-questions` : ''
}
