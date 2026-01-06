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
    "@context": z.array(z.string()).or(z.string()),
    type: z.array(z.string()).or(z.string()),
    id: z.string().optional(),
    issuer: z.string().or(
      z.object({
        id: z.string(),
        type: z.string().or(z.array(z.string())).optional(),
        name: z.string().optional(),
      }),
    ),
    issuanceDate: z.string().optional(),
    validFrom: z.string().optional(),
    expirationDate: z.string().optional(),
    validUntil: z.string().optional(),
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
 * Schema for JWT credential (compact serialization)
 * JWTs are represented as a dot-separated string: header.payload.signature
 */
export const JwtCredentialSchema = z
  .string()
  .refine((val) => val.split(".").length === 3, {
    message: "Invalid JWT format - must have three parts separated by dots",
  });

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
