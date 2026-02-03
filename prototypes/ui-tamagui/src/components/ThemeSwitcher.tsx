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
