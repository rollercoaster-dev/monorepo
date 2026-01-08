/**
 * Validation helpers for running code quality checks
 *
 * Provides functions for running type-check, lint, test, and build.
 */

import type { ValidationResult, ValidationStage } from "../types";
import { execNoThrow } from "../utils/exec";

/**
 * Run basic validation (type-check + lint)
 *
 * Use after each code change or before committing.
 */
export async function validateBasic(cwd?: string): Promise<ValidationResult> {
  // Type check
  const typeCheck = await execNoThrow("bun", ["run", "type-check"], { cwd });
  if (typeCheck.status !== 0) {
    return {
      success: false,
      stage: "type-check",
      output: typeCheck.stderr || typeCheck.stdout,
    };
  }

  // Lint
  const lint = await execNoThrow("bun", ["run", "lint"], { cwd });
  if (lint.status !== 0) {
    return {
      success: false,
      stage: "lint",
      output: lint.stderr || lint.stdout,
    };
  }

  return { success: true };
}

/**
 * Run full validation (test + type-check + lint + build)
 *
 * Use before creating a PR.
 */
export async function validateFull(cwd?: string): Promise<ValidationResult> {
  // Test
  const test = await execNoThrow("bun", ["test"], { cwd });
  if (test.status !== 0) {
    return {
      success: false,
      stage: "test",
      output: test.stderr || test.stdout,
    };
  }

  // Type check
  const typeCheck = await execNoThrow("bun", ["run", "type-check"], { cwd });
  if (typeCheck.status !== 0) {
    return {
      success: false,
      stage: "type-check",
      output: typeCheck.stderr || typeCheck.stdout,
    };
  }

  // Lint
  const lint = await execNoThrow("bun", ["run", "lint"], { cwd });
  if (lint.status !== 0) {
    return {
      success: false,
      stage: "lint",
      output: lint.stderr || lint.stdout,
    };
  }

  // Build
  const build = await execNoThrow("bun", ["run", "build"], { cwd });
  if (build.status !== 0) {
    return {
      success: false,
      stage: "build",
      output: build.stderr || build.stdout,
    };
  }

  return { success: true };
}

/**
 * Run a specific validation stage
 */
export async function validateStage(
  stage: ValidationStage,
  cwd?: string,
): Promise<ValidationResult> {
  const command = stage === "test" ? "test" : `run ${stage}`;
  const args = command.split(" ");

  const result = await execNoThrow("bun", args, { cwd });

  if (result.status !== 0) {
    return {
      success: false,
      stage,
      output: result.stderr || result.stdout,
    };
  }

  return { success: true };
}

/**
 * Run lint with auto-fix
 */
export async function lintFix(cwd?: string): Promise<ValidationResult> {
  const result = await execNoThrow("bun", ["run", "lint:fix"], { cwd });

  if (result.status !== 0) {
    return {
      success: false,
      stage: "lint",
      output: result.stderr || result.stdout,
    };
  }

  return { success: true };
}

/**
 * Run specific tests
 */
export async function runTests(
  testPath: string,
  cwd?: string,
): Promise<ValidationResult> {
  const result = await execNoThrow("bun", ["test", testPath], { cwd });

  if (result.status !== 0) {
    return {
      success: false,
      stage: "test",
      output: result.stderr || result.stdout,
    };
  }

  return { success: true };
}
