/**
 * Kysely query definitions for Goal CRUD
 */
import { NonEmptyString1000, dateToDateIso, sqliteTrue } from '@evolu/common';
import { evolu } from './evolu';
import { GoalId, GoalStatus } from './schema';

/** All non-deleted goals, ordered by createdAt descending */
export const goalsQuery = evolu.createQuery((db) =>
  db
    .selectFrom('goal')
    .selectAll()
    .where('isDeleted', 'is', null)
    .orderBy('createdAt', 'desc'),
);

export function createGoal(title: string) {
  const parsedTitle = NonEmptyString1000.orNull(title.trim());
  if (!parsedTitle) return null;

  const parsedStatus = NonEmptyString1000.orThrow(GoalStatus.active);

  return evolu.insert('goal', {
    title: parsedTitle,
    status: parsedStatus,
  });
}

export function updateGoal(
  id: GoalId,
  fields: { title?: string; description?: string | null },
) {
  const update: Record<string, unknown> = { id };

  if (fields.title !== undefined) {
    const parsed = NonEmptyString1000.orNull(fields.title.trim());
    if (!parsed) return null;
    update.title = parsed;
  }

  if (fields.description !== undefined) {
    if (fields.description === null) {
      update.description = null;
    } else {
      const parsed = NonEmptyString1000.orNull(fields.description.trim());
      if (!parsed) return null;
      update.description = parsed;
    }
  }

  return evolu.update('goal', update as Parameters<typeof evolu.update>[1]);
}

export function completeGoal(id: GoalId) {
  const parsedStatus = NonEmptyString1000.orThrow(GoalStatus.completed);
  const now = dateToDateIso(new Date());
  if (!now.ok) return null;

  return evolu.update('goal', {
    id,
    status: parsedStatus,
    completedAt: now.value,
  });
}

export function uncompleteGoal(id: GoalId) {
  const parsedStatus = NonEmptyString1000.orThrow(GoalStatus.active);

  return evolu.update('goal', {
    id,
    status: parsedStatus,
    completedAt: null,
  });
}

export function deleteGoal(id: GoalId) {
  return evolu.update('goal', { id, isDeleted: sqliteTrue });
}
