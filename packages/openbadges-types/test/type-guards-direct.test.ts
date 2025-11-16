import {
  isOB2Assertion,
  isOB2BadgeClass,
  isOB2Profile,
  isOB3VerifiableCredential,
  isOB3Achievement,
  isOB3Issuer,
  isJsonLdObject,
  hasJsonLdType,
  hasJsonLdContext,
  isIRI,
  isDateTime,
  isBadge,
} from '../src';

import {
  createOB2Assertion,
  createOB3VerifiableCredential,
  createOB3Achievement,
  createOB3Issuer,
} from './helpers';

describe('Direct Type Guards', () => {
  // Test data
  const ob2Badge = createOB2Assertion();
  const ob3Badge = createOB3VerifiableCredential();
  const ob3Achievement = createOB3Achievement();
  const ob3Issuer = createOB3Issuer();

  describe('OB2 Type Guards', () => {
    test('isOB2Assertion should correctly identify OB2 Assertions', () => {
      expect(isOB2Assertion(ob2Badge)).toBe(true);
      expect(isOB2Assertion(ob3Badge)).toBe(false);
      expect(isOB2Assertion(null)).toBe(false);
      expect(isOB2Assertion({})).toBe(false);
    });

    test('isOB2BadgeClass should correctly identify OB2 BadgeClass objects', () => {
      const badgeClass = ob2Badge.badge;
      expect(isOB2BadgeClass(badgeClass)).toBe(true);
      expect(isOB2BadgeClass(ob2Badge)).toBe(false);
      expect(isOB2BadgeClass(null)).toBe(false);
      expect(isOB2BadgeClass({})).toBe(false);
    });

    test('isOB2Profile should correctly identify OB2 Profile objects', () => {
      const profile = typeof ob2Badge.badge === 'object' ? ob2Badge.badge.issuer : null;
      expect(isOB2Profile(profile)).toBe(true);
      expect(isOB2Profile(ob2Badge)).toBe(false);
      expect(isOB2Profile(null)).toBe(false);
      expect(isOB2Profile({})).toBe(false);
    });
  });

  describe('OB3 Type Guards', () => {
    test('isOB3VerifiableCredential should correctly identify OB3 VerifiableCredential objects', () => {
      expect(isOB3VerifiableCredential(ob3Badge)).toBe(true);
      expect(isOB3VerifiableCredential(ob2Badge)).toBe(false);
      expect(isOB3VerifiableCredential(null)).toBe(false);
      expect(isOB3VerifiableCredential({})).toBe(false);
    });

    test('isOB3Achievement should correctly identify OB3 Achievement objects', () => {
      expect(isOB3Achievement(ob3Achievement)).toBe(true);
      expect(isOB3Achievement(ob3Badge)).toBe(false);
      expect(isOB3Achievement(null)).toBe(false);
      expect(isOB3Achievement({})).toBe(false);
    });

    test('isOB3Issuer should correctly identify OB3 Issuer objects', () => {
      expect(isOB3Issuer(ob3Issuer)).toBe(true);
      expect(isOB3Issuer(ob3Badge)).toBe(false);
      expect(isOB3Issuer(null)).toBe(false);
      expect(isOB3Issuer({})).toBe(false);
    });
  });

  describe('Shared Type Guards', () => {
    test('isJsonLdObject should correctly identify JSON-LD objects', () => {
      expect(isJsonLdObject(ob2Badge)).toBe(true);
      expect(isJsonLdObject(ob3Badge)).toBe(true);
      expect(isJsonLdObject(null)).toBe(false);
      expect(isJsonLdObject({})).toBe(false);
    });

    test('hasJsonLdType should correctly check for JSON-LD types', () => {
      expect(hasJsonLdType(ob2Badge, 'Assertion')).toBe(true);
      expect(hasJsonLdType(ob3Badge, 'VerifiableCredential')).toBe(true);
      expect(hasJsonLdType(ob2Badge, 'BadgeClass')).toBe(false);
      expect(hasJsonLdType(null, 'Assertion')).toBe(false);
    });

    test('hasJsonLdContext should correctly check for JSON-LD contexts', () => {
      expect(hasJsonLdContext(ob2Badge, 'https://w3id.org/openbadges/v2')).toBe(true);
      expect(hasJsonLdContext(ob3Badge, 'https://www.w3.org/2018/credentials/v1')).toBe(true);
      expect(hasJsonLdContext(ob2Badge, 'https://example.org/context')).toBe(false);
      expect(hasJsonLdContext(null, 'https://w3id.org/openbadges/v2')).toBe(false);
    });

    test('isIRI should correctly identify IRIs', () => {
      expect(isIRI('https://example.org/badges/123')).toBe(true);
      expect(isIRI('not a url')).toBe(false);
      expect(isIRI(null)).toBe(false);
      expect(isIRI(123)).toBe(false);
    });

    test('isDateTime should correctly identify ISO 8601 date strings', () => {
      expect(isDateTime('2023-06-15T12:00:00Z')).toBe(true);
      expect(isDateTime('2023-06-15')).toBe(false);
      expect(isDateTime(null)).toBe(false);
      expect(isDateTime(new Date())).toBe(false);
    });
  });

  describe('Composite Type Guards', () => {
    test('isBadge should correctly identify badges of either version', () => {
      expect(isBadge(ob2Badge)).toBe(true);
      expect(isBadge(ob3Badge)).toBe(true);
      expect(isBadge(null)).toBe(false);
      expect(isBadge({})).toBe(false);
    });
  });
});
