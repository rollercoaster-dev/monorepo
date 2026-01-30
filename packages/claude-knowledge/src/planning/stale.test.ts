/**
 * Stale Detection Tests
 *
 * Tests for stale item detection with plan-managed goal support.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { detectStaleItems, clearStaleCache } from "./stale";
import {
  createGoal,
  createPlan,
  createPlanStep,
  getStack,
  deleteEntity,
} from "./store";
import type { ExternalRef, PlanStep } from "../types";
import { closeDatabase, resetDatabase } from "../db/sqlite";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { cleanupTestDb } from "../test-utils";
import {
  _setResolverForTesting,
  _resetResolversForTesting,
} from "./resolvers/factory";
import type { CompletionResolver } from "./completion-resolver";
import type { CompletionStatus } from "./completion-resolver";

const TEST_DB = ".claude/test-stale.db";

/**
 * Create a mock resolver that returns a specific status.
 */
function createMockResolver(status: CompletionStatus): CompletionResolver {
  return {
    resolve: async (_step: PlanStep): Promise<CompletionStatus> => status,
  };
}

/**
 * Create a mock resolver that tracks calls and returns a specific status.
 */
function createTrackingMockResolver(status: CompletionStatus): {
  resolver: CompletionResolver;
  calls: PlanStep[];
} {
  const calls: PlanStep[] = [];
  return {
    resolver: {
      resolve: async (step: PlanStep): Promise<CompletionStatus> => {
        calls.push(step);
        return status;
      },
    },
    calls,
  };
}

describe("detectStaleItems", () => {
  beforeEach(async () => {
    if (!existsSync(".claude")) await mkdir(".claude", { recursive: true });
    resetDatabase(TEST_DB);
    clearStaleCache();
    _resetResolversForTesting();
  });

  afterEach(async () => {
    clearStaleCache();
    _resetResolversForTesting();
    closeDatabase();
    await cleanupTestDb(TEST_DB);
  });

  test("detects stale plan-managed goal when linked issue is closed", async () => {
    // Mock the issue resolver to return "done" (issue closed)
    _setResolverForTesting("issue", createMockResolver("done"));

    // Create a goal with a plan step
    const goal = createGoal({ title: "Implement feature X" });
    const plan = createPlan({
      title: "Feature X Plan",
      goalId: goal.id,
      sourceType: "milestone",
    });

    const externalRef: ExternalRef = {
      type: "issue",
      number: 123,
    };

    const step = createPlanStep({
      planId: plan.id,
      title: "Fix bug #123",
      ordinal: 1,
      wave: 1,
      externalRef,
    });

    // Update goal to link to plan step
    const db = await import("../db/sqlite").then((m) => m.getDatabase());
    const goalData = JSON.parse(
      db
        .query<
          { data: string },
          [string]
        >(`SELECT data FROM planning_entities WHERE id = ?`)
        .get(goal.id)!.data,
    ) as Record<string, unknown>;
    goalData.planStepId = step.id;

    db.run(
      `UPDATE planning_entities SET data = ? WHERE id = ?`,
      JSON.stringify(goalData),
      goal.id,
    );

    const staleItems = await detectStaleItems();

    // Should detect as stale because resolver returned "done"
    const staleGoal = staleItems.find((s) => s.item.id === goal.id);
    expect(staleGoal).toBeDefined();
    expect(staleGoal?.reason).toContain("closed");

    // Clean up
    deleteEntity(goal.id);
  });

  test("ignores plan-managed goal when linked issue is open", async () => {
    // Mock the issue resolver to return "not-started" (issue open)
    _setResolverForTesting("issue", createMockResolver("not-started"));

    // Create a goal with a plan step for an open issue
    const goal = createGoal({ title: "Work on open issue" });
    const plan = createPlan({
      title: "Open Issue Plan",
      goalId: goal.id,
      sourceType: "milestone",
    });

    const externalRef: ExternalRef = {
      type: "issue",
      number: 456,
    };

    const step = createPlanStep({
      planId: plan.id,
      title: "Open issue work",
      ordinal: 1,
      wave: 1,
      externalRef,
    });

    // Update goal to link to plan step
    const db = await import("../db/sqlite").then((m) => m.getDatabase());
    const goalData = JSON.parse(
      db
        .query<
          { data: string },
          [string]
        >(`SELECT data FROM planning_entities WHERE id = ?`)
        .get(goal.id)!.data,
    ) as Record<string, unknown>;
    goalData.planStepId = step.id;

    db.run(
      `UPDATE planning_entities SET data = ? WHERE id = ?`,
      JSON.stringify(goalData),
      goal.id,
    );

    const staleItems = await detectStaleItems();

    // Should NOT find this goal as stale (resolver returned "not-started")
    const staleGoal = staleItems.find((s) => s.item.id === goal.id);
    expect(staleGoal).toBeUndefined();

    // Clean up
    deleteEntity(goal.id);
  });

  test("handles missing PlanStep gracefully", async () => {
    // Create a goal with invalid planStepId
    const goal = createGoal({ title: "Goal with missing step" });

    const db = await import("../db/sqlite").then((m) => m.getDatabase());
    const goalData = JSON.parse(
      db
        .query<
          { data: string },
          [string]
        >(`SELECT data FROM planning_entities WHERE id = ?`)
        .get(goal.id)!.data,
    ) as Record<string, unknown>;
    goalData.planStepId = "non-existent-step-id";

    db.run(
      `UPDATE planning_entities SET data = ? WHERE id = ?`,
      JSON.stringify(goalData),
      goal.id,
    );

    // Should not throw error
    const staleItems = await detectStaleItems();

    // Should not flag as stale (graceful handling)
    const staleGoal = staleItems.find((s) => s.item.id === goal.id);
    expect(staleGoal).toBeUndefined();

    // Clean up
    deleteEntity(goal.id);
  });

  test("handles manual external ref types", async () => {
    // Mock the manual resolver to return "not-started"
    _setResolverForTesting("manual", createMockResolver("not-started"));

    // Create a goal with manual completion criteria
    const goal = createGoal({ title: "Manual task" });
    const plan = createPlan({
      title: "Manual Plan",
      goalId: goal.id,
      sourceType: "manual",
    });

    const externalRef: ExternalRef = {
      type: "manual",
      criteria: "Complete code review",
    };

    const step = createPlanStep({
      planId: plan.id,
      title: "Manual step",
      ordinal: 1,
      wave: 1,
      externalRef,
    });

    // Update goal to link to plan step
    const db = await import("../db/sqlite").then((m) => m.getDatabase());
    const goalData = JSON.parse(
      db
        .query<
          { data: string },
          [string]
        >(`SELECT data FROM planning_entities WHERE id = ?`)
        .get(goal.id)!.data,
    ) as Record<string, unknown>;
    goalData.planStepId = step.id;

    db.run(
      `UPDATE planning_entities SET data = ? WHERE id = ?`,
      JSON.stringify(goalData),
      goal.id,
    );

    const staleItems = await detectStaleItems();

    // Manual resolver returned "not-started", so shouldn't be stale
    const staleGoal = staleItems.find((s) => s.item.id === goal.id);
    expect(staleGoal).toBeUndefined();

    // Clean up
    deleteEntity(goal.id);
  });

  test("handles badge external ref types", async () => {
    // Mock the badge resolver to return "not-started"
    _setResolverForTesting("badge", createMockResolver("not-started"));

    // Create a goal with badge learning criteria
    const goal = createGoal({ title: "Earn badge" });
    const plan = createPlan({
      title: "Badge Plan",
      goalId: goal.id,
      sourceType: "learning-path",
    });

    const externalRef: ExternalRef = {
      type: "badge",
      criteria: "Complete TypeScript course",
    };

    const step = createPlanStep({
      planId: plan.id,
      title: "Badge learning step",
      ordinal: 1,
      wave: 1,
      externalRef,
    });

    // Update goal to link to plan step
    const db = await import("../db/sqlite").then((m) => m.getDatabase());
    const goalData = JSON.parse(
      db
        .query<
          { data: string },
          [string]
        >(`SELECT data FROM planning_entities WHERE id = ?`)
        .get(goal.id)!.data,
    ) as Record<string, unknown>;
    goalData.planStepId = step.id;

    db.run(
      `UPDATE planning_entities SET data = ? WHERE id = ?`,
      JSON.stringify(goalData),
      goal.id,
    );

    const staleItems = await detectStaleItems();

    // Badge resolver returned "not-started", so shouldn't be stale
    const staleGoal = staleItems.find((s) => s.item.id === goal.id);
    expect(staleGoal).toBeUndefined();

    // Clean up
    deleteEntity(goal.id);
  });

  test("resolver is called for each detectStaleItems invocation", async () => {
    // Note: Plan step resolution does NOT cache - each call resolves fresh.
    // Only the legacy `checkIssueClosed` path caches (for goals with issueNumber).
    // This test verifies resolver is called each time for plan-managed goals.
    const { resolver, calls } = createTrackingMockResolver("not-started");
    _setResolverForTesting("issue", resolver);

    // Create a goal with a plan step
    const goal = createGoal({ title: "Tracked goal" });
    const plan = createPlan({
      title: "Tracking Plan",
      goalId: goal.id,
      sourceType: "milestone",
    });

    const externalRef: ExternalRef = {
      type: "issue",
      number: 456,
    };

    const step = createPlanStep({
      planId: plan.id,
      title: "Tracked step",
      ordinal: 1,
      wave: 1,
      externalRef,
    });

    // Update goal to link to plan step
    const db = await import("../db/sqlite").then((m) => m.getDatabase());
    const goalData = JSON.parse(
      db
        .query<
          { data: string },
          [string]
        >(`SELECT data FROM planning_entities WHERE id = ?`)
        .get(goal.id)!.data,
    ) as Record<string, unknown>;
    goalData.planStepId = step.id;

    db.run(
      `UPDATE planning_entities SET data = ? WHERE id = ?`,
      JSON.stringify(goalData),
      goal.id,
    );

    // Call detectStaleItems twice
    await detectStaleItems();
    await detectStaleItems();

    // Verify resolver was called each time (no caching for plan steps)
    expect(calls.length).toBe(2);
    expect(calls[0].id).toBe(step.id);
    expect(calls[1].id).toBe(step.id);

    // Clean up
    deleteEntity(goal.id);
  });

  test("respects stale detection for old issues", async () => {
    // Mock resolver for any issue lookups
    _setResolverForTesting("issue", createMockResolver("not-started"));

    // This tests the existing issue-based stale detection
    // to ensure it still works alongside plan-managed detection
    const goal = createGoal({
      title: "Old issue",
      issueNumber: 123,
    });

    // The goal has issueNumber but no planStepId
    const stack = getStack();
    expect(stack.some((item) => item.id === goal.id)).toBe(true);

    // Call stale detection
    const staleItems = await detectStaleItems();

    // Without planStepId, falls back to issue-based detection
    // which checks via gh CLI (mocked to return not-started, so not stale)
    expect(Array.isArray(staleItems)).toBe(true);

    // Clean up
    deleteEntity(goal.id);
  });

  test("detects stale items with no plan or issue links", async () => {
    // Create a very old paused goal with no external links
    const goal = createGoal({
      title: "Ancient paused goal",
    });

    // Update goal to be paused and old
    const db = await import("../db/sqlite").then((m) => m.getDatabase());
    const eightDaysAgo = new Date(
      Date.now() - 8 * 24 * 60 * 60 * 1000,
    ).toISOString();

    db.run(
      `UPDATE planning_entities SET status = ?, updated_at = ? WHERE id = ?`,
      "paused",
      eightDaysAgo,
      goal.id,
    );

    const staleItems = await detectStaleItems();

    // Should detect as stale due to age
    const staleGoal = staleItems.find((s) => s.item.id === goal.id);
    expect(staleGoal).toBeDefined();
    expect(staleGoal?.reason).toContain("No activity");

    // Clean up
    deleteEntity(goal.id);
  });

  test("detects in-progress issue as not stale", async () => {
    // Mock the issue resolver to return "in-progress"
    _setResolverForTesting("issue", createMockResolver("in-progress"));

    const goal = createGoal({ title: "In progress work" });
    const plan = createPlan({
      title: "In Progress Plan",
      goalId: goal.id,
      sourceType: "milestone",
    });

    const step = createPlanStep({
      planId: plan.id,
      title: "Active work",
      ordinal: 1,
      wave: 1,
      externalRef: { type: "issue", number: 789 },
    });

    const db = await import("../db/sqlite").then((m) => m.getDatabase());
    const goalData = JSON.parse(
      db
        .query<
          { data: string },
          [string]
        >(`SELECT data FROM planning_entities WHERE id = ?`)
        .get(goal.id)!.data,
    ) as Record<string, unknown>;
    goalData.planStepId = step.id;

    db.run(
      `UPDATE planning_entities SET data = ? WHERE id = ?`,
      JSON.stringify(goalData),
      goal.id,
    );

    const staleItems = await detectStaleItems();

    // In-progress items should not be stale
    const staleGoal = staleItems.find((s) => s.item.id === goal.id);
    expect(staleGoal).toBeUndefined();

    deleteEntity(goal.id);
  });
});
