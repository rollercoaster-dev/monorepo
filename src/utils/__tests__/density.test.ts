import {
  getDensityMultiplier,
  applyDensity,
  scaleSpacing,
  densityOptions,
  DENSITY_MULTIPLIERS,
  type DensityLevel,
} from '../density';

const mockSpace = {
  '0': 0,
  '1': 4,
  '2': 8,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24,
  '8': 32,
  '10': 40,
  '12': 48,
  '16': 64,
} as const;

describe('density utilities', () => {
  describe('getDensityMultiplier', () => {
    it('returns 0.75 for compact', () => {
      expect(getDensityMultiplier('compact')).toBe(0.75);
    });

    it('returns 1.0 for default', () => {
      expect(getDensityMultiplier('default')).toBe(1.0);
    });

    it('returns 1.25 for comfortable', () => {
      expect(getDensityMultiplier('comfortable')).toBe(1.25);
    });
  });

  describe('applyDensity', () => {
    it('scales down for compact', () => {
      expect(applyDensity(16, 'compact')).toBe(12);
    });

    it('returns original for default', () => {
      expect(applyDensity(16, 'default')).toBe(16);
    });

    it('scales up for comfortable', () => {
      expect(applyDensity(16, 'comfortable')).toBe(20);
    });

    it('rounds to nearest integer', () => {
      expect(applyDensity(5, 'compact')).toBe(4); // 5 * 0.75 = 3.75 → 4
    });

    it('handles zero', () => {
      expect(applyDensity(0, 'compact')).toBe(0);
      expect(applyDensity(0, 'comfortable')).toBe(0);
    });
  });

  describe('scaleSpacing', () => {
    it('returns original space for default density', () => {
      const result = scaleSpacing(mockSpace as any, 'default');
      expect(result).toBe(mockSpace); // Same reference, not copied
    });

    it('scales all values for compact', () => {
      const result = scaleSpacing(mockSpace as any, 'compact');
      expect(result['0']).toBe(0);
      expect(result['1']).toBe(3);   // 4 * 0.75 = 3
      expect(result['4']).toBe(12);  // 16 * 0.75 = 12
      expect(result['16']).toBe(48); // 64 * 0.75 = 48
    });

    it('scales all values for comfortable', () => {
      const result = scaleSpacing(mockSpace as any, 'comfortable');
      expect(result['0']).toBe(0);
      expect(result['1']).toBe(5);   // 4 * 1.25 = 5
      expect(result['4']).toBe(20);  // 16 * 1.25 = 20
      expect(result['16']).toBe(80); // 64 * 1.25 = 80
    });
  });

  describe('densityOptions', () => {
    it('has exactly 3 options', () => {
      expect(densityOptions).toHaveLength(3);
    });

    it('covers all density levels', () => {
      const ids = densityOptions.map((o) => o.id);
      expect(ids).toEqual(['compact', 'default', 'comfortable']);
    });

    it('each option has label and description', () => {
      for (const option of densityOptions) {
        expect(option.label).toBeTruthy();
        expect(option.description).toBeTruthy();
      }
    });
  });

  describe('DENSITY_MULTIPLIERS', () => {
    it('has entries for all levels', () => {
      const levels: DensityLevel[] = ['compact', 'default', 'comfortable'];
      for (const level of levels) {
        expect(DENSITY_MULTIPLIERS[level]).toBeGreaterThan(0);
      }
    });
  });
});
