/**
 * Verify Credential DTO
 *
 * Data transfer objects for credential verification endpoint.
 * Supports both JSON-LD and JWT credential formats.
 *
 * @see https://www.imsglobal.org/spec/ob/v3p0
 * @see https://www.w3.org/TR/vc-data-model-2.0/
 */

import { z } from "zod";

/**
 * ISO 8601 datetime string validation
 * Accepts formats like:
 * - 2024-01-15T12:00:00Z
 * - 2024-01-15T12:00:00.000Z
 * - 2024-01-15T12:00:00+00:00
 * - 2024-01-15 (date only)
 */
const iso8601DateTimeSchema = z
  .string()
  .refine(
    (val) => {
      // Try to parse as ISO 8601 datetime
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    { message: "Invalid ISO 8601 datetime format" },
  )
  .optional();

/**
 * Helper to check if a context string is a valid VC context
 */
const isValidVcContext = (ctx: string): boolean =>
  ctx === "https://www.w3.org/2018/credentials/v1" ||
  ctx === "https://www.w3.org/ns/credentials/v2";

/**
 * Validates @context contains required VC context
 * Accepts single string or array of strings
 * Both forms must include a valid W3C VC context
 */
const contextSchema = z.union([
  z.string().refine(isValidVcContext, {
    message: "@context must be a W3C Verifiable Credentials context (v1 or v2)",
  }),
  z.array(z.string()).refine(
    (contexts) => {
      // Must include at least one VC context
      return contexts.some(isValidVcContext);
    },
    {
      message:
        "@context must include a W3C Verifiable Credentials context (v1 or v2)",
    },
  ),
]);

/**
 * Schema for verification options
 * Allows callers to customize verification behavior
 */
export const VerificationOptionsSchema = z
  .object({
    /** Skip proof verification (useful for testing) */
    skipProofVerification: z.boolean().optional(),

    /** Skip status check (revocation list lookup) */
    skipStatusCheck: z.boolean().optional(),

    /** Skip temporal validation (expiration/not-before) */
    skipTemporalValidation: z.boolean().optional(),

    /** Skip issuer verification (DID resolution, profile validation) */
    skipIssuerVerification: z.boolean().optional(),

    /** Clock tolerance in seconds for temporal checks */
    clockTolerance: z.number().int().nonnegative().optional(),

    /** Accept expired credentials (for historical verification) */
    allowExpired: z.boolean().optional(),

    /** Accept revoked credentials (for audit purposes) */
    allowRevoked: z.boolean().optional(),
  })
  .strict();

/**
 * Schema for JSON-LD credential
 * Validates the basic structure of a Verifiable Credential
 */
export const JsonLdCredentialSchema = z
  .object({
    "@context": contextSchema,
    type: z.array(z.string()).or(z.string()),
    id: z.string().optional(),
    issuer: z.string().or(
      z.object({
        id: z.string(),
        type: z.string().or(z.array(z.string())).optional(),
        name: z.string().optional(),
      }),
    ),
    issuanceDate: iso8601DateTimeSchema,
    validFrom: iso8601DateTimeSchema,
    expirationDate: iso8601DateTimeSchema,
    validUntil: iso8601DateTimeSchema,
    credentialSubject: z.record(z.unknown()).optional(),
    proof: z
      .object({
        type: z.string(),
        verificationMethod: z.string().optional(),
        created: z.string().optional(),
        proofPurpose: z.string().optional(),
        proofValue: z.string().optional(),
        jws: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

/**
 * Validates a string is valid base64url encoding
 * Base64url uses A-Z, a-z, 0-9, -, _ with optional padding (0-2 chars)
 * Per RFC 4648, base64url padding is limited to 0, 1, or 2 '=' characters
 */
const isValidBase64url = (str: string): boolean => {
  // Base64url alphabet: A-Z, a-z, 0-9, -, _ with 0-2 padding chars
  return /^[A-Za-z0-9_-]*={0,2}$/.test(str);
};

/**
 * Schema for JWT credential (compact serialization)
 * JWTs are represented as a dot-separated string: header.payload.signature
 * Each part must be valid base64url encoding
 */
export const JwtCredentialSchema = z
  .string()
  .refine((val) => val.split(".").length === 3, {
    message: "Invalid JWT format - must have three parts separated by dots",
  })
  .refine(
    (val) => {
      const parts = val.split(".");
      return parts.every((part) => isValidBase64url(part));
    },
    { message: "Invalid JWT format - parts must be valid base64url encoded" },
  );

/**
 * Schema for verify credential request body
 * Accepts either a JSON-LD credential object or a JWT string
 */
export const VerifyCredentialRequestSchema = z.object({
  /**
   * The credential to verify
   * Can be a JSON-LD credential object or a JWT string
   */
  credential: z.union([JsonLdCredentialSchema, JwtCredentialSchema]),

  /**
   * Optional verification options to customize the verification process
   */
  options: VerificationOptionsSchema.optional(),
});

/**
 * Type definitions derived from schemas
 */
export type VerificationOptionsDto = z.infer<typeof VerificationOptionsSchema>;
export type JsonLdCredentialDto = z.infer<typeof JsonLdCredentialSchema>;
export type VerifyCredentialRequestDto = z.infer<
  typeof VerifyCredentialRequestSchema
>;

/**
 * Response type for verification result
 * Re-exports the VerificationResult type from the verification service
 */
export type { VerificationResult } from "../../services/verification/types.js";
