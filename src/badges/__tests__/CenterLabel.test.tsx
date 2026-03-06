import { CenterLabel, CENTER_LABEL_SIZE_RATIO } from '../text/CenterLabel';

const DARK_FILL = '#1a1a2e';
const LIGHT_FILL = '#fef3c7';

describe('CenterLabel', () => {
  // ── Null guards ──────────────────────────────────────────────────────

  it.each([
    ['undefined', undefined],
    ['empty string', ''],
    ['whitespace only', '   '],
  ])('returns null for %s label', (_desc, label) => {
    const result = CenterLabel({ label, size: 256, fillColor: DARK_FILL, centerContentSize: 50 });
    expect(result).toBeNull();
  });

  // ── Font size ────────────────────────────────────────────────────────

  it.each([128, 256])('scales font size for badge size %d', (size) => {
    const el = CenterLabel({ label: 'Test', size, fillColor: DARK_FILL, centerContentSize: 50 });
    expect(el!.props.fontSize).toBe(size * CENTER_LABEL_SIZE_RATIO);
  });

  // ── Positioning ──────────────────────────────────────────────────────

  it('centers horizontally', () => {
    const el = CenterLabel({ label: 'Test', size: 256, fillColor: DARK_FILL, centerContentSize: 50 });
    expect(el!.props.x).toBe(128);
    expect(el!.props.textAnchor).toBe('middle');
  });

  it('positions below badge center', () => {
    const el = CenterLabel({ label: 'Test', size: 256, fillColor: DARK_FILL, centerContentSize: 50 });
    expect(el!.props.y).toBeGreaterThan(128);
  });

  it('moves down when centerContentSize increases', () => {
    const small = CenterLabel({ label: 'Test', size: 256, fillColor: DARK_FILL, centerContentSize: 0 });
    const large = CenterLabel({ label: 'Test', size: 256, fillColor: DARK_FILL, centerContentSize: 100 });
    expect(large!.props.y).toBeGreaterThan(small!.props.y);
  });

  // ── Color contrast ───────────────────────────────────────────────────

  it('uses white text on dark fill', () => {
    const el = CenterLabel({ label: 'Test', size: 256, fillColor: DARK_FILL, centerContentSize: 50 });
    expect(el!.props.fill).toBe('#FFFFFF');
  });

  it('uses black text on light fill', () => {
    const el = CenterLabel({ label: 'Test', size: 256, fillColor: LIGHT_FILL, centerContentSize: 50 });
    expect(el!.props.fill).toBe('#000000');
  });

  // ── Font attributes ──────────────────────────────────────────────────

  it('uses Instrument Sans font by default', () => {
    const el = CenterLabel({ label: 'Test', size: 256, fillColor: DARK_FILL, centerContentSize: 50 });
    expect(el!.props.fontFamily).toBe('Instrument Sans');
  });

  it('accepts custom fontFamily', () => {
    const el = CenterLabel({ label: 'Test', size: 256, fillColor: DARK_FILL, centerContentSize: 50, fontFamily: 'Lexend' });
    expect(el!.props.fontFamily).toBe('Lexend');
  });

  // ── Label clamping ───────────────────────────────────────────────────

  it('clamps label to 10 characters', () => {
    const el = CenterLabel({ label: 'This is too long', size: 256, fillColor: DARK_FILL, centerContentSize: 50 });
    expect(el!.props.children).toBe('This is to');
  });
});
