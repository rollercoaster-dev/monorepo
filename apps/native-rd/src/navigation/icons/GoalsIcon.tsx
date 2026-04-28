import React from "react";
import Svg, { Circle } from "react-native-svg";

export interface GoalsIconProps {
  color: string;
  size?: number;
}

export function GoalsIcon({ color, size = 22 }: GoalsIconProps) {
  const stroke = Math.max(2, size * 0.11);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle
        cx="12"
        cy="12"
        r={11 - stroke / 2}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
      />
      <Circle cx="12" cy="12" r="3" fill={color} />
    </Svg>
  );
}
