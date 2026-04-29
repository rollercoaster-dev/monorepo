import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "./ScreenHeader.styles";

// Single painted band that covers the safe-area inset + chrome row.
// Lives here (not as a SafeAreaView wrapper) because Unistyles v3's Babel
// plugin only rewrites style props on its built-in component allowlist;
// SafeAreaView from react-native-safe-area-context is not in it, so style
// reads on it lag behind theme switches and produce a two-tone band.
export interface HeaderBandProps {
  children: React.ReactNode;
}

export function HeaderBand({ children }: HeaderBandProps) {
  const insets = useSafeAreaInsets();
  return <View style={styles.band(insets.top)}>{children}</View>;
}
