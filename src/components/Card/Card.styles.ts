import { StyleSheet } from 'react-native-unistyles';
import { shadowStyle } from '../../styles/shadows';
import type { space } from '../../themes/tokens';

export type CardSize = 'compact' | 'normal' | 'spacious';

const sizeMap: Record<CardSize, keyof typeof space> = {
  compact: '3',
  normal: '4',
  spacious: '5',
};

export const styles = StyleSheet.create((theme) => ({
  pressable: (size: CardSize = 'normal') => ({
    minHeight: 48,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.space[sizeMap[size]],
    ...shadowStyle(theme, 'hardMd'),
  }),
  container: (size: CardSize = 'normal') => ({
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.space[sizeMap[size]],
    ...shadowStyle(theme, 'hardMd'),
  }),
  pressed: {
    opacity: 0.9,
  },
}));
