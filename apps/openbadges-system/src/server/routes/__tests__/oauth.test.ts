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

// Mock OAuth service
vi.mock('../../services/oauth', () => ({
  OAuthService: vi.fn(),
  oauthService: {
    generateCodeVerifier: vi.fn(),
    createCodeChallenge: vi.fn(),
    createOAuthSession: vi.fn(),
    getGitHubAuthUrl: vi.fn(),
    getOAuthSession: vi.fn(),
    exchangeCodeForToken: vi.fn(),
    getUserProfile: vi.fn(),
    findUserByOAuthProvider: vi.fn(),
    linkOAuthProvider: vi.fn(),
    createUserFromOAuth: vi.fn(),
    removeOAuthSession: vi.fn(),
    cleanupExpiredSessions: vi.fn(),
  },
}))

// Mock userService
vi.mock('../../services/user', () => ({
  userService: {
    getOAuthProvidersByUser: vi.fn(),
    getUserById: vi.fn(),
    getUserByEmail: vi.fn(),
    getOAuthProvider: vi.fn(),
    updateOAuthProvider: vi.fn(),
    removeOAuthProvider: vi.fn(),
  },
}))

// Mock userSyncService
vi.mock('../../services/userSync', () => ({
  userSyncService: {
    syncUser: vi.fn(),
  },
}))

// Mock auth middleware
vi.mock('../../middleware/auth', () => ({
  requireAuth: vi.fn((c: any, next: any) => next()),
  requireAdmin: vi.fn((c: any, next: any) => next()),
  getAuthPayload: vi.fn(() => ({
    sub: 'test-user',
    metadata: { isAdmin: true },
  })),
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

import { oauthRoutes } from '../oauth'
import { oauthService } from '../../services/oauth'
import { userService } from '../../services/user'
import { userSyncService } from '../../services/userSync'
import { getAuthPayload } from '../../middleware/auth'

function createApp() {
  const app = new Hono()
  app.route('/oauth', oauthRoutes)
  return app
}

describe('OAuth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /oauth/providers', () => {
    it('should return available OAuth providers', async () => {
      const app = createApp()
      const res = await app.request('/oauth/providers')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.providers).toContain('github')
    })
  })

  describe('GET /oauth/github', () => {
    it('should initialize GitHub OAuth flow', async () => {
      vi.mocked(oauthService.generateCodeVerifier).mockReturnValue('test-verifier')
      vi.mocked(oauthService.createCodeChallenge).mockResolvedValue('test-challenge')
      vi.mocked(oauthService.createOAuthSession).mockResolvedValue({
        state: 'test-state',
        session: { id: '1', state: 'test-state', provider: 'github' } as any,
      })
      vi.mocked(oauthService.getGitHubAuthUrl).mockReturnValue(
        'https://github.com/login/oauth/authorize?state=test-state'
      )

      const app = createApp()
      const res = await app.request('/oauth/github')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.authUrl).toContain('github.com/login/oauth/authorize')
      expect(data.state).toBe('test-state')
    })

    it('should include redirect_uri in OAuth session', async () => {
      vi.mocked(oauthService.generateCodeVerifier).mockReturnValue('test-verifier')
      vi.mocked(oauthService.createCodeChallenge).mockResolvedValue('test-challenge')
      vi.mocked(oauthService.createOAuthSession).mockResolvedValue({
        state: 'test-state',
        session: { id: '1', state: 'test-state', provider: 'github' } as any,
      })
      vi.mocked(oauthService.getGitHubAuthUrl).mockReturnValue(
        'https://github.com/login/oauth/authorize?state=test-state'
      )

      const app = createApp()
      const res = await app.request('/oauth/github?redirect_uri=/dashboard')

      expect(res.status).toBe(200)
      expect(oauthService.createOAuthSession).toHaveBeenCalledWith(
        'github',
        '/dashboard',
        'test-verifier'
      )
    })

    it('should return 500 on OAuth initialization errors', async () => {
      vi.mocked(oauthService.generateCodeVerifier).mockImplementation(() => {
        throw new Error('PKCE generation failed')
      })

      const app = createApp()
      const res = await app.request('/oauth/github')

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to initialize GitHub OAuth')
    })
  })

  describe('GET /oauth/github/callback', () => {
    it('should return 400 if GitHub returns error', async () => {
      const app = createApp()
      const res = await app.request('/oauth/github/callback?error=access_denied')

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('access_denied')
    })

    it('should return 400 for missing code or state', async () => {
      const app = createApp()
      const res = await app.request('/oauth/github/callback')

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Missing code or state parameter')
    })

    it('should return 400 for invalid session', async () => {
      vi.mocked(oauthService.getOAuthSession).mockResolvedValue(null)

      const app = createApp()
      const res = await app.request('/oauth/github/callback?code=test-code&state=invalid-state')

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid or expired OAuth session')
    })

    it('should handle successful OAuth callback for existing user (API request)', async () => {
      const mockSession = {
        id: '1',
        state: 'test-state',
        provider: 'github',
        redirect_uri: '/dashboard',
        code_verifier: 'test-verifier',
      }
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        avatar: 'https://avatar.url',
        roles: ['USER'],
      }
      const mockProfile = {
        id: '12345',
        login: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: 'https://avatar.url',
      }

      vi.mocked(oauthService.getOAuthSession).mockResolvedValue(mockSession as any)
      vi.mocked(oauthService.exchangeCodeForToken).mockResolvedValue({
        access_token: 'github-token',
        expires_in: 3600,
      })
      vi.mocked(oauthService.getUserProfile).mockResolvedValue(mockProfile)
      vi.mocked(oauthService.findUserByOAuthProvider).mockResolvedValue(mockUser as any)
      vi.mocked(userService!.getOAuthProvider).mockResolvedValue({
        id: 'oauth-1',
        provider: 'github',
      } as any)
      vi.mocked(userService!.updateOAuthProvider).mockResolvedValue(true)
      vi.mocked(userSyncService.syncUser).mockResolvedValue({
        success: true,
        created: false,
      } as any)

      const app = createApp()
      const res = await app.request('/oauth/github/callback?code=test-code&state=test-state', {
        headers: { Accept: 'application/json' },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.user).toBeDefined()
      expect(data.token).toBe('mock-platform-token')
      expect(oauthService.removeOAuthSession).toHaveBeenCalledWith('test-state')
    })

    it('should handle successful OAuth callback for new user', async () => {
      const mockSession = {
        id: '1',
        state: 'test-state',
        provider: 'github',
        redirect_uri: '/dashboard',
        code_verifier: 'test-verifier',
      }
      const mockProfile = {
        id: '12345',
        login: 'newuser',
        email: 'new@example.com',
        name: 'New User',
        avatar_url: 'https://avatar.url',
      }
      const mockNewUser = {
        id: 'user-456',
        username: 'newuser',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        avatar: 'https://avatar.url',
        roles: ['USER'],
      }

      vi.mocked(oauthService.getOAuthSession).mockResolvedValue(mockSession as any)
      vi.mocked(oauthService.exchangeCodeForToken).mockResolvedValue({
        access_token: 'github-token',
      })
      vi.mocked(oauthService.getUserProfile).mockResolvedValue(mockProfile)
      vi.mocked(oauthService.findUserByOAuthProvider).mockResolvedValue(null)
      vi.mocked(userService!.getUserByEmail).mockResolvedValue(null)
      vi.mocked(oauthService.createUserFromOAuth).mockResolvedValue({
        user: mockNewUser as any,
        oauthProvider: {} as any,
      })
      vi.mocked(userSyncService.syncUser).mockResolvedValue({ success: true, created: true } as any)

      const app = createApp()
      const res = await app.request('/oauth/github/callback?code=test-code&state=test-state', {
        headers: { Accept: 'application/json' },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.user.id).toBe('user-456')
    })

    it('should link OAuth to existing user with same email', async () => {
      const mockSession = {
        id: '1',
        state: 'test-state',
        provider: 'github',
        redirect_uri: '/',
        code_verifier: 'test-verifier',
      }
      const mockProfile = {
        id: '12345',
        login: 'existinguser',
        email: 'existing@example.com',
        name: 'Existing User',
      }
      const existingUser = {
        id: 'user-existing',
        username: 'existinguser',
        email: 'existing@example.com',
        firstName: 'Existing',
        lastName: 'User',
        roles: ['USER'],
      }

      vi.mocked(oauthService.getOAuthSession).mockResolvedValue(mockSession as any)
      vi.mocked(oauthService.exchangeCodeForToken).mockResolvedValue({
        access_token: 'github-token',
      })
      vi.mocked(oauthService.getUserProfile).mockResolvedValue(mockProfile)
      vi.mocked(oauthService.findUserByOAuthProvider).mockResolvedValue(null)
      vi.mocked(userService!.getUserByEmail).mockResolvedValue(existingUser as any)
      vi.mocked(oauthService.linkOAuthProvider).mockResolvedValue({} as any)
      vi.mocked(userSyncService.syncUser).mockResolvedValue({ success: true } as any)

      const app = createApp()
      const res = await app.request('/oauth/github/callback?code=test-code&state=test-state', {
        headers: { Accept: 'application/json' },
      })

      expect(res.status).toBe(200)
      expect(oauthService.linkOAuthProvider).toHaveBeenCalled()
    })

    it('should redirect for browser requests', async () => {
      const mockSession = {
        id: '1',
        state: 'test-state',
        provider: 'github',
        redirect_uri: '/dashboard',
        code_verifier: 'test-verifier',
      }
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: ['USER'],
      }
      const mockProfile = {
        id: '12345',
        login: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
      }

      vi.mocked(oauthService.getOAuthSession).mockResolvedValue(mockSession as any)
      vi.mocked(oauthService.exchangeCodeForToken).mockResolvedValue({
        access_token: 'github-token',
      })
      vi.mocked(oauthService.getUserProfile).mockResolvedValue(mockProfile)
      vi.mocked(oauthService.findUserByOAuthProvider).mockResolvedValue(mockUser as any)
      vi.mocked(userService!.getOAuthProvider).mockResolvedValue({ id: 'oauth-1' } as any)
      vi.mocked(userSyncService.syncUser).mockResolvedValue({ success: true } as any)

      const app = createApp()
      const res = await app.request('/oauth/github/callback?code=test-code&state=test-state', {
        headers: { Accept: 'text/html' },
      })

      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toContain('/auth/oauth/callback')
    })

    it('should return 500 on token exchange error', async () => {
      const mockSession = {
        id: '1',
        state: 'test-state',
        provider: 'github',
        code_verifier: 'test-verifier',
      }

      vi.mocked(oauthService.getOAuthSession).mockResolvedValue(mockSession as any)
      vi.mocked(oauthService.exchangeCodeForToken).mockRejectedValue(
        new Error('GitHub token exchange failed')
      )

      const app = createApp()
      const res = await app.request('/oauth/github/callback?code=test-code&state=test-state')

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('token exchange failed')
    })

    it('should handle user sync failures gracefully', async () => {
      const mockSession = {
        id: '1',
        state: 'test-state',
        provider: 'github',
        redirect_uri: '/',
        code_verifier: 'test-verifier',
      }
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: ['USER'],
      }
      const mockProfile = {
        id: '12345',
        login: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
      }

      vi.mocked(oauthService.getOAuthSession).mockResolvedValue(mockSession as any)
      vi.mocked(oauthService.exchangeCodeForToken).mockResolvedValue({
        access_token: 'github-token',
      })
      vi.mocked(oauthService.getUserProfile).mockResolvedValue(mockProfile)
      vi.mocked(oauthService.findUserByOAuthProvider).mockResolvedValue(mockUser as any)
      vi.mocked(userService!.getOAuthProvider).mockResolvedValue({ id: 'oauth-1' } as any)
      vi.mocked(userSyncService.syncUser).mockRejectedValue(new Error('Sync failed'))

      const app = createApp()
      const res = await app.request('/oauth/github/callback?code=test-code&state=test-state', {
        headers: { Accept: 'application/json' },
      })

      // Should still succeed even if sync fails
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })
  })

  describe('DELETE /oauth/:provider', () => {
    it('should unlink OAuth provider for authorized user', async () => {
      vi.mocked(getAuthPayload).mockReturnValue({
        sub: 'user-123',
        metadata: { isAdmin: false },
      } as any)
      vi.mocked(userService!.removeOAuthProvider).mockResolvedValue(true)

      const app = createApp()
      const res = await app.request('/oauth/github?user_id=user-123', {
        method: 'DELETE',
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.message).toContain('unlinked successfully')
    })

    it('should allow admin to unlink any user provider', async () => {
      vi.mocked(getAuthPayload).mockReturnValue({
        sub: 'admin-user',
        metadata: { isAdmin: true },
      } as any)
      vi.mocked(userService!.removeOAuthProvider).mockResolvedValue(true)

      const app = createApp()
      const res = await app.request('/oauth/github?user_id=other-user', {
        method: 'DELETE',
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })

    it('should return 400 for missing user_id', async () => {
      const app = createApp()
      const res = await app.request('/oauth/github', {
        method: 'DELETE',
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('User ID required')
    })

    it('should return 403 for unauthorized access', async () => {
      vi.mocked(getAuthPayload).mockReturnValue({
        sub: 'user-123',
        metadata: { isAdmin: false },
      } as any)

      const app = createApp()
      const res = await app.request('/oauth/github?user_id=other-user', {
        method: 'DELETE',
      })

      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('Forbidden')
    })

    it('should return 500 on service errors', async () => {
      vi.mocked(getAuthPayload).mockReturnValue({
        sub: 'user-123',
        metadata: { isAdmin: false },
      } as any)
      vi.mocked(userService!.removeOAuthProvider).mockRejectedValue(new Error('Database error'))

      const app = createApp()
      const res = await app.request('/oauth/github?user_id=user-123', {
        method: 'DELETE',
      })

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to unlink OAuth provider')
    })
  })

  describe('GET /oauth/user/:userId/providers', () => {
    it('should return user OAuth providers for self', async () => {
      vi.mocked(getAuthPayload).mockReturnValue({
        sub: 'user-123',
        metadata: { isAdmin: false },
      } as any)
      vi.mocked(userService!.getOAuthProvider).mockResolvedValue({
        provider: 'github',
        profile_data: JSON.stringify({ login: 'testuser' }),
        created_at: '2024-01-01T00:00:00Z',
      } as any)

      const app = createApp()
      const res = await app.request('/oauth/user/user-123/providers')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.providers).toHaveLength(1)
      expect(data.providers[0].provider).toBe('github')
      expect(data.providers[0].linked).toBe(true)
    })

    it('should allow admin to view any user providers', async () => {
      vi.mocked(getAuthPayload).mockReturnValue({
        sub: 'admin-user',
        metadata: { isAdmin: true },
      } as any)
      vi.mocked(userService!.getOAuthProvider).mockResolvedValue(null)

      const app = createApp()
      const res = await app.request('/oauth/user/other-user/providers')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.providers).toHaveLength(0)
    })

    it('should return 403 for unauthorized access', async () => {
      vi.mocked(getAuthPayload).mockReturnValue({
        sub: 'user-123',
        metadata: { isAdmin: false },
      } as any)

      const app = createApp()
      const res = await app.request('/oauth/user/other-user/providers')

      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('Forbidden')
    })

    it('should return 500 on service errors', async () => {
      vi.mocked(getAuthPayload).mockReturnValue({
        sub: 'user-123',
        metadata: { isAdmin: true },
      } as any)
      vi.mocked(userService!.getOAuthProvider).mockRejectedValue(new Error('Database error'))

      const app = createApp()
      const res = await app.request('/oauth/user/user-123/providers')

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to get OAuth providers')
    })
  })

  describe('POST /oauth/cleanup', () => {
    it('should cleanup expired OAuth sessions', async () => {
      vi.mocked(oauthService.cleanupExpiredSessions).mockResolvedValue(undefined)

      const app = createApp()
      const res = await app.request('/oauth/cleanup', {
        method: 'POST',
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.message).toContain('cleaned up')
      expect(oauthService.cleanupExpiredSessions).toHaveBeenCalled()
    })

    it('should return 500 on cleanup errors', async () => {
      vi.mocked(oauthService.cleanupExpiredSessions).mockRejectedValue(new Error('Cleanup failed'))

      const app = createApp()
      const res = await app.request('/oauth/cleanup', {
        method: 'POST',
      })

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to cleanup OAuth sessions')
    })
  })
})
