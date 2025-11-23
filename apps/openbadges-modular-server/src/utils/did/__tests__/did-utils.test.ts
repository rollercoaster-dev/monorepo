import { describe, expect, it } from 'bun:test';
import { generateDidWeb, isValidDidWeb, didWebToUrl } from '../did-utils';

describe('DID Utilities', () => {
  describe('generateDidWeb', () => {
    it('should generate did:web from simple URL', () => {
      expect(generateDidWeb('https://example.com')).toBe('did:web:example.com');
    });
    it('should generate did:web from URL with path', () => {
      expect(generateDidWeb('https://example.com/issuers/123')).toBe('did:web:example.com:issuers:123');
    });
    it('should handle URL with port', () => {
      expect(generateDidWeb('https://example.com:8080')).toBe('did:web:example.com%3A8080');
    });
    it('should handle URL with trailing slash', () => {
      expect(generateDidWeb('https://example.com/')).toBe('did:web:example.com');
    });
    it('should return null for invalid URL', () => {
      expect(generateDidWeb('not-a-url')).toBeNull();
    });
    it('should return null for null/undefined', () => {
      expect(generateDidWeb(null)).toBeNull();
      expect(generateDidWeb(undefined)).toBeNull();
    });
  });

  describe('isValidDidWeb', () => {
    it('should return true for valid did:web', () => {
      expect(isValidDidWeb('did:web:example.com')).toBe(true);
    });
    it('should return false for invalid format', () => {
      expect(isValidDidWeb('did:key:z123')).toBe(false);
      expect(isValidDidWeb('')).toBe(false);
    });
  });

  describe('didWebToUrl', () => {
    it('should convert did:web to URL', () => {
      expect(didWebToUrl('did:web:example.com')).toBe('https://example.com');
      expect(didWebToUrl('did:web:example.com:issuers:123')).toBe('https://example.com/issuers/123');
    });
    it('should return null for invalid DID', () => {
      expect(didWebToUrl('invalid')).toBeNull();
    });
  });
});
