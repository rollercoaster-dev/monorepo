import React from "react";
import { Image, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useUnistyles } from "react-native-unistyles";
import { shieldPath } from "../../badges/shapes/paths";

export interface BrandMarkProps {
  size?: number;
}

export function BrandMark({ size = 56 }: BrandMarkProps) {
  const { theme } = useUnistyles();
  const stroke = 2;
  const path = shieldPath(size, stroke / 2);
  const iconSize = size;
  const iconLeft = 0;
  const iconTop = 0;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Path
          d={path}
          fill={theme.colors.backgroundSecondary}
          stroke={theme.colors.border}
          strokeWidth={stroke}
        />
      </Svg>
      <Image
        source={require("../../../assets/adaptive-icon.png")}
        style={{
          position: "absolute",
          left: iconLeft,
          top: iconTop,
          width: iconSize,
          height: iconSize,
        }}
        resizeMode="contain"
      />
    </View>
  );
}
