---
name: neo-brutalist-design
description: Apply the rollercoaster.dev neo-brutalist design language to Vue/Tailwind and React Native components. Use when creating/reviewing components, fixing styles, or auditing visual consistency. Invoke with "review my component", "check my styles", "apply design system", or "audit design".
metadata:
  author: rollercoaster.dev
  version: "2.0.0"
  argument-hint: <file-or-pattern>
---

# Neo-Brutalist Design Language — rollercoaster.dev

This skill defines how to build and review components using the rollercoaster.dev neo-brutalist design system across **two platforms**:

- **Vue 3 / Tailwind** (`apps/openbadges-system`) — CSS utility classes in `main.css`
- **React Native** (`packages/openbadges-ui`) — `shadowStyle()` helper in `src/styles/shadows.ts`

## Philosophy: "Character Without Chaos"

Bold, confident, accessible. Drama comes from **structure** (thick borders, hard shadows, tight type) — not from color saturation or visual noise. The base is calm; accents are highlights, never backgrounds.

---

## Vue / Tailwind CSS Classes (openbadges-system)

The `openbadges-system` app defines ready-made CSS classes in `src/client/assets/styles/main.css` that encode the full neo-brutalist system. **Always prefer these classes** over composing inline Tailwind utilities — they ensure consistent borders, shadows, radii, and focus states.

Source: `apps/openbadges-system/src/client/assets/styles/main.css`

### Card

```html
<!-- CORRECT — uses .card class -->
<div class="card p-6">...</div>

<!-- WRONG — inline utilities miss 2px border, hard shadow, sm radius -->
<div class="bg-card shadow-sm rounded-lg p-6 border border-border">...</div>
```

The `.card` class provides:

- `bg-card` background
- `border: var(--ob-border-width-medium) solid var(--ob-border)` — 2px border
- `border-radius: var(--ob-border-radius-sm)` — sharp corners
- `box-shadow: var(--ob-shadow-hard-md)` — hard offset shadow

Related: `.card-header`, `.card-body`, `.card-footer` for internal structure.

### Buttons

```html
<!-- Primary button -->
<button class="btn btn-primary w-full">Sign in</button>

<!-- Secondary button -->
<button class="btn btn-secondary">Cancel</button>
```

The `.btn` class provides:

- `border: var(--ob-border-width-medium) solid transparent` — 2px border
- `border-radius: var(--ob-border-radius-sm)` — sharp corners
- `box-shadow: var(--ob-shadow-hard-sm)` — hard offset shadow
- `:focus-visible` outline with `var(--ob-border-color-focus)` and `var(--ob-shadow-focus)`

`.btn-primary` adds: `bg-primary text-primary-foreground hover:bg-primary-dark` + visible border
`.btn-secondary` adds: `bg-card text-card-foreground hover:bg-muted` + visible border

### Form Inputs

```html
<!-- CORRECT -->
<input class="form-input" />

<!-- WRONG — inline utilities miss 2px border, hard shadow, focus-visible -->
<input class="block w-full px-3 py-2 border rounded-md shadow-sm ..." />
```

The `.form-input` class provides:

- `background-color: var(--ob-form-background)`
- `border: var(--ob-border-width-medium) solid var(--ob-form-input-border)` — 2px border
- `border-radius: var(--ob-border-radius-sm)` — sharp corners
- `box-shadow: var(--ob-shadow-hard-sm)` — hard offset shadow
- `:focus-visible` outline with offset and focus shadow

### Alerts / Status Banners

```html
<!-- CORRECT — semantic alert classes -->
<div class="alert alert-success">...</div>
<div class="alert alert-error">...</div>
<div class="alert alert-warning">...</div>
<div class="alert alert-info">...</div>

<!-- WRONG — inline utilities miss 2px border, sm radius, token colors -->
<div class="mb-6 p-4 bg-destructive-light border border-destructive rounded-md">
  ...
</div>
```

The `.alert` class provides:

- `padding: 1rem`
- `border: var(--ob-border-width-medium) solid transparent` — 2px border
- `border-radius: var(--ob-border-radius-sm)` — sharp corners

Each variant (`.alert-success`, `.alert-error`, `.alert-warning`, `.alert-info`) sets:

- `background-color: var(--ob-color-{type}-light)`
- `color: var(--ob-{type})`
- `border-color: var(--ob-{type})`

### Tailwind Token Colors (tailwind.config.cjs)

When CSS classes don't cover a use case, use these Tailwind token colors (NOT raw colors like `gray-200`, `blue-600`):

| Token              | Tailwind class               | CSS variable              |
| ------------------ | ---------------------------- | ------------------------- |
| Background         | `bg-background`              | `--ob-background`         |
| Text               | `text-foreground`            | `--ob-foreground`         |
| Muted text         | `text-muted-foreground`      | `--ob-muted-foreground`   |
| Primary            | `bg-primary`, `text-primary` | `--ob-primary`            |
| Primary text on bg | `text-primary-foreground`    | `--ob-primary-foreground` |
| Primary hover      | `hover:bg-primary-dark`      | `--ob-primary-dark`       |
| Card bg            | `bg-card`                    | `--ob-card`               |
| Muted bg           | `bg-muted`                   | `--ob-muted`              |
| Border             | `border-border`              | `--ob-border`             |
| Input border       | `border-input`               | `--ob-input`              |
| Focus ring         | `ring-ring`                  | `--ob-ring`               |
| Destructive        | `text-destructive`           | `--ob-destructive`        |
| Success            | `text-success`               | `--ob-success`            |
| Warning            | `text-warning`               | `--ob-warning`            |
| Info               | `text-info`                  | `--ob-info`               |

### Tailwind Hard Shadows

```html
<div class="shadow-hard-sm">...</div>
<!-- chips, small elements -->
<div class="shadow-hard-md">...</div>
<!-- cards, buttons -->
<div class="shadow-hard-lg">...</div>
<!-- modals, dropdowns -->
<div class="shadow-focus">...</div>
<!-- focus states -->
```

**NEVER use `shadow-sm`, `shadow-md`, `shadow-lg`** — these are Tailwind's default blurred shadows.

### Tailwind Border Radii

```html
<div class="rounded-sm">...</div>
<!-- cards, containers, alerts (2px) -->
<div class="rounded-md">...</div>
<!-- buttons, inputs (4px) -->
```

**NEVER use `rounded-lg` or `rounded-xl`** on component containers — too round for neo-brutalism.

### Vue Audit Checklist

When reviewing a Vue component for design compliance:

- [ ] **Use CSS classes first**: `.card`, `.btn-primary`, `.form-input`, `.alert-*` before inline Tailwind
- [ ] **No raw colors**: No `gray-*`, `blue-*`, `red-*`, `green-*`, `yellow-*` — only tokens
- [ ] **No `text-white`**: Use `text-primary-foreground` or `text-card-foreground`
- [ ] **No gradients with raw colors**: Use token-based alternatives
- [ ] **No `shadow-sm`/`shadow-md`**: Use `shadow-hard-sm`/`shadow-hard-md` or CSS classes
- [ ] **No `rounded-lg`**: Use `rounded-sm` for containers, `rounded-md` for inputs/buttons
- [ ] **`border-2`** if not using CSS class: 2px borders on all containers
- [ ] **`focus-visible:`** not `focus:`: Keyboard-only focus rings
- [ ] **Touch targets**: `min-h-[48px]` or `py-3` on all interactive elements
- [ ] **No hardcoded values**: All colors, spacing, shadows from design tokens

---

## React Native — The 7 Rules

### 1. 2px Borders Everywhere

```ts
borderWidth: theme.borderWidth.medium; // 2px — the neo-brutalist standard
```

Every card, input, button, badge chip, and container uses `medium` (2px). Use `thin` (1px) only for subtle internal dividers. Never use `default` (1px) for containers.

### 2. Hard Offset Shadows (Zero Blur)

```ts
// Import from shared.tsx:
import { shadowStyle } from '../stories/design-system/shared';

// Usage in StyleSheet.create:
...shadowStyle(theme, 'hardSm')  // 2px offset — chips, badges, small elements
...shadowStyle(theme, 'hardMd')  // 3px offset — cards, buttons
...shadowStyle(theme, 'hardLg')  // 4px offset — modals, hero blocks

// What it expands to (for reference — always use the helper):
{
  shadowColor: '#000000',
  shadowOffset: { width: 3, height: 3 },  // hardMd example
  shadowOpacity: 0.15,
  shadowRadius: 0,  // ZERO — this is the key
}
```

**NEVER use blurred shadows** (`shadowRadius > 0`). Hard offset = neo-brutalist. The offset creates a crisp printed-poster feel.

Shadow size guide:

- `hardSm` (2px) — small interactive: badge chips, status pills, icon buttons
- `hardMd` (3px) — standard interactive: cards, buttons, inputs
- `hardLg` (4px) — large containers: modals, hero sections, narrative blocks

### 3. Sharp Corners (Small Radius)

```ts
borderRadius: theme.radius.sm; // 2px — cards, containers, chips
borderRadius: theme.radius.md; // 4px — buttons, inputs
borderRadius: theme.radius.pill; // 9999 — status pills, avatars
```

Radii are deliberately SMALL. This is neo-brutalism — not rounded modern UI. **Never use `radius.lg` (8px) or `radius.xl` (12px) for component containers.** Those are reserved for decorative story previews only.

| Element                        | Radius               |
| ------------------------------ | -------------------- |
| Cards, containers, chips       | `radius.sm` (2px)    |
| Buttons, inputs                | `radius.md` (4px)    |
| Status pills, circular buttons | `radius.pill` (9999) |

### 4. Bold, Tight Typography

```ts
// Headlines — Anybody font, tight letter-spacing
fontFamily: theme.fontFamily.headline; // 'Anybody'
letterSpacing: theme.letterSpacing.tight; // -0.48 (creates density and drama)
fontWeight: theme.fontWeight.black; // '900' — display only
fontWeight: theme.fontWeight.bold; // '700' — headings

// Body — Instrument Sans
fontFamily: theme.fontFamily.body; // 'Instrument Sans'
fontWeight: theme.fontWeight.normal; // '400'

// Labels (uppercase, tracked)
textTransform: "uppercase";
letterSpacing: theme.letterSpacing.wide; // 1.6
fontWeight: theme.fontWeight.bold;
fontSize: theme.size.xs; // 12px
```

Use the `textStyles` presets from the theme (`theme.textStyles.display`, `.headline`, `.title`, `.body`, `.caption`, `.label`, `.mono`) — or the `<Text variant="...">` component — rather than assembling typography manually.

### 5. Accent Colors Are Highlights, Not Backgrounds

```ts
// CORRECT — accent as a small highlight
backgroundColor: theme.narrative.climb.bg; // narrative section bg
color: theme.narrative.climb.text; // narrative section text

// CORRECT — accent on a chip/badge
backgroundColor: theme.colors.accentPurple; // small pill or badge

// WRONG — large area with accent color
backgroundColor: theme.colors.accentPurple; // card background ← NO
```

The base is always `background` / `backgroundSecondary`. Accents appear as:

- Status badge fills (small pills)
- Narrative section backgrounds (special containers only)
- Focus rings and borders
- Small decorative elements

### 6. High Contrast Without Harshness

```ts
// Near-black, not pure black
theme.colors.text; // #262626 light / #fafafa dark
theme.colors.accentPrimary; // #0a0a0a light / #fafafa dark

// Off-white, not stark white
theme.colors.background; // #fafafa light / #1a1033 dark
```

Dark mode uses deep indigo (`#1a1033`) not pure black. Light mode uses off-white (`#fafafa`) not pure white.

### 7. 48dp Minimum Touch Targets

```ts
minHeight: 48; // Every pressable element
```

No exceptions. Small visual elements (like icon buttons) can appear smaller visually but must have 48dp hit area.

---

## Component Recipes

### Card (Standard Container)

```ts
const styles = StyleSheet.create((theme) => ({
  card: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium, // 2px
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm, // 2px
    padding: theme.space[4], // 16px
    ...shadowStyle(theme, "hardMd"), // 3px hard offset
  },
}));
```

### Button (Primary)

```ts
button: {
  backgroundColor: theme.colors.accentPrimary,      // near-black
  borderWidth: theme.borderWidth.medium,             // 2px
  borderColor: theme.colors.accentPrimary,
  borderRadius: theme.radius.md,                     // 4px
  paddingHorizontal: theme.space[4],
  paddingVertical: theme.space[3],
  minHeight: 48,
  ...shadowStyle(theme, 'hardMd'),
},
buttonLabel: {
  color: theme.colors.background,                    // inverted text
  fontWeight: theme.fontWeight.semibold,
  fontSize: theme.size.md,
  fontFamily: theme.fontFamily.body,
},
```

### Button (Secondary / Outline)

```ts
buttonSecondary: {
  backgroundColor: theme.colors.backgroundSecondary,
  borderWidth: theme.borderWidth.medium,
  borderColor: theme.colors.border,
  borderRadius: theme.radius.md,
  ...shadowStyle(theme, 'hardMd'),
},
```

### Button (Ghost)

```ts
buttonGhost: {
  backgroundColor: 'transparent',
  borderWidth: theme.borderWidth.medium,
  borderColor: 'transparent',                        // no visible border
  borderRadius: theme.radius.md,
  // NO shadow for ghost
},
```

### Input

```ts
input: {
  borderWidth: theme.borderWidth.medium,             // 2px
  borderColor: theme.colors.border,
  borderRadius: theme.radius.md,                     // 4px
  paddingHorizontal: theme.space[3],
  paddingVertical: theme.space[3],
  fontSize: theme.size.md,                           // 16px (prevents iOS zoom)
  fontFamily: theme.fontFamily.body,
  color: theme.colors.text,
  backgroundColor: theme.colors.backgroundSecondary,
  minHeight: 48,
},
inputFocused: {
  borderColor: theme.colors.focusRing,
},
```

### Badge Chip / Status Pill

```ts
badgeChip: {
  borderWidth: theme.borderWidth.medium,
  borderColor: theme.colors.border,
  borderRadius: theme.radius.sm,                     // 2px for chips
  paddingVertical: theme.space[1],
  paddingHorizontal: theme.space[3],
  ...shadowStyle(theme, 'hardSm'),                   // small hard offset
},
// Or pill shape for status:
statusPill: {
  borderRadius: theme.radius.pill,
  paddingVertical: 2,
  paddingHorizontal: theme.space[2],
  // narrative colors for bg/text
},
```

### Checkbox

```ts
box: {
  width: 24,
  height: 24,
  borderRadius: theme.radius.sm,                     // 2px — sharp
  borderWidth: theme.borderWidth.medium,             // 2px
  borderColor: theme.colors.border,
},
boxChecked: {
  backgroundColor: theme.colors.accentPrimary,
  borderColor: theme.colors.accentPrimary,
},
```

### IconButton

```ts
iconButton: {
  width: 48,
  height: 48,
  borderRadius: theme.radius.pill,                   // circular
  borderWidth: theme.borderWidth.medium,
  borderColor: theme.colors.border,
  backgroundColor: theme.colors.backgroundSecondary,
  ...shadowStyle(theme, 'hardSm'),
},
```

### Divider

```ts
divider: {
  height: theme.borderWidth.medium,                  // 2px — not 1px
  backgroundColor: theme.colors.border,
},
```

### Progress Bar

```ts
track: {
  height: 8,
  borderRadius: theme.radius.pill,
  backgroundColor: theme.colors.backgroundTertiary,
  borderWidth: theme.borderWidth.medium,
  borderColor: theme.colors.border,
  overflow: 'hidden',
},
fill: {
  height: '100%',
  backgroundColor: theme.colors.accentPrimary,
},
```

---

## Applying Shadows via the Helper

Always use the `shadowStyle()` helper from `src/styles/shadows.ts`:

```ts
import { shadowStyle } from "../../styles/shadows";

// In StyleSheet.create:
const styles = StyleSheet.create((theme) => ({
  card: {
    ...shadowStyle(theme, "hardMd"),
    // other styles...
  },
}));
```

If you need to expand manually (rare):

```ts
shadowColor: '#000000',
shadowOffset: { width: theme.shadow.hardMd.offsetX, height: theme.shadow.hardMd.offsetY },
shadowOpacity: theme.shadow.hardMd.opacity,
shadowRadius: theme.shadow.hardMd.radius,  // Always 0 for hard shadows
```

---

## React Native Audit Checklist

When reviewing a React Native component for design compliance:

- [ ] **Borders**: Uses `borderWidth.medium` (2px), not `default`/`thin` for containers
- [ ] **Radius**: Cards use `radius.sm` (2px), buttons/inputs use `radius.md` (4px)
- [ ] **Shadows**: Uses hard offset shadows (`hardSm`/`hardMd`/`hardLg`), never blurred
- [ ] **Touch targets**: All pressables have `minHeight: 48`
- [ ] **Typography**: Uses theme `textStyles` or `<Text variant>`, not manual assembly
- [ ] **Colors**: Accents used as highlights, not large backgrounds
- [ ] **Accessibility**: `accessibilityRole`, `accessibilityLabel`, `accessibilityState`
- [ ] **Tokens only**: No hardcoded colors, sizes, or spacing — all from `theme.*`
