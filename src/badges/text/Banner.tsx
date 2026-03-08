import React from 'react';
import { Rect, Text } from 'react-native-svg';
import type { BannerData } from '../types';
import { getSafeTextColor } from '../../utils/accessibility';
import { fontFamily as fontFamilyTokens } from '../../themes/tokens';

export interface BannerProps {
  banner: BannerData | undefined;
  size: number;
  badgeColor: string;
  /** Border/shadow color. Callers should pass theme.colors.border. */
  borderColor?: string;
  /** Font family for banner text. Callers should pass theme.fontFamily.mono for a11y variant support. */
  fontFamily?: string;
  /** Whether to show the hard shadow. When false (e.g. highContrast themes), shadow rect is omitted. Default true. */
  showShadow?: boolean;
}

/** Banner height as fraction of badge size */
export const BANNER_HEIGHT_RATIO = 0.18;

/** Banner width as fraction of badge size */
export const BANNER_WIDTH_RATIO = 0.80;

/** Hard shadow offset in pixels (neo-brutalist) */
export const BANNER_SHADOW_OFFSET = 2;

/** Y-center ratio for 'center' position */
export const BANNER_CENTER_Y_RATIO = 0.42;

/** Y-center ratio for 'bottom' position */
export const BANNER_BOTTOM_Y_RATIO = 0.75;

/** Font size as fraction of badge size */
export const BANNER_FONT_SIZE_RATIO = 0.10;

/** Border width for the banner rect */
export const BANNER_BORDER_WIDTH = 2;

const DEFAULT_BORDER_COLOR = '#000000';

export function Banner({
  banner,
  size,
  badgeColor,
  borderColor = DEFAULT_BORDER_COLOR,
  fontFamily = fontFamilyTokens.mono,
  showShadow = true,
}: BannerProps): React.ReactElement | null {
  if (!banner || !banner.text || banner.text.trim().length === 0) return null;

  const bannerW = size * BANNER_WIDTH_RATIO;
  const bannerH = size * BANNER_HEIGHT_RATIO;
  const bannerX = (size - bannerW) / 2;
  const yRatio = banner.position === 'bottom' ? BANNER_BOTTOM_Y_RATIO : BANNER_CENTER_Y_RATIO;
  const bannerY = size * yRatio - bannerH / 2;

  const bannerFill = getSafeTextColor(badgeColor, 'Banner:fill');
  const textFill = getSafeTextColor(bannerFill, 'Banner:text');
  const fontSize = size * BANNER_FONT_SIZE_RATIO;

  return (
    <>
      {/* Shadow layer — hard shadow, no border radius; hidden in no-shadow themes */}
      {showShadow && (
        <Rect
          x={bannerX + BANNER_SHADOW_OFFSET}
          y={bannerY + BANNER_SHADOW_OFFSET}
          width={bannerW}
          height={bannerH}
          fill="#000000"
        />
      )}
      {/* Banner rect — solid fill, hard border, no border radius */}
      <Rect
        x={bannerX}
        y={bannerY}
        width={bannerW}
        height={bannerH}
        fill={bannerFill}
        stroke={borderColor}
        strokeWidth={BANNER_BORDER_WIDTH}
      />
      {/* Banner text — centered */}
      <Text
        x={size / 2}
        y={bannerY + bannerH / 2}
        textAnchor="middle"
        alignmentBaseline="central"
        fill={textFill}
        fontSize={fontSize}
        fontFamily={fontFamily}
      >
        {banner.text.trim()}
      </Text>
    </>
  );
}
