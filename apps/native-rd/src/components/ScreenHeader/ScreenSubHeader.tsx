import React from "react";
import { View } from "react-native";
import { Text } from "../Text";
import { IconButton } from "../IconButton";
import { HeaderBand } from "./HeaderBand";
import { styles } from "./ScreenHeader.styles";

export interface ScreenSubHeaderProps {
  label: string;
  onBack: () => void;
  right?: React.ReactNode;
}

export function ScreenSubHeader({
  label,
  onBack,
  right,
}: ScreenSubHeaderProps) {
  return (
    <HeaderBand>
      <IconButton
        icon={
          <Text variant="headline" style={styles.backIcon}>
            {"\u2190"}
          </Text>
        }
        onPress={onBack}
        tone="chrome"
        accessibilityLabel="Go back"
      />
      <Text variant="title" style={styles.subLabel} accessibilityRole="header">
        {label}
      </Text>
      {right ?? <View style={styles.spacer} />}
    </HeaderBand>
  );
}
