/**
 * Telegram MCP helpers for workflow notifications
 *
 * These helpers wrap the Telegram MCP tools with graceful degradation.
 * When Telegram is unavailable (CLI context), they return failure results.
 *
 * NOTE: These are placeholder implementations for CLI usage. In actual Claude
 * execution, the MCP tools are injected directly and these functions are not used.
 */

import type { TelegramResult, TelegramResponse } from "../types";

/**
 * Send a notification via Telegram (non-blocking)
 *
 * In CLI context, this is a stub that logs to console and returns failure.
 * In Claude execution context, the actual MCP tool is used instead.
 *
 * @param message - The message to send
 * @param context - Context for logging (e.g., "WORK-ON-ISSUE #123")
 * @returns Result indicating success or failure
 */
export async function notifyTelegram(
  message: string,
  context: string,
): Promise<TelegramResult> {
  // In CLI context, Telegram MCP is not available
  // Log to console and return failure to be honest about what happened
  const truncated = message.length > 50;
  console.warn(
    `[${context}] Telegram notification skipped (MCP not available in CLI): ${message.substring(0, 50)}${truncated ? "..." : ""}`,
  );
  return {
    success: false,
    error: "Telegram MCP not available in CLI context - notification not sent",
  };
}

/**
 * Ask a question via Telegram and wait for response (blocking)
 *
 * In CLI context, this is a stub that returns TELEGRAM_UNAVAILABLE.
 * In Claude execution context, the actual MCP tool is used instead.
 *
 * @param question - The question to ask
 * @param context - Context for logging
 * @returns User's response or 'TELEGRAM_UNAVAILABLE'
 */
export async function askTelegram(
  question: string,
  context: string,
): Promise<TelegramResponse> {
  // In CLI context, Telegram MCP is not available
  const truncated = question.length > 50;
  console.warn(
    `[${context}] Telegram question skipped (MCP not available): ${question.substring(0, 50)}${truncated ? "..." : ""}`,
  );
  return "TELEGRAM_UNAVAILABLE";
}

/**
 * Check if Telegram MCP is available
 *
 * In CLI context, always returns false.
 * In Claude execution context, the MCP tools are directly available.
 */
export function isTelegramAvailable(): boolean {
  // In CLI context, Telegram MCP is not available
  return false;
}
