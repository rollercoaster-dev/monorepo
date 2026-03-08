/**
 * BadgeRenderer — renders a full badge from a BadgeDesign configuration.
 *
 * Composes six layers (bottom to top):
 * 1. Shadow layer — solid black duplicate of the shape, offset down-right
 * 2. Shape layer — filled background shape with thick border
 * 3. Frame overlay — decorative frame band (boldBorder, guilloche, etc.)
 * 4. PathText — coin-style inscriptions following the shape contour
 * 5. Center layer — monogram text (centerMode: 'monogram') OR Phosphor icon
 *    (centerMode: 'icon'); optional CenterLabel below
 * 6. Banner — neo-brutalist ribbon overlay with text
 *
 * The icon color is auto-calculated for WCAG AA contrast against the shape
 * fill color using the existing accessibility utility.
 *
 * Theme variants are respected:
 *  - highContrast / lowVision: thicker borders, no shadow
 *  - autismFriendly: no shadow
 */

import React, { useMemo, useId } from 'react';
import Svg, { G, Path } from 'react-native-svg';
import { useUnistyles } from 'react-native-unistyles';
import type { IconWeight } from 'phosphor-react-native';

import type { BadgeDesign } from './types';
import { generateShapePath } from './shapes/paths';
import { FRAME_BAND_RATIO } from './shapes/contours';
import { FrameOverlay } from './frames/FrameOverlay';
import { PathText } from './text/PathText';
import { Banner } from './text/Banner';
import { MonogramCenter } from './text/MonogramCenter';
import { CenterLabel } from './text/CenterLabel';
import { getIconComponent } from './iconRegistry';
import { getSafeTextColor } from '../utils/accessibility';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BadgeRendererProps {
  /** Badge design configuration to render */
  design: BadgeDesign;
  /** Rendering size in logical pixels. Default 256. */
  size?: number;
  /** Override shadow visibility (default: derived from theme) */
  showShadow?: boolean;
  /** Test ID for testing */
  testID?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Shadow offset in logical pixels (down-right) */
const SHADOW_OFFSET = 5;

/** Icon size as a fraction of badge size */
const ICON_SIZE_RATIO = 0.45;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BadgeRenderer({
  design,
  size = 256,
  showShadow: showShadowProp,
  testID = 'badge-renderer',
}: BadgeRendererProps) {
  const { theme } = useUnistyles();
  const pathTextId = useId();

  // Derive shadow visibility from theme when not explicitly set
  const hasShadow = showShadowProp ?? theme.shadows.opacity > 0;

  // High contrast / lowVision: thicker borders (autismFriendly also has opacity 0 but is NOT high contrast)
  const isHighContrast = theme.variant === 'highContrast' || theme.variant === 'lowVision';
  const strokeWidth = isHighContrast ? 4 : 3;

  // Inset shapes by half the stroke width so the stroke doesn't clip
  const inset = strokeWidth / 2;
  const innerInset = inset + size * FRAME_BAND_RATIO;

  // Expand the SVG to include shadow offset so badge doesn't scale down
  const totalSize = size + (hasShadow ? SHADOW_OFFSET : 0);

  // Generate the shape path
  const pathD = useMemo(
    () => generateShapePath(design.shape, size, inset),
    [design.shape, size, inset],
  );

  // Calculate icon color for WCAG AA contrast against fill
  const iconColor = useMemo(
    () => getSafeTextColor(design.color, 'BadgeRenderer'),
    [design.color],
  );

  // Icon sizing — centered at ~45% of badge diameter
  const iconSize = Math.round(size * ICON_SIZE_RATIO);
  const iconOffset = (size - iconSize) / 2;

  // Resolve icon component
  const IconComponent = getIconComponent(design.iconName);

  return (
    <Svg
      width={totalSize}
      height={totalSize}
      viewBox={`0 0 ${totalSize} ${totalSize}`}
      accessibilityRole="image"
      accessibilityLabel={`${design.title} badge, ${design.shape} shape`}
      testID={testID}
    >
      {/* Layer 1: Shadow — solid black duplicate offset down-right */}
      {hasShadow && (
        <Path
          d={pathD}
          fill="#000000"
          strokeLinejoin="round"
          translateX={SHADOW_OFFSET}
          translateY={SHADOW_OFFSET}
        />
      )}

      {/* Layer 2: Shape — filled background with border */}
      <Path
        d={pathD}
        fill={design.color}
        stroke={theme.colors.border}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />

      {/* Layer 3: Frame overlay */}
      <FrameOverlay
        frame={design.frame}
        shape={design.shape}
        size={size}
        inset={inset}
        innerInset={innerInset}
        params={design.frameParams}
        strokeColor={theme.colors.border}
      />

      {/* Layer 4: PathText — coin-style inscriptions along shape contour */}
      <PathText
        pathText={design.pathText}
        pathTextBottom={design.pathTextBottom}
        pathTextPosition={design.pathTextPosition}
        shape={design.shape}
        size={size}
        fillColor={design.color}
        inset={innerInset}
        fontFamily={theme.fontFamily.mono}
        instanceId={pathTextId}
      />

      {/* Layer 5: Center content — monogram OR icon */}
      {design.centerMode === 'monogram' && design.monogram?.trim() ? (
        <MonogramCenter
          monogram={design.monogram}
          size={size}
          fillColor={design.color}
          fontFamily={theme.fontFamily.headline}
        />
      ) : (
        IconComponent && (
          <G x={iconOffset} y={iconOffset}>
            <IconComponent
              size={iconSize}
              weight={(design.iconWeight ?? 'regular') as IconWeight}
              color={iconColor}
            />
          </G>
        )
      )}

      {/* Layer 5b: CenterLabel — optional label below center content */}
      <CenterLabel
        label={design.centerLabel}
        size={size}
        fillColor={design.color}
        centerContentSize={iconSize}
        fontFamily={theme.fontFamily.body}
      />

      {/* Layer 6: Banner — neo-brutalist ribbon overlay */}
      <Banner
        banner={design.banner}
        size={size}
        badgeColor={design.color}
        borderColor={theme.colors.border}
        fontFamily={theme.fontFamily.mono}
        showShadow={hasShadow}
      />
    </Svg>
  );
}
