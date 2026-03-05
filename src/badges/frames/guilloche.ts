import React from 'react';
import { Path } from 'react-native-svg';
import type { BadgeShape } from '../types';
import type { FrameGenerator } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A sampled point on the shape contour with outward-facing normal */
export type SamplePoint = { x: number; y: number; nx: number; ny: number };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_STROKE_COLOR = '#000000';

/** Sample points per wave cycle — enough for smooth Catmull-Rom interpolation */
export const POINTS_PER_WAVE = 24;

/** Amplitude as a fraction of the full frame band width (innerInset − inset) */
export const AMPLITUDE_RATIO = 0.35;

/** Dense sample count for arc-length re-parameterization */
const ARC_LENGTH_DENSITY = 1000;

/** Stroke width for guilloche wave paths */
export const WAVE_STROKE_WIDTH = 1.0;

/** Opacity for guilloche wave paths — slight transparency emphasizes interlocking */
export const WAVE_OPACITY = 0.85;

// ---------------------------------------------------------------------------
// Contour samplers
// ---------------------------------------------------------------------------

function sampleCircle(size: number, inset: number, n: number): SamplePoint[] {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - inset;
  const pts: SamplePoint[] = [];
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    pts.push({ x: cx + r * cos, y: cy + r * sin, nx: cos, ny: sin });
  }
  return pts;
}

/**
 * Sample n points at equal arc-length intervals along a closed polyline.
 * Computes outward-facing normals perpendicular to each edge.
 */
function samplePolylineContour(
  verts: { x: number; y: number }[],
  cx: number,
  cy: number,
  n: number,
): SamplePoint[] {
  const sides = verts.length;

  // Compute edge vectors and total perimeter
  const edges: { dx: number; dy: number; len: number }[] = [];
  let perimeter = 0;
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides;
    const dx = verts[next].x - verts[i].x;
    const dy = verts[next].y - verts[i].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    edges.push({ dx, dy, len });
    perimeter += len;
  }

  // Sample n points at equal arc-length intervals
  const pts: SamplePoint[] = [];
  for (let i = 0; i < n; i++) {
    const target = (perimeter * i) / n;
    let cumulative = 0;
    for (let e = 0; e < sides; e++) {
      const edge = edges[e];
      // Fallback to last edge on floating-point accumulation overshoot
      if (cumulative + edge.len > target || e === sides - 1) {
        const t = (target - cumulative) / edge.len;
        const x = verts[e].x + edge.dx * t;
        const y = verts[e].y + edge.dy * t;
        // Normal perpendicular to edge, ensure outward via dot product with center offset
        const enx = -edge.dy / edge.len;
        const eny = edge.dx / edge.len;
        const dot = enx * (x - cx) + eny * (y - cy);
        const sign = dot >= 0 ? 1 : -1;
        pts.push({ x, y, nx: enx * sign, ny: eny * sign });
        break;
      }
      cumulative += edge.len;
    }
  }
  return pts;
}

function sampleRegularPolygon(
  cx: number,
  cy: number,
  r: number,
  sides: number,
  angleOffset: number,
  n: number,
): SamplePoint[] {
  const verts: { x: number; y: number }[] = [];
  for (let i = 0; i < sides; i++) {
    const a = angleOffset + (2 * Math.PI * i) / sides;
    verts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return samplePolylineContour(verts, cx, cy, n);
}

function sampleHexagon(size: number, inset: number, n: number): SamplePoint[] {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - inset;
  return sampleRegularPolygon(cx, cy, r, 6, -Math.PI / 6, n);
}

function sampleDiamond(size: number, inset: number, n: number): SamplePoint[] {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - inset;
  return sampleRegularPolygon(cx, cy, r, 4, -Math.PI / 2, n);
}

function sampleStar(size: number, inset: number, n: number): SamplePoint[] {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - inset;
  const innerR = outerR * 0.4;

  // 10 vertices alternating outer/inner, starting at top (-π/2)
  const verts: { x: number; y: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (2 * Math.PI * i) / 10 - Math.PI / 2;
    verts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }

  return samplePolylineContour(verts, cx, cy, n);
}

/**
 * Arc-length re-sampling for shapes defined by parametric curves.
 * Takes a dense parametric sampler and re-samples at uniform arc-length intervals.
 */
function arcLengthResample(
  denseSampler: (t: number) => { x: number; y: number },
  cx: number,
  cy: number,
  n: number,
): SamplePoint[] {
  // 1. Dense sampling
  const dense: { x: number; y: number }[] = [];
  for (let i = 0; i <= ARC_LENGTH_DENSITY; i++) {
    dense.push(denseSampler(i / ARC_LENGTH_DENSITY));
  }

  // 2. Compute cumulative arc length
  const cumLen: number[] = [0];
  for (let i = 1; i < dense.length; i++) {
    const dx = dense[i].x - dense[i - 1].x;
    const dy = dense[i].y - dense[i - 1].y;
    cumLen.push(cumLen[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  const totalLen = cumLen[cumLen.length - 1];

  // 3. Re-sample at uniform arc-length intervals
  // denseIdx is not reset per iteration because targetLen increases monotonically
  const pts: SamplePoint[] = [];
  let denseIdx = 0;
  for (let i = 0; i < n; i++) {
    const targetLen = (totalLen * i) / n;
    while (denseIdx < cumLen.length - 2 && cumLen[denseIdx + 1] < targetLen) {
      denseIdx++;
    }
    const segLen = cumLen[denseIdx + 1] - cumLen[denseIdx];
    const t = segLen > 0 ? (targetLen - cumLen[denseIdx]) / segLen : 0;
    const x = dense[denseIdx].x + (dense[denseIdx + 1].x - dense[denseIdx].x) * t;
    const y = dense[denseIdx].y + (dense[denseIdx + 1].y - dense[denseIdx].y) * t;

    // Approximate tangent from neighboring dense samples
    const prev = Math.max(0, denseIdx - 1);
    const next = Math.min(dense.length - 1, denseIdx + 1);
    const tx = dense[next].x - dense[prev].x;
    const ty = dense[next].y - dense[prev].y;
    const tLen = Math.sqrt(tx * tx + ty * ty) || 1;
    // Normal perpendicular to tangent, ensure outward
    let nx = -ty / tLen;
    let ny = tx / tLen;
    const dot = nx * (x - cx) + ny * (y - cy);
    if (dot < 0) {
      nx = -nx;
      ny = -ny;
    }
    pts.push({ x, y, nx, ny });
  }
  return pts;
}

/**
 * Factory for the shield dense parametric sampler.
 * Shared by sampleShield (arc-length resampling) and guillocheVariants (corner detection).
 */
export function makeShieldSampler(
  size: number,
  inset: number,
): (t: number) => { x: number; y: number } {
  const l = inset;
  const right = size - inset;
  const top = inset;
  const bottom = size - inset;
  const w = right - l;
  const h = bottom - top;
  const shoulderY = top + h * 0.1;
  const waistY = top + h * 0.55;
  const cx = l + w / 2;

  return (param: number) => {
    const seg = param * 7;
    const s = seg % 1;
    if (seg < 1) {
      const x0 = l + w * 0.075;
      const x1 = l + w * 0.925;
      return { x: x0 + (x1 - x0) * s, y: top };
    } else if (seg < 2) {
      const u = 1 - s;
      return {
        x: u * u * (l + w * 0.925) + 2 * u * s * right + s * s * right,
        y: u * u * top + 2 * u * s * top + s * s * shoulderY,
      };
    } else if (seg < 3) {
      return { x: right, y: shoulderY + (waistY - shoulderY) * s };
    } else if (seg < 4) {
      const u = 1 - s;
      return {
        x: u * u * right + 2 * u * s * right + s * s * cx,
        y: u * u * waistY + 2 * u * s * (bottom - h * 0.15) + s * s * bottom,
      };
    } else if (seg < 5) {
      const u = 1 - s;
      return {
        x: u * u * cx + 2 * u * s * l + s * s * l,
        y: u * u * bottom + 2 * u * s * (bottom - h * 0.15) + s * s * waistY,
      };
    } else if (seg < 6) {
      return { x: l, y: waistY + (shoulderY - waistY) * s };
    } else {
      const u = 1 - s;
      return {
        x: u * u * l + 2 * u * s * l + s * s * (l + w * 0.075),
        y: u * u * shoulderY + 2 * u * s * top + s * s * top,
      };
    }
  };
}

function sampleShield(size: number, inset: number, n: number): SamplePoint[] {
  const l = inset;
  const w = size - inset * 2;
  const h = size - inset * 2;
  return arcLengthResample(makeShieldSampler(size, inset), l + w / 2, inset + h / 2, n);
}

/**
 * Factory for the rounded-rect dense parametric sampler.
 * Shared by sampleRoundedRect (arc-length resampling) and guillocheVariants (corner detection).
 */
export function makeRoundedRectSampler(
  size: number,
  inset: number,
): (t: number) => { x: number; y: number } {
  const left = inset;
  const top = inset;
  const w = size - inset * 2;
  const h = size - inset * 2;
  const cr = Math.min(w, h) * 0.12;

  return (param: number) => {
    const seg = param * 8;
    const s = seg % 1;
    if (seg < 1) {
      return { x: left + cr + (w - 2 * cr) * s, y: top };
    } else if (seg < 2) {
      const a = -Math.PI / 2 + (Math.PI / 2) * s;
      return { x: left + w - cr + cr * Math.cos(a), y: top + cr + cr * Math.sin(a) };
    } else if (seg < 3) {
      return { x: left + w, y: top + cr + (h - 2 * cr) * s };
    } else if (seg < 4) {
      const a = (Math.PI / 2) * s;
      return { x: left + w - cr + cr * Math.cos(a), y: top + h - cr + cr * Math.sin(a) };
    } else if (seg < 5) {
      return { x: left + w - cr - (w - 2 * cr) * s, y: top + h };
    } else if (seg < 6) {
      const a = Math.PI / 2 + (Math.PI / 2) * s;
      return { x: left + cr + cr * Math.cos(a), y: top + h - cr + cr * Math.sin(a) };
    } else if (seg < 7) {
      return { x: left, y: top + h - cr - (h - 2 * cr) * s };
    } else {
      const a = Math.PI + (Math.PI / 2) * s;
      return { x: left + cr + cr * Math.cos(a), y: top + cr + cr * Math.sin(a) };
    }
  };
}

function sampleRoundedRect(size: number, inset: number, n: number): SamplePoint[] {
  const w = size - inset * 2;
  const h = size - inset * 2;
  return arcLengthResample(makeRoundedRectSampler(size, inset), inset + w / 2, inset + h / 2, n);
}

/** Dispatch to shape-specific sampler */
export function sampleShapeContour(shape: BadgeShape, size: number, inset: number, n: number): SamplePoint[] {
  switch (shape) {
    case 'circle':
      return sampleCircle(size, inset, n);
    case 'hexagon':
      return sampleHexagon(size, inset, n);
    case 'diamond':
      return sampleDiamond(size, inset, n);
    case 'star':
      return sampleStar(size, inset, n);
    case 'shield':
      return sampleShield(size, inset, n);
    case 'roundedRect':
      return sampleRoundedRect(size, inset, n);
    default: {
      const _exhaustive: never = shape;
      throw new Error(`Unknown badge shape: ${_exhaustive}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Sine wave path builder
// ---------------------------------------------------------------------------

/**
 * Convert 4 sequential Catmull-Rom points to cubic bezier control points.
 * Uses uniform Catmull-Rom with tension = 1/6.
 * Returns [cp1, cp2] for the segment between p1 and p2.
 */
export function catmullRomToCubic(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
): [{ x: number; y: number }, { x: number; y: number }] {
  const t = 1 / 6;
  return [
    { x: p1.x + (p2.x - p0.x) * t, y: p1.y + (p2.y - p0.y) * t },
    { x: p2.x - (p3.x - p1.x) * t, y: p2.y - (p3.y - p1.y) * t },
  ];
}

/**
 * Build two closed SVG paths (wave + anti-phase wave) from contour samples.
 * Exploits sin(t + π) = -sin(t) to compute both waves in a single pass.
 */
export function buildWavePaths(
  samples: SamplePoint[],
  waveCount: number,
  amplitude: number,
): [string, string] {
  const n = samples.length;

  // Compute offset points for both waves in a single pass
  const wave1Pts: { x: number; y: number }[] = new Array(n);
  const wave2Pts: { x: number; y: number }[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const pt = samples[i];
    const t = (2 * Math.PI * waveCount * i) / n;
    const offset = Math.sin(t) * amplitude;
    wave1Pts[i] = { x: pt.x + pt.nx * offset, y: pt.y + pt.ny * offset };
    // sin(t + π) = -sin(t), so anti-phase wave uses negated offset
    wave2Pts[i] = { x: pt.x - pt.nx * offset, y: pt.y - pt.ny * offset };
  }

  return [buildPathFromPoints(wave1Pts), buildPathFromPoints(wave2Pts)];
}

/** Build a closed SVG path string from offset points using Catmull-Rom smoothing */
export function buildPathFromPoints(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  if (n < 3) return '';
  const commands: string[] = new Array(n + 2);
  commands[0] = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;

  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const [cp1, cp2] = catmullRomToCubic(p0, p1, p2, p3);
    commands[i + 1] =
      `C ${cp1.x.toFixed(2)} ${cp1.y.toFixed(2)} ${cp2.x.toFixed(2)} ${cp2.y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  commands[n + 1] = 'Z';
  return commands.join(' ');
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/**
 * Guilloche frame: two interlocking sine waves following the badge shape contour.
 *
 * Wave count scales with stepCount (3–14). A second wave at anti-phase
 * creates the classic currency-style interlocking pattern.
 */
export const guillocheGenerator: FrameGenerator = ({
  shape,
  size,
  inset,
  innerInset,
  params,
  strokeColor = DEFAULT_STROKE_COLOR,
}) => {
  if (innerInset <= inset) {
    if (__DEV__) {
      console.warn(
        '[guillocheGenerator] Degenerate geometry: innerInset ' +
          `(${innerInset}) <= inset (${inset}). Frame skipped.`,
      );
    }
    return null;
  }

  const waveCount = Math.max(3, Math.min(14, Math.round(params.stepCount * 1.5)));
  const bandMidInset = (inset + innerInset) / 2;
  const amplitude = (innerInset - inset) * AMPLITUDE_RATIO;
  const n = waveCount * POINTS_PER_WAVE;

  const samples = sampleShapeContour(shape, size, bandMidInset, n);
  const [wave1, wave2] = buildWavePaths(samples, waveCount, amplitude);

  const pathProps = {
    fill: 'none' as const,
    stroke: strokeColor,
    strokeWidth: WAVE_STROKE_WIDTH,
    opacity: WAVE_OPACITY,
  };

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(Path, { key: 'guilloche-0', d: wave1, ...pathProps }),
    React.createElement(Path, { key: 'guilloche-1', d: wave2, ...pathProps }),
  );
};
