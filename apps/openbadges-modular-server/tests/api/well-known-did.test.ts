import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  WellKnownController,
  type DidDocument,
  type DidDocumentResponse,
} from '../../src/api/controllers/well-known.controller';
import { KeyService, KeyStatus } from '../../src/core/key.service';
import { KeyType } from '../../src/utils/crypto/signature';
import * as fs from 'fs';
import * as path from 'path';

describe('WellKnownController - DID Document', () => {
  const testKeysDir = path.join(process.cwd(), 'test-keys-well-known-did');
  let wellKnownController: WellKnownController;

  beforeEach(async () => {
    if (!fs.existsSync(testKeysDir)) {
      fs.mkdirSync(testKeysDir, { recursive: true });
    }
    process.env.KEYS_DIR = testKeysDir;
    await KeyService.initialize();
    wellKnownController = new WellKnownController();
  });

  afterEach(async () => {
    if (fs.existsSync(testKeysDir)) {
      const files = fs.readdirSync(testKeysDir);
      for (const file of files) {
        fs.unlinkSync(path.join(testKeysDir, file));
      }
      fs.rmdirSync(testKeysDir);
    }
  });

  describe('getDidDocument', () => {
    it('should return valid DID document format', async () => {
      const result: DidDocumentResponse = await wellKnownController.getDidDocument();
      expect(result.status).toBe(200);
      const didDoc = result.body as DidDocument;
      expect(didDoc).toHaveProperty('@context');
      expect(didDoc).toHaveProperty('id');
      expect(didDoc).toHaveProperty('verificationMethod');
    });

    it('should have correct @context values', async () => {
      const result: DidDocumentResponse = await wellKnownController.getDidDocument();
      const didDoc = result.body as DidDocument;
      expect(didDoc['@context']).toContain('https://www.w3.org/ns/did/v1');
    });

    it('should generate valid did:web identifier', async () => {
      const result: DidDocumentResponse = await wellKnownController.getDidDocument();
      const didDoc = result.body as DidDocument;
      expect(didDoc.id).toMatch(/^did:web:.+$/);
    });

    it('should include verification methods for active keys', async () => {
      await KeyService.generateKeyPair('test-rsa-key', KeyType.RSA);
      const result: DidDocumentResponse = await wellKnownController.getDidDocument();
      const didDoc = result.body as DidDocument;
      expect(didDoc.verificationMethod.length).toBeGreaterThanOrEqual(2);
    });

    it('should only include active keys', async () => {
      await KeyService.generateKeyPair('active-key', KeyType.RSA);
      await KeyService.generateKeyPair('inactive-key', KeyType.RSA);
      await KeyService.setKeyStatus('inactive-key', KeyStatus.INACTIVE);
      const result: DidDocumentResponse = await wellKnownController.getDidDocument();
      const didDoc = result.body as DidDocument;
      const keyIds = didDoc.verificationMethod.map((vm) => vm.id.split('#')[1]);
      expect(keyIds).toContain('active-key');
      expect(keyIds).not.toContain('inactive-key');
    });

    it('should handle errors gracefully', async () => {
      const originalGetJwkSet = KeyService.getJwkSet;
      KeyService.getJwkSet = async () => { throw new Error('Test error'); };
      const result: DidDocumentResponse = await wellKnownController.getDidDocument();
      expect(result.status).toBe(500);
      KeyService.getJwkSet = originalGetJwkSet;
    });
  });
});
