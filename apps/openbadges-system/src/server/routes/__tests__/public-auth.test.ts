import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'

// Mock challenge service
vi.mock('../../services/challenge', () => ({
  generateChallenge: vi.fn(() => 'mock-challenge-string'),
  consumeChallenge: vi.fn(() => ({ valid: true })),
}))

// Mock JWT service
vi.mock('../../services/jwt', () => ({
  jwtService: {
    generatePlatformToken: vi.fn(() => 'mock-jwt-token'),
    verifyToken: vi.fn(),
  },
}))

// Mock user service
vi.mock('../../services/user', () => ({
  userService: {
    getUserById: vi.fn(),
    getUserByUsername: vi.fn(),
    getUserByEmail: vi.fn(),
    getUserCredentials: vi.fn(),
    createUser: vi.fn(),
    addUserCredential: vi.fn(),
    updateUserCredential: vi.fn(),
  },
}))

// Mock @simplewebauthn/server
vi.mock('@simplewebauthn/server', () => ({
  verifyAuthenticationResponse: vi.fn(),
  verifyRegistrationResponse: vi.fn(),
}))

// Mock refresh token service
vi.mock('../../services/refresh-token', () => ({
  issueTokenPair: vi.fn(() =>
    Promise.resolve({ accessToken: 'mock-jwt-token', refreshToken: 'mock-refresh-token' })
  ),
  rotateRefreshToken: vi.fn(),
  revokeRefreshToken: vi.fn(() => Promise.resolve()),
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

import { publicAuthRoutes } from '../public-auth'
import { userService } from '../../services/user'
import { consumeChallenge } from '../../services/challenge'
import { jwtService } from '../../services/jwt'
import { rotateRefreshToken, revokeRefreshToken } from '../../services/refresh-token'
import { verifyAuthenticationResponse, verifyRegistrationResponse } from '@simplewebauthn/server'

const mockUser = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  avatar: null,
  createdAt: '2024-01-01T00:00:00Z',
  roles: ['USER'],
}

const mockCredential = {
  id: 'cred-abc',
  publicKey: 'dGVzdC1rZXk', // base64url encoded
  transports: ['internal'],
  counter: 5,
  name: 'Touch ID',
  type: 'platform',
}

function createApp() {
  const app = new Hono()
  app.route('/auth/public', publicAuthRoutes)
  return app
}

function jsonPost(body: unknown) {
  return {
    method: 'POST' as const,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

describe('Public Auth Routes', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  // --- Challenge Endpoints ---

  describe('GET /users/:id/challenge/authentication', () => {
    it('returns challenge, rpId, and timeout for valid user', async () => {
      vi.mocked(userService!.getUserById).mockResolvedValue(mockUser as never)

      const app = createApp()
      const res = await app.request('/auth/public/users/user-123/challenge/authentication')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.challenge).toBe('mock-challenge-string')
      expect(data.rpId).toBe('localhost')
      expect(data.timeout).toBe(60000)
    })

    it('returns 404 when user does not exist', async () => {
      vi.mocked(userService!.getUserById).mockResolvedValue(null as never)

      const app = createApp()
      const res = await app.request('/auth/public/users/nonexistent/challenge/authentication')

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('User not found')
    })

    it('returns 500 when userService throws', async () => {
      vi.mocked(userService!.getUserById).mockRejectedValue(new Error('DB error'))

      const app = createApp()
      const res = await app.request('/auth/public/users/user-123/challenge/authentication')

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe('Failed to generate challenge')
    })
  })

  describe('GET /users/:id/challenge/registration', () => {
    it('returns challenge, rpId, and timeout for valid user', async () => {
      vi.mocked(userService!.getUserById).mockResolvedValue(mockUser as never)

      const app = createApp()
      const res = await app.request('/auth/public/users/user-123/challenge/registration')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.challenge).toBe('mock-challenge-string')
      expect(data.rpId).toBe('localhost')
      expect(data.timeout).toBe(60000)
    })

    it('returns 404 when user does not exist', async () => {
      vi.mocked(userService!.getUserById).mockResolvedValue(null as never)

      const app = createApp()
      const res = await app.request('/auth/public/users/nonexistent/challenge/registration')

      expect(res.status).toBe(404)
    })
  })

  // --- Token Endpoint ---

  describe('POST /users/:id/token', () => {
    const validAssertionBody = {
      credentialId: 'cred-abc',
      authenticatorData: 'mock-auth-data',
      clientDataJSON: 'mock-client-data',
      signature: 'mock-signature',
      challenge: 'mock-challenge',
    }

    it('returns 400 when no body is sent', async () => {
      vi.mocked(userService!.getUserById).mockResolvedValue(mockUser as never)

      const app = createApp()
      const res = await app.request('/auth/public/users/user-123/token', {
        method: 'POST',
      })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Assertion data required')
    })

    it('returns 400 when body is missing required fields', async () => {
      vi.mocked(userService!.getUserById).mockResolvedValue(mockUser as never)

      const app = createApp()
      const res = await app.request(
        '/auth/public/users/user-123/token',
        jsonPost({ credentialId: 'abc' })
      )

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid assertion data')
    })

    it('returns 404 when user does not exist', async () => {
      vi.mocked(userService!.getUserById).mockResolvedValue(null as never)

      const app = createApp()
      const res = await app.request(
        '/auth/public/users/nonexistent/token',
        jsonPost(validAssertionBody)
      )

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('User not found')
    })

    it('returns 403 when challenge is invalid', async () => {
      vi.mocked(userService!.getUserById).mockResolvedValue(mockUser as never)
      vi.mocked(consumeChallenge).mockReturnValue({ valid: false, reason: 'not_found' })

      const app = createApp()
      const res = await app.request(
        '/auth/public/users/user-123/token',
        jsonPost(validAssertionBody)
      )

      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toBe('Invalid or expired challenge')
    })

    it('returns user-friendly message when challenge is expired', async () => {
      vi.mocked(userService!.getUserById).mockResolvedValue(mockUser as never)
      vi.mocked(consumeChallenge).mockReturnValue({ valid: false, reason: 'expired' })

      const app = createApp()
      const res = await app.request(
        '/auth/public/users/user-123/token',
        jsonPost(validAssertionBody)
      )

      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toBe('Challenge expired. Please try again.')
    })

    it('returns 404 when credential is not found', async () => {
      vi.mocked(userService!.getUserById).mockResolvedValue(mockUser as never)
      vi.mocked(consumeChallenge).mockReturnValue({ valid: true })
      vi.mocked(userService!.getUserCredentials).mockResolvedValue([])

      const app = createApp()
      const res = await app.request(
        '/auth/public/users/user-123/token',
        jsonPost(validAssertionBody)
      )

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('Credential not found')
    })

    it('returns 403 when verifyAuthenticationResponse throws', async () => {
      vi.mocked(userService!.getUserById).mockResolvedValue(mockUser as never)
      vi.mocked(consumeChallenge).mockReturnValue({ valid: true })
      vi.mocked(userService!.getUserCredentials).mockResolvedValue([mockCredential] as never)
      vi.mocked(verifyAuthenticationResponse).mockRejectedValue(new Error('Signature invalid'))

      const app = createApp()
      const res = await app.request(
        '/auth/public/users/user-123/token',
        jsonPost(validAssertionBody)
      )

      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toBe('Authentication verification failed')
    })

    it('returns 403 when verification returns verified: false', async () => {
      vi.mocked(userService!.getUserById).mockResolvedValue(mockUser as never)
      vi.mocked(consumeChallenge).mockReturnValue({ valid: true })
      vi.mocked(userService!.getUserCredentials).mockResolvedValue([mockCredential] as never)
      vi.mocked(verifyAuthenticationResponse).mockResolvedValue({ verified: false } as never)

      const app = createApp()
      const res = await app.request(
        '/auth/public/users/user-123/token',
        jsonPost(validAssertionBody)
      )

      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toBe('Authentication verification failed')
    })

    it('returns JWT when verification succeeds', async () => {
      vi.mocked(userService!.getUserById).mockResolvedValue(mockUser as never)
      vi.mocked(consumeChallenge).mockReturnValue({ valid: true })
      vi.mocked(userService!.getUserCredentials).mockResolvedValue([mockCredential] as never)
      vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
        verified: true,
        authenticationInfo: { newCounter: 6 },
      } as never)

      const app = createApp()
      const res = await app.request(
        '/auth/public/users/user-123/token',
        jsonPost(validAssertionBody)
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.token).toBe('mock-jwt-token')
      expect(data.platformId).toBeDefined()
    })

    it('updates credential counter after successful verification', async () => {
      vi.mocked(userService!.getUserById).mockResolvedValue(mockUser as never)
      vi.mocked(consumeChallenge).mockReturnValue({ valid: true })
      vi.mocked(userService!.getUserCredentials).mockResolvedValue([mockCredential] as never)
      vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
        verified: true,
        authenticationInfo: { newCounter: 42 },
      } as never)

      const app = createApp()
      await app.request('/auth/public/users/user-123/token', jsonPost(validAssertionBody))

      expect(userService!.updateUserCredential).toHaveBeenCalledWith(
        'user-123',
        'cred-abc',
        expect.objectContaining({ counter: 42 })
      )
    })
  })

  // --- Credential Registration Endpoint ---

  describe('POST /users/:id/credentials', () => {
    const validRegistrationBody = {
      id: 'new-cred-id',
      rawId: 'new-cred-raw-id',
      type: 'public-key',
      response: {
        attestationObject: 'mock-attestation',
        clientDataJSON: 'mock-client-data',
      },
      challenge: 'mock-challenge',
      name: 'My Passkey',
      authenticatorAttachment: 'platform',
      transports: ['internal'],
    }

    it('returns 404 when user does not exist', async () => {
      vi.mocked(userService!.getUserById).mockResolvedValue(null as never)

      const app = createApp()
      const res = await app.request(
        '/auth/public/users/nonexistent/credentials',
        jsonPost(validRegistrationBody)
      )

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('User not found')
    })

    it('returns 400 for invalid registration data (bootstrap)', async () => {
      vi.mocked(userService!.getUserById).mockResolvedValue(mockUser as never)
      vi.mocked(userService!.getUserCredentials).mockResolvedValue([] as never)

      const app = createApp()
      const res = await app.request(
        '/auth/public/users/user-123/credentials',
        jsonPost({ id: 'abc' })
      )

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Invalid registration data')
    })

    it('returns 403 when challenge is invalid (bootstrap)', async () => {
      vi.mocked(userService!.getUserById).mockResolvedValue(mockUser as never)
      vi.mocked(userService!.getUserCredentials).mockResolvedValue([] as never)
      vi.mocked(consumeChallenge).mockReturnValue({ valid: false, reason: 'not_found' })

      const app = createApp()
      const res = await app.request(
        '/auth/public/users/user-123/credentials',
        jsonPost(validRegistrationBody)
      )

      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toBe('Invalid or expired challenge')
    })

    it('returns 403 when verifyRegistrationResponse throws (bootstrap)', async () => {
      vi.mocked(userService!.getUserById).mockResolvedValue(mockUser as never)
      vi.mocked(userService!.getUserCredentials).mockResolvedValue([] as never)
      vi.mocked(consumeChallenge).mockReturnValue({ valid: true })
      vi.mocked(verifyRegistrationResponse).mockRejectedValue(new Error('Attestation invalid'))

      const app = createApp()
      const res = await app.request(
        '/auth/public/users/user-123/credentials',
        jsonPost(validRegistrationBody)
      )

      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toBe('Registration verification failed')
    })

    it('returns 403 when verification returns verified: false (bootstrap)', async () => {
      vi.mocked(userService!.getUserById).mockResolvedValue(mockUser as never)
      vi.mocked(userService!.getUserCredentials).mockResolvedValue([] as never)
      vi.mocked(consumeChallenge).mockReturnValue({ valid: true })
      vi.mocked(verifyRegistrationResponse).mockResolvedValue({
        verified: false,
        registrationInfo: null,
      } as never)

      const app = createApp()
      const res = await app.request(
        '/auth/public/users/user-123/credentials',
        jsonPost(validRegistrationBody)
      )

      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toBe('Registration verification failed')
    })

    it('stores credential and returns success when verification passes (bootstrap)', async () => {
      vi.mocked(userService!.getUserById).mockResolvedValue(mockUser as never)
      vi.mocked(userService!.getUserCredentials).mockResolvedValue([] as never)
      vi.mocked(consumeChallenge).mockReturnValue({ valid: true })
      vi.mocked(verifyRegistrationResponse).mockResolvedValue({
        verified: true,
        registrationInfo: {
          credential: {
            publicKey: new Uint8Array([1, 2, 3]),
            counter: 0,
          },
        },
      } as never)

      const app = createApp()
      const res = await app.request(
        '/auth/public/users/user-123/credentials',
        jsonPost(validRegistrationBody)
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)

      expect(userService!.addUserCredential).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          id: 'new-cred-id',
          name: 'My Passkey',
          type: 'platform',
          counter: 0,
        })
      )
    })

    // --- Auth gate: existing credentials require JWT ---

    it('returns 401 when user has credentials but no auth header', async () => {
      vi.mocked(userService!.getUserById).mockResolvedValue(mockUser as never)
      vi.mocked(userService!.getUserCredentials).mockResolvedValue([mockCredential] as never)

      const app = createApp()
      const res = await app.request(
        '/auth/public/users/user-123/credentials',
        jsonPost(validRegistrationBody)
      )

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Authentication required to add credentials')
    })

    it('returns 403 when JWT sub does not match userId', async () => {
      vi.mocked(userService!.getUserById).mockResolvedValue(mockUser as never)
      vi.mocked(userService!.getUserCredentials).mockResolvedValue([mockCredential] as never)
      vi.mocked(jwtService.verifyToken).mockReturnValue({ sub: 'other-user' } as never)

      const app = createApp()
      const res = await app.request('/auth/public/users/user-123/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token-wrong-user',
        },
        body: JSON.stringify(validRegistrationBody),
      })

      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('allows registration with valid JWT when user has existing credentials', async () => {
      vi.mocked(userService!.getUserById).mockResolvedValue(mockUser as never)
      vi.mocked(userService!.getUserCredentials).mockResolvedValue([mockCredential] as never)
      vi.mocked(jwtService.verifyToken).mockReturnValue({ sub: 'user-123' } as never)
      vi.mocked(consumeChallenge).mockReturnValue({ valid: true })
      vi.mocked(verifyRegistrationResponse).mockResolvedValue({
        verified: true,
        registrationInfo: {
          credential: {
            publicKey: new Uint8Array([4, 5, 6]),
            counter: 0,
          },
        },
      } as never)

      const app = createApp()
      const res = await app.request('/auth/public/users/user-123/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify(validRegistrationBody),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })
  })

  // --- Token endpoint returns refresh token ---

  describe('POST /users/:id/token (refresh token in response)', () => {
    const validAssertionBody = {
      credentialId: 'cred-abc',
      authenticatorData: 'mock-auth-data',
      clientDataJSON: 'mock-client-data',
      signature: 'mock-signature',
      challenge: 'mock-challenge',
    }

    it('returns refreshToken alongside access token on success', async () => {
      vi.mocked(userService!.getUserById).mockResolvedValue(mockUser as never)
      vi.mocked(consumeChallenge).mockReturnValue({ valid: true })
      vi.mocked(userService!.getUserCredentials).mockResolvedValue([mockCredential] as never)
      vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
        verified: true,
        authenticationInfo: { newCounter: 6 },
      } as never)

      const app = createApp()
      const res = await app.request(
        '/auth/public/users/user-123/token',
        jsonPost(validAssertionBody)
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.token).toBe('mock-jwt-token')
      expect(data.refreshToken).toBe('mock-refresh-token')
      expect(res.headers.get('set-cookie')).toContain('obs_refresh_token=mock-refresh-token')
    })
  })

  // --- Refresh Endpoint ---

  describe('POST /refresh', () => {
    it('returns 400 when no body is sent', async () => {
      const app = createApp()
      const res = await app.request('/auth/public/refresh', { method: 'POST' })

      expect(res.status).toBe(400)
    })

    it('returns 400 when refreshToken is missing', async () => {
      const app = createApp()
      const res = await app.request('/auth/public/refresh', jsonPost({}))

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Refresh token required')
    })

    it('returns 401 when refresh token is invalid', async () => {
      vi.mocked(rotateRefreshToken).mockResolvedValue(null)

      const app = createApp()
      const res = await app.request(
        '/auth/public/refresh',
        jsonPost({ refreshToken: 'invalid-token' })
      )

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Invalid or expired refresh token')
    })

    it('returns new token pair on successful refresh', async () => {
      vi.mocked(rotateRefreshToken).mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      })

      const app = createApp()
      const res = await app.request(
        '/auth/public/refresh',
        jsonPost({ refreshToken: 'valid-refresh-token' })
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.token).toBe('new-access-token')
      expect(data.refreshToken).toBe('new-refresh-token')
      expect(res.headers.get('set-cookie')).toContain('obs_refresh_token=new-refresh-token')
    })

    it('accepts the refresh token from an httpOnly cookie', async () => {
      vi.mocked(rotateRefreshToken).mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      })

      const app = createApp()
      const res = await app.request('/auth/public/refresh', {
        method: 'POST',
        headers: { Cookie: 'obs_refresh_token=cookie-refresh-token' },
      })

      expect(res.status).toBe(200)
      expect(rotateRefreshToken).toHaveBeenCalledWith('cookie-refresh-token')
    })
  })

  // --- Logout Endpoint ---

  describe('POST /logout', () => {
    it('returns success even with no body', async () => {
      const app = createApp()
      const res = await app.request('/auth/public/logout', {
        method: 'POST',
        headers: { Cookie: 'obs_refresh_token=cookie-refresh-token' },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(revokeRefreshToken).toHaveBeenCalledWith('cookie-refresh-token')
      expect(res.headers.get('set-cookie')).toContain('obs_refresh_token=')
    })

    it('revokes refresh token when provided', async () => {
      const app = createApp()
      const res = await app.request(
        '/auth/public/logout',
        jsonPost({ refreshToken: 'token-to-revoke' })
      )

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(revokeRefreshToken).toHaveBeenCalledWith('token-to-revoke')
    })

    it('returns success even without refresh token in body', async () => {
      const app = createApp()
      const res = await app.request('/auth/public/logout', jsonPost({}))

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(revokeRefreshToken).not.toHaveBeenCalled()
      expect(res.headers.get('set-cookie')).toContain('obs_refresh_token=')
    })

    it('falls back to the cookie when logout body validation fails', async () => {
      const app = createApp()
      const res = await app.request('/auth/public/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'obs_refresh_token=cookie-refresh-token',
        },
        body: JSON.stringify({ refreshToken: '' }),
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(revokeRefreshToken).toHaveBeenCalledWith('cookie-refresh-token')
      expect(res.headers.get('set-cookie')).toContain('obs_refresh_token=')
    })
  })
})
