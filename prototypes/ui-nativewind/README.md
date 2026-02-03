# NativeWind Prototype

A NativeWind v4 prototype demonstrating 7 neurodiversity (ND) accessibility themes for the badge system.

## Overview

This prototype uses NativeWind's `vars()` function to implement dynamic theming with CSS variables. Each theme defines a complete set of design tokens that are applied at the root level and referenced throughout the app via Tailwind classes.

## Architecture

```
ThemeProvider (style={vars(tokens)})
  └── Components use: bg-bg-primary, text-text-primary, etc.
```

### Key Differences from Tamagui

| Tamagui | NativeWind |
|---------|------------|
| `<Theme name={theme}>` | `style={vars(tokens)}` |
| `$background` token refs | `bg-bg-primary` classes |
| `styled()` API | Tailwind className |

## Themes

| Theme | Description |
|-------|-------------|
| **Light** | Standard light theme with good contrast |
| **Dark** | Dark theme to reduce eye strain |
| **High Contrast** | Maximum contrast (black/white) with 2px borders |
| **Large Text** | Increased font sizes throughout |
| **Dyslexia Friendly** | Cream background, optimized spacing |
| **Low Vision** | Extra large text (24px base) and 56px touch targets |
| **Autism Friendly** | Reduced visual complexity, muted colors, no shadows |

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator or Android Emulator (or Expo Go app)

### Installation

```bash
cd prototypes/ui-nativewind
npm install
```

### Running

```bash
npm start
```

Then press:
- `i` for iOS Simulator
- `a` for Android Emulator
- Scan QR code with Expo Go for physical device

## Project Structure

```
ui-nativewind/
├── App.tsx                    # App entry point
├── global.css                 # Tailwind imports
├── tailwind.config.js         # CSS variable references
├── metro.config.js            # withNativeWind wrapper
├── babel.config.js            # nativewind preset
├── src/
│   ├── themes/index.ts        # 7 theme token definitions
│   ├── ThemeProvider.tsx      # vars() application + context
│   ├── components/
│   │   ├── BadgeCard.tsx      # Accessible badge card
│   │   └── ThemeSwitcher.tsx  # Theme selection UI
│   ├── screens/
│   │   └── TestScreen.tsx     # Main test screen
│   └── hooks/
│       └── useFonts.ts        # Font loading hook
├── ACCESSIBILITY_AUDIT.md     # Accessibility checklist
└── README.md
```

## Theming Implementation

### Token Definition (src/themes/index.ts)

```typescript
export const themes: Record<ThemeName, ThemeTokens> = {
  light: {
    "--color-bg-primary": "#ffffff",
    "--color-text-primary": "#1a1a1a",
    // ...
  },
  // ...
};
```

### Tailwind Config (tailwind.config.js)

```javascript
colors: {
  bg: {
    primary: "var(--color-bg-primary)",
  },
  // ...
}
```

### Component Usage

```tsx
<View className="bg-bg-primary border-border">
  <Text className="text-text-primary">Hello</Text>
</View>
```

### Theme Switching

```tsx
const { theme, setTheme } = useTheme();
setTheme("highContrast");
```

## Accessibility Features

- All interactive elements have proper `accessible` and `accessibilityRole` props
- Badge cards announce title, description, date, and evidence count
- Theme options announce selection state
- StatusBar automatically updates for dark/light themes
- Touch targets meet WCAG minimum (44px, larger for low vision theme)

## Adding OpenDyslexic Font

1. Download OpenDyslexic from https://opendyslexic.org/
2. Create `assets/fonts/` directory
3. Add `OpenDyslexic-Regular.otf` and `OpenDyslexic-Bold.otf`
4. Uncomment font loading in `src/hooks/useFonts.ts`

## Testing Accessibility

### iOS
1. Enable VoiceOver: Settings > Accessibility > VoiceOver
2. Navigate through the app
3. Verify announcements are clear and complete

### Android
1. Enable TalkBack: Settings > Accessibility > TalkBack
2. Navigate through the app
3. Verify announcements are clear and complete

## Comparison with Other Prototypes

This prototype is part of a series comparing different UI libraries:

- **ui-tamagui** - Tamagui with `<Theme>` wrapper approach
- **ui-nativewind** - NativeWind with `vars()` CSS variables (this prototype)
- **ui-gluestack** - GlueStack UI (planned)
