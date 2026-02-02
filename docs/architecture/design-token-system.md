# Architecture: Design Token System

**Date:** 2026-02-02
**Status:** Draft
**Owner:** Joe

---

## Purpose

Share design tokens between the Vue monorepo (`openbadges-ui`) and the React Native app. One source of truth, platform-specific outputs.

---

## Architecture

```
┌──────────────────────────────┐
│  tokens/                     │
│  ├── colors.json             │
│  ├── typography.json         │  Single source of truth
│  ├── spacing.json            │  (JSON token files)
│  ├── themes/                 │
│  │   ├── light.json          │
│  │   ├── dark.json           │
│  │   ├── high-contrast.json  │
│  │   ├── large-text.json     │
│  │   ├── dyslexia.json       │
│  │   ├── low-vision.json     │
│  │   └── autism-friendly.json│
│  └── index.json              │
└──────────────┬───────────────┘
               │
        Style Dictionary
        (or similar transform tool)
               │
        ┌──────┴──────┐
        ▼             ▼
  CSS Custom      JS Theme
  Properties      Objects
  (Vue/web)       (React Native)
        │             │
        ▼             ▼
  openbadges-ui   native app
```

---

## Token Format (Source)

Tokens are defined in JSON using a flat, platform-agnostic format:

```json
{
  "color": {
    "bg": {
      "primary": { "value": "#ffffff" },
      "secondary": { "value": "#f5f5f5" },
      "tertiary": { "value": "#e5e5e5" }
    },
    "text": {
      "primary": { "value": "#1a1a1a" },
      "secondary": { "value": "#666666" },
      "muted": { "value": "#999999" }
    },
    "accent": {
      "primary": { "value": "#1a1a1a" },
      "purple": { "value": "#a78bfa" },
      "mint": { "value": "#d4f4e7" },
      "yellow": { "value": "#ffe50c" }
    }
  },
  "spacing": {
    "1": { "value": 4 },
    "2": { "value": 8 },
    "3": { "value": 12 },
    "4": { "value": 16 },
    "5": { "value": 20 },
    "6": { "value": 24 },
    "8": { "value": 32 },
    "12": { "value": 48 }
  },
  "typography": {
    "size": {
      "xs": { "value": 12 },
      "sm": { "value": 14 },
      "md": { "value": 16 },
      "lg": { "value": 18 },
      "xl": { "value": 20 },
      "2xl": { "value": 24 },
      "3xl": { "value": 30 }
    }
  }
}
```

Theme files override base values:

```json
{
  "theme": "dark",
  "overrides": {
    "color.bg.primary": "#1a1a1a",
    "color.bg.secondary": "#262626",
    "color.text.primary": "#fafafa"
  }
}
```

---

## Transform Outputs

### CSS Custom Properties (for Vue / openbadges-ui)

```css
:root {
  --ob-bg-primary: #ffffff;
  --ob-bg-secondary: #f5f5f5;
  --ob-text-primary: #1a1a1a;
  --ob-accent-purple: #a78bfa;
  --ob-space-4: 1rem;
  --ob-text-md: 1rem;
}

.ob-dark-theme {
  --ob-bg-primary: #1a1a1a;
  --ob-bg-secondary: #262626;
  --ob-text-primary: #fafafa;
}
```

### JS Theme Objects (for React Native)

```typescript
export const lightTheme = {
  colors: {
    bgPrimary: '#ffffff',
    bgSecondary: '#f5f5f5',
    textPrimary: '#1a1a1a',
    accentPurple: '#a78bfa',
  },
  spacing: {
    1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 12: 48,
  },
  typography: {
    xs: 12, sm: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30,
  },
};

export const darkTheme = {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    bgPrimary: '#1a1a1a',
    bgSecondary: '#262626',
    textPrimary: '#fafafa',
  },
};
```

### Tailwind Config (if using NativeWind)

```javascript
module.exports = {
  theme: {
    colors: {
      bg: { primary: '#ffffff', secondary: '#f5f5f5' },
      text: { primary: '#1a1a1a', secondary: '#666666' },
      accent: { purple: '#a78bfa', mint: '#d4f4e7' },
    },
    spacing: { 1: '4px', 2: '8px', 3: '12px', 4: '16px' },
  },
};
```

---

## Transform Tool

[Style Dictionary](https://amzn.github.io/style-dictionary/) is the standard tool for multi-platform token transforms. It:

- Reads JSON token files
- Applies platform-specific transforms
- Outputs CSS, JS, TypeScript, JSON, etc.
- Supports custom transforms for edge cases

Alternatives: [Tokens Studio](https://tokens.studio/), [Theo](https://github.com/salesforce-ux/theo). Style Dictionary is the most widely used and actively maintained.

---

## Package Location

The token source files live in a shared package in the monorepo:

```
packages/design-tokens/
├── tokens/
│   ├── colors.json
│   ├── typography.json
│   ├── spacing.json
│   ├── borders.json
│   └── themes/
│       ├── dark.json
│       ├── high-contrast.json
│       ├── large-text.json
│       ├── dyslexia.json
│       ├── low-vision.json
│       └── autism-friendly.json
├── build/               # Generated outputs
│   ├── css/             # For openbadges-ui
│   ├── js/              # For React Native
│   └── tailwind/        # For NativeWind (if chosen)
├── style-dictionary.config.js
├── package.json
└── README.md
```

Published as `@rollercoaster-dev/design-tokens` on npm.

---

## Migration Path

### Current State

`openbadges-ui` defines tokens directly in CSS (`tokens.css`, `themes.css`). These files total ~33KB of CSS custom properties and theme overrides.

### Migration Steps

1. **Extract** — Parse existing `tokens.css` and `themes.css` into JSON token files
2. **Generate** — Set up Style Dictionary to produce CSS custom properties matching current output
3. **Verify** — Confirm generated CSS matches existing CSS (diff should be zero)
4. **Add RN output** — Add JS theme object generation for React Native
5. **Replace** — Point `openbadges-ui` at generated CSS instead of hand-written tokens
6. **Publish** — Publish `@rollercoaster-dev/design-tokens` to npm
7. **Consume** — Native app imports the JS theme objects

### Risk Mitigation

The migration is safe because:
- Step 3 verifies the generated CSS matches the existing CSS before replacing anything
- `openbadges-ui` has 195/195 tests passing — any token regression will be caught
- The native app is new code — it consumes the generated JS objects from the start

---

## Content Density

Content density is a multiplier applied to spacing tokens at runtime, not a separate set of tokens:

```typescript
function spacing(token: number, density: 'compact' | 'normal' | 'spacious'): number {
  const multipliers = { compact: 0.75, normal: 1, spacious: 1.25 };
  return baseSpacing[token] * multipliers[density];
}
```

This keeps the token source clean (one set of spacing values) while supporting three density levels.

---

## Open Questions

1. **Existing token extraction** — How closely do the current CSS tokens map to a clean JSON structure? May need manual cleanup.
2. **Font tokens** — Fonts aren't simple values (family + weight + style). How does Style Dictionary handle font stacks?
3. **Theme composition** — If we support Large Text + Dark in the future, how do composed themes work in the token system?
4. **Animation tokens** — Should animation durations and easings be in the token system, or are they implementation-specific?
5. **Tamagui vs NativeWind** — The UI library choice affects the output format. Tamagui has its own token system; NativeWind uses Tailwind config. May need to generate both during prototyping.

---

## Related Documents

- [Design Language](../design/design-language.md) — how tokens translate to React Native
- [ND Themes](../design/nd-themes.md) — all 7 theme token values
- [Design Principles](../vision/design-principles.md) — the 7 themes as day-one requirements
- [UI Library Comparison](../research/ui-library-comparison.md) — token system compatibility per library
- [Monorepo tokens.css](https://github.com/rollercoaster-dev/monorepo/blob/main/packages/openbadges-ui/src/styles/tokens.css)
- [Monorepo themes.css](https://github.com/rollercoaster-dev/monorepo/blob/main/packages/openbadges-ui/src/styles/themes.css)

---

_Draft created 2026-02-02. One source of truth, many platforms._
