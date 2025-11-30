# Testing Guide

This guide covers the testing architecture, patterns, and best practices for openbadges-system.

## Testing Stack

| Tool                 | Purpose                            | Environment |
| -------------------- | ---------------------------------- | ----------- |
| Vitest               | Client-side unit/integration tests | jsdom       |
| Bun test             | Server-side unit tests             | Bun runtime |
| Vue Test Utils       | Vue component testing              | jsdom       |
| @testing-library/vue | DOM testing utilities              | jsdom       |

## Directory Structure

```
src/
├── client/
│   ├── components/
│   │   └── __tests__/          # Component tests
│   ├── composables/
│   │   └── __tests__/          # Composable tests
│   └── pages/
│       └── __tests__/          # Page tests
├── server/
│   ├── routes/
│   │   └── __tests__/          # Route handler tests
│   ├── services/
│   │   └── __tests__/          # Service tests
│   └── __tests__/              # Server integration tests
└── test/
    ├── setup.ts                # Test setup file
    ├── utils/                  # Shared test utilities
    └── integration/            # End-to-end API tests
```

## Running Tests

### All Tests

```bash
# Run all tests (client + server)
bun run test

# Watch mode
bun run test:watch

# With coverage
bun run test:coverage

# Run once without watch
bun run test:run
```

### Client Tests Only

```bash
# Client tests use Vitest with jsdom
bun run test:client
```

### Server Tests Only

```bash
# Server tests use Bun's native test runner
bun run test:server

# Alternative: Vitest for server (for consistency)
bun run test:server:vitest
```

## Client-Side Testing

### Component Testing

```typescript
// src/client/components/__tests__/UserCard.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import UserCard from '../User/UserCard.vue'

describe('UserCard', () => {
  const mockUser = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user' as const,
  }

  it('renders user name', () => {
    const wrapper = mount(UserCard, {
      props: { user: mockUser },
    })

    expect(wrapper.text()).toContain('Test User')
  })

  it('displays admin badge for admin users', () => {
    const adminUser = { ...mockUser, role: 'admin' as const }
    const wrapper = mount(UserCard, {
      props: { user: adminUser },
    })

    expect(wrapper.find('.admin-badge').exists()).toBe(true)
  })

  it('emits edit event when edit button clicked', async () => {
    const wrapper = mount(UserCard, {
      props: { user: mockUser, editable: true },
    })

    await wrapper.find('[data-testid="edit-button"]').trigger('click')

    expect(wrapper.emitted('edit')).toBeTruthy()
    expect(wrapper.emitted('edit')?.[0]).toEqual([mockUser.id])
  })
})
```

### Composable Testing

```typescript
// src/client/composables/__tests__/useAuth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuth } from '../useAuth'
import { setActivePinia, createPinia } from 'pinia'

// Mock fetch
global.fetch = vi.fn()

describe('useAuth', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('starts with no authenticated user', () => {
    const { user, isAuthenticated } = useAuth()

    expect(user.value).toBeNull()
    expect(isAuthenticated.value).toBe(false)
  })

  it('sets user after successful login', async () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test' }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ token: 'jwt-token', user: mockUser }),
    } as Response)

    const { login, user, isAuthenticated } = useAuth()

    await login({ email: 'test@example.com' })

    expect(user.value).toEqual(mockUser)
    expect(isAuthenticated.value).toBe(true)
  })

  it('clears user on logout', async () => {
    const { logout, user } = useAuth()

    // Set initial state
    user.value = { id: '1', email: 'test@example.com', name: 'Test', role: 'user' }

    await logout()

    expect(user.value).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })
})
```

### Testing with Router

```typescript
// Testing pages with vue-router
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import BadgeDetail from '../pages/badges/[id]/index.vue'

describe('BadgeDetail Page', () => {
  it('displays badge information', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/badges/:id', component: BadgeDetail }],
    })

    await router.push('/badges/123')
    await router.isReady()

    const wrapper = mount(BadgeDetail, {
      global: {
        plugins: [router],
      },
    })

    // Wait for async data
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="badge-name"]').exists()).toBe(true)
  })
})
```

## Server-Side Testing

### Route Handler Testing

```typescript
// src/server/routes/__tests__/users.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import { userRoutes } from '../users'

describe('User Routes', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()
    app.route('/users', userRoutes)
  })

  it('GET /users returns user list for admin', async () => {
    const res = await app.request('/users', {
      headers: {
        Authorization: 'Bearer admin-token',
      },
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it('GET /users returns 401 without auth', async () => {
    const res = await app.request('/users')

    expect(res.status).toBe(401)
  })

  it('GET /users/:id returns specific user', async () => {
    const res = await app.request('/users/123', {
      headers: {
        Authorization: 'Bearer user-token',
      },
    })

    expect(res.status).toBe(200)
    const user = await res.json()
    expect(user.id).toBe('123')
  })
})
```

### Service Testing

```typescript
// src/server/services/__tests__/user.test.ts
import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { UserService } from '../user'

describe('UserService', () => {
  let service: UserService
  let mockDb: any

  beforeEach(() => {
    mockDb = {
      selectFrom: mock(() => mockDb),
      where: mock(() => mockDb),
      selectAll: mock(() => mockDb),
      executeTakeFirst: mock(() => Promise.resolve(null)),
      insertInto: mock(() => mockDb),
      values: mock(() => mockDb),
      returningAll: mock(() => mockDb),
      executeTakeFirstOrThrow: mock(() => Promise.resolve({})),
    }

    service = new UserService(mockDb)
  })

  it('findById returns null for non-existent user', async () => {
    mockDb.executeTakeFirst.mockResolvedValue(null)

    const user = await service.findById('non-existent')

    expect(user).toBeNull()
    expect(mockDb.where).toHaveBeenCalledWith('id', '=', 'non-existent')
  })

  it('create inserts user with generated ID', async () => {
    const userData = { email: 'test@example.com', name: 'Test' }
    const expectedUser = { id: 'generated-id', ...userData }

    mockDb.executeTakeFirstOrThrow.mockResolvedValue(expectedUser)

    const user = await service.create(userData)

    expect(user.email).toBe('test@example.com')
    expect(mockDb.insertInto).toHaveBeenCalledWith('users')
  })
})
```

### JWT Service Testing

```typescript
// src/server/services/__tests__/jwt.test.ts
import { describe, it, expect } from 'bun:test'
import { generateJWT, verifyJWT } from '../jwt'

describe('JWT Service', () => {
  const testUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'user' as const,
  }

  it('generates valid JWT token', async () => {
    const token = await generateJWT(testUser)

    expect(token).toBeDefined()
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
  })

  it('verifies generated token', async () => {
    const token = await generateJWT(testUser)
    const payload = await verifyJWT(token)

    expect(payload.sub).toBe(testUser.id)
    expect(payload.email).toBe(testUser.email)
  })

  it('rejects invalid token', async () => {
    await expect(verifyJWT('invalid-token')).rejects.toThrow()
  })

  it('rejects expired token', async () => {
    // Create token that's already expired
    const expiredToken = await generateJWT(testUser, { expiresIn: '-1h' })

    await expect(verifyJWT(expiredToken)).rejects.toThrow()
  })
})
```

## Mocking Strategies

### Mocking API Calls

```typescript
// In Vitest
import { vi } from 'vitest'

// Mock global fetch
vi.stubGlobal('fetch', vi.fn())

// Setup mock response
vi.mocked(fetch).mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ data: 'test' }),
} as Response)

// Reset between tests
beforeEach(() => {
  vi.clearAllMocks()
})
```

### Mocking Database

```typescript
// Create mock database for testing
function createMockDb() {
  const data: Record<string, any[]> = {
    users: [],
    user_sessions: [],
  }

  return {
    selectFrom: (table: string) => ({
      where: (col: string, op: string, val: any) => ({
        selectAll: () => ({
          executeTakeFirst: () => Promise.resolve(data[table].find(r => r[col] === val)),
        }),
      }),
    }),
    insertInto: (table: string) => ({
      values: (row: any) => ({
        returningAll: () => ({
          executeTakeFirstOrThrow: () => {
            data[table].push(row)
            return Promise.resolve(row)
          },
        }),
      }),
    }),
  }
}
```

### Mocking WebAuthn

```typescript
// Mock navigator.credentials for WebAuthn tests
const mockCredentials = {
  create: vi.fn(),
  get: vi.fn(),
}

Object.defineProperty(navigator, 'credentials', {
  value: mockCredentials,
  writable: true,
})

// Mock successful registration
mockCredentials.create.mockResolvedValue({
  id: 'credential-id',
  rawId: new ArrayBuffer(32),
  response: {
    clientDataJSON: new ArrayBuffer(100),
    attestationObject: new ArrayBuffer(200),
  },
  type: 'public-key',
})
```

## Integration Testing

### API Integration Tests

```typescript
// src/test/integration/auth.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestServer, createTestDatabase } from '../utils/test-server'

describe('Auth API Integration', () => {
  let server: ReturnType<typeof createTestServer>
  let db: ReturnType<typeof createTestDatabase>

  beforeAll(async () => {
    db = createTestDatabase()
    server = createTestServer(db)
    await server.start()
  })

  afterAll(async () => {
    await server.stop()
    await db.destroy()
  })

  it('full registration and login flow', async () => {
    // Register user
    const registerRes = await fetch(`${server.url}/api/public/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'new@example.com',
        name: 'New User',
      }),
    })

    expect(registerRes.status).toBe(201)
    const { user } = await registerRes.json()
    expect(user.email).toBe('new@example.com')

    // Login
    const loginRes = await fetch(`${server.url}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new@example.com' }),
    })

    expect(loginRes.status).toBe(200)
    const { token } = await loginRes.json()
    expect(token).toBeDefined()

    // Access protected route
    const meRes = await fetch(`${server.url}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(meRes.status).toBe(200)
    const me = await meRes.json()
    expect(me.email).toBe('new@example.com')
  })
})
```

## Test Utilities

### Test Setup File

```typescript
// src/test/setup.ts
import { beforeAll, afterAll, afterEach } from 'vitest'
import { cleanup } from '@testing-library/vue'

// Clean up after each test
afterEach(() => {
  cleanup()
})

// Global mocks
beforeAll(() => {
  // Mock localStorage
  const store: Record<string, string> = {}
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => Object.keys(store).forEach(k => delete store[k]),
  })
})
```

### Test Factories

```typescript
// src/test/utils/factories.ts
export function createTestUser(overrides = {}) {
  return {
    id: `user-${Math.random().toString(36).slice(2)}`,
    email: 'test@example.com',
    name: 'Test User',
    role: 'user' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

export function createTestBadge(overrides = {}) {
  return {
    id: `badge-${Math.random().toString(36).slice(2)}`,
    name: 'Test Badge',
    description: 'A test badge',
    image: 'https://example.com/badge.png',
    criteria: 'Complete the test',
    issuerId: 'issuer-1',
    ...overrides,
  }
}
```

### Mount Helpers

```typescript
// src/test/utils/mount.ts
import { mount, MountingOptions } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { Component } from 'vue'

export function mountWithPlugins(component: Component, options: MountingOptions<any> = {}) {
  return mount(component, {
    global: {
      plugins: [createPinia()],
      stubs: {
        RouterLink: true,
        RouterView: true,
      },
      ...options.global,
    },
    ...options,
  })
}
```

## Coverage Requirements

### Minimum Coverage Thresholds

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
      exclude: ['node_modules/', 'dist/', '**/*.d.ts', '**/__tests__/**', '**/test/**'],
    },
  },
})
```

### Running Coverage

```bash
# Generate coverage report
bun run test:coverage

# View HTML report
open coverage/index.html
```

## Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// Good: Test what the component does
it('displays error message on failed login', async () => {
  // ...setup mock to fail
  await wrapper.find('form').trigger('submit')
  expect(wrapper.text()).toContain('Invalid credentials')
})

// Bad: Test internal implementation
it('calls setError with message', () => {
  // Don't test internal method calls
})
```

### 2. Use Data-TestId for Selectors

```vue
<template>
  <button data-testid="submit-button">Submit</button>
</template>
```

```typescript
// In tests
wrapper.find('[data-testid="submit-button"]')
```

### 3. Isolate Tests

```typescript
beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks()

  // Reset state
  localStorage.clear()
})
```

### 4. Test Error States

```typescript
it('handles API errors gracefully', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

  const { error, fetchData } = useBadges()
  await fetchData()

  expect(error.value).toBe('Failed to load badges')
})
```

## Related Documentation

- [Architecture Overview](../architecture/overview.md)
- [Frontend Architecture](../architecture/frontend-architecture.md)
- [Backend Architecture](../architecture/backend-architecture.md)
