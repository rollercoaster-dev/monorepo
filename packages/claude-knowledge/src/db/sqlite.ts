import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

let db: Database | null = null;

const DEFAULT_DB_PATH = ".claude/execution-state.db";

export function getDatabase(dbPath: string = DEFAULT_DB_PATH): Database {
  if (db) return db;

  db = new Database(dbPath, { create: true });
  // Enable foreign keys
  db.run("PRAGMA foreign_keys = ON;");

  // Initialize schema
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const schemaPath = join(__dirname, "../../schema/sqlite.sql");
  const schema = readFileSync(schemaPath, "utf-8");

  // Run schema initialization
  for (const statement of schema.split(";").filter((s) => s.trim())) {
    db.run(statement);
  }

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function resetDatabase(dbPath: string = DEFAULT_DB_PATH): Database {
  closeDatabase();
  return getDatabase(dbPath);
}
