/// <reference types="jest" />

import { Logger } from '../logger.service';
// These imports are used in the test setup
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ConsoleTransport, FileTransport } from '../transports';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { JsonFormatter } from '../formatters';
import fs from 'fs';
import path from 'path';

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

describe('Logger Transports', () => {
  let consoleSpy: jest.SpiedFunction<typeof console.log>;
  const TEST_LOG_FILE = path.join(__dirname, 'test.log');

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    // Clean up test log file if it exists
    if (fs.existsSync(TEST_LOG_FILE)) {
      fs.unlinkSync(TEST_LOG_FILE);
    }
  });

  afterEach(() => {
    consoleSpy.mockRestore();

    // Clean up test log file
    if (fs.existsSync(TEST_LOG_FILE)) {
      fs.unlinkSync(TEST_LOG_FILE);
    }
  });

  it('should use the console transport by default', () => {
    const logger = new Logger();
    logger.info('Test message');
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should use custom transports when provided', () => {
    const mockTransport = {
      name: 'mock',
      log: jest.fn(),
    };

    const logger = new Logger({
      transports: [mockTransport],
    });

    logger.info('Test message');
    expect(mockTransport.log).toHaveBeenCalled();
    expect(consoleSpy).not.toHaveBeenCalled(); // Default console transport should not be used
  });

  it('should add and remove transports dynamically', () => {
    const logger = new Logger();
    const mockTransport = {
      name: 'mock',
      log: jest.fn(),
    };

    // Add transport
    logger.addTransport(mockTransport);
    logger.info('Test with mock transport');
    expect(mockTransport.log).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockClear();
    mockTransport.log.mockClear();

    // Remove transport
    const removed = logger.removeTransport('mock');
    expect(removed).toBe(true);

    logger.info('Test without mock transport');
    expect(mockTransport.log).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should use file transport when logToFile is enabled', async () => {
    const logger = new Logger({
      logToFile: true,
      logFilePath: TEST_LOG_FILE,
    });

    logger.info('Test file logging');

    // Clean up
    logger.cleanup();

    // Wait for file to be written
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if file exists and contains the log message
    expect(fs.existsSync(TEST_LOG_FILE)).toBe(true);
    const fileContent = fs.readFileSync(TEST_LOG_FILE, 'utf8');
    expect(fileContent).toContain('INFO: Test file logging');
  });

  it('should respect log level filtering', () => {
    const mockTransport = {
      name: 'mock',
      log: jest.fn(),
    };

    const logger = new Logger({
      level: 'warn',
      transports: [mockTransport],
    });

    logger.debug('Debug message'); // Should be filtered out
    logger.info('Info message');   // Should be filtered out
    logger.warn('Warning message'); // Should be logged
    logger.error('Error message');  // Should be logged

    expect(mockTransport.log).toHaveBeenCalledTimes(2);
    expect(mockTransport.log).not.toHaveBeenCalledWith('debug', 'Debug message', expect.anything(), expect.anything());
    expect(mockTransport.log).not.toHaveBeenCalledWith('info', 'Info message', expect.anything(), expect.anything());
  });

  it('should update transports when configuration changes', () => {
    const logger = new Logger();

    // Initially only console transport
    logger.info('Console only');
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    consoleSpy.mockClear();

    // Enable file logging
    logger.configure({
      logToFile: true,
      logFilePath: TEST_LOG_FILE,
    });

    logger.info('Console and file');
    expect(consoleSpy).toHaveBeenCalledTimes(1);

    // Clean up
    logger.cleanup();
  });
});
