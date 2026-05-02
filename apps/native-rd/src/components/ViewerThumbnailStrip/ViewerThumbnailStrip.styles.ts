import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export const styles = StyleSheet.create((theme) => ({
  container: {
    backgroundColor: theme.colors.background,
    borderTopWidth: theme.borderWidth.medium,
    borderTopColor: theme.colors.border,
    paddingVertical: theme.space[3],
    ...shadowStyle(theme, "hardMd"),
  },
  content: {
    paddingHorizontal: theme.space[4],
  },
  separator: {
    width: 8,
  },
}));
