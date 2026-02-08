import {
  ANIMATION_DURATIONS,
  getAnimationDuration,
  getTimingConfig,
  getSpringConfig,
} from '../animation';
import type { AnimationPref } from '../../hooks/useAnimationPref';

describe('animation utilities', () => {
  describe('ANIMATION_DURATIONS', () => {
    it('has entries for all preference levels', () => {
      const prefs: AnimationPref[] = ['full', 'reduced', 'none'];
      for (const pref of prefs) {
        expect(ANIMATION_DURATIONS[pref]).toBeDefined();
        expect(ANIMATION_DURATIONS[pref].quick).toBeDefined();
        expect(ANIMATION_DURATIONS[pref].normal).toBeDefined();
        expect(ANIMATION_DURATIONS[pref].slow).toBeDefined();
      }
    });

    it('none has all zero durations', () => {
      expect(ANIMATION_DURATIONS.none.quick).toBe(0);
      expect(ANIMATION_DURATIONS.none.normal).toBe(0);
      expect(ANIMATION_DURATIONS.none.slow).toBe(0);
    });

    it('reduced durations are shorter than full', () => {
      expect(ANIMATION_DURATIONS.reduced.quick).toBeLessThan(ANIMATION_DURATIONS.full.quick);
      expect(ANIMATION_DURATIONS.reduced.normal).toBeLessThan(ANIMATION_DURATIONS.full.normal);
      expect(ANIMATION_DURATIONS.reduced.slow).toBeLessThan(ANIMATION_DURATIONS.full.slow);
    });
  });

  describe('getAnimationDuration', () => {
    it('returns correct duration for pref and speed', () => {
      expect(getAnimationDuration('full', 'quick')).toBe(200);
      expect(getAnimationDuration('reduced', 'normal')).toBe(150);
      expect(getAnimationDuration('none', 'slow')).toBe(0);
    });

    it('defaults to normal speed', () => {
      expect(getAnimationDuration('full')).toBe(300);
    });
  });

  describe('getTimingConfig', () => {
    it('returns config with correct duration', () => {
      const config = getTimingConfig('full', 'normal');
      expect(config.duration).toBe(300);
    });

    it('returns zero duration for none', () => {
      const config = getTimingConfig('none');
      expect(config.duration).toBe(0);
    });

    it('includes easing', () => {
      const config = getTimingConfig('full');
      expect(config.easing).toBeDefined();
    });
  });

  describe('getSpringConfig', () => {
    it('returns zero duration for none', () => {
      const config = getSpringConfig('none');
      expect(config.duration).toBe(0);
    });

    it('returns damping/stiffness for reduced', () => {
      const config = getSpringConfig('reduced');
      expect(config.damping).toBeDefined();
      expect(config.stiffness).toBeDefined();
    });

    it('returns bouncy config for full', () => {
      const full = getSpringConfig('full');
      const reduced = getSpringConfig('reduced');
      expect(full.damping).toBeLessThan(reduced.damping!);
    });
  });
});
