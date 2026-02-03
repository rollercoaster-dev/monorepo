# Tamagui UI Prototype Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Tamagui-based prototype with BadgeCard, ThemeSwitcher, and all 7 ND themes to evaluate the library for the native app.

**Architecture:** Expo managed workflow with Tamagui v2. Tokens defined in `tamagui.config.ts` matching our design token system. Components use Tamagui's styled() API with theme-aware styling. Theme switching via Tamagui's ThemeProvider.

**Tech Stack:** Expo SDK 52, Tamagui v2.0, React Native, TypeScript

---

## Task 1: Initialize Expo Project with Tamagui

**Files:**
- Create: `prototypes/ui-tamagui/` (entire project)

**Step 1: Create Expo project**

```bash
cd /Users/hailmary/Code/rollercoaster.dev/native-rd/prototypes
npx create-expo-app@latest ui-tamagui --template blank-typescript
```

**Step 2: Install Tamagui dependencies**

```bash
cd /Users/hailmary/Code/rollercoaster.dev/native-rd/prototypes/ui-tamagui
npx expo install @tamagui/core @tamagui/config @tamagui/themes @tamagui/font-inter @tamagui/animations-react-native expo-font react-native-reanimated
```

**Step 3: Install dev dependencies**

```bash
npm install --save-dev @tamagui/babel-plugin
```

**Step 4: Update babel.config.js**

Replace contents of `prototypes/ui-tamagui/babel.config.js`:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        '@tamagui/babel-plugin',
        {
          components: ['tamagui'],
          config: './tamagui.config.ts',
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
```

**Step 5: Commit**

```bash
cd /Users/hailmary/Code/rollercoaster.dev/native-rd
git add prototypes/ui-tamagui
git commit -m "feat(prototype): initialize Tamagui UI prototype with Expo"
```

---

## Task 2: Create Tamagui Config with Base Tokens

**Files:**
- Create: `prototypes/ui-tamagui/tamagui.config.ts`

**Step 1: Create the tamagui config file**

Create `prototypes/ui-tamagui/tamagui.config.ts`:

```typescript
import { createTamagui, createTokens, createFont } from '@tamagui/core';
import { createAnimations } from '@tamagui/animations-react-native';

// Base spacing scale (matches design-token-system.md)
const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  12: 48,
  true: 16, // default
};

// Typography sizes (matches design-language.md)
const size = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  true: 16,
};

// Border radii
const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
  true: 8,
};

// Z-index scale
const zIndex = {
  0: 0,
  1: 100,
  2: 200,
  3: 300,
  4: 400,
  5: 500,
};

// Base color palette - foundational values
const palette = {
  white: '#ffffff',
  black: '#000000',
  gray50: '#fafafa',
  gray100: '#f5f5f5',
  gray200: '#e5e5e5',
  gray300: '#d4d4d4',
  gray400: '#a3a3a3',
  gray500: '#737373',
  gray600: '#525252',
  gray700: '#404040',
  gray800: '#262626',
  gray900: '#171717',
  purple300: '#c4b5fd',
  purple400: '#a78bfa',
  mint200: '#d4f4e7',
  mint600: '#059669',
  yellow300: '#ffe50c',
  yellow200: '#f0e68c',
  cream100: '#f8f5e4',
  cream200: '#f0edd6',
  blue600: '#0000ff',
  red600: '#dc2626',
  green600: '#16a34a',
};

const tokens = createTokens({
  space,
  size,
  radius,
  zIndex,
  color: palette,
});

// System font for body text
const bodyFont = createFont({
  family: 'System',
  size: {
    1: 12,
    2: 14,
    3: 16,
    4: 18,
    5: 20,
    6: 24,
    7: 30,
    true: 16,
  },
  lineHeight: {
    1: 16,
    2: 20,
    3: 24,
    4: 26,
    5: 28,
    6: 32,
    7: 40,
    true: 24,
  },
  weight: {
    4: '400',
    6: '600',
    7: '700',
  },
  letterSpacing: {
    4: 0,
    true: 0,
  },
});

// Animations with reduced motion support
const animations = createAnimations({
  fast: {
    type: 'timing',
    duration: 100,
  },
  medium: {
    type: 'timing',
    duration: 200,
  },
  slow: {
    type: 'timing',
    duration: 300,
  },
});

export const config = createTamagui({
  tokens,
  fonts: {
    body: bodyFont,
    heading: bodyFont, // Will be replaced with Anybody font
  },
  animations,
  themes: {}, // Themes added in next task
});

export type Conf = typeof config;

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends Conf {}
}

export default config;
```

**Step 2: Verify file was created**

```bash
cat prototypes/ui-tamagui/tamagui.config.ts | head -20
```

Expected: See the import statements and beginning of config

**Step 3: Commit**

```bash
git add prototypes/ui-tamagui/tamagui.config.ts
git commit -m "feat(prototype): add Tamagui base tokens config"
```

---

## Task 3: Add All 7 ND Themes

**Files:**
- Modify: `prototypes/ui-tamagui/tamagui.config.ts`

**Reference:** `docs/design/nd-themes.md` for exact token values

**Step 1: Create themes object**

Add this themes definition to `tamagui.config.ts` before the `createTamagui` call:

```typescript
// Theme token definitions (from nd-themes.md)
const themes = {
  // Light theme (default base)
  light: {
    background: palette.white,
    backgroundSecondary: palette.gray100,
    backgroundTertiary: palette.gray200,
    color: palette.gray900,
    colorSecondary: palette.gray600,
    colorMuted: palette.gray500,
    accentPrimary: palette.gray900,
    accentPurple: palette.purple400,
    accentMint: palette.mint200,
    accentYellow: palette.yellow300,
    borderColor: palette.gray200,
    shadowColor: palette.black,
    shadowOpacity: 0.04,
    focusRingColor: palette.gray900,
  },

  // Dark theme
  dark: {
    background: palette.gray900,
    backgroundSecondary: palette.gray800,
    backgroundTertiary: palette.gray700,
    color: palette.gray50,
    colorSecondary: palette.gray400,
    colorMuted: palette.gray600,
    accentPrimary: palette.gray50,
    accentPurple: palette.purple400,
    accentMint: palette.mint600,
    accentYellow: palette.yellow300,
    borderColor: palette.gray700,
    shadowColor: palette.black,
    shadowOpacity: 0.2,
    focusRingColor: palette.gray50,
  },

  // High Contrast theme
  highContrast: {
    background: palette.black,
    backgroundSecondary: palette.gray900,
    backgroundTertiary: palette.gray700,
    color: palette.white,
    colorSecondary: palette.white,
    colorMuted: palette.gray300,
    accentPrimary: palette.white,
    accentPurple: palette.purple300,
    accentMint: palette.mint200,
    accentYellow: palette.yellow300,
    borderColor: palette.white,
    shadowColor: palette.black,
    shadowOpacity: 0,
    focusRingColor: palette.blue600,
  },

  // Large Text theme (colors same as light, sizes handled by components)
  largeText: {
    background: palette.white,
    backgroundSecondary: palette.gray100,
    backgroundTertiary: palette.gray200,
    color: palette.gray900,
    colorSecondary: palette.gray600,
    colorMuted: palette.gray500,
    accentPrimary: palette.gray900,
    accentPurple: palette.purple400,
    accentMint: palette.mint200,
    accentYellow: palette.yellow300,
    borderColor: palette.gray200,
    shadowColor: palette.black,
    shadowOpacity: 0.04,
    focusRingColor: palette.gray900,
  },

  // Dyslexia-Friendly theme
  dyslexia: {
    background: palette.cream100,
    backgroundSecondary: palette.cream200,
    backgroundTertiary: palette.gray200,
    color: palette.gray700,
    colorSecondary: palette.gray600,
    colorMuted: palette.gray500,
    accentPrimary: palette.gray700,
    accentPurple: palette.purple400,
    accentMint: palette.mint200,
    accentYellow: palette.yellow300,
    borderColor: palette.gray300,
    shadowColor: palette.black,
    shadowOpacity: 0.04,
    focusRingColor: palette.gray700,
  },

  // Low Vision theme
  lowVision: {
    background: palette.black,
    backgroundSecondary: palette.gray900,
    backgroundTertiary: palette.gray700,
    color: palette.white,
    colorSecondary: palette.gray200,
    colorMuted: palette.gray300,
    accentPrimary: palette.white,
    accentPurple: palette.purple300,
    accentMint: palette.mint200,
    accentYellow: palette.yellow300,
    borderColor: palette.white,
    shadowColor: palette.black,
    shadowOpacity: 0,
    focusRingColor: palette.blue600,
  },

  // Autism-Friendly theme
  autismFriendly: {
    background: palette.gray100,
    backgroundSecondary: palette.gray200,
    backgroundTertiary: palette.gray300,
    color: palette.gray700,
    colorSecondary: palette.gray600,
    colorMuted: palette.gray500,
    accentPrimary: palette.gray700,
    accentPurple: '#b4a7d6', // desaturated purple
    accentMint: '#c8e6d4', // desaturated mint
    accentYellow: palette.yellow200,
    borderColor: palette.gray300,
    shadowColor: palette.black,
    shadowOpacity: 0,
    focusRingColor: palette.gray700,
  },
};
```

**Step 2: Update createTamagui call with themes**

Update the `createTamagui` call:

```typescript
export const config = createTamagui({
  tokens,
  fonts: {
    body: bodyFont,
    heading: bodyFont,
  },
  animations,
  themes,
});
```

**Step 3: Commit**

```bash
git add prototypes/ui-tamagui/tamagui.config.ts
git commit -m "feat(prototype): add all 7 ND themes to Tamagui config"
```

---

## Task 4: Create TamaguiProvider Wrapper

**Files:**
- Create: `prototypes/ui-tamagui/src/TamaguiProvider.tsx`
- Modify: `prototypes/ui-tamagui/App.tsx`

**Step 1: Create src directory**

```bash
mkdir -p /Users/hailmary/Code/rollercoaster.dev/native-rd/prototypes/ui-tamagui/src
```

**Step 2: Create TamaguiProvider component**

Create `prototypes/ui-tamagui/src/TamaguiProvider.tsx`:

```typescript
import { TamaguiProvider as TamaguiProviderOG, Theme } from '@tamagui/core';
import { createContext, useContext, useState, ReactNode } from 'react';
import config from '../tamagui.config';

export type ThemeName =
  | 'light'
  | 'dark'
  | 'highContrast'
  | 'largeText'
  | 'dyslexia'
  | 'lowVision'
  | 'autismFriendly';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function useThemeName() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeName must be used within TamaguiProvider');
  return ctx;
}

interface Props {
  children: ReactNode;
}

export function TamaguiProvider({ children }: Props) {
  const [theme, setTheme] = useState<ThemeName>('light');

  return (
    <TamaguiProviderOG config={config}>
      <ThemeContext.Provider value={{ theme, setTheme }}>
        <Theme name={theme}>{children}</Theme>
      </ThemeContext.Provider>
    </TamaguiProviderOG>
  );
}
```

**Step 3: Update App.tsx**

Replace `prototypes/ui-tamagui/App.tsx`:

```typescript
import { StatusBar } from 'expo-status-bar';
import { TamaguiProvider } from './src/TamaguiProvider';
import { View, Text } from '@tamagui/core';

export default function App() {
  return (
    <TamaguiProvider>
      <View flex={1} backgroundColor="$background" alignItems="center" justifyContent="center">
        <Text color="$color" fontSize="$6">
          Tamagui Prototype
        </Text>
        <StatusBar style="auto" />
      </View>
    </TamaguiProvider>
  );
}
```

**Step 4: Test the app starts**

```bash
cd /Users/hailmary/Code/rollercoaster.dev/native-rd/prototypes/ui-tamagui
npx expo start --clear
```

Expected: App opens with "Tamagui Prototype" text on white background

**Step 5: Commit**

```bash
cd /Users/hailmary/Code/rollercoaster.dev/native-rd
git add prototypes/ui-tamagui/src prototypes/ui-tamagui/App.tsx
git commit -m "feat(prototype): add TamaguiProvider with theme context"
```

---

## Task 5: Create BadgeCard Component

**Files:**
- Create: `prototypes/ui-tamagui/src/components/BadgeCard.tsx`

**Reference:** `docs/design/design-language.md` for card styling, `docs/design/user-flows.md` for badge display context

**Step 1: Create components directory**

```bash
mkdir -p /Users/hailmary/Code/rollercoaster.dev/native-rd/prototypes/ui-tamagui/src/components
```

**Step 2: Create BadgeCard component**

Create `prototypes/ui-tamagui/src/components/BadgeCard.tsx`:

```typescript
import { View, Text, styled, GetProps } from '@tamagui/core';
import { Pressable } from 'react-native';

const CardContainer = styled(View, {
  name: 'BadgeCard',
  backgroundColor: '$background',
  borderWidth: 1,
  borderColor: '$borderColor',
  borderRadius: '$lg',
  padding: '$4',
  shadowColor: '$shadowColor',
  shadowOffset: { width: 0, height: 1 },
  shadowRadius: 2,
  elevation: 1,

  variants: {
    size: {
      compact: {
        padding: '$3',
      },
      normal: {
        padding: '$4',
      },
      spacious: {
        padding: '$5',
      },
    },
  } as const,

  defaultVariants: {
    size: 'normal',
  },
});

const BadgeImage = styled(View, {
  width: 80,
  height: 80,
  borderRadius: '$md',
  backgroundColor: '$accentPurple',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '$3',
});

const BadgeTitle = styled(Text, {
  fontSize: '$5',
  fontWeight: '600',
  color: '$color',
  marginBottom: '$1',
});

const BadgeDate = styled(Text, {
  fontSize: '$2',
  color: '$colorMuted',
});

const EvidenceCount = styled(Text, {
  fontSize: '$2',
  color: '$colorSecondary',
  marginTop: '$2',
});

export interface BadgeCardProps extends GetProps<typeof CardContainer> {
  title: string;
  earnedDate: string;
  evidenceCount: number;
  onPress?: () => void;
}

export function BadgeCard({
  title,
  earnedDate,
  evidenceCount,
  onPress,
  ...props
}: BadgeCardProps) {
  return (
    <Pressable onPress={onPress} accessible accessibilityRole="button" accessibilityLabel={`Badge: ${title}, earned ${earnedDate}`}>
      <CardContainer {...props}>
        <BadgeImage>
          <Text color="white" fontSize="$7" fontWeight="700">
            {title.charAt(0).toUpperCase()}
          </Text>
        </BadgeImage>
        <BadgeTitle>{title}</BadgeTitle>
        <BadgeDate>{earnedDate}</BadgeDate>
        <EvidenceCount>
          {evidenceCount} {evidenceCount === 1 ? 'piece' : 'pieces'} of evidence
        </EvidenceCount>
      </CardContainer>
    </Pressable>
  );
}
```

**Step 3: Commit**

```bash
git add prototypes/ui-tamagui/src/components
git commit -m "feat(prototype): add BadgeCard component with theme tokens"
```

---

## Task 6: Create ThemeSwitcher Component

**Files:**
- Create: `prototypes/ui-tamagui/src/components/ThemeSwitcher.tsx`

**Step 1: Create ThemeSwitcher component**

Create `prototypes/ui-tamagui/src/components/ThemeSwitcher.tsx`:

```typescript
import { View, Text, styled } from '@tamagui/core';
import { Pressable, ScrollView } from 'react-native';
import { useThemeName, ThemeName } from '../TamaguiProvider';

const themeOptions: { id: ThemeName; label: string; description: string }[] = [
  { id: 'light', label: 'Light', description: 'Default light theme' },
  { id: 'dark', label: 'Dark', description: 'For low light environments' },
  { id: 'highContrast', label: 'High Contrast', description: 'WCAG AAA contrast' },
  { id: 'largeText', label: 'Large Text', description: 'Increased text sizes' },
  { id: 'dyslexia', label: 'Dyslexia', description: 'OpenDyslexic font, cream background' },
  { id: 'lowVision', label: 'Low Vision', description: 'Atkinson Hyperlegible, large targets' },
  { id: 'autismFriendly', label: 'Autism-Friendly', description: 'Muted colors, no animations' },
];

const Container = styled(View, {
  padding: '$4',
});

const Title = styled(Text, {
  fontSize: '$6',
  fontWeight: '700',
  color: '$color',
  marginBottom: '$4',
});

const ThemeButton = styled(View, {
  padding: '$3',
  borderRadius: '$md',
  borderWidth: 2,
  marginBottom: '$2',

  variants: {
    selected: {
      true: {
        borderColor: '$accentPurple',
        backgroundColor: '$backgroundSecondary',
      },
      false: {
        borderColor: '$borderColor',
        backgroundColor: '$background',
      },
    },
  } as const,
});

const ThemeLabel = styled(Text, {
  fontSize: '$4',
  fontWeight: '600',
  color: '$color',
});

const ThemeDescription = styled(Text, {
  fontSize: '$2',
  color: '$colorSecondary',
  marginTop: '$1',
});

export function ThemeSwitcher() {
  const { theme, setTheme } = useThemeName();

  return (
    <Container>
      <Title>Pick what feels right</Title>
      <ScrollView showsVerticalScrollIndicator={false}>
        {themeOptions.map((option) => (
          <Pressable
            key={option.id}
            onPress={() => setTheme(option.id)}
            accessible
            accessibilityRole="button"
            accessibilityState={{ selected: theme === option.id }}
            accessibilityLabel={`${option.label} theme. ${option.description}`}
          >
            <ThemeButton selected={theme === option.id}>
              <ThemeLabel>{option.label}</ThemeLabel>
              <ThemeDescription>{option.description}</ThemeDescription>
            </ThemeButton>
          </Pressable>
        ))}
      </ScrollView>
    </Container>
  );
}
```

**Step 2: Commit**

```bash
git add prototypes/ui-tamagui/src/components/ThemeSwitcher.tsx
git commit -m "feat(prototype): add ThemeSwitcher component with all 7 themes"
```

---

## Task 7: Create Test Screen

**Files:**
- Create: `prototypes/ui-tamagui/src/screens/TestScreen.tsx`
- Modify: `prototypes/ui-tamagui/App.tsx`

**Step 1: Create screens directory**

```bash
mkdir -p /Users/hailmary/Code/rollercoaster.dev/native-rd/prototypes/ui-tamagui/src/screens
```

**Step 2: Create TestScreen**

Create `prototypes/ui-tamagui/src/screens/TestScreen.tsx`:

```typescript
import { View, styled } from '@tamagui/core';
import { ScrollView, SafeAreaView } from 'react-native';
import { BadgeCard } from '../components/BadgeCard';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

const Container = styled(View, {
  flex: 1,
  backgroundColor: '$background',
});

const Section = styled(View, {
  padding: '$4',
});

const SectionTitle = styled(View, {
  fontSize: '$5',
  fontWeight: '600',
  color: '$color',
  marginBottom: '$3',
});

// Mock badge data
const mockBadges = [
  {
    id: '1',
    title: 'First Steps',
    earnedDate: 'Feb 2, 2026',
    evidenceCount: 3,
  },
  {
    id: '2',
    title: 'Consistency Champion',
    earnedDate: 'Feb 1, 2026',
    evidenceCount: 7,
  },
  {
    id: '3',
    title: 'Deep Focus',
    earnedDate: 'Jan 28, 2026',
    evidenceCount: 2,
  },
];

export function TestScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Container>
        <ScrollView>
          <ThemeSwitcher />

          <Section>
            {mockBadges.map((badge) => (
              <View key={badge.id} marginBottom="$4">
                <BadgeCard
                  title={badge.title}
                  earnedDate={badge.earnedDate}
                  evidenceCount={badge.evidenceCount}
                  onPress={() => console.log(`Pressed badge: ${badge.title}`)}
                />
              </View>
            ))}
          </Section>
        </ScrollView>
      </Container>
    </SafeAreaView>
  );
}
```

**Step 3: Update App.tsx to use TestScreen**

Replace `prototypes/ui-tamagui/App.tsx`:

```typescript
import { StatusBar } from 'expo-status-bar';
import { TamaguiProvider, useThemeName } from './src/TamaguiProvider';
import { TestScreen } from './src/screens/TestScreen';

function AppContent() {
  const { theme } = useThemeName();
  const isDark = theme === 'dark' || theme === 'highContrast' || theme === 'lowVision';

  return (
    <>
      <TestScreen />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  return (
    <TamaguiProvider>
      <AppContent />
    </TamaguiProvider>
  );
}
```

**Step 4: Test the app**

```bash
cd /Users/hailmary/Code/rollercoaster.dev/native-rd/prototypes/ui-tamagui
npx expo start --clear
```

Expected: App shows ThemeSwitcher at top with 7 theme options, BadgeCards below. Tapping themes switches colors instantly.

**Step 5: Commit**

```bash
cd /Users/hailmary/Code/rollercoaster.dev/native-rd
git add prototypes/ui-tamagui/src/screens prototypes/ui-tamagui/App.tsx
git commit -m "feat(prototype): add TestScreen with BadgeCard and ThemeSwitcher"
```

---

## Task 8: Add Custom Fonts (Anybody, OpenDyslexic, Atkinson)

**Files:**
- Create: `prototypes/ui-tamagui/assets/fonts/` (font files)
- Modify: `prototypes/ui-tamagui/tamagui.config.ts`
- Create: `prototypes/ui-tamagui/src/hooks/useFonts.ts`

**Step 1: Create fonts directory**

```bash
mkdir -p /Users/hailmary/Code/rollercoaster.dev/native-rd/prototypes/ui-tamagui/assets/fonts
```

**Step 2: Download fonts**

Download and place in `assets/fonts/`:
- OpenDyslexic-Regular.otf (from https://opendyslexic.org/)
- AtkinsonHyperlegible-Regular.ttf (from https://brailleinstitute.org/freefont)
- DMMono-Regular.ttf (from Google Fonts)

Note: For prototype, we'll use placeholder until fonts are available.

**Step 3: Create font loading hook**

Create `prototypes/ui-tamagui/src/hooks/useFonts.ts`:

```typescript
import { useFonts as useExpoFonts } from 'expo-font';

export function useFonts() {
  const [loaded, error] = useExpoFonts({
    // Uncomment when font files are added:
    // 'OpenDyslexic': require('../../assets/fonts/OpenDyslexic-Regular.otf'),
    // 'AtkinsonHyperlegible': require('../../assets/fonts/AtkinsonHyperlegible-Regular.ttf'),
    // 'DMMono': require('../../assets/fonts/DMMono-Regular.ttf'),
  });

  return { loaded: loaded || true, error }; // Return true for now since no fonts loaded
}
```

**Step 4: Update App.tsx to use font loading**

Update `prototypes/ui-tamagui/App.tsx`:

```typescript
import { StatusBar } from 'expo-status-bar';
import { View, Text } from '@tamagui/core';
import { TamaguiProvider, useThemeName } from './src/TamaguiProvider';
import { TestScreen } from './src/screens/TestScreen';
import { useFonts } from './src/hooks/useFonts';

function AppContent() {
  const { theme } = useThemeName();
  const isDark = theme === 'dark' || theme === 'highContrast' || theme === 'lowVision';

  return (
    <>
      <TestScreen />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

function LoadingScreen() {
  return (
    <View flex={1} backgroundColor="$background" alignItems="center" justifyContent="center">
      <Text color="$color">Loading...</Text>
    </View>
  );
}

export default function App() {
  const { loaded, error } = useFonts();

  if (!loaded && !error) {
    return null; // Splash screen still visible
  }

  return (
    <TamaguiProvider>
      <AppContent />
    </TamaguiProvider>
  );
}
```

**Step 5: Commit**

```bash
git add prototypes/ui-tamagui/assets prototypes/ui-tamagui/src/hooks prototypes/ui-tamagui/App.tsx
git commit -m "feat(prototype): add font loading infrastructure"
```

---

## Task 9: Accessibility Audit Checklist

**Files:**
- Create: `prototypes/ui-tamagui/ACCESSIBILITY_AUDIT.md`

**Step 1: Create accessibility audit document**

Create `prototypes/ui-tamagui/ACCESSIBILITY_AUDIT.md`:

```markdown
# Tamagui Prototype Accessibility Audit

## VoiceOver Testing (iOS)

### BadgeCard Component
- [ ] Card reads title on focus
- [ ] Card announces "button" role
- [ ] Evidence count is announced
- [ ] Date is announced
- [ ] Focus ring is visible

### ThemeSwitcher Component
- [ ] Each theme option reads label and description
- [ ] Selected state is announced
- [ ] Focus moves logically through options
- [ ] Activating theme announces change

## TalkBack Testing (Android)

### BadgeCard Component
- [ ] Card reads title on focus
- [ ] Card announces "button" role
- [ ] Evidence count is announced
- [ ] Date is announced

### ThemeSwitcher Component
- [ ] Each theme option reads label and description
- [ ] Selected state is announced
- [ ] Focus moves logically through options

## Theme-Specific Tests

### High Contrast
- [ ] All text meets 7:1 contrast ratio (AAA)
- [ ] Focus ring is clearly visible
- [ ] No information lost without shadows

### Large Text
- [ ] Text is visibly larger than default
- [ ] Layout doesn't break with larger text
- [ ] Still readable at 200% OS text scale

### Dyslexia-Friendly
- [ ] Background is cream colored
- [ ] Letter spacing is increased
- [ ] Line height is increased
- [ ] (When fonts added) OpenDyslexic is applied

### Low Vision
- [ ] High contrast colors applied
- [ ] Touch targets are 56dp minimum
- [ ] Focus ring is 3dp and visible

### Autism-Friendly
- [ ] Colors are visibly muted/desaturated
- [ ] No shadows visible
- [ ] Animations are disabled (when added)
- [ ] Border radius is reduced (more geometric)

## Keyboard Navigation (if keyboard attached)
- [ ] Tab moves through interactive elements
- [ ] Enter/Space activates buttons
- [ ] Focus order is logical

## Notes

_Document any issues found during testing here:_

---

**Audit Date:** ___________
**Auditor:** ___________
**Device(s) Tested:** ___________
```

**Step 2: Commit**

```bash
git add prototypes/ui-tamagui/ACCESSIBILITY_AUDIT.md
git commit -m "docs(prototype): add accessibility audit checklist"
```

---

## Task 10: Final Review and README

**Files:**
- Create: `prototypes/ui-tamagui/README.md`

**Step 1: Create README**

Create `prototypes/ui-tamagui/README.md`:

```markdown
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
```

**Step 2: Commit**

```bash
git add prototypes/ui-tamagui/README.md
git commit -m "docs(prototype): add README for Tamagui prototype"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Initialize Expo + Tamagui | Project setup |
| 2 | Base tokens config | tamagui.config.ts |
| 3 | Add 7 ND themes | tamagui.config.ts |
| 4 | TamaguiProvider wrapper | TamaguiProvider.tsx, App.tsx |
| 5 | BadgeCard component | BadgeCard.tsx |
| 6 | ThemeSwitcher component | ThemeSwitcher.tsx |
| 7 | Test screen | TestScreen.tsx, App.tsx |
| 8 | Custom fonts | fonts/, useFonts.ts |
| 9 | Accessibility audit | ACCESSIBILITY_AUDIT.md |
| 10 | README | README.md |
