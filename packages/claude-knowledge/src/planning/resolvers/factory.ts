/**
 * Resolver Factory
 *
 * Factory for creating completion resolvers based on external reference type.
 * Selects the appropriate resolver implementation for each step.
 *
 * Part of Planning Graph Phase 2 (epic #635).
 */

import type { CompletionResolver } from "../completion-resolver";
import type { ExternalRefType } from "../../types";
import { MilestoneResolver } from "./milestone-resolver";
import { ManualResolver } from "./manual-resolver";
import { LearningResolver } from "./learning-resolver";

/**
 * Singleton resolver instances (one per type).
 */
const resolvers: Record<ExternalRefType, CompletionResolver> = {
  issue: new MilestoneResolver(),
  manual: new ManualResolver(),
  badge: new LearningResolver(),
};

/**
 * Get the appropriate completion resolver for an external reference type.
 *
 * @param refType - External reference type (issue, badge, manual)
 * @returns Completion resolver instance
 */
export function getResolver(refType: ExternalRefType): CompletionResolver {
  return resolvers[refType];
}
