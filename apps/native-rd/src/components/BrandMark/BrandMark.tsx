import React from "react";
import Svg, { Path, Rect, Text as SvgText } from "react-native-svg";

export interface BrandMarkProps {
  size?: number;
}

// Brand colors are intentionally static — the mark anchors identity across
// themes. Source: apps/native-rd/assets/logo-light.svg (simplified to
// background + flower + monogram, matching the verified welcome prototype).
const BG = "#ffe50c";
const FLOWER = "#a78bfa";
const INK = "#0a0a0a";

const FLOWER_PATH =
  "M594.39,201.77c26.75-3.92,39.18,22.01,62.88,29,18.93,5.58,41.99-.51,57.38,11.7,16.22,12.87,12.12,37.54,21.06,55.05,9.15,17.92,34.36,29.38,36.8,49.84,3.03,25.49-18.97,39.75-21.81,62.23-3.23,25.51,8.52,51.92-18.22,68.42-11.76,7.26-28.71,9.23-39.38,16.82-13.96,9.93-20.59,31.87-38.06,38.05-23.37,8.26-40.27-13.9-65.06-7.69-15.3,3.84-25.92,12.99-43.1,7.99-19.12-5.57-24.45-28.06-38.93-38.35-12.54-8.91-31.63-9.54-43.8-19.42-20-16.22-11.54-40.66-13.45-62.65-2.2-25.34-26.05-38.7-22.19-66.59,2.63-19,25.83-30.9,34.79-46,11.14-18.77,5.32-44.27,23.62-58.34,15.2-11.68,36.88-5.47,55.03-10.54,19.12-5.34,35.41-27.02,52.44-29.52Z";

export function BrandMark({ size = 56 }: BrandMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1200 1200">
      <Rect width={1200} height={1200} fill={BG} />
      <Path d={FLOWER_PATH} fill={FLOWER} />
      <SvgText
        x={600}
        y={420}
        textAnchor="middle"
        fontFamily="Arial"
        fontSize={180}
        fontWeight="900"
        fill={INK}
      >
        RD
      </SvgText>
    </Svg>
  );
}
