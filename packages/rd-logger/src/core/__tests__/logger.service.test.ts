/// <reference types="jest" />

import { Logger } from '../logger.service';
import chalk from 'chalk';
import path from 'path';
// import fs from 'fs'; // Not used yet

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

// Mock fs for file logging tests (optional for now)
// jest.mock('fs');

const MOCK_LOG_FILE = path.join(__dirname, 'test.log');

describe('Logger Service', () => {
  let logger: Logger;
  let consoleSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    // Reset mocks and disable file logging by default for console tests
    jest.clearAllMocks();
    // We mocked chalk, so setting level might not be necessary, but doesn't hurt
    chalk.level = 0;
    logger = new Logger({ logToFile: false }); // Use correct property 'logToFile'
    // Spy on console.log to capture output
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress actual console output
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should initialize with default config values if no options provided', () => {
    const defaultLogger = new Logger();
    // Access internal config for testing - adjust if Logger exposes config differently
    // @ts-expect-error Accessing private property for testing
    const config = defaultLogger.config;
    // Check a few key defaults
    expect(config.level).toBe('info');
    expect(config.prettyPrint).toBe(true);
    expect(config.colorize).toBe(true);
    expect(config.logToFile).toBe(false);
  });

  it('should initialize with merged custom config', () => {
    const customLogger = new Logger({
      level: 'warn', // Use string literal
      // timestampFormat: 'YYYY-MM-DD', // Property does not exist
      prettyPrint: false,
      logToFile: true, // Use correct property
      logFilePath: MOCK_LOG_FILE,
    });
    // @ts-expect-error Accessing private property for testing
    const config = customLogger.config;
    expect(config.level).toBe('warn');
    // expect(config.timestampFormat).toBe('YYYY-MM-DD'); // Property does not exist
    expect(config.prettyPrint).toBe(false);
    expect(config.logToFile).toBe(true);
    expect(config.logFilePath).toBe(MOCK_LOG_FILE);
  });

  it('should log an info message to console', () => {
    logger.info('Test info message');
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logOutput = consoleSpy.mock.calls[0][0];
    expect(logOutput).toContain('INFO');
    expect(logOutput).toContain('Test info message');
    // Check for human-readable timestamp format (e.g., "Jun 7, 19:01:33.484")
    expect(logOutput).toMatch(
      /[A-Z][a-z]{2} \d{1,2}, \d{2}:\d{2}:\d{2}\.\d{3}/
    );
  });

  it('should log a warn message to console', () => {
    logger.warn('Test warning message');
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logOutput = consoleSpy.mock.calls[0][0];
    expect(logOutput).toContain('WARN');
    expect(logOutput).toContain('Test warning message');
  });

  it('should log an error message to console', () => {
    logger.error('Test error message');
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logOutput = consoleSpy.mock.calls[0][0];
    expect(logOutput).toContain('ERROR');
    expect(logOutput).toContain('Test error message');
  });

  it('should include context object in log message', () => {
    const context = { userId: 123, data: 'sample' };
    logger.info('Message with context', context);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logOutput = consoleSpy.mock.calls[0][0];
    expect(logOutput).toContain('Message with context');
    // Check for bullet list style context output
    expect(logOutput).toMatch(/• userId:\s*123/);
    expect(logOutput).toMatch(/• data:\s*sample/);
  });

  it('should stringify context with circular references safely', () => {
    const context: any = { name: 'circular' };
    context.self = context;
    logger.info('Circular context test', context);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logOutput = consoleSpy.mock.calls[0][0];
    expect(logOutput).toContain('Circular context test');
    expect(logOutput).toContain('"self": "[Circular]"');
    expect(logOutput).not.toContain('crashed'); // Ensure it didn't throw
  });

  // Add more tests: log levels filtering, error formatting, file logging etc.
});
