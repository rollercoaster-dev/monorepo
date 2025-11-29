/**
 * Unit tests for Key Storage Service
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  loadKeyPairFromEnv,
  loadKeyPairFromFile,
  saveKeyPairToFile,
  getActiveKey,
  clearKeyCache,
} from '../../../src/services/key-management/key-storage';
import { generateRSAKeyPair } from '../../../src/services/key-management/key-generator';

function clearEnv(): void {
  delete process.env['KEY_PRIVATE'];
  delete process.env['KEY_PUBLIC'];
  delete process.env['KEY_ID'];
  delete process.env['KEY_AUTO_GENERATE'];
  delete process.env['OB_SIGNING_KEY'];
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

  describe('File-based Key Storage', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'key-test-'));
    });

    afterEach(async () => {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    });

    describe('loadKeyPairFromFile', () => {
      it('should load valid key file', async () => {
        const keyPair = await generateRSAKeyPair();
        const filePath = path.join(tempDir, 'test-key.json');
        await saveKeyPairToFile(keyPair, filePath);

        const loaded = await loadKeyPairFromFile(filePath);
        expect(loaded.id).toBe(keyPair.id);
        expect(loaded.publicKey).toBe(keyPair.publicKey);
        expect(loaded.privateKey).toBe(keyPair.privateKey);
        expect(loaded.status).toBe('active');
      });

      it('should throw for non-existent file', async () => {
        await expect(loadKeyPairFromFile('/nonexistent/path.json')).rejects.toThrow(
          'Key file not found'
        );
      });

      it('should throw for invalid JSON', async () => {
        const filePath = path.join(tempDir, 'invalid.json');
        await fs.promises.writeFile(filePath, 'not valid json');

        await expect(loadKeyPairFromFile(filePath)).rejects.toThrow('Invalid JSON');
      });

      it('should throw for invalid format', async () => {
        const filePath = path.join(tempDir, 'invalid-format.json');
        await fs.promises.writeFile(filePath, JSON.stringify({ foo: 'bar' }));

        await expect(loadKeyPairFromFile(filePath)).rejects.toThrow('Invalid key file format');
      });
    });

    describe('saveKeyPairToFile', () => {
      it('should write file with 0o600 permissions', async () => {
        const keyPair = await generateRSAKeyPair();
        const filePath = path.join(tempDir, 'test-key.json');
        await saveKeyPairToFile(keyPair, filePath);

        const stats = await fs.promises.stat(filePath);
        // Check owner read/write only (0o600)
        expect(stats.mode & 0o777).toBe(0o600);
      });

      it('should round-trip with loadKeyPairFromFile', async () => {
        const keyPair = await generateRSAKeyPair();
        const filePath = path.join(tempDir, 'roundtrip-key.json');

        await saveKeyPairToFile(keyPair, filePath);
        const loaded = await loadKeyPairFromFile(filePath);

        expect(loaded.id).toBe(keyPair.id);
        expect(loaded.keyType).toBe(keyPair.keyType);
        expect(loaded.algorithm).toBe(keyPair.algorithm);
        expect(loaded.createdAt).toBe(keyPair.createdAt);
      });

      it('should throw for non-existent directory', async () => {
        const keyPair = await generateRSAKeyPair();
        const filePath = path.join('/nonexistent/dir', 'key.json');

        await expect(saveKeyPairToFile(keyPair, filePath)).rejects.toThrow(
          'Directory does not exist'
        );
      });
    });

    describe('getActiveKey with file', () => {
      it('should load from OB_SIGNING_KEY', async () => {
        const keyPair = await generateRSAKeyPair();
        const filePath = path.join(tempDir, 'signing-key.json');
        await saveKeyPairToFile(keyPair, filePath);

        process.env['OB_SIGNING_KEY'] = filePath;
        const active = await getActiveKey();
        expect(active.id).toBe(keyPair.id);
      });

      it('should prioritize env vars over file', async () => {
        const fileKey = await generateRSAKeyPair();
        const envKey = await generateRSAKeyPair();
        const filePath = path.join(tempDir, 'signing-key.json');
        await saveKeyPairToFile(fileKey, filePath);

        process.env['OB_SIGNING_KEY'] = filePath;
        process.env['KEY_PRIVATE'] = envKey.privateKey;
        process.env['KEY_PUBLIC'] = envKey.publicKey;

        const active = await getActiveKey();
        // Use id to compare since the key content should be from env, not file
        expect(active.id).not.toBe(fileKey.id);
      });

      it('should auto-save generated key when OB_SIGNING_KEY is set', async () => {
        const filePath = path.join(tempDir, 'auto-generated-key.json');
        process.env['OB_SIGNING_KEY'] = filePath;
        process.env['KEY_AUTO_GENERATE'] = 'true';

        const generated = await getActiveKey();

        // Verify file was created
        const fileExists = await fs.promises
          .access(filePath)
          .then(() => true)
          .catch(() => false);
        expect(fileExists).toBe(true);

        // Verify file contains correct key
        clearKeyCache();
        const loaded = await loadKeyPairFromFile(filePath);
        expect(loaded.id).toBe(generated.id);
      });
    });
  });
});
