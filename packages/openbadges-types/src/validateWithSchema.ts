import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import type {
  ValidationReportContent,
  ValidationMessage,
  MessageLevel,
} from "./validation-report";
import { OB2_TYPES } from "./v2/constants";
import { OB3_TYPES } from "./v3/constants";

// Import JSON schemas - these are loaded synchronously
import ob2AssertionSchema from "../schemas/ob2-assertion.schema.json" with { type: "json" };
import ob2BadgeClassSchema from "../schemas/ob2-badgeclass.schema.json" with { type: "json" };
import ob2ProfileSchema from "../schemas/ob2-profile.schema.json" with { type: "json" };
import ob3CredentialSchema from "../schemas/ob3-credential.schema.json" with { type: "json" };
import ob3AchievementSchema from "../schemas/ob3-achievement.schema.json" with { type: "json" };
import ob3IssuerSchema from "../schemas/ob3-issuer.schema.json" with { type: "json" };

// Create AJV instance with validation
const ajv = new Ajv({
  allErrors: true, // Report all errors, not just the first one
  strict: false, // Allow additional properties
  allowUnionTypes: true, // Allow union type keywords in schemas
  verbose: true, // Include detailed error info
});

// Add format validators (uri, email, etc.)
addFormats(ajv);

/**
 * Creates a lazy validator getter that compiles the schema on first access
 * @param schema The JSON schema to compile
 * @returns A getter function that returns the compiled validator
 */
function createLazyValidator(
  schema: Record<string, unknown>,
): () => ValidateFunction {
  let validator: ValidateFunction | null = null;
  return () => {
    if (!validator) {
      validator = ajv.compile(schema);
    }
    return validator;
  };
}

// Lazy-compiled validators
const getOB2Validator = createLazyValidator(ob2AssertionSchema);
const getOB2BadgeClassValidator = createLazyValidator(ob2BadgeClassSchema);
const getOB2ProfileValidator = createLazyValidator(ob2ProfileSchema);
const getOB3Validator = createLazyValidator(ob3CredentialSchema);
const getOB3AchievementValidator = createLazyValidator(ob3AchievementSchema);
const getOB3IssuerValidator = createLazyValidator(ob3IssuerSchema);

/**
 * Validation error structure for individual issues
 */
export interface ValidationError {
  message: string;
  path?: string;
  keyword?: string;
  [key: string]: unknown;
}

/**
 * Simple validation result (backward compatible)
 */
export interface SchemaValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

/**
 * Convert Ajv errors to ValidationMessage format (1EdTech aligned)
 */
function ajvErrorsToMessages(
  errors: ErrorObject[] | null | undefined,
): ValidationMessage[] {
  if (!errors || errors.length === 0) {
    return [];
  }

  return errors.map((err) => {
    // Parse instancePath to node_path array
    const nodePath: Array<string | number> = err.instancePath
      ? err.instancePath
          .split("/")
          .filter(Boolean)
          .map((p) => (/^\d+$/.test(p) ? parseInt(p, 10) : p))
      : [];

    // Construct detailed message
    let result = err.message || "Unknown validation error";

    // Add context for specific error types
    if (err.keyword === "required") {
      const missingProperty = (err.params as { missingProperty?: string })
        ?.missingProperty;
      if (missingProperty) {
        const fullPath = nodePath.length
          ? `${nodePath.join(".")}.${missingProperty}`
          : missingProperty;
        result = `Missing required property: '${fullPath}'`;
      }
    } else if (err.keyword === "type") {
      result = `${err.instancePath || "Value"} ${err.message}`;
    } else if (err.keyword === "format") {
      result = `${err.instancePath || "Value"} ${err.message} (expected: ${(err.params as { format?: string })?.format})`;
    } else if (err.keyword === "enum") {
      const allowed = (err.params as { allowedValues?: unknown[] })
        ?.allowedValues;
      result = `${err.instancePath || "Value"} ${err.message}: ${JSON.stringify(allowed)}`;
    }

    return {
      name: `VALIDATE_${err.keyword?.toUpperCase() || "UNKNOWN"}`,
      messageLevel: "ERROR" as MessageLevel,
      node_path: nodePath.length > 0 ? nodePath : undefined,
      success: false,
      result,
    };
  });
}

/**
 * Convert Ajv errors to simple ValidationError format (backward compatible)
 */
function ajvErrorsToSimple(
  errors: ErrorObject[] | null | undefined,
): ValidationError[] | undefined {
  if (!errors || errors.length === 0) {
    return undefined;
  }

  return errors.map((err) => ({
    message: err.message || "Unknown validation error",
    path: err.instancePath || undefined,
    keyword: err.keyword,
    params: err.params,
  }));
}

/**
 * Validates an Open Badges 2.0 Assertion against the JSON Schema
 * @param data The assertion to validate
 * @returns Simple validation result with errors
 */
export function validateOB2Assertion(data: unknown): SchemaValidationResult {
  if (typeof data !== "object" || data === null) {
    return {
      valid: false,
      errors: [{ message: "Data must be an object" }],
    };
  }

  const valid = getOB2Validator()(data);
  return {
    valid,
    errors: ajvErrorsToSimple(getOB2Validator().errors),
  };
}

/**
 * Validates an Open Badges 2.0 Assertion with detailed 1EdTech-aligned report
 * @param data The assertion to validate
 * @returns ValidationReportContent with detailed messages
 */
export function validateOB2AssertionDetailed(
  data: unknown,
): ValidationReportContent {
  if (typeof data !== "object" || data === null) {
    return {
      valid: false,
      errorCount: 1,
      warningCount: 0,
      messages: [
        {
          name: "VALIDATE_TYPE",
          messageLevel: "ERROR",
          success: false,
          result: "Data must be an object",
        },
      ],
      openBadgesVersion: "2.0",
    };
  }

  const valid = getOB2Validator()(data);
  const messages = ajvErrorsToMessages(getOB2Validator().errors);

  return {
    valid,
    errorCount: messages.filter((m) => m.messageLevel === "ERROR").length,
    warningCount: messages.filter((m) => m.messageLevel === "WARNING").length,
    messages,
    openBadgesVersion: "2.0",
  };
}

/**
 * Validates an Open Badges 3.0 VerifiableCredential against the JSON Schema
 * @param data The credential to validate
 * @returns Simple validation result with errors
 */
export function validateOB3Credential(data: unknown): SchemaValidationResult {
  if (typeof data !== "object" || data === null) {
    return {
      valid: false,
      errors: [{ message: "Data must be an object" }],
    };
  }

  const credential = data as Record<string, unknown>;

  // Manual checks for critical fields per VC Data Model 2.0
  const manualErrors: ValidationError[] = [];

  if (!credential.id) {
    manualErrors.push({ message: "Missing required field: id", path: "/id" });
  }

  if (!credential.type) {
    manualErrors.push({
      message: "Missing required field: type",
      path: "/type",
    });
  }

  if (!credential.issuer) {
    manualErrors.push({
      message: "Missing required field: issuer",
      path: "/issuer",
    });
  }

  if (!credential.validFrom || typeof credential.validFrom !== "string") {
    manualErrors.push({
      message: "Missing or invalid required field: validFrom (must be string)",
      path: "/validFrom",
    });
  }

  if (!credential.credentialSubject) {
    manualErrors.push({
      message: "Missing required field: credentialSubject",
      path: "/credentialSubject",
    });
  } else {
    const subject = credential.credentialSubject as Record<string, unknown>;
    if (!subject.achievement) {
      manualErrors.push({
        message: "Missing required field: credentialSubject.achievement",
        path: "/credentialSubject/achievement",
      });
    } else {
      const achievement = subject.achievement;
      const checkAchievement = (
        ach: Record<string, unknown>,
        index?: number,
      ) => {
        const prefix =
          index !== undefined
            ? `/credentialSubject/achievement/${index}`
            : "/credentialSubject/achievement";
        if (!ach.name) {
          manualErrors.push({
            message: "Achievement must have a name",
            path: `${prefix}/name`,
          });
        }
        if (!ach.criteria) {
          manualErrors.push({
            message: "Achievement must have criteria",
            path: `${prefix}/criteria`,
          });
        }
      };

      if (Array.isArray(achievement)) {
        if (achievement.length === 0) {
          manualErrors.push({
            message: "Achievement array must not be empty",
            path: "/credentialSubject/achievement",
          });
        } else {
          achievement.forEach((ach, i) => {
            if (typeof ach === "object" && ach !== null) {
              checkAchievement(ach as Record<string, unknown>, i);
            }
          });
        }
      } else if (typeof achievement === "object" && achievement !== null) {
        checkAchievement(achievement as Record<string, unknown>);
      }
    }
  }

  // Check issuer if it's an object
  if (typeof credential.issuer === "object" && credential.issuer !== null) {
    const issuer = credential.issuer as Record<string, unknown>;
    if (!issuer.id) {
      manualErrors.push({
        message: "Issuer must have an id",
        path: "/issuer/id",
      });
    }
    if (!issuer.name) {
      manualErrors.push({
        message: "Issuer must have a name",
        path: "/issuer/name",
      });
    }
  }

  if (manualErrors.length > 0) {
    return {
      valid: false,
      errors: manualErrors,
    };
  }

  // Run schema validation
  const valid = getOB3Validator()(data);
  return {
    valid,
    errors: ajvErrorsToSimple(getOB3Validator().errors),
  };
}

/**
 * Validates an Open Badges 3.0 VerifiableCredential with detailed 1EdTech-aligned report
 * @param data The credential to validate
 * @returns ValidationReportContent with detailed messages
 */
export function validateOB3CredentialDetailed(
  data: unknown,
): ValidationReportContent {
  if (typeof data !== "object" || data === null) {
    return {
      valid: false,
      errorCount: 1,
      warningCount: 0,
      messages: [
        {
          name: "VALIDATE_TYPE",
          messageLevel: "ERROR",
          success: false,
          result: "Data must be an object",
        },
      ],
      openBadgesVersion: "3.0",
    };
  }

  // Run simple validation first for manual checks
  const simpleResult = validateOB3Credential(data);

  if (!simpleResult.valid && simpleResult.errors) {
    const messages: ValidationMessage[] = simpleResult.errors.map((err) => ({
      name: "VALIDATE_REQUIRED",
      messageLevel: "ERROR" as MessageLevel,
      node_path: err.path
        ? err.path
            .split("/")
            .filter(Boolean)
            .map((p) => (/^\d+$/.test(p) ? parseInt(p, 10) : p))
        : undefined,
      success: false,
      result: err.message,
    }));

    return {
      valid: false,
      errorCount: messages.length,
      warningCount: 0,
      messages,
      openBadgesVersion: "3.0",
    };
  }

  // Run full schema validation
  const valid = getOB3Validator()(data);
  const messages = ajvErrorsToMessages(getOB3Validator().errors);

  return {
    valid,
    errorCount: messages.filter((m) => m.messageLevel === "ERROR").length,
    warningCount: messages.filter((m) => m.messageLevel === "WARNING").length,
    messages,
    openBadgesVersion: "3.0",
  };
}

/**
 * Auto-detect version and validate badge
 * @param data The badge data (OB2 Assertion or OB3 VerifiableCredential)
 * @returns ValidationReportContent with version detection
 */
export function validateBadgeWithSchema(
  data: unknown,
): ValidationReportContent {
  if (typeof data !== "object" || data === null) {
    return {
      valid: false,
      errorCount: 1,
      warningCount: 0,
      messages: [
        {
          name: "VALIDATE_TYPE",
          messageLevel: "ERROR",
          success: false,
          result: "Badge must be an object",
        },
      ],
    };
  }

  const badge = data as Record<string, unknown>;

  // Detect version based on type field
  const type = badge.type;
  const typeArray = Array.isArray(type) ? type : [type];

  if (
    typeArray.includes(OB3_TYPES.VERIFIABLE_CREDENTIAL) ||
    typeArray.includes(OB3_TYPES.OPEN_BADGE_CREDENTIAL)
  ) {
    return validateOB3CredentialDetailed(data);
  }

  if (typeArray.includes(OB2_TYPES.ASSERTION)) {
    return validateOB2AssertionDetailed(data);
  }

  // Try to detect by context
  const context = badge["@context"];
  if (
    typeof context === "string" &&
    context.includes("openbadges.org/spec/ob/v3p0")
  ) {
    return validateOB3CredentialDetailed(data);
  }
  if (Array.isArray(context)) {
    const hasOB3Context = context.some(
      (c) => typeof c === "string" && c.includes("openbadges.org/spec/ob/v3p0"),
    );
    if (hasOB3Context) {
      return validateOB3CredentialDetailed(data);
    }
  }

  // Default to OB2 for legacy support
  return validateOB2AssertionDetailed(data);
}

// ============================================================================
// OB2 Entity Validators
// ============================================================================

/**
 * Validates an Open Badges 2.0 BadgeClass against the JSON Schema
 * @param data The BadgeClass to validate
 * @returns Simple validation result with errors
 */
export function validateOB2BadgeClass(data: unknown): SchemaValidationResult {
  if (typeof data !== "object" || data === null) {
    return {
      valid: false,
      errors: [{ message: "Data must be an object" }],
    };
  }

  const valid = getOB2BadgeClassValidator()(data);
  return {
    valid,
    errors: ajvErrorsToSimple(getOB2BadgeClassValidator().errors),
  };
}

/**
 * Validates an Open Badges 2.0 BadgeClass with detailed 1EdTech-aligned report
 * @param data The BadgeClass to validate
 * @returns ValidationReportContent with detailed messages
 */
export function validateOB2BadgeClassDetailed(
  data: unknown,
): ValidationReportContent {
  if (typeof data !== "object" || data === null) {
    return {
      valid: false,
      errorCount: 1,
      warningCount: 0,
      messages: [
        {
          name: "VALIDATE_TYPE",
          messageLevel: "ERROR",
          success: false,
          result: "Data must be an object",
        },
      ],
      openBadgesVersion: "2.0",
    };
  }

  const valid = getOB2BadgeClassValidator()(data);
  const messages = ajvErrorsToMessages(getOB2BadgeClassValidator().errors);

  return {
    valid,
    errorCount: messages.filter((m) => m.messageLevel === "ERROR").length,
    warningCount: messages.filter((m) => m.messageLevel === "WARNING").length,
    messages,
    openBadgesVersion: "2.0",
  };
}

/**
 * Validates an Open Badges 2.0 Profile/Issuer against the JSON Schema
 * @param data The Profile to validate
 * @returns Simple validation result with errors
 */
export function validateOB2Profile(data: unknown): SchemaValidationResult {
  if (typeof data !== "object" || data === null) {
    return {
      valid: false,
      errors: [{ message: "Data must be an object" }],
    };
  }

  const valid = getOB2ProfileValidator()(data);
  return {
    valid,
    errors: ajvErrorsToSimple(getOB2ProfileValidator().errors),
  };
}

/**
 * Validates an Open Badges 2.0 Profile/Issuer with detailed 1EdTech-aligned report
 * @param data The Profile to validate
 * @returns ValidationReportContent with detailed messages
 */
export function validateOB2ProfileDetailed(
  data: unknown,
): ValidationReportContent {
  if (typeof data !== "object" || data === null) {
    return {
      valid: false,
      errorCount: 1,
      warningCount: 0,
      messages: [
        {
          name: "VALIDATE_TYPE",
          messageLevel: "ERROR",
          success: false,
          result: "Data must be an object",
        },
      ],
      openBadgesVersion: "2.0",
    };
  }

  const valid = getOB2ProfileValidator()(data);
  const messages = ajvErrorsToMessages(getOB2ProfileValidator().errors);

  return {
    valid,
    errorCount: messages.filter((m) => m.messageLevel === "ERROR").length,
    warningCount: messages.filter((m) => m.messageLevel === "WARNING").length,
    messages,
    openBadgesVersion: "2.0",
  };
}

// ============================================================================
// OB3 Entity Validators
// ============================================================================

/**
 * Validates an Open Badges 3.0 Achievement against the JSON Schema
 * @param data The Achievement to validate
 * @returns Simple validation result with errors
 */
export function validateOB3Achievement(data: unknown): SchemaValidationResult {
  if (typeof data !== "object" || data === null) {
    return {
      valid: false,
      errors: [{ message: "Data must be an object" }],
    };
  }

  const valid = getOB3AchievementValidator()(data);
  return {
    valid,
    errors: ajvErrorsToSimple(getOB3AchievementValidator().errors),
  };
}

/**
 * Validates an Open Badges 3.0 Achievement with detailed 1EdTech-aligned report
 * @param data The Achievement to validate
 * @returns ValidationReportContent with detailed messages
 */
export function validateOB3AchievementDetailed(
  data: unknown,
): ValidationReportContent {
  if (typeof data !== "object" || data === null) {
    return {
      valid: false,
      errorCount: 1,
      warningCount: 0,
      messages: [
        {
          name: "VALIDATE_TYPE",
          messageLevel: "ERROR",
          success: false,
          result: "Data must be an object",
        },
      ],
      openBadgesVersion: "3.0",
    };
  }

  const valid = getOB3AchievementValidator()(data);
  const messages = ajvErrorsToMessages(getOB3AchievementValidator().errors);

  return {
    valid,
    errorCount: messages.filter((m) => m.messageLevel === "ERROR").length,
    warningCount: messages.filter((m) => m.messageLevel === "WARNING").length,
    messages,
    openBadgesVersion: "3.0",
  };
}

/**
 * Validates an Open Badges 3.0 Issuer/Profile against the JSON Schema
 * @param data The Issuer to validate
 * @returns Simple validation result with errors
 */
export function validateOB3Issuer(data: unknown): SchemaValidationResult {
  if (typeof data !== "object" || data === null) {
    return {
      valid: false,
      errors: [{ message: "Data must be an object" }],
    };
  }

  const valid = getOB3IssuerValidator()(data);
  return {
    valid,
    errors: ajvErrorsToSimple(getOB3IssuerValidator().errors),
  };
}

/**
 * Validates an Open Badges 3.0 Issuer/Profile with detailed 1EdTech-aligned report
 * @param data The Issuer to validate
 * @returns ValidationReportContent with detailed messages
 */
export function validateOB3IssuerDetailed(
  data: unknown,
): ValidationReportContent {
  if (typeof data !== "object" || data === null) {
    return {
      valid: false,
      errorCount: 1,
      warningCount: 0,
      messages: [
        {
          name: "VALIDATE_TYPE",
          messageLevel: "ERROR",
          success: false,
          result: "Data must be an object",
        },
      ],
      openBadgesVersion: "3.0",
    };
  }

  const valid = getOB3IssuerValidator()(data);
  const messages = ajvErrorsToMessages(getOB3IssuerValidator().errors);

  return {
    valid,
    errorCount: messages.filter((m) => m.messageLevel === "ERROR").length,
    warningCount: messages.filter((m) => m.messageLevel === "WARNING").length,
    messages,
    openBadgesVersion: "3.0",
  };
}
