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

import { SensitiveValue } from '../sensitive';
import { safeStringify } from '../utils';
import util from 'util';

describe('SensitiveValue', () => {
  it('should redact values when converted to string', () => {
    const apiKey = 'secret-api-key-12345';
    const sensitive = new SensitiveValue(apiKey);

    expect(String(sensitive)).toBe('[REDACTED]');
    expect(sensitive.toString()).toBe('[REDACTED]');
  });

  it('should redact values when converted to JSON', () => {
    const password = 'super-secret-password';
    const sensitive = new SensitiveValue(password);

    expect(JSON.stringify(sensitive)).toBe('"[REDACTED]"');
    expect(JSON.stringify({ password: sensitive })).toBe('{"password":"[REDACTED]"}');
  });

  it('should redact values when inspected', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    const sensitive = new SensitiveValue(token);

    // Test Node.js util.inspect custom handler
    expect(util.inspect(sensitive)).toBe('[REDACTED]');
  });

  it('should allow custom redacted values', () => {
    const ssn = '123-45-6789';
    const sensitive = new SensitiveValue(ssn, '[SSN HIDDEN]');

    expect(String(sensitive)).toBe('[SSN HIDDEN]');
    expect(JSON.stringify(sensitive)).toBe('"[SSN HIDDEN]"');
  });

  it('should provide access to the actual value when needed', () => {
    const apiKey = 'secret-api-key-12345';
    const sensitive = new SensitiveValue(apiKey);

    expect(sensitive.getValue()).toBe(apiKey);
  });

  it('should work with the factory method', () => {
    const password = 'super-secret-password';
    const sensitive = SensitiveValue.from(password);

    expect(String(sensitive)).toBe('[REDACTED]');
    expect(sensitive.getValue()).toBe(password);
  });

  it('should work with objects', () => {
    const userData = { id: 123, name: 'John', ssn: '123-45-6789' };
    const sensitive = new SensitiveValue(userData);

    expect(String(sensitive)).toBe('[REDACTED]');
    expect(sensitive.getValue()).toEqual(userData);
  });

  it('should be properly handled by safeStringify', () => {
    const apiKey = 'secret-api-key-12345';
    const sensitive = new SensitiveValue(apiKey);
    const obj = { key: sensitive, normal: 'visible' };

    const result = safeStringify(obj);
    expect(result).toContain('"key": "[REDACTED]"');
    expect(result).toContain('"normal": "visible"');
  });
});
