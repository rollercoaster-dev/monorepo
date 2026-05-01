/**
 * Layout boxes — pure geometric description of every visible badge layer.
 *
 * `getBadgeLayoutBoxes` is the single source of truth for where each layer
 * sits in the SVG viewport. The renderer consumes it to position layers, and
 * the invariant test matrix consumes it to assert centering, containment and
 * non-overlap across hundreds of design permutations.
 *
 * Reuses existing primitives so behaviour stays identical to the renderer:
 * - getBadgeLayoutMetrics / ICON_SIZE_RATIO from ./layout
 * - FRAME_BAND_RATIO / getPathTextRadius from ./shapes/contours
 * - BANNER_* from ./text/Banner
 * - BOTTOM_LABEL_* from ./text/BottomLabel
 * - measureTextWidth from ./text/measureTextWidth
 */

import type { BadgeDesign } from "./types";
import {
  getBadgeLayoutMetrics,
  ICON_SIZE_RATIO,
  type BadgeLayoutDensity,
} from "./layout";
import { FRAME_BAND_RATIO, getPathTextRadius } from "./shapes/contours";
import {
  BANNER_HEIGHT_RATIO,
  BANNER_WIDTH_RATIO,
  BANNER_TOP_VISIBLE_RATIO,
  getBannerTopVisibleRatio,
} from "./text/Banner";
import {
  BOTTOM_LABEL_SIZE_RATIO,
  BOTTOM_LABEL_MAX_CHARS,
  getBottomLabelY,
  getBottomLabelBottomOverflow,
} from "./text/BottomLabel";
import { PATH_TEXT_FONT_SIZE_RATIO } from "./text/PathText";
import { measureTextWidth } from "./text/measureTextWidth";

/** Axis-aligned bounding box in SVG user-units. */
export type Box = { x: number; y: number; w: number; h: number };

/**
 * The icon and the monogram are both centered points with a characteristic
 * size — for the icon `size` is the rendered glyph size, for the monogram
 * it's the font size.
 */
export type CenterContent = { cx: number; cy: number; size: number };

export type LayoutBoxes = {
  /** Full SVG viewport, including shadow + banner overflow. */
  viewBox: Box;
  /** Bounding box of the inscribed badge shape (without shadow). */
  shape: Box;
  /** Frame band bounding box, or null when frame is `'none'`. */
  frame: Box | null;
  /** Center icon or monogram. */
  iconOrMonogram: CenterContent;
  /** Top-arc path text band (null when not visible). */
  pathTextTop: Box | null;
  /** Bottom-arc path text band (null when not visible). */
  pathTextBottom: Box | null;
  /** Banner ribbon (null when no banner text). */
  banner: Box | null;
  /** Bottom label below the badge (null when empty). */
  bottomLabel: Box | null;
  /** Resolved layout density — exposed for tests asserting density transitions. */
  density: BadgeLayoutDensity;
};

/** Renderer-default stroke width (matches BadgeRenderer's non-highContrast path). */
export const DEFAULT_STROKE_WIDTH = 3;

/** Renderer-default shadow offset, matches BadgeRenderer.SHADOW_OFFSET. */
export const SHADOW_OFFSET = 5;

const STAR_BOTTOM_LABEL_EXTRA_OFFSET_RATIO = 0.18;

export type LayoutBoxesOptions = {
  /** Stroke width used for the shape border. Default 3 (renderer default). */
  strokeWidth?: number;
  /** Whether the badge renders with a hard shadow. Default true. */
  hasShadow?: boolean;
};

function hasVisibleBanner(design: BadgeDesign): boolean {
  return Boolean(design.banner?.text?.trim());
}

function hasTopText(design: BadgeDesign): boolean {
  const position = design.pathTextPosition ?? "top";
  return (
    (position === "top" || position === "both") &&
    Boolean(design.pathText?.trim())
  );
}

function hasBottomText(design: BadgeDesign): boolean {
  const position = design.pathTextPosition ?? "top";
  return (
    (position === "bottom" || position === "both") &&
    Boolean(design.pathTextBottom?.trim())
  );
}

/**
 * Derive the geometric layout for a badge design.
 *
 * Pure function — no React, no SVG, no theme. The renderer plugs theme-derived
 * `strokeWidth` / `hasShadow` through `options`; tests use the defaults.
 */
export function getBadgeLayoutBoxes(
  design: BadgeDesign,
  size: number,
  options: LayoutBoxesOptions = {},
): LayoutBoxes {
  const strokeWidth = options.strokeWidth ?? DEFAULT_STROKE_WIDTH;
  const hasShadow = options.hasShadow ?? true;

  const inset = strokeWidth / 2;
  const innerInset = inset + size * FRAME_BAND_RATIO;

  const metrics = getBadgeLayoutMetrics(design, size, inset, innerInset);

  // ── Shape + frame ──────────────────────────────────────────────────────
  const shapeBox: Box = {
    x: inset,
    y: inset,
    w: size - inset * 2,
    h: size - inset * 2,
  };
  const frameBox: Box | null =
    design.frame === "none"
      ? null
      : {
          x: inset,
          y: inset,
          w: size - inset * 2,
          h: size - inset * 2,
        };

  // ── Icon / monogram ────────────────────────────────────────────────────
  const cx = size / 2;
  const cy = metrics.centerY;
  let iconOrMonogram: CenterContent;
  if (design.centerMode === "monogram" && design.monogram?.trim()) {
    const chars = design.monogram.trim().slice(0, 3);
    const ratioByLength = [0.35, 0.28, 0.22] as const;
    const ratio = ratioByLength[Math.min(chars.length, 3) - 1] ?? 0.35;
    const fontSize = size * ratio * metrics.centerContentScale;
    iconOrMonogram = { cx, cy, size: fontSize };
  } else {
    const iconSize = Math.round(
      size * ICON_SIZE_RATIO * metrics.centerContentScale,
    );
    iconOrMonogram = { cx, cy, size: iconSize };
  }

  // ── Path text bands ────────────────────────────────────────────────────
  const pathFontSize =
    size * PATH_TEXT_FONT_SIZE_RATIO * metrics.pathTextFontScale;
  const pathInset = metrics.pathTextInset;

  const pathTextTop: Box | null = hasTopText(design)
    ? buildPathTextBox(design, size, pathInset, pathFontSize, "top")
    : null;
  const pathTextBottom: Box | null = hasBottomText(design)
    ? buildPathTextBox(design, size, pathInset, pathFontSize, "bottom")
    : null;

  // ── Banner ─────────────────────────────────────────────────────────────
  const bannerBox: Box | null = hasVisibleBanner(design)
    ? buildBannerBox(design, size, metrics.bannerScale)
    : null;

  // ── Bottom label ───────────────────────────────────────────────────────
  const bottomLabelBox: Box | null = design.bottomLabel?.trim()
    ? buildBottomLabelBox(design, size, metrics.bottomLabelScale)
    : null;

  // ── Viewport ───────────────────────────────────────────────────────────
  const viewBox = buildViewBox({
    size,
    hasShadow,
    banner: design.banner,
    bannerScale: metrics.bannerScale,
    bottomLabelScale: metrics.bottomLabelScale,
    hasBottomLabel: Boolean(design.bottomLabel?.trim()),
    shape: design.shape,
  });

  return {
    viewBox,
    shape: shapeBox,
    frame: frameBox,
    iconOrMonogram,
    pathTextTop,
    pathTextBottom,
    banner: bannerBox,
    bottomLabel: bottomLabelBox,
    density: metrics.density,
  };
}

function buildPathTextBox(
  design: BadgeDesign,
  size: number,
  inset: number,
  fontSize: number,
  side: "top" | "bottom",
): Box {
  const r = getPathTextRadius(design.shape, size, inset, side);
  const cy = size / 2;
  // The text rides the arc with thickness ~= fontSize. We bound the band as a
  // slim horizontal strip at the arc apex (y = cy ± r), thickened by fontSize.
  // x/width is the full arc diameter — conservative, but invariant tests use
  // an explicit allow-list for pathText↔frame overlaps so this is safe.
  const apexY = side === "top" ? cy - r : cy + r;
  return {
    x: size / 2 - r,
    y: apexY - fontSize / 2,
    w: 2 * r,
    h: fontSize,
  };
}

function buildBannerBox(design: BadgeDesign, size: number, scale: number): Box {
  const banner = design.banner;
  if (!banner) return { x: 0, y: 0, w: 0, h: 0 };

  const topVisibleRatio = getBannerTopVisibleRatio(
    banner.position,
    design.shape,
  );
  const bannerW = size * BANNER_WIDTH_RATIO * scale;
  const bannerH = size * BANNER_HEIGHT_RATIO * scale;
  const bannerX = (size - bannerW) / 2;
  const bannerY =
    banner.position === "bottom"
      ? size - bannerH * topVisibleRatio
      : -bannerH * (1 - topVisibleRatio);

  return { x: bannerX, y: bannerY, w: bannerW, h: bannerH };
}

function buildBottomLabelBox(
  design: BadgeDesign,
  size: number,
  scale: number,
): Box {
  const label = (design.bottomLabel ?? "")
    .trim()
    .slice(0, BOTTOM_LABEL_MAX_CHARS);
  const fontSize = size * BOTTOM_LABEL_SIZE_RATIO * scale;
  const extraOffset =
    design.shape === "star" ? size * STAR_BOTTOM_LABEL_EXTRA_OFFSET_RATIO : 0;
  const cy = getBottomLabelY(size, scale) + extraOffset;
  const textWidth = measureTextWidth(label, fontSize);

  return {
    x: size / 2 - textWidth / 2,
    y: cy - fontSize / 2,
    w: textWidth,
    h: fontSize,
  };
}

type ViewBoxInputs = {
  size: number;
  hasShadow: boolean;
  banner: BadgeDesign["banner"];
  bannerScale: number;
  bottomLabelScale: number;
  hasBottomLabel: boolean;
  shape: BadgeDesign["shape"];
};

function buildViewBox({
  size,
  hasShadow,
  banner,
  bannerScale,
  bottomLabelScale,
  hasBottomLabel,
  shape,
}: ViewBoxInputs): Box {
  const totalWidth = size + (hasShadow ? SHADOW_OFFSET : 0);

  const bannerTopVisibleRatio = banner
    ? getBannerTopVisibleRatio(banner.position, shape)
    : BANNER_TOP_VISIBLE_RATIO;
  const bannerOverflowAmount = banner
    ? size * BANNER_HEIGHT_RATIO * bannerScale * (1 - bannerTopVisibleRatio)
    : 0;
  const bannerTopOverflow =
    banner && banner.position !== "bottom" ? bannerOverflowAmount : 0;
  const bannerBottomOverflow =
    banner && banner.position === "bottom" ? bannerOverflowAmount : 0;

  const bottomLabelExtraOffset =
    hasBottomLabel && shape === "star"
      ? size * STAR_BOTTOM_LABEL_EXTRA_OFFSET_RATIO
      : 0;
  const bottomLabelBottomOverflow = hasBottomLabel
    ? getBottomLabelBottomOverflow(size, bottomLabelScale) +
      bottomLabelExtraOffset
    : 0;

  const totalHeight =
    size +
    (hasShadow ? SHADOW_OFFSET : 0) +
    bannerTopOverflow +
    Math.max(bannerBottomOverflow, bottomLabelBottomOverflow);

  return {
    x: 0,
    y: -bannerTopOverflow,
    w: totalWidth,
    h: totalHeight,
  };
}
