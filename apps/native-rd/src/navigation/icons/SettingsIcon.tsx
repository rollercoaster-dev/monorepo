import React from "react";
import Svg, { Circle, Path } from "react-native-svg";

export interface SettingsIconProps {
  color: string;
  size?: number;
}

export function SettingsIcon({ color, size = 22 }: SettingsIconProps) {
  const stroke = Math.max(2, size * 0.11);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2 L14 5 L17 4 L17 7 L20 8 L19 11 L22 13 L19 15 L20 18 L17 19 L17 22 L14 21 L12 24 L10 21 L7 22 L7 19 L4 18 L5 15 L2 13 L5 11 L4 8 L7 7 L7 4 L10 5 Z"
        stroke={color}
        strokeWidth={stroke}
        strokeLinejoin="miter"
        fill="none"
      />
      <Circle
        cx="12"
        cy="13"
        r="3"
        stroke={color}
        strokeWidth={stroke}
        fill="none"
      />
    </Svg>
  );
}
