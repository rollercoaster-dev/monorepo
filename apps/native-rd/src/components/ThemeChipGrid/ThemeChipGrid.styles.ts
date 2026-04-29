import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

const CHIP_HEIGHT = 72;

export const styles = StyleSheet.create((theme) => ({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space[2],
  },
  chip: {
    width: `${(100 - 3 * 2) / 4}%`,
    height: CHIP_HEIGHT,
    borderRadius: theme.radius.md,
    borderWidth: theme.borderWidth.medium,
    overflow: "hidden",
  },
  chipUnselected: {
    borderColor: theme.colors.border,
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  chipSelected: {
    borderColor: theme.colors.focusRing,
    borderWidth: 3,
    ...shadowStyle(theme, "cardElevation"),
  },
  stripeRow: {
    flex: 1,
    flexDirection: "row",
  },
  nameBar: {
    paddingVertical: theme.space[1],
    paddingHorizontal: theme.space[1],
    backgroundColor: "rgba(255,255,255,0.92)",
    borderTopWidth: 1,
    borderTopColor: "#0a0a0a",
  },
  nameBarDark: {
    backgroundColor: "#1a1033",
    borderTopColor: "#cfc7e0",
  },
  nameText: {
    fontSize: 9,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    textAlign: "center",
    color: "#0a0a0a",
    lineHeight: 11,
  },
  nameTextDark: {
    color: "#fafafa",
  },
}));
