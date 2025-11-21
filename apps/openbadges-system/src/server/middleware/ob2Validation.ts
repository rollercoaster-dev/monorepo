import { z } from 'zod'

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

export type ValidationResult<T> = { valid: true; data: T } | { valid: false; errors: string[] }

function formatValidationErrors(issues: z.ZodIssue[]): string[] {
  return issues.map(e => {
    const path =
      (e.path as (string | number)[])
        .map((p, i) => {
          if (typeof p === 'number' && i > 0) {
            return `[${p}]`
          }
          return i === 0 ? p : `.${p}`
        })
        .join('') || 'root'
    return `${path}: ${e.message}`
  })
}

export function validateBadgeClassPayload(
  payload: unknown
): ValidationResult<z.infer<typeof badgeClassSchema>> {
  const res = badgeClassSchema.safeParse(payload)
  if (res.success) return { valid: true, data: res.data }
  return {
    valid: false,
    errors: formatValidationErrors(res.error.issues),
  }
}

export function validateAssertionPayload(
  payload: unknown
): ValidationResult<z.infer<typeof assertionSchema>> {
  const res = assertionSchema.safeParse(payload)
  if (res.success) return { valid: true, data: res.data }
  return {
    valid: false,
    errors: formatValidationErrors(res.error.issues),
  }
}
