import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.space[4],
    paddingBottom: theme.space[12],
    gap: theme.space[4],
  },
  header: {
    gap: theme.space[1],
  },
  title: {
    fontSize: theme.size['2xl'],
    lineHeight: theme.lineHeight['2xl'],
    fontWeight: theme.fontWeight.bold,
    fontFamily: theme.fontFamily.headline,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.size.sm,
    lineHeight: theme.lineHeight.sm,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.textSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    gap: theme.space[2],
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[2],
    fontSize: theme.size.md,
    lineHeight: theme.lineHeight.md,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  addButton: {
    backgroundColor: theme.colors.text,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space[4],
    justifyContent: 'center',
  },
  addButtonText: {
    color: theme.colors.background,
    fontSize: theme.size.md,
    fontWeight: theme.fontWeight.semibold,
    fontFamily: theme.fontFamily.body,
  },
  listSection: {
    gap: theme.space[2],
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.space[3],
  },
  goalCardCompleted: {
    opacity: 0.6,
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: theme.size.md,
    lineHeight: theme.lineHeight.md,
    fontWeight: theme.fontWeight.medium,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.text,
  },
  goalTitleCompleted: {
    textDecorationLine: 'line-through',
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space[2],
    paddingVertical: 2,
  },
  statusBadgeActive: {
    backgroundColor: theme.narrative.climb.bg,
  },
  statusBadgeCompleted: {
    backgroundColor: theme.narrative.relief.bg,
  },
  statusBadgeText: {
    fontSize: theme.size.xs,
    lineHeight: theme.lineHeight.xs,
    fontWeight: theme.fontWeight.semibold,
    fontFamily: theme.fontFamily.body,
  },
  statusBadgeTextActive: {
    color: theme.narrative.climb.text,
  },
  statusBadgeTextCompleted: {
    color: theme.narrative.relief.text,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.space[8],
    gap: theme.space[2],
  },
  emptyTitle: {
    fontSize: theme.size.lg,
    lineHeight: theme.lineHeight.lg,
    fontWeight: theme.fontWeight.semibold,
    fontFamily: theme.fontFamily.headline,
    color: theme.colors.text,
  },
  emptyBody: {
    fontSize: theme.size.sm,
    lineHeight: theme.lineHeight.sm,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  devSection: {
    marginTop: theme.space[4],
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.space[3],
    gap: theme.space[2],
    backgroundColor: theme.colors.backgroundSecondary,
  },
  devTitle: {
    fontSize: theme.size.sm,
    lineHeight: theme.lineHeight.sm,
    fontWeight: theme.fontWeight.semibold,
    fontFamily: theme.fontFamily.mono,
    color: theme.colors.textSecondary,
  },
  devText: {
    fontSize: theme.size.xs,
    lineHeight: theme.lineHeight.xs,
    fontFamily: theme.fontFamily.mono,
    color: theme.colors.textSecondary,
  },
  deleteHint: {
    fontSize: theme.size.xs,
    lineHeight: theme.lineHeight.xs,
    fontFamily: theme.fontFamily.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  goalSeparator: {
    height: theme.space[2],
  },
  loadingIndicator: {
    marginTop: theme.space[8],
  },
}));
