/**
 * Estimate the rendered width of a text string at a given font size.
 *
 * Uses an average character-width factor of 0.7em — a generous approximation
 * that accommodates wide letters (W, M) as well as narrow ones (i, l) without
 * truncation. Empirically, 0.6em was too tight on iOS when the system fell
 * back from "DM Mono" to a non-monospace font: text like "AWESOME" got
 * truncated because the arc was shorter than the rendered glyphs needed.
 *
 * Real glyph metrics would require async measurement via react-native-svg's
 * measure APIs and state plumbing back through the renderer; the 0.7em
 * estimate is good enough for the inscription length range users actually
 * input (~25 characters).
 */
const AVG_CHAR_WIDTH_RATIO = 0.7;

export function measureTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * AVG_CHAR_WIDTH_RATIO;
}
