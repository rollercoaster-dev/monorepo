import { getDatabase } from "../db/sqlite";

/**
 * Database query helpers to reduce boilerplate in tests
 */

export const db = () => getDatabase();

export const getEntity = (id: string) =>
  db()
    .query<
      { id: string; type: string; data: string },
      [string]
    >("SELECT * FROM entities WHERE id = ?")
    .get(id);

export const getEntitiesByType = (type: string) =>
  db()
    .query<
      { id: string; type: string },
      [string]
    >("SELECT id, type FROM entities WHERE type = ?")
    .all(type);

export const getRels = (fromId: string, type: string) =>
  db()
    .query<
      { from_id: string; to_id: string; type: string },
      [string, string]
    >("SELECT * FROM relationships WHERE from_id = ? AND type = ?")
    .all(fromId, type);

export const getRelsTo = (toId: string, type: string) =>
  db()
    .query<
      { from_id: string },
      [string, string]
    >("SELECT from_id FROM relationships WHERE to_id = ? AND type = ?")
    .all(toId, type);

export const countEntities = (type: string) =>
  db()
    .query<
      { count: number },
      [string]
    >("SELECT COUNT(*) as count FROM entities WHERE type = ?")
    .get(type)!.count;
