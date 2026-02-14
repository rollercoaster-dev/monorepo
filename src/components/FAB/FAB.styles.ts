import { StyleSheet } from 'react-native-unistyles';
import { shadowStyle } from '../../styles/shadows';

export const styles = StyleSheet.create((theme) => ({
  button: {
    position: 'absolute',
    bottom: 56,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.info,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 11,
    ...shadowStyle(theme, 'hardMd'),
  },
  pressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
    shadowOffset: { width: 0, height: 0 },
  },
  icon: {
    fontSize: 28,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.background,
    lineHeight: 30,
  },
  iconOpen: {
    transform: [{ rotate: '45deg' }],
  },
}));
