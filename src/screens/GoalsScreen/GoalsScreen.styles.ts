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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addIcon: {
    fontSize: 24,
    lineHeight: 28,
  },
  listContent: {
    gap: theme.space[3],
  },
  loadingIndicator: {
    marginTop: theme.space[8],
  },
}));
