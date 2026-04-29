import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";
import { PILL_HEIGHT } from "./FocusPillTabBar";

/**
 * Bottom padding for scrollable content inside the tab navigator. Accounts
 * for the lifted FocusPillTabBar (which sticks ~half its height above the
 * tab bar slot) plus the safe-area inset, so the last item is reachable.
 */
export function useTabScreenContentInset(): { paddingBottom: number } {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  return {
    paddingBottom:
      PILL_HEIGHT +
      2 * theme.borderWidth.medium +
      insets.bottom +
      theme.space[4],
  };
}
