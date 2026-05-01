/**
 * Logic-only invariant test matrix for `getBadgeLayoutBoxes`.
 *
 * Generates the cartesian product of all design permutations and asserts
 * centering, containment, and non-overlap invariants per case — without
 * rendering any SVG. Intended to catch regressions across all ~432 badge
 * permutations cheaply (target: full matrix < 2s).
 *
 * The allow-list in `_geometryHelpers.ts` documents the intentional layer
 * stacking (frame overlays shape, path text rides the frame band, etc.).
 *
 * Edge-case tests live at the bottom — they are NOT part of the matrix to
 * keep the matrix permutations bounded.
 */

import {
  BadgeCenterMode,
  BadgeFrame,
  BadgeShape,
  BannerPosition,
  PathTextPosition,
  type BadgeDesign,
} from "../types";
import { getBadgeLayoutBoxes } from "../layoutBoxes";
import {
  boxIsInside,
  boxesOverlap,
  cartesian,
  collectBoxes,
  forEachBox,
  forEachPair,
  isAllowedOverlap,
} from "./_geometryHelpers";

const SHAPES = Object.values(BadgeShape);
const FRAMES = Object.values(BadgeFrame);
const CENTER_MODES = Object.values(BadgeCenterMode);
const PATH_POSITIONS = [...Object.values(PathTextPosition), undefined] as const;
const BANNER_POSITIONS = [...Object.values(BannerPosition), undefined] as const;
const SIZES = [80, 200, 400] as const;
const BOTTOM_LABEL_FLAGS = [false, true] as const;

type MatrixRow = {
  shape: (typeof SHAPES)[number];
  frame: (typeof FRAMES)[number];
  centerMode: (typeof CENTER_MODES)[number];
  pathTextPosition: (typeof PATH_POSITIONS)[number];
  bannerPosition: (typeof BANNER_POSITIONS)[number];
  hasBottomLabel: (typeof BOTTOM_LABEL_FLAGS)[number];
  size: (typeof SIZES)[number];
};

const matrix: MatrixRow[] = cartesian({
  shape: SHAPES,
  frame: FRAMES,
  centerMode: CENTER_MODES,
  pathTextPosition: PATH_POSITIONS,
  bannerPosition: BANNER_POSITIONS,
  hasBottomLabel: BOTTOM_LABEL_FLAGS,
  size: SIZES,
});

function buildDesign(row: MatrixRow): BadgeDesign {
  return {
    shape: row.shape,
    frame: row.frame,
    color: "#a78bfa",
    iconName: "Trophy",
    iconWeight: "regular",
    title: "Test Badge",
    centerMode: row.centerMode,
    monogram: row.centerMode === "monogram" ? "AB" : undefined,
    pathText: row.pathTextPosition ? "TOP TEXT" : undefined,
    pathTextBottom: row.pathTextPosition ? "BOTTOM TEXT" : undefined,
    pathTextPosition: row.pathTextPosition,
    banner: row.bannerPosition
      ? { text: "ELITE", position: row.bannerPosition }
      : undefined,
    bottomLabel: row.hasBottomLabel ? "Expert" : undefined,
  };
}

function describeRow(row: MatrixRow): string {
  return [
    row.shape,
    row.frame,
    row.centerMode,
    `path:${row.pathTextPosition ?? "none"}`,
    `banner:${row.bannerPosition ?? "none"}`,
    `bottomLabel:${row.hasBottomLabel ? "on" : "off"}`,
    `size:${row.size}`,
  ].join("/");
}

describe("badge layout invariants — full matrix", () => {
  it(`covers ${matrix.length} permutations`, () => {
    // Sanity-check that the matrix shape is what we expect, so an accidental
    // axis change shows up as a clearly-failing first test rather than a
    // surprise wall of failures further down.
    const expected =
      SHAPES.length *
      FRAMES.length *
      CENTER_MODES.length *
      PATH_POSITIONS.length *
      BANNER_POSITIONS.length *
      BOTTOM_LABEL_FLAGS.length *
      SIZES.length;
    expect(matrix.length).toBe(expected);
  });

  test.each(matrix.map((row) => [describeRow(row), row] as const))(
    "%s",
    (_label, row) => {
      const design = buildDesign(row);
      const boxes = getBadgeLayoutBoxes(design, row.size);
      const label = describeRow(row);

      // --- Centering ---
      expect(boxes.iconOrMonogram.cx).toBeCloseTo(row.size / 2, 1);
      expect(boxes.iconOrMonogram.cy).toBeCloseTo(boxes.metrics.centerY, 5);

      // --- Containment ---
      forEachBox(boxes, ({ name, box }) => {
        if (!boxIsInside(box, boxes.viewBox)) {
          throw new Error(
            `[${label}] ${name} is not inside viewBox.\n` +
              `  ${name} = ${JSON.stringify(box)}\n` +
              `  viewBox = ${JSON.stringify(boxes.viewBox)}`,
          );
        }
      });

      // --- Non-overlap (with allow-list) ---
      forEachPair(boxes, (a, b) => {
        if (isAllowedOverlap(a.name, b.name)) return;
        if (boxesOverlap(a.box, b.box)) {
          throw new Error(
            `[${label}] unexpected overlap: ${a.name} ↔ ${b.name}\n` +
              `  ${a.name} = ${JSON.stringify(a.box)}\n` +
              `  ${b.name} = ${JSON.stringify(b.box)}`,
          );
        }
      });

      // --- Bottom label sits below the shape with margin > 0 ---
      if (boxes.bottomLabel) {
        expect(boxes.bottomLabel.y).toBeGreaterThan(
          boxes.shape.y + boxes.shape.h,
        );
      }
    },
  );
});

describe("badge layout invariants — edge cases", () => {
  // Longest legal path text on top + longest on bottom, simultaneously.
  test.each(SHAPES)(
    "long top + long bottom path text simultaneously (%s)",
    (shape) => {
      const design: BadgeDesign = {
        shape,
        frame: "boldBorder",
        color: "#a78bfa",
        iconName: "Trophy",
        iconWeight: "regular",
        title: "Test Badge",
        centerMode: "icon",
        pathText: "VERY LONG TOP INSCRIPTION FOR PATH",
        pathTextBottom: "VERY LONG BOTTOM INSCRIPTION FOR PATH",
        pathTextPosition: "both",
      };
      const boxes = getBadgeLayoutBoxes(design, 200);
      forEachBox(boxes, ({ name, box }) => {
        expect({
          name,
          inside: boxIsInside(box, boxes.viewBox),
        }).toEqual({ name, inside: true });
      });
    },
  );

  // 3-character monogram at the smallest legal size — exercises the monogram
  // font-size pipeline at the most cramped end of the spectrum.
  test.each(SHAPES)("3-char monogram at smallest size (%s)", (shape) => {
    const design: BadgeDesign = {
      shape,
      frame: "none",
      color: "#a78bfa",
      iconName: "Trophy",
      iconWeight: "regular",
      title: "Test Badge",
      centerMode: "monogram",
      monogram: "ABC",
    };
    const boxes = getBadgeLayoutBoxes(design, 80);
    expect(boxes.iconOrMonogram.cx).toBeCloseTo(40, 1);
    expect(boxes.iconOrMonogram.size).toBeGreaterThan(0);
    expect(
      boxIsInside(
        {
          x: boxes.iconOrMonogram.cx - boxes.iconOrMonogram.size / 2,
          y: boxes.iconOrMonogram.cy - boxes.iconOrMonogram.size / 2,
          w: boxes.iconOrMonogram.size,
          h: boxes.iconOrMonogram.size,
        },
        boxes.viewBox,
      ),
    ).toBe(true);
  });

  // Banner with the longest legal text on every shape, in both positions.
  describe("long banner text on each shape", () => {
    const cases = cartesian({
      shape: SHAPES,
      position: Object.values(BannerPosition),
    });

    test.each(cases.map((c) => [`${c.shape}/${c.position}`, c] as const))(
      "%s",
      (_label, { shape, position }) => {
        const design: BadgeDesign = {
          shape,
          frame: "boldBorder",
          color: "#a78bfa",
          iconName: "Trophy",
          iconWeight: "regular",
          title: "Test Badge",
          centerMode: "icon",
          banner: { text: "MAXIMUM ELITE", position },
        };
        const boxes = getBadgeLayoutBoxes(design, 200);
        expect(boxes.banner).not.toBeNull();
        // Banner stays inside the viewBox (which expands to accommodate it).
        expect(boxIsInside(boxes.banner!, boxes.viewBox)).toBe(true);
        // The banner box approximation captures all named layers — verify the
        // collector includes it once and only once.
        const named = collectBoxes(boxes);
        expect(named.filter((n) => n.name === "banner")).toHaveLength(1);
      },
    );
  });
});
