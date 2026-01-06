/**
 * DTOs for Assertion-related API endpoints
 *
 * These DTOs define the expected request and response structures for assertions.
 * They provide type safety and validation for the API.
 */

import type { OB2, OB3 } from "openbadges-types";

/**
 * Recipient profile for assertions
 */
export interface RecipientDto {
  type: string;
  identity: string;
  hashed: boolean;
  salt?: string;
}

/**
 * Verification object for assertions
 */
export interface VerificationDto {
  type: string | string[];
  allowedOrigins?: string[];
  verificationProperty?: string;
  startsWith?: string[];
}

/**
 * Evidence object for assertions
 */
export interface EvidenceDto {
  id?: string;
  type?: string | string[];
  name?: string;
  description?: string;
  narrative?: string;
  genre?: string;
  audience?: string;
}

/**
 * Base DTO for assertion creation and update operations
 * Contains common properties across OB2 and OB3
 *
 * Supports both OB2 temporal fields (issuedOn/expires) and OB3 temporal fields (validFrom/validUntil).
 * At least one of issuedOn or validFrom is required for creation.
 */
export interface AssertionBaseDto {
  recipient: RecipientDto;
  badge: string; // IRI of the badge class
  // OB2 temporal fields
  issuedOn?: string; // ISO date string (OB2)
  expires?: string; // ISO date string (OB2)
  // OB3 temporal fields (VC Data Model 2.0)
  validFrom?: string; // ISO date string (OB3) - maps to issuedOn internally
  validUntil?: string; // ISO date string (OB3) - maps to expires internally
  verification?: VerificationDto;
  evidence?: EvidenceDto | EvidenceDto[];
  narrative?: string;
  image?:
    | string
    | {
        id?: string;
        type?: string;
        url?: string;
        caption?: string;
      };
  revoked?: boolean;
  revocationReason?: string;
  [key: string]: unknown;
}

/**
 * DTO for creating a new assertion (OB2)
 */
export interface CreateAssertionOB2Dto extends AssertionBaseDto {
  type?: string | string[]; // In OB2, type can be string or array of strings
}

/**
 * DTO for creating a new assertion (OB3)
 */
export interface CreateAssertionOB3Dto extends AssertionBaseDto {
  type?: string; // In OB3, type is typically a string
  id?: string; // Allow client to suggest an ID (optional)
  credentialSubject?: Record<string, unknown>;
}

/**
 * Union type for create assertion operations
 */
export type CreateAssertionDto = CreateAssertionOB2Dto | CreateAssertionOB3Dto;

/**
 * DTO for updating an existing assertion
 * Similar to create but all fields are optional
 */
export type UpdateAssertionDto = Partial<CreateAssertionDto>;

/**
 * DTO for revoking an assertion
 */
export interface RevokeAssertionDto {
  revoked: boolean;
  revocationReason?: string;
}

/**
 * Response DTO for assertion operations
 * This is a union type of OB2.Assertion and OB3.VerifiableCredential
 */
export type AssertionResponseDto = OB2.Assertion | OB3.VerifiableCredential;

/**
 * Error response DTO
 *
 * Standardized error response format for consistent API error handling.
 * All error responses should use this structure.
 *
 * @example
 * // Basic error
 * { error: "Not Found", message: "Issuer not found" }
 *
 * // Error with code
 * { error: "Bad Request", message: "Invalid credential format", code: "INVALID_CREDENTIAL" }
 *
 * // Error with details
 * { error: "Validation Error", message: "Request validation failed", details: ["name is required", "url must be valid"] }
 */
export interface ErrorResponseDto {
  /** Error type/category (e.g., "Not Found", "Bad Request", "Internal Server Error") */
  error: string;
  /** Human-readable error message for display to users */
  message: string;
  /** Machine-readable error code for programmatic handling (optional) */
  code?: string;
  /** Additional error details, typically validation errors (optional) */
  details?: string[];
}

/**
 * DTO for batch credential creation
 */
export interface BatchCreateCredentialsDto {
  credentials: CreateAssertionDto[];
}

/**
 * DTO for batch credential retrieval
 */
export interface BatchRetrieveCredentialsDto {
  ids: string[];
}

/**
 * Error details for batch operations
 */
export interface BatchOperationError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

/**
 * Result for a single batch operation
 */
export interface BatchOperationResult<T = unknown> {
  id?: string;
  index: number;
  success: boolean;
  data?: T;
  error?: BatchOperationError;
}

/**
 * Response DTO for batch operations
 */
export interface BatchOperationResponseDto<T = unknown> {
  results: BatchOperationResult<T>[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    processingTimeMs: number;
  };
  metadata?: {
    batchId?: string;
    timestamp: string;
    version: string;
  };
}
