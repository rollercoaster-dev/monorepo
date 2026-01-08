import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { knowledge } from "./knowledge";
import { closeDatabase, resetDatabase, getDatabase } from "./db/sqlite";
import type { Learning, Pattern, Mistake } from "./types";
import { unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";

const TEST_DB = ".claude/test-knowledge.db";

describe("knowledge API", () => {
  beforeEach(async () => {
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

  describe("store()", () => {
    test("creates Learning entities", async () => {
      const learnings: Learning[] = [
        {
          id: "learning-1",
          content: "Always validate user input before database queries",
          confidence: 0.95,
        },
      ];

      await knowledge.store(learnings);

      const db = getDatabase();
      const entity = db
        .query<
          { id: string; type: string; data: string },
          [string]
        >("SELECT * FROM entities WHERE id = ?")
        .get("learning-1");

      expect(entity).not.toBeNull();
      expect(entity!.type).toBe("Learning");
      expect(JSON.parse(entity!.data).content).toBe(
        "Always validate user input before database queries",
      );
    });

    test("auto-creates CodeArea entity and ABOUT relationship", async () => {
      const learnings: Learning[] = [
        {
          id: "learning-2",
          content: "Use rd-logger for all logging",
          codeArea: "Logging",
        },
      ];

      await knowledge.store(learnings);

      const db = getDatabase();

      // Check CodeArea entity exists
      const codeArea = db
        .query<
          { id: string; type: string; data: string },
          [string]
        >("SELECT * FROM entities WHERE id = ?")
        .get("codearea-logging");

      expect(codeArea).not.toBeNull();
      expect(codeArea!.type).toBe("CodeArea");

      // Check ABOUT relationship exists
      const rel = db
        .query<
          { from_id: string; to_id: string; type: string },
          [string, string]
        >("SELECT * FROM relationships WHERE from_id = ? AND type = ?")
        .get("learning-2", "ABOUT");

      expect(rel).not.toBeNull();
      expect(rel!.to_id).toBe("codearea-logging");
    });

    test("auto-creates File entity and IN_FILE relationship", async () => {
      const learnings: Learning[] = [
        {
          id: "learning-3",
          content: "Checkpoint API requires database initialization",
          filePath: "packages/claude-knowledge/src/checkpoint.ts",
        },
      ];

      await knowledge.store(learnings);

      const db = getDatabase();

      // Check File entity exists
      const files = db
        .query<
          { id: string; type: string },
          []
        >("SELECT * FROM entities WHERE type = 'File'")
        .all();

      expect(files.length).toBeGreaterThan(0);

      // Check IN_FILE relationship exists
      const rel = db
        .query<
          { from_id: string; to_id: string; type: string },
          [string, string]
        >("SELECT * FROM relationships WHERE from_id = ? AND type = ?")
        .get("learning-3", "IN_FILE");

      expect(rel).not.toBeNull();
    });

    test("merges duplicate CodeArea entities", async () => {
      const learnings: Learning[] = [
        { id: "learning-4", content: "Learning 1", codeArea: "Database" },
        { id: "learning-5", content: "Learning 2", codeArea: "Database" },
      ];

      await knowledge.store(learnings);

      const db = getDatabase();
      const codeAreas = db
        .query<
          { id: string },
          []
        >("SELECT * FROM entities WHERE type = 'CodeArea'")
        .all();

      // Should only have one CodeArea entity
      expect(codeAreas).toHaveLength(1);

      // Both learnings should reference it
      const rels = db
        .query<
          { from_id: string },
          [string, string]
        >("SELECT * FROM relationships WHERE to_id = ? AND type = ?")
        .all("codearea-database", "ABOUT");

      expect(rels).toHaveLength(2);
    });

    test("handles batch insert efficiently with transaction", async () => {
      const learnings: Learning[] = Array.from({ length: 100 }, (_, i) => ({
        id: `learning-batch-${i}`,
        content: `Learning content ${i}`,
        codeArea: `Area${i % 10}`, // 10 unique areas
      }));

      await knowledge.store(learnings);

      const db = getDatabase();
      const count = db
        .query<
          { count: number },
          []
        >("SELECT COUNT(*) as count FROM entities WHERE type = 'Learning'")
        .get();

      expect(count!.count).toBe(100);
    });

    test("handles empty array gracefully", async () => {
      // Should complete without error
      await knowledge.store([]);
      // If we reach here, no error was thrown
      expect(true).toBe(true);
    });

    test("generates ID if not provided", async () => {
      const learnings: Learning[] = [
        {
          id: "", // empty ID
          content: "Auto-generated ID test",
        },
      ];

      await knowledge.store(learnings);

      const db = getDatabase();
      const entities = db
        .query<
          { id: string },
          []
        >("SELECT id FROM entities WHERE type = 'Learning'")
        .all();

      expect(entities).toHaveLength(1);
      expect(entities[0].id).toMatch(/^learning-/);
    });

    test("updates existing entity on duplicate ID", async () => {
      // Store first version
      await knowledge.store([
        {
          id: "learning-update",
          content: "Original content",
          confidence: 0.5,
        },
      ]);

      // Store updated version
      await knowledge.store([
        {
          id: "learning-update",
          content: "Updated content",
          confidence: 0.9,
        },
      ]);

      const db = getDatabase();
      const entity = db
        .query<
          { data: string },
          [string]
        >("SELECT data FROM entities WHERE id = ?")
        .get("learning-update");

      const data = JSON.parse(entity!.data);
      expect(data.content).toBe("Updated content");
      expect(data.confidence).toBe(0.9);
    });

    test("throws error when entity ID exists with different type", async () => {
      // Create a CodeArea entity directly
      const db = getDatabase();
      db.run(
        "INSERT INTO entities (id, type, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        [
          "conflict-id",
          "CodeArea",
          JSON.stringify({ name: "Test Area" }),
          new Date().toISOString(),
          new Date().toISOString(),
        ],
      );

      // Try to store a learning with the same ID - should fail
      await expect(
        knowledge.store([
          {
            id: "conflict-id",
            content: "This should fail",
          },
        ]),
      ).rejects.toThrow(
        /already exists with type "CodeArea", cannot update as "Learning"/,
      );
    });
  });

  describe("storePattern()", () => {
    test("creates Pattern entity", async () => {
      const pattern: Pattern = {
        id: "pattern-1",
        name: "Input Validation Pattern",
        description: "Always validate and sanitize user input",
        codeArea: "Security",
      };

      await knowledge.storePattern(pattern);

      const db = getDatabase();
      const entity = db
        .query<
          { id: string; type: string; data: string },
          [string]
        >("SELECT * FROM entities WHERE id = ?")
        .get("pattern-1");

      expect(entity).not.toBeNull();
      expect(entity!.type).toBe("Pattern");
      expect(JSON.parse(entity!.data).name).toBe("Input Validation Pattern");
    });

    test("creates APPLIES_TO relationship to CodeArea", async () => {
      const pattern: Pattern = {
        id: "pattern-2",
        name: "Logging Pattern",
        description: "Use structured logging with rd-logger",
        codeArea: "Logging",
      };

      await knowledge.storePattern(pattern);

      const db = getDatabase();
      const rel = db
        .query<
          { from_id: string; to_id: string; type: string },
          [string, string]
        >("SELECT * FROM relationships WHERE from_id = ? AND type = ?")
        .get("pattern-2", "APPLIES_TO");

      expect(rel).not.toBeNull();
      expect(rel!.to_id).toBe("codearea-logging");
    });

    test("links pattern to learnings via LED_TO", async () => {
      // Store learnings first
      await knowledge.store([
        { id: "learning-7", content: "Learning 1" },
        { id: "learning-8", content: "Learning 2" },
      ]);

      const pattern: Pattern = {
        id: "pattern-3",
        name: "Combined Pattern",
        description: "Based on multiple learnings",
      };

      await knowledge.storePattern(pattern, ["learning-7", "learning-8"]);

      const db = getDatabase();
      const rels = db
        .query<
          { from_id: string; to_id: string },
          [string, string]
        >("SELECT * FROM relationships WHERE from_id = ? AND type = ?")
        .all("pattern-3", "LED_TO");

      expect(rels).toHaveLength(2);
    });

    test("throws error for non-existent learning", async () => {
      const pattern: Pattern = {
        id: "pattern-4",
        name: "Test Pattern",
        description: "Test",
      };

      await expect(
        knowledge.storePattern(pattern, ["non-existent-learning"]),
      ).rejects.toThrow(/does not exist/);
    });

    test("generates ID if not provided", async () => {
      const pattern: Pattern = {
        id: "",
        name: "Auto ID Pattern",
        description: "Test",
      };

      await knowledge.storePattern(pattern);

      const db = getDatabase();
      const entities = db
        .query<
          { id: string },
          []
        >("SELECT id FROM entities WHERE type = 'Pattern'")
        .all();

      expect(entities).toHaveLength(1);
      expect(entities[0].id).toMatch(/^pattern-/);
    });
  });

  describe("storeMistake()", () => {
    test("creates Mistake entity", async () => {
      const mistake: Mistake = {
        id: "mistake-1",
        description: "Forgot to validate input",
        howFixed: "Added validation using Zod schema",
        filePath: "src/api/users.ts",
      };

      await knowledge.storeMistake(mistake);

      const db = getDatabase();
      const entity = db
        .query<
          { id: string; type: string; data: string },
          [string]
        >("SELECT * FROM entities WHERE id = ?")
        .get("mistake-1");

      expect(entity).not.toBeNull();
      expect(entity!.type).toBe("Mistake");
      expect(JSON.parse(entity!.data).howFixed).toContain("Zod schema");
    });

    test("creates IN_FILE relationship", async () => {
      const mistake: Mistake = {
        id: "mistake-2",
        description: "SQL injection vulnerability",
        howFixed: "Switched to parameterized queries",
        filePath: "src/db/queries.ts",
      };

      await knowledge.storeMistake(mistake);

      const db = getDatabase();
      const rel = db
        .query<
          { from_id: string; to_id: string; type: string },
          [string, string]
        >("SELECT * FROM relationships WHERE from_id = ? AND type = ?")
        .get("mistake-2", "IN_FILE");

      expect(rel).not.toBeNull();
    });

    test("links mistake to learning via LED_TO", async () => {
      // Store learning first
      await knowledge.store([
        {
          id: "learning-9",
          content: "Always use parameterized queries",
        },
      ]);

      const mistake: Mistake = {
        id: "mistake-3",
        description: "SQL injection",
        howFixed: "Applied parameterized query pattern",
      };

      await knowledge.storeMistake(mistake, "learning-9");

      const db = getDatabase();
      const rel = db
        .query<
          { from_id: string; to_id: string; type: string },
          [string, string]
        >("SELECT * FROM relationships WHERE from_id = ? AND type = ?")
        .get("mistake-3", "LED_TO");

      expect(rel).not.toBeNull();
      expect(rel!.to_id).toBe("learning-9");
    });

    test("throws error for non-existent learning", async () => {
      const mistake: Mistake = {
        id: "mistake-4",
        description: "Test mistake",
        howFixed: "Test fix",
      };

      await expect(
        knowledge.storeMistake(mistake, "non-existent-learning"),
      ).rejects.toThrow(/does not exist/);
    });

    test("generates ID if not provided", async () => {
      const mistake: Mistake = {
        id: "",
        description: "Auto ID Mistake",
        howFixed: "Test",
      };

      await knowledge.storeMistake(mistake);

      const db = getDatabase();
      const entities = db
        .query<
          { id: string },
          []
        >("SELECT id FROM entities WHERE type = 'Mistake'")
        .all();

      expect(entities).toHaveLength(1);
      expect(entities[0].id).toMatch(/^mistake-/);
    });
  });

  describe("relationship integrity", () => {
    test("duplicate relationships are idempotent", async () => {
      await knowledge.store([
        {
          id: "learning-10",
          content: "Test learning",
          codeArea: "Testing",
        },
      ]);

      // Store again (should merge, not duplicate)
      await knowledge.store([
        {
          id: "learning-10",
          content: "Test learning (updated)",
          codeArea: "Testing",
        },
      ]);

      const db = getDatabase();
      const rels = db
        .query<
          { id: number },
          [string, string]
        >("SELECT * FROM relationships WHERE from_id = ? AND type = ?")
        .all("learning-10", "ABOUT");

      // Should still only have one relationship
      expect(rels).toHaveLength(1);
    });

    test("cascade delete removes relationships", async () => {
      await knowledge.store([
        {
          id: "learning-11",
          content: "Test learning",
          codeArea: "Testing",
        },
      ]);

      const db = getDatabase();

      // Delete learning entity
      db.run("DELETE FROM entities WHERE id = ?", ["learning-11"]);

      // Relationships should be cascade-deleted
      const rels = db
        .query<
          { id: number },
          [string]
        >("SELECT * FROM relationships WHERE from_id = ?")
        .all("learning-11");

      expect(rels).toHaveLength(0);
    });
  });

  describe("integration", () => {
    test("full workflow: learning → pattern → mistake", async () => {
      // Store initial learning
      await knowledge.store([
        {
          id: "learning-full-1",
          content: "Input validation prevents security issues",
          codeArea: "Security",
          filePath: "src/validation.ts",
          confidence: 0.9,
        },
      ]);

      // Store pattern derived from learning
      await knowledge.storePattern(
        {
          id: "pattern-full-1",
          name: "Input Validation",
          description: "Validate all user input at API boundaries",
          codeArea: "Security",
        },
        ["learning-full-1"],
      );

      // Store mistake that led to learning
      await knowledge.storeMistake(
        {
          id: "mistake-full-1",
          description: "Accepted unvalidated input",
          howFixed: "Added Zod validation schema",
          filePath: "src/api/handler.ts",
        },
        "learning-full-1",
      );

      const db = getDatabase();

      // Verify all entities exist
      const entities = db
        .query<{ type: string }, []>("SELECT type FROM entities")
        .all();

      const types = entities.map((e) => e.type);
      expect(types).toContain("Learning");
      expect(types).toContain("Pattern");
      expect(types).toContain("Mistake");
      expect(types).toContain("CodeArea");
      expect(types).toContain("File");

      // Verify relationships form a connected graph
      const rels = db
        .query<
          { from_id: string; to_id: string; type: string },
          []
        >("SELECT from_id, to_id, type FROM relationships")
        .all();

      // Learning → CodeArea (ABOUT)
      expect(rels.some((r) => r.type === "ABOUT")).toBe(true);
      // Learning → File (IN_FILE)
      expect(rels.some((r) => r.type === "IN_FILE")).toBe(true);
      // Pattern → CodeArea (APPLIES_TO)
      expect(rels.some((r) => r.type === "APPLIES_TO")).toBe(true);
      // Pattern → Learning (LED_TO)
      expect(
        rels.some((r) => r.type === "LED_TO" && r.from_id === "pattern-full-1"),
      ).toBe(true);
      // Mistake → Learning (LED_TO)
      expect(
        rels.some((r) => r.type === "LED_TO" && r.from_id === "mistake-full-1"),
      ).toBe(true);
    });
  });
});
