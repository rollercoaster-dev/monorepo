import { describe, it, expect } from 'vitest'
import {
  detectBadgeSpecVersion,
  validateAchievementPayload,
  validateVerifiableCredentialPayload,
  validateBadgeDefinitionPayload,
  validateBadgeIssuancePayload,
} from '../middleware/ob2Validation'

describe('OB3 Schema Validation', () => {
  describe('detectBadgeSpecVersion', () => {
    it('detects OB3 by @context presence', () => {
      const ob3Payload = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: 'https://example.org/credential/1',
        type: ['VerifiableCredential'],
      }
      expect(detectBadgeSpecVersion(ob3Payload)).toBe('3.0')
    })

    it('detects OB3 by type array with VerifiableCredential', () => {
      const ob3Payload = {
        id: 'https://example.org/credential/1',
        type: ['VerifiableCredential', 'OpenBadgeCredential'],
        issuer: 'https://example.org/issuer',
      }
      expect(detectBadgeSpecVersion(ob3Payload)).toBe('3.0')
    })

    it('detects OB3 by type array with OpenBadgeCredential', () => {
      const ob3Payload = {
        id: 'https://example.org/credential/1',
        type: ['OpenBadgeCredential'],
        issuer: 'https://example.org/issuer',
      }
      expect(detectBadgeSpecVersion(ob3Payload)).toBe('3.0')
    })

    it('detects OB3 by type array with Achievement', () => {
      const ob3Payload = {
        id: 'https://example.org/achievement/1',
        type: ['Achievement'],
        name: 'Test',
        description: 'Test',
        criteria: { narrative: 'Test' },
      }
      expect(detectBadgeSpecVersion(ob3Payload)).toBe('3.0')
    })

    it('detects OB3 by credentialSubject presence', () => {
      const ob3Payload = {
        id: 'https://example.org/credential/1',
        credentialSubject: {
          achievement: { id: 'https://example.org/achievement/1' },
        },
      }
      expect(detectBadgeSpecVersion(ob3Payload)).toBe('3.0')
    })

    it('detects OB2 by type string "BadgeClass"', () => {
      const ob2Payload = {
        type: 'BadgeClass',
        name: 'Test Badge',
        description: 'Test',
        image: 'https://example.org/image.png',
        criteria: 'https://example.org/criteria',
        issuer: 'https://example.org/issuer',
      }
      expect(detectBadgeSpecVersion(ob2Payload)).toBe('2.0')
    })

    it('detects OB2 by type string "Assertion"', () => {
      const ob2Payload = {
        type: 'Assertion',
        badge: 'https://example.org/badge/1',
        recipient: { type: 'email', identity: 'test@example.org' },
      }
      expect(detectBadgeSpecVersion(ob2Payload)).toBe('2.0')
    })

    it('detects OB2 by recipient presence', () => {
      const ob2Payload = {
        badge: 'https://example.org/badge/1',
        recipient: { type: 'email', identity: 'test@example.org' },
      }
      expect(detectBadgeSpecVersion(ob2Payload)).toBe('2.0')
    })

    it('detects OB2 by criteria as string', () => {
      const ob2Payload = {
        name: 'Test Badge',
        criteria: 'https://example.org/criteria', // OB2 uses string, OB3 uses object
      }
      expect(detectBadgeSpecVersion(ob2Payload)).toBe('2.0')
    })

    it('returns "unknown" for null payload', () => {
      expect(detectBadgeSpecVersion(null)).toBe('unknown')
    })

    it('returns "unknown" for non-object payload', () => {
      expect(detectBadgeSpecVersion('string')).toBe('unknown')
      expect(detectBadgeSpecVersion(123)).toBe('unknown')
      expect(detectBadgeSpecVersion(undefined)).toBe('unknown')
    })

    it('returns "unknown" for ambiguous payload', () => {
      const ambiguousPayload = {
        name: 'Something',
        description: 'No clear OB2 or OB3 indicators',
      }
      expect(detectBadgeSpecVersion(ambiguousPayload)).toBe('unknown')
    })
  })

  describe('validateAchievementPayload', () => {
    it('validates valid Achievement with all required fields', () => {
      const validAchievement = {
        id: 'https://example.org/achievements/1',
        type: ['Achievement'],
        name: 'Test Achievement',
        description: 'A valid achievement',
        criteria: { narrative: 'Complete all tasks' },
      }

      const result = validateAchievementPayload(validAchievement)

      expect(result.valid).toBe(true)
      expect(result.report.valid).toBe(true)
      expect(result.report.openBadgesVersion).toBe('3.0')
      expect(result.report.errorCount).toBe(0)
    })

    it('rejects Achievement with invalid id (not URL)', () => {
      const invalidAchievement = {
        id: 'not-a-url',
        type: ['Achievement'],
        name: 'Test',
        description: 'Test',
        criteria: { narrative: 'Test' },
      }

      const result = validateAchievementPayload(invalidAchievement)

      expect(result.valid).toBe(false)
      expect(result.report.valid).toBe(false)
      expect(result.report.errorCount).toBeGreaterThan(0)
    })

    it('rejects Achievement with criteria missing both id and narrative', () => {
      const invalidAchievement = {
        id: 'https://example.org/achievements/1',
        type: ['Achievement'],
        name: 'Test',
        description: 'Test',
        criteria: {}, // Empty criteria - needs id or narrative
      }

      const result = validateAchievementPayload(invalidAchievement)

      expect(result.valid).toBe(false)
      expect(result.report.messages.length).toBeGreaterThan(0)
    })

    it('validates Achievement with criteria.id only (no narrative)', () => {
      const achievement = {
        id: 'https://example.org/achievements/1',
        type: ['Achievement'],
        name: 'Test',
        description: 'Test',
        criteria: { id: 'https://example.org/criteria' },
      }

      const result = validateAchievementPayload(achievement)

      expect(result.valid).toBe(true)
    })

    it('validates Achievement with multi-language strings', () => {
      const multiLangAchievement = {
        id: 'https://example.org/achievements/1',
        type: ['Achievement'],
        name: { en: 'English Name', es: 'Nombre en Espanol' },
        description: { en: 'English desc', es: 'Descripcion' },
        criteria: { narrative: 'Test' },
      }

      const result = validateAchievementPayload(multiLangAchievement)

      expect(result.valid).toBe(true)
    })

    it('validates Achievement with type as string', () => {
      const achievement = {
        id: 'https://example.org/achievements/1',
        type: 'Achievement', // String, not array
        name: 'Test',
        description: 'Test',
        criteria: { narrative: 'Test' },
      }

      const result = validateAchievementPayload(achievement)

      expect(result.valid).toBe(true)
    })

    it('includes 1EdTech format error messages', () => {
      const invalidAchievement = {
        id: 'https://example.org/achievements/1',
        type: ['Achievement'],
        // Missing name, description, criteria
      }

      const result = validateAchievementPayload(invalidAchievement)

      expect(result.valid).toBe(false)
      expect(result.report.messages.length).toBeGreaterThan(0)
      expect(result.report.messages[0]).toHaveProperty('messageLevel', 'ERROR')
      expect(result.report.messages[0]).toHaveProperty('name')
      expect(result.report.messages[0]).toHaveProperty('result')
      expect(result.report.messages[0]).toHaveProperty('success', false)
    })
  })

  describe('validateVerifiableCredentialPayload', () => {
    const validVC = {
      '@context': [
        'https://www.w3.org/ns/credentials/v2',
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

    it('validates valid VerifiableCredential', () => {
      const result = validateVerifiableCredentialPayload(validVC)

      expect(result.valid).toBe(true)
      expect(result.report.valid).toBe(true)
      expect(result.report.openBadgesVersion).toBe('3.0')
    })

    it('rejects VC missing W3C context', () => {
      const invalidVC = {
        ...validVC,
        '@context': ['https://purl.imsglobal.org/spec/ob/v3p0/context.json'],
      }

      const result = validateVerifiableCredentialPayload(invalidVC)

      expect(result.valid).toBe(false)
    })

    it('rejects VC missing OB3 context', () => {
      const invalidVC = {
        ...validVC,
        '@context': ['https://www.w3.org/ns/credentials/v2'],
      }

      const result = validateVerifiableCredentialPayload(invalidVC)

      expect(result.valid).toBe(false)
    })

    it('rejects VC missing VerifiableCredential type', () => {
      const invalidVC = {
        ...validVC,
        type: ['OpenBadgeCredential'],
      }

      const result = validateVerifiableCredentialPayload(invalidVC)

      expect(result.valid).toBe(false)
    })

    it('rejects VC missing OpenBadgeCredential type', () => {
      const invalidVC = {
        ...validVC,
        type: ['VerifiableCredential'],
      }

      const result = validateVerifiableCredentialPayload(invalidVC)

      expect(result.valid).toBe(false)
    })

    it('rejects VC missing validFrom', () => {
      const invalidVC = {
        '@context': validVC['@context'],
        id: validVC.id,
        type: validVC.type,
        issuer: validVC.issuer,
        credentialSubject: validVC.credentialSubject,
        // Missing validFrom
      }

      const result = validateVerifiableCredentialPayload(invalidVC)

      expect(result.valid).toBe(false)
    })

    it('validates VC with W3C v1 context', () => {
      const v1ContextVC = {
        ...validVC,
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        ],
      }

      const result = validateVerifiableCredentialPayload(v1ContextVC)

      expect(result.valid).toBe(true)
    })

    it('validates VC with OB3 context 3.0.3', () => {
      const ob3ContextVC = {
        ...validVC,
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
          'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json',
        ],
      }

      const result = validateVerifiableCredentialPayload(ob3ContextVC)

      expect(result.valid).toBe(true)
    })

    it('validates VC with embedded issuer object', () => {
      const embeddedIssuerVC = {
        ...validVC,
        issuer: {
          id: 'https://example.org/issuers/1',
          type: 'Profile',
          name: 'Test Issuer',
          url: 'https://example.org',
        },
      }

      const result = validateVerifiableCredentialPayload(embeddedIssuerVC)

      expect(result.valid).toBe(true)
    })

    it('validates VC with proof', () => {
      const vcWithProof = {
        ...validVC,
        proof: {
          type: 'DataIntegrityProof',
          created: '2024-01-01T00:00:00.000Z',
          verificationMethod: 'https://example.org/issuers/1#key-1',
          proofPurpose: 'assertionMethod',
          proofValue: 'z58DAdFfa9...',
        },
      }

      const result = validateVerifiableCredentialPayload(vcWithProof)

      expect(result.valid).toBe(true)
    })
  })

  describe('validateBadgeDefinitionPayload (auto-detect)', () => {
    it('auto-detects and validates OB2 BadgeClass', () => {
      const ob2Badge = {
        type: 'BadgeClass',
        name: 'OB2 Badge',
        description: 'An OB2 badge',
        image: 'https://example.org/image.png',
        criteria: 'https://example.org/criteria',
        issuer: 'https://example.org/issuer',
      }

      const result = validateBadgeDefinitionPayload(ob2Badge)

      expect(result.valid).toBe(true)
      expect(result.report.openBadgesVersion).toBe('2.0')
    })

    it('auto-detects and validates OB3 Achievement', () => {
      const ob3Achievement = {
        id: 'https://example.org/achievements/1',
        type: ['Achievement'],
        name: 'OB3 Achievement',
        description: 'An OB3 achievement',
        criteria: { narrative: 'Complete tasks' },
      }

      const result = validateBadgeDefinitionPayload(ob3Achievement)

      expect(result.valid).toBe(true)
      expect(result.report.openBadgesVersion).toBe('3.0')
    })

    it('returns error for unknown spec version', () => {
      const unknownPayload = {
        something: 'random',
        fields: 'that do not match either spec',
      }

      const result = validateBadgeDefinitionPayload(unknownPayload)

      expect(result.valid).toBe(false)
      expect(result.report.messages.length).toBeGreaterThan(0)
      expect(result.report.messages[0]?.name).toBe('VALIDATE_SPEC_VERSION')
    })
  })

  describe('validateBadgeIssuancePayload (auto-detect)', () => {
    it('auto-detects and validates OB2 Assertion', () => {
      const ob2Assertion = {
        badge: 'https://example.org/badges/1',
        recipient: { type: 'email', identity: 'test@example.org' },
        issuedOn: '2024-01-01T00:00:00.000Z',
      }

      const result = validateBadgeIssuancePayload(ob2Assertion)

      expect(result.valid).toBe(true)
      expect(result.report.openBadgesVersion).toBe('2.0')
    })

    it('auto-detects and validates OB3 VerifiableCredential', () => {
      const ob3VC = {
        '@context': [
          'https://www.w3.org/ns/credentials/v2',
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

      const result = validateBadgeIssuancePayload(ob3VC)

      expect(result.valid).toBe(true)
      expect(result.report.openBadgesVersion).toBe('3.0')
    })

    it('returns error for unknown spec version', () => {
      const unknownPayload = {
        random: 'data',
      }

      const result = validateBadgeIssuancePayload(unknownPayload)

      expect(result.valid).toBe(false)
      expect(result.report.messages.length).toBeGreaterThan(0)
      expect(result.report.messages[0]?.name).toBe('VALIDATE_SPEC_VERSION')
    })
  })

  describe('Type Field Handling', () => {
    it('handles OB3 Achievement type as string', () => {
      const achievement = {
        id: 'https://example.org/achievements/1',
        type: 'Achievement',
        name: 'Test',
        description: 'Test',
        criteria: { narrative: 'Test' },
      }

      const result = validateAchievementPayload(achievement)
      expect(result.valid).toBe(true)
    })

    it('handles OB3 Achievement type as array', () => {
      const achievement = {
        id: 'https://example.org/achievements/1',
        type: ['Achievement'],
        name: 'Test',
        description: 'Test',
        criteria: { narrative: 'Test' },
      }

      const result = validateAchievementPayload(achievement)
      expect(result.valid).toBe(true)
    })

    it('handles OB3 Achievement with multiple types', () => {
      const achievement = {
        id: 'https://example.org/achievements/1',
        type: ['Achievement', 'CustomType', 'ExtensionType'],
        name: 'Test',
        description: 'Test',
        criteria: { narrative: 'Test' },
      }

      const result = validateAchievementPayload(achievement)
      expect(result.valid).toBe(true)
    })

    it('rejects OB2 criteria format in OB3 Achievement', () => {
      // OB3 criteria must be an object with id or narrative
      // OB2 allows criteria as a string URL
      const invalidAchievement = {
        id: 'https://example.org/achievements/1',
        type: ['Achievement'],
        name: 'Test',
        description: 'Test',
        criteria: 'https://example.org/criteria', // OB2 format - invalid for OB3
      }

      const result = validateAchievementPayload(invalidAchievement)
      expect(result.valid).toBe(false)
    })
  })

  describe('Alignment Validation', () => {
    it('validates Achievement with valid alignments', () => {
      const achievement = {
        id: 'https://example.org/achievements/1',
        type: ['Achievement'],
        name: 'Test',
        description: 'Test',
        criteria: { narrative: 'Test' },
        alignments: [
          {
            targetName: 'Competency Framework',
            targetUrl: 'https://example.org/framework/1',
            targetDescription: 'A competency',
            targetFramework: 'Skills Framework',
            targetCode: 'COMP-001',
          },
        ],
      }

      const result = validateAchievementPayload(achievement)
      expect(result.valid).toBe(true)
    })

    it('rejects Achievement with alignment missing targetName', () => {
      const achievement = {
        id: 'https://example.org/achievements/1',
        type: ['Achievement'],
        name: 'Test',
        description: 'Test',
        criteria: { narrative: 'Test' },
        alignments: [
          {
            // Missing targetName
            targetUrl: 'https://example.org/framework/1',
          },
        ],
      }

      const result = validateAchievementPayload(achievement)
      expect(result.valid).toBe(false)
    })

    it('rejects Achievement with alignment missing targetUrl', () => {
      const achievement = {
        id: 'https://example.org/achievements/1',
        type: ['Achievement'],
        name: 'Test',
        description: 'Test',
        criteria: { narrative: 'Test' },
        alignments: [
          {
            targetName: 'Competency',
            // Missing targetUrl
          },
        ],
      }

      const result = validateAchievementPayload(achievement)
      expect(result.valid).toBe(false)
    })
  })
})
