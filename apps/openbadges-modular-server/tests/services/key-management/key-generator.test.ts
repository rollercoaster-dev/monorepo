/**
 * Unit tests for Key Generator Service
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import * as crypto from 'crypto';
import {
  generateRSAKeyPair,
  generateEdDSAKeyPair,
  keyPairToJWK,
  detectKeyTypeFromPEM,
  getRecommendedAlgorithm,
} from '../../../src/services/key-management/key-generator';
import type { KeyPair } from '../../../src/services/key-management/types';

describe('Key Generator Service', () => {
  describe('generateRSAKeyPair', () => {
    it('should generate a valid RSA key pair with default options', () => {
      const keyPair = generateRSAKeyPair();
      expect(keyPair).toBeDefined();
      expect(keyPair.id).toMatch(/^key-/);
      expect(keyPair.algorithm).toBe('RS256');
      expect(keyPair.status).toBe('active');
      expect(keyPair.publicKey).toContain('BEGIN PUBLIC KEY');
      expect(keyPair.privateKey).toContain('BEGIN PRIVATE KEY');
      expect(keyPair.publicKeyJwk.kty).toBe('RSA');
      expect(keyPair.publicKeyJwk.alg).toBe('RS256');
      expect(keyPair.publicKeyJwk.n).toBeDefined();
      expect(keyPair.publicKeyJwk.e).toBeDefined();
    });

    it('should generate RSA key pair with custom key size', () => {
      const keyPair = generateRSAKeyPair({ keySize: 4096 });
      const publicKeyObject = crypto.createPublicKey(keyPair.publicKey);
      expect(publicKeyObject.asymmetricKeyDetails?.modulusLength).toBe(4096);
    });

    it('should generate RSA key pair with custom key ID', () => {
      const keyPair = generateRSAKeyPair({ keyId: 'custom-rsa' });
      expect(keyPair.id).toBe('custom-rsa');
      expect(keyPair.publicKeyJwk.kid).toBe('custom-rsa');
    });

    it('should set expiration date when expiresInDays is provided', () => {
      const keyPair = generateRSAKeyPair({ expiresInDays: 90 });
      expect(keyPair.expiresAt).toBeDefined();
    });

    it('should generate unique key IDs', () => {
      const kp1 = generateRSAKeyPair();
      const kp2 = generateRSAKeyPair();
      expect(kp1.id).not.toBe(kp2.id);
    });

    it('should generate keys that can sign and verify', () => {
      const keyPair = generateRSAKeyPair();
      const sign = crypto.createSign('SHA256');
      sign.update('test data');
      const signature = sign.sign(keyPair.privateKey, 'base64');
      const verify = crypto.createVerify('SHA256');
      verify.update('test data');
      expect(verify.verify(keyPair.publicKey, signature, 'base64')).toBe(true);
    });
  });

  describe('generateEdDSAKeyPair', () => {
    it('should generate a valid EdDSA key pair', () => {
      const keyPair = generateEdDSAKeyPair();
      expect(keyPair).toBeDefined();
      expect(keyPair.id).toMatch(/^key-/);
      expect(keyPair.algorithm).toBe('EdDSA');
      expect(keyPair.publicKeyJwk.kty).toBe('OKP');
      expect(keyPair.publicKeyJwk.crv).toBe('Ed25519');
      expect(keyPair.publicKeyJwk.x).toBeDefined();
    });

    it('should generate EdDSA key pair with custom key ID', () => {
      const keyPair = generateEdDSAKeyPair({ keyId: 'custom-ed' });
      expect(keyPair.id).toBe('custom-ed');
    });

    it('should generate keys that can sign and verify', () => {
      const keyPair = generateEdDSAKeyPair();
      const privateKeyObj = crypto.createPrivateKey(keyPair.privateKey);
      const signature = crypto.sign(null, Buffer.from('test'), privateKeyObj);
      const publicKeyObj = crypto.createPublicKey(keyPair.publicKey);
      expect(
        crypto.verify(null, Buffer.from('test'), publicKeyObj, signature)
      ).toBe(true);
    });
  });

  describe('keyPairToJWK', () => {
    let rsaKeyPair: KeyPair;
    let eddsaKeyPair: KeyPair;

    beforeEach(() => {
      rsaKeyPair = generateRSAKeyPair({ keyId: 'test-rsa' });
      eddsaKeyPair = generateEdDSAKeyPair({ keyId: 'test-ed' });
    });

    it('should convert RSA public key to JWK', () => {
      const jwk = keyPairToJWK(rsaKeyPair.publicKey, undefined, {
        keyId: 'conv-rsa',
      });
      expect(jwk.kty).toBe('RSA');
      expect(jwk.n).toBeDefined();
      expect(jwk.d).toBeUndefined();
    });

    it('should convert EdDSA public key to JWK', () => {
      const jwk = keyPairToJWK(eddsaKeyPair.publicKey, undefined, {
        keyId: 'conv-ed',
      });
      expect(jwk.kty).toBe('OKP');
      expect(jwk.crv).toBe('Ed25519');
      expect(jwk.d).toBeUndefined();
    });

    it('should include private key when requested', () => {
      const jwk = keyPairToJWK(rsaKeyPair.publicKey, rsaKeyPair.privateKey, {
        includePrivateKey: true,
      });
      expect(jwk.d).toBeDefined();
      expect(jwk.key_ops).toContain('sign');
    });

    it('should throw for invalid PEM', () => {
      expect(() => keyPairToJWK('invalid')).toThrow();
    });
  });

  describe('detectKeyTypeFromPEM', () => {
    it('should detect RSA key type', () => {
      const kp = generateRSAKeyPair();
      expect(detectKeyTypeFromPEM(kp.publicKey)).toBe('RSA');
      expect(detectKeyTypeFromPEM(kp.privateKey)).toBe('RSA');
    });

    it('should detect OKP key type', () => {
      const kp = generateEdDSAKeyPair();
      expect(detectKeyTypeFromPEM(kp.publicKey)).toBe('OKP');
    });

    it('should throw for invalid PEM', () => {
      expect(() => detectKeyTypeFromPEM('invalid')).toThrow();
    });
  });

  describe('getRecommendedAlgorithm', () => {
    it('should return RS256 for RSA', () => {
      expect(getRecommendedAlgorithm('RSA')).toBe('RS256');
    });

    it('should return ES256 for EC', () => {
      expect(getRecommendedAlgorithm('EC')).toBe('ES256');
    });

    it('should return EdDSA for OKP', () => {
      expect(getRecommendedAlgorithm('OKP')).toBe('EdDSA');
    });

    it('should throw for unknown type', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => getRecommendedAlgorithm('UNKNOWN' as any)).toThrow();
    });
  });
});
