/**
 * Badge visual design configuration
 *
 * Stored as JSON on each badge record in the Evolu database.
 * Defines the visual appearance of a badge: shape, frame, color, icon, and text.
 * See docs/vision/badge-designer.md for the full design language.
 */

/** Available badge background shapes */
export const BadgeShape = {
  circle: 'circle',
  shield: 'shield',
  hexagon: 'hexagon',
  roundedRect: 'roundedRect',
  star: 'star',
  diamond: 'diamond',
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- intentional same-name type+const pattern
export type BadgeShape = (typeof BadgeShape)[keyof typeof BadgeShape];

/** Available badge frame/border styles */
export const BadgeFrame = {
  none: 'none',
  boldBorder: 'boldBorder',
  guilloche: 'guilloche',
  crossHatch: 'crossHatch',
  microprint: 'microprint',
  rosette: 'rosette',
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- intentional same-name type+const pattern
export type BadgeFrame = (typeof BadgeFrame)[keyof typeof BadgeFrame];

/** Phosphor icon weight variants */
export const BadgeIconWeight = {
  thin: 'thin',
  light: 'light',
  regular: 'regular',
  bold: 'bold',
  fill: 'fill',
  duotone: 'duotone',
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- intentional same-name type+const pattern
export type BadgeIconWeight = (typeof BadgeIconWeight)[keyof typeof BadgeIconWeight];

/** Badge visual design configuration */
export type BadgeDesign = {
  shape: BadgeShape;
  frame: BadgeFrame;
  color: string; // hex from accent palette
  iconName: string; // Phosphor icon identifier
  iconWeight: BadgeIconWeight;
  title: string; // display title (from goal, editable)
  label?: string; // optional custom label
  frameParams?: {
    variant: number; // index into precomputed guilloche configs
  };
};

/** Default icon when none is specified */
const DEFAULT_ICON_NAME = 'Trophy';

/** Default badge color (purple — the rollercoaster.dev signature) */
const DEFAULT_DESIGN_COLOR = '#a78bfa';

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** Returns true if `value` is a valid 3/6/8-digit hex color string. */
export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_RE.test(value);
}

/**
 * Create a sensible default BadgeDesign from a goal title and color.
 *
 * Uses circle shape, no frame, Trophy icon at regular weight.
 * Falls back to signature purple if no color provided or if color is invalid hex.
 */
export function createDefaultBadgeDesign(
  title: string,
  color?: string | null,
): BadgeDesign {
  const resolvedColor =
    color && isValidHexColor(color) ? color : DEFAULT_DESIGN_COLOR;
  return {
    shape: BadgeShape.circle,
    frame: BadgeFrame.none,
    color: resolvedColor,
    iconName: DEFAULT_ICON_NAME,
    iconWeight: BadgeIconWeight.regular,
    title,
  };
}

/**
 * Safely parse a BadgeDesign from a raw JSON string (e.g. from the database).
 * Returns null if the input is falsy or not valid JSON.
 */
export function parseBadgeDesign(raw: string | null | undefined): BadgeDesign | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BadgeDesign;
  } catch {
    return null;
  }
}
