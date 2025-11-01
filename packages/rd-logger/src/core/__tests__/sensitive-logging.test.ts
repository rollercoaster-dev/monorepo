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

import { Logger } from '../logger.service';
import { SensitiveValue, SensitiveLoggingApproval } from '../sensitive';

describe('Sensitive Logging', () => {
  let logger: Logger;
  let consoleSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = new Logger();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should log sensitive data with approval', () => {
    const apiKey = 'secret-api-key-12345';
    const approval: SensitiveLoggingApproval = {
      reason: 'Testing sensitive data logging',
      approvedBy: 'Test Team'
    };

    logger.logWithSensitiveData('info', 'API key debug', { key: apiKey }, approval);

    expect(consoleSpy).toHaveBeenCalled();
    const logOutput = consoleSpy.mock.calls[0][0];

    // Should include warning prefix
    expect(logOutput).toContain('SENSITIVE DATA');
    // Should include the actual sensitive data
    expect(logOutput).toContain(apiKey);
    // Should include approval information
    expect(logOutput).toContain('Testing sensitive data logging');
    expect(logOutput).toContain('Test Team');
  });

  it('should not log sensitive data without proper approval', () => {
    const apiKey = 'secret-api-key-12345';
    const approval: SensitiveLoggingApproval = {
      reason: '', // Empty reason
      approvedBy: 'Test Team'
    };

    logger.logWithSensitiveData('info', 'API key debug', { key: apiKey }, approval);

    expect(consoleSpy).toHaveBeenCalled();
    const logOutput = consoleSpy.mock.calls[0][0];

    // Should not include the sensitive data
    expect(logOutput).not.toContain(apiKey);
    // Should include warning about missing approval
    expect(logOutput).toContain('without proper approval');
  });

  it('should not log sensitive data with expired approval', () => {
    const apiKey = 'secret-api-key-12345';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const approval: SensitiveLoggingApproval = {
      reason: 'Testing sensitive data logging',
      approvedBy: 'Test Team',
      expiresAt: yesterday // Expired
    };

    logger.logWithSensitiveData('info', 'API key debug', { key: apiKey }, approval);

    expect(consoleSpy).toHaveBeenCalled();
    const logOutput = consoleSpy.mock.calls[0][0];

    // Should not include the sensitive data
    expect(logOutput).not.toContain(apiKey);
    // Should include warning about expired approval
    expect(logOutput).toContain('expired approval');
  });

  it('should provide convenience methods for common log levels', () => {
    const apiKey = 'secret-api-key-12345';
    const approval: SensitiveLoggingApproval = {
      reason: 'Testing sensitive data logging',
      approvedBy: 'Test Team'
    };

    // Test info level
    logger.infoWithSensitiveData('Info with sensitive data', { key: apiKey }, approval);
    expect(consoleSpy).toHaveBeenCalled();
    let logOutput = consoleSpy.mock.calls[0][0];
    expect(logOutput).toContain('INFO');
    expect(logOutput).toContain(apiKey);

    consoleSpy.mockClear();

    // Test error level
    logger.errorWithSensitiveData('Error with sensitive data', { key: apiKey }, approval);
    expect(consoleSpy).toHaveBeenCalled();
    logOutput = consoleSpy.mock.calls[0][0];
    expect(logOutput).toContain('ERROR');
    expect(logOutput).toContain(apiKey);
  });

  it('should redact SensitiveValue instances in normal logging', () => {
    const apiKey = new SensitiveValue('secret-api-key-12345');

    logger.info('API key created', { key: apiKey });

    expect(consoleSpy).toHaveBeenCalled();
    const logOutput = consoleSpy.mock.calls[0][0];

    // Should not include the actual sensitive data
    expect(logOutput).not.toContain('secret-api-key-12345');
    // Should include the redacted value
    expect(logOutput).toContain('[REDACTED]');
  });
});
