import React from 'react';
import { Text } from 'react-native-svg';
import { getSafeTextColor } from '../../utils/accessibility';
import { fontFamily as fontFamilyTokens } from '../../themes/tokens';

export interface CenterLabelProps {
  label: string | undefined;
  size: number;
  fillColor: string;
  centerContentSize: number;
  /** Font family name. Callers should pass theme.fontFamily.body for a11y variant support. */
  fontFamily?: string;
}

/** Font size as fraction of badge diameter (~15%) */
export const CENTER_LABEL_SIZE_RATIO = 0.15;

/** Maximum characters for center label */
export const CENTER_LABEL_MAX_CHARS = 10;

export function CenterLabel({ label, size, fillColor, centerContentSize, fontFamily = fontFamilyTokens.body }: CenterLabelProps) {
  if (!label || label.trim().length === 0) return null;

  const text = label.trim().slice(0, CENTER_LABEL_MAX_CHARS);
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
      fontFamily={fontFamily}
      fontSize={fontSize}
      fill={textColor}
    >
      {text}
    </Text>
  );
}
