import { describe, it, expect, vi, beforeEach } from 'vitest'
import { openBadgesService } from '@/services/openbadges'
import { createIRI, createDateTime } from 'openbadges-types'

describe('Badge Verification Integration Tests', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  // Mock assertion data
  const mockValidAssertion = {
    '@context': 'https://w3id.org/openbadges/v2',
    id: createIRI('https://example.org/assertions/12345'),
    type: 'Assertion',
    recipient: {
      type: 'email',
      identity: 'test@example.com',
      hashed: false,
    },
    badge: createIRI('https://example.org/badges/test-badge'),
    verification: {
      type: 'hosted',
    },
    issuedOn: createDateTime('2024-01-15T10:00:00Z'),
    expires: createDateTime('2025-01-15T10:00:00Z'),
    narrative: 'Completed the test course successfully',
    evidence: createIRI('https://example.org/evidence/12345'),
  } as any

  const mockBadgeClass = {
    '@context': 'https://w3id.org/openbadges/v2',
    id: 'https://example.org/badges/test-badge',
    type: 'BadgeClass',
    name: 'Test Badge',
    description: 'A badge for testing purposes',
    image: 'https://example.org/images/test-badge.png',
    criteria: 'https://example.org/criteria/test-badge',
    issuer: {
      id: 'https://example.org/issuers/test-issuer',
      type: 'Profile',
      name: 'Test Issuer',
      url: 'https://example.org',
      email: 'issuer@example.org',
    },
    tags: ['test', 'verification'],
  } as any

  const mockValidVerificationResponse = {
    valid: true,
    signatureValid: true,
    issuerVerified: true,
    errors: [],
    warnings: [],
  }

  const mockInvalidVerificationResponse = {
    valid: false,
    signatureValid: false,
    issuerVerified: false,
    errors: ['Invalid signature', 'Issuer not verified'],
    warnings: ['Badge has expired'],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = vi.fn()
    // Cast to unknown first to avoid Bun's fetch.preconnect type requirement
    global.fetch = mockFetch as unknown as typeof fetch
  })

  describe('Valid Badge Verification', () => {
    it('should successfully verify a valid badge assertion', async () => {
      // Mock successful responses for assertion, badge class, and verification
      mockFetch
        .mockResolvedValueOnce({
          // Get assertion
          ok: true,
          json: vi.fn().mockResolvedValue(mockValidAssertion),
        })
        .mockResolvedValueOnce({
          // Get badge class
          ok: true,
          json: vi.fn().mockResolvedValue(mockBadgeClass),
        })
        .mockResolvedValueOnce({
          // Verification request
          ok: true,
          json: vi.fn().mockResolvedValue(mockValidVerificationResponse),
        })

      const result = await openBadgesService.verifyBadge('12345')

      expect(result).toEqual({
        valid: true,
        verifiedAt: expect.any(String),
        issuer: {
          name: 'Test Issuer',
          id: 'https://example.org/issuers/test-issuer',
          verified: true,
        },
        signature: {
          valid: true,
          type: 'hosted',
        },
        assertion: mockValidAssertion,
        badgeClass: mockBadgeClass,
        errors: [],
        warnings: [],
      })

      // Verify API calls
      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        '/api/badges/assertions/12345',
        expect.any(Object)
      )
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        `/api/badges/badge-classes/${encodeURIComponent('https://example.org/badges/test-badge')}`,
        expect.any(Object)
      )
      expect(mockFetch).toHaveBeenNthCalledWith(
        3,
        '/api/badges/verify',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            assertion: mockValidAssertion,
            badgeClass: mockBadgeClass,
          }),
        })
      )
    })

    it('should handle verification with warnings', async () => {
      const verificationWithWarnings = {
        ...mockValidVerificationResponse,
        warnings: ['Badge will expire soon'],
      }

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockValidAssertion),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockBadgeClass),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(verificationWithWarnings),
        })

      const result = await openBadgesService.verifyBadge('12345')

      expect(result.valid).toBe(true)
      expect(result.warnings).toEqual(['Badge will expire soon'])
    })
  })

  describe('Invalid Badge Verification', () => {
    it('should handle invalid badge assertions', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockValidAssertion),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockBadgeClass),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockInvalidVerificationResponse),
        })

      const result = await openBadgesService.verifyBadge('invalid-assertion')

      expect(result).toEqual({
        valid: false,
        verifiedAt: expect.any(String),
        issuer: {
          name: 'Test Issuer',
          id: 'https://example.org/issuers/test-issuer',
          verified: false,
        },
        signature: {
          valid: false,
          type: 'hosted',
        },
        assertion: mockValidAssertion,
        badgeClass: mockBadgeClass,
        errors: ['Invalid signature', 'Issuer not verified'],
        warnings: ['Badge has expired'],
      })
    })

    it('should handle non-existent assertion', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue({ error: 'Assertion not found' }),
      })

      const result = await openBadgesService.verifyBadge('non-existent')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Resource not found. The requested item may not exist.')
    })

    it('should handle non-existent badge class', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockValidAssertion),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: vi.fn().mockResolvedValue({ error: 'Badge class not found' }),
        })

      const result = await openBadgesService.verifyBadge('12345')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Resource not found. The requested item may not exist.')
    })

    it('should handle server errors during verification', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockValidAssertion),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockBadgeClass),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: vi.fn().mockResolvedValue({ error: 'Internal server error' }),
        })

      const result = await openBadgesService.verifyBadge('12345')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Badge server error. Please try again later.')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await openBadgesService.verifyBadge('12345')

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Network error')
    })
  })

  describe('Revocation Status Check', () => {
    it('should check revocation status for non-revoked badge', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue([]), // Empty revocation list
      })

      const result = await openBadgesService.checkRevocationStatus('12345')

      expect(result).toEqual({
        revoked: false,
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/badges/revocation-list', expect.any(Object))
    })

    it('should detect revoked badge', async () => {
      const revocationList = [
        {
          id: '12345',
          reason: 'Fraudulent activity detected',
          revokedAt: '2024-01-20T15:30:00Z',
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(revocationList),
      })

      const result = await openBadgesService.checkRevocationStatus('12345')

      expect(result).toEqual({
        revoked: true,
        reason: 'Fraudulent activity detected',
        revokedAt: '2024-01-20T15:30:00Z',
      })
    })

    it('should handle revocation service failure gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Service unavailable'))

      const result = await openBadgesService.checkRevocationStatus('12345')

      expect(result).toEqual({
        revoked: false,
      })
    })
  })

  describe('Badge Class and Assertion Retrieval', () => {
    it('should retrieve badge class by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockBadgeClass),
      })

      const result = await openBadgesService.getBadgeClass('test-badge-id')

      expect(result).toEqual(mockBadgeClass)
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/badges/badge-classes/test-badge-id',
        expect.any(Object)
      )
    })

    it('should retrieve assertion by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockValidAssertion),
      })

      const result = await openBadgesService.getAssertion('test-assertion-id')

      expect(result).toEqual(mockValidAssertion)
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/badges/assertions/test-assertion-id',
        expect.any(Object)
      )
    })

    it('should handle badge class not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue({ error: 'Badge class not found' }),
      })

      await expect(openBadgesService.getBadgeClass('non-existent')).rejects.toThrow(
        'Resource not found. The requested item may not exist.'
      )
    })

    it('should handle assertion not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue({ error: 'Assertion not found' }),
      })

      await expect(openBadgesService.getAssertion('non-existent')).rejects.toThrow(
        'Resource not found. The requested item may not exist.'
      )
    })
  })

  describe('Error Response Parsing', () => {
    it('should parse structured error responses', async () => {
      const errorResponse = {
        error: 'Validation failed',
        details: 'Badge class does not exist',
        code: 'BADGE_NOT_FOUND',
        timestamp: '2024-01-15T10:00:00Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue(errorResponse),
      })

      await expect(openBadgesService.getBadgeClass('invalid')).rejects.toThrow(
        'Invalid request. Please check your input and try again.'
      )
    })

    it('should handle malformed error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      })

      await expect(openBadgesService.getBadgeClass('invalid')).rejects.toThrow(
        'Badge server error. Please try again later.'
      )
    })
  })

  describe('Integration with Revocation Checking', () => {
    it('should invalidate valid badge if revoked', async () => {
      // Mock badge verification that would be valid
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockValidAssertion),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockBadgeClass),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockValidVerificationResponse),
        })

      // But when checking revocation, badge is revoked
      const revocationList = [
        {
          id: '12345',
          reason: 'Issuer revoked badge',
          revokedAt: '2024-01-20T15:30:00Z',
        },
      ]

      // Add revocation check mock
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(revocationList),
      })

      // Verify badge first
      const verificationResult = await openBadgesService.verifyBadge('12345')

      // Then check revocation
      const revocationResult = await openBadgesService.checkRevocationStatus('12345')

      expect(verificationResult.valid).toBe(true) // Initial verification should be valid
      expect(revocationResult.revoked).toBe(true)
      expect(revocationResult.reason).toBe('Issuer revoked badge')
    })
  })
})
