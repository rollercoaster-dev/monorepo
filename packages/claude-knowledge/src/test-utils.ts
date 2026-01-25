/**
 * Test utilities for claude-knowledge package.
 */

import { unlink } from "fs/promises";

/**
 * Clean up a SQLite database file and its WAL mode auxiliary files.
 * WAL mode creates -wal and -shm files that must be deleted along with the main DB.
 *
 * @param dbPath - Path to the main database file
 */
export async function cleanupTestDb(dbPath: string): Promise<void> {
  for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    try {
      await unlink(file);
    } catch {
      // Ignore if file doesn't exist
    }
  }
}
