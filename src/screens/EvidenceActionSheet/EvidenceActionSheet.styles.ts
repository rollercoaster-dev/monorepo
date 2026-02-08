import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme) => ({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: `${theme.colors.shadow}cc`,
  },
  container: {
    width: '100%',
    padding: theme.space[4],
    gap: theme.space[2],
  },
  title: {
    textAlign: 'center',
    marginBottom: theme.space[1],
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    paddingVertical: theme.space[3],
    paddingHorizontal: theme.space[4],
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.backgroundTertiary,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
  },
  optionPressed: {
    opacity: 0.7,
  },
  optionIcon: {
    fontSize: theme.space[6],
    width: theme.space[8],
    textAlign: 'center',
  },
  cancelContainer: {
    marginTop: theme.space[2],
  },
}));
