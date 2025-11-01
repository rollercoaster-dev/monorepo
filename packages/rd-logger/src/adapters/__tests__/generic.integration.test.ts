/// <reference types="jest" />

import { runWithGenericContext } from '../generic';
import { Logger } from '../../core/logger.service';
import { getRequestStore } from '../../core/request-context';


// Mock chalk
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

// Mock Logger methods to simplify testing
jest.mock('../../core/logger.service');

describe('Generic Adapter Integration', () => {
  let consoleSpy: jest.SpyInstance;
  let mockLoggerInstance: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    // Create a fresh mocked logger for each test
    mockLoggerInstance = new Logger() as jest.Mocked<Logger>;

    // Mock the implementation of log methods
    mockLoggerInstance.info = jest.fn();
    mockLoggerInstance.error = jest.fn();
    mockLoggerInstance.warn = jest.fn();
    mockLoggerInstance.debug = jest.fn();
    mockLoggerInstance.fatal = jest.fn();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should run a function, log start/end, and provide context', async () => {
    let internalRequestId: string | undefined;
    const result = await runWithGenericContext(
      async () => {
        internalRequestId = getRequestStore()?.requestId;
        expect(internalRequestId).toBeDefined();
        // Simulate some work
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'success';
      },
      { loggerInstance: mockLoggerInstance, contextName: 'TestTask' }
    );

    expect(result).toBe('success');
    expect(internalRequestId).toBeDefined();

    expect(mockLoggerInstance.info).toHaveBeenCalledTimes(2);

    // Check start log
    expect(mockLoggerInstance.info).toHaveBeenNthCalledWith(
      1,
      '▶ Starting TestTask',
      {
        contextName: 'TestTask',
        requestId: internalRequestId,
      }
    );

    // Check end log
    expect(mockLoggerInstance.info).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('◀ Finished TestTask'),
      expect.objectContaining({
        contextName: 'TestTask',
        requestId: internalRequestId,
        duration: expect.any(String),
      })
    );

    // Check duration format in end log
    const endLogArgs = mockLoggerInstance.info.mock.calls[1][1] as any;
    expect(endLogArgs.duration).toMatch(/\d+ms/); // e.g., '15ms'
  });

  it('should log an error if the function throws', async () => {
    let internalRequestId: string | undefined;
    const testError = new Error('Something went wrong');

    await expect(
      runWithGenericContext(
        async () => {
          internalRequestId = getRequestStore()?.requestId;
          await new Promise((resolve) => setTimeout(resolve, 5));
          throw testError;
        },
        { loggerInstance: mockLoggerInstance, contextName: 'ErrorTask' }
      )
    ).rejects.toThrow('Something went wrong');

    expect(mockLoggerInstance.info).toHaveBeenCalledTimes(1); // Only start log
    expect(mockLoggerInstance.error).toHaveBeenCalledTimes(1);

    // Check error log
    expect(mockLoggerInstance.error).toHaveBeenCalledWith(
      expect.stringContaining('💥 Error in ErrorTask'),
      expect.objectContaining({
        contextName: 'ErrorTask',
        requestId: internalRequestId,
        duration: expect.any(String),
        error: testError, // Check that the original error object is passed
      })
    );

    // Check duration format in error log
    const errorLogArgs = mockLoggerInstance.error.mock.calls[0][1] as any;
    expect(errorLogArgs.duration).toMatch(/\d+ms/);
  });

  it('should use provided request ID', async () => {
    const providedRequestId = 'custom-id-123';
    await runWithGenericContext(
      () => {
        expect(getRequestStore()?.requestId).toBe(providedRequestId);
      },
      {
        loggerInstance: mockLoggerInstance,
        requestId: providedRequestId,
        logStartEnd: false, // Disable logs for simplicity
      }
    );
    expect(mockLoggerInstance.info).not.toHaveBeenCalled();
    expect(mockLoggerInstance.error).not.toHaveBeenCalled();
  });

  it('should not log start/end if logStartEnd is false', async () => {
    await runWithGenericContext(() => 'done', {
      loggerInstance: mockLoggerInstance,
      logStartEnd: false,
    });
    expect(mockLoggerInstance.info).not.toHaveBeenCalled();
    expect(mockLoggerInstance.error).not.toHaveBeenCalled();
  });
});
