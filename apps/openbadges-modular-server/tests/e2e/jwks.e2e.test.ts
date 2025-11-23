/**
 * JWKS Endpoint E2E Tests
 *
 * Tests the /.well-known/jwks.json endpoint for proper JWKS format,
 * security (no private key exposure), and HTTP response characteristics.
 *
 * The JWKS endpoint is public (no auth required) by default, as it must be
 * accessible by verifiers to validate Open Badges credentials.
 */

import { describe, it, expect, afterAll, beforeAll } from 'bun:test';
import { logger } from '@/utils/logging/logger.service';
import { setupTestApp, stopTestServer } from './setup-test-app';
import { getAvailablePort, releasePort } from './helpers/port-manager.helper';

// Ensure DB-related env-vars are set before any module import
if (!process.env.DB_TYPE) {
  process.env.DB_TYPE = 'sqlite';
}
if (process.env.DB_TYPE === 'sqlite' && !process.env.SQLITE_DB_PATH) {
  process.env.SQLITE_DB_PATH = ':memory:';
}
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}
// Ensure .well-known paths are public (required for JWKS/DID verification)
if (!process.env.AUTH_PUBLIC_PATHS?.includes('.well-known')) {
  const existing = process.env.AUTH_PUBLIC_PATHS || '/docs,/swagger,/health,/public';
  process.env.AUTH_PUBLIC_PATHS = `${existing},/.well-known/*`;
}

import { config } from '@/config/config';

let TEST_PORT: number;
let API_URL: string;
let JWKS_ENDPOINT: string;

type BunServer = {
  stop: () => void;
};
let server: BunServer | null = null;

describe('JWKS Endpoint - E2E', () => {
  beforeAll(async () => {
    TEST_PORT = await getAvailablePort();
    const host = config.server.host ?? '127.0.0.1';
    API_URL = `http://${host}:${TEST_PORT}`;
    JWKS_ENDPOINT = `${API_URL}/.well-known/jwks.json`;

    logger.info(`E2E Test: Using JWKS endpoint: ${JWKS_ENDPOINT}`);

    try {
      logger.info(`E2E Test: Starting server on port ${TEST_PORT}`);
      const result = await setupTestApp(TEST_PORT);
      server = result.server as BunServer;
      logger.info('E2E Test: Server started successfully');
    } catch (error) {
      logger.error('E2E Test: Failed to start server', { error });
      throw error;
    }
  });

  afterAll(async () => {
    if (server) {
      logger.info('E2E Test: Stopping server');
      await stopTestServer(server);
      server = null;
    }
    await releasePort(TEST_PORT);
  });

  describe('GET /.well-known/jwks.json', () => {
    it('should be publicly accessible without authentication', async () => {
      // JWKS endpoints MUST be public for badge verification
      const response = await fetch(JWKS_ENDPOINT);
      expect(response.status).toBe(200);
    });

    it('should return valid JWKS format per RFC 7517', async () => {
      const response = await fetch(JWKS_ENDPOINT);
      const jwks = await response.json();

      // JWKS must have a "keys" array
      expect(jwks).toHaveProperty('keys');
      expect(Array.isArray(jwks.keys)).toBe(true);
    });

    it('should return keys with required JWK properties (if keys exist)', async () => {
      const response = await fetch(JWKS_ENDPOINT);
      const jwks = await response.json();

      // Skip property validation if no keys exist (empty JWKS is valid per RFC 7517)
      if (jwks.keys.length === 0) {
        logger.info('JWKS is empty - skipping key property validation');
        return;
      }

      // Each key must have the required properties
      for (const key of jwks.keys) {
        // kty (key type) is required per RFC 7517
        expect(key).toHaveProperty('kty');
        expect(['RSA', 'EC', 'OKP'].includes(key.kty)).toBe(true);

        // For signing keys, these should be present
        expect(key).toHaveProperty('use');
        expect(key.use).toBe('sig');

        expect(key).toHaveProperty('kid');
        expect(typeof key.kid).toBe('string');

        // Key-specific properties based on key type
        if (key.kty === 'RSA') {
          expect(key).toHaveProperty('n'); // modulus
          expect(key).toHaveProperty('e'); // exponent
          expect(key).toHaveProperty('alg');
          expect(['RS256', 'RS384', 'RS512'].includes(key.alg)).toBe(true);
        } else if (key.kty === 'OKP') {
          expect(key).toHaveProperty('crv'); // curve
          expect(key).toHaveProperty('x'); // public key
          expect(['Ed25519', 'Ed448'].includes(key.crv)).toBe(true);
        } else if (key.kty === 'EC') {
          expect(key).toHaveProperty('crv');
          expect(key).toHaveProperty('x');
          expect(key).toHaveProperty('y');
        }
      }
    });

    it('should NOT expose private key material (if keys exist)', async () => {
      const response = await fetch(JWKS_ENDPOINT);
      const jwks = await response.json();

      // Skip validation if no keys exist
      if (jwks.keys.length === 0) {
        logger.info('JWKS is empty - skipping private key check');
        return;
      }

      for (const key of jwks.keys) {
        // RSA private parameters must NOT be present
        expect(key).not.toHaveProperty('d'); // private exponent
        expect(key).not.toHaveProperty('p'); // first prime factor
        expect(key).not.toHaveProperty('q'); // second prime factor
        expect(key).not.toHaveProperty('dp'); // first factor CRT exponent
        expect(key).not.toHaveProperty('dq'); // second factor CRT exponent
        expect(key).not.toHaveProperty('qi'); // first CRT coefficient

        // EC/OKP private parameter must NOT be present
        // Note: 'd' is the private key for EC/OKP as well
      }
    });

    it('should return correct Content-Type header', async () => {
      const response = await fetch(JWKS_ENDPOINT);
      const contentType = response.headers.get('content-type');

      expect(contentType).toBeDefined();
      expect(contentType?.includes('application/json')).toBe(true);
    });

    it('should include Cache-Control header for performance', async () => {
      const response = await fetch(JWKS_ENDPOINT);
      const cacheControl = response.headers.get('cache-control');

      // JWKS responses should be cacheable
      expect(cacheControl).toBeDefined();
      expect(cacheControl?.includes('max-age')).toBe(true);
    });

    it('should return a valid keys array (may be empty in test environment)', async () => {
      const response = await fetch(JWKS_ENDPOINT);
      const jwks = await response.json();

      // Verify keys is an array (may be empty in test environment where no keys are generated)
      expect(Array.isArray(jwks.keys)).toBe(true);

      // Log key count for debugging
      logger.info(`JWKS contains ${jwks.keys.length} key(s)`);
    });
  });
});
