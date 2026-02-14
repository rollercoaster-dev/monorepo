import { StyleSheet } from 'react-native-unistyles';
import { shadowStyle } from '../../styles/shadows';

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
  },
  track: {
    flex: 1,
    position: 'relative' as const,
    width: '100%',
    overflow: 'hidden' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  navRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: theme.space[3],
    paddingVertical: theme.space[3],
    paddingHorizontal: theme.space[2],
  },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    ...shadowStyle(theme, 'hardSm'),
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  arrowText: {
    fontSize: theme.size['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    fontFamily: theme.fontFamily.body,
  },
}));
