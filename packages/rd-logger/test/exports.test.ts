// test/exports.test.ts
import { describe, it, expect } from 'vitest';

// Test the main entry point
// ESM import for the package itself to test the '.' export.
// This assumes that '@rollercoaster-dev/rd-logger' resolves to 'dist/index.js'.
import * as mainApi from '@rollercoaster-dev/rd-logger';
import { Logger as MainLogger, SensitiveValue as MainSensitiveValue } from '@rollercoaster-dev/rd-logger';

// Test the specific submodule export for 'core/logger.service'.
// This assumes that '@rollercoaster-dev/rd-logger/core/logger.service' resolves to 'dist/core/logger.service.js'.
import * as loggerServiceApi from '@rollercoaster-dev/rd-logger/core/logger.service';
// If 'SensitiveValue' or other specific named exports are expected from 'logger.service.ts',
// you would import them like this to test their availability:
// import { SensitiveValue } from '@rollercoaster-dev/rd-logger/core/logger.service';

describe('@rollercoaster-dev/rd-logger public API via exports map', () => {
  it('should load the main module entry point (dist/index.js) and export key members', () => {
    expect(mainApi).toBeDefined();
    // Add more specific assertions here if 'dist/index.js' has named exports.
    // For example, if 'dist/index.js' exports a 'Logger' class:
    expect(MainLogger).toBeDefined();
    expect(typeof MainLogger).toBe('function'); // Assuming Logger is a class

    // Check for SensitiveValue from the main entry point
    expect(MainSensitiveValue).toBeDefined();
    // You might also check its type or if it's a class constructor
    // For example, if SensitiveValue is expected to be a class:
    // expect(typeof MainSensitiveValue).toBe('function');
  });

  it('should load the core/logger.service module (dist/core/logger.service.js)', () => {
    expect(loggerServiceApi).toBeDefined();
    // Add more specific assertions here based on what 'dist/core/logger.service.js' exports.
    // For example, if it exports 'LoggerService' class and 'SensitiveValue':
    // expect(loggerServiceApi.LoggerService).toBeDefined();
    // expect(loggerServiceApi.SensitiveValue).toBeDefined(); // Or use the direct import above.
  });

// (Commented-out test block removed to maintain a clean and focused test file)
});
