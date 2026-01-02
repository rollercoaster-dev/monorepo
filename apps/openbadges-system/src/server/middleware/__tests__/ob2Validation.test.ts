import { describe, it, expect } from 'vitest'
import {
  badgeClassSchema,
  assertionSchema,
  achievementSchema,
  verifiableCredentialSchema,
  validateBadgeClassPayload,
  validateAssertionPayload,
  validateAchievementPayload,
  validateVerifiableCredentialPayload,
  detectBadgeSpecVersion,
  validateBadgeDefinitionPayload,
  validateBadgeIssuancePayload,
} from '../ob2Validation'

describe('OB2 Validation Schemas', () => {
  describe('BadgeClass', () => {
    it('validates a correct BadgeClass payload', () => {
      const payload = {
        type: 'BadgeClass',
        name: 'Test Badge',
        description: 'A test badge',
        image: 'https://example.org/badge.png',
        criteria: {
          narrative: 'Complete tasks',
          id: 'https://example.org/criteria',
        },
        issuer: {
          id: 'https://example.org/issuer/1',
          type: 'Profile',
          name: 'Example Issuer',
          url: 'https://example.org',
        },
        alignment: [{ targetName: 'Skill A', targetUrl: 'https://example.org/skill-a' }],
      }
      const res = badgeClassSchema.safeParse(payload)
      expect(res.success).toBe(true)
    })

    it('rejects invalid image and missing narrative', () => {
      const payload = {
        type: 'BadgeClass',
        name: 'Badge',
        description: 'desc',
        image: 'not-a-url',
        criteria: { narrative: '' },
        issuer: 'https://example.org/issuer/1',
      }
      const res = validateBadgeClassPayload(payload)
      expect(res.valid).toBe(false)
      expect(res.report.valid).toBe(false)
      expect(res.report.errorCount).toBeGreaterThanOrEqual(2)

      // Check for image error
      const imageError = res.report.messages.find(
        m => m.node_path?.includes('image') && m.result.includes('IRI')
      )
      expect(imageError).toBeDefined()
      expect(imageError?.messageLevel).toBe('ERROR')
      expect(imageError?.success).toBe(false)

      // Check for criteria.narrative error
      const narrativeError = res.report.messages.find(
        m => m.node_path?.includes('criteria') && m.result.includes('narrative')
      )
      expect(narrativeError).toBeDefined()
    })

    it('accepts criteria as IRI string', () => {
      const payload = {
        type: 'BadgeClass',
        name: 'Badge',
        description: 'desc',
        image: 'https://example.org/img.png',
        criteria: 'https://example.org/criteria',
        issuer: 'https://example.org/issuer/1',
      }
      const res = validateBadgeClassPayload(payload)
      expect(res.valid).toBe(true)
      expect(res.report.valid).toBe(true)
      expect(res.report.errorCount).toBe(0)
      expect(res.report.messages).toHaveLength(0)
    })
  })

  describe('Assertion', () => {
    it('validates a correct Assertion issuance payload', () => {
      const payload = {
        badge: 'https://example.org/badges/1',
        recipient: { type: 'email', hashed: false, identity: 'user@example.org' },
        issuedOn: '2024-01-01T00:00:00.000Z',
        evidence: ['https://example.org/evidence/1'],
        narrative: 'Great work',
      }
      const res = assertionSchema.safeParse(payload)
      expect(res.success).toBe(true)
    })

    it('rejects invalid recipient email and evidence URL', () => {
      const payload = {
        badge: 'https://example.org/badges/1',
        recipient: { type: 'email', identity: 'not-an-email' },
        evidence: 'not-a-url',
      }
      const res = validateAssertionPayload(payload)
      expect(res.valid).toBe(false)
      expect(res.report.errorCount).toBeGreaterThanOrEqual(2)

      // Check for email error
      const emailError = res.report.messages.find(
        m => m.node_path?.join('.').includes('recipient') && m.result.includes('email')
      )
      expect(emailError).toBeDefined()

      // Check for evidence URL error
      const evidenceError = res.report.messages.find(m => m.node_path?.includes('evidence'))
      expect(evidenceError).toBeDefined()
      expect(evidenceError?.result).toContain('IRI')
    })
  })
})

describe('OB3 Validation Schemas', () => {
  describe('Achievement', () => {
    it('validates a correct Achievement payload with string name/description', () => {
      const payload = {
        id: 'https://example.org/achievement/1',
        type: ['Achievement'],
        name: 'Test Achievement',
        description: 'A test achievement',
        criteria: {
          narrative: 'Complete all tasks',
        },
      }
      const res = achievementSchema.safeParse(payload)
      expect(res.success).toBe(true)
    })

    it('validates a correct Achievement payload with multi-language strings', () => {
      const payload = {
        id: 'https://example.org/achievement/1',
        type: ['Achievement'],
        name: { en: 'Test Achievement', es: 'Logro de Prueba' },
        description: { en: 'A test achievement', es: 'Un logro de prueba' },
        criteria: {
          id: 'https://example.org/criteria/1',
        },
      }
      const res = achievementSchema.safeParse(payload)
      expect(res.success).toBe(true)
    })

    it('validates Achievement with criteria narrative only', () => {
      const payload = {
        id: 'https://example.org/achievement/1',
        name: 'Achievement',
        description: 'Desc',
        criteria: {
          narrative: 'Complete tasks',
        },
      }
      const res = validateAchievementPayload(payload)
      expect(res.valid).toBe(true)
      expect(res.report.openBadgesVersion).toBe('3.0')
    })

    it('validates Achievement with criteria id only', () => {
      const payload = {
        id: 'https://example.org/achievement/1',
        name: 'Achievement',
        description: 'Desc',
        criteria: {
          id: 'https://example.org/criteria/1',
        },
      }
      const res = validateAchievementPayload(payload)
      expect(res.valid).toBe(true)
      expect(res.report.openBadgesVersion).toBe('3.0')
    })

    it('rejects Achievement missing required field: id', () => {
      const payload = {
        name: 'Achievement',
        description: 'Desc',
        criteria: { narrative: 'Complete' },
      }
      const res = validateAchievementPayload(payload)
      expect(res.valid).toBe(false)
      expect(res.report.errorCount).toBeGreaterThanOrEqual(1)
      expect(res.report.openBadgesVersion).toBe('3.0')
      const idError = res.report.messages.find(m => m.node_path?.includes('id'))
      expect(idError).toBeDefined()
    })

    it('rejects Achievement missing required field: name', () => {
      const payload = {
        id: 'https://example.org/achievement/1',
        description: 'Desc',
        criteria: { narrative: 'Complete' },
      }
      const res = validateAchievementPayload(payload)
      expect(res.valid).toBe(false)
      expect(res.report.errorCount).toBeGreaterThanOrEqual(1)
      const nameError = res.report.messages.find(m => m.node_path?.includes('name'))
      expect(nameError).toBeDefined()
    })

    it('rejects Achievement missing required field: description', () => {
      const payload = {
        id: 'https://example.org/achievement/1',
        name: 'Achievement',
        criteria: { narrative: 'Complete' },
      }
      const res = validateAchievementPayload(payload)
      expect(res.valid).toBe(false)
      expect(res.report.errorCount).toBeGreaterThanOrEqual(1)
      const descError = res.report.messages.find(m => m.node_path?.includes('description'))
      expect(descError).toBeDefined()
    })

    it('rejects Achievement missing required field: criteria', () => {
      const payload = {
        id: 'https://example.org/achievement/1',
        name: 'Achievement',
        description: 'Desc',
      }
      const res = validateAchievementPayload(payload)
      expect(res.valid).toBe(false)
      expect(res.report.errorCount).toBeGreaterThanOrEqual(1)
      const criteriaError = res.report.messages.find(m => m.node_path?.includes('criteria'))
      expect(criteriaError).toBeDefined()
    })

    it('rejects Achievement with invalid IRI format', () => {
      const payload = {
        id: 'not-a-url',
        name: 'Achievement',
        description: 'Desc',
        criteria: { narrative: 'Complete' },
      }
      const res = validateAchievementPayload(payload)
      expect(res.valid).toBe(false)
      const iriError = res.report.messages.find(
        m => m.node_path?.includes('id') && m.result.includes('IRI')
      )
      expect(iriError).toBeDefined()
    })

    it('rejects Achievement with criteria missing both id and narrative', () => {
      const payload = {
        id: 'https://example.org/achievement/1',
        name: 'Achievement',
        description: 'Desc',
        criteria: {},
      }
      const res = validateAchievementPayload(payload)
      expect(res.valid).toBe(false)
      const criteriaError = res.report.messages.find(m => m.result.includes('id or narrative'))
      expect(criteriaError).toBeDefined()
    })
  })

  describe('VerifiableCredential', () => {
    it('validates a correct VerifiableCredential payload', () => {
      const payload = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: 'https://example.org/credential/1',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: 'https://example.org/issuer/1',
        validFrom: '2024-01-01T00:00:00.000Z',
        credentialSubject: {
          achievement: {
            id: 'https://example.org/achievement/1',
            name: 'Achievement',
            description: 'Desc',
            criteria: { narrative: 'Complete' },
          },
        },
      }
      const res = verifiableCredentialSchema.safeParse(payload)
      expect(res.success).toBe(true)
    })

    it('validates VerifiableCredential with embedded Achievement', () => {
      const payload = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: 'https://example.org/credential/1',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: {
          id: 'https://example.org/issuer/1',
          name: 'Test Issuer',
          url: 'https://example.org',
        },
        validFrom: '2024-01-01T00:00:00.000Z',
        credentialSubject: {
          achievement: {
            id: 'https://example.org/achievement/1',
            name: 'Achievement',
            description: 'Desc',
            criteria: { id: 'https://example.org/criteria/1' },
          },
        },
      }
      const res = validateVerifiableCredentialPayload(payload)
      expect(res.valid).toBe(true)
      expect(res.report.openBadgesVersion).toBe('3.0')
    })

    it('validates VerifiableCredential with proof', () => {
      const payload = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: 'https://example.org/credential/1',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: 'https://example.org/issuer/1',
        validFrom: '2024-01-01T00:00:00.000Z',
        credentialSubject: {
          achievement: {
            id: 'https://example.org/achievement/1',
            name: 'Achievement',
            description: 'Desc',
            criteria: { narrative: 'Complete' },
          },
        },
        proof: {
          type: 'DataIntegrityProof',
          created: '2024-01-01T00:00:00.000Z',
          verificationMethod: 'https://example.org/issuer/1#key-1',
          proofPurpose: 'assertionMethod',
          proofValue: 'z...',
        },
      }
      const res = validateVerifiableCredentialPayload(payload)
      expect(res.valid).toBe(true)
    })

    it('validates VerifiableCredential with evidence array', () => {
      const payload = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: 'https://example.org/credential/1',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: 'https://example.org/issuer/1',
        validFrom: '2024-01-01T00:00:00.000Z',
        credentialSubject: {
          achievement: {
            id: 'https://example.org/achievement/1',
            name: 'Achievement',
            description: 'Desc',
            criteria: { narrative: 'Complete' },
          },
        },
        evidence: [
          { id: 'https://example.org/evidence/1', narrative: 'Evidence 1' },
          { id: 'https://example.org/evidence/2', narrative: 'Evidence 2' },
        ],
      }
      const res = validateVerifiableCredentialPayload(payload)
      expect(res.valid).toBe(true)
    })

    it('rejects VerifiableCredential missing required field: id', () => {
      const payload = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: 'https://example.org/issuer/1',
        validFrom: '2024-01-01T00:00:00.000Z',
        credentialSubject: {
          achievement: {
            id: 'https://example.org/achievement/1',
            name: 'Achievement',
            description: 'Desc',
            criteria: { narrative: 'Complete' },
          },
        },
      }
      const res = validateVerifiableCredentialPayload(payload)
      expect(res.valid).toBe(false)
      expect(res.report.openBadgesVersion).toBe('3.0')
      const idError = res.report.messages.find(m => m.node_path?.includes('id'))
      expect(idError).toBeDefined()
    })

    it('rejects VerifiableCredential missing required field: issuer', () => {
      const payload = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: 'https://example.org/credential/1',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        validFrom: '2024-01-01T00:00:00.000Z',
        credentialSubject: {
          achievement: {
            id: 'https://example.org/achievement/1',
            name: 'Achievement',
            description: 'Desc',
            criteria: { narrative: 'Complete' },
          },
        },
      }
      const res = validateVerifiableCredentialPayload(payload)
      expect(res.valid).toBe(false)
      const issuerError = res.report.messages.find(m => m.node_path?.includes('issuer'))
      expect(issuerError).toBeDefined()
    })

    it('rejects VerifiableCredential missing required field: validFrom', () => {
      const payload = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: 'https://example.org/credential/1',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: 'https://example.org/issuer/1',
        credentialSubject: {
          achievement: {
            id: 'https://example.org/achievement/1',
            name: 'Achievement',
            description: 'Desc',
            criteria: { narrative: 'Complete' },
          },
        },
      }
      const res = validateVerifiableCredentialPayload(payload)
      expect(res.valid).toBe(false)
      const validFromError = res.report.messages.find(m => m.node_path?.includes('validFrom'))
      expect(validFromError).toBeDefined()
    })

    it('rejects VerifiableCredential missing required field: credentialSubject', () => {
      const payload = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: 'https://example.org/credential/1',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: 'https://example.org/issuer/1',
        validFrom: '2024-01-01T00:00:00.000Z',
      }
      const res = validateVerifiableCredentialPayload(payload)
      expect(res.valid).toBe(false)
      const subjectError = res.report.messages.find(m => m.node_path?.includes('credentialSubject'))
      expect(subjectError).toBeDefined()
    })

    it('rejects VerifiableCredential with invalid date format', () => {
      const payload = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: 'https://example.org/credential/1',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: 'https://example.org/issuer/1',
        validFrom: 'not-a-date',
        credentialSubject: {
          achievement: {
            id: 'https://example.org/achievement/1',
            name: 'Achievement',
            description: 'Desc',
            criteria: { narrative: 'Complete' },
          },
        },
      }
      const res = validateVerifiableCredentialPayload(payload)
      expect(res.valid).toBe(false)
      const dateError = res.report.messages.find(
        m => m.node_path?.includes('validFrom') && m.result.includes('ISO 8601')
      )
      expect(dateError).toBeDefined()
    })

    it('rejects VerifiableCredential with invalid credentialSubject (missing achievement)', () => {
      const payload = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: 'https://example.org/credential/1',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: 'https://example.org/issuer/1',
        validFrom: '2024-01-01T00:00:00.000Z',
        credentialSubject: {},
      }
      const res = validateVerifiableCredentialPayload(payload)
      expect(res.valid).toBe(false)
      const achievementError = res.report.messages.find(m => m.node_path?.includes('achievement'))
      expect(achievementError).toBeDefined()
    })
  })

  describe('Spec version detection', () => {
    it('detects OB2 BadgeClass correctly', () => {
      const payload = {
        type: 'BadgeClass',
        name: 'Badge',
        description: 'Desc',
      }
      expect(detectBadgeSpecVersion(payload)).toBe('2.0')
    })

    it('detects OB2 Assertion correctly', () => {
      const payload = {
        type: 'Assertion',
        badge: 'https://example.org/badge/1',
        recipient: { type: 'email', identity: 'user@example.org' },
      }
      expect(detectBadgeSpecVersion(payload)).toBe('2.0')
    })

    it('detects OB3 Achievement correctly', () => {
      const payload = {
        id: 'https://example.org/achievement/1',
        type: ['Achievement'],
        name: 'Achievement',
      }
      expect(detectBadgeSpecVersion(payload)).toBe('3.0')
    })

    it('detects OB3 VerifiableCredential correctly via @context', () => {
      const payload = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: 'https://example.org/credential/1',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
      }
      expect(detectBadgeSpecVersion(payload)).toBe('3.0')
    })

    it('detects OB3 VerifiableCredential correctly via credentialSubject', () => {
      const payload = {
        id: 'https://example.org/credential/1',
        credentialSubject: { achievement: {} },
      }
      expect(detectBadgeSpecVersion(payload)).toBe('3.0')
    })

    it('returns unknown for ambiguous payloads', () => {
      const payload = {
        id: 'https://example.org/something',
        name: 'Something',
      }
      expect(detectBadgeSpecVersion(payload)).toBe('unknown')
    })

    it('returns unknown for null payload', () => {
      expect(detectBadgeSpecVersion(null)).toBe('unknown')
    })

    it('returns unknown for non-object payload', () => {
      expect(detectBadgeSpecVersion('string')).toBe('unknown')
    })
  })

  describe('Auto-detecting wrappers', () => {
    it('routes OB2 BadgeClass to correct validator', () => {
      const payload = {
        type: 'BadgeClass',
        name: 'Badge',
        description: 'Desc',
        image: 'https://example.org/badge.png',
        criteria: 'https://example.org/criteria',
        issuer: 'https://example.org/issuer',
      }
      const res = validateBadgeDefinitionPayload(payload)
      expect(res.valid).toBe(true)
      expect(res.report.openBadgesVersion).toBe('2.0')
    })

    it('routes OB3 Achievement to correct validator', () => {
      const payload = {
        id: 'https://example.org/achievement/1',
        type: ['Achievement'],
        name: 'Achievement',
        description: 'Desc',
        criteria: { narrative: 'Complete' },
      }
      const res = validateBadgeDefinitionPayload(payload)
      expect(res.valid).toBe(true)
      expect(res.report.openBadgesVersion).toBe('3.0')
    })

    it('routes OB2 Assertion to correct validator', () => {
      const payload = {
        badge: 'https://example.org/badge/1',
        recipient: { type: 'email', identity: 'user@example.org' },
      }
      const res = validateBadgeIssuancePayload(payload)
      expect(res.valid).toBe(true)
      expect(res.report.openBadgesVersion).toBe('2.0')
    })

    it('routes OB3 VerifiableCredential to correct validator', () => {
      const payload = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: 'https://example.org/credential/1',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: 'https://example.org/issuer/1',
        validFrom: '2024-01-01T00:00:00.000Z',
        credentialSubject: {
          achievement: {
            id: 'https://example.org/achievement/1',
            name: 'Achievement',
            description: 'Desc',
            criteria: { narrative: 'Complete' },
          },
        },
      }
      const res = validateBadgeIssuancePayload(payload)
      expect(res.valid).toBe(true)
      expect(res.report.openBadgesVersion).toBe('3.0')
    })

    it('returns clear error for unknown spec version in badge definition', () => {
      const payload = {
        id: 'https://example.org/something',
        name: 'Something',
      }
      const res = validateBadgeDefinitionPayload(payload)
      expect(res.valid).toBe(false)
      expect(res.report.messages.length).toBeGreaterThan(0)
      expect(res.report.messages[0]!.name).toBe('VALIDATE_SPEC_VERSION')
      expect(res.report.messages[0]!.result).toContain(
        'Unable to determine badge specification version'
      )
    })

    it('returns clear error for unknown spec version in badge issuance', () => {
      const payload = {
        id: 'https://example.org/something',
      }
      const res = validateBadgeIssuancePayload(payload)
      expect(res.valid).toBe(false)
      expect(res.report.messages.length).toBeGreaterThan(0)
      expect(res.report.messages[0]!.name).toBe('VALIDATE_SPEC_VERSION')
      expect(res.report.messages[0]!.result).toContain(
        'Unable to determine badge specification version'
      )
    })
  })
})
