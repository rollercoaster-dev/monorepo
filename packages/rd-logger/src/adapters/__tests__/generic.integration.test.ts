import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  mock,
  spyOn,
} from "bun:test";
import { runWithGenericContext } from "../generic.js";
import { Logger } from "../../core/logger.service.js";
import { getRequestStore } from "../../core/request-context.js";
import type { Spy } from "bun:test";

// Test-specific type for log context arguments
type MockLogContext = {
  duration?: string;
  contextName?: string;
  requestId?: string;
  error?: Error;
  [key: string]: unknown;
};

describe("Generic Adapter Integration", () => {
  let consoleSpy: Spy<typeof console.log>;
  let mockLoggerInstance: Logger;

  beforeEach(() => {
    consoleSpy = spyOn(console, "log").mockImplementation(() => {});

    // Create a fresh mocked logger for each test
    mockLoggerInstance = new Logger();

    // Mock the implementation of log methods using spyOn for consistency
    spyOn(mockLoggerInstance, "info").mockImplementation(() => {});
    spyOn(mockLoggerInstance, "error").mockImplementation(() => {});
    spyOn(mockLoggerInstance, "warn").mockImplementation(() => {});
    spyOn(mockLoggerInstance, "debug").mockImplementation(() => {});
    spyOn(mockLoggerInstance, "fatal").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    mock.restore();
  });

  it("should run a function, log start/end, and provide context", async () => {
    let internalRequestId: string | undefined;
    const result = await runWithGenericContext(
      async () => {
        internalRequestId = getRequestStore()?.requestId;
        expect(internalRequestId).toBeDefined();
        // Simulate some work
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "success";
      },
      { loggerInstance: mockLoggerInstance, contextName: "TestTask" },
    );

    expect(result).toBe("success");
    expect(internalRequestId).toBeDefined();

    expect(mockLoggerInstance.info).toHaveBeenCalledTimes(2);

    // Check start log
    expect(mockLoggerInstance.info).toHaveBeenNthCalledWith(
      1,
      "▶ Starting TestTask",
      {
        contextName: "TestTask",
        requestId: internalRequestId,
      },
    );

    // Check end log
    expect(mockLoggerInstance.info).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("◀ Finished TestTask"),
      expect.objectContaining({
        contextName: "TestTask",
        requestId: internalRequestId,
        duration: expect.any(String),
      }),
    );

    // Check duration format in end log
    const endLogArgs = mockLoggerInstance.info.mock
      .calls[1]?.[1] as MockLogContext;
    expect(endLogArgs?.duration).toMatch(/\d+ms/); // e.g., '15ms'
  });

  it("should log an error if the function throws", async () => {
    let internalRequestId: string | undefined;
    const testError = new Error("Something went wrong");

    await expect(
      runWithGenericContext(
        async () => {
          internalRequestId = getRequestStore()?.requestId;
          await new Promise((resolve) => setTimeout(resolve, 5));
          throw testError;
        },
        { loggerInstance: mockLoggerInstance, contextName: "ErrorTask" },
      ),
    ).rejects.toThrow("Something went wrong");

    expect(mockLoggerInstance.info).toHaveBeenCalledTimes(1); // Only start log
    expect(mockLoggerInstance.error).toHaveBeenCalledTimes(1);

    // Check error log
    expect(mockLoggerInstance.error).toHaveBeenCalledWith(
      expect.stringContaining("💥 Error in ErrorTask"),
      expect.objectContaining({
        contextName: "ErrorTask",
        requestId: internalRequestId,
        duration: expect.any(String),
        error: testError, // Check that the original error object is passed
      }),
    );

    // Check duration format in error log
    const errorLogArgs = mockLoggerInstance.error.mock
      .calls[0]?.[1] as MockLogContext;
    expect(errorLogArgs?.duration).toMatch(/\d+ms/);
  });

  it("should use provided request ID", async () => {
    const providedRequestId = "custom-id-123";
    await runWithGenericContext(
      () => {
        expect(getRequestStore()?.requestId).toBe(providedRequestId);
      },
      {
        loggerInstance: mockLoggerInstance,
        requestId: providedRequestId,
        logStartEnd: false, // Disable logs for simplicity
      },
    );
    expect(mockLoggerInstance.info).not.toHaveBeenCalled();
    expect(mockLoggerInstance.error).not.toHaveBeenCalled();
  });

  it("should not log start/end if logStartEnd is false", async () => {
    await runWithGenericContext(() => "done", {
      loggerInstance: mockLoggerInstance,
      logStartEnd: false,
    });
    expect(mockLoggerInstance.info).not.toHaveBeenCalled();
    expect(mockLoggerInstance.error).not.toHaveBeenCalled();
  });
});
