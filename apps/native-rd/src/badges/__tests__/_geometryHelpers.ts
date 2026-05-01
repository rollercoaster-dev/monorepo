/**
 * Geometric helpers for the badge layout invariant test matrix.
 *
 * These are intentionally tiny pure utilities used to assert containment,
 * non-overlap, and centering across the cartesian product of badge designs.
 * They live next to the tests that use them — not in production source — so
 * the renderer never accidentally depends on test-only conventions.
 */

import type { Box, LayoutBoxes } from "../layoutBoxes";

/**
 * Boxes are treated as half-open rectangles `[x, x+w) × [y, y+h)`. Two boxes
 * touching exactly along an edge are NOT considered overlapping — useful for
 * "the bottom label sits flush below the shape" assertions.
 */
export function boxesOverlap(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

/**
 * `inner` is fully inside `outer` when its rectangle is bounded on all four
 * sides. A small floating-point tolerance is applied so that 1e-12 rounding
 * errors at the edges don't fail an otherwise correct layout.
 */
const CONTAINMENT_EPSILON = 1e-6;

export function boxIsInside(inner: Box, outer: Box): boolean {
  return (
    inner.x >= outer.x - CONTAINMENT_EPSILON &&
    inner.y >= outer.y - CONTAINMENT_EPSILON &&
    inner.x + inner.w <= outer.x + outer.w + CONTAINMENT_EPSILON &&
    inner.y + inner.h <= outer.y + outer.h + CONTAINMENT_EPSILON
  );
}

/**
 * Cartesian product over a record of arrays. Returns an array of records where
 * each record holds one combination, e.g.:
 *
 *   cartesian({ shape: ["a","b"], frame: ["1","2"] })
 *   // [{shape:"a",frame:"1"}, {shape:"a",frame:"2"}, {shape:"b",frame:"1"}, ...]
 *
 * Type system note: callers receive a record with the union of each axis's
 * element type — the runtime is fully generic.
 */
export function cartesian<T extends Record<string, readonly unknown[]>>(
  axes: T,
): Array<{ [K in keyof T]: T[K][number] }> {
  type Combo = { [K in keyof T]: T[K][number] };
  const keys = Object.keys(axes) as Array<keyof T>;

  return keys.reduce<Combo[]>(
    (acc, key) => {
      const values = axes[key];
      const next: Combo[] = [];
      for (const combo of acc) {
        for (const value of values) {
          next.push({ ...combo, [key]: value } as Combo);
        }
      }
      return next;
    },
    [{} as Combo],
  );
}

/**
 * The set of named, non-null boxes inside a `LayoutBoxes`. Notably, the
 * `iconOrMonogram` center content is converted to a small symbolic box around
 * its center point — this is an approximation but it lets the same overlap
 * machinery treat it like the other layers.
 */
export type NamedBox = { name: string; box: Box };

export function collectBoxes(boxes: LayoutBoxes): NamedBox[] {
  const out: NamedBox[] = [];
  out.push({ name: "shape", box: boxes.shape });
  if (boxes.frame) out.push({ name: "frame", box: boxes.frame });
  if (boxes.pathTextTop)
    out.push({ name: "pathTextTop", box: boxes.pathTextTop });
  if (boxes.pathTextBottom)
    out.push({ name: "pathTextBottom", box: boxes.pathTextBottom });
  if (boxes.banner) out.push({ name: "banner", box: boxes.banner });
  if (boxes.bottomLabel)
    out.push({ name: "bottomLabel", box: boxes.bottomLabel });

  // Treat the icon/monogram as a square box centered on (cx, cy) for the
  // purposes of containment + overlap checks. Size is the glyph size.
  const c = boxes.iconOrMonogram;
  out.push({
    name: "iconOrMonogram",
    box: {
      x: c.cx - c.size / 2,
      y: c.cy - c.size / 2,
      w: c.size,
      h: c.size,
    },
  });

  return out;
}

export function forEachBox(
  boxes: LayoutBoxes,
  fn: (named: NamedBox) => void,
): void {
  for (const named of collectBoxes(boxes)) fn(named);
}

export function forEachPair(
  boxes: LayoutBoxes,
  fn: (a: NamedBox, b: NamedBox) => void,
): void {
  const list = collectBoxes(boxes);
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      fn(list[i]!, list[j]!);
    }
  }
}

/**
 * Allow-listed overlaps. These are pairs that the design intentionally
 * stacks — the frame overlay sits on the shape, the path text rides the
 * frame band, the banner straddles the badge edge, and the icon/monogram
 * is inscribed inside the shape.
 *
 * Order-independent: pass either ordering of names.
 *
 * `banner ↔ bottomLabel` is allow-listed because the current layout pins
 * a bottom-positioned banner and the bottom label to the same strip below
 * the badge edge (see `layoutBoxes.ts:buildViewBox` — both contribute to
 * `Math.max(bannerOverflow.bottom, bottomLabelBottomOverflow)`). The matrix
 * pins current behaviour; tuning that collision is tracked separately
 * (see the plan: "matrix pins current behaviour first; tuning is a
 * separate concern", `2026-05-01-badge-test-system-and-field-rename.md`).
 */
const ALLOWED_OVERLAPS: ReadonlyArray<readonly [string, string]> = [
  ["frame", "shape"],
  ["pathTextTop", "frame"],
  ["pathTextBottom", "frame"],
  ["pathTextTop", "shape"],
  ["pathTextBottom", "shape"],
  ["banner", "shape"],
  ["banner", "frame"],
  ["banner", "pathTextTop"],
  ["banner", "pathTextBottom"],
  ["banner", "bottomLabel"],
  ["iconOrMonogram", "shape"],
  ["iconOrMonogram", "frame"],
];

export function isAllowedOverlap(a: string, b: string): boolean {
  return ALLOWED_OVERLAPS.some(
    ([x, y]) => (a === x && b === y) || (a === y && b === x),
  );
}
