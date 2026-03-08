import React from 'react';
import { Defs, Path, Text, TextPath } from 'react-native-svg';
import type { BadgeShape, PathTextPosition } from '../types';
import { generateContour } from '../shapes/contours';
import { getSafeTextColor } from '../../utils/accessibility';
import { fontFamily as fontFamilyTokens } from '../../themes/tokens';

export interface PathTextProps {
  pathText: string | undefined;
  pathTextBottom: string | undefined;
  pathTextPosition: PathTextPosition | undefined;
  shape: BadgeShape;
  size: number;
  fillColor: string;
  inset?: number;
  /** Font family for inscription. Callers should pass theme.fontFamily.mono for a11y variant support. */
  fontFamily?: string;
}

/** Font size as fraction of badge diameter (~9%, midpoint of 8-10% spec) */
export const PATH_TEXT_FONT_SIZE_RATIO = 0.09;

/** Fill opacity for path text (WCAG contrast at 70% opacity) */
export const PATH_TEXT_OPACITY = 0.7;

/** Module-scoped counter for unique SVG path IDs across multiple badge instances */
let pathTextCounter = 0;

export function PathText({
  pathText,
  pathTextBottom,
  pathTextPosition,
  shape,
  size,
  fillColor,
  inset = 0,
  fontFamily = fontFamilyTokens.mono,
}: PathTextProps): React.ReactElement | null {
  const position = pathTextPosition ?? 'top';
  const showTop = position === 'top' || position === 'both';
  const showBottom = position === 'bottom' || position === 'both';

  const topText = showTop ? pathText?.trim() : undefined;
  const bottomText = showBottom ? pathTextBottom?.trim() : undefined;

  if (!topText && !bottomText) return null;

  const contour = generateContour(shape, size, inset);
  const id = pathTextCounter++;
  const topId = `pathtext-top-${id}`;
  const bottomId = `pathtext-bottom-${id}`;
  const fontSize = size * PATH_TEXT_FONT_SIZE_RATIO;
  const textColor = getSafeTextColor(fillColor, 'PathText');

  return (
    <>
      <Defs>
        {topText && <Path id={topId} d={contour.textPathTop} fill="none" />}
        {bottomText && <Path id={bottomId} d={contour.textPathBottom} fill="none" />}
      </Defs>
      {topText && (
        <Text
          fill={textColor}
          fillOpacity={PATH_TEXT_OPACITY}
          fontSize={fontSize}
          fontFamily={fontFamily}
        >
          <TextPath href={`#${topId}`} startOffset="50%" textAnchor="middle">
            {topText}
          </TextPath>
        </Text>
      )}
      {bottomText && (
        <Text
          fill={textColor}
          fillOpacity={PATH_TEXT_OPACITY}
          fontSize={fontSize}
          fontFamily={fontFamily}
        >
          <TextPath href={`#${bottomId}`} startOffset="50%" textAnchor="middle">
            {bottomText}
          </TextPath>
        </Text>
      )}
    </>
  );
}
