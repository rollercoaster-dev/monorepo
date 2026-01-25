import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { knowledge } from "./index";
import { closeDatabase, resetDatabase, getDatabase } from "../db/sqlite";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { cleanupTestDb } from "../test-utils";

const TEST_DB = ".claude/test-knowledge-integration.db";
const db = () => getDatabase();

describe("knowledge integration tests", () => {
  beforeEach(async () => {
    if (!existsSync(".claude")) await mkdir(".claude", { recursive: true });
    resetDatabase(TEST_DB);
  });

  afterEach(async () => {
    closeDatabase();
    await cleanupTestDb(TEST_DB);
  });

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

  test("full graph traversal with complex relationships", async () => {
    // Create a complex graph:
    // Learning1 (Security area, file1) <- Pattern1
    // Learning2 (Security area, file2) <- Pattern1, Pattern2, Mistake1

    await knowledge.store([
      {
        id: "learning-complex-1",
        content: "First security learning",
        codeArea: "Security",
        filePath: "src/auth/login.ts",
      },
      {
        id: "learning-complex-2",
        content: "Second security learning",
        codeArea: "Security",
        filePath: "src/auth/register.ts",
      },
    ]);

    // Pattern linked to both learnings
    await knowledge.storePattern(
      {
        id: "pattern-complex-shared",
        name: "Auth Pattern",
        description: "Shared auth pattern",
        codeArea: "Security",
      },
      ["learning-complex-1", "learning-complex-2"],
    );

    // Pattern linked only to second learning
    await knowledge.storePattern(
      {
        id: "pattern-complex-unique",
        name: "Registration Pattern",
        description: "Registration specific",
        codeArea: "Security",
      },
      ["learning-complex-2"],
    );

    // Mistake linked to second learning
    await knowledge.storeMistake(
      {
        id: "mistake-complex",
        description: "Registration bug",
        howFixed: "Fixed validation",
        filePath: "src/auth/register.ts",
      },
      "learning-complex-2",
    );

    const results = await knowledge.query({ codeArea: "Security" });

    expect(results).toHaveLength(2);

    // Check first learning has one pattern
    const result1 = results.find((r) => r.learning.id === "learning-complex-1");
    expect(result1?.relatedPatterns).toHaveLength(1);
    expect(result1?.relatedMistakes).toBeUndefined();

    // Check second learning has two patterns and one mistake
    const result2 = results.find((r) => r.learning.id === "learning-complex-2");
    expect(result2?.relatedPatterns).toHaveLength(2);
    expect(result2?.relatedMistakes).toHaveLength(1);
  });
});
