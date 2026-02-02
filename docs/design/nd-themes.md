# ND Themes: Token Values for React Native

**Date:** 2026-02-02
**Status:** Draft
**Owner:** Joe

---

## Overview

Seven themes ship from day one. Each theme is a set of token overrides applied to the base (light) theme. All values are for React Native (dp units, JS objects).

Source values adapted from the monorepo's [tokens.css](https://github.com/rollercoaster-dev/monorepo/blob/main/packages/openbadges-ui/src/styles/tokens.css) and [themes.css](https://github.com/rollercoaster-dev/monorepo/blob/main/packages/openbadges-ui/src/styles/themes.css).

---

## Base: Light Theme (default)

| Token | Value | Notes |
|-------|-------|-------|
| `bgPrimary` | `#ffffff` | |
| `bgSecondary` | `#f5f5f5` | |
| `bgTertiary` | `#e5e5e5` | |
| `textPrimary` | `#1a1a1a` | |
| `textSecondary` | `#666666` | |
| `textMuted` | `#999999` | |
| `accentPrimary` | `#1a1a1a` | |
| `accentPurple` | `#a78bfa` | |
| `accentMint` | `#d4f4e7` | |
| `accentYellow` | `#ffe50c` | |
| `fontFamily` | System | |
| `fontFamilyHeading` | `Anybody` | |
| `fontFamilyMono` | `DMMono` | |
| `borderWidth` | 1 | |
| `shadowOpacity` | 0.04 | |
| `elevation` | 1 | Android |

---

## Dark Theme

For low light and user preference. Maintained contrast ratios.

| Token | Override | Notes |
|-------|----------|-------|
| `bgPrimary` | `#1a1a1a` | |
| `bgSecondary` | `#262626` | |
| `bgTertiary` | `#333333` | |
| `textPrimary` | `#fafafa` | |
| `textSecondary` | `#a0a0a0` | |
| `textMuted` | `#666666` | |
| `accentPrimary` | `#fafafa` | Inverted |
| `accentPurple` | `#a78bfa` | Unchanged |
| `accentMint` | `#059669` | Darker for dark bg |

---

## High Contrast Theme

WCAG AAA contrast. For low vision users.

| Token | Override | Notes |
|-------|----------|-------|
| `bgPrimary` | `#000000` | Pure black |
| `bgSecondary` | `#1a1a1a` | |
| `bgTertiary` | `#333333` | |
| `textPrimary` | `#ffffff` | Pure white |
| `textSecondary` | `#ffffff` | No muted text — everything high contrast |
| `textMuted` | `#cccccc` | Still readable |
| `accentPrimary` | `#ffffff` | |
| `accentPurple` | `#c4b5fd` | Lighter for contrast on dark |
| `borderWidth` | 2 | Thicker borders everywhere |
| `shadowOpacity` | 0 | No shadows — borders define edges |
| `elevation` | 0 | |
| `focusRingColor` | `#0000ff` | Blue, high visibility |
| `focusRingWidth` | 3 | |

---

## Large Text Theme

For reading difficulty and low vision. Increased sizes and spacing.

| Token | Override | Notes |
|-------|----------|-------|
| `textXs` | 14 | Minimum raised to 14 |
| `textSm` | 16 | |
| `textMd` | 18 | Base text larger |
| `textLg` | 20 | |
| `textXl` | 24 | |
| `text2xl` | 28 | |
| `text3xl` | 34 | |
| `lineHeight` | 1.7 | Relaxed everywhere |
| `letterSpacing` | 0.3 | Slight increase |

Colors unchanged — this theme composes with others (large text + dark, large text + high contrast).

---

## Dyslexia-Friendly Theme

OpenDyslexic font, cream background, extra spacing.

| Token | Override | Notes |
|-------|----------|-------|
| `bgPrimary` | `#f8f5e4` | Cream — reduces visual stress |
| `bgSecondary` | `#f0edd6` | Warm secondary |
| `textPrimary` | `#333333` | Dark gray, not pure black |
| `textSecondary` | `#555555` | |
| `fontFamily` | `OpenDyslexic` | All body text |
| `fontFamilyHeading` | `OpenDyslexic` | Headlines too |
| `letterSpacing` | 0.8 | Extra letter spacing (0.05em equivalent) |
| `wordSpacing` | 1.6 | Extra word spacing (0.1em equivalent) |
| `lineHeight` | 1.7 | Relaxed |

---

## Low Vision Theme

Atkinson Hyperlegible font, high contrast, large targets.

| Token | Override | Notes |
|-------|----------|-------|
| `bgPrimary` | `#000000` | Pure black |
| `textPrimary` | `#ffffff` | Pure white |
| `textSecondary` | `#e0e0e0` | High contrast secondary |
| `fontFamily` | `AtkinsonHyperlegible` | Designed for legibility |
| `fontFamilyHeading` | `AtkinsonHyperlegible` | |
| `textMd` | 18 | Larger base |
| `textLg` | 20 | |
| `textXl` | 24 | |
| `borderWidth` | 2 | |
| `minTouchTarget` | 56 | Larger than standard 48 |
| `shadowOpacity` | 0 | |
| `elevation` | 0 | |
| `focusRingWidth` | 3 | |

---

## Autism-Friendly Theme

Muted colors, no shadows, no animations, predictable borders.

| Token | Override | Notes |
|-------|----------|-------|
| `bgPrimary` | `#f7f7f7` | Soft, not stark white |
| `bgSecondary` | `#eeeeee` | |
| `bgTertiary` | `#e0e0e0` | |
| `textPrimary` | `#333333` | |
| `textSecondary` | `#666666` | |
| `accentPurple` | `#b4a7d6` | Desaturated |
| `accentMint` | `#c8e6d4` | Desaturated |
| `accentYellow` | `#f0e68c` | Desaturated |
| `borderWidth` | 1 | Consistent, predictable |
| `borderColor` | `#cccccc` | Visible, not aggressive |
| `shadowOpacity` | 0 | No shadows |
| `elevation` | 0 | No shadows |
| `animationDuration` | 0 | No animations regardless of setting |
| `borderRadius` | 4 | Reduced — more geometric, predictable |

---

## Theme Composition

Some themes can be combined:

| Combination | How |
|------------|-----|
| Large Text + Dark | Apply large text size overrides on top of dark colors |
| Large Text + High Contrast | Apply large text sizes on top of high contrast colors |
| Dyslexia-Friendly + Dark | OpenDyslexic font with dark theme colors (bg becomes `#2a2520`, warm dark) |

Not all combinations are supported in iteration A. Start with the 7 standalone themes. Composition is a future enhancement if users request it.

---

## Theme Switching Implementation

```typescript
// Theme context provides current theme tokens
const { theme, setTheme } = useTheme();

// Components read tokens from theme
<View style={{ backgroundColor: theme.colors.bgPrimary }}>
  <Text style={{
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.body,
    fontSize: theme.typography.textMd,
  }}>
    ...
  </Text>
</View>

// Switching is instant — swap the theme object, everything re-renders
setTheme('dyslexia-friendly');
```

Theme preference stored locally (AsyncStorage or database) and syncs across devices in iteration B.

---

## Testing Requirements

Every component must be tested in all 7 themes:

- [ ] Light (default)
- [ ] Dark
- [ ] High Contrast
- [ ] Large Text
- [ ] Dyslexia-Friendly
- [ ] Low Vision
- [ ] Autism-Friendly

Additionally:

- [ ] Test with OS Dynamic Type at 200%
- [ ] Test with OS Bold Text enabled
- [ ] Test with OS Reduce Motion enabled
- [ ] Test with VoiceOver (iOS) and TalkBack (Android)

---

## Related Documents

- [Design Principles](../vision/design-principles.md) — ND-first rules
- [Design Language](./design-language.md) — web to RN translation reference
- [Design Token System](../architecture/design-token-system.md) — how tokens are shared across platforms
- [Monorepo themes.css](https://github.com/rollercoaster-dev/monorepo/blob/main/packages/openbadges-ui/src/styles/themes.css) — source theme values
- [Monorepo tokens.css](https://github.com/rollercoaster-dev/monorepo/blob/main/packages/openbadges-ui/src/styles/tokens.css) — source token contract

---

_Draft created 2026-02-02. Seven themes, all shipping from day one._
