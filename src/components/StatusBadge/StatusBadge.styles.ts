import { StyleSheet } from 'react-native-unistyles';
import { shadowStyle } from '../../styles/shadows';

export type StatusBadgeVariant = 'active' | 'completed' | 'locked' | 'earned';

export const styles = StyleSheet.create((theme) => ({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.sm,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[1],
    ...shadowStyle(theme, 'hardSm'),
  },
  variantActive: {
    backgroundColor: theme.narrative.climb.bg,
    borderColor: theme.narrative.climb.text,
  },
  variantCompleted: {
    backgroundColor: theme.narrative.relief.bg,
    borderColor: theme.narrative.relief.text,
  },
  variantLocked: {
    backgroundColor: theme.colors.backgroundTertiary,
    borderColor: theme.colors.border,
  },
  variantEarned: {
    backgroundColor: theme.narrative.stories.bg,
    borderColor: theme.narrative.stories.text,
  },
  text: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily.body,
    textTransform: 'uppercase',
    letterSpacing: theme.letterSpacing.wide,
  },
  textActive: {
    color: theme.narrative.climb.text,
  },
  textCompleted: {
    color: theme.narrative.relief.text,
  },
  textLocked: {
    color: theme.colors.textMuted,
  },
  textEarned: {
    color: theme.narrative.stories.text,
  },
}));
