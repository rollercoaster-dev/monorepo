import { StyleSheet } from 'react-native-unistyles';

export const stylesheet = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.space[4],
    paddingBottom: theme.space[12],
  },
  section: {
    marginBottom: theme.space[6],
  },
  sectionTitle: {
    fontSize: theme.size['2xl'],
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.space[4],
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space[3],
  },
  colorSwatch: {
    width: 60,
    height: 60,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchLabel: {
    fontSize: theme.size.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.space[1],
    textAlign: 'center',
  },
  themeInfo: {
    backgroundColor: theme.colors.backgroundSecondary,
    padding: theme.space[3],
    borderRadius: theme.radius.md,
    marginBottom: theme.space[4],
  },
  themeInfoText: {
    fontSize: theme.size.md,
    color: theme.colors.text,
  },
}));
