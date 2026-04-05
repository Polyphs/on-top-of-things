# OT² v3 — Full Deployment Guide
## GitHub → Netlify → Supabase

---

## PHASE 1 — Archive old `main` to a release branch (on-top-of-things repo)

Run these in Git Bash / PowerShell from any directory (you just need git access to the old repo):

```bash
# 1. Clone the old repo (if not already local)
git clone https://github.com/<your-username>/on-top-of-things.git
cd on-top-of-things

# 2. Create the archive branch FROM the current main
git checkout -b prev-release

# 3. Push it up
git push origin prev-release

# Done — old code is now safely archived at origin/prev-release
```

---

## PHASE 2 — Create the new OT3 repo and push to GitHub

```bash
# 1. Switch to your project folder
cd D:\BUSINESS\coral\ot3

# 2. Copy the uploaded JSX into src/ (do this manually in Explorer or):
#    src/OT2_v3_Pool_Pod_Blink.jsx   ← your uploaded component
#    (All other files are already scaffolded)

# 3. Initialise git
git init
git branch -M main

# 4. Stage everything
git add .
git commit -m "feat: OT² v3 — Pool · Pod · Blink Edition (initial)"

# 5. Create a NEW repo on GitHub (DO NOT initialise with README)
#    Go to https://github.com/new → name it "ot3" → Create repository

# 6. Link and push
git remote add origin https://github.com/<your-username>/ot3.git
git push -u origin main
```

---

## PHASE 3 — Deploy to Netlify

### Option A: Netlify CLI (fastest)

```bash
# Install CLI globally (once)
npm install -g netlify-cli

# In your ot3 folder
cd D:\BUSINESS\coral\ot3
npm install
npm run build          # verify build passes locally first

netlify login          # opens browser for auth
netlify init           # choose "Create & configure a new site"
                       #   Build command:  npm run build
                       #   Publish dir:    dist

netlify deploy --prod  # live deploy
```

### Option B: Netlify Dashboard (drag-and-drop)

```
1. Run:  npm run build   →  creates dist/ folder
2. Go to https://app.netlify.com → "Add new site" → "Deploy manually"
3. Drag the dist/ folder onto the upload zone
4. Your site is live instantly!
5. Then connect to GitHub repo for auto-deploys:
   Site settings → Build & deploy → Link repository → pick ot3
```

### Set Netlify Environment Variables

In Netlify Dashboard → Site → Environment Variables → Add:

```
VITE_SUPABASE_URL        = https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY   = eyJ...  (your anon key from Supabase)
```

Then trigger a redeploy: Deploys → Trigger deploy → Deploy site.

---

## PHASE 4 — Supabase Backend Integration

### 4a. Run migrations in Supabase SQL Editor

1. Go to https://supabase.com → your project → SQL Editor
2. If starting fresh, run `migrations/001_initial_schema.sql` first
3. Then run `migrations/002_v3_pools_pods_blink.sql`
4. Confirm these tables exist:
   - `profiles`, `tasks`, `reflections`, `task_reviews`, `timer_sessions`, `otp_codes`
   - `pools`, `pool_members`, `pods`, `pod_members`, `pod_logs`

### 4b. Deploy Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

supabase login
supabase link --project-ref <your-project-ref>

supabase functions deploy send-otp
supabase functions deploy verify-otp
supabase functions deploy generate-coaching-questions
```

### 4c. Set Edge Function Secrets

In Supabase Dashboard → Settings → Edge Functions → Add secrets:

```
RESEND_API_KEY              = re_xxxxxxxx
OPENAI_API_KEY              = sk-xxxxxxxx
SUPABASE_URL                = https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY   = eyJ...  (service role key — keep secret!)
```

### 4d. Wire Supabase into the JSX component

In `src/OT2_v3_Pool_Pod_Blink.jsx`, find the AICoachingService definition at the top and update the EDGE_FUNCTION_URL:

```js
// BEFORE (line ~80):
EDGE_FUNCTION_URL: '',

// AFTER — reads from env at build time:
EDGE_FUNCTION_URL: import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-coaching-questions`
  : '',
```

Then replace the TEST_USERS mock auth block with real Supabase auth. In the login handler (search for `TEST_USERS`), replace:

```js
// BEFORE — mock login
const user = TEST_USERS.find(u => u.email === email && u.password === password);
if (user) { ... }

// AFTER — real Supabase auth
import { signInWithPassword } from './lib/supabase.js'

const { data, error } = await signInWithPassword(email, password)
if (error) { setLoginError(error.message); return; }
const user = { email: data.user.email, profileName: data.user.user_metadata?.profile_name ?? email }
// continue with existing login flow...
```

### 4e. Swap localStorage for Supabase (progressive migration)

The `src/lib/supabase.js` client already has all the helpers. Swap calls incrementally:

| localStorage key      | Supabase function      |
|-----------------------|------------------------|
| `ot2_guest_tasks`     | `fetchTasks(userId)`   |
| `ot2_guest_reviews`   | `fetchReviews(userId)` |
| `ot2_pools`           | `fetchPools(userId)`   |
| `ot2_pods`            | `fetchPods(userId)`    |

Guest mode (no Supabase configured) will automatically fall back to localStorage — `supabase.js` returns `[]` gracefully when env vars are absent.

---

## PHASE 5 — Auth Settings in Supabase

Dashboard → Authentication → Settings:

- **Email provider**: Enabled
- **Confirm email**: DISABLED (you use custom OTP flow via Resend)
- **Site URL**: `https://your-netlify-site.netlify.app`
- **Redirect URLs**: add your Netlify URL

---

## Quick Verification Checklist

After deploying:

- [ ] Site loads at Netlify URL (no blank screen, no console errors)
- [ ] Guest mode works (can add tasks without login)
- [ ] Login triggers OTP email (Resend configured)
- [ ] After login, tasks persist on refresh (Supabase round-trip working)
- [ ] AI coaching questions load from Edge Function
- [ ] Pools / Pods / Blink all render and save correctly
- [ ] Netlify auto-deploys on `git push origin main` ✅

---

## File Layout Reference

```
D:\BUSINESS\coral\ot3\
├── src/
│   ├── OT2_v3_Pool_Pod_Blink.jsx   ← main component (your upload)
│   ├── App.jsx                      ← thin wrapper
│   ├── main.jsx                     ← ReactDOM entry
│   ├── index.css                    ← global reset
│   └── lib/
│       └── supabase.js              ← Supabase client + all helpers
├── migrations/
│   └── 002_v3_pools_pods_blink.sql  ← run in Supabase SQL Editor
├── public/
│   └── ot3.svg                      ← favicon (add your own)
├── .env.example                     ← copy → .env.local with real keys
├── .gitignore
├── index.html
├── netlify.toml
├── package.json
└── vite.config.js
```

---

*OT² v3 — Pool · Pod · Blink Edition*
*Deployment guide generated April 2026*
