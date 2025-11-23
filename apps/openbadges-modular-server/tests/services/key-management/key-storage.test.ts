/**
 * Tests for Key Storage Service
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { KeyStorageService, type StoredKeyPair } from '@/services/key-management/key-storage';
import { KeyType, Cryptosuite, generateKeyPair } from '@/utils/crypto/signature';

const TEST_KEYS_DIR = path.join(process.cwd(), 'test-keys-storage');
const generateTestKeyPair = () => generateKeyPair(KeyType.RSA);

describe('KeyStorageService', () => {
  let service: KeyStorageService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    originalEnv = { ...process.env };
    if (fs.existsSync(TEST_KEYS_DIR)) {
      await fs.promises.rm(TEST_KEYS_DIR, { recursive: true });
    }
    KeyStorageService.resetInstance();
    service = new KeyStorageService(TEST_KEYS_DIR);
  });

  afterEach(async () => {
    process.env = originalEnv;
    if (fs.existsSync(TEST_KEYS_DIR)) {
      await fs.promises.rm(TEST_KEYS_DIR, { recursive: true });
    }
    KeyStorageService.resetInstance();
  });

  describe('loadKeyPair (environment variables)', () => {
    it('should load key pair from environment variables', async () => {
      const testKeys = generateTestKeyPair();
      process.env['KEY_PRIVATE'] = testKeys.privateKey;
      process.env['KEY_PUBLIC'] = testKeys.publicKey;

      const result = await service.loadKeyPair();

      expect(result.success).toBe(true);
      expect(result.keyPair?.keyType).toBe(KeyType.RSA);
      expect(result.keyPair?.source).toBe('environment');
    });

    it('should return error when KEY_PRIVATE is missing', async () => {
      process.env['KEY_PUBLIC'] = generateTestKeyPair().publicKey;
      delete process.env['KEY_PRIVATE'];

      const result = await service.loadKeyPair();

      expect(result.success).toBe(false);
      expect(result.error).toContain('KEY_PRIVATE');
    });

    it('should decode base64-encoded keys', async () => {
      const testKeys = generateTestKeyPair();
      process.env['KEY_PRIVATE'] = Buffer.from(testKeys.privateKey).toString('base64');
      process.env['KEY_PUBLIC'] = Buffer.from(testKeys.publicKey).toString('base64');

      const result = await service.loadKeyPair();

      expect(result.success).toBe(true);
      expect(result.keyPair?.privateKey).toBe(testKeys.privateKey);
    });
  });

  describe('saveKeyPair (file-based storage)', () => {
    it('should save key pair to files', async () => {
      const testKeys = generateTestKeyPair();
      const keyPair: Omit<StoredKeyPair, 'createdAt' | 'source'> = {
        publicKey: testKeys.publicKey,
        privateKey: testKeys.privateKey,
        keyType: KeyType.RSA,
        cryptosuite: Cryptosuite.RsaSha256,
        keyId: 'test-key',
        isActive: true,
      };

      const result = await service.saveKeyPair(keyPair, { keyId: 'test-key' });

      expect(result).toBe(true);
      expect(fs.existsSync(path.join(TEST_KEYS_DIR, 'test-key.pub'))).toBe(true);
      expect(fs.existsSync(path.join(TEST_KEYS_DIR, 'test-key.key'))).toBe(true);
    });
  });

  describe('loadKeyPairFromFile', () => {
    it('should load key pair from files', async () => {
      const testKeys = generateTestKeyPair();
      await service.saveKeyPair(
        {
          publicKey: testKeys.publicKey,
          privateKey: testKeys.privateKey,
          keyType: KeyType.RSA,
          cryptosuite: Cryptosuite.RsaSha256,
          keyId: 'file-test-key',
          isActive: true,
        },
        { keyId: 'file-test-key' }
      );

      const result = await service.loadKeyPairFromFile({ keyId: 'file-test-key' });

      expect(result.success).toBe(true);
      expect(result.keyPair?.source).toBe('file');
    });

    it('should return error when key files do not exist', async () => {
      const result = await service.loadKeyPairFromFile({ keyId: 'non-existent-key' });
      expect(result.success).toBe(false);
    });
  });

  describe('getActiveKey', () => {
    it('should return null when no key is available', async () => {
      delete process.env['KEY_PRIVATE'];
      delete process.env['KEY_PUBLIC'];
      const activeKey = await service.getActiveKey();
      expect(activeKey).toBeNull();
    });

    it('should prioritize environment key over file key', async () => {
      const fileKeys = generateTestKeyPair();
      await service.saveKeyPair(
        {
          publicKey: fileKeys.publicKey,
          privateKey: fileKeys.privateKey,
          keyType: KeyType.RSA,
          cryptosuite: Cryptosuite.RsaSha256,
          keyId: 'default',
          isActive: true,
        },
        { keyId: 'default' }
      );

      const envKeys = generateTestKeyPair();
      process.env['KEY_PRIVATE'] = envKeys.privateKey;
      process.env['KEY_PUBLIC'] = envKeys.publicKey;

      const activeKey = await service.getActiveKey();
      expect(activeKey?.source).toBe('environment');
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = KeyStorageService.getInstance();
      const instance2 = KeyStorageService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });
});
