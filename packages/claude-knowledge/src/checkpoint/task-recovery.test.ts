/**
 * Tests for Task Recovery Module
 *
 * Tests the task recovery logic that recreates native tasks from
 * checkpoint workflow state when resuming a session.
 *
 * Related to #579
 */

import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { closeDatabase, resetDatabase, getDatabase } from "../db/sqlite";
import { checkpoint } from "./index";
import {
  recoverWorkOnIssueTasks,
  recoverAutoIssueTasks,
  recoverAutoMilestoneTasks,
  recoverTasksByIssue,
  recoverTasksByMilestone,
} from "./task-recovery";
import type { CheckpointData } from "../types";
import { unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";

const TEST_DB = ".claude/test-task-recovery.db";

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a test workflow with specified phase and status
 */
function createTestWorkflow(
  issueNumber: number,
  phase: string,
  status: string = "running",
): CheckpointData {
  const workflow = checkpoint.create(issueNumber, `feat/test-${issueNumber}`);

  // Update phase and status
  if (phase !== "research") {
    checkpoint.setPhase(
      workflow.id,
      phase as Parameters<typeof checkpoint.setPhase>[1],
    );
  }
  if (status !== "running") {
    checkpoint.setStatus(
      workflow.id,
      status as Parameters<typeof checkpoint.setStatus>[1],
    );
  }

  // Log gate actions based on phase for /work-on-issue workflows
  // Gate actions are used to determine which gate is currently active
  const isWorkOnIssue = issueNumber >= 100 && issueNumber < 200;
  if (isWorkOnIssue) {
    // Log completed gate actions based on current phase
    // research: no gates completed yet (Gate 1 in progress)
    // implement: gates 1-2 completed (Gate 3 in progress)
    // review: gates 1-3 completed (Gate 4 in progress)
    // finalize: gates 1-4 completed (Finalize in progress)
    if (phase === "implement" || phase === "review" || phase === "finalize") {
      checkpoint.logAction(workflow.id, "gate-1-issue-reviewed", "success");
      checkpoint.logAction(workflow.id, "gate-2-plan-approved", "success");
    }
    if (phase === "review" || phase === "finalize") {
      checkpoint.logAction(workflow.id, "gate-3-implemented", "success");
    }
    if (phase === "finalize") {
      checkpoint.logAction(workflow.id, "gate-4-review-passed", "success");
    }
  }

  return checkpoint.load(workflow.id)!;
}

/**
 * Clean up test data
 */
function _cleanupTestWorkflows(): void {
  const db = getDatabase();
  // Clean test workflows (issue numbers 100-999)
  db.run(
    `DELETE FROM workflows WHERE issue_number >= 100 AND issue_number < 1000`,
  );
  // Clean test milestones
  db.run(`DELETE FROM milestones WHERE name LIKE 'Test%'`);
}

// ============================================================================
// Test Setup
// ============================================================================

beforeEach(async () => {
  // Ensure .claude directory exists
  if (!existsSync(".claude")) {
    await mkdir(".claude", { recursive: true });
  }
  resetDatabase(TEST_DB);
});

afterEach(async () => {
  closeDatabase();
  try {
    await unlink(TEST_DB);
  } catch {
    // Ignore if file doesn't exist
  }
});

// ============================================================================
// /work-on-issue Recovery Tests
// ============================================================================

describe("recoverWorkOnIssueTasks", () => {
  test("recovers tasks in research phase (gate 1)", () => {
    const checkpointData = createTestWorkflow(100, "research");
    const plan = recoverWorkOnIssueTasks(checkpointData);

    expect(plan.workflowType).toBe("work-on-issue");
    expect(plan.issueNumber).toBe(100);
    expect(plan.tasks).toHaveLength(5);

    // Gate 1 should be in_progress
    expect(plan.tasks[0].status).toBe("in_progress");
    expect(plan.tasks[0].subject).toContain("Gate 1");

    // Gates 2-4 and Finalize should be pending
    expect(plan.tasks[1].status).toBe("pending");
    expect(plan.tasks[2].status).toBe("pending");
    expect(plan.tasks[3].status).toBe("pending");
    expect(plan.tasks[4].status).toBe("pending");
  });

  test("recovers tasks in implement phase (gate 3)", () => {
    const checkpointData = createTestWorkflow(101, "implement");
    const plan = recoverWorkOnIssueTasks(checkpointData);

    // Gates 1-2 should be completed
    expect(plan.tasks[0].status).toBe("completed");
    expect(plan.tasks[1].status).toBe("completed");

    // Gate 3 should be in_progress
    expect(plan.tasks[2].status).toBe("in_progress");
    expect(plan.tasks[2].subject).toContain("Gate 3");

    // Gate 4 and Finalize should be pending
    expect(plan.tasks[3].status).toBe("pending");
    expect(plan.tasks[4].status).toBe("pending");
  });

  test("recovers tasks in review phase (gate 4)", () => {
    const checkpointData = createTestWorkflow(102, "review");
    const plan = recoverWorkOnIssueTasks(checkpointData);

    // Gates 1-3 should be completed
    expect(plan.tasks[0].status).toBe("completed");
    expect(plan.tasks[1].status).toBe("completed");
    expect(plan.tasks[2].status).toBe("completed");

    // Gate 4 should be in_progress
    expect(plan.tasks[3].status).toBe("in_progress");
    expect(plan.tasks[3].subject).toContain("Gate 4");

    // Finalize should be pending
    expect(plan.tasks[4].status).toBe("pending");
  });

  test("recovers tasks in finalize phase", () => {
    const checkpointData = createTestWorkflow(103, "finalize");
    const plan = recoverWorkOnIssueTasks(checkpointData);

    // All gates should be completed
    expect(plan.tasks[0].status).toBe("completed");
    expect(plan.tasks[1].status).toBe("completed");
    expect(plan.tasks[2].status).toBe("completed");
    expect(plan.tasks[3].status).toBe("completed");

    // Finalize should be in_progress
    expect(plan.tasks[4].status).toBe("in_progress");
    expect(plan.tasks[4].subject).toContain("Finalize");
  });

  test("recovers completed workflow with all tasks completed", () => {
    const checkpointData = createTestWorkflow(104, "finalize", "completed");
    const plan = recoverWorkOnIssueTasks(checkpointData);

    // All tasks should be completed
    for (const task of plan.tasks) {
      expect(task.status).toBe("completed");
    }
  });

  test("sets correct blockedBy relationships", () => {
    const checkpointData = createTestWorkflow(105, "research");
    const plan = recoverWorkOnIssueTasks(checkpointData);

    // Task 0 (Gate 1) has no blockers
    expect(plan.tasks[0].blockedByIndices).toEqual([]);

    // Each subsequent task is blocked by the previous one
    expect(plan.tasks[1].blockedByIndices).toEqual([0]);
    expect(plan.tasks[2].blockedByIndices).toEqual([1]);
    expect(plan.tasks[3].blockedByIndices).toEqual([2]);
    expect(plan.tasks[4].blockedByIndices).toEqual([3]);
  });

  test("includes correct metadata in tasks", () => {
    const checkpointData = createTestWorkflow(106, "implement");
    const plan = recoverWorkOnIssueTasks(checkpointData);

    // Check metadata on Gate 3
    const gate3 = plan.tasks[2];
    expect(gate3.metadata.issueNumber).toBe(106);
    expect(gate3.metadata.workflowId).toBe(checkpointData.workflow.id);
    expect(gate3.metadata.phase).toBe("implement");
    expect(gate3.metadata.gate).toBe(3);
  });

  test("generates meaningful summary", () => {
    const checkpointData = createTestWorkflow(107, "review");
    const plan = recoverWorkOnIssueTasks(checkpointData);

    expect(plan.summary).toContain("/work-on-issue #107");
    expect(plan.summary).toContain("3/5 gates completed");
    expect(plan.summary).toContain("Gate 4");
  });
});

// ============================================================================
// /auto-issue Recovery Tests
// ============================================================================

describe("recoverAutoIssueTasks", () => {
  test("recovers tasks in research phase", () => {
    // Use issue number outside /work-on-issue range for auto-detection
    const workflow = checkpoint.create(201, "feat/test-201");
    checkpoint.load(workflow.id)!;
    const checkpointData = checkpoint.load(workflow.id)!;

    const plan = recoverAutoIssueTasks(checkpointData);

    expect(plan.workflowType).toBe("auto-issue");
    expect(plan.tasks).toHaveLength(5);

    // Setup (index 0) should be completed (always done once we have checkpoint)
    expect(plan.tasks[0].status).toBe("completed");
    expect(plan.tasks[0].subject).toContain("Setup");

    // Research (index 1) should be in_progress
    expect(plan.tasks[1].status).toBe("in_progress");
    expect(plan.tasks[1].subject).toContain("Research");

    // Remaining phases should be pending
    expect(plan.tasks[2].status).toBe("pending");
    expect(plan.tasks[3].status).toBe("pending");
    expect(plan.tasks[4].status).toBe("pending");
  });

  test("recovers tasks in implement phase", () => {
    const workflow = checkpoint.create(202, "feat/test-202");
    checkpoint.setPhase(workflow.id, "implement");
    const checkpointData = checkpoint.load(workflow.id)!;

    const plan = recoverAutoIssueTasks(checkpointData);

    // Setup and Research should be completed
    expect(plan.tasks[0].status).toBe("completed");
    expect(plan.tasks[1].status).toBe("completed");

    // Implement should be in_progress
    expect(plan.tasks[2].status).toBe("in_progress");

    // Review and Finalize should be pending
    expect(plan.tasks[3].status).toBe("pending");
    expect(plan.tasks[4].status).toBe("pending");
  });

  test("sets sequential blockedBy relationships", () => {
    const workflow = checkpoint.create(203, "feat/test-203");
    const checkpointData = checkpoint.load(workflow.id)!;

    const plan = recoverAutoIssueTasks(checkpointData);

    // Each task is blocked by the previous
    expect(plan.tasks[0].blockedByIndices).toEqual([]);
    expect(plan.tasks[1].blockedByIndices).toEqual([0]);
    expect(plan.tasks[2].blockedByIndices).toEqual([1]);
    expect(plan.tasks[3].blockedByIndices).toEqual([2]);
    expect(plan.tasks[4].blockedByIndices).toEqual([3]);
  });
});

// ============================================================================
// /auto-milestone Recovery Tests
// ============================================================================

describe("recoverAutoMilestoneTasks", () => {
  test("recovers milestone with single wave", () => {
    // Create milestone
    const ms = checkpoint.createMilestone("Test Milestone Single");

    // Create workflows for issues
    const wf1 = checkpoint.create(301, "feat/test-301");
    const wf2 = checkpoint.create(302, "feat/test-302");

    // Link to milestone (all in wave 1)
    checkpoint.linkWorkflowToMilestone(wf1.id, ms.id, 1);
    checkpoint.linkWorkflowToMilestone(wf2.id, ms.id, 1);

    // Complete one workflow
    checkpoint.setStatus(wf1.id, "completed");

    const milestoneData = checkpoint.getMilestone(ms.id)!;
    const plan = recoverAutoMilestoneTasks(milestoneData);

    expect(plan.workflowType).toBe("auto-milestone");
    expect(plan.milestoneName).toBe("Test Milestone Single");
    expect(plan.tasks).toHaveLength(2);

    // First workflow is completed
    const task1 = plan.tasks.find((t) => t.metadata.issueNumber === 301);
    expect(task1?.status).toBe("completed");

    // Second workflow is running (default)
    const task2 = plan.tasks.find((t) => t.metadata.issueNumber === 302);
    expect(task2?.status).toBe("in_progress");

    // Wave 1 tasks have no blockers
    expect(plan.tasks[0].blockedByIndices).toEqual([]);
    expect(plan.tasks[1].blockedByIndices).toEqual([]);
  });

  test("recovers milestone with multiple waves", () => {
    const ms = checkpoint.createMilestone("Test Milestone Multi");

    // Create workflows for issues
    const wf1 = checkpoint.create(311, "feat/test-311");
    const wf2 = checkpoint.create(312, "feat/test-312");
    const wf3 = checkpoint.create(313, "feat/test-313");

    // Link to milestone with different waves
    checkpoint.linkWorkflowToMilestone(wf1.id, ms.id, 1);
    checkpoint.linkWorkflowToMilestone(wf2.id, ms.id, 1);
    checkpoint.linkWorkflowToMilestone(wf3.id, ms.id, 2);

    const milestoneData = checkpoint.getMilestone(ms.id)!;
    const plan = recoverAutoMilestoneTasks(milestoneData);

    expect(plan.tasks).toHaveLength(3);

    // Find wave 2 task
    const wave2Task = plan.tasks.find((t) => t.metadata.waveNumber === 2);
    expect(wave2Task).toBeDefined();

    // Wave 2 should be blocked by wave 1 tasks
    expect(wave2Task!.blockedByIndices.length).toBeGreaterThan(0);

    // Wave 1 tasks should have indices 0 and 1
    const wave1Indices = plan.tasks
      .filter((t) => t.metadata.waveNumber === 1)
      .map((_, i) => i);
    expect(wave2Task!.blockedByIndices).toEqual(
      expect.arrayContaining(wave1Indices),
    );
  });
});

// ============================================================================
// Public API Tests
// ============================================================================

describe("recoverTasksByIssue", () => {
  test("returns null for non-existent workflow", () => {
    const plan = recoverTasksByIssue(999);
    expect(plan).toBeNull();
  });

  test("auto-detects work-on-issue workflow", () => {
    const workflow = checkpoint.create(401, "feat/test-401");
    // Log gate-style action to trigger work-on-issue detection
    checkpoint.logAction(workflow.id, "gate-1-issue-reviewed", "success");

    const plan = recoverTasksByIssue(401);
    expect(plan).not.toBeNull();
    expect(plan!.workflowType).toBe("work-on-issue");
  });

  test("auto-detects auto-issue workflow", () => {
    const workflow = checkpoint.create(402, "feat/test-402");
    // Log phase-style action (no gate markers)
    checkpoint.logAction(workflow.id, "phase_transition", "success");

    const plan = recoverTasksByIssue(402);
    expect(plan).not.toBeNull();
    expect(plan!.workflowType).toBe("auto-issue");
  });

  test("respects explicit workflowType parameter", () => {
    checkpoint.create(403, "feat/test-403");

    const planWOI = recoverTasksByIssue(403, "work-on-issue");
    expect(planWOI!.workflowType).toBe("work-on-issue");

    const planAI = recoverTasksByIssue(403, "auto-issue");
    expect(planAI!.workflowType).toBe("auto-issue");
  });
});

describe("recoverTasksByMilestone", () => {
  test("returns null for non-existent milestone", () => {
    const plan = recoverTasksByMilestone("Non-Existent Milestone");
    expect(plan).toBeNull();
  });

  test("recovers milestone by name", () => {
    const ms = checkpoint.createMilestone("Test Recovery Milestone");
    const wf = checkpoint.create(501, "feat/test-501");
    checkpoint.linkWorkflowToMilestone(wf.id, ms.id, 1);

    const plan = recoverTasksByMilestone("Test Recovery Milestone");
    expect(plan).not.toBeNull();
    expect(plan!.workflowType).toBe("auto-milestone");
    expect(plan!.milestoneName).toBe("Test Recovery Milestone");
    expect(plan!.tasks).toHaveLength(1);
  });
});
