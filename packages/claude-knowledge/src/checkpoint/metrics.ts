import { getDatabase } from "../db/sqlite";
import type {
  ContextMetrics,
  GraphQueryMetrics,
  ReviewFindingsSummary,
  TaskMetrics,
  TaskProgress,
  TaskSnapshot,
  TaskTreeNode,
  WorkflowPhase,
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
 * Determine the source of a graph query from environment variables.
 * Returns a string indicating where the query originated.
 *
 * Priority order:
 * 1. CLAUDE_AGENT_NAME → "agent:{name}"
 * 2. CLAUDE_SKILL_NAME → "skill:{name}"
 * 3. GIT_HOOK_NAME → "hook:{name}"
 * 4. Default → "cli"
 */
function determineQuerySource(): string {
  if (process.env.CLAUDE_AGENT_NAME) {
    return `agent:${process.env.CLAUDE_AGENT_NAME}`;
  }
  if (process.env.CLAUDE_SKILL_NAME) {
    return `skill:${process.env.CLAUDE_SKILL_NAME}`;
  }
  if (process.env.GIT_HOOK_NAME) {
    return `hook:${process.env.GIT_HOOK_NAME}`;
  }
  return "cli";
}

/**
 * Log a graph query execution for baseline metrics tracking.
 * Called automatically by instrumented graph CLI commands.
 */
function logGraphQuery(params: {
  source: string;
  sessionId?: string;
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
      source, session_id, workflow_id, query_type, query_params,
      result_count, duration_ms, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      params.source,
      params.sessionId ?? null,
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
  source?: string;
}): GraphQueryMetrics[] {
  const db = getDatabase();

  type QueryRow = {
    id: number;
    source: string;
    session_id: string | null;
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
  if (filters?.source) {
    conditions.push("source = ?");
    params.push(filters.source);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = db
    .query<QueryRow, (string | number)[]>(
      `
      SELECT id, source, session_id, workflow_id, query_type, query_params,
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
    source: row.source,
    sessionId: row.session_id ?? undefined,
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
  queriesBySource: Record<string, number>;
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

  // Get counts by source
  type SourceCountRow = { source: string; count: number };
  const sourceCounts = db
    .query<SourceCountRow, []>(
      `
      SELECT source, COUNT(*) as count
      FROM graph_queries
      GROUP BY source
      ORDER BY count DESC
    `,
    )
    .all();

  const queriesBySource: Record<string, number> = {};
  for (const row of sourceCounts) {
    queriesBySource[row.source] = row.count;
  }

  return {
    totalQueries: summary?.total_queries ?? 0,
    queriesByType,
    queriesBySource,
    avgResultCount: Math.round((summary?.avg_result_count ?? 0) * 10) / 10,
    avgDurationMs: Math.round((summary?.avg_duration_ms ?? 0) * 10) / 10,
  };
}

// ============================================================================
// Tool Usage Metrics Functions
// ============================================================================

/**
 * Valid tool categories for classification.
 */
export type ToolCategory = "graph" | "search" | "read" | "write" | "other";

/**
 * Categorize a tool name into one of the predefined categories.
 * Used to classify Claude's tool usage for graph vs search comparison.
 */
function categorizeToolName(toolName: string): ToolCategory {
  // Graph tools (MCP and CLI)
  const graphTools = [
    "graph_find",
    "graph_what_calls",
    "graph_blast_radius",
    "mcp__claude-knowledge__graph_find",
    "mcp__claude-knowledge__graph_what_calls",
    "mcp__claude-knowledge__graph_blast_radius",
  ];
  if (graphTools.includes(toolName)) {
    return "graph";
  }

  // Search tools (Grep/Glob)
  const searchTools = ["Grep", "Glob", "grep", "glob"];
  if (searchTools.includes(toolName)) {
    return "search";
  }

  // Read tools (including knowledge queries)
  const readTools = [
    "Read",
    "read",
    "WebFetch",
    "WebSearch",
    "knowledge_query",
    "knowledge_search_similar",
    "mcp__claude-knowledge__knowledge_query",
    "mcp__claude-knowledge__knowledge_search_similar",
  ];
  if (readTools.includes(toolName)) {
    return "read";
  }

  // Write tools
  const writeTools = [
    "Write",
    "Edit",
    "write",
    "edit",
    "NotebookEdit",
    "knowledge_store",
    "mcp__claude-knowledge__knowledge_store",
  ];
  if (writeTools.includes(toolName)) {
    return "write";
  }

  // Explicitly categorize common tools as "other" for clarity
  // Bash, Task, LSP, TodoWrite, Skill, etc. are tracked but don't affect graph/search ratio
  return "other";
}

/**
 * Log a tool usage event for the current session.
 * Called by PreToolUse hook to track all tool calls.
 *
 * @param sessionId - The session identifier
 * @param toolName - Name of the tool being used
 */
function logToolUsage(sessionId: string, toolName: string): void {
  const db = getDatabase();
  const category = categorizeToolName(toolName);

  db.run(
    `
    INSERT INTO tool_usage (session_id, tool_name, tool_category, created_at)
    VALUES (?, ?, ?, ?)
    `,
    [sessionId, toolName, category, new Date().toISOString()],
  );
}

/**
 * Tool usage summary for a session.
 */
export interface ToolUsageSummary {
  sessionId: string;
  totalCalls: number;
  byCategory: Record<ToolCategory, number>;
  graphSearchRatio: number | null;
  topTools: Array<{ tool: string; count: number }>;
}

/**
 * Get tool usage summary for a session.
 * Returns counts by category and graph/search ratio.
 *
 * @param sessionId - The session to get stats for
 * @returns Tool usage summary with counts and ratio
 */
function getToolUsageSummary(sessionId: string): ToolUsageSummary {
  const db = getDatabase();

  // Get counts by category
  type CategoryRow = { tool_category: ToolCategory; count: number };
  const categoryRows = db
    .query<CategoryRow, [string]>(
      `
      SELECT tool_category, COUNT(*) as count
      FROM tool_usage
      WHERE session_id = ?
      GROUP BY tool_category
      `,
    )
    .all(sessionId);

  const byCategory: Record<ToolCategory, number> = {
    graph: 0,
    search: 0,
    read: 0,
    write: 0,
    other: 0,
  };

  let totalCalls = 0;
  for (const row of categoryRows) {
    byCategory[row.tool_category] = row.count;
    totalCalls += row.count;
  }

  // Calculate graph/search ratio (null if no searches)
  const graphSearchRatio =
    byCategory.search > 0 ? byCategory.graph / byCategory.search : null;

  // Get top tools
  type ToolRow = { tool_name: string; count: number };
  const toolRows = db
    .query<ToolRow, [string]>(
      `
      SELECT tool_name, COUNT(*) as count
      FROM tool_usage
      WHERE session_id = ?
      GROUP BY tool_name
      ORDER BY count DESC
      LIMIT 10
      `,
    )
    .all(sessionId);

  const topTools = toolRows.map((row) => ({
    tool: row.tool_name,
    count: row.count,
  }));

  return {
    sessionId,
    totalCalls,
    byCategory,
    graphSearchRatio,
    topTools,
  };
}

/**
 * Get aggregate tool usage stats across all sessions.
 * Combines data from both tool_usage (native tools via PreToolUse hook)
 * and graph_queries (MCP graph tools) for accurate graph vs search ratio.
 */
function getToolUsageAggregate(): {
  totalSessions: number;
  totalCalls: number;
  avgCallsPerSession: number;
  byCategory: Record<ToolCategory, number>;
  avgGraphSearchRatio: number | null;
} {
  const db = getDatabase();

  // Get total sessions and calls from tool_usage (native tools)
  type TotalsRow = {
    total_sessions: number;
    total_calls: number;
  };
  const toolUsageTotals = db
    .query<TotalsRow, []>(
      `
      SELECT
        COUNT(DISTINCT session_id) as total_sessions,
        COUNT(*) as total_calls
      FROM tool_usage
      `,
    )
    .get();

  // Get counts by category from tool_usage
  type CategoryRow = { tool_category: ToolCategory; count: number };
  const categoryRows = db
    .query<CategoryRow, []>(
      `
      SELECT tool_category, COUNT(*) as count
      FROM tool_usage
      GROUP BY tool_category
      `,
    )
    .all();

  const byCategory: Record<ToolCategory, number> = {
    graph: 0,
    search: 0,
    read: 0,
    write: 0,
    other: 0,
  };

  for (const row of categoryRows) {
    byCategory[row.tool_category] = row.count;
  }

  // Add graph queries from graph_queries table (MCP graph tools)
  // These don't go through PreToolUse hook, so we need to count them separately
  type GraphCountRow = { count: number };
  const graphQueryCount = db
    .query<GraphCountRow, []>(`SELECT COUNT(*) as count FROM graph_queries`)
    .get();

  byCategory.graph += graphQueryCount?.count ?? 0;

  // Calculate totals including graph_queries
  const totalSessions = toolUsageTotals?.total_sessions ?? 0;
  const totalCalls =
    (toolUsageTotals?.total_calls ?? 0) + (graphQueryCount?.count ?? 0);
  const avgCallsPerSession =
    totalSessions > 0 ? Math.round((totalCalls / totalSessions) * 10) / 10 : 0;

  // Calculate global graph/search ratio (simpler and more accurate)
  const avgGraphSearchRatio =
    byCategory.search > 0
      ? Math.round((byCategory.graph / byCategory.search) * 100) / 100
      : null;

  return {
    totalSessions,
    totalCalls,
    avgCallsPerSession,
    byCategory,
    avgGraphSearchRatio,
  };
}

/**
 * Log a task snapshot at a workflow phase boundary.
 * Captures task state for metrics tracking.
 *
 * @param workflowId - Workflow ID this snapshot belongs to
 * @param phase - Workflow phase when snapshot was captured
 * @param taskId - Native task system task ID
 * @param taskSubject - Human-readable task description
 * @param taskStatus - Task status (pending, in_progress, completed)
 * @param taskMetadata - Optional JSON metadata about the task
 * @param parentTaskId - Optional parent task ID for hierarchical tasks
 */
function logTaskSnapshot(
  workflowId: string,
  phase: string,
  taskId: string,
  taskSubject: string,
  taskStatus: string,
  taskMetadata?: string,
  parentTaskId?: string,
): void {
  const db = getDatabase();

  db.run(
    `
    INSERT INTO task_snapshots (workflow_id, phase, task_id, task_subject, task_status, task_metadata, parent_task_id, captured_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      workflowId,
      phase,
      taskId,
      taskSubject,
      taskStatus,
      taskMetadata ?? null,
      parentTaskId ?? null,
      new Date().toISOString(),
    ],
  );
}

/**
 * Get task snapshots for a workflow (or all workflows).
 * Returns snapshots ordered by capture time descending.
 *
 * @param workflowId - Optional workflow ID to filter by
 * @returns Array of task snapshots
 */
function getTaskSnapshots(workflowId?: string): TaskSnapshot[] {
  const db = getDatabase();

  type SnapshotRow = {
    id: number;
    workflow_id: string;
    phase: string;
    task_id: string;
    task_subject: string;
    task_status: string;
    task_metadata: string | null;
    parent_task_id: string | null;
    captured_at: string;
  };

  const query = workflowId
    ? `SELECT * FROM task_snapshots WHERE workflow_id = ? ORDER BY captured_at DESC`
    : `SELECT * FROM task_snapshots ORDER BY captured_at DESC`;

  const params = workflowId ? [workflowId] : [];
  const rows = db.query<SnapshotRow, string[]>(query).all(...params);

  return rows.map((row) => ({
    id: row.id,
    workflowId: row.workflow_id,
    phase: row.phase as WorkflowPhase,
    taskId: row.task_id,
    taskSubject: row.task_subject,
    taskStatus: row.task_status,
    taskMetadata: row.task_metadata ?? undefined,
    parentTaskId: row.parent_task_id ?? undefined,
    capturedAt: row.captured_at,
  }));
}

/**
 * Get child tasks for a parent task.
 * Returns the most recent snapshot for each child task.
 *
 * @param parentTaskId - Parent task ID to get children for
 * @returns Array of child task snapshots
 */
function getChildTasks(parentTaskId: string): TaskSnapshot[] {
  const db = getDatabase();

  type SnapshotRow = {
    id: number;
    workflow_id: string;
    phase: string;
    task_id: string;
    task_subject: string;
    task_status: string;
    task_metadata: string | null;
    parent_task_id: string | null;
    captured_at: string;
  };

  // Get the most recent snapshot for each child task
  // Use MAX(id) instead of MAX(captured_at) to avoid duplicates when
  // multiple snapshots are inserted within the same millisecond
  const rows = db
    .query<SnapshotRow, [string, string]>(
      `
      SELECT ts.*
      FROM task_snapshots ts
      INNER JOIN (
        SELECT task_id, MAX(id) as max_id
        FROM task_snapshots
        WHERE parent_task_id = ?
        GROUP BY task_id
      ) latest ON ts.task_id = latest.task_id AND ts.id = latest.max_id
      WHERE ts.parent_task_id = ?
      ORDER BY ts.captured_at DESC
      `,
    )
    .all(parentTaskId, parentTaskId);

  return rows.map((row) => ({
    id: row.id,
    workflowId: row.workflow_id,
    phase: row.phase as WorkflowPhase,
    taskId: row.task_id,
    taskSubject: row.task_subject,
    taskStatus: row.task_status,
    taskMetadata: row.task_metadata ?? undefined,
    parentTaskId: row.parent_task_id ?? undefined,
    capturedAt: row.captured_at,
  }));
}

/**
 * Calculate progress for a task, aggregating from children if present.
 * If the task has children, progress is calculated from child statuses.
 * If the task has no children, progress is based on the task's own status.
 *
 * @param taskId - Task ID to get progress for
 * @param visited - Set of already-visited task IDs to prevent infinite recursion on cyclic data
 * @returns Progress aggregation including percentage
 */
function getTaskProgress(
  taskId: string,
  visited: Set<string> = new Set(),
): TaskProgress {
  // Cycle detection - prevent infinite recursion on corrupt/cyclic data
  if (visited.has(taskId)) {
    return {
      total: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
      percentage: 0,
    };
  }
  visited.add(taskId);

  const children = getChildTasks(taskId);

  if (children.length === 0) {
    // Leaf task - get the most recent snapshot for this task
    const db = getDatabase();
    type StatusRow = { task_status: string };
    const row = db
      .query<
        StatusRow,
        [string]
      >(`SELECT task_status FROM task_snapshots WHERE task_id = ? ORDER BY captured_at DESC LIMIT 1`)
      .get(taskId);

    // If no snapshot exists, return zeros (not found)
    if (!row) {
      return {
        total: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
        percentage: 0,
      };
    }

    const status = row.task_status;
    const completed = status === "completed" ? 1 : 0;
    const inProgress = status === "in_progress" ? 1 : 0;
    const pending = status === "pending" ? 1 : 0;

    return {
      total: 1,
      completed,
      inProgress,
      pending,
      percentage: completed * 100,
    };
  }

  // Parent task - aggregate from children
  let completed = 0;
  let inProgress = 0;
  let pending = 0;

  for (const child of children) {
    // Recursively get progress for each child (handles nested hierarchies)
    const childProgress = getTaskProgress(child.taskId, visited);
    completed += childProgress.completed;
    inProgress += childProgress.inProgress;
    pending += childProgress.pending;
  }

  const total = completed + inProgress + pending;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    inProgress,
    pending,
    percentage,
  };
}

/**
 * Build a hierarchical task tree from snapshots.
 * Returns root tasks (tasks with no parent) with their children nested.
 *
 * @param workflowId - Optional workflow ID to filter by
 * @returns Array of root task tree nodes
 */
function getTaskTree(workflowId?: string): TaskTreeNode[] {
  const db = getDatabase();

  type SnapshotRow = {
    id: number;
    workflow_id: string;
    phase: string;
    task_id: string;
    task_subject: string;
    task_status: string;
    task_metadata: string | null;
    parent_task_id: string | null;
    captured_at: string;
  };

  // Get the most recent snapshot for each task
  // Use MAX(id) instead of MAX(captured_at) to avoid duplicates when
  // multiple snapshots are inserted within the same millisecond
  // Use separate queries for filtered vs unfiltered to avoid fragile SQL construction
  const rows = workflowId
    ? db
        .query<SnapshotRow, [string, string]>(
          `
          SELECT ts.*
          FROM task_snapshots ts
          INNER JOIN (
            SELECT task_id, MAX(id) as max_id
            FROM task_snapshots
            WHERE workflow_id = ?
            GROUP BY task_id
          ) latest ON ts.task_id = latest.task_id AND ts.id = latest.max_id
          WHERE ts.workflow_id = ?
          ORDER BY ts.captured_at ASC
          `,
        )
        .all(workflowId, workflowId)
    : db
        .query<SnapshotRow, []>(
          `
          SELECT ts.*
          FROM task_snapshots ts
          INNER JOIN (
            SELECT task_id, MAX(id) as max_id
            FROM task_snapshots
            GROUP BY task_id
          ) latest ON ts.task_id = latest.task_id AND ts.id = latest.max_id
          ORDER BY ts.captured_at ASC
          `,
        )
        .all();

  // Convert rows to TaskSnapshot objects
  const snapshots: TaskSnapshot[] = rows.map((row) => ({
    id: row.id,
    workflowId: row.workflow_id,
    phase: row.phase as WorkflowPhase,
    taskId: row.task_id,
    taskSubject: row.task_subject,
    taskStatus: row.task_status,
    taskMetadata: row.task_metadata ?? undefined,
    parentTaskId: row.parent_task_id ?? undefined,
    capturedAt: row.captured_at,
  }));

  // Build a map of taskId -> snapshot
  const snapshotMap = new Map<string, TaskSnapshot>();
  for (const snapshot of snapshots) {
    snapshotMap.set(snapshot.taskId, snapshot);
  }

  // Build a map of parentTaskId -> children
  const childrenMap = new Map<string, TaskSnapshot[]>();
  for (const snapshot of snapshots) {
    if (snapshot.parentTaskId) {
      const siblings = childrenMap.get(snapshot.parentTaskId) ?? [];
      siblings.push(snapshot);
      childrenMap.set(snapshot.parentTaskId, siblings);
    }
  }

  // Recursively build tree nodes
  function buildNode(snapshot: TaskSnapshot): TaskTreeNode {
    const children = childrenMap.get(snapshot.taskId) ?? [];
    const childNodes = children.map(buildNode);
    const progress = getTaskProgress(snapshot.taskId);

    return {
      task: snapshot,
      children: childNodes,
      progress,
    };
  }

  // Find root tasks (no parent) and build tree
  const rootTasks = snapshots.filter((s) => !s.parentTaskId);
  return rootTasks.map(buildNode);
}

/**
 * Get aggregated task metrics across all workflows.
 * Calculates completion rates and duration statistics.
 *
 * @returns Aggregated task metrics
 */
function getTaskMetrics(): TaskMetrics {
  const db = getDatabase();

  // Get total tasks and completed tasks
  type TotalsRow = {
    total_tasks: number;
    completed_tasks: number;
  };
  const totals = db
    .query<TotalsRow, []>(
      `
      SELECT
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN task_status = 'completed' THEN 1 END) as completed_tasks
      FROM task_snapshots
      `,
    )
    .get();

  const totalTasks = totals?.total_tasks ?? 0;
  const completedTasks = totals?.completed_tasks ?? 0;
  const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;

  // Calculate average duration (time between first and last snapshot for same taskId)
  // Uses subquery to compute per-task durations, then averages across all tasks
  type DurationRow = {
    avg_duration_ms: number | null;
  };
  const durationResult = db
    .query<DurationRow, []>(
      `
      SELECT AVG(duration_ms) as avg_duration_ms
      FROM (
        SELECT
          CAST((julianday(MAX(captured_at)) - julianday(MIN(captured_at))) * 24 * 60 * 60 * 1000 AS INTEGER) as duration_ms
        FROM task_snapshots
        GROUP BY task_id
        HAVING COUNT(*) > 1
      )
      `,
    )
    .get();

  const avgDurationMs = durationResult?.avg_duration_ms ?? 0;

  // Get metrics by phase
  type PhaseRow = {
    phase: string;
    count: number;
    completed: number;
  };
  const phaseRows = db
    .query<PhaseRow, []>(
      `
      SELECT
        phase,
        COUNT(*) as count,
        COUNT(CASE WHEN task_status = 'completed' THEN 1 END) as completed
      FROM task_snapshots
      GROUP BY phase
      ORDER BY phase
      `,
    )
    .all();

  const byPhase = phaseRows.map((row) => ({
    phase: row.phase as WorkflowPhase,
    count: row.count,
    completionRate: row.count > 0 ? row.completed / row.count : 0,
  }));

  // Get metrics by workflow
  type WorkflowRow = {
    workflow_id: string;
    count: number;
    completed: number;
  };
  const workflowRows = db
    .query<WorkflowRow, []>(
      `
      SELECT
        workflow_id,
        COUNT(*) as count,
        COUNT(CASE WHEN task_status = 'completed' THEN 1 END) as completed
      FROM task_snapshots
      GROUP BY workflow_id
      ORDER BY workflow_id
      `,
    )
    .all();

  const byWorkflow = workflowRows.map((row) => ({
    workflowId: row.workflow_id,
    count: row.count,
    completionRate: row.count > 0 ? row.completed / row.count : 0,
  }));

  return {
    totalTasks,
    completedTasks,
    completionRate,
    avgDurationMs,
    byPhase,
    byWorkflow,
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
  determineQuerySource,
  // Tool usage metrics
  logToolUsage,
  getToolUsageSummary,
  getToolUsageAggregate,
  categorizeToolName,
  // Task metrics
  logTaskSnapshot,
  getTaskSnapshots,
  getTaskMetrics,
  // Task hierarchy
  getChildTasks,
  getTaskProgress,
  getTaskTree,
};
