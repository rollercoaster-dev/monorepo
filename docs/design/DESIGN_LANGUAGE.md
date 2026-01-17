# OpenBadges System - Design Language

**For daily-use tools that have character but never overwhelm.**

This document defines the visual design language for openbadges-system, bridging the expressive personality of the landing page with the calm focus needed for regular use.

---

## Philosophy

### The Balance

| Landing Page        | Daily-Use Tool      |
| ------------------- | ------------------- |
| In your face        | In your corner      |
| Makes an impression | Gets out of the way |
| Bold statements     | Quiet confidence    |
| Emotional journey   | Functional clarity  |

### Core Principles

1. **Character without chaos** - Personality lives in small moments, not constant noise
2. **Calm is not boring** - Restraint is a design choice, not a lack of ideas
3. **Clarity over cleverness** - If you have to explain it, simplify it
4. **Accommodate, don't segregate** - Good defaults work for everyone; options help those who need them

### The Neurodivergent-First Commitment

Design for focus, not distraction. Build for users who need clarity.

- **ADHD**: Reduce distractions, support task completion, provide clear feedback
- **Autism**: Predictable layouts, consistent patterns, no surprises
- **Dyslexia**: Readable typography, adequate spacing, optional font switching
- **Sensory sensitivities**: Respect motion preferences, offer reduced contrast options

---

## Typography

### Font Stack

| Use                 | Font            | Why                               |
| ------------------- | --------------- | --------------------------------- |
| **Headlines**       | Anybody         | Character, from landing page DNA  |
| **Body**            | system-ui stack | Familiar, fast, accessible        |
| **Mono/code**       | DM Mono         | Personality in technical contexts |
| **Dyslexia option** | OpenDyslexic    | User-selectable accessibility     |

### Scale (Base: 16px)

| Token        | Size            | Use                   |
| ------------ | --------------- | --------------------- |
| `--text-xs`  | 0.75rem (12px)  | Captions, timestamps  |
| `--text-sm`  | 0.875rem (14px) | Secondary text, hints |
| `--text-md`  | 1rem (16px)     | Body text (default)   |
| `--text-lg`  | 1.125rem (18px) | Emphasized body       |
| `--text-xl`  | 1.25rem (20px)  | Card titles           |
| `--text-2xl` | 1.5rem (24px)   | Section headers       |
| `--text-3xl` | 1.875rem (30px) | Page titles           |

**Note:** Minimum 14px for any readable text. 12px only for non-essential metadata.

### Line Height

| Context | Value | Why                    |
| ------- | ----- | ---------------------- |
| Tight   | 1.3   | Headlines only         |
| Normal  | 1.5   | Body text minimum      |
| Relaxed | 1.7   | Dyslexia-friendly mode |

### Weight

| Token             | Value | Use                        |
| ----------------- | ----- | -------------------------- |
| `--font-normal`   | 400   | Body text                  |
| `--font-medium`   | 500   | Emphasis, labels           |
| `--font-semibold` | 600   | Buttons, important actions |
| `--font-bold`     | 700   | Headlines                  |

---

## Color System

### Philosophy

The landing page uses extreme contrast (electric yellow, deep purple, black). The tool uses those colors as **accents**, not backgrounds.

### Base Palette (Light Mode)

```css
/* Backgrounds */
--bg-primary: #ffffff; /* Main content */
--bg-secondary: #f5f5f5; /* Sidebar, cards */
--bg-tertiary: #e5e5e5; /* Hover states, dividers */

/* Text */
--text-primary: #1a1a1a; /* Headings, important */
--text-secondary: #666666; /* Body, descriptions */
--text-muted: #999999; /* Hints, timestamps */

/* Accents (from landing page DNA) */
--accent-primary: #1a1a1a; /* Buttons, focus - confident black */
--accent-purple: #a78bfa; /* Highlight, badges */
--accent-mint: #d4f4e7; /* Success backgrounds */
--accent-yellow: #ffe50c; /* Attention (sparingly) */

/* Semantic */
--success: #16a34a;
--error: #dc2626;
--warning: #d97706;
--info: #2563eb;
```

### Dark Mode

```css
--bg-primary: #1a1a1a;
--bg-secondary: #262626;
--bg-tertiary: #333333;

--text-primary: #fafafa;
--text-secondary: #a0a0a0;
--text-muted: #666666;

--accent-primary: #fafafa;
--accent-purple: #a78bfa;
--accent-mint: #059669;
```

### ND Theme Variations

#### Dyslexia-Friendly

- Background: `#f8f5e4` (cream - reduces visual stress)
- Text: `#333333` (dark gray, not pure black)
- Increased letter-spacing: 0.05em
- Increased word-spacing: 0.1em

#### Autism-Friendly

- Muted color palette (lower saturation)
- No shadows (reduces visual noise)
- Consistent, predictable borders
- Background: `#f7f7f7`

#### High Contrast

- Pure black/white only
- 2px borders everywhere
- No shadows
- Strong focus indicators

---

## Spacing

### Scale

| Token        | Value          | Use                        |
| ------------ | -------------- | -------------------------- |
| `--space-1`  | 0.25rem (4px)  | Tight gaps                 |
| `--space-2`  | 0.5rem (8px)   | Icon gaps, compact padding |
| `--space-3`  | 0.75rem (12px) | Button padding             |
| `--space-4`  | 1rem (16px)    | Card padding, section gaps |
| `--space-6`  | 1.5rem (24px)  | Card margins               |
| `--space-8`  | 2rem (32px)    | Section padding            |
| `--space-12` | 3rem (48px)    | Page margins               |

### Content Density

Users can select density preference:

| Density  | Multiplier | Use                                   |
| -------- | ---------- | ------------------------------------- |
| Compact  | 0.75x      | Power users, information density      |
| Normal   | 1x         | Default                               |
| Spacious | 1.25x      | Reduced cognitive load, accessibility |

---

## Components

### Cards

```css
/* Base card */
background: var(--bg-primary);
border: 1px solid var(--bg-tertiary);
border-radius: 12px;
padding: var(--space-4);
box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);

/* Hover */
border-color: #ccc;
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
```

**ND consideration:** Autism-friendly theme removes shadows entirely.

### Buttons

```css
/* Primary */
background: var(--accent-primary);
color: white;
padding: 12px 24px;
border-radius: 8px;
font-weight: 500;
transition: background 150ms;

/* Secondary */
background: var(--bg-tertiary);
color: var(--text-primary);

/* Focus (critical for accessibility) */
outline: none;
box-shadow: 0 0 0 3px rgba(26, 26, 26, 0.4);
```

### Form Inputs

```css
padding: 12px 16px;
border: 1px solid #ddd;
border-radius: 8px;
font-size: 16px; /* Prevents iOS zoom */

/* Focus */
border-color: var(--accent-primary);
box-shadow: 0 0 0 3px rgba(26, 26, 26, 0.1);
```

---

## Interaction Patterns

### Transitions

| Context          | Duration | Easing      |
| ---------------- | -------- | ----------- |
| Hover effects    | 150ms    | ease        |
| State changes    | 200ms    | ease-out    |
| Page transitions | 300ms    | ease-in-out |

**Critical:** Respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0ms !important;
  }
}
```

### Focus States

Every interactive element must have a visible focus state. This is non-negotiable.

```css
/* Default focus ring */
:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(26, 26, 26, 0.4);
}

/* High contrast mode */
.high-contrast :focus-visible {
  box-shadow: 0 0 0 3px blue;
}
```

### Feedback Patterns

| Action           | Feedback                             |
| ---------------- | ------------------------------------ |
| Form saved       | Subtle "saved" indicator, no modal   |
| Action completed | Toast notification (auto-dismiss 3s) |
| Error            | Inline error message, not just color |
| Loading          | Skeleton or spinner, never blank     |

---

## Character Moments

The landing page has "voice moments" like `(noted.)` and `(still here? good.)`. The tool uses this sparingly:

### Where Character Lives

- **Empty states** - "No badges yet. Create your first?"
- **Success moments** - "Badge issued" not "Operation completed successfully"
- **Error recovery** - "That didn't work. Here's what you can do:"
- **Onboarding hints** - Friendly, not corporate

### Where Character Doesn't Live

- Labels and buttons (clarity over cleverness)
- Error messages (be helpful, not cute)
- Critical actions (be direct)

---

## Accessibility Checklist

### Every Component Must Have

- [ ] Sufficient color contrast (4.5:1 for text, 3:1 for UI)
- [ ] Visible focus state
- [ ] Keyboard navigable
- [ ] Screen reader labels where needed
- [ ] Works at 200% zoom

### Every Page Must Have

- [ ] Logical heading hierarchy (h1 > h2 > h3)
- [ ] Skip-to-content link
- [ ] No content conveyed by color alone
- [ ] Reduced motion respected

---

## Theme Switching

Users can switch themes via Settings. Available themes:

| Theme             | Description            | Primary Use Case      |
| ----------------- | ---------------------- | --------------------- |
| Light             | Default, clean         | General use           |
| Dark              | Reduced eye strain     | Low light, preference |
| Dyslexia-Friendly | Cream bg, OpenDyslexic | Reading difficulties  |
| Autism-Friendly   | Muted, predictable     | Sensory sensitivities |
| High Contrast     | Maximum contrast       | Low vision            |
| Large Text        | Increased font sizes   | Vision support        |

Theme preference persists in localStorage and syncs with user account when logged in.

---

## Implementation Notes

### CSS Variables

All design tokens are CSS custom properties, making theme switching trivial:

```css
:root {
  /* light theme defaults */
}
.dark-theme {
  /* dark overrides */
}
.dyslexia-theme {
  /* dyslexia overrides */
}
```

### openbadges-ui Integration

The component library (`packages/openbadges-ui`) implements these themes. Use the `AccessibilityService` to apply them:

```typescript
import { AccessibilityService } from "openbadges-ui";

AccessibilityService.applyTheme("dyslexia-friendly");
AccessibilityService.setContentDensity("spacious");
AccessibilityService.setAnimationLevel("minimal");
```

### Testing

- Test every component in all themes
- Test with screen reader (VoiceOver/NVDA)
- Test with keyboard only
- Test at 200% zoom
- Test with `prefers-reduced-motion: reduce`

---

## Related Documents

- [openbadges-ui DESIGN_PHILOSOPHY.md](../../packages/openbadges-ui/docs/DESIGN_PHILOSOPHY.md)
- [openbadges-ui neurodiversity.md](../../packages/openbadges-ui/docs/neurodiversity.md)
- [Landing page DESIGN_DIRECTION.md](https://github.com/rollercoaster-dev/landing/blob/main/docs/DESIGN_DIRECTION.md)

---

_Document created: January 2026_
_Based on landing page design, openbadges-ui themes, and ND-first principles_
