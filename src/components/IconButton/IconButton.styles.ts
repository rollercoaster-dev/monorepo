import { StyleSheet } from 'react-native-unistyles';
import { shadowStyle } from '../../styles/shadows';

export type IconButtonSize = 'sm' | 'md' | 'lg';
export type IconButtonVariant = 'default' | 'ghost' | 'destructive';

const sizeValues = {
  sm: 36,
  md: 44,
  lg: 52,
} as const;

export const styles = StyleSheet.create((theme) => ({
  pressable: (size: IconButtonSize = 'md') => ({
    width: Math.max(sizeValues[size], 48),
    height: Math.max(sizeValues[size], 48),
    borderRadius: theme.radius.pill,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  }),
  variantDefault: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    ...shadowStyle(theme, 'hardSm'),
  },
  variantGhost: {
    backgroundColor: 'transparent',
  },
  variantDestructive: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    ...shadowStyle(theme, 'hardSm'),
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
}));
