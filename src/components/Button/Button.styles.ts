import { StyleSheet } from 'react-native-unistyles';
import { shadowStyle } from '../../styles/shadows';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

const sizeMap = {
  sm: { paddingH: '3', paddingV: '1', fontSize: 'sm', minHeight: 36 },
  md: { paddingH: '4', paddingV: '2', fontSize: 'md', minHeight: 44 },
  lg: { paddingH: '5', paddingV: '3', fontSize: 'lg', minHeight: 52 },
} as const;

export const styles = StyleSheet.create((theme) => ({
  pressable: (size: ButtonSize = 'md') => ({
    minHeight: Math.max(sizeMap[size].minHeight, 48),
    borderRadius: theme.radius.md,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: theme.space[sizeMap[size].paddingH],
    paddingVertical: theme.space[sizeMap[size].paddingV],
    gap: theme.space[2],
  }),
  variantPrimary: {
    backgroundColor: theme.colors.accentPrimary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.accentPrimary,
    ...shadowStyle(theme, 'hardMd'),
  },
  variantSecondary: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    ...shadowStyle(theme, 'hardMd'),
  },
  variantGhost: {
    backgroundColor: 'transparent',
    borderWidth: theme.borderWidth.medium,
    borderColor: 'transparent',
  },
  variantDestructive: {
    backgroundColor: theme.colors.warning,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.text,
    ...shadowStyle(theme, 'hardMd'),
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.4,
  },
  label: (size: ButtonSize = 'md') => ({
    fontSize: theme.size[sizeMap[size].fontSize],
    fontWeight: theme.fontWeight.semibold,
    fontFamily: theme.fontFamily.body,
  }),
  labelPrimary: {
    color: theme.colors.background,
  },
  labelSecondary: {
    color: theme.colors.text,
  },
  labelGhost: {
    color: theme.colors.text,
  },
  labelDestructive: {
    color: theme.colors.text,
  },
}));
