import {
  MonogramCenter,
  MONOGRAM_SIZE_RATIO_1,
  MONOGRAM_SIZE_RATIO_2,
  MONOGRAM_SIZE_RATIO_3,
} from '../text/MonogramCenter';

const SIZE = 256;
const DARK_FILL = '#1a1a2e';
const LIGHT_FILL = '#fef3c7';

describe('MonogramCenter', () => {
  // ── Null guards ──────────────────────────────────────────────────────

  it.each([
    ['undefined', undefined],
    ['empty string', ''],
    ['whitespace only', '   '],
  ])('returns null for %s monogram', (_label, monogram) => {
    const result = MonogramCenter({ monogram, size: SIZE, fillColor: DARK_FILL });
    expect(result).toBeNull();
  });

  // ── Font size ratios ─────────────────────────────────────────────────

  it.each([
    ['1 char', 'A', MONOGRAM_SIZE_RATIO_1],
    ['2 chars', 'AB', MONOGRAM_SIZE_RATIO_2],
    ['3 chars', 'ABC', MONOGRAM_SIZE_RATIO_3],
    ['4 chars (clamped)', 'ABCD', MONOGRAM_SIZE_RATIO_3],
  ])('uses correct font size ratio for %s', (_label, monogram, expectedRatio) => {
    const el = MonogramCenter({ monogram, size: SIZE, fillColor: DARK_FILL });
    expect(el).not.toBeNull();
    expect(el!.props.fontSize).toBe(SIZE * expectedRatio);
  });

  // ── Text content ─────────────────────────────────────────────────────

  it('renders single character', () => {
    const el = MonogramCenter({ monogram: 'X', size: SIZE, fillColor: DARK_FILL });
    expect(el!.props.children).toBe('X');
  });

  it('renders 3 characters', () => {
    const el = MonogramCenter({ monogram: 'ABC', size: SIZE, fillColor: DARK_FILL });
    expect(el!.props.children).toBe('ABC');
  });

  it('clamps to 3 characters', () => {
    const el = MonogramCenter({ monogram: 'ABCD', size: SIZE, fillColor: DARK_FILL });
    expect(el!.props.children).toBe('ABC');
  });

  // ── Positioning ──────────────────────────────────────────────────────

  it('centers text at badge midpoint', () => {
    const el = MonogramCenter({ monogram: 'A', size: SIZE, fillColor: DARK_FILL });
    expect(el!.props.x).toBe(SIZE / 2);
    expect(el!.props.y).toBe(SIZE / 2);
    expect(el!.props.textAnchor).toBe('middle');
  });

  // ── Color contrast ───────────────────────────────────────────────────

  it('uses white text on dark fill', () => {
    const el = MonogramCenter({ monogram: 'A', size: SIZE, fillColor: DARK_FILL });
    expect(el!.props.fill).toBe('#FFFFFF');
  });

  it('uses black text on light fill', () => {
    const el = MonogramCenter({ monogram: 'A', size: SIZE, fillColor: LIGHT_FILL });
    expect(el!.props.fill).toBe('#000000');
  });

  // ── Font attributes ──────────────────────────────────────────────────

  it('uses Anybody bold font', () => {
    const el = MonogramCenter({ monogram: 'A', size: SIZE, fillColor: DARK_FILL });
    expect(el!.props.fontFamily).toBe('Anybody');
    expect(el!.props.fontWeight).toBe('bold');
  });
});
