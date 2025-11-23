/**
 * E2E tests for /.well-known endpoints
 *
 * Tests the JWKS endpoint (/.well-known/jwks.json) for RFC 7517 compliance.
 * This endpoint provides public keys for verifying digital signatures
 * on Open Badges credentials.
 */

import { describe, it, expect, afterAll, beforeAll } from 'bun:test';

// IMPORTANT: Set ALL environment variables BEFORE any module imports
// Ensure DB-related env-vars are set
process.env.DB_TYPE = 'sqlite';
process.env.SQLITE_DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';
// Disable RBAC for testing
process.env.AUTH_DISABLE_RBAC = 'true';

// Now import modules after env vars are set
import { logger } from '@/utils/logging/logger.service';
import { setupTestApp, stopTestServer } from './setup-test-app';
import { getAvailablePort, releasePort } from './helpers/port-manager.helper';

// Use getPort to reliably get an available port to avoid conflicts
let TEST_PORT: number;
let API_URL: string;

// Server instance for the test
let server: unknown = null;

/**
 * Interface for JWK (JSON Web Key) as defined in RFC 7517
 */
interface JsonWebKey {
  kty: string; // Key Type (e.g., 'RSA', 'OKP')
  use?: string; // Public Key Use (e.g., 'sig' for signature)
  key_ops?: string[]; // Key Operations
  alg?: string; // Algorithm
  kid?: string; // Key ID
  // RSA-specific parameters
  n?: string; // Modulus
  e?: string; // Exponent
  // Ed25519-specific parameters (OKP - Octet Key Pair)
  crv?: string; // Curve (e.g., 'Ed25519')
  x?: string; // The public key
}

/**
 * Interface for JWKS (JSON Web Key Set)
 */
interface JsonWebKeySet {
  keys: JsonWebKey[];
}

describe('Well-Known Endpoints - E2E', () => {
  // Start the server before all tests
  beforeAll(async () => {
    // Get an available port to avoid conflicts
    TEST_PORT = await getAvailablePort();

    // Set up API URLs after getting the port
    // Always use 127.0.0.1 for fetch requests (server binds to 0.0.0.0)
    API_URL = `http://127.0.0.1:${TEST_PORT}`;

    try {
      logger.info(`E2E Test: Starting server on port ${TEST_PORT}`);
      const result = await setupTestApp(TEST_PORT);
      server = result.server;
      logger.info('E2E Test: Server started successfully');
      // Wait for the server to be fully ready
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      logger.error('E2E Test: Failed to start server', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  });

  // Stop the server after all tests
  afterAll(async () => {
    if (server) {
      try {
        logger.info('E2E Test: Stopping server');
        stopTestServer(server);
        logger.info('E2E Test: Server stopped successfully');
      } catch (error) {
        logger.error('E2E Test: Error stopping server', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    }

    // Release the allocated port
    if (TEST_PORT) {
      releasePort(TEST_PORT);
    }
  });

  describe('JWKS Endpoint (/.well-known/jwks.json)', () => {
    it('should return HTTP 200 status', async () => {
      const response = await fetch(`${API_URL}/.well-known/jwks.json`, {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      logger.info(`JWKS endpoint responded with status ${response.status}`);
    });

    it('should return valid JWKS format per RFC 7517', async () => {
      const response = await fetch(`${API_URL}/.well-known/jwks.json`, {
        method: 'GET',
      });

      expect(response.status).toBe(200);

      const jwks = (await response.json()) as JsonWebKeySet;

      // JWKS must have a 'keys' array
      expect(jwks).toHaveProperty('keys');
      expect(Array.isArray(jwks.keys)).toBe(true);

      logger.info(`JWKS contains ${jwks.keys.length} key(s)`);
    });

    it('should include valid JWK properties when keys are present', async () => {
      const response = await fetch(`${API_URL}/.well-known/jwks.json`, {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const jwks = (await response.json()) as JsonWebKeySet;

      // If there are keys, validate their properties
      for (const key of jwks.keys) {
        // Required property: kty (key type)
        expect(key).toHaveProperty('kty');
        expect(['RSA', 'OKP'].includes(key.kty)).toBe(true);

        // Should have 'use' set to 'sig' (signature)
        expect(key).toHaveProperty('use');
        expect(key.use).toBe('sig');

        // Should have key_ops with 'verify'
        expect(key).toHaveProperty('key_ops');
        expect(key.key_ops).toEqual(['verify']);

        // Should have a key ID
        expect(key).toHaveProperty('kid');
        expect(typeof key.kid).toBe('string');

        // Verify key-type specific properties
        if (key.kty === 'RSA') {
          // RSA keys must have modulus (n) and exponent (e)
          expect(key).toHaveProperty('n');
          expect(key).toHaveProperty('e');
          expect(key.alg).toBe('RS256');
          expect(typeof key.n).toBe('string');
          expect(typeof key.e).toBe('string');
        } else if (key.kty === 'OKP') {
          // Ed25519 keys must have curve (crv) and public key (x)
          expect(key).toHaveProperty('crv');
          expect(key).toHaveProperty('x');
          expect(key.crv).toBe('Ed25519');
          expect(key.alg).toBe('EdDSA');
          expect(typeof key.x).toBe('string');
        }

        logger.info(`Validated key: ${key.kid} (${key.kty})`);
      }
    });

    it('should not expose private key material', async () => {
      const response = await fetch(`${API_URL}/.well-known/jwks.json`, {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const jwks = (await response.json()) as JsonWebKeySet;

      for (const key of jwks.keys) {
        // RSA private parameters should not be present
        expect(key).not.toHaveProperty('d'); // Private exponent
        expect(key).not.toHaveProperty('p'); // First prime factor
        expect(key).not.toHaveProperty('q'); // Second prime factor
        expect(key).not.toHaveProperty('dp'); // First factor CRT exponent
        expect(key).not.toHaveProperty('dq'); // Second factor CRT exponent
        expect(key).not.toHaveProperty('qi'); // First CRT coefficient

        logger.info(
          `Verified no private key material exposed for key: ${key.kid}`
        );
      }
    });

    it('should return correct Content-Type header', async () => {
      const response = await fetch(`${API_URL}/.well-known/jwks.json`, {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const contentType = response.headers.get('Content-Type');
      expect(contentType).toContain('application/json');

      logger.info(`Content-Type: ${contentType}`);
    });

    it('should return Cache-Control header for caching', async () => {
      const response = await fetch(`${API_URL}/.well-known/jwks.json`, {
        method: 'GET',
      });

      expect(response.status).toBe(200);
      const cacheControl = response.headers.get('Cache-Control');
      expect(cacheControl).toBeDefined();
      if (cacheControl) {
        expect(cacheControl).toContain('max-age=');
      }

      logger.info(`Cache-Control: ${cacheControl}`);
    });

    it('should be accessible without authentication', async () => {
      // JWKS endpoint should be public per RFC 7517
      // No authentication headers provided
      const response = await fetch(`${API_URL}/.well-known/jwks.json`, {
        method: 'GET',
        // Explicitly no auth headers
      });

      expect(response.status).toBe(200);

      const jwks = (await response.json()) as JsonWebKeySet;
      expect(jwks).toHaveProperty('keys');

      logger.info('Verified JWKS endpoint is publicly accessible');
    });
  });
});
