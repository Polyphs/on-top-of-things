# OT² Deployment Guide — Live Product

**Current Status:** Live product (evolved from investor preview). Auth sessions persist. Coral subscription model ready for implementation.

---

## Quick Deploy Workflow

```bash
# 1. Build
npm run build

# 2. Verify dist/ot2/ exists with assets and index.html

# 3. Deploy to Netlify
netlify deploy --prod
```

**Expected build output:**
```
vite v6.x building for production...
✓ 30 modules transformed.
dist/index.html                  1.45 kB │ gzip:   0.81 kB
dist/assets/index-xxx.js       393 kB │ gzip: 114.75 kB
  moved: dist/assets → dist/ot2/assets
  moved: dist/index.html → dist/ot2/index.html
✅ Post-build complete — dist/ot2/ is ready for Netlify
```

---

## Key Changes from Investor Preview

### Auth Session Persistence (FEAT-029)
- User sessions now survive page refreshes and Netlify redeployments
- `localStorage` key: `ot2_user`
- **No need to sign in again after deploy** — users stay logged in

### Header Redesign (FEAT-028)
- Hero title + tagline moved inline into sticky header
- No separate hero section — maximized content area
- Cleaner, more focused layout

### Business Model Locked
**Free Tier:**
- 75 active pending tasks
- 3 AI Project Seeds
- Browser push notifications

**Premium "Coral" Tier (~$6/month):**
- Unlimited tasks + AI Seeds
- Native apps (iOS/Android/Desktop)
- WhatsApp/SMS/Telegram/alarm notifications
- Stripe integration for payments

---

## Subscription Gating (Future Implementation)

Premium features will check `subscription_status === 'active'` from Supabase:

```javascript
// Example gating pattern
const isPremium = user?.subscription_status === 'active';

{isPremium ? (
  <WhatsAppNotifications />
) : (
  <UpgradePrompt feature="WhatsApp notifications" />
)}
```

---

## Testing Checklist

Before each deploy:
- [ ] Build succeeds with no errors
- [ ] Sign in persists after page refresh
- [ ] Header shows inline hero correctly
- [ ] Review Mode hides CTA when authenticated
- [ ] Star ratings highlight correctly (1-5 stars)

---

## Troubleshooting

**Auth lost after deploy?**
- Check `localStorage.getItem('ot2_user')` in console
- Verify `useAuth` hook initializes from localStorage

**Icons oversized in production?**
- Tailwind polyfill (FEAT-018) should handle this
- Check `styleSheet` injection includes size classes

---

_Updated: 2026-04-23_
