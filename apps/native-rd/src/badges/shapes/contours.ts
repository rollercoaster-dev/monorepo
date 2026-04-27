/**
 * Shape contour system for frame and text geometry.
 *
 * Extends shape path generators with inset paths (frame band boundaries),
 * open-arc text paths (for SVG textPath inscriptions), and vertex positions
 * (for rosette/element placement).
 */

import type { BadgeShape } from "../types";
import {
  circlePath,
  shieldPath,
  hexagonPath,
  roundedRectPath,
  starPath,
  diamondPath,
} from "./paths";
import { measureTextWidth } from "../text/measureTextWidth";

/**
 * Optional text-aware sizing inputs for arc generation. When provided,
 * the top/bottom inscription arcs span an angular range sized to the
 * text width, centered on the badge's vertical axis. When omitted, both
 * arcs default to half-circles (legacy behavior — preserves existing
 * non-text callers like rosette frame generation and unit tests).
 */
export type ContourTextOpts = {
  topText?: string;
  bottomText?: string;
  fontSize?: number;
};

/** Maximum arc sweep — keeps long text from wrapping the full half-circle. */
const MAX_ARC_ANGLE = 0.9 * Math.PI;

/** Geometry metadata for a badge shape, used by frame overlays and text-on-path. */
export type ShapeContour = {
  outerPath: string;
  innerPath: string;
  textPathTop: string;
  textPathBottom: string;
  vertices: { x: number; y: number }[];
};

/** Frame band width as a fraction of badge size. */
export const FRAME_BAND_RATIO = 0.12;

/** Default text arc center Y ratios — top arc raised, bottom arc lowered. */
const TEXT_ARC_TOP_CY_RATIO = 0.8;
const TEXT_ARC_BOTTOM_CY_RATIO = 1.1;

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Generate an open arc (no Z) from right to left across the top half.
 * On web, textPath follows the path direction and react-native-svg does not
 * expose a reliable side flip, so the upper inscription needs its own
 * explicit upper semicircle path.
 */
function topArc(cx: number, cy: number, r: number): string {
  return `M ${cx + r} ${cy} A ${r} ${r} 0 0 1 ${cx - r} ${cy}`;
}

/**
 * Generate an open arc (no Z) from right to left across the bottom half.
 * sweep-flag=0 (CCW on screen) from right to left traces downward
 * through (cx, cy+r) — the bottom semicircle.
 */
function bottomArc(cx: number, cy: number, r: number): string {
  return `M ${cx + r} ${cy} A ${r} ${r} 0 0 0 ${cx - r} ${cy}`;
}

/**
 * Compute the angular sweep that an inscription needs along an arc of
 * radius `r`. Arc length = r × angle, so angle = textWidth / r. Clamped
 * to `MAX_ARC_ANGLE` (162°) so long text doesn't wrap onto itself, and
 * to a sensible minimum so very short text gets a readable arc rather
 * than collapsing toward zero.
 */
function arcAngleForText(text: string, fontSize: number, r: number): number {
  const width = measureTextWidth(text, fontSize);
  if (width <= 0 || r <= 0) return Math.PI; // fallback — full half-circle
  const angle = width / r;
  // Floor at 0.25π so even a single character gets a visible arc.
  return Math.min(MAX_ARC_ANGLE, Math.max(0.25 * Math.PI, angle));
}

/**
 * Top inscription arc, sized to text. Spans `angle` radians centered on
 * the top of the badge (12-o'clock). Written left-to-right so SVG textPath
 * reads naturally without needing a 180° rotation transform.
 *
 * SVG y-axis points down: top of badge = (cx, cy - r). The arc starts at
 * the LEFT end of the angular range and sweeps CCW (sweep-flag=1 in SVG's
 * y-down convention) up over the top to the RIGHT end.
 */
function topArcSized(cx: number, cy: number, r: number, angle: number): string {
  const half = angle / 2;
  // Top-center is at angle -π/2 in math convention; left end is at -π/2 - half,
  // right end at -π/2 + half. In screen (y-down), x = cx + r cos θ, y = cy + r sin θ.
  const leftX = cx + r * Math.cos(-Math.PI / 2 - half);
  const leftY = cy + r * Math.sin(-Math.PI / 2 - half);
  const rightX = cx + r * Math.cos(-Math.PI / 2 + half);
  const rightY = cy + r * Math.sin(-Math.PI / 2 + half);
  // sweep-flag=1: arc goes "the long way" = over the top from left to right.
  return `M ${leftX} ${leftY} A ${r} ${r} 0 0 1 ${rightX} ${rightY}`;
}

/**
 * Bottom inscription arc, sized to text. Spans `angle` radians centered on
 * the bottom of the badge (6-o'clock), written left-to-right so the text
 * reads correctly along the path direction.
 */
function bottomArcSized(
  cx: number,
  cy: number,
  r: number,
  angle: number,
): string {
  const half = angle / 2;
  // Bottom-center is at angle +π/2. Left end: +π/2 + half (further from top-CCW),
  // right end: +π/2 - half. We want left-to-right reading, so M = leftX,leftY.
  const leftX = cx + r * Math.cos(Math.PI / 2 + half);
  const leftY = cy + r * Math.sin(Math.PI / 2 + half);
  const rightX = cx + r * Math.cos(Math.PI / 2 - half);
  const rightY = cy + r * Math.sin(Math.PI / 2 - half);
  // sweep-flag=0: arc goes under the bottom from left to right.
  return `M ${leftX} ${leftY} A ${r} ${r} 0 0 0 ${rightX} ${rightY}`;
}

// ── Circle ─────────────────────────────────────────────────────────────

function circleContour(
  size: number,
  inset: number,
  opts?: ContourTextOpts,
): ShapeContour {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - inset;
  const innerInset = inset + size * FRAME_BAND_RATIO;
  const textR = outerR * 0.8; // text sits slightly inside outer edge

  const vertices: ShapeContour["vertices"] = [];
  const vertexR = outerR * 0.8;
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i; // 45° increments
    vertices.push({
      x: cx + vertexR * Math.cos(angle),
      y: cy + vertexR * Math.sin(angle),
    });
  }

  return {
    outerPath: circlePath(size, inset),
    innerPath: circlePath(size, innerInset),
    textPathTop: pickTopArc(cx, cy, textR, size, opts),
    textPathBottom: pickBottomArc(cx, cy, textR, size, opts),
    vertices,
  };
}

/**
 * Choose between text-sized arc (when caller supplied topText) and the
 * legacy half-circle. Centralised so each shape contour can call one helper
 * instead of repeating the conditional inline.
 */
function pickTopArc(
  cx: number,
  cy: number,
  textR: number,
  size: number,
  opts: ContourTextOpts | undefined,
  legacyCyRatio = TEXT_ARC_TOP_CY_RATIO,
): string {
  if (opts?.topText) {
    const fontSize = opts.fontSize ?? size * 0.09;
    const angle = arcAngleForText(opts.topText, fontSize, textR);
    return topArcSized(cx, cy, textR, angle);
  }
  return topArc(cx, cy * legacyCyRatio, textR);
}

function pickBottomArc(
  cx: number,
  cy: number,
  textR: number,
  size: number,
  opts: ContourTextOpts | undefined,
  legacyCyRatio = TEXT_ARC_BOTTOM_CY_RATIO,
): string {
  if (opts?.bottomText) {
    const fontSize = opts.fontSize ?? size * 0.09;
    const angle = arcAngleForText(opts.bottomText, fontSize, textR);
    return bottomArcSized(cx, cy, textR, angle);
  }
  return bottomArc(cx, cy * legacyCyRatio, textR);
}

// ── Hexagon ────────────────────────────────────────────────────────────

function hexagonContour(
  size: number,
  inset: number,
  opts?: ContourTextOpts,
): ShapeContour {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - inset;
  const innerInset = inset + size * FRAME_BAND_RATIO;
  const textR = outerR * 0.8;

  // Flat-top hexagon vertices at outer radius (same angles as hexagonPath)
  const vertices: ShapeContour["vertices"] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    vertices.push({
      x: cx + outerR * Math.cos(angle),
      y: cy + outerR * Math.sin(angle),
    });
  }

  return {
    outerPath: hexagonPath(size, inset),
    innerPath: hexagonPath(size, innerInset),
    textPathTop: pickTopArc(cx, cy, textR, size, opts),
    textPathBottom: pickBottomArc(cx, cy, textR, size, opts),
    vertices,
  };
}

// ── Diamond ────────────────────────────────────────────────────────────

function diamondContour(
  size: number,
  inset: number,
  opts?: ContourTextOpts,
): ShapeContour {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - inset;
  const innerInset = inset + size * FRAME_BAND_RATIO;
  const textR = outerR * 0.7; // tighter arc for diamond's narrow shape

  return {
    outerPath: diamondPath(size, inset),
    innerPath: diamondPath(size, innerInset),
    textPathTop: pickTopArc(cx, cy, textR, size, opts),
    textPathBottom: pickBottomArc(cx, cy, textR, size, opts),
    vertices: [
      { x: cx, y: cy - outerR }, // top
      { x: cx + outerR, y: cy }, // right
      { x: cx, y: cy + outerR }, // bottom
      { x: cx - outerR, y: cy }, // left
    ],
  };
}

// ── Star ───────────────────────────────────────────────────────────────

function starContour(
  size: number,
  inset: number,
  opts?: ContourTextOpts,
): ShapeContour {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - inset;
  const innerInset = inset + size * FRAME_BAND_RATIO;
  const textR = outerR * 1.0;

  // 5 outer tip points (even-indexed from starPath's 10-point pattern)
  const vertices: ShapeContour["vertices"] = [];
  for (let i = 0; i < 5; i++) {
    const angle = (Math.PI / 180) * (72 * i - 90); // -90° starts from top
    vertices.push({
      x: cx + outerR * Math.cos(angle),
      y: cy + outerR * Math.sin(angle),
    });
  }

  return {
    outerPath: starPath(size, inset),
    innerPath: starPath(size, innerInset),
    textPathTop: pickTopArc(cx, cy, textR, size, opts, 1.17),
    textPathBottom: pickBottomArc(cx, cy, textR, size, opts, 0.94),
    vertices,
  };
}

// ── Shield ─────────────────────────────────────────────────────────────

function shieldContour(
  size: number,
  inset: number,
  opts?: ContourTextOpts,
): ShapeContour {
  const cx = size / 2;
  const cy = size / 2;
  const innerInset = inset + size * FRAME_BAND_RATIO;

  // Match shieldPath geometry
  const l = inset;
  const r = size - inset;
  const t = inset;
  const b = size - inset;
  const h = b - t;
  const shoulderY = t + h * 0.1;

  // Text arcs: use half-width as radius, offset vertically for shield shape
  const textR = (r - l) / 2;

  return {
    outerPath: shieldPath(size, inset),
    innerPath: shieldPath(size, innerInset),
    textPathTop: pickTopArc(cx, cy, textR, size, opts),
    textPathBottom: pickBottomArc(cx, cy, textR * 0.8, size, opts),
    vertices: [
      { x: l, y: shoulderY }, // left shoulder
      { x: r, y: shoulderY }, // right shoulder
      { x: cx, y: b }, // bottom point
    ],
  };
}

// ── Rounded Rectangle ──────────────────────────────────────────────────

function roundedRectContour(
  size: number,
  inset: number,
  opts?: ContourTextOpts,
): ShapeContour {
  const cx = size / 2;
  const cy = size / 2;
  const innerInset = inset + size * FRAME_BAND_RATIO;

  const l = inset;
  const t = inset;
  const w = size - inset * 2;
  const h = size - inset * 2;
  const textR = w / 2;

  return {
    outerPath: roundedRectPath(size, inset),
    innerPath: roundedRectPath(size, innerInset),
    textPathTop: pickTopArc(cx, cy, textR, size, opts),
    textPathBottom: pickBottomArc(cx, cy, textR, size, opts),
    vertices: [
      { x: l + w * 0.25, y: t + h * 0.25 }, // top-left
      { x: l + w * 0.75, y: t + h * 0.25 }, // top-right
      { x: l + w * 0.75, y: t + h * 0.75 }, // bottom-right
      { x: l + w * 0.25, y: t + h * 0.75 }, // bottom-left
    ],
  };
}

// ── Dispatcher ─────────────────────────────────────────────────────────

const contourGenerators: Record<
  BadgeShape,
  (size: number, inset: number, opts?: ContourTextOpts) => ShapeContour
> = {
  circle: circleContour,
  shield: shieldContour,
  hexagon: hexagonContour,
  roundedRect: roundedRectContour,
  star: starContour,
  diamond: diamondContour,
};

/**
 * Generate shape contour metadata for frame overlays and text-on-path.
 *
 * @param shape - Badge shape type
 * @param size  - Bounding box dimension (square)
 * @param inset - Stroke inset (typically half stroke width)
 * @param opts  - Optional text-aware sizing inputs. When provided, the top
 *                and bottom inscription arcs are sized to the text width
 *                and centered on the badge's vertical axis. Without opts
 *                the legacy fixed half-circle arcs are returned.
 */
export function generateContour(
  shape: BadgeShape,
  size: number,
  inset: number,
  opts?: ContourTextOpts,
): ShapeContour {
  return contourGenerators[shape](size, inset, opts);
}
