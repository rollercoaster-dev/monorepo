import { getDatabase } from "../db/sqlite";
import type { ContextMetrics, ReviewFindingsSummary } from "../types";
import { workflow } from "./workflow";

/**
 * Calculate workflow duration from action timestamps.
 * Returns duration in minutes, or null if no actions exist.
 */
function calculateWorkflowDuration(workflowId: string): number | null {
  const db = getDatabase();

  type DurationRow = {
    start: string | null;
    end: string | null;
  };

  const result = db
    .query<DurationRow, [string]>(
      `
        SELECT MIN(created_at) as start, MAX(created_at) as end
        FROM actions WHERE workflow_id = ?
      `,
    )
    .get(workflowId);

  if (!result || !result.start || !result.end) {
    return null;
  }

  const startMs = new Date(result.start).getTime();
  const endMs = new Date(result.end).getTime();
  if (isNaN(startMs) || isNaN(endMs)) {
    return null;
  }
  return Math.round((endMs - startMs) / 60000);
}

/**
 * Save context metrics for dogfooding validation.
 * Uses INSERT OR REPLACE to handle updates for the same session.
 */
function saveContextMetrics(metrics: Omit<ContextMetrics, "id">): void {
  const db = getDatabase();

  // Serialize review findings - can be number or ReviewFindingsSummary
  const reviewFindingsStr =
    typeof metrics.reviewFindings === "number"
      ? String(metrics.reviewFindings)
      : JSON.stringify(metrics.reviewFindings);

  // If duration not provided, try to calculate from workflow actions
  let durationMinutes = metrics.durationMinutes;
  if (durationMinutes == null && metrics.issueNumber) {
    // Try to find workflow by issue number and calculate duration from actions
    const workflowData = workflow.findByIssue(metrics.issueNumber);
    if (workflowData) {
      const calculated = calculateWorkflowDuration(workflowData.workflow.id);
      if (calculated !== null) {
        durationMinutes = calculated;
      }
    }
  }

  db.run(
    `
      INSERT OR REPLACE INTO context_metrics (
        session_id, issue_number, files_read, compacted,
        duration_minutes, review_findings, learnings_injected,
        learnings_captured, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      metrics.sessionId,
      metrics.issueNumber ?? null,
      metrics.filesRead,
      metrics.compacted ? 1 : 0,
      durationMinutes ?? null,
      reviewFindingsStr,
      metrics.learningsInjected,
      metrics.learningsCaptured,
      metrics.createdAt,
    ],
  );
}

/**
 * Get all context metrics, optionally filtered by issue number.
 * Returns most recent first, limited to 100 results.
 */
function getContextMetrics(issueNumber?: number): ContextMetrics[] {
  const db = getDatabase();

  type MetricsRow = {
    id: number;
    session_id: string;
    issue_number: number | null;
    files_read: number;
    compacted: number;
    duration_minutes: number | null;
    review_findings: string; // Changed to string to handle both formats
    learnings_injected: number;
    learnings_captured: number;
    created_at: string;
  };

  let rows: MetricsRow[];

  if (issueNumber !== undefined) {
    rows = db
      .query<MetricsRow, [number]>(
        `
        SELECT id, session_id, issue_number, files_read, compacted,
               duration_minutes, review_findings, learnings_injected,
               learnings_captured, created_at
        FROM context_metrics
        WHERE issue_number = ?
        ORDER BY created_at DESC
        LIMIT 100
      `,
      )
      .all(issueNumber);
  } else {
    rows = db
      .query<MetricsRow, []>(
        `
        SELECT id, session_id, issue_number, files_read, compacted,
               duration_minutes, review_findings, learnings_injected,
               learnings_captured, created_at
        FROM context_metrics
        ORDER BY created_at DESC
        LIMIT 100
      `,
      )
      .all();
  }

  return rows.map((row) => {
    // Deserialize review findings - handle both legacy integer and JSON
    let reviewFindings: ReviewFindingsSummary | number;
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(row.review_findings);
      if (typeof parsed === "object" && parsed !== null && "total" in parsed) {
        reviewFindings = parsed as ReviewFindingsSummary;
      } else {
        // Legacy integer stored as JSON number
        reviewFindings = Number(parsed);
      }
    } catch {
      // Not JSON - parse as integer (legacy format)
      reviewFindings = parseInt(row.review_findings, 10) || 0;
    }

    return {
      id: row.id,
      sessionId: row.session_id,
      issueNumber: row.issue_number ?? undefined,
      filesRead: row.files_read,
      compacted: Boolean(row.compacted),
      durationMinutes: row.duration_minutes ?? undefined,
      reviewFindings,
      learningsInjected: row.learnings_injected,
      learningsCaptured: row.learnings_captured,
      createdAt: row.created_at,
    };
  });
}

/**
 * Get aggregated metrics summary for dogfooding analysis.
 * Returns counts, averages, and totals across all sessions.
 */
function getMetricsSummary(): {
  totalSessions: number;
  compactedSessions: number;
  avgFilesRead: number;
  avgLearningsInjected: number;
  avgLearningsCaptured: number;
  totalReviewFindings: number;
} {
  const db = getDatabase();

  type SummaryRow = {
    total_sessions: number;
    compacted_sessions: number;
    avg_files_read: number;
    avg_learnings_injected: number;
    avg_learnings_captured: number;
  };

  const row = db
    .query<SummaryRow, []>(
      `
      SELECT
        COUNT(*) as total_sessions,
        SUM(compacted) as compacted_sessions,
        AVG(files_read) as avg_files_read,
        AVG(learnings_injected) as avg_learnings_injected,
        AVG(learnings_captured) as avg_learnings_captured
      FROM context_metrics
    `,
    )
    .get();

  // Handle empty table case
  if (!row || row.total_sessions === 0) {
    return {
      totalSessions: 0,
      compactedSessions: 0,
      avgFilesRead: 0,
      avgLearningsInjected: 0,
      avgLearningsCaptured: 0,
      totalReviewFindings: 0,
    };
  }

  // Calculate total review findings by querying all rows directly
  // (getContextMetrics limits to 100, but summary should include all)
  // This handles both legacy integer and structured JSON formats
  type ReviewFindingsRow = { review_findings: string };
  const reviewRows = db
    .query<ReviewFindingsRow, []>(`SELECT review_findings FROM context_metrics`)
    .all();

  let totalReviewFindings = 0;
  for (const r of reviewRows) {
    try {
      const parsed = JSON.parse(r.review_findings);
      if (typeof parsed === "object" && parsed !== null && "total" in parsed) {
        totalReviewFindings += (parsed as ReviewFindingsSummary).total;
      } else {
        totalReviewFindings += Number(parsed) || 0;
      }
    } catch {
      totalReviewFindings += parseInt(r.review_findings, 10) || 0;
    }
  }

  return {
    totalSessions: row.total_sessions,
    compactedSessions: row.compacted_sessions ?? 0,
    avgFilesRead: Math.round((row.avg_files_read ?? 0) * 10) / 10,
    avgLearningsInjected:
      Math.round((row.avg_learnings_injected ?? 0) * 10) / 10,
    avgLearningsCaptured:
      Math.round((row.avg_learnings_captured ?? 0) * 10) / 10,
    totalReviewFindings,
  };
}

export const metrics = {
  saveContextMetrics,
  getContextMetrics,
  getMetricsSummary,
  calculateWorkflowDuration,
};
