import { z } from 'zod'
import type { ValidationMessage, ValidationReportContent } from 'openbadges-types'

// Shared helpers
const iriSchema = z.string().url({ message: 'Must be a valid IRI (URL)' })
const nonEmpty = (msg: string) => z.string().min(1, { message: msg })
const isoDateSchema = z.string().refine(
  v => {
    if (!v) return true
    // ISO 8601 datetime pattern
    const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/
    if (!isoPattern.test(v)) return false
    const date = new Date(v)
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(v.slice(0, 10))
  },
  {
    message: 'Must be a valid ISO 8601 date string',
  }
)

// OB2 AlignmentObject (subset we use)
const alignmentSchema = z.object({
  targetName: nonEmpty('Alignment targetName is required'),
  targetUrl: iriSchema,
  targetDescription: z.string().optional(),
  targetFramework: z.string().optional(),
})

// OB2 Profile (Issuer)
const issuerObjectSchema = z.object({
  id: iriSchema.optional(),
  type: z.union([z.literal('Issuer'), z.literal('Profile'), z.array(z.string())]).optional(),
  name: nonEmpty('Issuer name is required'),
  url: iriSchema.optional(),
  email: z.string().email().optional(),
  description: z.string().optional(),
})

const issuerSchema = z.union([iriSchema, issuerObjectSchema])

// OB2 Criteria can be a string (IRI) or object with narrative (+ optional id)
const criteriaSchema = z.union([
  iriSchema, // IRI form
  z.object({
    narrative: nonEmpty('Criteria narrative is required'),
    id: iriSchema.optional(),
  }),
])

// BadgeClass schema (subset sufficient for creation)
export const badgeClassSchema = z.object({
  type: z.literal('BadgeClass', { message: 'type must be BadgeClass' }),
  name: nonEmpty('Badge name is required'),
  description: nonEmpty('Badge description is required'),
  image: iriSchema,
  criteria: criteriaSchema,
  issuer: issuerSchema,
  tags: z.array(z.string()).optional(),
  alignment: z.array(alignmentSchema).optional(),
  expires: isoDateSchema.optional(),
})

// Assertion issuance schema (subset)
const recipientSchema = z.object({
  type: z.literal('email', { message: 'recipient.type must be "email"' }),
  hashed: z.boolean().optional(),
  identity: z.string().email({ message: 'recipient.identity must be a valid email' }),
})

export const assertionSchema = z
  .object({
    badge: nonEmpty('badge (BadgeClass IRI or id) is required'),
    recipient: recipientSchema,
    issuedOn: isoDateSchema.optional(),
    // OB2 field (deprecated, but supported for backward compatibility)
    expires: isoDateSchema.optional(),
    // OB3 fields (preferred)
    validFrom: isoDateSchema.optional(),
    validUntil: isoDateSchema.optional(),
    evidence: z
      .union([
        iriSchema, // single evidence URL
        z.array(iriSchema), // or array of URLs
      ])
      .optional(),
    narrative: z.string().optional(),
  })
  .refine(
    data => {
      // Ensure validFrom < validUntil if both are provided
      if (data.validFrom && data.validUntil) {
        return new Date(data.validFrom) < new Date(data.validUntil)
      }
      return true
    },
    {
      message: 'validFrom must be before validUntil',
      path: ['validFrom'],
    }
  )

export type ValidationResult<T> =
  | { valid: true; data: T; report: ValidationReportContent }
  | { valid: false; report: ValidationReportContent }

/**
 * Maps Zod issue codes to task names for consistent error identification
 */
function getTaskName(issue: z.ZodIssue): string {
  const pathStr =
    issue.path.length > 0 ? issue.path.map(p => String(p).toUpperCase()).join('_') : 'ROOT'

  const code = issue.code as string
  switch (code) {
    case 'invalid_type':
      return `VALIDATE_TYPE_${pathStr}`
    case 'invalid_string': {
      // Use runtime check for 'validation' property (not part of Zod's public API)
      if ('validation' in issue && issue.validation === 'url') return `VALIDATE_IRI_${pathStr}`
      if ('validation' in issue && issue.validation === 'email') return `VALIDATE_EMAIL_${pathStr}`
      return `VALIDATE_STRING_${pathStr}`
    }
    case 'too_small':
      return `VALIDATE_REQUIRED_${pathStr}`
    case 'invalid_literal':
      return `VALIDATE_LITERAL_${pathStr}`
    case 'invalid_union':
      return `VALIDATE_UNION_${pathStr}`
    case 'invalid_format':
      return `VALIDATE_FORMAT_${pathStr}`
    default:
      return `VALIDATE_${pathStr}`
  }
}

/**
 * Transforms Zod validation issues into 1EdTech-format ValidationMessages
 */
function zodIssuesToMessages(issues: z.ZodIssue[]): ValidationMessage[] {
  return issues.map(issue => ({
    name: getTaskName(issue),
    messageLevel: 'ERROR' as const,
    node_path: issue.path as Array<string | number>,
    success: false,
    result: issue.message,
  }))
}

/**
 * Creates a ValidationReportContent from validation results
 */
function createValidationReport(
  messages: ValidationMessage[],
  options?: { openBadgesVersion?: '2.0' | '3.0' }
): ValidationReportContent {
  const errorCount = messages.filter(m => m.messageLevel === 'ERROR').length
  const warningCount = messages.filter(m => m.messageLevel === 'WARNING').length

  return {
    valid: errorCount === 0,
    errorCount,
    warningCount,
    messages,
    ...options,
  }
}

export function validateBadgeClassPayload(
  payload: unknown
): ValidationResult<z.infer<typeof badgeClassSchema>> {
  const res = badgeClassSchema.safeParse(payload)

  if (res.success) {
    return {
      valid: true,
      data: res.data,
      report: createValidationReport([], { openBadgesVersion: '2.0' }),
    }
  }

  const messages = zodIssuesToMessages(res.error.issues)
  return {
    valid: false,
    report: createValidationReport(messages, { openBadgesVersion: '2.0' }),
  }
}

export function validateAssertionPayload(
  payload: unknown
): ValidationResult<z.infer<typeof assertionSchema>> {
  const res = assertionSchema.safeParse(payload)

  if (res.success) {
    return {
      valid: true,
      data: res.data,
      report: createValidationReport([], { openBadgesVersion: '2.0' }),
    }
  }

  const messages = zodIssuesToMessages(res.error.issues)
  return {
    valid: false,
    report: createValidationReport(messages, { openBadgesVersion: '2.0' }),
  }
}

// OB3 Multi-language string schema (string or object with language keys)
const multiLanguageStringSchema = z.union([
  z.string(),
  z.record(z.string(), z.string()), // Language code → string value
])

// OB3 Issuer/Profile schema (per OB3 spec, only id and type are required)
const ob3IssuerSchema = z.object({
  id: iriSchema,
  type: z.union([z.string(), z.array(z.string())]), // Required - must include 'Profile'
  name: multiLanguageStringSchema.optional(),
  description: multiLanguageStringSchema.optional(),
  url: iriSchema.optional(),
  image: z.union([iriSchema, z.object({ id: iriSchema, type: z.string() })]).optional(),
  email: z.string().email().optional(),
  telephone: z.string().optional(),
})

// OB3 Criteria schema (id OR narrative required)
const ob3CriteriaSchema = z
  .object({
    id: iriSchema.optional(),
    type: z.union([z.string(), z.array(z.string())]).optional(),
    narrative: multiLanguageStringSchema.optional(),
  })
  .refine(data => data.id || data.narrative, {
    message: 'Criteria must have either id or narrative',
  })

// OB3 Alignment schema
const ob3AlignmentSchema = z.object({
  targetName: nonEmpty('Alignment targetName is required'),
  targetUrl: iriSchema,
  targetDescription: z.string().optional(),
  targetFramework: z.string().optional(),
  targetCode: z.string().optional(),
})

// OB3 Achievement schema
export const achievementSchema = z.object({
  id: iriSchema,
  type: z.union([z.string(), z.array(z.string())]).optional(),
  name: multiLanguageStringSchema,
  description: multiLanguageStringSchema,
  criteria: ob3CriteriaSchema,
  image: z.union([iriSchema, z.object({ id: iriSchema, type: z.string() })]).optional(),
  creator: z.union([iriSchema, ob3IssuerSchema]).optional(),
  alignments: z.array(ob3AlignmentSchema).optional(),
})

// OB3 CredentialSubject schema
const credentialSubjectSchema = z.object({
  id: iriSchema.optional(),
  type: z.union([z.string(), z.array(z.string())]).optional(),
  achievement: z.union([achievementSchema, z.array(achievementSchema)]),
  name: multiLanguageStringSchema.optional(),
  email: z.string().email().optional(),
  role: z.string().optional(),
})

// OB3 Proof schema (optional)
const proofSchema = z.object({
  type: z.string(),
  created: isoDateSchema,
  verificationMethod: iriSchema,
  proofPurpose: z.string(),
  proofValue: z.string().optional(),
  jws: z.string().optional(),
})

// OB3 Evidence schema
const ob3EvidenceSchema = z.object({
  id: iriSchema.optional(),
  type: z.union([z.string(), z.array(z.string())]).optional(),
  narrative: multiLanguageStringSchema.optional(),
  name: multiLanguageStringSchema.optional(),
  description: multiLanguageStringSchema.optional(),
  genre: z.string().optional(),
  audience: z.string().optional(),
})

// OB3 VerifiableCredential schema
export const verifiableCredentialSchema = z
  .object({
    '@context': z.union([z.string(), z.array(z.string()), z.record(z.string(), z.unknown())]),
    id: iriSchema,
    type: z.array(z.string()),
    issuer: z.union([iriSchema, ob3IssuerSchema]),
    validFrom: isoDateSchema,
    validUntil: isoDateSchema.optional(),
    credentialSubject: credentialSubjectSchema,
    proof: z.union([proofSchema, z.array(proofSchema)]).optional(),
    evidence: z.union([ob3EvidenceSchema, z.array(ob3EvidenceSchema)]).optional(),
  })
  .refine(
    data => {
      const contexts = Array.isArray(data['@context'])
        ? data['@context']
        : [data['@context']].filter(c => typeof c === 'string')

      // Required W3C Verifiable Credentials context URLs
      const W3C_VC_CONTEXTS = [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/ns/credentials/v2',
      ] as const

      // Required OB3 context URLs
      const OB3_CONTEXTS = [
        'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
        'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json',
      ] as const

      // Use strict equality check to avoid CodeQL URL substring sanitization warning
      const hasW3CContext = contexts.some(ctx => W3C_VC_CONTEXTS.some(vc => ctx === vc))
      const hasOB3Context = contexts.some(ctx => OB3_CONTEXTS.some(ob => ctx === ob))

      return hasW3CContext && hasOB3Context
    },
    {
      message:
        '@context must include W3C Verifiable Credentials context (v1 or v2) and OB3 context (3.0 or 3.0.3)',
    }
  )
  .refine(
    data => {
      return data.type.includes('VerifiableCredential') && data.type.includes('OpenBadgeCredential')
    },
    {
      message: "type array must include both 'VerifiableCredential' and 'OpenBadgeCredential'",
    }
  )

/**
 * Detects which Open Badges specification version a payload conforms to
 *
 * Detection heuristics:
 * - OB3: Has @context property, type array with 'VerifiableCredential'/'OpenBadgeCredential',
 *        or credentialSubject field
 * - OB2: Has type field with 'BadgeClass' or 'Assertion', or recipient field
 * - Unknown: Cannot determine spec version from payload structure
 *
 * @param payload The badge payload to detect
 * @returns '2.0' | '3.0' | 'unknown'
 */
export function detectBadgeSpecVersion(payload: unknown): '2.0' | '3.0' | 'unknown' {
  if (typeof payload !== 'object' || payload === null) {
    return 'unknown'
  }

  const obj = payload as Record<string, unknown>

  // Check for OB3 indicators
  if ('@context' in obj) {
    return '3.0'
  }

  if ('type' in obj && Array.isArray(obj.type)) {
    const types = obj.type as string[]
    if (
      types.includes('VerifiableCredential') ||
      types.includes('OpenBadgeCredential') ||
      types.includes('Achievement')
    ) {
      return '3.0'
    }
  }

  if ('credentialSubject' in obj) {
    return '3.0'
  }

  // Check for OB2 indicators
  if ('type' in obj && typeof obj.type === 'string') {
    if (obj.type === 'BadgeClass' || obj.type === 'Assertion') {
      return '2.0'
    }
  }

  if ('recipient' in obj) {
    return '2.0'
  }

  // Check for OB2 criteria as string (OB3 uses object with id/narrative)
  if ('criteria' in obj && typeof obj.criteria === 'string') {
    return '2.0'
  }

  // Cannot determine
  return 'unknown'
}

/**
 * Validates an OB3 Achievement payload
 *
 * @param payload The Achievement payload to validate
 * @returns ValidationResult with validated data or error report
 */
export function validateAchievementPayload(
  payload: unknown
): ValidationResult<z.infer<typeof achievementSchema>> {
  const res = achievementSchema.safeParse(payload)

  if (res.success) {
    return {
      valid: true,
      data: res.data,
      report: createValidationReport([], { openBadgesVersion: '3.0' }),
    }
  }

  const messages = zodIssuesToMessages(res.error.issues)
  return {
    valid: false,
    report: createValidationReport(messages, { openBadgesVersion: '3.0' }),
  }
}

/**
 * Validates an OB3 VerifiableCredential payload
 *
 * @param payload The VerifiableCredential payload to validate
 * @returns ValidationResult with validated data or error report
 */
export function validateVerifiableCredentialPayload(
  payload: unknown
): ValidationResult<z.infer<typeof verifiableCredentialSchema>> {
  const res = verifiableCredentialSchema.safeParse(payload)

  if (res.success) {
    return {
      valid: true,
      data: res.data,
      report: createValidationReport([], { openBadgesVersion: '3.0' }),
    }
  }

  const messages = zodIssuesToMessages(res.error.issues)
  return {
    valid: false,
    report: createValidationReport(messages, { openBadgesVersion: '3.0' }),
  }
}

/**
 * Auto-detects and validates a badge definition payload (BadgeClass or Achievement)
 *
 * Automatically detects whether the payload is OB2 BadgeClass or OB3 Achievement
 * and applies the appropriate validation schema.
 *
 * @param payload The badge definition payload to validate
 * @returns ValidationResult with validated data and spec version in report
 *
 * @example
 * // OB2 BadgeClass
 * validateBadgeDefinitionPayload({
 *   type: 'BadgeClass',
 *   name: 'My Badge',
 *   description: 'A great badge',
 *   image: 'https://example.org/badge.png',
 *   criteria: 'https://example.org/criteria',
 *   issuer: 'https://example.org/issuer'
 * })
 *
 * @example
 * // OB3 Achievement
 * validateBadgeDefinitionPayload({
 *   id: 'https://example.org/achievement/1',
 *   type: ['Achievement'],
 *   name: 'My Achievement',
 *   description: 'A great achievement',
 *   criteria: { narrative: 'Complete the task' }
 * })
 */
export function validateBadgeDefinitionPayload(
  payload: unknown
): ValidationResult<z.infer<typeof badgeClassSchema> | z.infer<typeof achievementSchema>> {
  const version = detectBadgeSpecVersion(payload)

  if (version === '2.0') {
    return validateBadgeClassPayload(payload)
  }

  if (version === '3.0') {
    return validateAchievementPayload(payload)
  }

  // Unknown spec version
  const messages: ValidationMessage[] = [
    {
      name: 'VALIDATE_SPEC_VERSION',
      messageLevel: 'ERROR',
      node_path: [],
      success: false,
      result: 'Unable to determine badge specification version (2.0 or 3.0) from payload structure',
    },
  ]

  return {
    valid: false,
    report: createValidationReport(messages),
  }
}

/**
 * Auto-detects and validates a badge issuance payload (Assertion or VerifiableCredential)
 *
 * Automatically detects whether the payload is OB2 Assertion or OB3 VerifiableCredential
 * and applies the appropriate validation schema.
 *
 * @param payload The badge issuance payload to validate
 * @returns ValidationResult with validated data and spec version in report
 *
 * @example
 * // OB2 Assertion
 * validateBadgeIssuancePayload({
 *   badge: 'https://example.org/badge/1',
 *   recipient: { type: 'email', identity: 'user@example.org' },
 *   issuedOn: '2024-01-01T00:00:00Z'
 * })
 *
 * @example
 * // OB3 VerifiableCredential
 * validateBadgeIssuancePayload({
 *   '@context': ['https://www.w3.org/ns/credentials/v2'],
 *   type: ['VerifiableCredential', 'OpenBadgeCredential'],
 *   issuer: 'https://example.org/issuer',
 *   validFrom: '2024-01-01T00:00:00Z',
 *   credentialSubject: { achievement: {...} }
 * })
 */
export function validateBadgeIssuancePayload(
  payload: unknown
):
  | ValidationResult<z.infer<typeof assertionSchema>>
  | ValidationResult<z.infer<typeof verifiableCredentialSchema>> {
  const version = detectBadgeSpecVersion(payload)

  if (version === '2.0') {
    return validateAssertionPayload(payload)
  }

  if (version === '3.0') {
    return validateVerifiableCredentialPayload(payload)
  }

  // Unknown spec version
  const messages: ValidationMessage[] = [
    {
      name: 'VALIDATE_SPEC_VERSION',
      messageLevel: 'ERROR',
      node_path: [],
      success: false,
      result: 'Unable to determine badge specification version (2.0 or 3.0) from payload structure',
    },
  ]

  return {
    valid: false,
    report: createValidationReport(messages),
  }
}
