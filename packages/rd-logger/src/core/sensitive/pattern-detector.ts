/**
 * Patterns for detecting common sensitive data formats
 */
export const SENSITIVE_PATTERNS = {
  // API keys - typically long alphanumeric strings
  API_KEY: /(?:api[_-]?key|apikey|access[_-]?key|auth[_-]?key)[:=]["']?([a-zA-Z0-9]{16,})["']?/i,
  
  // JWT tokens - three base64-encoded segments separated by periods
  JWT: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
  
  // OAuth tokens
  OAUTH_TOKEN: /(?:access[_-]?token|oauth[_-]?token|bearer[_-]?token)[:=]["']?([a-zA-Z0-9]{10,})["']?/i,
  
  // Passwords
  PASSWORD: /(?:password|passwd|pwd)[:=]["']?([^"'\s]{3,})["']?/i,
  
  // Credit card numbers - with or without spaces/dashes
  CREDIT_CARD: /(?:\d{4}[-\s]?){3}\d{4}/,
  
  // Social security numbers (US)
  SSN: /\d{3}[-\s]?\d{2}[-\s]?\d{4}/,
  
  // Email addresses
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  
  // IP addresses
  IP_ADDRESS: /\b(?:\d{1,3}\.){3}\d{1,3}\b/,
  
  // AWS access keys
  AWS_ACCESS_KEY: /AKIA[0-9A-Z]{16}/,
  
  // Private keys
  PRIVATE_KEY: /-----BEGIN (?:RSA |DSA |EC )?PRIVATE KEY-----/,
};

/**
 * Check if a string contains sensitive data based on patterns
 * @param str String to check
 * @returns Whether the string contains sensitive data
 */
export function containsSensitiveData(str: string): boolean {
  if (typeof str !== 'string') {
    return false;
  }
  
  // Check against all patterns
  return Object.values(SENSITIVE_PATTERNS).some(pattern => pattern.test(str));
}

/**
 * Redact sensitive data in a string based on patterns
 * @param str String to redact
 * @param redactedValue Value to use for redaction
 * @returns Redacted string
 */
export function redactSensitiveData(str: string, redactedValue: string = '[REDACTED]'): string {
  if (typeof str !== 'string') {
    return str;
  }
  
  let result = str;
  
  // Apply each pattern and redact matches
  Object.values(SENSITIVE_PATTERNS).forEach(pattern => {
    result = result.replace(pattern, redactedValue);
  });
  
  return result;
}
