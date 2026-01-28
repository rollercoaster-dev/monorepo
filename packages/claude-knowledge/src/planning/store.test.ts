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
});
