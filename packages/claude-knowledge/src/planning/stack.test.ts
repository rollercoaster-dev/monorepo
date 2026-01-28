import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { closeDatabase, resetDatabase } from "../db/sqlite";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { cleanupTestDb } from "../test-utils";
import {
  pushGoal,
  pushInterrupt,
  popStack,
  peekStack,
  getStackDepth,
} from "./stack";

const TEST_DB = ".claude/test-planning-stack.db";

describe("planning stack operations", () => {
  beforeEach(async () => {
    if (!existsSync(".claude")) await mkdir(".claude", { recursive: true });
    resetDatabase(TEST_DB);
  });

  afterEach(async () => {
    closeDatabase();
    await cleanupTestDb(TEST_DB);
  });

  describe("pushGoal()", () => {
    test("returns goal and updated stack", () => {
      const { goal, stack } = pushGoal({ title: "Build API" });

      expect(goal.title).toBe("Build API");
      expect(goal.type).toBe("Goal");
      expect(stack.depth).toBe(1);
      expect(stack.topItem?.title).toBe("Build API");
    });

    test("multiple goals create a stack", () => {
      pushGoal({ title: "Goal A" });
      const { stack } = pushGoal({ title: "Goal B" });

      expect(stack.depth).toBe(2);
      expect(stack.topItem?.title).toBe("Goal B");
      expect(stack.items[0].title).toBe("Goal B");
      expect(stack.items[1].title).toBe("Goal A");
    });
  });

  describe("pushInterrupt()", () => {
    test("returns interrupt, interrupted item, and stack", () => {
      pushGoal({ title: "Main work" });
      const { interrupt, interruptedItem, stack } = pushInterrupt({
        title: "Bug fix",
        reason: "CI broken",
      });

      expect(interrupt.title).toBe("Bug fix");
      expect(interrupt.type).toBe("Interrupt");
      expect(interruptedItem?.title).toBe("Main work");
      expect(stack.depth).toBe(2);
      expect(stack.topItem?.title).toBe("Bug fix");
    });

    test("works on empty stack", () => {
      const { interrupt, interruptedItem, stack } = pushInterrupt({
        title: "Urgent",
        reason: "Emergency",
      });

      expect(interrupt.title).toBe("Urgent");
      expect(interruptedItem).toBeUndefined();
      expect(stack.depth).toBe(1);
    });
  });

  describe("popStack()", () => {
    test("completes top item and resumes previous", () => {
      pushGoal({ title: "Goal A" });
      pushGoal({ title: "Goal B" });

      const { completed, resumed, stack } = popStack();

      expect(completed?.title).toBe("Goal B");
      expect(resumed?.title).toBe("Goal A");
      expect(stack.depth).toBe(1);
    });

    test("handles empty stack", () => {
      const { completed, resumed, stack } = popStack();

      expect(completed).toBeNull();
      expect(resumed).toBeNull();
      expect(stack.depth).toBe(0);
    });

    test("handles popping last item", () => {
      pushGoal({ title: "Only goal" });

      const { completed, resumed, stack } = popStack();

      expect(completed?.title).toBe("Only goal");
      expect(resumed).toBeNull();
      expect(stack.depth).toBe(0);
    });
  });

  describe("peekStack()", () => {
    test("returns empty stack state", () => {
      const stack = peekStack();

      expect(stack.depth).toBe(0);
      expect(stack.items).toEqual([]);
      expect(stack.topItem).toBeUndefined();
    });

    test("returns full stack without modification", () => {
      pushGoal({ title: "Goal A" });
      pushGoal({ title: "Goal B" });
      pushInterrupt({ title: "Bug", reason: "Broken" });

      const stack = peekStack();

      expect(stack.depth).toBe(3);
      expect(stack.items).toHaveLength(3);
      expect(stack.topItem?.title).toBe("Bug");

      // Peek again - should be identical (no side effects)
      const stack2 = peekStack();
      expect(stack2.depth).toBe(3);
    });
  });

  describe("full workflow", () => {
    test("push goal, interrupt, done, done cycle", () => {
      // Start working on a goal
      pushGoal({ title: "OB3 Phase 1", issueNumber: 294 });
      expect(getStackDepth()).toBe(1);

      // Get interrupted by a bug
      pushInterrupt({ title: "Fix CI", reason: "Tests failing" });
      expect(getStackDepth()).toBe(2);

      // Fix the bug
      const bugDone = popStack();
      expect(bugDone.completed?.title).toBe("Fix CI");
      expect(bugDone.resumed?.title).toBe("OB3 Phase 1");
      expect(getStackDepth()).toBe(1);

      // Finish the goal
      const goalDone = popStack();
      expect(goalDone.completed?.title).toBe("OB3 Phase 1");
      expect(goalDone.resumed).toBeNull();
      expect(getStackDepth()).toBe(0);
    });

    test("nested interrupts", () => {
      pushGoal({ title: "Feature" });
      pushInterrupt({ title: "Bug 1", reason: "Broken" });
      pushInterrupt({ title: "Bug 2", reason: "Also broken" });
      expect(getStackDepth()).toBe(3);

      // Resolve bugs in reverse order
      let result = popStack();
      expect(result.completed?.title).toBe("Bug 2");
      expect(result.resumed?.title).toBe("Bug 1");

      result = popStack();
      expect(result.completed?.title).toBe("Bug 1");
      expect(result.resumed?.title).toBe("Feature");

      result = popStack();
      expect(result.completed?.title).toBe("Feature");
      expect(result.resumed).toBeNull();
      expect(getStackDepth()).toBe(0);
    });
  });
});
