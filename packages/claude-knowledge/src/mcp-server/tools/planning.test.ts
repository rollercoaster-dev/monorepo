import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { closeDatabase, resetDatabase } from "../../db/sqlite";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { cleanupTestDb } from "../../test-utils";
import { handlePlanningToolCall } from "./planning";
import { createGoal } from "../../planning/store";

const TEST_DB = ".claude/test-planning-tools.db";

describe("Plan CRUD MCP tools", () => {
  beforeEach(async () => {
    if (!existsSync(".claude")) await mkdir(".claude", { recursive: true });
    resetDatabase(TEST_DB);
  });

  afterEach(async () => {
    closeDatabase();
    await cleanupTestDb(TEST_DB);
  });

  describe("planning_plan_create", () => {
    test("creates plan linked to valid goal", async () => {
      const goal = createGoal({ title: "Test Goal" });

      const response = await handlePlanningToolCall("planning_plan_create", {
        title: "Test Plan",
        goalId: goal.id,
        sourceType: "milestone",
        sourceRef: "1",
      });

      expect(response.isError).toBeUndefined();
      const result = JSON.parse(response.content[0].text);
      expect(result.success).toBe(true);
      expect(result.plan.title).toBe("Test Plan");
      expect(result.plan.goalId).toBe(goal.id);
      expect(result.plan.sourceType).toBe("milestone");
      expect(result.plan.sourceRef).toBe("1");
    });

    test("rejects invalid goalId", async () => {
      const response = await handlePlanningToolCall("planning_plan_create", {
        title: "Test Plan",
        goalId: "invalid-goal-id",
        sourceType: "milestone",
      });

      expect(response.isError).toBe(true);
      const result = JSON.parse(response.content[0].text);
      expect(result.error).toContain("not found");
    });

    test("rejects missing title", async () => {
      const goal = createGoal({ title: "Test Goal" });

      const response = await handlePlanningToolCall("planning_plan_create", {
        title: "",
        goalId: goal.id,
        sourceType: "milestone",
      });

      expect(response.isError).toBe(true);
      const result = JSON.parse(response.content[0].text);
      expect(result.error).toContain("title is required");
    });

    test("prevents duplicate plans per goal", async () => {
      const goal = createGoal({ title: "Test Goal" });

      await handlePlanningToolCall("planning_plan_create", {
        title: "First Plan",
        goalId: goal.id,
        sourceType: "milestone",
      });

      const response = await handlePlanningToolCall("planning_plan_create", {
        title: "Second Plan",
        goalId: goal.id,
        sourceType: "milestone",
      });

      expect(response.isError).toBe(true);
      const result = JSON.parse(response.content[0].text);
      expect(result.error).toContain("already has a plan");
    });
  });

  describe("planning_plan_add_steps", () => {
    test("adds multiple steps with waves and ordinals", async () => {
      const goal = createGoal({ title: "Test Goal" });
      const planResponse = await handlePlanningToolCall(
        "planning_plan_create",
        {
          title: "Test Plan",
          goalId: goal.id,
          sourceType: "milestone",
        },
      );
      const plan = JSON.parse(planResponse.content[0].text).plan;

      const response = await handlePlanningToolCall("planning_plan_add_steps", {
        planId: plan.id,
        steps: [
          {
            title: "Step 1",
            ordinal: 0,
            wave: 0,
            externalRef: { type: "issue", number: 123 },
          },
          {
            title: "Step 2",
            ordinal: 1,
            wave: 0,
            externalRef: { type: "issue", number: 124 },
          },
        ],
      });

      expect(response.isError).toBeUndefined();
      const result = JSON.parse(response.content[0].text);
      expect(result.success).toBe(true);
      expect(result.steps.length).toBe(2);
      expect(result.steps[0].title).toBe("Step 1");
      expect(result.steps[1].title).toBe("Step 2");
    });

    test("adds steps with dependencies", async () => {
      const goal = createGoal({ title: "Test Goal" });
      const planResponse = await handlePlanningToolCall(
        "planning_plan_create",
        {
          title: "Test Plan",
          goalId: goal.id,
          sourceType: "milestone",
        },
      );
      const plan = JSON.parse(planResponse.content[0].text).plan;

      const response = await handlePlanningToolCall("planning_plan_add_steps", {
        planId: plan.id,
        steps: [
          {
            title: "Step 1",
            ordinal: 0,
            wave: 0,
            externalRef: { type: "issue", number: 123 },
          },
          {
            title: "Step 2",
            ordinal: 1,
            wave: 1,
            externalRef: { type: "issue", number: 124 },
            dependsOn: [0],
          },
        ],
      });

      expect(response.isError).toBeUndefined();
      const result = JSON.parse(response.content[0].text);
      expect(result.success).toBe(true);

      // Verify dependencies by querying the plan
      const getResponse = await handlePlanningToolCall("planning_plan_get", {
        goalId: goal.id,
      });
      const planData = JSON.parse(getResponse.content[0].text);
      const step2 = planData.steps.find((s: any) => s.ordinal === 1);
      expect(step2.dependsOn).toHaveLength(1);
    });

    test("rejects invalid planId", async () => {
      const response = await handlePlanningToolCall("planning_plan_add_steps", {
        planId: "invalid-plan-id",
        steps: [
          {
            title: "Step 1",
            ordinal: 0,
            wave: 0,
            externalRef: { type: "issue", number: 123 },
          },
        ],
      });

      expect(response.isError).toBe(true);
      const result = JSON.parse(response.content[0].text);
      expect(result.error).toContain("not found");
    });

    test("rejects invalid externalRef type", async () => {
      const goal = createGoal({ title: "Test Goal" });
      const planResponse = await handlePlanningToolCall(
        "planning_plan_create",
        {
          title: "Test Plan",
          goalId: goal.id,
          sourceType: "milestone",
        },
      );
      const plan = JSON.parse(planResponse.content[0].text).plan;

      const response = await handlePlanningToolCall("planning_plan_add_steps", {
        planId: plan.id,
        steps: [
          {
            title: "Step 1",
            ordinal: 0,
            wave: 0,
            externalRef: { type: "invalid-type" },
          },
        ],
      });

      expect(response.isError).toBe(true);
      const result = JSON.parse(response.content[0].text);
      expect(result.error).toContain("Invalid externalRef.type");
    });

    test("rejects dependency on non-existent step", async () => {
      const goal = createGoal({ title: "Test Goal" });
      const planResponse = await handlePlanningToolCall(
        "planning_plan_create",
        {
          title: "Test Plan",
          goalId: goal.id,
          sourceType: "milestone",
        },
      );
      const plan = JSON.parse(planResponse.content[0].text).plan;

      const response = await handlePlanningToolCall("planning_plan_add_steps", {
        planId: plan.id,
        steps: [
          {
            title: "Step 1",
            ordinal: 1,
            wave: 1,
            externalRef: { type: "issue", number: 124 },
            dependsOn: [0], // Step with ordinal 0 doesn't exist
          },
        ],
      });

      expect(response.isError).toBe(true);
      const result = JSON.parse(response.content[0].text);
      expect(result.error).toContain("not in the batch");
    });
  });

  describe("planning_plan_get", () => {
    test("returns plan with all steps", async () => {
      const goal = createGoal({ title: "Test Goal" });
      const planResponse = await handlePlanningToolCall(
        "planning_plan_create",
        {
          title: "Test Plan",
          goalId: goal.id,
          sourceType: "milestone",
        },
      );
      const plan = JSON.parse(planResponse.content[0].text).plan;

      await handlePlanningToolCall("planning_plan_add_steps", {
        planId: plan.id,
        steps: [
          {
            title: "Step 1",
            ordinal: 0,
            wave: 0,
            externalRef: { type: "issue", number: 123 },
          },
          {
            title: "Step 2",
            ordinal: 1,
            wave: 0,
            externalRef: { type: "issue", number: 124 },
          },
        ],
      });

      const response = await handlePlanningToolCall("planning_plan_get", {
        goalId: goal.id,
      });

      expect(response.isError).toBeUndefined();
      const result = JSON.parse(response.content[0].text);
      expect(result.plan.id).toBe(plan.id);
      expect(result.steps.length).toBe(2);
      expect(result.steps[0].title).toBe("Step 1");
      expect(result.steps[1].title).toBe("Step 2");
    });

    test("returns error for non-existent goalId", async () => {
      const response = await handlePlanningToolCall("planning_plan_get", {
        goalId: "non-existent-goal",
      });

      expect(response.isError).toBe(true);
      const result = JSON.parse(response.content[0].text);
      expect(result.error).toContain("not found");
    });

    test("returns plan with dependencies correctly populated", async () => {
      const goal = createGoal({ title: "Test Goal" });
      const planResponse = await handlePlanningToolCall(
        "planning_plan_create",
        {
          title: "Test Plan",
          goalId: goal.id,
          sourceType: "milestone",
        },
      );
      const plan = JSON.parse(planResponse.content[0].text).plan;

      await handlePlanningToolCall("planning_plan_add_steps", {
        planId: plan.id,
        steps: [
          {
            title: "Step 1",
            ordinal: 0,
            wave: 0,
            externalRef: { type: "issue", number: 123 },
          },
          {
            title: "Step 2",
            ordinal: 1,
            wave: 1,
            externalRef: { type: "issue", number: 124 },
            dependsOn: [0],
          },
        ],
      });

      const response = await handlePlanningToolCall("planning_plan_get", {
        goalId: goal.id,
      });

      const result = JSON.parse(response.content[0].text);
      const step2 = result.steps.find((s: any) => s.ordinal === 1);
      expect(step2.dependsOn).toHaveLength(1);
    });
  });

  describe("planning_plan_list_steps", () => {
    test("returns all steps for planId", async () => {
      const goal = createGoal({ title: "Test Goal" });
      const planResponse = await handlePlanningToolCall(
        "planning_plan_create",
        {
          title: "Test Plan",
          goalId: goal.id,
          sourceType: "milestone",
        },
      );
      const plan = JSON.parse(planResponse.content[0].text).plan;

      await handlePlanningToolCall("planning_plan_add_steps", {
        planId: plan.id,
        steps: [
          {
            title: "Step 1",
            ordinal: 0,
            wave: 0,
            externalRef: { type: "issue", number: 123 },
          },
          {
            title: "Step 2",
            ordinal: 1,
            wave: 1,
            externalRef: { type: "issue", number: 124 },
          },
        ],
      });

      const response = await handlePlanningToolCall(
        "planning_plan_list_steps",
        {
          planId: plan.id,
        },
      );

      expect(response.isError).toBeUndefined();
      const result = JSON.parse(response.content[0].text);
      expect(result.steps.length).toBe(2);
      expect(result.totalSteps).toBe(2);
    });

    test("filters by wave number correctly", async () => {
      const goal = createGoal({ title: "Test Goal" });
      const planResponse = await handlePlanningToolCall(
        "planning_plan_create",
        {
          title: "Test Plan",
          goalId: goal.id,
          sourceType: "milestone",
        },
      );
      const plan = JSON.parse(planResponse.content[0].text).plan;

      await handlePlanningToolCall("planning_plan_add_steps", {
        planId: plan.id,
        steps: [
          {
            title: "Step 1",
            ordinal: 0,
            wave: 0,
            externalRef: { type: "issue", number: 123 },
          },
          {
            title: "Step 2",
            ordinal: 1,
            wave: 1,
            externalRef: { type: "issue", number: 124 },
          },
          {
            title: "Step 3",
            ordinal: 2,
            wave: 1,
            externalRef: { type: "issue", number: 125 },
          },
        ],
      });

      const response = await handlePlanningToolCall(
        "planning_plan_list_steps",
        {
          planId: plan.id,
          wave: 1,
        },
      );

      expect(response.isError).toBeUndefined();
      const result = JSON.parse(response.content[0].text);
      expect(result.steps.length).toBe(2);
      expect(result.steps[0].wave).toBe(1);
      expect(result.steps[1].wave).toBe(1);
    });

    test("returns error for non-existent planId", async () => {
      const response = await handlePlanningToolCall(
        "planning_plan_list_steps",
        {
          planId: "non-existent-plan",
        },
      );

      expect(response.isError).toBe(true);
      const result = JSON.parse(response.content[0].text);
      expect(result.error).toContain("not found");
    });

    test("rejects invalid wave number", async () => {
      const goal = createGoal({ title: "Test Goal" });
      const planResponse = await handlePlanningToolCall(
        "planning_plan_create",
        {
          title: "Test Plan",
          goalId: goal.id,
          sourceType: "milestone",
        },
      );
      const plan = JSON.parse(planResponse.content[0].text).plan;

      const response = await handlePlanningToolCall(
        "planning_plan_list_steps",
        {
          planId: plan.id,
          wave: -1,
        },
      );

      expect(response.isError).toBe(true);
      const result = JSON.parse(response.content[0].text);
      expect(result.error).toContain("non-negative integer");
    });
  });
});
