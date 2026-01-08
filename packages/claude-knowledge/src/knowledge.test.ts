import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { knowledge } from "./knowledge";
import { closeDatabase, resetDatabase, getDatabase } from "./db/sqlite";
import type { Learning } from "./types";
import { unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";

const TEST_DB = ".claude/test-knowledge.db";

// Test helpers to reduce query boilerplate
const db = () => getDatabase();

const getEntity = (id: string) =>
  db()
    .query<
      { id: string; type: string; data: string },
      [string]
    >("SELECT * FROM entities WHERE id = ?")
    .get(id);

const getEntitiesByType = (type: string) =>
  db()
    .query<
      { id: string; type: string },
      [string]
    >("SELECT id, type FROM entities WHERE type = ?")
    .all(type);

const getRels = (fromId: string, type: string) =>
  db()
    .query<
      { from_id: string; to_id: string; type: string },
      [string, string]
    >("SELECT * FROM relationships WHERE from_id = ? AND type = ?")
    .all(fromId, type);

const getRelsTo = (toId: string, type: string) =>
  db()
    .query<
      { from_id: string },
      [string, string]
    >("SELECT from_id FROM relationships WHERE to_id = ? AND type = ?")
    .all(toId, type);

const countEntities = (type: string) =>
  db()
    .query<
      { count: number },
      [string]
    >("SELECT COUNT(*) as count FROM entities WHERE type = ?")
    .get(type)!.count;

describe("knowledge API", () => {
  beforeEach(async () => {
    if (!existsSync(".claude")) await mkdir(".claude", { recursive: true });
    resetDatabase(TEST_DB);
  });

  afterEach(async () => {
    closeDatabase();
    try {
      await unlink(TEST_DB);
    } catch {
      /* ignore */
    }
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

    test("generates ID if not provided", async () => {
      await knowledge.store([{ id: "", content: "Auto ID test" }]);

      const entities = getEntitiesByType("Learning");
      expect(entities).toHaveLength(1);
      expect(entities[0].id).toMatch(/^learning-/);
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

    test("generates ID if not provided", async () => {
      await knowledge.storePattern({
        id: "",
        name: "Auto",
        description: "Test",
      });

      const entities = getEntitiesByType("Pattern");
      expect(entities).toHaveLength(1);
      expect(entities[0].id).toMatch(/^pattern-/);
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

    test("generates ID if not provided", async () => {
      await knowledge.storeMistake({
        id: "",
        description: "Auto",
        howFixed: "Test",
      });

      const entities = getEntitiesByType("Mistake");
      expect(entities).toHaveLength(1);
      expect(entities[0].id).toMatch(/^mistake-/);
    });
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

  describe("integration", () => {
    test("full workflow: learning → pattern → mistake", async () => {
      await knowledge.store([
        {
          id: "learning-full-1",
          content: "Validation prevents security issues",
          codeArea: "Security",
          filePath: "src/validation.ts",
          confidence: 0.9,
        },
      ]);

      await knowledge.storePattern(
        {
          id: "pattern-full-1",
          name: "Input Validation",
          description: "Validate at API boundaries",
          codeArea: "Security",
        },
        ["learning-full-1"],
      );

      await knowledge.storeMistake(
        {
          id: "mistake-full-1",
          description: "Unvalidated input",
          howFixed: "Added Zod",
          filePath: "src/api/handler.ts",
        },
        "learning-full-1",
      );

      // Verify all entity types exist
      const types = db()
        .query<{ type: string }, []>("SELECT DISTINCT type FROM entities")
        .all()
        .map((e) => e.type);

      expect(types).toContain("Learning");
      expect(types).toContain("Pattern");
      expect(types).toContain("Mistake");
      expect(types).toContain("CodeArea");
      expect(types).toContain("File");

      // Verify relationship types
      const relTypes = db()
        .query<{ type: string }, []>("SELECT DISTINCT type FROM relationships")
        .all()
        .map((r) => r.type);

      expect(relTypes).toContain("ABOUT");
      expect(relTypes).toContain("IN_FILE");
      expect(relTypes).toContain("APPLIES_TO");
      expect(relTypes).toContain("LED_TO");
    });
  });
});
