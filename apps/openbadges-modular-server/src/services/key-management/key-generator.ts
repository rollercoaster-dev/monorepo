/**
 * Key Generation Service
 */

import * as crypto from 'crypto';
import { logger } from '../../utils/logging/logger.service';
import type { JWK, KeyPair, KeyAlgorithm, KeyType, EllipticCurve } from './types';

export interface RSAGenerationOptions {
  keySize?: 2048 | 3072 | 4096;
  keyId?: string;
  expiresInDays?: number;
}

export interface EdDSAGenerationOptions {
  keyId?: string;
  expiresInDays?: number;
}

export interface JWKConversionOptions {
  keyId?: string;
  includePrivateKey?: boolean;
}

function generateKeyId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(4).toString('hex');
  return 'key-' + timestamp + '-' + randomPart;
}

function calculateExpirationDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function generateRSAKeyPair(options: RSAGenerationOptions = {}): KeyPair {
  const { keySize = 2048, keyId, expiresInDays } = options;
  try {
    logger.debug('Generating RSA key pair', { keySize });
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: keySize,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const id = keyId || generateKeyId();
    const jwkData = crypto.createPublicKey(publicKey).export({ format: 'jwk' }) as {
      n: string;
      e: string;
    };
    const publicKeyJwk: JWK = {
      kty: 'RSA',
      use: 'sig',
      key_ops: ['verify'],
      alg: 'RS256',
      kid: id,
      n: jwkData.n,
      e: jwkData.e,
    };
    const keyPair: KeyPair = {
      id,
      algorithm: 'RS256',
      privateKey,
      publicKey,
      publicKeyJwk,
      status: 'active',
      createdAt: new Date().toISOString(),
      ...(expiresInDays && { expiresAt: calculateExpirationDate(expiresInDays) }),
    };
    logger.info('RSA key pair generated', { keyId: id });
    return keyPair;
  } catch (error) {
    logger.error('Failed to generate RSA key pair', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    throw error;
  }
}

export function generateEdDSAKeyPair(options: EdDSAGenerationOptions = {}): KeyPair {
  const { keyId, expiresInDays } = options;
  try {
    logger.debug('Generating EdDSA key pair');
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const id = keyId || generateKeyId();
    const jwkData = crypto.createPublicKey(publicKey).export({ format: 'jwk' }) as {
      x: string;
      crv: string;
    };
    const publicKeyJwk: JWK = {
      kty: 'OKP',
      use: 'sig',
      key_ops: ['verify'],
      alg: 'EdDSA',
      kid: id,
      crv: jwkData.crv as EllipticCurve,
      x: jwkData.x,
    };
    const keyPair: KeyPair = {
      id,
      algorithm: 'EdDSA',
      privateKey,
      publicKey,
      publicKeyJwk,
      status: 'active',
      createdAt: new Date().toISOString(),
      ...(expiresInDays && { expiresAt: calculateExpirationDate(expiresInDays) }),
    };
    logger.info('EdDSA key pair generated', { keyId: id });
    return keyPair;
  } catch (error) {
    logger.error('Failed to generate EdDSA key pair', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    throw error;
  }
}

export function keyPairToJWK(
  publicKeyPem: string,
  privateKeyPem?: string,
  options: JWKConversionOptions = {}
): JWK {
  const { keyId, includePrivateKey = false } = options;
  try {
    const publicJwkData = crypto.createPublicKey(publicKeyPem).export({ format: 'jwk' });
    const kty = publicJwkData.kty as KeyType;
    let jwk: JWK;
    if (kty === 'RSA') {
      const rsaData = publicJwkData as { n: string; e: string };
      jwk = {
        kty: 'RSA',
        use: 'sig',
        key_ops: ['verify'],
        alg: 'RS256',
        kid: keyId,
        n: rsaData.n,
        e: rsaData.e,
      };
      if (includePrivateKey && privateKeyPem) {
        const priv = crypto.createPrivateKey(privateKeyPem).export({ format: 'jwk' }) as {
          d: string;
          p: string;
          q: string;
          dp: string;
          dq: string;
          qi: string;
        };
        jwk = {
          ...jwk,
          key_ops: ['sign', 'verify'],
          d: priv.d,
          p: priv.p,
          q: priv.q,
          dp: priv.dp,
          dq: priv.dq,
          qi: priv.qi,
        };
      }
    } else if (kty === 'OKP') {
      const okpData = publicJwkData as { crv: string; x: string };
      jwk = {
        kty: 'OKP',
        use: 'sig',
        key_ops: ['verify'],
        alg: 'EdDSA',
        kid: keyId,
        crv: okpData.crv as EllipticCurve,
        x: okpData.x,
      };
      if (includePrivateKey && privateKeyPem) {
        const priv = crypto.createPrivateKey(privateKeyPem).export({ format: 'jwk' }) as {
          d: string;
        };
        jwk = { ...jwk, key_ops: ['sign', 'verify'], d: priv.d };
      }
    } else {
      throw new Error('Unsupported key type: ' + kty);
    }
    return jwk;
  } catch (error) {
    logger.error('Failed to convert PEM to JWK', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
    throw error;
  }
}

export function detectKeyTypeFromPEM(pemKey: string): KeyType {
  try {
    const keyObj = pemKey.includes('PRIVATE')
      ? crypto.createPrivateKey(pemKey)
      : crypto.createPublicKey(pemKey);
    return keyObj.export({ format: 'jwk' }).kty as KeyType;
  } catch {
    throw new Error('Could not determine key type from PEM');
  }
}

export function getRecommendedAlgorithm(keyType: KeyType): KeyAlgorithm {
  switch (keyType) {
    case 'RSA':
      return 'RS256';
    case 'EC':
      return 'ES256';
    case 'OKP':
      return 'EdDSA';
    default:
      throw new Error('Unknown key type: ' + keyType);
  }
}
