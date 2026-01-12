import { getDatabase } from "../db/sqlite";
import type {
  ContextMetrics,
  GraphQueryMetrics,
  ReviewFindingsSummary,
} from "../types";
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

// ============================================================================
// Graph Query Metrics Functions
// ============================================================================

/**
 * Log a graph query execution for baseline metrics tracking.
 * Called automatically by instrumented graph CLI commands.
 */
function logGraphQuery(params: {
  sessionId: string;
  workflowId?: string;
  queryType: string;
  queryParams: string;
  resultCount: number;
  durationMs: number;
}): void {
  const db = getDatabase();

  db.run(
    `
    INSERT INTO graph_queries (
      session_id, workflow_id, query_type, query_params,
      result_count, duration_ms, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      params.sessionId,
      params.workflowId ?? null,
      params.queryType,
      params.queryParams,
      params.resultCount,
      params.durationMs,
      new Date().toISOString(),
    ],
  );
}

/**
 * Get graph query metrics with optional filtering.
 * Returns most recent first, limited to 100 results.
 */
function getGraphQueries(filters?: {
  sessionId?: string;
  workflowId?: string;
  queryType?: string;
}): GraphQueryMetrics[] {
  const db = getDatabase();

  type QueryRow = {
    id: number;
    session_id: string;
    workflow_id: string | null;
    query_type: string;
    query_params: string | null;
    result_count: number;
    duration_ms: number;
    created_at: string;
  };

  // Build query with optional filters
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters?.sessionId) {
    conditions.push("session_id = ?");
    params.push(filters.sessionId);
  }
  if (filters?.workflowId) {
    conditions.push("workflow_id = ?");
    params.push(filters.workflowId);
  }
  if (filters?.queryType) {
    conditions.push("query_type = ?");
    params.push(filters.queryType);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = db
    .query<QueryRow, (string | number)[]>(
      `
      SELECT id, session_id, workflow_id, query_type, query_params,
             result_count, duration_ms, created_at
      FROM graph_queries
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT 100
    `,
    )
    .all(...params);

  return rows.map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    workflowId: row.workflow_id ?? undefined,
    queryType: row.query_type,
    queryParams: row.query_params ?? "",
    resultCount: row.result_count,
    durationMs: row.duration_ms,
    createdAt: row.created_at,
  }));
}

/**
 * Get aggregated summary of graph query usage.
 * Useful for baseline analysis and measuring graph effectiveness.
 */
function getGraphQuerySummary(): {
  totalQueries: number;
  queriesByType: Record<string, number>;
  avgResultCount: number;
  avgDurationMs: number;
} {
  const db = getDatabase();

  // Get totals and averages
  type SummaryRow = {
    total_queries: number;
    avg_result_count: number;
    avg_duration_ms: number;
  };

  const summary = db
    .query<SummaryRow, []>(
      `
      SELECT
        COUNT(*) as total_queries,
        AVG(result_count) as avg_result_count,
        AVG(duration_ms) as avg_duration_ms
      FROM graph_queries
    `,
    )
    .get();

  // Get counts by query type
  type TypeCountRow = { query_type: string; count: number };
  const typeCounts = db
    .query<TypeCountRow, []>(
      `
      SELECT query_type, COUNT(*) as count
      FROM graph_queries
      GROUP BY query_type
      ORDER BY count DESC
    `,
    )
    .all();

  const queriesByType: Record<string, number> = {};
  for (const row of typeCounts) {
    queriesByType[row.query_type] = row.count;
  }

  return {
    totalQueries: summary?.total_queries ?? 0,
    queriesByType,
    avgResultCount: Math.round((summary?.avg_result_count ?? 0) * 10) / 10,
    avgDurationMs: Math.round((summary?.avg_duration_ms ?? 0) * 10) / 10,
  };
}

export const metrics = {
  saveContextMetrics,
  getContextMetrics,
  getMetricsSummary,
  calculateWorkflowDuration,
  logGraphQuery,
  getGraphQueries,
  getGraphQuerySummary,
};
