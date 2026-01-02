import type { OB2 } from 'openbadges-types'
import { OpenBadgesVersion } from 'openbadges-types'
import type { IssueBadgeData, CreateBadgeData } from '@/composables/useBadges'

/**
 * Normalizes badge issuance data for the appropriate OpenBadges version
 * @param issueData - The badge issuance data from the UI
 * @param version - The target OpenBadges version
 * @returns Payload formatted for OB2 or OB3 API
 */
export function normalizeIssueBadgeData(
  issueData: IssueBadgeData,
  version: OpenBadgesVersion
): OB2IssueBadgePayload | OB3IssueBadgePayload {
  if (version === OpenBadgesVersion.V2) {
    return {
      badge: issueData.badgeClassId,
      recipient: {
        type: 'email',
        hashed: false,
        identity: issueData.recipientEmail,
      },
      issuedOn: issueData.validFrom || new Date().toISOString(),
      expires: issueData.validUntil,
      evidence: issueData.evidence,
      narrative: issueData.narrative,
    }
  } else {
    // OB3 format
    return {
      '@context': [
        'https://www.w3.org/ns/credentials/v2',
        'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json',
      ],
      type: ['VerifiableCredential', 'OpenBadgeCredential'],
      issuer: '', // Placeholder - should be provided by server config
      credentialSubject: {
        achievement: issueData.badgeClassId,
        identifier: [
          {
            identityHash: issueData.recipientEmail,
            identityType: 'email',
            hashed: false,
          },
        ],
      },
      validFrom: issueData.validFrom || new Date().toISOString(),
      validUntil: issueData.validUntil,
      evidence: issueData.evidence
        ? [
            {
              narrative: issueData.narrative || '',
              id: issueData.evidence,
            },
          ]
        : undefined,
    }
  }
}

/**
 * Normalizes badge creation data for the appropriate OpenBadges version
 * @param badgeData - The badge creation data from the UI
 * @param version - The target OpenBadges version
 * @returns Payload formatted for OB2 or OB3 API
 */
export function normalizeCreateBadgeData(
  badgeData: CreateBadgeData,
  version: OpenBadgesVersion
): OB2CreateBadgePayload | OB3CreateBadgePayload {
  if (version === OpenBadgesVersion.V2) {
    return {
      type: 'BadgeClass',
      name: badgeData.name,
      description: badgeData.description,
      image: badgeData.image,
      criteria: badgeData.criteria,
      issuer: badgeData.issuer,
      tags: badgeData.tags,
      alignment: badgeData.alignment,
      expires: badgeData.expires,
    }
  } else {
    // OB3 format - Achievement
    return {
      type: 'Achievement',
      name: badgeData.name,
      description: badgeData.description,
      image: badgeData.image,
      criteria: {
        narrative: badgeData.criteria.narrative,
      },
      // OB3 doesn't have tags at Achievement level, would be on VerifiableCredential
      // OB3 doesn't have alignment in the same way
      // expires would be validUntil at VC level, not Achievement
    }
  }
}

/**
 * Type definitions for API payloads
 */

// OB2 issue badge payload (extends Assertion with required fields)
export interface OB2IssueBadgePayload {
  badge: string // BadgeClass ID
  recipient: {
    type: string
    hashed: boolean
    identity: string
  }
  issuedOn: string
  expires?: string
  evidence?: string
  narrative?: string
}

// OB3 issue badge payload (VerifiableCredential creation)
export interface OB3IssueBadgePayload {
  '@context': [string, string]
  type: [string, string]
  issuer: string
  credentialSubject: {
    achievement: string // Achievement ID
    identifier: Array<{
      identityHash: string
      identityType: string
      hashed: boolean
    }>
  }
  validFrom: string
  validUntil?: string
  evidence?: Array<{
    narrative: string
    id: string
  }>
}

// OB2 create badge payload
export interface OB2CreateBadgePayload {
  type: 'BadgeClass'
  name: string
  description: string
  image: string
  criteria: {
    narrative: string
    id?: string
  }
  issuer: OB2.Profile
  tags?: string[]
  alignment?: OB2.AlignmentObject[]
  expires?: string
}

// OB3 create badge payload (Achievement)
export interface OB3CreateBadgePayload {
  type: 'Achievement'
  name: string
  description: string
  image: string
  criteria: {
    narrative: string
  }
}
