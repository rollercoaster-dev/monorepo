import { useMemo } from "react";
import { useQuery } from "@evolu/react";
import {
  evidenceByGoalQuery,
  stepEvidenceByGoalQuery,
  EvidenceType,
  type GoalId,
} from "../db";
import { validateEvidenceType } from "../types/evidence";
import type { Evidence } from "../components/EvidenceThumbnail";

export type EvidenceSource = "step" | "goal";

export interface ViewerEvidence extends Evidence {
  source: EvidenceSource;
  stepId: string | null;
  stepTitle: string | null;
}

/**
 * Combined evidence list for a goal, ordered to mirror the Timeline's visual
 * order: step evidence (by step.ordinal asc, then createdAt desc within a
 * step), followed by goal-level evidence (createdAt desc). The thumbnail
 * strip in the viewer reads this order so users see a horizontal restatement
 * of the journey they just scrolled.
 */
export function useAllEvidenceForGoal(goalId: GoalId): ViewerEvidence[] {
  const stepEvidenceRows = useQuery(stepEvidenceByGoalQuery(goalId));
  const goalEvidenceRows = useQuery(evidenceByGoalQuery(goalId));

  return useMemo(() => {
    const stepItems = stepEvidenceRows
      .filter((row) => row.stepId != null)
      .map((row) => ({
        item: {
          id: row.id,
          title: row.description ?? row.type ?? "Evidence",
          type: validateEvidenceType((row.type ?? EvidenceType.file) as string),
          uri: row.uri ?? undefined,
          metadata: row.metadata ?? undefined,
          source: "step" as const,
          stepId: row.stepId,
          stepTitle: (row.stepTitle as string | null) ?? null,
        } satisfies ViewerEvidence,
        ordinal: (row.stepOrdinal as number | null) ?? Number.MAX_SAFE_INTEGER,
      }));

    // Stable sort by ordinal preserves the createdAt-desc secondary order
    // already enforced by stepEvidenceByGoalQuery.
    stepItems.sort((a, b) => a.ordinal - b.ordinal);

    const goalItems: ViewerEvidence[] = goalEvidenceRows.map((row) => ({
      id: row.id,
      title: row.description ?? row.type ?? "Evidence",
      type: validateEvidenceType((row.type ?? EvidenceType.file) as string),
      uri: row.uri ?? undefined,
      metadata: row.metadata ?? undefined,
      source: "goal" as const,
      stepId: null,
      stepTitle: null,
    }));

    return [...stepItems.map((s) => s.item), ...goalItems];
  }, [stepEvidenceRows, goalEvidenceRows]);
}
