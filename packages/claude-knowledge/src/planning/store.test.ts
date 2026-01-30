import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { closeDatabase, resetDatabase } from "../db/sqlite";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { cleanupTestDb } from "../test-utils";
import {
  createGoal,
  createInterrupt,
  getStackTop,
  getStack,
  getStackDepth,
  popStack,
  getEntity,
  deleteEntity,
  getCompleted,
  getRelationships,
  getAllEntities,
  createPlan,
  getPlan,
  getPlanByGoal,
  deletePlan,
  getAllPlans,
  createPlanStep,
  getPlanStep,
  getStepsByPlan,
  deletePlanStep,
  addStepDependency,
  getStepDependencies,
} from "./store";

const TEST_DB = ".claude/test-planning-store.db";

describe("planning store", () => {
  beforeEach(async () => {
    if (!existsSync(".claude")) await mkdir(".claude", { recursive: true });
    resetDatabase(TEST_DB);
  });

  afterEach(async () => {
    closeDatabase();
    await cleanupTestDb(TEST_DB);
  });

  describe("createGoal()", () => {
    test("creates a goal entity at stack top", () => {
      const goal = createGoal({ title: "Ship badge generator" });

      expect(goal.type).toBe("Goal");
      expect(goal.title).toBe("Ship badge generator");
      expect(goal.stackOrder).toBe(0);
      expect(goal.status).toBe("active");
      expect(goal.id).toStartWith("goal-");
    });

    test("stores optional fields", () => {
      const goal = createGoal({
        title: "Ship badge generator",
        description: "Build the OB3 generator",
        issueNumber: 294,
        metadata: { priority: "high" },
      });

      expect(goal.description).toBe("Build the OB3 generator");
      expect(goal.issueNumber).toBe(294);
      expect(goal.metadata).toEqual({ priority: "high" });
    });

    test("pauses previous top item when pushing", () => {
      createGoal({ title: "Goal A" });
      createGoal({ title: "Goal B" });

      const stack = getStack();
      expect(stack).toHaveLength(2);
      expect(stack[0].title).toBe("Goal B");
      expect(stack[0].status).toBe("active");
      expect(stack[1].title).toBe("Goal A");
      expect(stack[1].status).toBe("paused");
    });
  });

  describe("createInterrupt()", () => {
    test("creates an interrupt at stack top", () => {
      const { interrupt } = createInterrupt({
        title: "Fix CI",
        reason: "Tests breaking",
      });

      expect(interrupt.type).toBe("Interrupt");
      expect(interrupt.title).toBe("Fix CI");
      expect(interrupt.reason).toBe("Tests breaking");
      expect(interrupt.stackOrder).toBe(0);
      expect(interrupt.status).toBe("active");
    });

    test("links to interrupted item", () => {
      const goal = createGoal({ title: "Main work" });
      const { interrupt, interruptedItem } = createInterrupt({
        title: "Bug fix",
        reason: "Urgent bug",
      });

      expect(interruptedItem?.id).toBe(goal.id);
      expect(interrupt.interruptedId).toBe(goal.id);

      // Check INTERRUPTED_BY relationship was created
      const rels = getRelationships(goal.id);
      expect(rels).toHaveLength(1);
      expect(rels[0].type).toBe("INTERRUPTED_BY");
      expect(rels[0].fromId).toBe(goal.id);
      expect(rels[0].toId).toBe(interrupt.id);
    });

    test("returns null interruptedItem when stack is empty", () => {
      const { interruptedItem } = createInterrupt({
        title: "Fix CI",
        reason: "Tests breaking",
      });

      expect(interruptedItem).toBeUndefined();
    });
  });

  describe("getStackTop()", () => {
    test("returns null for empty stack", () => {
      expect(getStackTop()).toBeNull();
    });

    test("returns the active top item", () => {
      createGoal({ title: "Goal A" });
      createGoal({ title: "Goal B" });

      const top = getStackTop();
      expect(top?.title).toBe("Goal B");
      expect(top?.status).toBe("active");
    });
  });

  describe("getStack()", () => {
    test("returns empty array for empty stack", () => {
      expect(getStack()).toEqual([]);
    });

    test("returns items in stack order", () => {
      createGoal({ title: "Goal A" });
      createGoal({ title: "Goal B" });
      createInterrupt({ title: "Bug fix", reason: "Urgent" });

      const stack = getStack();
      expect(stack).toHaveLength(3);
      expect(stack[0].title).toBe("Bug fix");
      expect(stack[1].title).toBe("Goal B");
      expect(stack[2].title).toBe("Goal A");
    });
  });

  describe("getStackDepth()", () => {
    test("returns 0 for empty stack", () => {
      expect(getStackDepth()).toBe(0);
    });

    test("counts active and paused items", () => {
      createGoal({ title: "Goal A" });
      createGoal({ title: "Goal B" });
      expect(getStackDepth()).toBe(2);
    });
  });

  describe("popStack()", () => {
    test("returns null for empty stack", () => {
      expect(popStack()).toBeNull();
    });

    test("pops the top item and marks it completed", () => {
      createGoal({ title: "Goal A" });
      createGoal({ title: "Goal B" });

      const popped = popStack();
      expect(popped?.title).toBe("Goal B");
      expect(popped?.status).toBe("completed");

      // Goal A should now be top and active
      const top = getStackTop();
      expect(top?.title).toBe("Goal A");
      expect(top?.status).toBe("active");
    });

    test("reduces stack depth", () => {
      createGoal({ title: "Goal A" });
      createGoal({ title: "Goal B" });
      expect(getStackDepth()).toBe(2);

      popStack();
      expect(getStackDepth()).toBe(1);
    });

    test("handles popping last item", () => {
      createGoal({ title: "Solo goal" });
      const popped = popStack();

      expect(popped?.title).toBe("Solo goal");
      expect(getStackDepth()).toBe(0);
      expect(getStackTop()).toBeNull();
    });
  });

  describe("getEntity()", () => {
    test("retrieves entity by ID", () => {
      const goal = createGoal({ title: "Test goal" });
      const found = getEntity(goal.id);
      expect(found?.title).toBe("Test goal");
    });

    test("returns null for unknown ID", () => {
      expect(getEntity("nonexistent")).toBeNull();
    });
  });

  describe("deleteEntity()", () => {
    test("removes entity and its relationships", () => {
      const goal = createGoal({ title: "Goal" });
      createInterrupt({ title: "Interrupt", reason: "Bug" });

      deleteEntity(goal.id);

      expect(getEntity(goal.id)).toBeNull();
      // Relationships should also be gone
      expect(getRelationships(goal.id)).toEqual([]);
    });
  });

  describe("getCompleted()", () => {
    test("returns completed items", () => {
      createGoal({ title: "Goal A" });
      createGoal({ title: "Goal B" });
      popStack(); // Completes Goal B

      const completed = getCompleted();
      expect(completed).toHaveLength(1);
      expect(completed[0].title).toBe("Goal B");
    });
  });

  describe("getAllEntities()", () => {
    test("returns all entities regardless of status", () => {
      createGoal({ title: "Goal A" });
      createGoal({ title: "Goal B" });
      popStack(); // Completes Goal B

      const all = getAllEntities();
      expect(all).toHaveLength(2);
    });
  });

  describe("Plan CRUD", () => {
    describe("createPlan()", () => {
      test("creates a plan linked to a goal", () => {
        const goal = createGoal({ title: "Ship OB3" });
        const plan = createPlan({
          title: "OB3 Milestone Plan",
          goalId: goal.id,
          sourceType: "milestone",
          sourceRef: "ob3-phase1",
        });

        expect(plan.id).toStartWith("plan-");
        expect(plan.title).toBe("OB3 Milestone Plan");
        expect(plan.goalId).toBe(goal.id);
        expect(plan.sourceType).toBe("milestone");
        expect(plan.sourceRef).toBe("ob3-phase1");
      });

      test("creates plan without sourceRef", () => {
        const goal = createGoal({ title: "Manual goal" });
        const plan = createPlan({
          title: "Manual plan",
          goalId: goal.id,
          sourceType: "manual",
        });

        expect(plan.sourceRef).toBeUndefined();
      });
    });

    describe("getPlan()", () => {
      test("retrieves plan by ID", () => {
        const goal = createGoal({ title: "Goal" });
        const created = createPlan({
          title: "Plan",
          goalId: goal.id,
          sourceType: "epic",
        });

        const retrieved = getPlan(created.id);
        expect(retrieved?.id).toBe(created.id);
        expect(retrieved?.title).toBe("Plan");
      });

      test("returns null for unknown ID", () => {
        expect(getPlan("nonexistent")).toBeNull();
      });
    });

    describe("getPlanByGoal()", () => {
      test("retrieves plan by goal ID", () => {
        const goal = createGoal({ title: "Goal" });
        const plan = createPlan({
          title: "Plan",
          goalId: goal.id,
          sourceType: "milestone",
        });

        const retrieved = getPlanByGoal(goal.id);
        expect(retrieved?.id).toBe(plan.id);
      });

      test("returns null if no plan for goal", () => {
        const goal = createGoal({ title: "Goal" });
        expect(getPlanByGoal(goal.id)).toBeNull();
      });
    });

    describe("deletePlan()", () => {
      test("removes plan from database", () => {
        const goal = createGoal({ title: "Goal" });
        const plan = createPlan({
          title: "Plan",
          goalId: goal.id,
          sourceType: "manual",
        });

        deletePlan(plan.id);
        expect(getPlan(plan.id)).toBeNull();
      });
    });

    describe("getAllPlans()", () => {
      test("returns all plans", () => {
        const goal1 = createGoal({ title: "Goal 1" });
        const goal2 = createGoal({ title: "Goal 2" });

        createPlan({
          title: "Plan A",
          goalId: goal1.id,
          sourceType: "milestone",
        });
        createPlan({
          title: "Plan B",
          goalId: goal2.id,
          sourceType: "epic",
        });

        const plans = getAllPlans();
        expect(plans).toHaveLength(2);
      });
    });
  });

  describe("PlanStep CRUD", () => {
    describe("createPlanStep()", () => {
      test("creates a plan step with issue externalRef", () => {
        const goal = createGoal({ title: "Goal" });
        const plan = createPlan({
          title: "Plan",
          goalId: goal.id,
          sourceType: "milestone",
        });

        const step = createPlanStep({
          planId: plan.id,
          title: "Implement feature X",
          ordinal: 0,
          wave: 1,
          externalRef: { type: "issue", number: 123 },
        });

        expect(step.id).toStartWith("step-");
        expect(step.planId).toBe(plan.id);
        expect(step.title).toBe("Implement feature X");
        expect(step.ordinal).toBe(0);
        expect(step.wave).toBe(1);
        expect(step.externalRef.type).toBe("issue");
        expect(step.externalRef.number).toBe(123);
        expect(step.dependsOn).toEqual([]);
      });

      test("creates step with manual externalRef", () => {
        const goal = createGoal({ title: "Goal" });
        const plan = createPlan({
          title: "Plan",
          goalId: goal.id,
          sourceType: "manual",
        });

        const step = createPlanStep({
          planId: plan.id,
          title: "Manual task",
          ordinal: 0,
          wave: 1,
          externalRef: { type: "manual", criteria: "Complete when done" },
        });

        expect(step.externalRef.type).toBe("manual");
        expect(step.externalRef.criteria).toBe("Complete when done");
      });
    });

    describe("getPlanStep()", () => {
      test("retrieves step by ID", () => {
        const goal = createGoal({ title: "Goal" });
        const plan = createPlan({
          title: "Plan",
          goalId: goal.id,
          sourceType: "manual",
        });
        const created = createPlanStep({
          planId: plan.id,
          title: "Step",
          ordinal: 0,
          wave: 1,
          externalRef: { type: "manual" },
        });

        const retrieved = getPlanStep(created.id);
        expect(retrieved?.id).toBe(created.id);
        expect(retrieved?.title).toBe("Step");
      });

      test("returns null for unknown ID", () => {
        expect(getPlanStep("nonexistent")).toBeNull();
      });
    });

    describe("getStepsByPlan()", () => {
      test("returns steps ordered by ordinal", () => {
        const goal = createGoal({ title: "Goal" });
        const plan = createPlan({
          title: "Plan",
          goalId: goal.id,
          sourceType: "manual",
        });

        createPlanStep({
          planId: plan.id,
          title: "Step 2",
          ordinal: 1,
          wave: 1,
          externalRef: { type: "manual" },
        });
        createPlanStep({
          planId: plan.id,
          title: "Step 1",
          ordinal: 0,
          wave: 1,
          externalRef: { type: "manual" },
        });

        const steps = getStepsByPlan(plan.id);
        expect(steps).toHaveLength(2);
        expect(steps[0].title).toBe("Step 1");
        expect(steps[1].title).toBe("Step 2");
      });
    });

    describe("addStepDependency() / getStepDependencies()", () => {
      test("adds and retrieves dependencies", () => {
        const goal = createGoal({ title: "Goal" });
        const plan = createPlan({
          title: "Plan",
          goalId: goal.id,
          sourceType: "manual",
        });

        const step1 = createPlanStep({
          planId: plan.id,
          title: "Step 1",
          ordinal: 0,
          wave: 1,
          externalRef: { type: "manual" },
        });
        const step2 = createPlanStep({
          planId: plan.id,
          title: "Step 2",
          ordinal: 1,
          wave: 2,
          externalRef: { type: "manual" },
        });

        addStepDependency(step2.id, step1.id);

        const deps = getStepDependencies(step2.id);
        expect(deps).toEqual([step1.id]);
      });

      test("handles multiple dependencies", () => {
        const goal = createGoal({ title: "Goal" });
        const plan = createPlan({
          title: "Plan",
          goalId: goal.id,
          sourceType: "manual",
        });

        const step1 = createPlanStep({
          planId: plan.id,
          title: "Step 1",
          ordinal: 0,
          wave: 1,
          externalRef: { type: "manual" },
        });
        const step2 = createPlanStep({
          planId: plan.id,
          title: "Step 2",
          ordinal: 1,
          wave: 1,
          externalRef: { type: "manual" },
        });
        const step3 = createPlanStep({
          planId: plan.id,
          title: "Step 3",
          ordinal: 2,
          wave: 2,
          externalRef: { type: "manual" },
        });

        addStepDependency(step3.id, step1.id);
        addStepDependency(step3.id, step2.id);

        const deps = getStepDependencies(step3.id);
        expect(deps).toHaveLength(2);
        expect(deps).toContain(step1.id);
        expect(deps).toContain(step2.id);
      });
    });

    describe("deletePlanStep()", () => {
      test("removes step and cascades to dependencies", () => {
        const goal = createGoal({ title: "Goal" });
        const plan = createPlan({
          title: "Plan",
          goalId: goal.id,
          sourceType: "manual",
        });

        const step1 = createPlanStep({
          planId: plan.id,
          title: "Step 1",
          ordinal: 0,
          wave: 1,
          externalRef: { type: "manual" },
        });
        const step2 = createPlanStep({
          planId: plan.id,
          title: "Step 2",
          ordinal: 1,
          wave: 2,
          externalRef: { type: "manual" },
        });

        addStepDependency(step2.id, step1.id);
        deletePlanStep(step1.id);

        expect(getPlanStep(step1.id)).toBeNull();
        // Dependencies should also be removed
        expect(getStepDependencies(step2.id)).toEqual([]);
      });
    });
  });

  describe("cascade deletion", () => {
    test("deleting a plan cascades to plan steps", () => {
      const goal = createGoal({ title: "Goal" });
      const plan = createPlan({
        title: "Plan",
        goalId: goal.id,
        sourceType: "manual",
      });

      const step = createPlanStep({
        planId: plan.id,
        title: "Step",
        ordinal: 0,
        wave: 1,
        externalRef: { type: "manual" },
      });

      deletePlan(plan.id);

      expect(getPlan(plan.id)).toBeNull();
      expect(getPlanStep(step.id)).toBeNull();
    });
  });

  describe("Goal.planStepId", () => {
    test("stores and retrieves planStepId field", () => {
      const parentGoal = createGoal({ title: "Milestone goal" });
      const plan = createPlan({
        title: "Plan",
        goalId: parentGoal.id,
        sourceType: "manual",
      });

      const step = createPlanStep({
        planId: plan.id,
        title: "Step 1",
        ordinal: 0,
        wave: 1,
        externalRef: { type: "issue", number: 123 },
      });

      const goal = createGoal({
        title: "Work on step 1",
        planStepId: step.id,
      });

      expect(goal.planStepId).toBe(step.id);

      // Verify it persists via getEntity
      const retrieved = getEntity(goal.id);
      expect(retrieved?.type).toBe("Goal");
      if (retrieved?.type === "Goal") {
        expect(retrieved.planStepId).toBe(step.id);
      }
    });
  });
});
