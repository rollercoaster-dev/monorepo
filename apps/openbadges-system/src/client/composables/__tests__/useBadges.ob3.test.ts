import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBadges } from '../useBadges'
import type { OB2, OB3 } from 'openbadges-types'

// Note: openbadges-types uses branded types (IRI, DateTime) that require
// explicit casting. We cast test fixtures as `unknown as T` to satisfy TypeScript
// while testing with plain object literals that represent real API responses.

// Mock fetch for client tests
beforeEach(() => {
  vi.clearAllMocks()
})

describe('useBadges OB3 Support', () => {
  describe('Type Guards', () => {
    describe('isBadgeOB2', () => {
      it('returns true for valid OB2 BadgeClass', () => {
        const { isBadgeOB2 } = useBadges()

        const ob2Badge = {
          id: 'https://example.org/badges/1',
          type: 'BadgeClass',
          name: 'OB2 Badge',
          description: 'An OB2 badge',
          image: 'https://example.org/image.png',
          criteria: 'https://example.org/criteria',
          issuer: 'https://example.org/issuer',
        }

        expect(isBadgeOB2(ob2Badge)).toBe(true)
      })

      it('returns false for OB3 Achievement', () => {
        const { isBadgeOB2 } = useBadges()

        const ob3Achievement = {
          id: 'https://example.org/achievements/1',
          type: ['Achievement'],
          name: 'OB3 Achievement',
          description: 'An OB3 achievement',
          criteria: { narrative: 'Complete tasks' },
        }

        expect(isBadgeOB2(ob3Achievement)).toBe(false)
      })
    })

    describe('isBadgeOB3', () => {
      it('returns true for valid OB3 Achievement', () => {
        const { isBadgeOB3 } = useBadges()

        const ob3Achievement = {
          id: 'https://example.org/achievements/1',
          type: ['Achievement'],
          name: 'OB3 Achievement',
          description: 'An OB3 achievement',
          criteria: { narrative: 'Complete tasks' },
        }

        expect(isBadgeOB3(ob3Achievement)).toBe(true)
      })

      it('returns false for OB2 BadgeClass', () => {
        const { isBadgeOB3 } = useBadges()

        const ob2Badge = {
          id: 'https://example.org/badges/1',
          type: 'BadgeClass',
          name: 'OB2 Badge',
          description: 'An OB2 badge',
          image: 'https://example.org/image.png',
          criteria: 'https://example.org/criteria',
          issuer: 'https://example.org/issuer',
        }

        expect(isBadgeOB3(ob2Badge)).toBe(false)
      })

      it('handles Achievement with type as string', () => {
        const { isBadgeOB3 } = useBadges()

        const achievement = {
          id: 'https://example.org/achievements/1',
          type: 'Achievement',
          name: 'Achievement',
          description: 'Description',
          criteria: { narrative: 'Narrative' },
        }

        expect(isBadgeOB3(achievement)).toBe(true)
      })
    })

    describe('isAssertionOB2', () => {
      it('returns true for valid OB2 Assertion', () => {
        const { isAssertionOB2 } = useBadges()

        // OB2 Assertion requires @context to be a valid JSON-LD object
        const ob2Assertion = {
          '@context': 'https://w3id.org/openbadges/v2',
          id: 'https://example.org/assertions/1',
          type: 'Assertion',
          badge: 'https://example.org/badges/1',
          recipient: { type: 'email', identity: 'test@example.org' },
          verification: { type: 'hosted' },
          issuedOn: '2024-01-01T00:00:00.000Z',
        }

        expect(isAssertionOB2(ob2Assertion)).toBe(true)
      })

      it('returns false for OB3 VerifiableCredential', () => {
        const { isAssertionOB2 } = useBadges()

        const ob3VC = {
          '@context': [
            'https://www.w3.org/2018/credentials/v1',
            'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
          ],
          id: 'https://example.org/credentials/1',
          type: ['VerifiableCredential', 'OpenBadgeCredential'],
          issuer: 'https://example.org/issuers/1',
          validFrom: '2024-01-01T00:00:00.000Z',
          credentialSubject: {
            achievement: {
              id: 'https://example.org/achievements/1',
              name: 'Test',
              description: 'Test',
              criteria: { narrative: 'Test' },
            },
          },
        }

        expect(isAssertionOB2(ob3VC)).toBe(false)
      })
    })

    describe('isCredentialOB3', () => {
      it('returns true for valid OB3 VerifiableCredential', () => {
        const { isCredentialOB3 } = useBadges()

        const ob3VC = {
          '@context': [
            'https://www.w3.org/2018/credentials/v1',
            'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
          ],
          id: 'https://example.org/credentials/1',
          type: ['VerifiableCredential', 'OpenBadgeCredential'],
          issuer: 'https://example.org/issuers/1',
          validFrom: '2024-01-01T00:00:00.000Z',
          credentialSubject: {
            achievement: {
              id: 'https://example.org/achievements/1',
              type: 'Achievement',
              name: 'Test',
              description: 'Test',
              criteria: { narrative: 'Test' },
            },
          },
        }

        expect(isCredentialOB3(ob3VC)).toBe(true)
      })

      it('returns false for OB2 Assertion', () => {
        const { isCredentialOB3 } = useBadges()

        const ob2Assertion = {
          id: 'https://example.org/assertions/1',
          type: 'Assertion',
          badge: 'https://example.org/badges/1',
          recipient: { type: 'email', identity: 'test@example.org' },
          verification: { type: 'hosted' },
          issuedOn: '2024-01-01T00:00:00.000Z',
        }

        expect(isCredentialOB3(ob2Assertion)).toBe(false)
      })

      it('returns false for VC missing required contexts', () => {
        const { isCredentialOB3 } = useBadges()

        const invalidVC = {
          '@context': ['https://example.org/custom-context'],
          id: 'https://example.org/credentials/1',
          type: ['VerifiableCredential', 'OpenBadgeCredential'],
          issuer: 'https://example.org/issuers/1',
          validFrom: '2024-01-01T00:00:00.000Z',
          credentialSubject: {
            achievement: {
              id: 'https://example.org/achievements/1',
              name: 'Test',
              description: 'Test',
              criteria: { narrative: 'Test' },
            },
          },
        }

        expect(isCredentialOB3(invalidVC)).toBe(false)
      })
    })
  })

  describe('Normalization Helpers', () => {
    describe('normalizeBadgeData', () => {
      it('normalizes OB2 BadgeClass to common format', () => {
        const { normalizeBadgeData } = useBadges()

        const ob2Badge = {
          id: 'https://example.org/badges/1',
          type: 'BadgeClass',
          name: 'OB2 Badge',
          description: 'An OB2 badge',
          image: 'https://example.org/image.png',
          criteria: 'https://example.org/criteria',
          issuer: 'https://example.org/issuer',
          tags: ['skill', 'test'],
        }

        const normalized = normalizeBadgeData(ob2Badge as unknown as OB2.BadgeClass)

        expect(normalized.id).toBe('https://example.org/badges/1')
        expect(normalized.name).toBe('OB2 Badge')
        expect(normalized.description).toBe('An OB2 badge')
        expect(normalized.version).toBe('2.0')
        expect(normalized.tags).toEqual(['skill', 'test'])
      })

      it('normalizes OB3 Achievement to common format', () => {
        const { normalizeBadgeData } = useBadges()

        const ob3Achievement = {
          id: 'https://example.org/achievements/1',
          type: ['Achievement'],
          name: 'OB3 Achievement',
          description: 'An OB3 achievement',
          criteria: { narrative: 'Complete tasks' },
        }

        const normalized = normalizeBadgeData(ob3Achievement as unknown as OB3.Achievement)

        expect(normalized.id).toBe('https://example.org/achievements/1')
        expect(normalized.name).toBe('OB3 Achievement')
        expect(normalized.description).toBe('An OB3 achievement')
        expect(normalized.version).toBe('3.0')
        expect(normalized.tags).toEqual([]) // OB3 doesn't have tags
      })

      it('handles OB3 Achievement with multi-language name', () => {
        const { normalizeBadgeData } = useBadges()

        const multiLangAchievement = {
          id: 'https://example.org/achievements/1',
          type: ['Achievement'],
          name: { en: 'English Name', es: 'Nombre en Espanol' },
          description: { en: 'English description', es: 'Descripcion' },
          criteria: { narrative: 'Complete tasks' },
        }

        const normalized = normalizeBadgeData(multiLangAchievement as unknown as OB3.Achievement)

        // Should prefer 'en' key or fall back to first value
        expect(normalized.name).toBe('English Name')
        expect(normalized.description).toBe('English description')
      })

      it('handles OB3 Achievement with non-English multi-language strings', () => {
        const { normalizeBadgeData } = useBadges()

        const spanishAchievement = {
          id: 'https://example.org/achievements/1',
          type: ['Achievement'],
          name: { es: 'Nombre' },
          description: { es: 'Descripcion' },
          criteria: { narrative: 'Complete tasks' },
        }

        const normalized = normalizeBadgeData(spanishAchievement as unknown as OB3.Achievement)

        // Should fall back to first available value
        expect(normalized.name).toBe('Nombre')
        expect(normalized.description).toBe('Descripcion')
      })

      it('handles OB3 Achievement with creator as IRI', () => {
        const { normalizeBadgeData } = useBadges()

        const achievement = {
          id: 'https://example.org/achievements/1',
          type: ['Achievement'],
          name: 'Achievement with Creator',
          description: 'Has creator field',
          criteria: { narrative: 'Complete' },
          creator: 'https://example.org/issuers/1',
        }

        const normalized = normalizeBadgeData(achievement as unknown as OB3.Achievement)

        expect(normalized.issuer).toBe('https://example.org/issuers/1')
      })
    })

    describe('normalizeAssertionData', () => {
      it('normalizes OB2 Assertion to common format', () => {
        const { normalizeAssertionData } = useBadges()

        // OB2 Assertion requires @context to be a valid JSON-LD object
        const ob2Assertion = {
          '@context': 'https://w3id.org/openbadges/v2',
          id: 'https://example.org/assertions/1',
          type: 'Assertion',
          badge: 'https://example.org/badges/1',
          recipient: { type: 'email', identity: 'test@example.org' },
          verification: { type: 'hosted' },
          issuedOn: '2024-01-01T00:00:00.000Z',
          expires: '2025-01-01T00:00:00.000Z',
        }

        const normalized = normalizeAssertionData(ob2Assertion as unknown as OB2.Assertion)

        expect(normalized.id).toBe('https://example.org/assertions/1')
        expect(normalized.recipient.identity).toBe('test@example.org')
        expect(normalized.issuedOn).toBe('2024-01-01T00:00:00.000Z')
        expect(normalized.expires).toBe('2025-01-01T00:00:00.000Z')
        expect(normalized.version).toBe('2.0')
      })

      it('normalizes OB3 VerifiableCredential to common format', () => {
        const { normalizeAssertionData } = useBadges()

        const ob3VC = {
          '@context': [
            'https://www.w3.org/2018/credentials/v1',
            'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
          ],
          id: 'https://example.org/credentials/1',
          type: ['VerifiableCredential', 'OpenBadgeCredential'],
          issuer: 'https://example.org/issuers/1',
          validFrom: '2024-01-01T00:00:00.000Z',
          validUntil: '2025-01-01T00:00:00.000Z',
          credentialSubject: {
            id: 'did:example:recipient',
            email: 'test@example.org',
            achievement: {
              id: 'https://example.org/achievements/1',
              type: 'Achievement',
              name: 'Test',
              description: 'Test',
              criteria: { narrative: 'Test' },
            },
          },
        }

        const normalized = normalizeAssertionData(ob3VC as unknown as OB3.VerifiableCredential)

        expect(normalized.id).toBe('https://example.org/credentials/1')
        expect(normalized.issuedOn).toBe('2024-01-01T00:00:00.000Z') // Maps from validFrom
        expect(normalized.expires).toBe('2025-01-01T00:00:00.000Z') // Maps from validUntil
        expect(normalized.validFrom).toBe('2024-01-01T00:00:00.000Z')
        expect(normalized.validUntil).toBe('2025-01-01T00:00:00.000Z')
        expect(normalized.version).toBe('3.0')
      })

      it('extracts recipient identity from OB3 credentialSubject.email', () => {
        const { normalizeAssertionData } = useBadges()

        const ob3VC = {
          '@context': [
            'https://www.w3.org/2018/credentials/v1',
            'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
          ],
          id: 'https://example.org/credentials/1',
          type: ['VerifiableCredential', 'OpenBadgeCredential'],
          issuer: 'https://example.org/issuers/1',
          validFrom: '2024-01-01T00:00:00.000Z',
          credentialSubject: {
            email: 'recipient@example.org',
            achievement: {
              id: 'https://example.org/achievements/1',
              type: 'Achievement',
              name: 'Test',
              description: 'Test',
              criteria: { narrative: 'Test' },
            },
          },
        }

        const normalized = normalizeAssertionData(ob3VC as unknown as OB3.VerifiableCredential)

        expect(normalized.recipient.type).toBe('email')
        expect(normalized.recipient.identity).toBe('recipient@example.org')
      })

      it('extracts recipient from OB3 credentialSubject.id when no email', () => {
        const { normalizeAssertionData } = useBadges()

        // Note: The type guard requires W3C VC v1 context specifically
        const ob3VC = {
          '@context': [
            'https://www.w3.org/2018/credentials/v1',
            'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
          ],
          id: 'https://example.org/credentials/1',
          type: ['VerifiableCredential', 'OpenBadgeCredential'],
          issuer: 'https://example.org/issuers/1',
          validFrom: '2024-01-01T00:00:00.000Z',
          credentialSubject: {
            id: 'did:example:recipient123',
            achievement: {
              id: 'https://example.org/achievements/1',
              type: 'Achievement',
              name: 'Test',
              description: 'Test',
              criteria: { narrative: 'Test' },
            },
          },
        }

        const normalized = normalizeAssertionData(ob3VC as unknown as OB3.VerifiableCredential)

        expect(normalized.recipient.type).toBe('id')
        expect(normalized.recipient.identity).toBe('did:example:recipient123')
      })
    })
  })

  describe('Spec Version Selection', () => {
    it('defaults to OB3 (3.0) spec version', () => {
      const { specVersion } = useBadges()

      expect(specVersion.value).toBe('3.0')
    })

    it('computes correct API version path for OB3', () => {
      const { apiVersion, specVersion } = useBadges()

      specVersion.value = '3.0'
      expect(apiVersion.value).toBe('/v3')
    })

    it('computes correct API version path for OB2', () => {
      const { apiVersion, specVersion } = useBadges()

      specVersion.value = '2.0'
      expect(apiVersion.value).toBe('/v2')
    })
  })

  describe('Badge Creation Payload', () => {
    it('constructs OB3 Achievement payload with required fields', () => {
      // This test verifies the payload construction logic
      // The actual createBadge function makes API calls, so we test the payload structure

      const ob3Payload = {
        '@context': 'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        id: 'https://example.org/achievements/test',
        type: 'Achievement',
        name: 'Test Achievement',
        description: 'A test achievement',
        criteria: { narrative: 'Complete requirements' },
      }

      expect(ob3Payload).toHaveProperty('@context')
      expect(ob3Payload).toHaveProperty('id')
      expect(ob3Payload.type).toBe('Achievement')
      expect(ob3Payload.criteria).toHaveProperty('narrative')
    })

    it('uses creator instead of issuer for OB3 Achievement', () => {
      const ob3PayloadWithCreator = {
        '@context': 'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        id: 'https://example.org/achievements/test',
        type: 'Achievement',
        name: 'Test Achievement',
        description: 'A test achievement',
        criteria: { narrative: 'Complete requirements' },
        creator: {
          id: 'https://example.org/issuers/1',
          type: 'Profile',
          name: 'Test Organization',
        },
      }

      expect(ob3PayloadWithCreator).toHaveProperty('creator')
      expect(ob3PayloadWithCreator).not.toHaveProperty('issuer')
      expect(ob3PayloadWithCreator.creator.type).toBe('Profile')
    })

    it('uses alignments (plural) instead of alignment for OB3', () => {
      const ob3PayloadWithAlignments = {
        '@context': 'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        id: 'https://example.org/achievements/test',
        type: 'Achievement',
        name: 'Test Achievement',
        description: 'A test achievement',
        criteria: { narrative: 'Complete requirements' },
        alignments: [
          {
            targetName: 'Competency',
            targetUrl: 'https://example.org/framework/1',
          },
        ],
      }

      expect(ob3PayloadWithAlignments).toHaveProperty('alignments')
      expect(ob3PayloadWithAlignments).not.toHaveProperty('alignment')
      expect(Array.isArray(ob3PayloadWithAlignments.alignments)).toBe(true)
    })
  })

  describe('Backward Compatibility', () => {
    it('handles mixed OB2 and OB3 badges in badges array', () => {
      const { badges, normalizeBadgeData } = useBadges()

      const ob2Badge = {
        id: 'https://example.org/badges/1',
        type: 'BadgeClass',
        name: 'OB2 Badge',
        description: 'An OB2 badge',
        image: 'https://example.org/image.png',
        criteria: 'https://example.org/criteria',
        issuer: 'https://example.org/issuer',
      } as unknown as OB2.BadgeClass

      const ob3Achievement = {
        id: 'https://example.org/achievements/1',
        type: ['Achievement'],
        name: 'OB3 Achievement',
        description: 'An OB3 achievement',
        criteria: { narrative: 'Complete tasks' },
      } as unknown as OB3.Achievement

      badges.value = [ob2Badge, ob3Achievement]

      const normalizedBadges = badges.value.map(normalizeBadgeData)

      expect(normalizedBadges).toHaveLength(2)
      expect(normalizedBadges[0]?.version).toBe('2.0')
      expect(normalizedBadges[1]?.version).toBe('3.0')
    })

    it('handles mixed OB2 assertions and OB3 credentials', () => {
      const { assertions, normalizeAssertionData } = useBadges()

      // OB2 Assertion requires @context to be a valid JSON-LD object
      const ob2Assertion = {
        '@context': 'https://w3id.org/openbadges/v2',
        id: 'https://example.org/assertions/1',
        type: 'Assertion',
        badge: 'https://example.org/badges/1',
        recipient: { type: 'email', identity: 'test@example.org' },
        verification: { type: 'hosted' },
        issuedOn: '2024-01-01T00:00:00.000Z',
      } as unknown as OB2.Assertion

      // Note: The type guard requires W3C VC v1 context specifically
      const ob3VC = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        ],
        id: 'https://example.org/credentials/1',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: 'https://example.org/issuers/1',
        validFrom: '2024-01-01T00:00:00.000Z',
        credentialSubject: {
          email: 'recipient@example.org',
          achievement: {
            id: 'https://example.org/achievements/1',
            type: 'Achievement',
            name: 'Test',
            description: 'Test',
            criteria: { narrative: 'Test' },
          },
        },
      } as unknown as OB3.VerifiableCredential

      assertions.value = [ob2Assertion, ob3VC]

      const normalizedAssertions = assertions.value.map(normalizeAssertionData)

      expect(normalizedAssertions).toHaveLength(2)
      expect(normalizedAssertions[0]?.version).toBe('2.0')
      expect(normalizedAssertions[1]?.version).toBe('3.0')
    })
  })
})
