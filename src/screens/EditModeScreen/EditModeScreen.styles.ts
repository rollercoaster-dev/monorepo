import { StyleSheet } from 'react-native-unistyles';
import { shadowStyle } from '../../styles/shadows';

export const styles = StyleSheet.create((theme) => ({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space[4],
    paddingVertical: theme.space[2],
  },
  backIcon: {
    fontSize: 18,
    fontWeight: theme.fontWeight.bold,
  },
  spacer: {
    width: 48,
  },
  scrollContent: {
    padding: theme.space[4],
    paddingBottom: theme.space[12],
    gap: theme.space[4],
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.space[4],
  },
  section: {
    gap: theme.space[2],
  },
  label: {
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: theme.fontWeight.black,
    fontFamily: theme.fontFamily.headline,
    color: theme.colors.text,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[3],
    minHeight: 48,
    ...shadowStyle(theme, 'hardSm'),
  },
  inputError: {
    borderColor: theme.colors.accentPrimary,
  },
  errorText: {
    color: theme.colors.accentPrimary,
  },
  descriptionInput: {
    fontSize: theme.size.md,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[3],
    minHeight: 80,
    textAlignVertical: 'top',
    ...shadowStyle(theme, 'hardSm'),
  },
  // Step list header
  stepListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepListTitle: {
    fontWeight: theme.fontWeight.black,
  },
  stepCount: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: theme.fontWeight.bold,
  },
  // Step item row: drag handle | input | delete
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2],
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[2],
    ...shadowStyle(theme, 'hardSm'),
  },
  dragHandle: {
    fontSize: 18,
    color: theme.colors.textMuted,
    minWidth: 24,
    textAlign: 'center',
  },
  stepTitleInput: {
    flex: 1,
    fontSize: theme.size.md,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
    padding: theme.space[1],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  stepTitleInputFocused: {
    borderBottomColor: theme.colors.accentPrimary,
  },
  deleteStepBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  deleteStepText: {
    fontSize: 16,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textMuted,
  },
  // Add step row
  addStepRow: {
    flexDirection: 'row',
    gap: theme.space[2],
    marginTop: theme.space[3],
  },
  addStepInput: {
    flex: 1,
    fontSize: theme.size.md,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[2],
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.backgroundSecondary,
    ...shadowStyle(theme, 'hardSm'),
  },
  addStepBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accentPrimary,
    borderWidth: theme.borderWidth.thick,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    ...shadowStyle(theme, 'hardSm'),
  },
  addStepBtnText: {
    fontSize: 22,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.background,
  },
  buttonSection: {
    marginTop: theme.space[4],
  },
  loadingIndicator: {
    marginTop: theme.space[8],
  },
}));
