/* eslint-disable no-console */
import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { Logger } from "@rollercoaster-dev/rd-logger";
import { SensitiveValue } from "@rollercoaster-dev/rd-logger";

describe("Logging Security Integration", () => {
  let logOutput: string[] = [];
  let originalConsoleLog: typeof console.log;

  beforeEach(() => {
    logOutput = [];
    originalConsoleLog = console.log;
    console.log = mock((...args: unknown[]) => {
      logOutput.push(JSON.stringify(args));
    });
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  test("sensitive values never appear in plain text in logs", () => {
    const logger = new Logger({ level: "debug" });
    const password = "SuperSecret123!";
    const apiKey = "sk_live_1234567890";
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

    logger.info("User login", {
      username: "testuser",
      password: new SensitiveValue(password),
      apiKey: new SensitiveValue(apiKey),
      token: new SensitiveValue(token),
    });

    const allLogs = logOutput.join(" ");

    // Verify sensitive values are NOT in logs
    expect(allLogs).not.toContain(password);
    expect(allLogs).not.toContain(apiKey);
    expect(allLogs).not.toContain(token);

    // Verify [REDACTED] appears instead
    expect(allLogs).toContain("[REDACTED]");
  });
});
