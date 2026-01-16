import { knowledge } from "../knowledge/index";
import type { Learning, Pattern, Mistake } from "../types";
import { parseIntSafe } from "./shared/validation";
import { randomUUID } from "crypto";
import { getDatabase } from "../db/sqlite";

/**
 * Handle knowledge commands.
 */
export async function handleKnowledgeCommands(
  command: string,
  args: string[],
): Promise<void> {
  if (command === "store-learning") {
    // knowledge store-learning <content> [--code-area <area>] [--file <path>] [--confidence <n>]
    if (args.length === 0) {
      throw new Error(
        "Usage: knowledge store-learning <content> [--code-area <area>] [--file <path>] [--confidence <n>]",
      );
    }

    let content = "";
    let codeArea: string | undefined;
    let filePath: string | undefined;
    let confidence: number | undefined;

    // Parse arguments
    let i = 0;
    while (i < args.length) {
      const arg = args[i];

      if (arg === "--code-area" && args[i + 1]) {
        codeArea = args[i + 1];
        i += 2;
      } else if (arg === "--file" && args[i + 1]) {
        filePath = args[i + 1];
        i += 2;
      } else if (arg === "--confidence" && args[i + 1]) {
        const confidenceValue = parseIntSafe(args[i + 1], "confidence");
        if (confidenceValue < 0 || confidenceValue > 100) {
          throw new Error("Confidence must be between 0 and 100");
        }
        confidence = confidenceValue / 100; // Convert to 0.0-1.0
        i += 2;
      } else {
        // Accumulate content from positional args
        content += (content ? " " : "") + arg;
        i++;
      }
    }

    if (!content) {
      throw new Error("Learning content is required");
    }

    // Create learning
    const learningId = `learning-${randomUUID()}`;
    const learning: Learning = {
      id: learningId,
      content,
      codeArea,
      filePath,
      confidence,
    };

    // Store the learning
    await knowledge.store([learning]);

    console.log("Learning stored successfully");
    console.log(`ID: ${learningId}`);
    console.log(`Content: ${content}`);
    if (codeArea) {
      console.log(`Code Area: ${codeArea}`);
    }
    if (filePath) {
      console.log(`File: ${filePath}`);
    }
    if (confidence !== undefined) {
      console.log(`Confidence: ${(confidence * 100).toFixed(0)}%`);
    }
  } else if (command === "store-pattern") {
    // knowledge store-pattern <name> <description> [--code-area <area>]
    if (args.length < 2) {
      throw new Error(
        "Usage: knowledge store-pattern <name> <description> [--code-area <area>]",
      );
    }

    let name = "";
    let description = "";
    let codeArea: string | undefined;

    // Parse arguments
    let i = 0;
    const positionalArgs: string[] = [];
    while (i < args.length) {
      const arg = args[i];

      if (arg === "--code-area" && args[i + 1]) {
        codeArea = args[i + 1];
        i += 2;
      } else {
        positionalArgs.push(arg);
        i++;
      }
    }

    // First positional is name, rest is description
    if (positionalArgs.length < 2) {
      throw new Error("Both <name> and <description> are required");
    }

    name = positionalArgs[0];
    description = positionalArgs.slice(1).join(" ");

    // Create pattern
    const patternId = `pattern-${randomUUID()}`;
    const pattern: Pattern = {
      id: patternId,
      name,
      description,
      codeArea,
    };

    // Store the pattern
    await knowledge.storePattern(pattern);

    console.log("Pattern stored successfully");
    console.log(`ID: ${patternId}`);
    console.log(`Name: ${name}`);
    console.log(`Description: ${description}`);
    if (codeArea) {
      console.log(`Code Area: ${codeArea}`);
    }
  } else if (command === "store-mistake") {
    // knowledge store-mistake <description> <how-fixed> [--file <path>]
    if (args.length < 2) {
      throw new Error(
        "Usage: knowledge store-mistake <description> <how-fixed> [--file <path>]",
      );
    }

    let description = "";
    let howFixed = "";
    let filePath: string | undefined;

    // Parse arguments
    let i = 0;
    const positionalArgs: string[] = [];
    while (i < args.length) {
      const arg = args[i];

      if (arg === "--file" && args[i + 1]) {
        filePath = args[i + 1];
        i += 2;
      } else {
        positionalArgs.push(arg);
        i++;
      }
    }

    // First positional is description, rest is how-fixed
    if (positionalArgs.length < 2) {
      throw new Error("Both <description> and <how-fixed> are required");
    }

    description = positionalArgs[0];
    howFixed = positionalArgs.slice(1).join(" ");

    // Create mistake
    const mistakeId = `mistake-${randomUUID()}`;
    const mistake: Mistake = {
      id: mistakeId,
      description,
      howFixed,
      filePath,
    };

    // Store the mistake
    await knowledge.storeMistake(mistake);

    console.log("Mistake stored successfully");
    console.log(`ID: ${mistakeId}`);
    console.log(`Description: ${description}`);
    console.log(`How Fixed: ${howFixed}`);
    if (filePath) {
      console.log(`File: ${filePath}`);
    }
  } else if (command === "query") {
    // knowledge query [--code-area <area>] [--file <path>] [--text <keyword>] [--issue <n>] [--limit <n>]
    let codeArea: string | undefined;
    let filePath: string | undefined;
    const keywords: string[] = [];
    let issueNumber: number | undefined;
    let limit: number | undefined;

    // Parse optional arguments
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const nextArg = args[i + 1];
      if (arg === "--code-area" && nextArg) {
        codeArea = nextArg;
        i++;
      } else if (arg === "--file" && nextArg) {
        filePath = nextArg;
        i++;
      } else if (arg === "--text" && nextArg) {
        keywords.push(nextArg);
        i++;
      } else if (arg === "--issue" && nextArg) {
        issueNumber = parseIntSafe(nextArg, "issue");
        i++;
      } else if (arg === "--limit" && nextArg) {
        limit = parseIntSafe(nextArg, "limit");
        i++;
      }
    }

    // Query the knowledge graph
    const results = await knowledge.query({
      codeArea,
      filePath,
      keywords: keywords.length > 0 ? keywords : undefined,
      issueNumber,
      limit,
    });

    if (results.length === 0) {
      console.log("No learnings found matching the criteria.");
    } else {
      console.log(`Found ${results.length} learning(s):\n`);

      for (const result of results) {
        console.log("---");
        console.log(`ID: ${result.learning.id}`);
        console.log(`Content: ${result.learning.content}`);
        if (result.learning.sourceIssue) {
          console.log(`Source Issue: #${result.learning.sourceIssue}`);
        }
        if (result.learning.codeArea) {
          console.log(`Code Area: ${result.learning.codeArea}`);
        }
        if (result.learning.filePath) {
          console.log(`File: ${result.learning.filePath}`);
        }
        if (result.learning.confidence !== undefined) {
          console.log(
            `Confidence: ${(result.learning.confidence * 100).toFixed(0)}%`,
          );
        }

        if (result.relatedPatterns && result.relatedPatterns.length > 0) {
          console.log("Related Patterns:");
          for (const p of result.relatedPatterns) {
            console.log(`  - ${p.name}: ${p.description}`);
          }
        }

        if (result.relatedMistakes && result.relatedMistakes.length > 0) {
          console.log("Related Mistakes:");
          for (const m of result.relatedMistakes) {
            console.log(`  - ${m.description}`);
            console.log(`    Fix: ${m.howFixed}`);
          }
        }
        console.log("");
      }
    }
  } else if (command === "search") {
    // knowledge search <query-text> [--limit <n>] [--threshold <n>] [--include-related]
    if (args.length === 0) {
      throw new Error(
        "Usage: knowledge search <query-text> [--limit <n>] [--threshold <n>] [--include-related]",
      );
    }

    let queryText = "";
    let limit: number | undefined;
    let threshold: number | undefined;
    let includeRelated = false;

    // Parse arguments
    let i = 0;
    while (i < args.length) {
      const arg = args[i];
      const nextArg = args[i + 1];

      if (arg === "--limit" && nextArg) {
        limit = parseIntSafe(nextArg, "limit");
        i += 2;
      } else if (arg === "--threshold" && nextArg) {
        const thresholdValue = parseIntSafe(nextArg, "threshold");
        if (thresholdValue < 0 || thresholdValue > 100) {
          throw new Error("Threshold must be between 0 and 100");
        }
        threshold = thresholdValue / 100; // Convert to 0.0-1.0
        i += 2;
      } else if (arg === "--include-related") {
        includeRelated = true;
        i++;
      } else {
        // Accumulate query text from positional args
        queryText += (queryText ? " " : "") + arg;
        i++;
      }
    }

    if (!queryText) {
      throw new Error("Query text is required");
    }

    // Search for similar learnings
    const results = await knowledge.searchSimilar(queryText, {
      limit,
      threshold,
      includeRelated,
    });

    if (results.length === 0) {
      console.log(
        "No similar learnings found. Try lowering the --threshold value.",
      );
    } else {
      console.log(`Found ${results.length} similar learning(s):\n`);

      for (const result of results) {
        console.log("---");
        // Show relevance score if available
        if (result.relevanceScore !== undefined) {
          console.log(
            `Relevance: ${(result.relevanceScore * 100).toFixed(0)}%`,
          );
        }
        console.log(`ID: ${result.learning.id}`);
        console.log(`Content: ${result.learning.content}`);
        if (result.learning.sourceIssue) {
          console.log(`Source Issue: #${result.learning.sourceIssue}`);
        }
        if (result.learning.codeArea) {
          console.log(`Code Area: ${result.learning.codeArea}`);
        }
        if (result.learning.filePath) {
          console.log(`File: ${result.learning.filePath}`);
        }
        if (result.learning.confidence !== undefined) {
          console.log(
            `Confidence: ${(result.learning.confidence * 100).toFixed(0)}%`,
          );
        }

        if (includeRelated) {
          if (result.relatedPatterns && result.relatedPatterns.length > 0) {
            console.log("Related Patterns:");
            for (const p of result.relatedPatterns) {
              console.log(`  - ${p.name}: ${p.description}`);
            }
          }

          if (result.relatedMistakes && result.relatedMistakes.length > 0) {
            console.log("Related Mistakes:");
            for (const m of result.relatedMistakes) {
              console.log(`  - ${m.description}`);
              console.log(`    Fix: ${m.howFixed}`);
            }
          }
        }
        console.log("");
      }
    }
  } else if (command === "list-areas") {
    // knowledge list-areas
    const db = getDatabase();

    // Query for all CodeArea entities with counts of related learnings and patterns
    const sql = `
      SELECT
        e.id,
        json_extract(e.data, '$.name') as name,
        COUNT(DISTINCT CASE WHEN r1.from_id LIKE 'learning-%' THEN r1.from_id END) as learnings,
        COUNT(DISTINCT CASE WHEN r2.from_id LIKE 'pattern-%' THEN r2.from_id END) as patterns
      FROM entities e
      LEFT JOIN relationships r1 ON r1.to_id = e.id AND r1.type = 'ABOUT'
      LEFT JOIN relationships r2 ON r2.to_id = e.id AND r2.type = 'APPLIES_TO'
      WHERE e.type = 'CodeArea'
      GROUP BY e.id, name
      ORDER BY learnings DESC, patterns DESC
    `;

    interface AreaRow {
      id: string;
      name: string;
      learnings: number;
      patterns: number;
    }

    const areas = db.query<AreaRow, []>(sql).all();

    if (areas.length === 0) {
      console.log("No code areas found.");
    } else {
      console.log(`Found ${areas.length} code area(s):\n`);

      // Find max widths for table formatting
      const maxNameWidth = Math.max(
        "Code Area".length,
        ...areas.map((a) => (a.name ?? "").length),
      );

      // Print header
      console.log(`${"Code Area".padEnd(maxNameWidth)} | Learnings | Patterns`);
      console.log(`${"-".repeat(maxNameWidth)}-+-----------+----------`);

      // Print rows
      for (const area of areas) {
        const name = area.name ?? "(unnamed)";
        console.log(
          `${name.padEnd(maxNameWidth)} | ${String(area.learnings).padStart(9)} | ${String(area.patterns).padStart(8)}`,
        );
      }
    }
  } else if (command === "list-files") {
    // knowledge list-files
    const db = getDatabase();

    // Query for all File entities with counts of related learnings and mistakes
    const sql = `
      SELECT
        e.id,
        json_extract(e.data, '$.path') as path,
        COUNT(DISTINCT CASE WHEN r1.from_id LIKE 'learning-%' THEN r1.from_id END) as learnings,
        COUNT(DISTINCT CASE WHEN r2.from_id LIKE 'mistake-%' THEN r2.from_id END) as mistakes
      FROM entities e
      LEFT JOIN relationships r1 ON r1.to_id = e.id AND r1.type = 'IN_FILE'
      LEFT JOIN relationships r2 ON r2.to_id = e.id AND r2.type = 'IN_FILE'
      WHERE e.type = 'File'
      GROUP BY e.id, path
      ORDER BY learnings DESC, mistakes DESC
    `;

    interface FileRow {
      id: string;
      path: string;
      learnings: number;
      mistakes: number;
    }

    const files = db.query<FileRow, []>(sql).all();

    if (files.length === 0) {
      console.log("No files found.");
    } else {
      console.log(`Found ${files.length} file(s):\n`);

      // Find max widths for table formatting
      const maxPathWidth = Math.max(
        "File Path".length,
        ...files.map((f) => (f.path ?? "").length),
      );

      // Print header
      console.log(`${"File Path".padEnd(maxPathWidth)} | Learnings | Mistakes`);
      console.log(`${"-".repeat(maxPathWidth)}-+-----------+----------`);

      // Print rows
      for (const file of files) {
        const path = file.path ?? "(unknown)";
        console.log(
          `${path.padEnd(maxPathWidth)} | ${String(file.learnings).padStart(9)} | ${String(file.mistakes).padStart(8)}`,
        );
      }
    }
  } else if (command === "stats") {
    // knowledge stats
    const db = getDatabase();

    // Entity counts by type
    const entityCountsSql = `
      SELECT type, COUNT(*) as count
      FROM entities
      WHERE type IN ('Learning', 'Pattern', 'Mistake', 'CodeArea', 'File', 'Topic')
      GROUP BY type
      ORDER BY count DESC
    `;

    interface EntityCountRow {
      type: string;
      count: number;
    }

    const entityCounts = db.query<EntityCountRow, []>(entityCountsSql).all();

    // Relationship counts by type
    const relationshipCountsSql = `
      SELECT type, COUNT(*) as count
      FROM relationships
      GROUP BY type
      ORDER BY count DESC
    `;

    interface RelationshipCountRow {
      type: string;
      count: number;
    }

    const relationshipCounts = db
      .query<RelationshipCountRow, []>(relationshipCountsSql)
      .all();

    // Date range
    const dateRangeSql = `
      SELECT
        MIN(created_at) as oldest,
        MAX(created_at) as newest
      FROM entities
    `;

    interface DateRangeRow {
      oldest: string | null;
      newest: string | null;
    }

    const dateRange = db.query<DateRangeRow, []>(dateRangeSql).get();

    // Most active code areas
    const topAreasSql = `
      SELECT
        json_extract(e.data, '$.name') as name,
        COUNT(DISTINCT r1.from_id) as total
      FROM entities e
      LEFT JOIN relationships r1 ON r1.to_id = e.id AND r1.type IN ('ABOUT', 'APPLIES_TO')
      WHERE e.type = 'CodeArea'
      GROUP BY name
      ORDER BY total DESC
      LIMIT 5
    `;

    interface TopAreaRow {
      name: string;
      total: number;
    }

    const topAreas = db.query<TopAreaRow, []>(topAreasSql).all();

    // Most referenced files
    const topFilesSql = `
      SELECT
        json_extract(e.data, '$.path') as path,
        COUNT(DISTINCT r1.from_id) as total
      FROM entities e
      LEFT JOIN relationships r1 ON r1.to_id = e.id AND r1.type = 'IN_FILE'
      WHERE e.type = 'File'
      GROUP BY path
      ORDER BY total DESC
      LIMIT 5
    `;

    interface TopFileRow {
      path: string;
      total: number;
    }

    const topFiles = db.query<TopFileRow, []>(topFilesSql).all();

    // Print stats
    console.log("Knowledge Graph Statistics");
    console.log("==========================\n");

    // Entity counts
    console.log("Entities:");
    const totalEntities = entityCounts.reduce((sum, row) => sum + row.count, 0);
    console.log(`  Total: ${totalEntities}`);
    for (const row of entityCounts) {
      console.log(`  ${row.type}: ${row.count}`);
    }

    // Relationship counts
    console.log("\nRelationships:");
    const totalRelationships = relationshipCounts.reduce(
      (sum, row) => sum + row.count,
      0,
    );
    console.log(`  Total: ${totalRelationships}`);
    for (const row of relationshipCounts) {
      console.log(`  ${row.type}: ${row.count}`);
    }

    // Date range
    if (dateRange && dateRange.oldest && dateRange.newest) {
      console.log("\nDate Range:");
      console.log(`  Oldest: ${dateRange.oldest}`);
      console.log(`  Newest: ${dateRange.newest}`);
    }

    // Top areas
    if (topAreas.length > 0) {
      console.log("\nMost Active Code Areas:");
      for (const area of topAreas) {
        console.log(`  ${area.name ?? "(unnamed)"}: ${area.total} references`);
      }
    }

    // Top files
    if (topFiles.length > 0) {
      console.log("\nMost Referenced Files:");
      for (const file of topFiles) {
        console.log(`  ${file.path ?? "(unknown)"}: ${file.total} references`);
      }
    }
  } else {
    throw new Error(`Unknown knowledge command: ${command}`);
  }
}
