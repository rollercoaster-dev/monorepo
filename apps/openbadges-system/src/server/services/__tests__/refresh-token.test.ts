import { describe, it, expect, beforeEach, vi } from 'vitest'
import crypto from 'crypto'

const { mockUserService } = vi.hoisted(() => ({
  mockUserService: {
    storeRefreshToken: vi.fn(),
    getRefreshTokenByHash: vi.fn(),
    cleanupExpiredRefreshTokens: vi.fn(),
    consumeRefreshToken: vi.fn(),
    revokeRefreshToken: vi.fn(),
    revokeAllUserRefreshTokens: vi.fn(),
    getUserById: vi.fn(),
  },
}))

vi.mock('../user', () => ({
  userService: mockUserService,
}))

vi.mock('../jwt', () => ({
  jwtService: {
    generatePlatformToken: vi.fn(() => 'mock-access-token'),
  },
}))

vi.mock('../../utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { issueTokenPair, rotateRefreshToken, revokeRefreshToken } from '../refresh-token'

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

const mockUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  isAdmin: false,
  isActive: true,
  roles: ['USER'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('Refresh Token Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('issueTokenPair', () => {
    it('returns an access token and refresh token', async () => {
      mockUserService.storeRefreshToken.mockResolvedValue({})

      const result = await issueTokenPair(mockUser)

      expect(result.accessToken).toBe('mock-access-token')
      expect(result.refreshToken).toBeTruthy()
      expect(typeof result.refreshToken).toBe('string')
    })

    it('stores the refresh token hash in the database', async () => {
      mockUserService.storeRefreshToken.mockResolvedValue({})

      const result = await issueTokenPair(mockUser)

      expect(mockUserService.storeRefreshToken).toHaveBeenCalledOnce()
      const callArgs = mockUserService.storeRefreshToken.mock.calls[0]!
      const [userId, storedHash, expiresAt] = callArgs
      expect(userId).toBe('user-1')
      // Verify the stored hash matches the returned token
      expect(storedHash).toBe(hashToken(result.refreshToken))
      // Verify expiry is approximately 7 days from now
      const expiresDate = new Date(expiresAt)
      const expectedMs = 7 * 24 * 60 * 60 * 1000
      expect(expiresDate.getTime() - Date.now()).toBeGreaterThan(expectedMs - 60000)
      expect(expiresDate.getTime() - Date.now()).toBeLessThan(expectedMs + 60000)
    })
  })

  describe('rotateRefreshToken', () => {
    it('returns null for unknown token', async () => {
      mockUserService.getRefreshTokenByHash.mockResolvedValue(null)

      const result = await rotateRefreshToken('unknown-token')
      expect(result).toBeNull()
    })

    it('returns null when a revoked token is reused', async () => {
      mockUserService.getRefreshTokenByHash.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: 'some-hash',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        revokedAt: new Date().toISOString(), // Already revoked
        revokedReason: 'rotated',
        createdAt: new Date().toISOString(),
      })

      const result = await rotateRefreshToken('stolen-token')

      expect(result).toBeNull()
      expect(mockUserService.consumeRefreshToken).not.toHaveBeenCalled()
    })

    it('returns null for expired token and revokes it', async () => {
      mockUserService.getRefreshTokenByHash.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: 'some-hash',
        expiresAt: new Date(Date.now() - 1000).toISOString(), // Expired
        revokedAt: null,
        revokedReason: null,
        createdAt: new Date().toISOString(),
      })

      const result = await rotateRefreshToken('expired-token')

      expect(result).toBeNull()
      expect(mockUserService.revokeRefreshToken).toHaveBeenCalledWith(
        hashToken('expired-token'),
        'expired'
      )
    })

    it('returns null if user no longer exists', async () => {
      mockUserService.getRefreshTokenByHash.mockResolvedValue({
        id: 'rt-1',
        userId: 'deleted-user',
        tokenHash: 'some-hash',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        revokedAt: null,
        revokedReason: null,
        createdAt: new Date().toISOString(),
      })
      mockUserService.getUserById.mockResolvedValue(null)
      mockUserService.consumeRefreshToken.mockResolvedValue(true)

      const result = await rotateRefreshToken('valid-token')

      expect(result).toBeNull()
      expect(mockUserService.consumeRefreshToken).toHaveBeenCalled()
    })

    it('rotates successfully: revokes old token and issues new pair', async () => {
      const oldToken = 'old-refresh-token'
      const oldHash = hashToken(oldToken)

      mockUserService.getRefreshTokenByHash.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: oldHash,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        revokedAt: null,
        revokedReason: null,
        createdAt: new Date().toISOString(),
      })
      mockUserService.consumeRefreshToken.mockResolvedValue(true)
      mockUserService.getUserById.mockResolvedValue(mockUser)
      mockUserService.storeRefreshToken.mockResolvedValue({})

      const result = await rotateRefreshToken(oldToken)

      expect(result).not.toBeNull()
      expect(result!.accessToken).toBe('mock-access-token')
      expect(result!.refreshToken).toBeTruthy()
      expect(mockUserService.consumeRefreshToken).toHaveBeenCalledWith(oldHash, 'rotated')
      // New token should be stored
      expect(mockUserService.storeRefreshToken).toHaveBeenCalledOnce()
    })

    it('returns null when another request already consumed the token', async () => {
      const oldToken = 'old-refresh-token'

      mockUserService.getRefreshTokenByHash.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: hashToken(oldToken),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        revokedAt: null,
        revokedReason: null,
        createdAt: new Date().toISOString(),
      })
      mockUserService.consumeRefreshToken.mockResolvedValue(false)

      const result = await rotateRefreshToken(oldToken)

      expect(result).toBeNull()
      expect(mockUserService.storeRefreshToken).not.toHaveBeenCalled()
    })
  })

  describe('revokeRefreshToken', () => {
    it('revokes the token by hash', async () => {
      const token = 'token-to-revoke'
      await revokeRefreshToken(token)

      expect(mockUserService.revokeRefreshToken).toHaveBeenCalledWith(hashToken(token), 'logout')
    })
  })
})
