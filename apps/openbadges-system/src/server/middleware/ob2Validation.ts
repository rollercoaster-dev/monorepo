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

export const assertionSchema = z.object({
  badge: nonEmpty('badge (BadgeClass IRI or id) is required'),
  recipient: recipientSchema,
  issuedOn: isoDateSchema.optional(),
  expires: isoDateSchema.optional(),
  evidence: z
    .union([
      iriSchema, // single evidence URL
      z.array(iriSchema), // or array of URLs
    ])
    .optional(),
  narrative: z.string().optional(),
})

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
