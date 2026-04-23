# OT² Design Standards — ADHD-First UX

**Philosophy:** Design for ADHD personas first. If it works for them, it's effortless for everyone.

---

## 1. Design Philosophy

OT²'s core differentiator is **cognitive load reduction**. Every pixel, animation, and interaction serves this goal.

**Target Persona:** ADHD individuals struggle with:
- Task initiation (blank-page paralysis)
- Time perception ("time blindness")
- Sustained focus
- Guilt from missed deadlines
- Decision fatigue

**Design Goal:** Create an app so forgiving and intuitive that ADHD users don't abandon it. Regular users will then find it "just right."

---

## 2. Core Principles

| Principle | Implementation |
|-----------|---------------|
| **Low Cognitive Load** | One primary action per screen. No competing CTAs. |
| **Immediate Feedback** | Every click produces visible response within 100ms. |
| **High Forgiveness** | No red overdue walls. "Paused" framing over "Missed." |
| **Spatial Organization** | Fixed mode locations (Freedom→Focus→Work→Review). Muscle memory builds. |
| **Dopamine Rewards** | Micro-celebrations on completion. Visual progress indicators. |
| **Clear Exit Points** | Every mode has obvious "Done" or "Next" button. |

---

## 3. Color Palette

| Role | Hex | Usage |
|------|-----|-------|
| **Primary Accent** | `#FF6B6B` | Rotating T-words, focus pulses, CTAs |
| **Indigo** | `#6366F1` | Header, navigation, Pool badges |
| **Teal** | `#10B981` | Success states, completions, positive feedback |
| **Sky** | `#0EA5E9` | Links, info states, secondary actions |
| **Zinc 900** | `#18181B` | Primary text, headings |
| **Zinc 600** | `#4B5563` | Secondary text |
| **Zinc 400** | `#9CA3AF` | Muted text, placeholders |
| **Zinc 100** | `#F4F4F5` | Backgrounds, card fills |
| **White** | `#FFFFFF` | Cards, input backgrounds |

**Opacity Conventions:**
- 35% opacity: Disabled/locked states (future dates, blocked tasks)
- 50% opacity: Placeholder hints
- 70% opacity: Completed tasks (strikethrough)

---

## 4. Typography

**Font Family:** Inter (system fallback: -apple-system, BlinkMacSystemFont, sans-serif)

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Inline Hero Title | `20px` | 800 | 1.2 |
| Inline Hero Subtitle | `12px` | 400 | 1.4 |
| Section Heading | `18px` | 700 | 1.3 |
| Card Title | `16px` | 600 | 1.4 |
| Body Text | `14px` | 400 | 1.5 |
| Caption/Meta | `12px` | 400 | 1.4 |
| Badge Text | `11px` | 600 | 1 |

**Text Colors:**
- Primary: `#18181B`
- Secondary/Muted: `#71717A`
- Links: `#0EA5E9`

---

## 5. Spacing & Layout

**Container Widths:**
| Element | Max Width |
|---------|-----------|
| `main` | `1100px` |
| `guestCard` | `900px` |
| Modal dialog | `520px` |
| Input fields | `100%` of container |

**Padding Rhythm:**
- Card padding: `24px`
- Section gaps: `32px`
- Form field gaps: `16px`
- Tight group gaps: `8px`
- Header padding: `12px 24px`

**Border Radius:**
- Cards/sections: `16px`
- Pill buttons/nav: `100px`
- Input fields: `12px`
- Small badges: `6px`

---

## 6. Component Patterns

### Inline Styles (No Tailwind)
All styling uses inline `style={styles.xxx}` objects. CSS-in-JS for self-containment.

**Standard pattern:**
```javascript
const styles = {
  card: {
    background: '#FFFFFF',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #E5E7EB',
  },
  button: {
    padding: '10px 16px',
    borderRadius: '100px',
    background: '#6366F1',
    color: '#FFFFFF',
    fontWeight: 600,
    cursor: 'pointer',
  }
};
```

### Icon Sizing (Tailwind Polyfill)
SVG icons use Tailwind classes (`w-4 h-4`, etc.). These are polyfilled in `styleSheet` at runtime for environments without Tailwind.

---

## 7. Mode UX Rules

### Freedom Mode — Zero Structure
- **Purpose:** Brain dump without judgment
- **UX:** Single input field. No categorization yet.
- **Micro-prompts:** Rotating placeholders every 5s to break blank-page paralysis
- **Button:** Prominent "Focus" button with pulse animation to guide next step

### Focus Mode — One Thing at a Time
- **Purpose:** Socratic questioning to clarify task
- **UX:** Single question visible. Progress dots for pending tasks.
- **Structure:** 2-step process (planned: Associate → Socratic Clarity)
- **No overwhelm:** Max 3 questions before moving to Work

### Work Mode — Visual Execution
- **Purpose:** Do the work, track time
- **UX:** Clear task cards, relationship banners, timer prominent
- **Time Anchor:** Visual timer (progress bar/circle) for time blindness
- **Progress:** Satisfaction rating immediately available

### Review Mode — Reflection & Patterns
- **Purpose:** Learn from completed work
- **UX:** Statistics, rating distribution, editable reviews
- **No judgment:** Completed tasks show strikethrough, not deletion

---

## 8. Forgiveness Rules

| Anti-Pattern | Forgiving Alternative |
|--------------|----------------------|
| Red overdue warnings | "Paused" button appears after 48h; grey styling |
| "You missed 12 deadlines!" | "Fresh Start" resets to clean slate, no shame |
| Delete confirmations everywhere | Undo toast instead of blocking dialog |
| Complex settings | Sensible defaults, progressive disclosure |
| "Required fields" asterisks | All fields optional; smart defaults |

---

## 9. Header & Banner Standard

**Current Implementation (FEAT-028):**
- No separate hero section
- Hero title + tagline inline in sticky header
- Three-column layout: Logo | Title+Tagline | User Actions
- Maximizes visible content area

**Code pattern:**
```javascript
<div style={styles.headerContent}>
  <div style={styles.logo}>...</div>
  <div style={styles.inlineHero}>
    <h1 style={styles.inlineHeroTitle}>...</h1>
    <p style={styles.inlineHeroSubtitle}>...</p>
  </div>
  <div style={styles.headerRight}>...</div>
</div>
```

---

## 10. Notification UX

**Free Tier:**
- Browser push notifications only
- Daily digest at user-chosen time
- No alarm sounds

**Premium "Coral" Tier:**
- WhatsApp/Telegram/SMS via Twilio
- Alarm-style wake-up notifications (fullscreen + audio)
- Guaranteed delivery with retry logic

**Permission Flow:**
1. First task with reminder → subtle banner: "Enable notifications?"
2. Click → browser permission request
3. Denied → "You can enable later in Settings" (no nagging)

---

## 11. Animation Guidelines

| Animation | Duration | Easing | Use Case |
|-----------|----------|--------|----------|
| Focus pulse | 2s infinite | ease-in-out | Guide user to next step |
| Card flash | 900ms | ease-out | Task relationship highlight |
| Modal fade | 200ms | ease | Dialog open/close |
| Progress bar | Linear | — | Timer visualization |
| Hover scale | 150ms | ease | Button feedback |

**Performance:** Use `transform` and `opacity` only. Avoid `width`, `height`, `top`, `left` animations.

---

## 12. ADHD-Specific Micro-Features

| Feature | Purpose | Location |
|---------|---------|----------|
| Rotating prompts | Break blank-page paralysis | Freedom input |
| Time anchor | Combat time blindness | Work Mode timer |
| Micro-celebration | Dopamine reward | Task completion |
| Fresh start | Reset without guilt | After 48h absence |
| Progress dots | Visual pending count | Focus Mode header |
| Pulse animation | Guide attention | Freedom Mode "Focus" button |
| Inline hero | Reduce scrolling | Global header |

---

*Last updated: 2026-W17*
