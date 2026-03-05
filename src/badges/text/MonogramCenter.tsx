import React from 'react';
import { Text } from 'react-native-svg';
import { getSafeTextColor } from '../../utils/accessibility';

export interface MonogramCenterProps {
  monogram: string | undefined;
  size: number;
  fillColor: string;
}

/** Font size as fraction of badge diameter — 1 character */
export const MONOGRAM_SIZE_RATIO_1 = 0.35;
/** Font size as fraction of badge diameter — 2 characters */
export const MONOGRAM_SIZE_RATIO_2 = 0.28;
/** Font size as fraction of badge diameter — 3 characters */
export const MONOGRAM_SIZE_RATIO_3 = 0.22;

const RATIO_BY_LENGTH = [MONOGRAM_SIZE_RATIO_1, MONOGRAM_SIZE_RATIO_2, MONOGRAM_SIZE_RATIO_3];

export function MonogramCenter({ monogram, size, fillColor }: MonogramCenterProps) {
  if (!monogram || monogram.trim().length === 0) return null;

  const chars = monogram.trim().slice(0, 3);
  const ratio = RATIO_BY_LENGTH[Math.min(chars.length, 3) - 1];
  const fontSize = size * ratio;
  const textColor = getSafeTextColor(fillColor, 'MonogramCenter');
  const cx = size / 2;
  const cy = size / 2;

  return (
    <Text
      x={cx}
      y={cy}
      textAnchor="middle"
      alignmentBaseline="central"
      fontFamily="Anybody"
      fontWeight="bold"
      fontSize={fontSize}
      fill={textColor}
    >
      {chars}
    </Text>
  );
}
