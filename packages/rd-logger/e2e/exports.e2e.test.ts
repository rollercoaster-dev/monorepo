// test/exports.test.ts
import { describe, it, expect } from "bun:test";

// Test the main entry point by importing from the built dist files
// This verifies that the package exports are correctly configured
import * as mainApi from "../dist/index.js";
import {
  Logger as MainLogger,
  SensitiveValue as MainSensitiveValue,
} from "../dist/index.js";

// Test the specific submodule export for 'core/logger.service'
// This verifies that subpath exports work correctly
import * as loggerServiceApi from "../dist/core/logger.service.js";

describe("@rollercoaster-dev/rd-logger public API via exports map", () => {
  it("should load the main module entry point (dist/index.js) and export key members", () => {
    expect(mainApi).toBeDefined();
    // Add more specific assertions here if 'dist/index.js' has named exports.
    // For example, if 'dist/index.js' exports a 'Logger' class:
    expect(MainLogger).toBeDefined();
    expect(typeof MainLogger).toBe("function"); // Assuming Logger is a class

    // Check for SensitiveValue from the main entry point
    expect(MainSensitiveValue).toBeDefined();
    // You might also check its type or if it's a class constructor
    // For example, if SensitiveValue is expected to be a class:
    // expect(typeof MainSensitiveValue).toBe('function');
  });

  it("should load the core/logger.service module (dist/core/logger.service.js)", () => {
    expect(loggerServiceApi).toBeDefined();
    // Add more specific assertions here based on what 'dist/core/logger.service.js' exports.
    // For example, if it exports 'LoggerService' class and 'SensitiveValue':
    // expect(loggerServiceApi.LoggerService).toBeDefined();
    // expect(loggerServiceApi.SensitiveValue).toBeDefined(); // Or use the direct import above.
  });

  // (Commented-out test block removed to maintain a clean and focused test file)
});
