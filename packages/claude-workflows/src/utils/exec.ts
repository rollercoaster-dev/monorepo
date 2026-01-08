/**
 * Execution utilities for running shell commands
 *
 * Uses Bun.spawn which is safe from shell injection (like execFile, not exec).
 * Arguments are passed as array, not interpolated into a shell string.
 */

/* eslint-disable no-undef */
// Bun global is available in Bun runtime

import type { ExecResult } from "../types";

/**
 * Execute a command without throwing on non-zero exit
 *
 * Safe from shell injection - uses Bun.spawn with args array.
 */
export async function execNoThrow(
  command: string,
  args: string[] = [],
  options: { cwd?: string; timeout?: number } = {},
): Promise<ExecResult> {
  const proc = Bun.spawn([command, ...args], {
    cwd: options.cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const status = await proc.exited;

  return { status, stdout, stderr };
}

/**
 * Execute a command and throw on non-zero exit
 *
 * Safe from shell injection - uses Bun.spawn with args array.
 */
export async function runCommand(
  command: string,
  args: string[] = [],
  options: { cwd?: string; timeout?: number } = {},
): Promise<ExecResult> {
  const result = await execNoThrow(command, args, options);

  if (result.status !== 0) {
    throw new Error(
      `Command "${command} ${args.join(" ")}" failed with status ${result.status}:\n${result.stderr}`,
    );
  }

  return result;
}

/**
 * Execute a GitHub CLI command
 */
export async function gh(
  args: string[],
  options: { cwd?: string } = {},
): Promise<ExecResult> {
  return runCommand("gh", args, options);
}

/**
 * Execute a GitHub CLI command without throwing
 */
export async function ghNoThrow(
  args: string[],
  options: { cwd?: string } = {},
): Promise<ExecResult> {
  return execNoThrow("gh", args, options);
}

/**
 * Execute a git command
 */
export async function git(
  args: string[],
  options: { cwd?: string } = {},
): Promise<ExecResult> {
  return runCommand("git", args, options);
}

/**
 * Execute a git command without throwing
 */
export async function gitNoThrow(
  args: string[],
  options: { cwd?: string } = {},
): Promise<ExecResult> {
  return execNoThrow("git", args, options);
}
