import { describe, it, expect, beforeEach, vi } from 'vitest'
import crypto from 'crypto'

const { mockRefreshTokenRepository, mockUserService } = vi.hoisted(() => ({
  mockRefreshTokenRepository: {
    store: vi.fn(),
    findByHash: vi.fn(),
    deleteExpired: vi.fn(),
    consume: vi.fn(),
    revoke: vi.fn(),
    revokeAllForUser: vi.fn(),
  },
  mockUserService: {
    getUserById: vi.fn(),
  },
}))

vi.mock('../../../../database/repositories', () => ({
  RefreshTokenRepository: vi.fn(() => mockRefreshTokenRepository),
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
      mockRefreshTokenRepository.store.mockResolvedValue({})

      const result = await issueTokenPair(mockUser)

      expect(result.accessToken).toBe('mock-access-token')
      expect(result.refreshToken).toBeTruthy()
      expect(typeof result.refreshToken).toBe('string')
    })

    it('stores the refresh token hash in the database', async () => {
      mockRefreshTokenRepository.store.mockResolvedValue({})

      const result = await issueTokenPair(mockUser)

      expect(mockRefreshTokenRepository.store).toHaveBeenCalledOnce()
      const callArgs = mockRefreshTokenRepository.store.mock.calls[0]!
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
      mockRefreshTokenRepository.findByHash.mockResolvedValue(null)

      const result = await rotateRefreshToken('unknown-token')
      expect(result).toBeNull()
    })

    it('returns null without global revocation during the rotation grace window', async () => {
      mockRefreshTokenRepository.findByHash.mockResolvedValue({
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
      expect(mockRefreshTokenRepository.consume).not.toHaveBeenCalled()
      expect(mockRefreshTokenRepository.revokeAllForUser).not.toHaveBeenCalled()
    })

    it('revokes all active refresh tokens when revoked token reuse looks suspicious', async () => {
      mockRefreshTokenRepository.findByHash.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: 'some-hash',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        revokedAt: new Date(Date.now() - 10_000).toISOString(),
        revokedReason: 'logout',
        createdAt: new Date().toISOString(),
      })

      const result = await rotateRefreshToken('stolen-token')

      expect(result).toBeNull()
      expect(mockRefreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(
        'user-1',
        'compromised'
      )
    })

    it('returns null for expired token and revokes it', async () => {
      mockRefreshTokenRepository.findByHash.mockResolvedValue({
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
      expect(mockRefreshTokenRepository.revoke).toHaveBeenCalledWith(
        hashToken('expired-token'),
        'expired'
      )
    })

    it('returns null if user no longer exists', async () => {
      mockRefreshTokenRepository.findByHash.mockResolvedValue({
        id: 'rt-1',
        userId: 'deleted-user',
        tokenHash: 'some-hash',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        revokedAt: null,
        revokedReason: null,
        createdAt: new Date().toISOString(),
      })
      mockUserService.getUserById.mockResolvedValue(null)
      mockRefreshTokenRepository.consume.mockResolvedValue(true)

      const result = await rotateRefreshToken('valid-token')

      expect(result).toBeNull()
      expect(mockRefreshTokenRepository.consume).toHaveBeenCalled()
    })

    it('rotates successfully: revokes old token and issues new pair', async () => {
      const oldToken = 'old-refresh-token'
      const oldHash = hashToken(oldToken)

      mockRefreshTokenRepository.findByHash.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: oldHash,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        revokedAt: null,
        revokedReason: null,
        createdAt: new Date().toISOString(),
      })
      mockRefreshTokenRepository.consume.mockResolvedValue(true)
      mockUserService.getUserById.mockResolvedValue(mockUser)
      mockRefreshTokenRepository.store.mockResolvedValue({})

      const result = await rotateRefreshToken(oldToken)

      expect(result).not.toBeNull()
      expect(result!.accessToken).toBe('mock-access-token')
      expect(result!.refreshToken).toBeTruthy()
      expect(mockRefreshTokenRepository.consume).toHaveBeenCalledWith(oldHash, 'rotated')
      // New token should be stored
      expect(mockRefreshTokenRepository.store).toHaveBeenCalledOnce()
    })

    it('returns null when another request already consumed the token', async () => {
      const oldToken = 'old-refresh-token'

      mockRefreshTokenRepository.findByHash.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash: hashToken(oldToken),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        revokedAt: null,
        revokedReason: null,
        createdAt: new Date().toISOString(),
      })
      mockRefreshTokenRepository.consume.mockResolvedValue(false)

      const result = await rotateRefreshToken(oldToken)

      expect(result).toBeNull()
      expect(mockRefreshTokenRepository.store).not.toHaveBeenCalled()
    })
  })

  describe('revokeRefreshToken', () => {
    it('revokes the token by hash', async () => {
      const token = 'token-to-revoke'
      await revokeRefreshToken(token)

      expect(mockRefreshTokenRepository.revoke).toHaveBeenCalledWith(hashToken(token), 'logout')
    })
  })
})
