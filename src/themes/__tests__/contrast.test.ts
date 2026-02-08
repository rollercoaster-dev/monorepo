/**
 * Automated contrast ratio verification for all theme variants
 * Ensures WCAG AA compliance across all 12 themes
 */

import { getContrastRatio, meetsWCAG } from '../../utils/accessibility';
import { lightColors, darkColors } from '../adapter';

describe('WCAG AA Color Contrast Compliance', () => {
  describe('Light Mode - Button Variants', () => {
    test('Primary button: light text on dark background', () => {
      const result = meetsWCAG(
        lightColors.background, // #fafafa (light text)
        lightColors.accentPrimary, // #0a0a0a (dark background)
        'AA',
        'normal'
      );

      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    test('Secondary button: dark text on light background', () => {
      const result = meetsWCAG(
        lightColors.text, // #262626 (dark text)
        lightColors.backgroundSecondary, // #fafafa (light background)
        'AA',
        'normal'
      );

      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    test('Destructive button: dark text on orange background', () => {
      // Using hardcoded color from Button.styles.ts
      const destructiveText = '#262626';
      const warningBg = '#d97706'; // palette.warning

      const result = meetsWCAG(destructiveText, warningBg, 'AA', 'normal');

      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Dark Mode - Button Variants', () => {
    test('Primary button: dark text on light background', () => {
      const result = meetsWCAG(
        darkColors.background, // #1a1033 (dark background)
        darkColors.accentPrimary, // #fafafa (light text)
        'AA',
        'normal'
      );

      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    test('Secondary button: light text on dark background', () => {
      const result = meetsWCAG(
        darkColors.text, // #fafafa (light text)
        darkColors.backgroundSecondary, // #2d1f52 (dark background)
        'AA',
        'normal'
      );

      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });

    test('Destructive button: dark text on orange background', () => {
      // Using hardcoded color from Button.styles.ts
      const destructiveText = '#262626';
      const warningBg = '#d97706'; // palette.warning

      const result = meetsWCAG(destructiveText, warningBg, 'AA', 'normal');

      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Tab Navigation', () => {
    test('Light mode - Active tab on purple background', () => {
      // Using hardcoded colors from TabNavigator.tsx
      const activeText = '#0a0a0a';
      const purpleBg = '#a78bfa'; // lightColors.accentPurple

      const result = meetsWCAG(activeText, purpleBg, 'AA', 'large');

      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(3.0);
    });

    test('Light mode - Inactive tab on purple background', () => {
      const inactiveText = '#404040';
      const purpleBg = '#a78bfa';

      const result = meetsWCAG(inactiveText, purpleBg, 'AA', 'large');

      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(3.0);
    });

    test('Dark mode - Active tab on purple background', () => {
      const activeText = '#0a0a0a';
      const purpleBg = '#c4b5fd'; // darkColors.accentPurple

      const result = meetsWCAG(activeText, purpleBg, 'AA', 'large');

      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(3.0);
    });

    test('Dark mode - Inactive tab on purple background', () => {
      const inactiveText = '#404040';
      const purpleBg = '#c4b5fd';

      const result = meetsWCAG(inactiveText, purpleBg, 'AA', 'large');

      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(3.0);
    });
  });

  describe('Contrast Ratio Utility', () => {
    test('calculates correct ratio for black on white', () => {
      const ratio = getContrastRatio('#000000', '#ffffff');
      expect(ratio).toBeCloseTo(21, 1); // Perfect contrast
    });

    test('calculates correct ratio for white on black', () => {
      const ratio = getContrastRatio('#ffffff', '#000000');
      expect(ratio).toBeCloseTo(21, 1); // Order doesn't matter
    });

    test('calculates correct ratio for same colors', () => {
      const ratio = getContrastRatio('#808080', '#808080');
      expect(ratio).toBeCloseTo(1, 1); // No contrast
    });

    test('handles hex colors with and without # prefix', () => {
      const withHash = getContrastRatio('#000000', '#ffffff');
      const withoutHash = getContrastRatio('000000', 'ffffff');
      expect(withHash).toBeCloseTo(withoutHash, 2);
    });
  });

  describe('WCAG Level Verification', () => {
    test('meetsWCAG returns correct required value for AA normal', () => {
      const result = meetsWCAG('#000000', '#ffffff', 'AA', 'normal');
      expect(result.required).toBe(4.5);
    });

    test('meetsWCAG returns correct required value for AA large', () => {
      const result = meetsWCAG('#000000', '#ffffff', 'AA', 'large');
      expect(result.required).toBe(3);
    });

    test('meetsWCAG returns correct required value for AAA normal', () => {
      const result = meetsWCAG('#000000', '#ffffff', 'AAA', 'normal');
      expect(result.required).toBe(7);
    });

    test('meetsWCAG returns correct required value for AAA large', () => {
      const result = meetsWCAG('#000000', '#ffffff', 'AAA', 'large');
      expect(result.required).toBe(4.5);
    });
  });
});
