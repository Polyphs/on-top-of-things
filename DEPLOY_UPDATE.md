# OT² Investor Preview — Deployment Update Instructions

**What changed:** The app now has an investor landing page between the gate and the demos.
After entering the access code, investors see a polished index with two cards:
- 🚀 **Live Feature Demo** → `OT2_v3_Pool_Pod_Blink.jsx`
- 📊 **Scale & Performance Demo** → `OT2_StressTest.jsx`

---

## New src/ file structure

```
src/
├── App.jsx                       ← REPLACE (gate + routing)
├── InvestorLanding.jsx           ← NEW (index page)
├── main.jsx                      ← unchanged
├── OT2_v3_Pool_Pod_Blink.jsx     ← unchanged (your main app)
└── OT2_StressTest.jsx            ← unchanged (scale demo)
```

---

## Step 1 — Copy the new files into your src/ folder

From the files you received:

| File | Action | Destination |
|---|---|---|
| `App.jsx` | Replace existing | `src/App.jsx` |
| `InvestorLanding.jsx` | Add new | `src/InvestorLanding.jsx` |

Your `OT2_v3_Pool_Pod_Blink.jsx` and `OT2_StressTest.jsx` stay exactly as they are.

---

## Step 2 — Build

```bash
npm run build
```

You should see:
```
vite v5.x building for production...
✓ N modules transformed.
dist/index.html         ...
dist/assets/index-xxx.js ...
built in X.XXs
  moved: dist/assets → dist/ot2/assets
  moved: dist/index.html → dist/ot2/index.html
✅ Post-build complete — dist/ot2/ is ready for Netlify
```

---

## Step 3 — Deploy

```bash
netlify deploy --prod
```

---

## Step 4 — Test the deploy flow

1. Open `https://algai.app/ot2` (or your Netlify URL)
2. You should see the **gate screen** — enter `ot2-2026`
3. You should land on the **investor index page** with two demo cards
4. Click **"Open Live Demo →"** — full OT² app loads with a dark "← Back" bar at top
5. Click back, then **"Open Scale Demo →"** — stress test loads with seed panel
6. After seeding, verify debug overlays appear (orange DEBUG badge in header)
7. Click "← Back to Investor Index" — confirms navigation works

---

## Changing the access code

Edit line 8 of `src/App.jsx`:
```js
const ACCESS_CODE = 'ot2-2026';  // ← change this
```
Then `npm run build && netlify deploy --prod`.

---

## Important note: shared localStorage

Both demos use the **same localStorage keys**. When you seed the stress test,
it overwrites any tasks in the live demo. The investor landing page notes this
with a warning on the stress test card.

To demo the live app with clean data:
1. Open the Scale Demo → click "Reset data" in its header
2. Go back to the index → open the Live Demo

---

## Responsive / mobile note

The investor landing uses a 4-column pillar row and 2-column card grid.
On screens < 640px these will stack vertically. No changes needed — CSS
`grid-template-columns` with `minmax` handles this automatically via the
existing inline styles.

---

_Updated: 2026-04-05_
