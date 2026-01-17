import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

// Mock JWT service - must be before any imports that use it
vi.mock('../../services/jwt', () => ({
  JWTService: vi.fn().mockImplementation(() => ({
    generatePlatformToken: vi.fn(() => 'mock-platform-token'),
    verifyToken: vi.fn(() => ({
      sub: 'test-user',
      platformId: 'urn:uuid:a504d862-bd64-4e0d-acff-db7955955bc1',
      displayName: 'Test User',
      email: 'test@example.com',
      metadata: { isAdmin: true },
    })),
    createOpenBadgesApiClient: vi.fn(() => ({
      token: 'mock-jwt-token',
      headers: {
        Authorization: 'Bearer mock-jwt-token',
        'Content-Type': 'application/json',
      },
    })),
  })),
  jwtService: {
    generatePlatformToken: vi.fn(() => 'mock-platform-token'),
    verifyToken: vi.fn(() => ({
      sub: 'test-user',
      platformId: 'urn:uuid:a504d862-bd64-4e0d-acff-db7955955bc1',
      displayName: 'Test User',
      email: 'test@example.com',
      metadata: { isAdmin: true },
    })),
    createOpenBadgesApiClient: vi.fn(() => ({
      token: 'mock-jwt-token',
      headers: {
        Authorization: 'Bearer mock-jwt-token',
        'Content-Type': 'application/json',
      },
    })),
  },
}))

// Mock userService
vi.mock('../../services/user', () => ({
  userService: {
    getOAuthProvidersByUser: vi.fn(),
    getUserById: vi.fn(),
  },
}))

// Mock userSyncService
vi.mock('../../services/userSync', () => ({
  userSyncService: {
    syncUser: vi.fn(),
    getBadgeServerUserProfile: vi.fn(),
  },
}))

// Mock auth middleware
vi.mock('../../middleware/auth', () => ({
  requireAuth: vi.fn((c: any, next: any) => next()),
  requireAdmin: vi.fn((c: any, next: any) => next()),
  requireSelfOrAdminFromParam: vi.fn(() => (c: any, next: any) => next()),
}))

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { authRoutes } from '../auth'
import { jwtService } from '../../services/jwt'
import { userService } from '../../services/user'
import { userSyncService } from '../../services/userSync'

function createApp() {
  const app = new Hono()
  app.route('/auth', authRoutes)
  return app
}

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /auth/validate', () => {
    it('should validate valid JWT token', async () => {
      const mockPayload = { sub: 'user-123', email: 'test@example.com' }
      vi.mocked(jwtService.verifyToken).mockReturnValue(mockPayload as any)

      const app = createApp()
      const res = await app.request('/auth/validate', {
        headers: { Authorization: 'Bearer valid-token' },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.payload).toEqual(mockPayload)
      expect(jwtService.verifyToken).toHaveBeenCalledWith('valid-token')
    })

    it('should return 401 for missing Authorization header', async () => {
      const app = createApp()
      const res = await app.request('/auth/validate')

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Missing token')
    })

    it('should return 401 for non-Bearer token', async () => {
      const app = createApp()
      const res = await app.request('/auth/validate', {
        headers: { Authorization: 'Basic credentials' },
      })

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Missing token')
    })

    it('should return 401 for invalid token', async () => {
      vi.mocked(jwtService.verifyToken).mockReturnValue(null as any)

      const app = createApp()
      const res = await app.request('/auth/validate', {
        headers: { Authorization: 'Bearer invalid-token' },
      })

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid token')
    })

    it('should return 500 on verification errors', async () => {
      vi.mocked(jwtService.verifyToken).mockImplementation(() => {
        throw new Error('Verification failed')
      })

      const app = createApp()
      const res = await app.request('/auth/validate', {
        headers: { Authorization: 'Bearer error-token' },
      })

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Validation error')
    })
  })

  describe('POST /auth/platform-token', () => {
    it('should generate platform token for valid user', async () => {
      vi.mocked(jwtService.createOpenBadgesApiClient).mockReturnValue({
        token: 'platform-token-123',
      } as any)

      const app = createApp()
      const res = await app.request('/auth/platform-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: {
            id: 'user-123',
            email: 'test@example.com',
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
            isAdmin: false,
          },
        }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.token).toBe('platform-token-123')
      expect(data.platformId).toBeDefined()
    })

    it('should return 400 for invalid JSON body', async () => {
      const app = createApp()
      const res = await app.request('/auth/platform-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid JSON body')
    })

    it('should return 400 for missing user data', async () => {
      const app = createApp()
      const res = await app.request('/auth/platform-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid user data')
    })

    it('should return 400 for invalid email', async () => {
      const app = createApp()
      const res = await app.request('/auth/platform-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: { id: 'user-123', email: 'not-an-email' },
        }),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid user data')
    })

    it('should return 500 on token generation errors', async () => {
      vi.mocked(jwtService.createOpenBadgesApiClient).mockImplementation(() => {
        throw new Error('Token generation failed')
      })

      const app = createApp()
      const res = await app.request('/auth/platform-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: { id: 'user-123', email: 'test@example.com' },
        }),
      })

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe('Failed to generate platform token')
    })
  })

  describe('POST /auth/oauth-token', () => {
    it('should return OAuth token for user with valid provider', async () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString()
      vi.mocked(userService!.getOAuthProvidersByUser).mockResolvedValue([
        {
          provider: 'github',
          access_token: 'github-token-123',
          token_expires_at: futureDate,
        },
      ] as any)

      const app = createApp()
      const res = await app.request('/auth/oauth-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-123' }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.access_token).toBe('github-token-123')
      expect(data.provider).toBe('github')
    })

    it('should return 400 for invalid JSON body', async () => {
      const app = createApp()
      const res = await app.request('/auth/oauth-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid JSON body')
    })

    it('should return 400 for missing userId', async () => {
      const app = createApp()
      const res = await app.request('/auth/oauth-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('User ID is required')
    })

    it('should return 404 when no OAuth providers found', async () => {
      vi.mocked(userService!.getOAuthProvidersByUser).mockResolvedValue([])

      const app = createApp()
      const res = await app.request('/auth/oauth-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-123' }),
      })

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('No OAuth providers found for user')
    })

    it('should return 401 for expired token', async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString()
      vi.mocked(userService!.getOAuthProvidersByUser).mockResolvedValue([
        {
          provider: 'github',
          access_token: 'expired-token',
          token_expires_at: pastDate,
        },
      ] as any)

      const app = createApp()
      const res = await app.request('/auth/oauth-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-123' }),
      })

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('OAuth token expired')
    })

    it('should return 500 on service errors', async () => {
      vi.mocked(userService!.getOAuthProvidersByUser).mockRejectedValue(new Error('Database error'))

      const app = createApp()
      const res = await app.request('/auth/oauth-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-123' }),
      })

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe('Failed to get OAuth token')
    })
  })

  describe('POST /auth/oauth-token/refresh', () => {
    it('should return 400 for GitHub tokens (no refresh support)', async () => {
      vi.mocked(userService!.getOAuthProvidersByUser).mockResolvedValue([
        {
          provider: 'github',
          access_token: 'github-token',
          refresh_token: 'refresh-token',
        },
      ] as any)

      const app = createApp()
      const res = await app.request('/auth/oauth-token/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-123' }),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('GitHub tokens cannot be refreshed')
    })

    it('should return 400 for missing refresh token', async () => {
      vi.mocked(userService!.getOAuthProvidersByUser).mockResolvedValue([
        {
          provider: 'google',
          access_token: 'google-token',
          refresh_token: null,
        },
      ] as any)

      const app = createApp()
      const res = await app.request('/auth/oauth-token/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-123' }),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('No refresh token available')
    })

    it('should return 404 when no OAuth providers found', async () => {
      vi.mocked(userService!.getOAuthProvidersByUser).mockResolvedValue([])

      const app = createApp()
      const res = await app.request('/auth/oauth-token/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-123' }),
      })

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('No OAuth providers found for user')
    })

    it('should return 400 for invalid JSON body', async () => {
      const app = createApp()
      const res = await app.request('/auth/oauth-token/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid JSON body')
    })

    it('should return 500 on service errors', async () => {
      vi.mocked(userService!.getOAuthProvidersByUser).mockRejectedValue(new Error('Database error'))

      const app = createApp()
      const res = await app.request('/auth/oauth-token/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-123' }),
      })

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe('Failed to refresh OAuth token')
    })
  })

  describe('POST /auth/sync-user', () => {
    it('should sync user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
      }
      const syncResult = {
        success: true,
        user: { id: 'badge-user-123', email: 'test@example.com' },
        created: false,
        updated: true,
      }
      vi.mocked(userService!.getUserById).mockResolvedValue(mockUser as any)
      vi.mocked(userSyncService.syncUser).mockResolvedValue(syncResult as any)

      const app = createApp()
      const res = await app.request('/auth/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-123' }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.updated).toBe(true)
    })

    it('should return 404 when user not found', async () => {
      vi.mocked(userService!.getUserById).mockResolvedValue(null)

      const app = createApp()
      const res = await app.request('/auth/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'nonexistent' }),
      })

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('User not found')
    })

    it('should return 400 for invalid JSON body', async () => {
      const app = createApp()
      const res = await app.request('/auth/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid JSON body')
    })

    it('should return 400 for missing userId', async () => {
      const app = createApp()
      const res = await app.request('/auth/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('User ID is required')
    })

    it('should return 500 when sync fails', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      vi.mocked(userService!.getUserById).mockResolvedValue(mockUser as any)
      vi.mocked(userSyncService.syncUser).mockResolvedValue({
        success: false,
        error: 'Badge server unavailable',
      } as any)

      const app = createApp()
      const res = await app.request('/auth/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-123' }),
      })

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Badge server unavailable')
    })

    it('should return 500 on service errors', async () => {
      vi.mocked(userService!.getUserById).mockRejectedValue(new Error('Database error'))

      const app = createApp()
      const res = await app.request('/auth/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-123' }),
      })

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe('Failed to sync user')
    })
  })

  describe('GET /auth/badge-server-profile/:userId', () => {
    it('should return badge server profile', async () => {
      const mockProfile = {
        id: 'badge-user-123',
        email: 'test@example.com',
        name: 'Test User',
      }
      vi.mocked(userSyncService.getBadgeServerUserProfile).mockResolvedValue(mockProfile as any)

      const app = createApp()
      const res = await app.request('/auth/badge-server-profile/user-123')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.profile).toEqual(mockProfile)
    })

    it('should return 404 when profile not found', async () => {
      vi.mocked(userSyncService.getBadgeServerUserProfile).mockResolvedValue(null as any)

      const app = createApp()
      const res = await app.request('/auth/badge-server-profile/nonexistent')

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Profile not found')
    })

    it('should return 500 on service errors', async () => {
      vi.mocked(userSyncService.getBadgeServerUserProfile).mockRejectedValue(
        new Error('Badge server error')
      )

      const app = createApp()
      const res = await app.request('/auth/badge-server-profile/user-123')

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe('Failed to get profile')
    })
  })
})
