import { beforeEach, vi } from 'vitest'

// Mock localStorage in a jsdom-friendly way
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

if (typeof window !== 'undefined') {
  try {
    // If localStorage exists, replace its methods only
    if (window.localStorage) {
      Object.assign(window.localStorage, localStorageMock)
    } else {
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        configurable: true,
        writable: true,
      })
    }
  } catch {
    // Fallback: define on globalThis if direct assignment fails
    Object.defineProperty(globalThis as unknown as object, 'localStorage', {
      value: localStorageMock,
      configurable: true,
      writable: true,
    })
  }
}

// Mock WebAuthn API safely
if (typeof window !== 'undefined') {
  const existingNavigator = window.navigator || ({} as globalThis.Navigator)
  const credentials = existingNavigator.credentials || ({} as globalThis.CredentialsContainer)
  if (!('create' in credentials)) {
    // @ts-expect-error partial mock is fine for tests
    credentials.create = vi.fn()
  }
  if (!('get' in credentials)) {
    // @ts-expect-error partial mock is fine for tests
    credentials.get = vi.fn()
  }
  Object.defineProperty(window, 'navigator', {
    value: {
      ...existingNavigator,
      credentials,
    },
    configurable: true,
  })
}

// Mock fetch
global.fetch = vi.fn()

// Clear all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  localStorageMock.getItem.mockReturnValue(null)
})
