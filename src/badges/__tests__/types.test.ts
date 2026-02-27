/**
 * Tests for BadgeDesign type and createDefaultBadgeDesign
 */
import {
  BadgeShape,
  BadgeFrame,
  BadgeIconWeight,
  createDefaultBadgeDesign,
  isValidHexColor,
  parseBadgeDesign,
} from '../types';
import type { BadgeDesign } from '../types';

describe('BadgeDesign enums', () => {
  test('BadgeShape has all 6 shapes', () => {
    expect(Object.keys(BadgeShape)).toHaveLength(6);
    expect(BadgeShape.circle).toBe('circle');
    expect(BadgeShape.shield).toBe('shield');
    expect(BadgeShape.hexagon).toBe('hexagon');
    expect(BadgeShape.roundedRect).toBe('roundedRect');
    expect(BadgeShape.star).toBe('star');
    expect(BadgeShape.diamond).toBe('diamond');
  });

  test('BadgeFrame has all 6 frame styles', () => {
    expect(Object.keys(BadgeFrame)).toHaveLength(6);
    expect(BadgeFrame.none).toBe('none');
    expect(BadgeFrame.boldBorder).toBe('boldBorder');
    expect(BadgeFrame.guilloche).toBe('guilloche');
    expect(BadgeFrame.crossHatch).toBe('crossHatch');
    expect(BadgeFrame.microprint).toBe('microprint');
    expect(BadgeFrame.rosette).toBe('rosette');
  });

  test('BadgeIconWeight has all 6 weights', () => {
    expect(Object.keys(BadgeIconWeight)).toHaveLength(6);
    expect(BadgeIconWeight.thin).toBe('thin');
    expect(BadgeIconWeight.light).toBe('light');
    expect(BadgeIconWeight.regular).toBe('regular');
    expect(BadgeIconWeight.bold).toBe('bold');
    expect(BadgeIconWeight.fill).toBe('fill');
    expect(BadgeIconWeight.duotone).toBe('duotone');
  });
});

describe('createDefaultBadgeDesign', () => {
  test('returns valid BadgeDesign with title and color', () => {
    const design = createDefaultBadgeDesign('Learn TypeScript', '#ffe50c');

    expect(design).toEqual<BadgeDesign>({
      shape: 'circle',
      frame: 'none',
      color: '#ffe50c',
      iconName: 'Trophy',
      iconWeight: 'regular',
      title: 'Learn TypeScript',
    });
  });

  test('uses default purple when color is null', () => {
    const design = createDefaultBadgeDesign('My Goal', null);
    expect(design.color).toBe('#a78bfa');
  });

  test('uses default purple when color is undefined', () => {
    const design = createDefaultBadgeDesign('My Goal');
    expect(design.color).toBe('#a78bfa');
  });

  test('falls back to default purple for invalid hex color', () => {
    expect(createDefaultBadgeDesign('G', 'not-a-hex').color).toBe('#a78bfa');
    expect(createDefaultBadgeDesign('G', 'red').color).toBe('#a78bfa');
    expect(createDefaultBadgeDesign('G', '#xyz').color).toBe('#a78bfa');
    expect(createDefaultBadgeDesign('G', '').color).toBe('#a78bfa');
  });

  test('preserves empty string title', () => {
    const design = createDefaultBadgeDesign('');
    expect(design.title).toBe('');
  });

  test('preserves long title without truncation', () => {
    const longTitle = 'A'.repeat(500);
    const design = createDefaultBadgeDesign(longTitle, '#000000');
    expect(design.title).toBe(longTitle);
  });

  test('does not include optional fields by default', () => {
    const design = createDefaultBadgeDesign('Test');
    expect(design.label).toBeUndefined();
    expect(design.frameParams).toBeUndefined();
  });

  test('result is JSON-serializable', () => {
    const design = createDefaultBadgeDesign('Serialize Test', '#d4f4e7');
    const json = JSON.stringify(design);
    const parsed = JSON.parse(json) as BadgeDesign;
    expect(parsed).toEqual(design);
  });
});

describe('isValidHexColor', () => {
  test.each([
    ['#abc', true],
    ['#AABBCC', true],
    ['#a78bfa', true],
    ['#a78bfa00', true], // 8-digit with alpha
    ['abc', false],
    ['#xy', false],
    ['#abcde', false],
    ['red', false],
    ['', false],
  ])('isValidHexColor(%s) === %s', (input, expected) => {
    expect(isValidHexColor(input)).toBe(expected);
  });
});

describe('parseBadgeDesign', () => {
  test('parses valid JSON into BadgeDesign', () => {
    const design = createDefaultBadgeDesign('Test');
    const result = parseBadgeDesign(JSON.stringify(design));
    expect(result).toEqual(design);
  });

  test('returns null for null/undefined/empty input', () => {
    expect(parseBadgeDesign(null)).toBeNull();
    expect(parseBadgeDesign(undefined)).toBeNull();
    expect(parseBadgeDesign('')).toBeNull();
  });

  test('returns null for invalid JSON', () => {
    expect(parseBadgeDesign('not-json')).toBeNull();
    expect(parseBadgeDesign('{broken')).toBeNull();
  });
});
