import Ajv from 'ajv';
import { OB3_CONTEXT } from './schemas';

// Create a more strict AJV instance for validation
const ajv = new Ajv({
  allErrors: true,
  strict: false,
  strictRequired: true, // Require all required properties
  strictTypes: true, // Strict type checking
});

const validateOB3 = ajv.compile(OB3_CONTEXT);

/**
 * Validates an Open Badges 3.0 credential against the schema
 * @param data The credential to validate
 * @returns An object with validation results
 */
export interface ValidationError {
  message: string;
  [key: string]: unknown;
}

export function validateOB3Credential(data: unknown): {
  valid: boolean;
  errors?: ValidationError[];
} {
  // Check for required fields manually since AJV might be too permissive
  if (typeof data !== 'object' || data === null) {
    return {
      valid: false,
      errors: [{ message: 'Data must be an object' }],
    };
  }

  const credential = data as Record<string, unknown>;

  // Check for required fields (validFrom per VC Data Model 2.0)
  if (
    !credential.id ||
    !credential.type ||
    !credential.issuer ||
    !credential.validFrom ||
    !credential.credentialSubject ||
    typeof credential.validFrom !== 'string'
  ) {
    return {
      valid: false,
      errors: [{ message: 'Missing required fields in VerifiableCredential' }],
    };
  }

  // Check credential subject
  const credentialSubject = credential.credentialSubject as Record<string, unknown> | undefined;
  if (!credentialSubject || !credentialSubject.achievement) {
    return {
      valid: false,
      errors: [{ message: 'Missing required achievement in credentialSubject' }],
    };
  }

  // Check achievement
  const achievement = credentialSubject.achievement;
  if (Array.isArray(achievement)) {
    if (achievement.length === 0 || !(achievement[0] as Record<string, unknown>).name) {
      return {
        valid: false,
        errors: [{ message: 'Achievement must have a name' }],
      };
    }
  } else if (!(achievement as Record<string, unknown>).name) {
    return {
      valid: false,
      errors: [{ message: 'Achievement must have a name' }],
    };
  }

  // Check issuer
  if (typeof credential.issuer === 'object' && credential.issuer !== null) {
    const issuer = credential.issuer as Record<string, unknown>;
    if (!issuer.id || !issuer.name) {
      return {
        valid: false,
        errors: [{ message: 'Issuer must have id and name' }],
      };
    }
  }

  // Run AJV validation
  const valid = validateOB3(data);
  // Convert AJV errors to our ValidationError format
  const errors = validateOB3.errors
    ? validateOB3.errors.map(err => ({
        message: err.message || 'Unknown validation error',
        ...err,
      }))
    : undefined;
  return { valid, errors };
}
