import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme) => ({
  container: {
    padding: theme.space[4],
  },
  title: {
    fontSize: theme.size['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.space[4],
  },
  sectionTitle: {
    fontSize: theme.size.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    marginBottom: theme.space[2],
    marginTop: theme.space[2],
  },
  colorModeRow: {
    flexDirection: 'row',
    gap: theme.space[2],
    marginBottom: theme.space[4],
  },
  colorModeButton: (selected: boolean) => ({
    flex: 1,
    padding: theme.space[3],
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: selected ? theme.colors.accentPurple : theme.colors.border,
    backgroundColor: selected ? theme.colors.backgroundSecondary : theme.colors.background,
    alignItems: 'center' as const,
  }),
  colorModeLabel: (selected: boolean) => ({
    fontSize: theme.size.md,
    fontWeight: selected ? theme.fontWeight.bold : theme.fontWeight.normal,
    color: theme.colors.text,
  }),
  variantButton: (selected: boolean) => ({
    padding: theme.space[3],
    borderRadius: theme.radius.md,
    borderWidth: 2,
    marginBottom: theme.space[2],
    borderColor: selected ? theme.colors.accentPurple : theme.colors.border,
    backgroundColor: selected ? theme.colors.backgroundSecondary : theme.colors.background,
  }),
  label: {
    fontSize: theme.size.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  description: {
    fontSize: theme.size.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.space[1],
  },
}));
