import React from 'react';
import { Text } from 'react-native-svg';
import { getSafeTextColor } from '../../utils/accessibility';

export interface CenterLabelProps {
  label: string | undefined;
  size: number;
  fillColor: string;
  centerContentSize: number;
}

/** Font size as fraction of badge diameter (~15%) */
export const CENTER_LABEL_SIZE_RATIO = 0.15;

export function CenterLabel({ label, size, fillColor, centerContentSize }: CenterLabelProps) {
  if (!label || label.trim().length === 0) return null;

  const fontSize = size * CENTER_LABEL_SIZE_RATIO;
  const textColor = getSafeTextColor(fillColor, 'CenterLabel');
  const cx = size / 2;
  const cy = size / 2 + centerContentSize / 2 + fontSize;

  return (
    <Text
      x={cx}
      y={cy}
      textAnchor="middle"
      alignmentBaseline="central"
      fontFamily="Instrument Sans"
      fontSize={fontSize}
      fill={textColor}
    >
      {label.trim()}
    </Text>
  );
}
