import React from "react";
import Svg, { Path } from "react-native-svg";

export interface PlusIconProps {
  color: string;
  size?: number;
}

export function PlusIcon({ color, size = 22 }: PlusIconProps) {
  const stroke = Math.max(2.5, size * 0.14);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 4 L12 20 M4 12 L20 12"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="square"
      />
    </Svg>
  );
}
