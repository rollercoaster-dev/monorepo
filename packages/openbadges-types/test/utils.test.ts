import {
  createIRI,
  createDateTime,
  isIRI,
  isDateTime,
  isJsonLdObject,
  isJsonLdArray,
  hasJsonLdType,
  hasJsonLdContext,
  OB2Context,
  OB3Context,
  VCContext,
  normalizeBadge,
  normalizeBadges,
  filterBadgesBySearchTerm,
  sortBadges,
  groupBadges,
  validateBadge,
} from '../src';

import { createOB2Assertion, createOB3VerifiableCredential } from './helpers';

describe('Utility Functions', () => {
  describe('IRI and DateTime Utilities', () => {
    test('createIRI should create a branded IRI', () => {
      const iri = createIRI('https://example.org/badges/5');
      expect(iri).toBe('https://example.org/badges/5');
      expect(typeof iri).toBe('string');
    });

    test('createDateTime should create a branded DateTime', () => {
      const dateTime = createDateTime('2023-06-15T12:00:00Z');
      expect(dateTime).toBe('2023-06-15T12:00:00Z');
      expect(typeof dateTime).toBe('string');
    });

    test('isIRI should correctly identify valid IRIs', () => {
      expect(isIRI('https://example.org/badges/5')).toBe(true);
      expect(isIRI('not a url')).toBe(false);
      expect(isIRI(null)).toBe(false);
    });

    test('isDateTime should correctly identify valid DateTimes', () => {
      expect(isDateTime('2023-06-15T12:00:00Z')).toBe(true);
      expect(isDateTime('2023-06-15')).toBe(false);
      expect(isDateTime(null)).toBe(false);
    });
  });

  describe('JSON-LD Utilities', () => {
    test('isJsonLdObject should correctly identify JSON-LD objects', () => {
      expect(
        isJsonLdObject({
          '@context': 'https://w3id.org/openbadges/v2',
          type: 'Assertion',
        })
      ).toBe(true);
      expect(isJsonLdObject({})).toBe(false);
      expect(isJsonLdObject(null)).toBe(false);
    });

    test('isJsonLdArray should correctly identify JSON-LD arrays', () => {
      expect(isJsonLdArray(['item1', 'item2'])).toBe(true);
      expect(isJsonLdArray('single item')).toBe(true);
      expect(isJsonLdArray(null)).toBe(false);
    });

    test('hasJsonLdType should correctly check for JSON-LD types', () => {
      const ob2Badge = createOB2Assertion();
      const ob3Badge = createOB3VerifiableCredential();

      expect(hasJsonLdType(ob2Badge, 'Assertion')).toBe(true);
      expect(hasJsonLdType(ob3Badge, 'VerifiableCredential')).toBe(true);
      expect(hasJsonLdType(ob2Badge, 'BadgeClass')).toBe(false);
    });

    test('hasJsonLdContext should correctly check for JSON-LD contexts', () => {
      const ob2Badge = createOB2Assertion();
      const ob3Badge = createOB3VerifiableCredential();

      expect(hasJsonLdContext(ob2Badge, OB2Context)).toBe(true);
      expect(hasJsonLdContext(ob3Badge, VCContext)).toBe(true);
      expect(hasJsonLdContext(ob3Badge, OB3Context)).toBe(true);
      expect(hasJsonLdContext(ob2Badge, OB3Context)).toBe(false);
    });
  });

  describe('Badge Normalization Utilities', () => {
    test('normalizeBadge should normalize a badge to a common format', () => {
      const ob2Badge = createOB2Assertion();
      const normalizedBadge = normalizeBadge(ob2Badge);

      expect(normalizedBadge).toHaveProperty('id');
      expect(normalizedBadge).toHaveProperty('type', 'OB2');
      expect(normalizedBadge).toHaveProperty('name');
      expect(normalizedBadge).toHaveProperty('issuerName');
      expect(normalizedBadge).toHaveProperty('issuanceDate');
    });

    test('normalizeBadges should normalize an array of badges', () => {
      const ob2Badge = createOB2Assertion();
      const ob3Badge = createOB3VerifiableCredential();
      const normalizedBadges = normalizeBadges([ob2Badge, ob3Badge]);

      expect(normalizedBadges).toHaveLength(2);
      expect(normalizedBadges[0]).toHaveProperty('type', 'OB2');
      expect(normalizedBadges[1]).toHaveProperty('type', 'OB3');
    });

    test('filterBadgesBySearchTerm should filter badges by search term', () => {
      const ob2Badge = createOB2Assertion();
      const ob3Badge = createOB3VerifiableCredential();
      const normalizedBadges = normalizeBadges([ob2Badge, ob3Badge]);

      // This test assumes that one of the badges contains the term "Example"
      const filteredBadges = filterBadgesBySearchTerm(normalizedBadges, 'Example');
      expect(filteredBadges.length).toBeGreaterThan(0);
    });

    test('sortBadges should sort badges by a field', () => {
      const ob2Badge = createOB2Assertion();
      const ob3Badge = createOB3VerifiableCredential();
      const normalizedBadges = normalizeBadges([ob2Badge, ob3Badge]);

      const sortedBadges = sortBadges(normalizedBadges, 'type', 'asc');
      expect(sortedBadges[0]).toHaveProperty('type', 'OB2');
      expect(sortedBadges[1]).toHaveProperty('type', 'OB3');
    });

    test('groupBadges should group badges by a field', () => {
      const ob2Badge = createOB2Assertion();
      const ob3Badge = createOB3VerifiableCredential();
      const normalizedBadges = normalizeBadges([ob2Badge, ob3Badge]);

      const groupedBadges = groupBadges(normalizedBadges, 'type');
      expect(groupedBadges).toHaveProperty('OB2');
      expect(groupedBadges).toHaveProperty('OB3');
      expect(groupedBadges.OB2).toHaveLength(1);
      expect(groupedBadges.OB3).toHaveLength(1);
    });
  });

  describe('Validation Utilities', () => {
    test('validateBadge should validate a badge', () => {
      const ob2Badge = createOB2Assertion();
      const result = validateBadge(ob2Badge);

      expect(result).toHaveProperty('isValid', true);
      expect(result).toHaveProperty('version', 'OB2');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });
  });
});
