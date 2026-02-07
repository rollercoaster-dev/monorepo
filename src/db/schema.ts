/**
 * Evolu schema — Goal table
 * Maps to docs/architecture/data-model.md Iteration A
 *
 * System columns (createdAt, updatedAt, isDeleted) are auto-added by Evolu.
 */
import { id, NonEmptyString1000, nullOr, DateIso } from '@evolu/common';

export const GoalId = id('Goal');
export type GoalId = typeof GoalId.Type;

export const GoalStatus = {
  active: 'active',
  completed: 'completed',
} as const;

export const Schema = {
  goal: {
    id: GoalId,
    title: NonEmptyString1000,
    description: nullOr(NonEmptyString1000),
    status: NonEmptyString1000, // 'active' | 'completed'
    completedAt: nullOr(DateIso),
  },
};
