import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useBadges } from './useBadges'
import type { OB2, OB3, Shared } from 'openbadges-types'
import type { User } from '@/composables/useAuth'
import type { CreateBadgeData } from './useBadges'

// Helper to create IRI type (branded type)
const iri = (value: string) => value as Shared.IRI
// Helper to create DateTime type (branded type)
const dateTime = (value: string) => value as Shared.DateTime

describe('useBadges', () => {
  let composable: ReturnType<typeof useBadges>

  beforeEach(() => {
    composable = useBadges()
  })

  describe('Version Selection', () => {
    it('should default to OB3 (3.0)', () => {
      expect(composable.specVersion.value).toBe('3.0')
    })

    it('should switch to OB2 when specVersion is set to 2.0', () => {
      composable.specVersion.value = '2.0'
      expect(composable.specVersion.value).toBe('2.0')
    })

    it('should compute correct apiVersion for v2', () => {
      composable.specVersion.value = '2.0'
      expect(composable.apiVersion.value).toBe('/v2')
    })

    it('should compute correct apiVersion for v3', () => {
      composable.specVersion.value = '3.0'
      expect(composable.apiVersion.value).toBe('/v3')
    })
  })

  describe('Type Guards', () => {
    it('should detect OB2 BadgeClass correctly', () => {
      const ob2Badge: OB2.BadgeClass = {
        '@context': 'https://w3id.org/openbadges/v2',
        type: 'BadgeClass',
        id: iri('https://example.org/badges/1'),
        name: 'Test Badge',
        description: 'A test badge',
        image: iri('https://example.org/image.png'),
        criteria: {
          narrative: 'Complete the test',
        },
        issuer: {
          type: 'Profile',
          id: iri('https://example.org/issuer'),
          name: 'Test Issuer',
          url: iri('https://example.org'),
        },
      }

      expect(composable.isBadgeOB2(ob2Badge)).toBe(true)
      expect(composable.isBadgeOB3(ob2Badge)).toBe(false)
    })

    it('should detect OB3 Achievement correctly', () => {
      const ob3Badge: OB3.Achievement = {
        '@context': 'https://www.w3.org/ns/credentials/v2',
        id: iri('https://example.org/achievements/1'),
        type: 'Achievement',
        name: 'Test Achievement',
        description: 'A test achievement',
        criteria: {
          narrative: 'Complete the test',
        },
      }

      expect(composable.isBadgeOB3(ob3Badge)).toBe(true)
      expect(composable.isBadgeOB2(ob3Badge)).toBe(false)
    })

    it('should detect OB3 Achievement with array type correctly', () => {
      const ob3Badge: OB3.Achievement = {
        '@context': 'https://www.w3.org/ns/credentials/v2',
        id: iri('https://example.org/achievements/1'),
        type: ['Achievement', 'AchievementCredential'],
        name: 'Test Achievement',
        description: 'A test achievement',
        criteria: {
          narrative: 'Complete the test',
        },
      }

      expect(composable.isBadgeOB3(ob3Badge)).toBe(true)
      expect(composable.isBadgeOB2(ob3Badge)).toBe(false)
    })

    it('should detect OB2 Assertion correctly', () => {
      const ob2Assertion: OB2.Assertion = {
        '@context': 'https://w3id.org/openbadges/v2',
        type: 'Assertion',
        id: iri('https://example.org/assertions/1'),
        recipient: {
          type: 'email',
          identity: 'test@example.com',
          hashed: false,
        },
        badge: iri('https://example.org/badges/1'),
        issuedOn: dateTime('2024-01-01T00:00:00Z'),
        verification: {
          type: 'hosted',
        },
      }

      expect(composable.isAssertionOB2(ob2Assertion)).toBe(true)
      expect(composable.isCredentialOB3(ob2Assertion)).toBe(false)
    })

    it('should detect OB3 VerifiableCredential correctly', () => {
      const ob3Credential: OB3.VerifiableCredential = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        ],
        id: iri('https://example.org/credentials/1'),
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: iri('https://example.org/issuer'),
        validFrom: dateTime('2024-01-01T00:00:00Z'),
        credentialSubject: {
          achievement: {
            id: iri('https://example.org/achievements/1'),
            type: 'Achievement',
            name: 'Test Achievement',
            description: 'A test achievement',
            criteria: {
              narrative: 'Complete the test',
            },
          },
        },
      }

      expect(composable.isCredentialOB3(ob3Credential)).toBe(true)
      expect(composable.isAssertionOB2(ob3Credential)).toBe(false)
    })
  })

  describe('Data Normalization', () => {
    it('should normalize OB2 BadgeClass data', () => {
      const ob2Badge: OB2.BadgeClass = {
        '@context': 'https://w3id.org/openbadges/v2',
        type: 'BadgeClass',
        id: iri('https://example.org/badges/1'),
        name: 'Test Badge',
        description: 'A test badge',
        image: iri('https://example.org/image.png'),
        criteria: {
          narrative: 'Complete the test',
        },
        issuer: {
          type: 'Profile',
          id: iri('https://example.org/issuer'),
          name: 'Test Issuer',
          url: iri('https://example.org'),
        },
        tags: ['test', 'badge'],
      }

      const normalized = composable.normalizeBadgeData(ob2Badge)

      expect(normalized.version).toBe('2.0')
      expect(normalized.name).toBe('Test Badge')
      expect(normalized.description).toBe('A test badge')
      expect(normalized.tags).toEqual(['test', 'badge'])
      expect(normalized.issuer).toBe(ob2Badge.issuer)
    })

    it('should normalize OB3 Achievement data with string name', () => {
      const ob3Badge: OB3.Achievement = {
        '@context': 'https://www.w3.org/ns/credentials/v2',
        id: iri('https://example.org/achievements/1'),
        type: 'Achievement',
        name: 'Test Achievement',
        description: 'A test achievement',
        criteria: {
          narrative: 'Complete the test',
        },
        creator: {
          id: iri('https://example.org/issuer'),
          type: 'Profile',
          name: 'Test Issuer',
          url: iri('https://example.org'),
        },
      }

      const normalized = composable.normalizeBadgeData(ob3Badge)

      expect(normalized.version).toBe('3.0')
      expect(normalized.name).toBe('Test Achievement')
      expect(normalized.description).toBe('A test achievement')
      expect(normalized.tags).toEqual([]) // OB3 doesn't have tags
      expect(normalized.issuer).toBe(ob3Badge.creator)
    })

    it('should normalize OB3 Achievement data with MultiLanguageString', () => {
      const ob3Badge: OB3.Achievement = {
        '@context': 'https://www.w3.org/ns/credentials/v2',
        id: iri('https://example.org/achievements/1'),
        type: 'Achievement',
        name: {
          en: 'Test Achievement',
          es: 'Logro de prueba',
        },
        description: {
          en: 'A test achievement',
          es: 'Un logro de prueba',
        },
        criteria: {
          narrative: 'Complete the test',
        },
      }

      const normalized = composable.normalizeBadgeData(ob3Badge)

      expect(normalized.version).toBe('3.0')
      expect(normalized.name).toBe('Test Achievement') // Prefers 'en'
      expect(normalized.description).toBe('A test achievement')
    })

    it('should normalize OB2 Assertion data', () => {
      const ob2Assertion: OB2.Assertion = {
        '@context': 'https://w3id.org/openbadges/v2',
        type: 'Assertion',
        id: iri('https://example.org/assertions/1'),
        recipient: {
          type: 'email',
          identity: 'test@example.com',
          hashed: false,
        },
        badge: iri('https://example.org/badges/1'),
        issuedOn: dateTime('2024-01-01T00:00:00Z'),
        expires: dateTime('2025-01-01T00:00:00Z'),
        verification: {
          type: 'hosted',
        },
      }

      const normalized = composable.normalizeAssertionData(ob2Assertion)

      expect(normalized.version).toBe('2.0')
      expect(normalized.issuedOn).toBe('2024-01-01T00:00:00Z')
      expect(normalized.expires).toBe('2025-01-01T00:00:00Z')
      expect(normalized.recipient).toBe(ob2Assertion.recipient)
    })

    it('should normalize OB3 VerifiableCredential data', () => {
      const ob3Credential: OB3.VerifiableCredential = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        ],
        id: iri('https://example.org/credentials/1'),
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: iri('https://example.org/issuer'),
        validFrom: dateTime('2024-01-01T00:00:00Z'),
        validUntil: dateTime('2025-01-01T00:00:00Z'),
        credentialSubject: {
          achievement: {
            id: iri('https://example.org/achievements/1'),
            type: 'Achievement',
            name: 'Test Achievement',
            description: 'A test achievement',
            criteria: {
              narrative: 'Complete the test',
            },
          },
        },
      }

      const normalized = composable.normalizeAssertionData(ob3Credential)

      expect(normalized.version).toBe('3.0')
      expect(normalized.validFrom).toBe('2024-01-01T00:00:00Z')
      expect(normalized.validUntil).toBe('2025-01-01T00:00:00Z')
      expect(normalized.issuedOn).toBe('2024-01-01T00:00:00Z') // Maps validFrom to issuedOn
      expect(normalized.expires).toBe('2025-01-01T00:00:00Z') // Maps validUntil to expires
      expect(normalized.recipient).toBe(ob3Credential.credentialSubject)
    })
  })

  describe('API Endpoint Construction', () => {
    it('should use /v2 endpoints when specVersion is 2.0', () => {
      composable.specVersion.value = '2.0'
      expect(composable.apiVersion.value).toBe('/v2')
    })

    it('should use /v3 endpoints when specVersion is 3.0', () => {
      composable.specVersion.value = '3.0'
      expect(composable.apiVersion.value).toBe('/v3')
    })

    it('should update apiVersion reactively when specVersion changes', () => {
      expect(composable.apiVersion.value).toBe('/v3')

      composable.specVersion.value = '2.0'
      expect(composable.apiVersion.value).toBe('/v2')

      composable.specVersion.value = '3.0'
      expect(composable.apiVersion.value).toBe('/v3')
    })
  })

  describe('Backward Compatibility', () => {
    it('should handle existing OB2 data without breaking', () => {
      // Ensure OB2 badges work with the updated types
      const ob2Badge: OB2.BadgeClass = {
        '@context': 'https://w3id.org/openbadges/v2',
        type: 'BadgeClass',
        id: iri('https://example.org/badges/1'),
        name: 'Test Badge',
        description: 'A test badge',
        image: iri('https://example.org/image.png'),
        criteria: {
          narrative: 'Complete the test',
        },
        issuer: {
          type: 'Profile',
          id: iri('https://example.org/issuer'),
          name: 'Test Issuer',
          url: iri('https://example.org'),
        },
      }

      expect(composable.isBadgeOB2(ob2Badge)).toBe(true)

      const normalized = composable.normalizeBadgeData(ob2Badge)
      expect(normalized.version).toBe('2.0')
      expect(normalized.name).toBe('Test Badge')
    })

    it('should maintain existing OB2 field structures', () => {
      composable.specVersion.value = '2.0'
      expect(composable.apiVersion.value).toBe('/v2')

      // Verify the composable still works with OB2 defaults
      expect(composable.badges.value).toEqual([])
      expect(composable.assertions.value).toEqual([])
    })
  })

  describe('Type Guards - Invalid Inputs', () => {
    it('should reject null for badge type guards', () => {
      expect(composable.isBadgeOB2(null)).toBe(false)
      expect(composable.isBadgeOB3(null)).toBe(false)
    })

    it('should reject undefined for badge type guards', () => {
      expect(composable.isBadgeOB2(undefined)).toBe(false)
      expect(composable.isBadgeOB3(undefined)).toBe(false)
    })

    it('should reject empty object for badge type guards', () => {
      expect(composable.isBadgeOB2({})).toBe(false)
      expect(composable.isBadgeOB3({})).toBe(false)
    })

    it('should reject object without type field for OB2 badge', () => {
      const badgeWithoutType = {
        id: iri('https://example.org/badges/1'),
        name: 'Test Badge',
        description: 'A test badge',
        image: iri('https://example.org/image.png'),
        criteria: { narrative: 'Complete the test' },
        issuer: {
          type: 'Profile',
          id: iri('https://example.org/issuer'),
          name: 'Test Issuer',
        },
      }

      expect(composable.isBadgeOB2(badgeWithoutType)).toBe(false)
    })

    it('should reject object with missing required fields for OB3 badge', () => {
      const badgeWithoutRequiredFields = {
        type: 'Achievement',
        id: iri('https://example.org/achievements/1'),
        name: 'Test Achievement',
        // Missing description and criteria
      }

      expect(composable.isBadgeOB3(badgeWithoutRequiredFields)).toBe(false)
    })

    it('should reject null for assertion type guards', () => {
      expect(composable.isAssertionOB2(null)).toBe(false)
      expect(composable.isCredentialOB3(null)).toBe(false)
    })

    it('should reject undefined for assertion type guards', () => {
      expect(composable.isAssertionOB2(undefined)).toBe(false)
      expect(composable.isCredentialOB3(undefined)).toBe(false)
    })

    it('should reject empty object for assertion type guards', () => {
      expect(composable.isAssertionOB2({})).toBe(false)
      expect(composable.isCredentialOB3({})).toBe(false)
    })

    it('should reject object without type field for OB2 assertion', () => {
      const assertionWithoutType = {
        id: iri('https://example.org/assertions/1'),
        recipient: {
          type: 'email',
          identity: 'test@example.com',
          hashed: false,
        },
        badge: iri('https://example.org/badges/1'),
        issuedOn: dateTime('2024-01-01T00:00:00Z'),
      }

      expect(composable.isAssertionOB2(assertionWithoutType)).toBe(false)
    })
  })

  describe('Normalization - Error Paths', () => {
    it('should throw error for unknown badge format', () => {
      const unknownBadge = {
        id: 'unknown',
        name: 'Unknown Badge',
        // Missing required fields for both OB2 and OB3
      }

      expect(() => composable.normalizeBadgeData(unknownBadge as any)).toThrow(
        'Unknown badge format'
      )
    })

    it('should throw error for unknown assertion format', () => {
      const unknownAssertion = {
        id: 'unknown',
        recipient: 'someone',
        // Missing required fields for both OB2 and OB3
      }

      expect(() => composable.normalizeAssertionData(unknownAssertion as any)).toThrow(
        'Unknown assertion format'
      )
    })
  })

  describe('MultiLanguageString - Edge Cases', () => {
    it('should handle empty MultiLanguageString object', () => {
      const ob3Badge: OB3.Achievement = {
        '@context': 'https://www.w3.org/ns/credentials/v2',
        id: iri('https://example.org/achievements/1'),
        type: 'Achievement',
        name: {},
        description: {},
        criteria: {
          narrative: 'Complete the test',
        },
      }

      const normalized = composable.normalizeBadgeData(ob3Badge)

      expect(normalized.name).toBe('')
      expect(normalized.description).toBe('')
    })

    it('should handle MultiLanguageString missing en key', () => {
      const ob3Badge: OB3.Achievement = {
        '@context': 'https://www.w3.org/ns/credentials/v2',
        id: iri('https://example.org/achievements/1'),
        type: 'Achievement',
        name: {
          es: 'Logro de prueba',
          fr: 'Réalisation de test',
        },
        description: {
          es: 'Un logro de prueba',
          fr: 'Une réalisation de test',
        },
        criteria: {
          narrative: 'Complete the test',
        },
      }

      const normalized = composable.normalizeBadgeData(ob3Badge)

      // Should fall back to first available language
      expect(normalized.name).toBe('Logro de prueba')
      expect(normalized.description).toBe('Un logro de prueba')
    })
  })

  describe('createBadge - OB2 vs OB3 Payloads', () => {
    const mockUser: User = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      isAdmin: false,
      createdAt: '2024-01-01T00:00:00Z',
      credentials: [],
    }

    const mockBadgeData: CreateBadgeData = {
      name: 'Test Badge',
      description: 'A test badge for validation',
      image: 'https://example.org/badge.png',
      criteria: {
        narrative: 'Complete the test requirements',
      },
      issuer: {
        type: 'Profile',
        id: iri('https://example.org/issuer'),
        name: 'Test Issuer',
        url: iri('https://example.org'),
      },
      tags: ['test', 'demo'],
      alignment: [
        {
          targetName: 'Test Standard',
          targetUrl: iri('https://example.org/standard'),
        },
      ],
    }

    beforeEach(() => {
      // Mock fetch globally
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(globalThis as any).fetch = vi.fn()
      // Mock window.location for OB3 ID generation
      Object.defineProperty(globalThis, 'window', {
        value: {
          location: {
            origin: 'https://example.org',
          },
        },
        writable: true,
        configurable: true,
      })
      composable = useBadges()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should send OB2 BadgeClass payload when specVersion is 2.0', async () => {
      composable.specVersion.value = '2.0'

      // Mock platform token endpoint
      const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          headers: {
            get: (name: string) => (name === 'content-type' ? 'application/json' : null),
          },
          json: () => Promise.resolve({ token: 'mock-platform-token' }),
        })
      )

      // Mock badge creation endpoint
      mockFetch.mockImplementationOnce((url: string, options: { body: string }) => {
        const payload = JSON.parse(options.body)

        // Verify OB2 format
        expect(payload.type).toBe('BadgeClass')
        expect(payload.issuer).toBeDefined()
        expect(payload.alignment).toBeDefined()
        expect(payload.tags).toEqual(['test', 'demo'])
        expect(payload.creator).toBeUndefined() // OB2 doesn't use creator
        expect(payload.alignments).toBeUndefined() // OB2 uses alignment (singular)

        // Verify endpoint
        expect(url).toContain('/api/badges/v2/badge-classes')

        return Promise.resolve({
          ok: true,
          headers: {
            get: (name: string) => (name === 'content-type' ? 'application/json' : null),
          },
          json: () =>
            Promise.resolve({
              ...payload,
              id: iri('https://example.org/badges/123'),
            }),
        })
      })

      const result = await composable.createBadge(mockUser, mockBadgeData)
      expect(result).toBeTruthy()
    })

    it('should send OB3 Achievement payload when specVersion is 3.0', async () => {
      composable.specVersion.value = '3.0'

      // Mock platform token endpoint
      const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          headers: {
            get: (name: string) => (name === 'content-type' ? 'application/json' : null),
          },
          json: () => Promise.resolve({ token: 'mock-platform-token' }),
        })
      )

      // Mock badge creation endpoint
      mockFetch.mockImplementationOnce((url: string, options: { body: string }) => {
        const payload = JSON.parse(options.body)

        // Verify OB3 format
        expect(payload['@context']).toBe('https://purl.imsglobal.org/spec/ob/v3p0/context.json') // OB3 requires @context
        expect(payload.type).toBe('Achievement')
        expect(payload.id).toBeDefined() // OB3 requires id
        expect(payload.creator).toBeDefined() // OB3 uses creator
        expect(payload.alignments).toBeDefined() // OB3 uses alignments (plural)
        expect(payload.issuer).toBeUndefined() // OB3 doesn't use issuer
        expect(payload.tags).toBeUndefined() // OB3 doesn't use tags
        expect(payload.alignment).toBeUndefined() // OB3 uses alignments (plural)

        // Verify endpoint
        expect(url).toContain('/api/badges/v3/achievements')

        return Promise.resolve({
          ok: true,
          headers: {
            get: (name: string) => (name === 'content-type' ? 'application/json' : null),
          },
          json: () =>
            Promise.resolve({
              ...payload,
              '@context': 'https://www.w3.org/ns/credentials/v2',
            }),
        })
      })

      const result = await composable.createBadge(mockUser, mockBadgeData)
      expect(result).toBeTruthy()
    })

    it('should include required OB3 fields in Achievement payload', async () => {
      composable.specVersion.value = '3.0'

      // Mock platform token endpoint
      const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          headers: {
            get: (name: string) => (name === 'content-type' ? 'application/json' : null),
          },
          json: () => Promise.resolve({ token: 'mock-platform-token' }),
        })
      )

      // Mock badge creation endpoint
      mockFetch.mockImplementationOnce((url: string, options: { body: string }) => {
        const payload = JSON.parse(options.body)

        // Verify required OB3 fields
        expect(payload['@context']).toBe('https://purl.imsglobal.org/spec/ob/v3p0/context.json')
        expect(payload.id).toMatch(/^https?:\/\//) // Must be valid IRI
        expect(payload.type).toBe('Achievement')
        expect(payload.name).toBe('Test Badge')
        expect(payload.description).toBe('A test badge for validation')
        expect(payload.criteria).toEqual({
          narrative: 'Complete the test requirements',
        })

        return Promise.resolve({
          ok: true,
          headers: {
            get: (name: string) => (name === 'content-type' ? 'application/json' : null),
          },
          json: () => Promise.resolve(payload),
        })
      })

      await composable.createBadge(mockUser, mockBadgeData)
    })

    it('should map issuer to creator for OB3', async () => {
      composable.specVersion.value = '3.0'

      // Mock platform token endpoint
      const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          headers: {
            get: (name: string) => (name === 'content-type' ? 'application/json' : null),
          },
          json: () => Promise.resolve({ token: 'mock-platform-token' }),
        })
      )

      // Mock badge creation endpoint
      mockFetch.mockImplementationOnce((url: string, options: { body: string }) => {
        const payload = JSON.parse(options.body)

        // Verify issuer was mapped to creator
        expect(payload.creator).toEqual(mockBadgeData.issuer)
        expect(payload.issuer).toBeUndefined()

        return Promise.resolve({
          ok: true,
          headers: {
            get: (name: string) => (name === 'content-type' ? 'application/json' : null),
          },
          json: () => Promise.resolve(payload),
        })
      })

      await composable.createBadge(mockUser, mockBadgeData)
    })

    it('should map alignment to alignments for OB3', async () => {
      composable.specVersion.value = '3.0'

      // Mock platform token endpoint
      const mockFetch = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          headers: {
            get: (name: string) => (name === 'content-type' ? 'application/json' : null),
          },
          json: () => Promise.resolve({ token: 'mock-platform-token' }),
        })
      )

      // Mock badge creation endpoint
      mockFetch.mockImplementationOnce((url: string, options: { body: string }) => {
        const payload = JSON.parse(options.body)

        // Verify alignment was mapped to alignments (plural)
        expect(payload.alignments).toEqual(mockBadgeData.alignment)
        expect(payload.alignment).toBeUndefined()

        return Promise.resolve({
          ok: true,
          headers: {
            get: (name: string) => (name === 'content-type' ? 'application/json' : null),
          },
          json: () => Promise.resolve(payload),
        })
      })

      await composable.createBadge(mockUser, mockBadgeData)
    })
  })
})
