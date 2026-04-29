import { StyleSheet } from "react-native-unistyles";
import { shadowStyle } from "../../styles/shadows";

export type IconButtonSize = "sm" | "md" | "lg";
export type IconButtonTone =
  | "chrome"
  | "ghost"
  | "surface"
  | "primary"
  | "destructive";

const sizeValues = {
  sm: 36,
  md: 44,
  lg: 52,
} as const;

// hitSlop expands touch target to 44pt minimum without inflating visual size
const hitSlopValues: Record<IconButtonSize, number> = {
  sm: 4,
  md: 0,
  lg: 0,
};

export const styles = StyleSheet.create((theme) => ({
  pressable: (size: IconButtonSize = "md") => ({
    width: sizeValues[size],
    height: sizeValues[size],
    borderRadius: theme.radius.sm,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    hitSlop: hitSlopValues[size],
  }),
  // Chrome: sits on top of the app's purple chrome band (header / tab bar).
  // Transparent so the band shows through; foreground reads against the band.
  toneChrome: {
    backgroundColor: "transparent",
  },
  // Ghost: transparent inline control on the current page surface.
  toneGhost: {
    backgroundColor: "transparent",
  },
  // Surface: raised neutral control on cards / page surfaces.
  toneSurface: {
    backgroundColor: theme.action.actionSecondaryBg,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.surfaceBorder.borderDefault,
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  // Primary: prominent accented action.
  tonePrimary: {
    backgroundColor: theme.action.actionPrimaryBg,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.surfaceBorder.borderDefault,
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  // Destructive: destructive action treatment.
  toneDestructive: {
    backgroundColor: theme.action.actionDestructiveBg,
    borderWidth: theme.borderWidth.medium,
    borderColor: theme.surfaceBorder.borderDestructive,
    ...shadowStyle(theme, "cardElevationSmall"),
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
}));

// Resolve the foreground color for icons inside an IconButton. Lives in the
// styles module so call sites never reach for a token to set icon color
// themselves.
export function resolveIconColor(
  theme: {
    chrome: { chromeTabBarFg: string };
    surfaceBorder: { surfaceCardFg: string };
    action: {
      actionSecondaryFg: string;
      actionPrimaryFg: string;
      actionDestructiveFg: string;
    };
  },
  tone: IconButtonTone,
): string {
  switch (tone) {
    case "chrome":
      // Foreground on the app's purple chrome band — same role as tab bar text.
      return theme.chrome.chromeTabBarFg;
    case "ghost":
      // Inline on the current page surface.
      return theme.surfaceBorder.surfaceCardFg;
    case "surface":
      return theme.action.actionSecondaryFg;
    case "primary":
      return theme.action.actionPrimaryFg;
    case "destructive":
      return theme.action.actionDestructiveFg;
  }
}
