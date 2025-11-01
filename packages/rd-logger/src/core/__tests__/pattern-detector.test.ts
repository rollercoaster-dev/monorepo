/// <reference types="jest" />

// Mock chalk to disable color codes in tests for easier string matching
jest.mock('chalk', () => {
  const chalkMock = {
    gray: (msg: string) => msg,
    whiteBright: (msg: string) => msg,
    blue: (msg: string) => msg,
    green: (msg: string) => msg,
    yellow: (msg: string) => msg,
    red: (msg: string) => msg,
    magenta: (msg: string) => msg,
    dim: (msg: string) => msg,
    cyan: (msg: string) => msg,
  };
  return {
    __esModule: true,
    default: chalkMock,
    ...chalkMock,
  };
});

import { containsSensitiveData, redactSensitiveData } from '../sensitive';
import { safeStringify } from '../utils';

describe('Pattern Detection', () => {
  it('should detect API keys', () => {
    const apiKey = 'api_key=abcdef1234567890abcdef';
    expect(containsSensitiveData(apiKey)).toBe(true);

    const redacted = redactSensitiveData(apiKey);
    expect(redacted).toBe('[REDACTED]');
  });

  it('should detect JWT tokens', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    expect(containsSensitiveData(jwt)).toBe(true);

    const redacted = redactSensitiveData(jwt);
    expect(redacted).toBe('[REDACTED]');
  });

  it('should detect passwords', () => {
    const password = 'password="super-secret-password"';
    expect(containsSensitiveData(password)).toBe(true);

    const redacted = redactSensitiveData(password);
    expect(redacted).toBe('[REDACTED]');
  });

  it('should detect credit card numbers', () => {
    const creditCard = 'Card: 4111-1111-1111-1111';
    expect(containsSensitiveData(creditCard)).toBe(true);

    const redacted = redactSensitiveData(creditCard);
    expect(redacted).toBe('Card: [REDACTED]');
  });

  it('should detect SSNs', () => {
    const ssn = 'SSN: 123-45-6789';
    expect(containsSensitiveData(ssn)).toBe(true);

    const redacted = redactSensitiveData(ssn);
    expect(redacted).toBe('SSN: [REDACTED]');
  });

  it('should detect AWS access keys', () => {
    const awsKey = 'AKIAIOSFODNN7EXAMPLE';
    expect(containsSensitiveData(awsKey)).toBe(true);

    const redacted = redactSensitiveData(awsKey);
    expect(redacted).toBe('[REDACTED]');
  });

  it('should not detect normal text', () => {
    const normalText = 'This is just some normal text';
    expect(containsSensitiveData(normalText)).toBe(false);

    const redacted = redactSensitiveData(normalText);
    expect(redacted).toBe(normalText);
  });

  it('should handle non-string values', () => {
    expect(containsSensitiveData(null as any)).toBe(false);
    expect(containsSensitiveData(undefined as any)).toBe(false);
    expect(containsSensitiveData(123 as any)).toBe(false);
    expect(containsSensitiveData({} as any)).toBe(false);

    expect(redactSensitiveData(123 as any)).toBe(123 as any);
  });

  it('should work with safeStringify for automatic pattern detection', () => {
    const obj = {
      user: 'john',
      apiKey: 'api_key=abcdef1234567890abcdef',
      password: 'password="super-secret"',
      normal: 'visible'
    };

    const result = safeStringify(obj);
    expect(result).toContain('"user": "john"');
    expect(result).toContain('"apiKey": "[REDACTED]"');
    expect(result).toContain('"password": "[REDACTED]"');
    expect(result).toContain('"normal": "visible"');
  });
});
