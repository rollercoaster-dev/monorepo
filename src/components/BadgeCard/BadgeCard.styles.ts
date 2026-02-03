import { StyleSheet } from 'react-native-unistyles';

type CardSize = 'compact' | 'normal' | 'spacious';

const sizeMap: Record<CardSize, number> = {
  compact: 3,
  normal: 4,
  spacious: 5,
} as const;

export const styles = StyleSheet.create((theme) => ({
  pressable: {
    minHeight: 48,
  },
  container: (size: CardSize = 'normal') => ({
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.space[sizeMap[size] as keyof typeof theme.space],
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: theme.shadows.opacity,
    shadowRadius: 2,
    elevation: 1,
  }),
  image: {
    width: 80,
    height: 80,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accentPurple,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.space[3],
  },
  imageText: {
    color: '#ffffff',
    fontSize: theme.size['3xl'],
    fontWeight: theme.fontWeight.bold,
  },
  title: {
    fontSize: theme.size.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.space[1],
  },
  date: {
    fontSize: theme.size.sm,
    color: theme.colors.textMuted,
  },
  evidenceCount: {
    fontSize: theme.size.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.space[2],
  },
}));
