/**
 * Telegram MCP helpers for workflow notifications
 *
 * These helpers wrap the Telegram MCP tools with graceful degradation.
 * When Telegram is unavailable, they fail silently and return a sentinel value.
 */

import type { TelegramResult, TelegramResponse } from "../types";

/**
 * Send a notification via Telegram (non-blocking)
 *
 * Falls back gracefully if Telegram MCP is unavailable.
 *
 * @param message - The message to send
 * @param context - Context for logging (e.g., "WORK-ON-ISSUE #123")
 * @returns Result indicating success or failure
 */
export async function notifyTelegram(
  message: string,
  context: string,
): Promise<TelegramResult> {
  // Note: In actual Claude execution, MCP tools are injected.
  // For CLI usage, this would need to shell out to the MCP.
  // This is a placeholder that logs to console.
  console.log(`[${context}] Telegram: ${message.substring(0, 50)}...`);
  return { success: true };
}

/**
 * Ask a question via Telegram and wait for response (blocking)
 *
 * Falls back to terminal if Telegram MCP is unavailable.
 *
 * @param question - The question to ask
 * @param context - Context for logging
 * @returns User's response or 'TELEGRAM_UNAVAILABLE'
 */
export async function askTelegram(
  question: string,
  context: string,
): Promise<TelegramResponse> {
  // Note: In actual Claude execution, MCP tools are injected.
  // For CLI usage, this would need to shell out to the MCP.
  console.log(
    `[${context}] Telegram question: ${question.substring(0, 50)}...`,
  );
  return "TELEGRAM_UNAVAILABLE";
}

/**
 * Check if Telegram MCP is available
 */
export function isTelegramAvailable(): boolean {
  // In CLI context, check if MCP is configured
  // This is a placeholder
  return false;
}
