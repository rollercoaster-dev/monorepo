import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { closeDatabase, resetDatabase } from "../db/sqlite";
import { mkdir, unlink } from "fs/promises";
import { existsSync, readFileSync } from "fs";
import { cleanupTestDb } from "../test-utils";
import { createGoal, createInterrupt, getStack } from "./store";
import { exportPlanningToJSONL, importPlanningFromJSONL } from "./sync";
import { join } from "path";
import { spawnSync } from "bun";

const TEST_DB = ".claude/test-planning-sync.db";

// Use absolute path for JSONL tests since sync resolves from git root
function getGitRoot(): string {
  const result = spawnSync(["git", "rev-parse", "--show-toplevel"]);
  if (result.success) return result.stdout.toString().trim();
  return process.cwd();
}
const TEST_JSONL_REL = ".claude/test-planning-sync.jsonl";
const TEST_JSONL_ABS = join(getGitRoot(), TEST_JSONL_REL);

async function cleanupTestJsonl(): Promise<void> {
  try {
    await unlink(TEST_JSONL_ABS);
  } catch {
    // Ignore if file doesn't exist
  }
}

describe("planning JSONL sync", () => {
  beforeEach(async () => {
    if (!existsSync(".claude")) await mkdir(".claude", { recursive: true });
    resetDatabase(TEST_DB);
    await cleanupTestJsonl();
  });

  afterEach(async () => {
    closeDatabase();
    await cleanupTestDb(TEST_DB);
    await cleanupTestJsonl();
  });

  describe("exportPlanningToJSONL()", () => {
    test("exports active/paused entities to JSONL", async () => {
      createGoal({ title: "Goal A", issueNumber: 123 });
      createGoal({ title: "Goal B" });

      const result = await exportPlanningToJSONL(TEST_JSONL_REL);

      expect(result.exported).toBe(2);
      expect(existsSync(TEST_JSONL_ABS)).toBe(true);

      const content = readFileSync(TEST_JSONL_ABS, "utf-8");
      const lines = content.split("\n").filter((l) => l.trim());
      expect(lines).toHaveLength(2);

      // First line should be Goal B (top of stack)
      const first = JSON.parse(lines[0]);
      expect(first.title).toBe("Goal B");
      expect(first.type).toBe("Goal");
      expect(first.status).toBe("active");
    });

    test("does not export completed entities", async () => {
      createGoal({ title: "Goal A" });
      createGoal({ title: "Goal B" });

      // Pop Goal B (completes it)
      const { popStack } = await import("./store");
      popStack();

      const result = await exportPlanningToJSONL(TEST_JSONL_REL);
      expect(result.exported).toBe(1);
    });

    test("exports relationships for active entities", async () => {
      createGoal({ title: "Main goal" });
      createInterrupt({ title: "Bug", reason: "Broken" });

      await exportPlanningToJSONL(TEST_JSONL_REL);

      const content = readFileSync(TEST_JSONL_ABS, "utf-8");
      const lines = content.split("\n").filter((l) => l.trim());

      // Should have 2 entities + 1 relationship
      expect(lines.length).toBeGreaterThanOrEqual(2);

      // Check for relationship record
      const relLine = lines.find((l) => l.includes('"_type":"relationship"'));
      expect(relLine).toBeDefined();
    });
  });

  describe("importPlanningFromJSONL()", () => {
    test("imports entities from JSONL", async () => {
      // Create and export
      createGoal({ title: "Goal A" });
      createGoal({ title: "Goal B" });
      await exportPlanningToJSONL(TEST_JSONL_REL);

      // Reset DB (simulate new machine)
      closeDatabase();
      await cleanupTestDb(TEST_DB);
      resetDatabase(TEST_DB);

      // Import
      const result = await importPlanningFromJSONL(TEST_JSONL_REL);

      expect(result.imported).toBe(2);
      expect(result.errors).toBe(0);

      // Verify stack is restored
      const stack = getStack();
      expect(stack).toHaveLength(2);
    });

    test("deduplicates by ID", async () => {
      // Create and export
      createGoal({ title: "Goal A" });
      await exportPlanningToJSONL(TEST_JSONL_REL);

      // Import again (same DB)
      const result = await importPlanningFromJSONL(TEST_JSONL_REL);

      expect(result.skipped).toBe(1);
      expect(result.imported).toBe(0);
    });

    test("roundtrip preserves stack state", async () => {
      createGoal({ title: "Goal A", issueNumber: 100 });
      createGoal({ title: "Goal B" });
      createInterrupt({ title: "Bug fix", reason: "CI broken" });

      const originalStack = getStack();
      await exportPlanningToJSONL(TEST_JSONL_REL);

      // Reset and reimport
      closeDatabase();
      await cleanupTestDb(TEST_DB);
      resetDatabase(TEST_DB);
      await importPlanningFromJSONL(TEST_JSONL_REL);

      const restoredStack = getStack();
      expect(restoredStack).toHaveLength(originalStack.length);
      expect(restoredStack[0].title).toBe("Bug fix");
      expect(restoredStack[1].title).toBe("Goal B");
      expect(restoredStack[2].title).toBe("Goal A");
    });
  });
});
