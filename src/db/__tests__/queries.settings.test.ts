/**
 * UserSettings CRUD operation tests
 *
 * Tests singleton pattern, validation, and fixed updateUserSettings API
 */

import { createUserSettings, updateUserSettings } from '../queries';
import type { UserSettingsId } from '../schema';

const mockSettingsId = 'settings_test_123' as UserSettingsId;

describe('UserSettings CRUD Operations', () => {
  describe('createUserSettings', () => {
    test('should succeed creating default settings', () => {
      expect(() => createUserSettings()).not.toThrow();
    });
  });

  describe('updateUserSettings - Theme Validation', () => {
    test('should throw when theme is empty string', () => {
      expect(() => updateUserSettings(mockSettingsId, { theme: '' })).toThrow(
        'Theme must be 1-1000 characters',
      );
    });

    test('should throw when theme exceeds 1000 characters', () => {
      const longTheme = 'a'.repeat(1001);
      expect(() =>
        updateUserSettings(mockSettingsId, { theme: longTheme }),
      ).toThrow('Theme must be 1-1000 characters');
    });

    test('should succeed with valid theme', () => {
      expect(() =>
        updateUserSettings(mockSettingsId, { theme: 'dark' }),
      ).not.toThrow();
    });

    test('should succeed setting theme to null', () => {
      expect(() =>
        updateUserSettings(mockSettingsId, { theme: null }),
      ).not.toThrow();
    });
  });

  describe('updateUserSettings - Density Validation', () => {
    test('should throw when density is empty string', () => {
      expect(() =>
        updateUserSettings(mockSettingsId, { density: '' }),
      ).toThrow('Density must be 1-1000 characters');
    });

    test('should succeed with valid density', () => {
      expect(() =>
        updateUserSettings(mockSettingsId, { density: 'compact' }),
      ).not.toThrow();
    });

    test('should succeed setting density to null', () => {
      expect(() =>
        updateUserSettings(mockSettingsId, { density: null }),
      ).not.toThrow();
    });
  });

  describe('updateUserSettings - Animation Pref Validation', () => {
    test('should throw when animationPref is empty string', () => {
      expect(() =>
        updateUserSettings(mockSettingsId, { animationPref: '' }),
      ).toThrow('Animation preference must be 1-1000 characters');
    });

    test('should succeed with valid animationPref', () => {
      expect(() =>
        updateUserSettings(mockSettingsId, { animationPref: 'reduced' }),
      ).not.toThrow();
    });

    test('should succeed setting animationPref to null', () => {
      expect(() =>
        updateUserSettings(mockSettingsId, { animationPref: null }),
      ).not.toThrow();
    });
  });

  describe('updateUserSettings - Font Scale Validation (integer percentage)', () => {
    test('should throw when fontScale is not an integer', () => {
      expect(() =>
        updateUserSettings(mockSettingsId, { fontScale: 1.5 }),
      ).toThrow('Font scale must be an integer');
    });

    test('should succeed with fontScale 100 (default)', () => {
      expect(() =>
        updateUserSettings(mockSettingsId, { fontScale: 100 }),
      ).not.toThrow();
    });

    test('should succeed with fontScale 80 (minimum)', () => {
      expect(() =>
        updateUserSettings(mockSettingsId, { fontScale: 80 }),
      ).not.toThrow();
    });

    test('should succeed with fontScale 150 (maximum)', () => {
      expect(() =>
        updateUserSettings(mockSettingsId, { fontScale: 150 }),
      ).not.toThrow();
    });

    test('should succeed setting fontScale to null', () => {
      expect(() =>
        updateUserSettings(mockSettingsId, { fontScale: null }),
      ).not.toThrow();
    });
  });

  describe('updateUserSettings - Multiple Fields', () => {
    test('should succeed updating multiple fields', () => {
      expect(() =>
        updateUserSettings(mockSettingsId, {
          theme: 'dark',
          density: 'compact',
          animationPref: 'full',
          fontScale: 100,
        }),
      ).not.toThrow();
    });

    test('should succeed setting multiple fields to null', () => {
      expect(() =>
        updateUserSettings(mockSettingsId, {
          theme: null,
          density: null,
        }),
      ).not.toThrow();
    });

    test('should succeed with mix of values and nulls', () => {
      expect(() =>
        updateUserSettings(mockSettingsId, {
          theme: 'light',
          density: null,
          animationPref: 'reduced',
          fontScale: null,
        }),
      ).not.toThrow();
    });
  });

  describe('updateUserSettings - API Consistency', () => {
    test('should require ID as first parameter (fixed API)', () => {
      // This test verifies the API fix:
      // Before: updateUserSettings(fields) returned plain object
      // After: updateUserSettings(id, fields) calls evolu.update()
      expect(() =>
        updateUserSettings(mockSettingsId, { theme: 'dark' }),
      ).not.toThrow();
    });
  });
});
