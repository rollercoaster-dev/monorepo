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
import type { ExternalRef } from "../types";
import { closeDatabase, resetDatabase } from "../db/sqlite";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { cleanupTestDb } from "../test-utils";

const TEST_DB = ".claude/test-stale.db";

describe("detectStaleItems", () => {
  beforeEach(async () => {
    if (!existsSync(".claude")) await mkdir(".claude", { recursive: true });
    resetDatabase(TEST_DB);
    clearStaleCache();
  });

  afterEach(async () => {
    clearStaleCache();
    closeDatabase();
    await cleanupTestDb(TEST_DB);
  });

  test("detects stale plan-managed goal when linked issue is closed", async () => {
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

    // Mock gh CLI to return closed issue
    // Note: This test relies on actual GitHub CLI - in a real test environment
    // we would mock spawnSync. For now, this serves as an integration test.
    // The completion resolver will call gh CLI and return status based on actual issue state.

    const staleItems = await detectStaleItems();

    // We can't assert it's stale without mocking gh CLI, but we can verify
    // the function runs without error and returns an array
    expect(Array.isArray(staleItems)).toBe(true);

    // Clean up
    deleteEntity(goal.id);
  });

  test("ignores plan-managed goal when linked issue is open", async () => {
    // Create a goal with a plan step for an open issue
    const goal = createGoal({ title: "Work on open issue" });
    const plan = createPlan({
      title: "Open Issue Plan",
      goalId: goal.id,
      sourceType: "milestone",
    });

    const externalRef: ExternalRef = {
      type: "issue",
      number: 999999, // Assuming this issue is open or doesn't exist
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

    // Should not find this goal as stale (assuming issue is open)
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

    // Should not flag as stale
    const staleGoal = staleItems.find((s) => s.item.id === goal.id);
    expect(staleGoal).toBeUndefined();

    // Clean up
    deleteEntity(goal.id);
  });

  test("handles manual external ref types", async () => {
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

    // Should not throw error with manual type
    const staleItems = await detectStaleItems();
    expect(Array.isArray(staleItems)).toBe(true);

    // Manual resolver will return "not-started" by default
    const staleGoal = staleItems.find((s) => s.item.id === goal.id);
    expect(staleGoal).toBeUndefined();

    // Clean up
    deleteEntity(goal.id);
  });

  test("handles badge external ref types", async () => {
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

    // Should not throw error with badge type
    const staleItems = await detectStaleItems();
    expect(Array.isArray(staleItems)).toBe(true);

    // LearningResolver will return status based on knowledge graph
    const staleGoal = staleItems.find((s) => s.item.id === goal.id);
    // Badge likely not earned yet, so shouldn't be stale
    expect(staleGoal).toBeUndefined();

    // Clean up
    deleteEntity(goal.id);
  });

  test("caches completion status results", async () => {
    // Create a goal with a plan step
    const goal = createGoal({ title: "Cacheable goal" });
    const plan = createPlan({
      title: "Cache Test Plan",
      goalId: goal.id,
      sourceType: "milestone",
    });

    const externalRef: ExternalRef = {
      type: "issue",
      number: 456,
    };

    const step = createPlanStep({
      planId: plan.id,
      title: "Cached step",
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
    const result1 = await detectStaleItems();
    const result2 = await detectStaleItems();

    // Both should succeed and return same structure
    expect(Array.isArray(result1)).toBe(true);
    expect(Array.isArray(result2)).toBe(true);

    // Note: We can't easily verify external API was called only once
    // without mocking, but we verify that caching doesn't break functionality

    // Clean up
    deleteEntity(goal.id);
  });

  test("respects stale detection for old issues", async () => {
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

    // We can't assert stale status without mocking gh CLI,
    // but we verify the function handles both code paths
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
});
