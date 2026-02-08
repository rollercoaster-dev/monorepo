import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme) => ({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.space[4],
  },
  container: {
    width: '100%',
    maxWidth: 400,
  },
  content: {
    alignItems: 'center',
    gap: theme.space[3],
    marginBottom: theme.space[4],
  },
  icon: {
    fontSize: 64,
    lineHeight: 72,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  actions: {
    gap: theme.space[2],
  },
}));
