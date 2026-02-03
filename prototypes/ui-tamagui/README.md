# Tamagui UI Prototype

Prototype to evaluate Tamagui for the native rollercoaster.dev app.

## Purpose

Evaluate:
1. Theme system compatibility with our 7 ND themes
2. Component styling DX
3. Accessibility implementation effort
4. Runtime theme switching performance

## Running

```bash
cd prototypes/ui-tamagui
npm install
npx expo start
```

## What's Included

- **tamagui.config.ts** - Token definitions matching our design token system, all 7 themes
- **BadgeCard** - Card component showing badge with theme-aware styling
- **ThemeSwitcher** - Theme picker with all 7 options
- **TestScreen** - Demo screen combining both components

## Themes

| Theme | Key Characteristics |
|-------|---------------------|
| light | Default, white background |
| dark | Dark background, maintained contrast |
| highContrast | Black/white, no shadows, 3dp focus ring |
| largeText | Larger font sizes (component-level handling needed) |
| dyslexia | Cream background, OpenDyslexic font |
| lowVision | High contrast + larger touch targets |
| autismFriendly | Muted colors, no shadows/animations |

## Key Findings

_Document findings after testing:_

### Pros
-

### Cons
-

### Accessibility Effort Required
-

## Next Steps

After evaluating this prototype against the Gluestack prototype:
1. Complete ACCESSIBILITY_AUDIT.md
2. Document findings above
3. Make library decision (ADR-0002)
