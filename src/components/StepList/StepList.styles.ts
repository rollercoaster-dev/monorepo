import { StyleSheet } from 'react-native-unistyles';
import { shadowStyle } from '../../styles/shadows';

export const styles = StyleSheet.create((theme) => ({
  container: {
    gap: theme.space[1],
  },
  draggableItem: {
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.space[2],
    paddingVertical: theme.space[1],
  },
  draggingItem: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.accentPrimary,
    ...shadowStyle(theme, 'hardLg'),
    elevation: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepContent: {
    flex: 1,
  },
  reorderButtons: {
    flexDirection: 'row',
    gap: theme.space[1],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.space[2],
  },
  headerLabel: {
    fontSize: theme.size.xs,
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily.body,
    textTransform: 'uppercase',
    letterSpacing: theme.letterSpacing.wide,
    color: theme.colors.textMuted,
  },
  count: {
    fontSize: theme.size.xs,
    fontFamily: theme.fontFamily.mono,
    color: theme.colors.textSecondary,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    minHeight: 48,
  },
  editBox: {
    width: 24,
    height: 24,
    borderRadius: theme.radius.sm,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBoxChecked: {
    backgroundColor: theme.colors.accentPrimary,
    borderColor: theme.colors.accentPrimary,
  },
  editCheckmark: {
    fontSize: 14,
    color: theme.colors.background,
    fontWeight: theme.fontWeight.bold,
  },
  editInput: {
    flex: 1,
    fontSize: theme.size.md,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
    borderBottomWidth: theme.borderWidth.medium,
    borderBottomColor: theme.colors.accentPrimary,
    paddingVertical: theme.space[2],
  },
  addStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    minHeight: 48,
    marginTop: theme.space[2],
    borderTopWidth: theme.borderWidth.thin,
    borderTopColor: theme.colors.border,
    paddingTop: theme.space[2],
  },
  addStepPlus: {
    width: 24,
    textAlign: 'center',
    fontSize: theme.size.lg,
    color: theme.colors.textMuted,
    fontWeight: theme.fontWeight.bold,
  },
  addStepInput: {
    flex: 1,
    fontSize: theme.size.md,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
    paddingVertical: theme.space[2],
  },
}));
