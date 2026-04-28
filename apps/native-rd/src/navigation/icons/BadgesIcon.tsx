import React from "react";
import Svg, { Path } from "react-native-svg";

export interface BadgesIconProps {
  color: string;
  size?: number;
}

export function BadgesIcon({ color, size = 22 }: BadgesIconProps) {
  const stroke = Math.max(2, size * 0.11);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2 L14.5 9 L22 9 L16 13.5 L18.5 21 L12 16.5 L5.5 21 L8 13.5 L2 9 L9.5 9 Z"
        stroke={color}
        strokeWidth={stroke}
        strokeLinejoin="miter"
        fill="none"
      />
    </Svg>
  );
}
