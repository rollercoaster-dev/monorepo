/**
 * Centralized API error handling utility
 *
 * This utility provides consistent error handling across all API endpoints,
 * eliminating duplicate error-handling logic and ensuring consistent responses.
 *
 * All error responses follow a standardized format:
 * - error: Error type/category (e.g., "Not Found", "Bad Request")
 * - message: Human-readable error message (always included for client compatibility)
 * - code: Machine-readable error code for programmatic handling (optional)
 * - details: Additional context, typically validation errors (optional)
 */

import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { logger } from "../logging/logger.service";
import { BadRequestError } from "../../infrastructure/errors/bad-request.error";
import { ValidationError } from "./validation.errors";

/**
 * OB3-specific error codes for machine-readable error handling
 *
 * These codes follow a consistent naming pattern:
 * - Category prefix: CREDENTIAL_, ISSUER_, BADGE_, ASSERTION_, AUTH_, etc.
 * - Descriptive suffix: _NOT_FOUND, _INVALID, _REVOKED, etc.
 */
export enum OB3ErrorCode {
  // Credential errors
  CREDENTIAL_NOT_FOUND = "CREDENTIAL_NOT_FOUND",
  CREDENTIAL_INVALID = "CREDENTIAL_INVALID",
  CREDENTIAL_REVOKED = "CREDENTIAL_REVOKED",
  CREDENTIAL_EXPIRED = "CREDENTIAL_EXPIRED",
  CREDENTIAL_SIGNATURE_INVALID = "CREDENTIAL_SIGNATURE_INVALID",

  // Issuer errors
  ISSUER_NOT_FOUND = "ISSUER_NOT_FOUND",
  ISSUER_INVALID = "ISSUER_INVALID",

  // Badge/Achievement errors
  BADGE_NOT_FOUND = "BADGE_NOT_FOUND",
  BADGE_INVALID = "BADGE_INVALID",
  ACHIEVEMENT_NOT_FOUND = "ACHIEVEMENT_NOT_FOUND",
  ACHIEVEMENT_INVALID = "ACHIEVEMENT_INVALID",

  // Assertion errors (legacy OB2 compatibility)
  ASSERTION_NOT_FOUND = "ASSERTION_NOT_FOUND",
  ASSERTION_INVALID = "ASSERTION_INVALID",
  ASSERTION_REVOKED = "ASSERTION_REVOKED",

  // Authentication/Authorization errors
  AUTH_REQUIRED = "AUTH_REQUIRED",
  AUTH_INVALID = "AUTH_INVALID",
  AUTH_FORBIDDEN = "AUTH_FORBIDDEN",
  AUTH_TOKEN_EXPIRED = "AUTH_TOKEN_EXPIRED",

  // Validation errors
  VALIDATION_FAILED = "VALIDATION_FAILED",
  INVALID_REQUEST = "INVALID_REQUEST",
  INVALID_ID_FORMAT = "INVALID_ID_FORMAT",

  // Status List errors (OB3 specific)
  STATUS_LIST_NOT_FOUND = "STATUS_LIST_NOT_FOUND",
  STATUS_LIST_INVALID = "STATUS_LIST_INVALID",

  // General errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  NOT_FOUND = "NOT_FOUND",
  RATE_LIMITED = "RATE_LIMITED",
}

/**
 * Standard API error response structure
 *
 * This format is consistent across all API endpoints and provides:
 * - error: Error type for categorization
 * - message: Human-readable description (always included)
 * - code: Machine-readable code for programmatic handling
 * - details: Additional context when available
 */
export interface ApiErrorResponse {
  /** Error type/category (e.g., "Not Found", "Bad Request") */
  error: string;
  /** Human-readable error message (always included) */
  message: string;
  /** Machine-readable error code for programmatic handling */
  code?: OB3ErrorCode | string;
  /** Additional error details, typically validation errors */
  details?: string[] | Record<string, unknown>;
}

/**
 * Context information for error logging
 */
export interface ErrorContext {
  endpoint?: string;
  id?: string;
  body?: unknown;
  [key: string]: unknown;
}

/**
 * Error classification result
 */
interface ErrorClassification {
  statusCode: number;
  errorType: string;
  message: string;
  code?: OB3ErrorCode | string;
}

/**
 * Classifies an error and determines the appropriate HTTP status code and response
 */
function classifyError(error: unknown): ErrorClassification {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  // Permission errors
  if (
    lowerMessage.includes("permission") ||
    lowerMessage.includes("forbidden") ||
    lowerMessage.includes("unauthorized")
  ) {
    return {
      statusCode: 403,
      errorType: "Forbidden",
      message,
      code: OB3ErrorCode.AUTH_FORBIDDEN,
    };
  }

  // Authentication errors
  if (
    lowerMessage.includes("authentication required") ||
    lowerMessage.includes("not authenticated")
  ) {
    return {
      statusCode: 401,
      errorType: "Unauthorized",
      message,
      code: OB3ErrorCode.AUTH_REQUIRED,
    };
  }

  // BadRequestError and validation errors (check these BEFORE generic message checks)
  // But exclude "Invalid IRI" errors which need special handling
  const isErrorInstance =
    error instanceof BadRequestError ||
    error instanceof ValidationError ||
    (error instanceof Error && error.name === "BadRequestError");

  const hasValidationMessage =
    lowerMessage.includes("invalid") || lowerMessage.includes("validation");

  const isInvalidIriError = message.includes("Invalid IRI");

  if ((isErrorInstance || hasValidationMessage) && !isInvalidIriError) {
    return {
      statusCode: 400,
      errorType: "Bad Request",
      message,
      code: OB3ErrorCode.VALIDATION_FAILED,
    };
  }

  // Invalid IRI errors (handle these specifically)
  if (message.includes("Invalid IRI")) {
    const entityMessage = lowerMessage.includes("issuer")
      ? "Invalid issuer ID"
      : lowerMessage.includes("badge")
        ? "Invalid badge class ID"
        : lowerMessage.includes("assertion") ||
            lowerMessage.includes("credential")
          ? "Invalid assertion/credential ID"
          : "Invalid ID format";

    return {
      statusCode: 400,
      errorType: "Bad Request",
      message: entityMessage,
      code: OB3ErrorCode.INVALID_ID_FORMAT,
    };
  }

  // Resource not found errors (only for generic "not found" cases, not BadRequestErrors)
  if (
    lowerMessage.includes("does not exist") ||
    lowerMessage.includes("not found") ||
    lowerMessage.includes("missing")
  ) {
    // Determine specific error code based on context
    let code: OB3ErrorCode = OB3ErrorCode.NOT_FOUND;
    if (lowerMessage.includes("issuer")) {
      code = OB3ErrorCode.ISSUER_NOT_FOUND;
    } else if (
      lowerMessage.includes("badge") ||
      lowerMessage.includes("achievement")
    ) {
      code = OB3ErrorCode.BADGE_NOT_FOUND;
    } else if (
      lowerMessage.includes("assertion") ||
      lowerMessage.includes("credential")
    ) {
      code = OB3ErrorCode.CREDENTIAL_NOT_FOUND;
    } else if (lowerMessage.includes("status list")) {
      code = OB3ErrorCode.STATUS_LIST_NOT_FOUND;
    }

    return {
      statusCode: 404,
      errorType: "Not Found",
      message,
      code,
    };
  }

  // Revoked credential/assertion errors
  if (lowerMessage.includes("revoked")) {
    return {
      statusCode: 410,
      errorType: "Gone",
      message,
      code: lowerMessage.includes("assertion")
        ? OB3ErrorCode.ASSERTION_REVOKED
        : OB3ErrorCode.CREDENTIAL_REVOKED,
    };
  }

  // Default to internal server error
  return {
    statusCode: 500,
    errorType: "Internal Server Error",
    message:
      process.env.NODE_ENV === "production"
        ? "Unexpected server error"
        : message,
    code: OB3ErrorCode.INTERNAL_ERROR,
  };
}

/**
 * Sends a standardized API error response
 *
 * @param c - Hono context
 * @param error - The error that occurred
 * @param context - Additional context for logging (endpoint, id, body, etc.)
 * @returns Hono response
 */
export function sendApiError(
  c: Context,
  error: unknown,
  context: ErrorContext = {},
): Response {
  const classification = classifyError(error);
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Build log context
  const logContext = {
    error: errorMessage,
    statusCode: classification.statusCode,
    code: classification.code,
    ...context,
  };

  // Log the error with appropriate level
  const logMessage = context.endpoint
    ? `${context.endpoint} failed`
    : "API request failed";

  if (classification.statusCode >= 500) {
    logger.error(logMessage, logContext);
  } else if (classification.statusCode >= 400) {
    logger.warn(logMessage, logContext);
  }

  // Build standardized response (message is always included for client compatibility)
  const response: ApiErrorResponse = {
    error: classification.errorType,
    message: classification.message,
  };

  // Include error code for programmatic handling
  if (classification.code) {
    response.code = classification.code;
  }

  return c.json(response, classification.statusCode as ContentfulStatusCode);
}

/**
 * Maps resource types to OB3 error codes
 */
function getNotFoundCode(resourceType: string): OB3ErrorCode {
  const lowerType = resourceType.toLowerCase();
  if (lowerType.includes("issuer")) return OB3ErrorCode.ISSUER_NOT_FOUND;
  if (
    lowerType.includes("badge") ||
    lowerType.includes("achievement") ||
    lowerType.includes("class")
  )
    return OB3ErrorCode.BADGE_NOT_FOUND;
  if (lowerType.includes("assertion") || lowerType.includes("credential"))
    return OB3ErrorCode.CREDENTIAL_NOT_FOUND;
  if (lowerType.includes("status") || lowerType.includes("list"))
    return OB3ErrorCode.STATUS_LIST_NOT_FOUND;
  return OB3ErrorCode.NOT_FOUND;
}

/**
 * Handles "not found" scenarios with consistent logging and response
 *
 * @param c - Hono context
 * @param resourceType - Type of resource that wasn't found (e.g., 'Issuer', 'Badge class')
 * @param context - Additional context for logging
 * @returns Hono response
 */
export function sendNotFoundError(
  c: Context,
  resourceType: string,
  context: ErrorContext = {},
): Response {
  const code = getNotFoundCode(resourceType);
  const logContext = {
    statusCode: 404,
    resourceType,
    code,
    ...context,
  };

  const logMessage = context.endpoint
    ? `${context.endpoint} - ${resourceType} not found`
    : `${resourceType} not found`;

  logger.warn(logMessage, logContext);

  const response: ApiErrorResponse = {
    error: "Not Found",
    message: `${resourceType} not found`,
    code,
  };

  return c.json(response, 404);
}

/**
 * Wrapper for handling async operations with consistent error handling
 *
 * @param c - Hono context
 * @param operation - Async operation to execute
 * @param context - Error context for logging
 * @returns Promise that resolves to the operation result or an error response
 */
export async function handleApiOperation<T>(
  c: Context,
  operation: () => Promise<T>,
  context: ErrorContext = {},
): Promise<T | Response> {
  try {
    return await operation();
  } catch (error) {
    return sendApiError(c, error, context);
  }
}

/**
 * Creates a standardized error response object without a Hono context
 *
 * Useful for creating error responses in non-Hono contexts or for testing.
 *
 * @param errorType - Error type/category (e.g., "Not Found", "Bad Request")
 * @param message - Human-readable error message
 * @param options - Optional code and details
 * @returns ApiErrorResponse object
 */
export function createErrorResponse(
  errorType: string,
  message: string,
  options?: { code?: OB3ErrorCode | string; details?: string[] },
): ApiErrorResponse {
  const response: ApiErrorResponse = {
    error: errorType,
    message,
  };

  if (options?.code) {
    response.code = options.code;
  }

  if (options?.details && options.details.length > 0) {
    response.details = options.details;
  }

  return response;
}

/**
 * Creates a standardized authentication error response
 *
 * @param c - Hono context
 * @param message - Error message (defaults to "Authentication required")
 * @returns Hono response with 401 status
 */
export function sendAuthError(
  c: Context,
  message: string = "Authentication required",
): Response {
  const response: ApiErrorResponse = {
    error: "Unauthorized",
    message,
    code: OB3ErrorCode.AUTH_REQUIRED,
  };

  logger.warn("Authentication error", { message });
  return c.json(response, 401);
}

/**
 * Creates a standardized validation error response
 *
 * @param c - Hono context
 * @param message - Error message
 * @param details - Validation error details
 * @returns Hono response with 400 status
 */
export function sendValidationError(
  c: Context,
  message: string,
  details?: string[],
): Response {
  const response: ApiErrorResponse = {
    error: "Bad Request",
    message,
    code: OB3ErrorCode.VALIDATION_FAILED,
  };

  if (details && details.length > 0) {
    response.details = details;
  }

  logger.warn("Validation error", { message, details });
  return c.json(response, 400);
}
