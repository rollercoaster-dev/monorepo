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

// Ensure fetch exists in node environment tests
if (typeof global.fetch === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(global as any).fetch = vi.fn()
}

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
