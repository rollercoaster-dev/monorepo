/**
 * CLI commands for documentation indexing.
 *
 * Provides commands to:
 * - Index documentation files/directories
 * - Check indexing status of files
 * - Clean orphaned doc sections
 */

import { statSync } from "fs";
import { Buffer } from "buffer";
import { getDatabase } from "../db/sqlite";
import {
  indexDocument,
  indexDirectory,
  searchDocs,
  getDocsForCode,
} from "../docs";
import {
  indexExternalDoc,
  getSpecDefinition,
  SPEC_DEFINITIONS,
} from "../docs/external";
import type { DocSection, CodeDoc } from "../types";

/**
 * Handle docs CLI commands.
 *
 * Commands:
 * - index <file-or-directory> [--force]: Index file or directory
 * - status <file>: Show indexing status (hash, last indexed time)
 * - clean: Remove orphaned DocSection entities (files no longer exist)
 *
 * @param command - The docs subcommand (index, status, clean)
 * @param args - Command arguments
 */
export async function handleDocsCommands(
  command: string,
  args: string[],
): Promise<void> {
  if (command === "index") {
    await handleIndexCommand(args);
  } else if (command === "status") {
    await handleStatusCommand(args);
  } else if (command === "clean") {
    await handleCleanCommand();
  } else if (command === "search") {
    await handleSearchCommand(args);
  } else if (command === "for-code") {
    await handleForCodeCommand(args);
  } else if (command === "index-external") {
    await handleIndexExternalCommand(args);
  } else {
    throw new Error(
      `Unknown docs command: ${command}. Available: index, status, clean, search, for-code, index-external`,
    );
  }
}

/**
 * Handle the `docs index` command.
 * Index a file or directory, optionally forcing re-index.
 */
async function handleIndexCommand(args: string[]): Promise<void> {
  const flags = args.filter((arg) => arg.startsWith("--"));
  const positionals = args.filter((arg) => !arg.startsWith("--"));

  if (positionals.length === 0) {
    throw new Error("Usage: docs index <file-or-directory> [--force]");
  }

  const path = positionals[0];
  const force = flags.includes("--force");

  // Check if path exists and is file or directory
  let stat;
  try {
    stat = statSync(path);
  } catch {
    throw new Error(`Path not found: ${path}`);
  }

  const isDirectory = stat.isDirectory();

  // eslint-disable-next-line no-console
  console.log(`Indexing ${isDirectory ? "directory" : "file"}: ${path}`);
  // eslint-disable-next-line no-console
  console.log(
    force ? "(force re-index enabled)" : "(skipping unchanged files)",
  );

  if (isDirectory) {
    const result = await indexDirectory(path, { force });
    // eslint-disable-next-line no-console
    console.log(`\nResults:`);
    // eslint-disable-next-line no-console
    console.log(`  Files indexed: ${result.filesIndexed}`);
    // eslint-disable-next-line no-console
    console.log(`  Files skipped: ${result.filesSkipped}`);
    // eslint-disable-next-line no-console
    console.log(`  Files failed: ${result.filesFailed}`);
    // eslint-disable-next-line no-console
    console.log(`  Total sections: ${result.totalSections}`);

    if (result.failures.length > 0) {
      console.error(`\nFailed files:`);
      for (const failure of result.failures) {
        console.error(`  ${failure.path}: ${failure.error}`);
      }
    }
  } else {
    const result = await indexDocument(path, { force });
    // eslint-disable-next-line no-console
    console.log(`\nResults:`);
    // eslint-disable-next-line no-console
    console.log(`  Status: ${result.status}`);
    // eslint-disable-next-line no-console
    console.log(`  Sections indexed: ${result.sectionsIndexed}`);
    // eslint-disable-next-line no-console
    console.log(`  Code entities linked: ${result.linkedToCode}`);
    // eslint-disable-next-line no-console
    console.log(`  Cross-refs created: ${result.crossRefsCreated}`);
  }
}

/**
 * Handle the `docs status` command.
 * Show indexing status for a specific file.
 */
async function handleStatusCommand(args: string[]): Promise<void> {
  if (args.length === 0) {
    throw new Error("Usage: docs status <file>");
  }

  const filePath = args[0];
  const db = getDatabase();

  const indexRecord = db
    .query<
      { file_path: string; content_hash: string; indexed_at: string },
      [string]
    >("SELECT file_path, content_hash, indexed_at FROM doc_index WHERE file_path = ?")
    .get(filePath);

  if (!indexRecord) {
    // eslint-disable-next-line no-console
    console.log(`File not indexed: ${filePath}`);
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`Indexing status for: ${filePath}`);
  // eslint-disable-next-line no-console
  console.log(`  Content hash: ${indexRecord.content_hash}`);
  // eslint-disable-next-line no-console
  console.log(`  Last indexed: ${indexRecord.indexed_at}`);

  // Count sections for this file
  const fileEntityId = `file-${Buffer.from(filePath).toString("base64url")}`;
  const sectionCount = db
    .query<
      { count: number },
      [string]
    >("SELECT COUNT(*) as count FROM relationships WHERE to_id = ? AND type = 'IN_DOC'")
    .get(fileEntityId);

  // eslint-disable-next-line no-console
  console.log(`  Sections indexed: ${sectionCount?.count ?? 0}`);
}

/**
 * Handle the `docs clean` command.
 * Remove orphaned DocSection entities where the file no longer exists.
 */
async function handleCleanCommand(): Promise<void> {
  const db = getDatabase();

  // Get all DocSection entities
  const docSections = db
    .query<
      { id: string; data: string },
      []
    >("SELECT id, data FROM entities WHERE type = 'DocSection'")
    .all();

  // Collect IDs to delete (check file existence first, outside transaction)
  const sectionsToDelete: string[] = [];
  for (const section of docSections) {
    try {
      const data = JSON.parse(section.data) as { filePath: string };
      if (typeof data.filePath !== "string") {
        sectionsToDelete.push(section.id);
        continue;
      }
      const file = Bun.file(data.filePath);
      const exists = await file.exists();
      if (!exists) {
        sectionsToDelete.push(section.id);
      }
    } catch {
      // Corrupted data, mark for deletion
      sectionsToDelete.push(section.id);
    }
  }

  // Also collect doc_index entries for files that no longer exist
  const indexEntries = db
    .query<{ file_path: string }, []>("SELECT file_path FROM doc_index")
    .all();

  const indexEntriesToDelete: string[] = [];
  for (const entry of indexEntries) {
    const file = Bun.file(entry.file_path);
    const exists = await file.exists();
    if (!exists) {
      indexEntriesToDelete.push(entry.file_path);
    }
  }

  // Perform deletions within a transaction for atomicity
  db.run("BEGIN TRANSACTION");
  try {
    for (const sectionId of sectionsToDelete) {
      db.run("DELETE FROM entities WHERE id = ?", [sectionId]);
    }
    for (const filePath of indexEntriesToDelete) {
      db.run("DELETE FROM doc_index WHERE file_path = ?", [filePath]);
    }
    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  }

  // eslint-disable-next-line no-console
  console.log(`Cleaned orphaned documentation:`);
  // eslint-disable-next-line no-console
  console.log(`  DocSection entities removed: ${sectionsToDelete.length}`);
  // eslint-disable-next-line no-console
  console.log(`  Index entries removed: ${indexEntriesToDelete.length}`);
}

/**
 * Handle the `docs search` command.
 * Semantic search over indexed documentation.
 */
async function handleSearchCommand(args: string[]): Promise<void> {
  const query = args.join(" ");
  if (!query) {
    throw new Error("Usage: docs search <query>");
  }

  // eslint-disable-next-line no-console
  console.log(`Searching documentation for: "${query}"\n`);

  const results = await searchDocs(query, { limit: 5 });

  if (results.length === 0) {
    // eslint-disable-next-line no-console
    console.log("No matching documentation found.");
    return;
  }

  for (const result of results) {
    const { section, similarity, location, entityType } = result;

    const heading =
      entityType === "DocSection"
        ? (section as DocSection).heading || "(No heading)"
        : `CodeDoc: ${(section as CodeDoc).entityId}`;

    // eslint-disable-next-line no-console
    console.log(`\n## ${heading}`);
    // eslint-disable-next-line no-console
    console.log(`   Location: ${location}`);
    // eslint-disable-next-line no-console
    console.log(`   Similarity: ${(similarity * 100).toFixed(1)}%`);

    // Show preview
    const content =
      entityType === "DocSection"
        ? (section as DocSection).content
        : (section as CodeDoc).description || (section as CodeDoc).content;
    const preview = content.slice(0, 200);
    // eslint-disable-next-line no-console
    console.log(`   ${preview}${content.length > 200 ? "..." : ""}`);
  }
}

/**
 * Handle the `docs for-code` command.
 * Find documentation linked to a specific code entity.
 */
async function handleForCodeCommand(args: string[]): Promise<void> {
  if (args.length === 0) {
    throw new Error("Usage: docs for-code <entity-id>");
  }

  const entityId = args[0];
  // eslint-disable-next-line no-console
  console.log(`Finding documentation for entity: ${entityId}\n`);

  const docs = getDocsForCode(entityId);

  if (docs.length === 0) {
    // eslint-disable-next-line no-console
    console.log("No documentation linked to this entity.");
    return;
  }

  for (const doc of docs) {
    const { section, location, entityType } = doc;

    const heading =
      entityType === "DocSection"
        ? (section as DocSection).heading || "(No heading)"
        : "JSDoc";

    // eslint-disable-next-line no-console
    console.log(`\n## ${heading}`);
    // eslint-disable-next-line no-console
    console.log(`   Location: ${location}`);

    if (entityType === "CodeDoc") {
      // eslint-disable-next-line no-console
      console.log(`\n${(section as CodeDoc).content}`);
    }
  }
}

/**
 * Handle the `docs index-external` command.
 * Index external specification documentation (OB2, OB3, VC, etc.).
 */
async function handleIndexExternalCommand(args: string[]): Promise<void> {
  const flags = args.filter((arg) => arg.startsWith("--"));
  const positionals = args.filter((arg) => !arg.startsWith("--"));

  const indexAll = flags.includes("--all");

  if (!indexAll && positionals.length === 0) {
    // eslint-disable-next-line no-console
    console.log("Usage: docs index-external <spec-name> | --all");
    // eslint-disable-next-line no-console
    console.log("\nAvailable specs:");
    for (const [name, spec] of Object.entries(SPEC_DEFINITIONS)) {
      // eslint-disable-next-line no-console
      console.log(
        `  ${name}: ${spec.url}${spec.specVersion ? ` (v${spec.specVersion})` : ""}`,
      );
    }
    return;
  }

  const specsToIndex = indexAll ? Object.keys(SPEC_DEFINITIONS) : positionals;

  for (const specName of specsToIndex) {
    const spec = getSpecDefinition(specName);
    if (!spec) {
      console.error(`Unknown spec: ${specName}`);
      continue;
    }

    // eslint-disable-next-line no-console
    console.log(`\nIndexing external doc: ${specName}`);
    // eslint-disable-next-line no-console
    console.log(`  URL: ${spec.url}`);
    // eslint-disable-next-line no-console
    console.log(`  Version: ${spec.specVersion ?? "unspecified"}`);

    try {
      const result = await indexExternalDoc(spec);
      // eslint-disable-next-line no-console
      console.log(`  Status: ${result.status}`);
      // eslint-disable-next-line no-console
      console.log(`  Sections indexed: ${result.sectionsIndexed}`);
    } catch (error) {
      console.error(
        `  Failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
