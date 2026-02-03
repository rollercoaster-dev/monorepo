import { StyleSheet } from 'react-native-unistyles';

export const stylesheet = StyleSheet.create((theme) => ({
  container: {
    padding: theme.space[4],
  },
  title: {
    fontSize: theme.size['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.space[4],
  },
  button: (selected: boolean) => ({
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
