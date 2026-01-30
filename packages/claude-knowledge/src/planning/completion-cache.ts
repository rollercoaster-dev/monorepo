/**
 * Completion Status Cache
 *
 * TTL cache for completion status to avoid repeated external API calls.
 * Follows the caching pattern from stale.ts.
 *
 * Part of Planning Graph Phase 2 (epic #635).
 */

import type { CompletionStatus } from "./completion-resolver";

/**
 * Cache entry for step completion status.
 */
interface CacheEntry {
  status: CompletionStatus;
  fetchedAt: number;
}

/** 5-minute TTL cache */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** In-memory cache keyed by step ID + external ref */
const completionCache = new Map<string, CacheEntry>();

/**
 * Generate cache key from step ID and external reference.
 *
 * @param stepId - Plan step ID
 * @param externalRef - External reference string (e.g., "issue:123", "badge:xyz", "manual")
 * @returns Cache key
 */
function getCacheKey(stepId: string, externalRef: string): string {
  return `${stepId}:${externalRef}`;
}

/**
 * Get cached completion status if still valid.
 *
 * @param stepId - Plan step ID
 * @param externalRef - External reference string
 * @returns Cached status or null if expired/missing
 */
export function getCachedStatus(
  stepId: string,
  externalRef: string,
): CompletionStatus | null {
  const key = getCacheKey(stepId, externalRef);
  const cached = completionCache.get(key);

  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.status;
  }

  return null;
}

/**
 * Store completion status in cache.
 *
 * @param stepId - Plan step ID
 * @param externalRef - External reference string
 * @param status - Completion status to cache
 */
export function setCachedStatus(
  stepId: string,
  externalRef: string,
  status: CompletionStatus,
): void {
  const key = getCacheKey(stepId, externalRef);
  completionCache.set(key, {
    status,
    fetchedAt: Date.now(),
  });
}

/**
 * Clear the completion cache (useful for testing or explicit refresh).
 */
export function clearCompletionCache(): void {
  completionCache.clear();
}
