import { describe, it, expect, mock, beforeEach } from 'bun:test'
import jwt from 'jsonwebtoken'
import { readFileSync } from 'fs'
import { JWTService } from '../jwt'

// Mock fs module
mock.module('fs', () => ({
  readFileSync: mock(() => ''),
}))

// Mock jsonwebtoken
mock.module('jsonwebtoken', () => ({
  default: {
    sign: mock(() => ''),
    verify: mock(() => ({})),
  },
}))

describe('JWTService', () => {
  let jwtService: JWTService
  // Note: This is a mock private key used exclusively for testing purposes.
  // It is intentionally not a real PEM and should not be treated as sensitive.
  // Using a placeholder avoids CI secret scanners.
  const mockPrivateKey = 'MOCK_TEST_PRIVATE_KEY'

  const mockPublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxwye1Uf9OLXyHBHNGcHV
gtt5AKuMzC9DN9zP9mK7UiYWemcRUpAbcdo1bFJnqkfbCQ3l5ELV8tH+KTAXQlz3
I+WEq67HXWtfiJdLzLgysYDbAfOjN1EHSs3Ri3xRIq4MY0e5BCb9dGDrRA6W6Xnc
T67xuyJPTJSUwHeK9D8OPXI3HTExOhP/IDAGygJyX3QqeZNAhpUKNqNaOqvua+nS
QyKPI00pQfjTXLogOo16YTqGkhskxjxgCatC8vuvQGs8XzpcUa7RN9n/mQtRiolko
mXbF3VCKxfVlBCzJZ2q1wiSekuFBtKIQU4BXBQlLjyE4hlUHkvh3+WfIqakHxQAe
QIDAQAB
-----END PUBLIC KEY-----`

  beforeEach(() => {
    // Set up the readFileSync mock to return different keys based on filename
    ;(readFileSync as any).mockImplementation((path: any) => {
      const pathStr = path.toString()
      if (pathStr.includes('private')) {
        return mockPrivateKey
      } else if (pathStr.includes('public')) {
        return mockPublicKey
      }
      return mockPrivateKey // fallback
    })

    // Create service instance after mocks are set up
    jwtService = new JWTService()
  })

  describe('constructor', () => {
    it('should initialize with private key and platform configuration', () => {
      // Test that the service constructor works
      expect(jwtService).toBeDefined()
      expect(typeof jwtService.generatePlatformToken).toBe('function')
      expect(typeof jwtService.verifyToken).toBe('function')
    })

    it('should have correct platform and client configuration', () => {
      // Mock the JWT sign function to return a token-like value
      const jwtMockValue = 'jwt-mock-client'
      ;(jwt.sign as any).mockReturnValueOnce(jwtMockValue)

      // Test that the service has the correct configuration
      const apiClient = jwtService.createOpenBadgesApiClient({
        id: 'test-id',
        username: 'test',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isAdmin: false,
      })

      expect(apiClient.headers['Content-Type']).toBe('application/json')
      expect(apiClient.headers.Authorization).toBe(`Bearer ${jwtMockValue}`)
      expect(apiClient.token).toBe(jwtMockValue)
    })
  })

  describe('generatePlatformToken', () => {
    it('should generate JWT token with correct payload', () => {
      const mockUser = {
        id: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isAdmin: false,
      }

      const jwtMockValue = 'jwt-mock'
      ;(jwt.sign as any).mockImplementation(() => jwtMockValue)

      const result = jwtService.generatePlatformToken(mockUser)

      expect(result).toBe(jwtMockValue)
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          sub: 'test-user-id',
          platformId: 'urn:uuid:a504d862-bd64-4e0d-acff-db7955955bc1',
          displayName: 'Test User',
          email: 'test@example.com',
          metadata: {
            firstName: 'Test',
            lastName: 'User',
            isAdmin: false,
          },
        },
        expect.any(String),
        expect.objectContaining({
          algorithm: 'RS256',
          issuer: 'openbadges-demo-main-app',
          expiresIn: '1h',
        })
      )
    })

    it('should generate token for admin user', () => {
      const mockUser = {
        id: 'admin-user-id',
        username: 'admin',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        isAdmin: true,
      }

      const jwtMockValue = 'jwt-mock-admin'
      ;(jwt.sign as any).mockImplementation(() => jwtMockValue)

      const result = jwtService.generatePlatformToken(mockUser)

      expect(result).toBe(jwtMockValue)
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            isAdmin: true,
          }),
        }),
        expect.any(String),
        expect.any(Object)
      )
    })
  })

  describe('verifyToken', () => {
    it('should verify valid JWT token using public key', () => {
      const jwtMockValue = 'jwt-valid'
      const mockPayload = {
        sub: 'test-user-id',
        platformId: 'urn:uuid:a504d862-bd64-4e0d-acff-db7955955bc1',
        displayName: 'Test User',
        email: 'test@example.com',
        metadata: {
          firstName: 'Test',
          lastName: 'User',
          isAdmin: false,
        },
      }

      ;(jwt.verify as any).mockImplementation(() => mockPayload)

      const result = jwtService.verifyToken(jwtMockValue)

      expect(result).toEqual(mockPayload)
      expect(jwt.verify).toHaveBeenCalledWith(
        jwtMockValue,
        expect.stringContaining('-----BEGIN PUBLIC KEY-----'),
        expect.objectContaining({
          algorithms: ['RS256'],
          issuer: 'openbadges-demo-main-app',
          clockTolerance: 0,
        })
      )
    })

    it('should return null for invalid JWT token', () => {
      const jwtMockValue = 'jwt-invalid'
      ;(jwt.verify as any).mockImplementation(() => {
        throw new Error('Invalid token')
      })

      const result = jwtService.verifyToken(jwtMockValue)

      expect(result).toBeNull()
    })
  })

  describe('issuer/audience/clock options', () => {
    it('uses env overrides for issuer/audience and clock tolerance when provided', () => {
      const prev = {
        PLATFORM_JWT_ISSUER: process.env.PLATFORM_JWT_ISSUER,
        PLATFORM_JWT_AUDIENCE: process.env.PLATFORM_JWT_AUDIENCE,
        JWT_CLOCK_TOLERANCE_SEC: process.env.JWT_CLOCK_TOLERANCE_SEC,
      }
      process.env.PLATFORM_JWT_ISSUER = 'urn:test:issuer'
      process.env.PLATFORM_JWT_AUDIENCE = 'urn:test:aud'
      process.env.JWT_CLOCK_TOLERANCE_SEC = '60'

      const svc = new JWTService()
      const token = 'valid-token'
      const payload = { sub: 'u1', platformId: 'p', displayName: 'd', email: 'e' }

      // Sign options should include issuer/audience
      ;(jwt.sign as any).mockReturnValue('signed-token')
      svc.generatePlatformToken({
        id: 'u1',
        username: 'u',
        email: 'e',
        firstName: 'f',
        lastName: 'l',
        isAdmin: false,
      })
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        expect.objectContaining({ issuer: 'urn:test:issuer', audience: 'urn:test:aud' })
      )

      // Verify options should include issuer/audience
      ;(jwt.verify as any).mockReturnValue(payload)
      const res = svc.verifyToken(token)
      expect(res).toEqual(payload)
      expect(jwt.verify).toHaveBeenCalledWith(
        token,
        expect.any(String),
        expect.objectContaining({
          issuer: 'urn:test:issuer',
          audience: 'urn:test:aud',
          clockTolerance: 60,
        })
      )

      process.env.PLATFORM_JWT_ISSUER = prev.PLATFORM_JWT_ISSUER
      process.env.PLATFORM_JWT_AUDIENCE = prev.PLATFORM_JWT_AUDIENCE
      process.env.JWT_CLOCK_TOLERANCE_SEC = prev.JWT_CLOCK_TOLERANCE_SEC
    })
  })

  describe('createOpenBadgesApiClient', () => {
    it('should create API client with correct headers', () => {
      const mockUser = {
        id: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isAdmin: false,
      }

      const jwtMockValue = 'jwt-mock'
      ;(jwt.sign as any).mockImplementation(() => jwtMockValue)

      const result = jwtService.createOpenBadgesApiClient(mockUser)

      expect(result.token).toBe(jwtMockValue)
      expect(result.headers).toEqual({
        Authorization: `Bearer ${jwtMockValue}`,
        'Content-Type': 'application/json',
      })
    })
  })

  describe('error handling', () => {
    it('should handle JWT signing errors gracefully', () => {
      const mockUser = {
        id: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isAdmin: false,
      }

      ;(jwt.sign as any).mockImplementation(() => {
        throw new Error('JWT signing failed')
      })

      expect(() => jwtService.generatePlatformToken(mockUser)).toThrow('JWT signing failed')
    })

    it('should handle verification errors gracefully', () => {
      const mockToken = 'malformed-token'
      ;(jwt.verify as any).mockImplementation(() => {
        throw new Error('Token verification failed')
      })

      const result = jwtService.verifyToken(mockToken)

      expect(result).toBeNull()
    })
  })
})
