import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { knowledge } from "./index";
import { closeDatabase, resetDatabase } from "../db/sqlite";
import type { Learning } from "../types";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import {
  db,
  getEntity,
  getEntitiesByType,
  getRels,
  getRelsTo,
  countEntities,
} from "../__tests__/helpers";
import { cleanupTestDb } from "../test-utils";

const TEST_DB = ".claude/test-knowledge-store.db";

describe("knowledge storage operations", () => {
  beforeEach(async () => {
    if (!existsSync(".claude")) await mkdir(".claude", { recursive: true });
    resetDatabase(TEST_DB);
  });

  afterEach(async () => {
    closeDatabase();
    await cleanupTestDb(TEST_DB);
  });

  describe("store()", () => {
    test("creates Learning entities", async () => {
      await knowledge.store([
        { id: "learning-1", content: "Validate user input", confidence: 0.95 },
      ]);

      const entity = getEntity("learning-1");
      expect(entity).not.toBeNull();
      expect(entity!.type).toBe("Learning");
      expect(JSON.parse(entity!.data).content).toBe("Validate user input");
    });

    test("auto-creates CodeArea entity and ABOUT relationship", async () => {
      await knowledge.store([
        { id: "learning-2", content: "Use rd-logger", codeArea: "Logging" },
      ]);

      const codeArea = getEntity("codearea-logging");
      expect(codeArea).not.toBeNull();
      expect(codeArea!.type).toBe("CodeArea");

      const rels = getRels("learning-2", "ABOUT");
      expect(rels).toHaveLength(1);
      expect(rels[0].to_id).toBe("codearea-logging");
    });

    test("auto-creates File entity and IN_FILE relationship", async () => {
      await knowledge.store([
        { id: "learning-3", content: "Test", filePath: "src/checkpoint.ts" },
      ]);

      expect(getEntitiesByType("File").length).toBeGreaterThan(0);
      expect(getRels("learning-3", "IN_FILE")).toHaveLength(1);
    });

    test("merges duplicate CodeArea entities", async () => {
      await knowledge.store([
        { id: "learning-4", content: "Learning 1", codeArea: "Database" },
        { id: "learning-5", content: "Learning 2", codeArea: "Database" },
      ]);

      expect(countEntities("CodeArea")).toBe(1);
      expect(getRelsTo("codearea-database", "ABOUT")).toHaveLength(2);
    });

    test("handles batch insert with transaction", async () => {
      const learnings: Learning[] = Array.from({ length: 100 }, (_, i) => ({
        id: `learning-batch-${i}`,
        content: `Content ${i}`,
        codeArea: `Area${i % 10}`,
      }));

      await knowledge.store(learnings);
      expect(countEntities("Learning")).toBe(100);
    });

    test("handles empty array gracefully", async () => {
      await knowledge.store([]);
      expect(true).toBe(true);
    });

    test("updates existing entity on duplicate ID", async () => {
      await knowledge.store([
        { id: "learning-update", content: "Original", confidence: 0.5 },
      ]);
      await knowledge.store([
        { id: "learning-update", content: "Updated", confidence: 0.9 },
      ]);

      const data = JSON.parse(getEntity("learning-update")!.data);
      expect(data.content).toBe("Updated");
      expect(data.confidence).toBe(0.9);
    });

    test("throws error when entity ID exists with different type", async () => {
      db().run(
        "INSERT INTO entities (id, type, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        [
          "conflict-id",
          "CodeArea",
          JSON.stringify({ name: "Test" }),
          new Date().toISOString(),
          new Date().toISOString(),
        ],
      );

      await expect(
        knowledge.store([{ id: "conflict-id", content: "Fail" }]),
      ).rejects.toThrow(/already exists with type "CodeArea"/);
    });

    test("skips duplicate learnings with same content hash", async () => {
      const learning1 = {
        id: "learning-dup-1",
        content: "CSS variables fail silently when undefined",
        confidence: 0.8,
      };
      const learning2 = {
        id: "learning-dup-2",
        content: "CSS variables fail silently when undefined", // Same content
        confidence: 0.8,
      };

      await knowledge.store([learning1]);
      await knowledge.store([learning2]);

      // Should only have one learning stored
      const learnings = getEntitiesByType("Learning");
      expect(learnings).toHaveLength(1);
      expect(learnings[0].id).toBe("learning-dup-1");
    });

    test("stores learnings with different content", async () => {
      await knowledge.store([
        {
          id: "learning-unique-1",
          content: "CSS variables fail silently",
          confidence: 0.8,
        },
        {
          id: "learning-unique-2",
          content: "CSS variables work great", // Different
          confidence: 0.8,
        },
      ]);

      const learnings = getEntitiesByType("Learning");
      expect(learnings).toHaveLength(2);
    });
  });

  describe("storePattern()", () => {
    test("creates Pattern entity", async () => {
      await knowledge.storePattern({
        id: "pattern-1",
        name: "Validation",
        description: "Validate input",
        codeArea: "Security",
      });

      const entity = getEntity("pattern-1");
      expect(entity).not.toBeNull();
      expect(entity!.type).toBe("Pattern");
      expect(JSON.parse(entity!.data).name).toBe("Validation");
    });

    test("creates APPLIES_TO relationship to CodeArea", async () => {
      await knowledge.storePattern({
        id: "pattern-2",
        name: "Logging",
        description: "Use rd-logger",
        codeArea: "Logging",
      });

      const rels = getRels("pattern-2", "APPLIES_TO");
      expect(rels).toHaveLength(1);
      expect(rels[0].to_id).toBe("codearea-logging");
    });

    test("links pattern to learnings via LED_TO", async () => {
      await knowledge.store([
        { id: "learning-7", content: "L1" },
        { id: "learning-8", content: "L2" },
      ]);

      await knowledge.storePattern(
        { id: "pattern-3", name: "Combined", description: "Multi-source" },
        ["learning-7", "learning-8"],
      );

      expect(getRels("pattern-3", "LED_TO")).toHaveLength(2);
    });

    test("throws error for non-existent learning", async () => {
      await expect(
        knowledge.storePattern(
          { id: "pattern-4", name: "Test", description: "Test" },
          ["non-existent"],
        ),
      ).rejects.toThrow(/does not exist/);
    });
  });

  describe("storeMistake()", () => {
    test("creates Mistake entity", async () => {
      await knowledge.storeMistake({
        id: "mistake-1",
        description: "No validation",
        howFixed: "Added Zod",
        filePath: "src/api/users.ts",
      });

      const entity = getEntity("mistake-1");
      expect(entity).not.toBeNull();
      expect(entity!.type).toBe("Mistake");
      expect(JSON.parse(entity!.data).howFixed).toContain("Zod");
    });

    test("creates IN_FILE relationship", async () => {
      await knowledge.storeMistake({
        id: "mistake-2",
        description: "SQL injection",
        howFixed: "Parameterized queries",
        filePath: "src/db/queries.ts",
      });

      expect(getRels("mistake-2", "IN_FILE")).toHaveLength(1);
    });

    test("links mistake to learning via LED_TO", async () => {
      await knowledge.store([{ id: "learning-9", content: "Use params" }]);

      await knowledge.storeMistake(
        { id: "mistake-3", description: "SQL injection", howFixed: "Params" },
        "learning-9",
      );

      const rels = getRels("mistake-3", "LED_TO");
      expect(rels).toHaveLength(1);
      expect(rels[0].to_id).toBe("learning-9");
    });

    test("throws error for non-existent learning", async () => {
      await expect(
        knowledge.storeMistake(
          { id: "mistake-4", description: "Test", howFixed: "Test" },
          "non-existent",
        ),
      ).rejects.toThrow(/does not exist/);
    });
  });

  describe("ID generation", () => {
    test.each([
      {
        type: "Learning",
        storeFunc: () => knowledge.store([{ id: "", content: "Auto ID test" }]),
        prefix: "learning-",
      },
      {
        type: "Pattern",
        storeFunc: () =>
          knowledge.storePattern({ id: "", name: "Auto", description: "Test" }),
        prefix: "pattern-",
      },
      {
        type: "Mistake",
        storeFunc: () =>
          knowledge.storeMistake({
            id: "",
            description: "Auto",
            howFixed: "Test",
          }),
        prefix: "mistake-",
      },
    ])(
      "generates ID if not provided for $type",
      async ({ type, storeFunc, prefix }) => {
        await storeFunc();

        const entities = getEntitiesByType(type);
        expect(entities).toHaveLength(1);
        expect(entities[0].id).toMatch(new RegExp(`^${prefix}`));
      },
    );
  });

  describe("relationship integrity", () => {
    test("duplicate relationships are idempotent", async () => {
      await knowledge.store([
        { id: "learning-10", content: "Test", codeArea: "Testing" },
      ]);
      await knowledge.store([
        { id: "learning-10", content: "Updated", codeArea: "Testing" },
      ]);

      expect(getRels("learning-10", "ABOUT")).toHaveLength(1);
    });

    test("cascade delete removes relationships", async () => {
      await knowledge.store([
        { id: "learning-11", content: "Test", codeArea: "Testing" },
      ]);

      db().run("DELETE FROM entities WHERE id = ?", ["learning-11"]);

      expect(getRels("learning-11", "ABOUT")).toHaveLength(0);
    });
  });
});
