import { useMemo } from "react";
import { useQuery } from "@evolu/react";
import {
  evidenceByGoalQuery,
  stepEvidenceByGoalQuery,
  stepsByGoalQuery,
  type GoalId,
} from "../db";
import { validateEvidenceType } from "../types/evidence";
import type { Evidence } from "../components/EvidenceThumbnail";

/**
 * One evidence item augmented with the source context the viewer needs:
 * which step it belongs to (or null for goal-level), and that step's
 * title for accessibility announcements.
 */
export interface ViewerEvidence extends Evidence {
  source: "step" | "goal";
  stepId: string | null;
  stepTitle: string | null;
}

/**
 * Combined evidence list for a goal, ordered to mirror the Timeline's
 * visual order: step evidence first (by step.ordinal ascending, then
 * createdAt DESC within a step), followed by goal-level evidence
 * (createdAt DESC).
 *
 * The thumbnail strip in the viewer reads this order top-to-bottom,
 * so users see a horizontal restatement of the journey they just scrolled.
 */
export function useAllEvidenceForGoal(goalId: GoalId): ViewerEvidence[] {
  const stepRows = useQuery(stepsByGoalQuery(goalId));
  const stepEvidenceRows = useQuery(stepEvidenceByGoalQuery(goalId));
  const goalEvidenceRows = useQuery(evidenceByGoalQuery(goalId));

  return useMemo(() => {
    const stepOrdinal = new Map<string, number>();
    const stepTitle = new Map<string, string>();
    stepRows.forEach((s, idx) => {
      stepOrdinal.set(s.id, s.ordinal ?? idx);
      stepTitle.set(s.id, s.title ?? "");
    });

    const stepItems: ViewerEvidence[] = stepEvidenceRows
      .filter((row) => row.stepId != null)
      .map((row) => ({
        id: row.id,
        title: row.description ?? row.type ?? "Evidence",
        type: validateEvidenceType((row.type ?? "file") as string),
        uri: row.uri ?? undefined,
        metadata: row.metadata ?? undefined,
        source: "step" as const,
        stepId: row.stepId,
        stepTitle:
          stepTitle.get(row.stepId ?? "") ??
          (row.stepTitle as string | null) ??
          null,
      }));

    // Sort step items: by ordinal asc, then createdAt desc within step.
    // stepEvidenceByGoalQuery already orders by createdAt desc, so a stable
    // sort by ordinal preserves that secondary ordering.
    stepItems.sort((a, b) => {
      const oa = stepOrdinal.get(a.stepId ?? "") ?? Number.MAX_SAFE_INTEGER;
      const ob = stepOrdinal.get(b.stepId ?? "") ?? Number.MAX_SAFE_INTEGER;
      return oa - ob;
    });

    const goalItems: ViewerEvidence[] = goalEvidenceRows.map((row) => ({
      id: row.id,
      title: row.description ?? row.type ?? "Evidence",
      type: validateEvidenceType((row.type ?? "file") as string),
      uri: row.uri ?? undefined,
      metadata: row.metadata ?? undefined,
      source: "goal" as const,
      stepId: null,
      stepTitle: null,
    }));

    return [...stepItems, ...goalItems];
  }, [stepRows, stepEvidenceRows, goalEvidenceRows]);
}
