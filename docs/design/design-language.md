# Design Language: Web to React Native Translation

**Date:** 2026-02-02
**Status:** Draft
**Owner:** Joe

---

## Purpose

This doc translates the monorepo's [design language](https://github.com/rollercoaster-dev/monorepo/blob/main/docs/design/DESIGN_LANGUAGE.md) from web CSS to React Native. It covers the *how*, not the *what* or *why* — see [Design Principles](../vision/design-principles.md) for philosophy and rules.

---

## Platform Differences

| Web (monorepo) | React Native | Adaptation |
|----------------|-------------|------------|
| CSS custom properties | JS theme objects | Token system generates both |
| `rem` units | Density-independent pixels (dp) | Base 16px = 16dp |
| `@media` queries | `useWindowDimensions` + breakpoints | Responsive hook |
| `prefers-reduced-motion` | `AccessibilityInfo.isReduceMotionEnabled()` | Accessibility hook |
| `:focus-visible` | `onFocus`/`onBlur` + state | Manual focus ring |
| `@font-face` | `expo-font` + `useFonts` | Loaded at app start |
| `box-shadow` | `shadow*` props (iOS) / `elevation` (Android) | Platform-specific |
| `transition` | `Animated` API or Reanimated | Conditional on motion pref |
| `overflow: scroll` | `ScrollView` / `FlatList` | Native scrolling |
| `prefers-color-scheme` | `useColorScheme()` | System theme detection |

---

## Typography

### Font Loading

Fonts are bundled with the app and loaded at startup via `expo-font`:

```
assets/fonts/
├── Anybody-Regular.ttf
├── Anybody-Bold.ttf
├── DMMono-Regular.ttf
├── OpenDyslexic-Regular.ttf
├── OpenDyslexic-Bold.ttf
├── AtkinsonHyperlegible-Regular.ttf
└── AtkinsonHyperlegible-Bold.ttf
```

System font stack is used by default for body text — no loading needed.

### Type Scale

| Token | Web (rem) | RN (dp) | Use |
|-------|-----------|---------|-----|
| `textXs` | 0.75rem | 12 | Captions, timestamps (non-essential only) |
| `textSm` | 0.875rem | 14 | Secondary text, hints |
| `textMd` | 1rem | 16 | Body text (default) |
| `textLg` | 1.125rem | 18 | Emphasized body |
| `textXl` | 1.25rem | 20 | Card titles |
| `text2xl` | 1.5rem | 24 | Section headers |
| `text3xl` | 1.875rem | 30 | Page titles |

Minimum 14dp for any readable text. 12dp only for non-essential metadata.

### Line Height

React Native line heights are absolute values, not multipliers:

| Context | Web | RN (at 16dp base) |
|---------|-----|-------------------|
| Tight | 1.3 | 21 |
| Normal | 1.5 | 24 |
| Relaxed | 1.7 | 27 |

### Dynamic Type (iOS) / Font Scale (Android)

React Native supports OS-level text scaling. The app should:

- Allow scaling by default (`allowFontScaling: true`)
- Set `maxFontSizeMultiplier` on components where extreme scaling breaks layout (e.g., tab bar labels)
- Test at 200% scale

---

## Color

### Token Mapping

Web CSS variables become JS theme object properties:

```
Web:  var(--bg-primary)     →  RN: theme.colors.bgPrimary
Web:  var(--text-secondary)  →  RN: theme.colors.textSecondary
Web:  var(--accent-purple)   →  RN: theme.colors.accentPurple
```

### Color Values (Light Theme Default)

| Token | Value | Use |
|-------|-------|-----|
| `bgPrimary` | `#ffffff` | Main content background |
| `bgSecondary` | `#f5f5f5` | Cards, secondary areas |
| `bgTertiary` | `#e5e5e5` | Hover states, dividers |
| `textPrimary` | `#1a1a1a` | Headings, important text |
| `textSecondary` | `#666666` | Body, descriptions |
| `textMuted` | `#999999` | Hints, timestamps |
| `accentPrimary` | `#1a1a1a` | Buttons, focus |
| `accentPurple` | `#a78bfa` | Highlights, badges |
| `accentMint` | `#d4f4e7` | Success backgrounds |
| `accentYellow` | `#ffe50c` | Attention (sparingly) |
| `success` | `#16a34a` | Success states |
| `error` | `#dc2626` | Error states |
| `warning` | `#d97706` | Warning states |
| `info` | `#2563eb` | Info states |

See [ND Themes](./nd-themes.md) for all 7 theme color sets.

---

## Spacing

### Scale

| Token | Web (rem) | RN (dp) | Use |
|-------|-----------|---------|-----|
| `space1` | 0.25rem | 4 | Tight gaps |
| `space2` | 0.5rem | 8 | Icon gaps, compact padding |
| `space3` | 0.75rem | 12 | Button padding |
| `space4` | 1rem | 16 | Card padding, section gaps |
| `space5` | 1.25rem | 20 | Comfortable card padding |
| `space6` | 1.5rem | 24 | Card margins |
| `space8` | 2rem | 32 | Section padding |
| `space12` | 3rem | 48 | Page margins |

### Content Density Multiplier

| Density | Multiplier | Effect on `space4` |
|---------|-----------|-------------------|
| Compact | 0.75x | 12dp |
| Normal | 1x | 16dp |
| Spacious | 1.25x | 20dp |

Applied via the theme object — `theme.spacing(4)` returns the density-adjusted value.

---

## Touch Targets

| Platform | Minimum | Recommended |
|----------|---------|-------------|
| iOS (Apple HIG) | 44x44pt | 48x48pt |
| Android (Material) | 48x48dp | 48x48dp |

The app uses 48x48dp as the minimum for all interactive elements.

---

## Shadows & Elevation

| Platform | Approach |
|----------|----------|
| iOS | `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius` |
| Android | `elevation` |

Autism-friendly theme removes all shadows (`elevation: 0`, shadow values zeroed).

### Default Card Shadow

```
iOS:     shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
         shadowOpacity: 0.04, shadowRadius: 2
Android: elevation: 1
```

---

## Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `radiusSm` | 4 | Small elements, chips |
| `radiusMd` | 8 | Buttons, inputs |
| `radiusLg` | 12 | Cards |
| `radiusFull` | 9999 | Circles, pills |

---

## Animation

All animations are conditional on the user's motion preference:

```typescript
const reduceMotion = useReducedMotion(); // from AccessibilityInfo

const duration = reduceMotion ? 0 : 200;
```

| Context | Duration (ms) | Easing |
|---------|--------------|--------|
| Press feedback | 100 | ease |
| State changes | 200 | ease-out |
| Screen transitions | 300 | ease-in-out |

When reduce motion is on, all durations become 0. No exceptions.

### Animation Levels (user setting)

| Level | Behavior |
|-------|----------|
| None | All durations 0, no transitions |
| Minimal | Press feedback only (100ms), no screen transitions |
| Full | All animations enabled |

OS `prefers-reduced-motion` overrides the app setting — if the OS says reduce, the app reduces regardless of the in-app setting.

---

## Focus States

Every interactive element must have a visible focus state. Non-negotiable.

React Native doesn't have `:focus-visible`. Implementation:

```typescript
const [focused, setFocused] = useState(false);

<Pressable
  onFocus={() => setFocused(true)}
  onBlur={() => setFocused(false)}
  style={[styles.button, focused && styles.focusRing]}
/>
```

Focus ring: 3dp outline using the theme's `accentPrimary` color with 40% opacity.

High contrast theme: 3dp solid blue focus ring.

---

## Component Patterns

### Cards

```typescript
{
  backgroundColor: theme.colors.bgPrimary,
  borderWidth: 1,
  borderColor: theme.colors.bgTertiary,
  borderRadius: theme.radii.lg, // 12
  padding: theme.spacing(4),    // density-adjusted
  // shadow applied per platform
}
```

### Buttons (Primary)

```typescript
{
  backgroundColor: theme.colors.accentPrimary,
  paddingVertical: theme.spacing(3),  // 12dp at normal density
  paddingHorizontal: theme.spacing(6), // 24dp
  borderRadius: theme.radii.md, // 8
  minHeight: 48, // touch target
  minWidth: 48,
  alignItems: 'center',
  justifyContent: 'center',
}
```

### Text Input

```typescript
{
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: theme.radii.md, // 8
  fontSize: 16, // prevents iOS zoom
  minHeight: 48, // touch target
}
```

`fontSize: 16` on inputs is critical — iOS auto-zooms on focus if font size is below 16.

---

## Related Documents

- [Design Principles](../vision/design-principles.md) — the what and why
- [ND Themes](./nd-themes.md) — all 7 theme token values
- [Design Token System](../architecture/design-token-system.md) — how tokens are shared
- [Monorepo Design Language](https://github.com/rollercoaster-dev/monorepo/blob/main/docs/design/DESIGN_LANGUAGE.md) — the source we inherit from

---

_Draft created 2026-02-02. Translation reference from web CSS to React Native._
