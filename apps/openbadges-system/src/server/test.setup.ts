import { vi } from 'vitest'

// Make legacy /api/bs proxy public during tests to avoid auth requirements
process.env.OPENBADGES_PROXY_PUBLIC = 'true'

// Disable OAuth during tests to avoid configuration validation errors
process.env.OAUTH_ENABLED = 'false'
process.env.OAUTH_GITHUB_ENABLED = 'false'

// Set required OAuth environment variables for tests (in case OAuth gets enabled)
process.env.OAUTH_GITHUB_CLIENT_ID = 'test-client-id'
process.env.OAUTH_GITHUB_CLIENT_SECRET = 'test-client-secret'
process.env.OAUTH_SESSION_SECRET = 'test-session-secret-for-testing-only'

// Mock fetch for all tests - always set up as vi.fn() for mockResolvedValueOnce support
globalThis.fetch = vi.fn() as unknown as typeof fetch

// Mock JWT service module for integration tests
// Provides both the singleton (jwtService) and class (JWTService) mocks
vi.mock('./services/jwt', () => {
  // Mock JWTService class that doesn't require keys
  class MockJWTService {
    generatePlatformToken = vi.fn(() => 'mock-platform-token')
    verifyToken = vi.fn(() => ({
      sub: 'test-user',
      platformId: 'urn:uuid:a504d862-bd64-4e0d-acff-db7955955bc1',
      displayName: 'Test User',
      email: 'test@example.com',
      metadata: { isAdmin: true },
    }))
    createOpenBadgesApiClient = vi.fn(() => ({
      token: 'mock-jwt-token',
      headers: {
        Authorization: 'Bearer mock-jwt-token',
        'Content-Type': 'application/json',
      },
    }))
  }

  return {
    JWTService: MockJWTService,
    jwtService: {
      generatePlatformToken: vi.fn(() => 'mock-platform-token'),
      createOpenBadgesApiClient: vi.fn(() => ({
        token: 'mock-jwt-token',
        headers: {
          Authorization: 'Bearer mock-jwt-token',
          'Content-Type': 'application/json',
        },
      })),
      verifyToken: vi.fn(() => ({
        sub: 'test-user',
        platformId: 'urn:uuid:a504d862-bd64-4e0d-acff-db7955955bc1',
        displayName: 'Test User',
        email: 'test@example.com',
        metadata: { isAdmin: true },
      })),
    },
  }
})

// Mock sqlite3 to avoid native bindings if any code path imports it
vi.mock('sqlite3', () => ({
  Database: vi.fn().mockImplementation(() => ({
    prepare: vi.fn().mockReturnValue({
      get: vi.fn(),
      all: vi.fn(),
      run: vi.fn(),
      finalize: vi.fn(),
    }),
    exec: vi.fn(),
    close: vi.fn(),
  })),
}))

// Mock bun:sqlite so that accidental imports do not explode in Node env
vi.mock('bun:sqlite', () => ({
  Database: vi.fn().mockImplementation(() => ({
    prepare: vi.fn().mockReturnValue({
      get: vi.fn(),
      all: vi.fn(),
      run: vi.fn(),
    }),
    exec: vi.fn(),
    close: vi.fn(),
  })),
}))
