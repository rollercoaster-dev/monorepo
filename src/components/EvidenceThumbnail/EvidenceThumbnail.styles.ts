import { StyleSheet } from 'react-native-unistyles';
import { shadowStyle } from '../../styles/shadows';

export const styles = StyleSheet.create((theme) => ({
  container: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    minHeight: 48,
    ...shadowStyle(theme, 'hardSm'),
  },
  preview: {
    height: 80,
    backgroundColor: theme.colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewIcon: {
    fontSize: 24,
  },
  info: {
    padding: theme.space[2],
  },
  title: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.medium,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
    numberOfLines: 1,
  },
  type: {
    fontSize: theme.size.xs,
    fontFamily: theme.fontFamily.mono,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: theme.letterSpacing.label,
    marginTop: 2,
  },
  linkUrl: {
    fontSize: theme.size.xs,
    fontFamily: theme.fontFamily.mono,
    color: theme.colors.accentPrimary,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.8,
  },
}));
