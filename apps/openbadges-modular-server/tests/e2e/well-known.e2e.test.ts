/**
 * E2E tests for /.well-known endpoints
 *
 * Tests the JWKS endpoint (/.well-known/jwks.json) for RFC 7517 compliance.
 */

import { describe, it, expect, afterAll, beforeAll } from 'bun:test';

process.env.DB_TYPE = 'sqlite';
process.env.SQLITE_DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';
process.env.AUTH_DISABLE_RBAC = 'true';

import { logger } from '@/utils/logging/logger.service';
import { setupTestApp, stopTestServer } from './setup-test-app';
import { getAvailablePort, releasePort } from './helpers/port-manager.helper';

let TEST_PORT: number;
let API_URL: string;
let server: unknown = null;

interface JsonWebKey {
  kty: string;
  use?: string;
  key_ops?: string[];
  alg?: string;
  kid?: string;
  n?: string;
  e?: string;
  crv?: string;
  x?: string;
}

interface JsonWebKeySet {
  keys: JsonWebKey[];
}

describe('Well-Known Endpoints - E2E', () => {
  beforeAll(async () => {
    TEST_PORT = await getAvailablePort();
    API_URL = \`http://127.0.0.1:\${TEST_PORT}\`;
    try {
      logger.info(\`E2E Test: Starting server on port \${TEST_PORT}\`);
      const result = await setupTestApp(TEST_PORT);
      server = result.server;
      logger.info('E2E Test: Server started successfully');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      logger.error('E2E Test: Failed to start server', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  });

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
    if (TEST_PORT) releasePort(TEST_PORT);
  });

  describe('JWKS Endpoint (/.well-known/jwks.json)', () => {
    it('should return HTTP 200 status', async () => {
      const response = await fetch(\`\${API_URL}/.well-known/jwks.json\`);
      expect(response.status).toBe(200);
    });

    it('should return valid JWKS format per RFC 7517', async () => {
      const response = await fetch(\`\${API_URL}/.well-known/jwks.json\`);
      expect(response.status).toBe(200);
      const jwks = (await response.json()) as JsonWebKeySet;
      expect(jwks).toHaveProperty('keys');
      expect(Array.isArray(jwks.keys)).toBe(true);
    });

    it('should include valid JWK properties when keys are present', async () => {
      const response = await fetch(\`\${API_URL}/.well-known/jwks.json\`);
      expect(response.status).toBe(200);
      const jwks = (await response.json()) as JsonWebKeySet;
      for (const key of jwks.keys) {
        expect(key).toHaveProperty('kty');
        expect(['RSA', 'OKP'].includes(key.kty)).toBe(true);
        expect(key).toHaveProperty('use');
        expect(key.use).toBe('sig');
        expect(key).toHaveProperty('key_ops');
        expect(key.key_ops).toEqual(['verify']);
        expect(key).toHaveProperty('kid');
      }
    });

    it('should not expose private key material', async () => {
      const response = await fetch(\`\${API_URL}/.well-known/jwks.json\`);
      expect(response.status).toBe(200);
      const jwks = (await response.json()) as JsonWebKeySet;
      for (const key of jwks.keys) {
        expect(key).not.toHaveProperty('d');
        expect(key).not.toHaveProperty('p');
        expect(key).not.toHaveProperty('q');
      }
    });

    it('should return correct Content-Type header', async () => {
      const response = await fetch(\`\${API_URL}/.well-known/jwks.json\`);
      expect(response.status).toBe(200);
      const contentType = response.headers.get('Content-Type');
      expect(contentType).toContain('application/json');
    });

    it('should return Cache-Control header', async () => {
      const response = await fetch(\`\${API_URL}/.well-known/jwks.json\`);
      expect(response.status).toBe(200);
      const cacheControl = response.headers.get('Cache-Control');
      expect(cacheControl).toBeDefined();
    });

    it('should be accessible without authentication', async () => {
      const response = await fetch(\`\${API_URL}/.well-known/jwks.json\`);
      expect(response.status).toBe(200);
      const jwks = (await response.json()) as JsonWebKeySet;
      expect(jwks).toHaveProperty('keys');
    });
  });
});
