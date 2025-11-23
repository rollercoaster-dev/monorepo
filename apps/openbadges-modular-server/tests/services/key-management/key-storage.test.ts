/**
 * Unit tests for Key Storage Service
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  loadKeyPairFromEnv,
  getActiveKey,
  clearKeyCache,
} from '../../../src/services/key-management/key-storage';
import { generateRSAKeyPair } from '../../../src/services/key-management/key-generator';

function clearEnv(): void {
  delete process.env['KEY_PRIVATE'];
  delete process.env['KEY_PUBLIC'];
  delete process.env['KEY_ID'];
  delete process.env['KEY_AUTO_GENERATE'];
}

describe('Key Storage Service', () => {
  beforeEach(() => {
    clearEnv();
    clearKeyCache();
  });

  afterEach(() => {
    clearEnv();
    clearKeyCache();
  });

  describe('loadKeyPairFromEnv', () => {
    it('should return null when no env vars set', () => {
      expect(loadKeyPairFromEnv()).toBeNull();
    });

    it('should throw when only private key is set', () => {
      process.env['KEY_PRIVATE'] = '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----';
      expect(() => loadKeyPairFromEnv()).toThrow('Both KEY_PRIVATE and KEY_PUBLIC must be set');
    });

    it('should load valid PEM keys from env', async () => {
      const keyPair = await generateRSAKeyPair();
      process.env['KEY_PRIVATE'] = keyPair.privateKey;
      process.env['KEY_PUBLIC'] = keyPair.publicKey;

      const loaded = loadKeyPairFromEnv();
      expect(loaded).not.toBeNull();
      expect(loaded!.keyType).toBe('RSA');
      expect(loaded!.algorithm).toBe('RS256');
    });

    it('should load base64-encoded PEM keys', async () => {
      const keyPair = await generateRSAKeyPair();
      process.env['KEY_PRIVATE'] = Buffer.from(keyPair.privateKey).toString('base64');
      process.env['KEY_PUBLIC'] = Buffer.from(keyPair.publicKey).toString('base64');

      const loaded = loadKeyPairFromEnv();
      expect(loaded).not.toBeNull();
      expect(loaded!.privateKey).toBe(keyPair.privateKey);
    });
  });

  describe('getActiveKey', () => {
    it('should load from env vars', async () => {
      const keyPair = await generateRSAKeyPair();
      process.env['KEY_PRIVATE'] = keyPair.privateKey;
      process.env['KEY_PUBLIC'] = keyPair.publicKey;

      const active = await getActiveKey();
      expect(active.keyType).toBe('RSA');
    });

    it('should cache the key', async () => {
      const keyPair = await generateRSAKeyPair();
      process.env['KEY_PRIVATE'] = keyPair.privateKey;
      process.env['KEY_PUBLIC'] = keyPair.publicKey;

      const first = await getActiveKey();
      clearEnv(); // Clear env vars
      const second = await getActiveKey(); // Should still return cached

      expect(first.id).toBe(second.id);
    });

    it('should auto-generate when KEY_AUTO_GENERATE=true', async () => {
      process.env['KEY_AUTO_GENERATE'] = 'true';

      const key = await getActiveKey();
      expect(key.keyType).toBe('RSA');
      expect(key.algorithm).toBe('RS256');
    });

    it('should throw when no key available', async () => {
      await expect(getActiveKey()).rejects.toThrow('No signing key available');
    });
  });
});
