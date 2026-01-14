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
import { indexDocument, indexDirectory } from "../docs";

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
  } else {
    throw new Error(
      `Unknown docs command: ${command}. Available: index, status, clean`,
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
    console.log(`  Total sections: ${result.totalSections}`);
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

  let removedCount = 0;

  for (const section of docSections) {
    const data = JSON.parse(section.data) as { filePath: string };
    const file = Bun.file(data.filePath);
    const exists = await file.exists();

    if (!exists) {
      // Remove entity (relationships will cascade delete due to FK constraint)
      db.run("DELETE FROM entities WHERE id = ?", [section.id]);
      removedCount++;
    }
  }

  // Also clean up doc_index entries for files that no longer exist
  const indexEntries = db
    .query<{ file_path: string }, []>("SELECT file_path FROM doc_index")
    .all();

  let indexEntriesRemoved = 0;

  for (const entry of indexEntries) {
    const file = Bun.file(entry.file_path);
    const exists = await file.exists();

    if (!exists) {
      db.run("DELETE FROM doc_index WHERE file_path = ?", [entry.file_path]);
      indexEntriesRemoved++;
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Cleaned orphaned documentation:`);
  // eslint-disable-next-line no-console
  console.log(`  DocSection entities removed: ${removedCount}`);
  // eslint-disable-next-line no-console
  console.log(`  Index entries removed: ${indexEntriesRemoved}`);
}
