import { describe, it, expect } from 'vitest'
import {
  badgeClassSchema,
  assertionSchema,
  validateBadgeClassPayload,
  validateAssertionPayload,
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
