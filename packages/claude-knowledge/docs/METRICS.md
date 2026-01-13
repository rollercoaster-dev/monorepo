# Metrics: claude-knowledge

> Validation metrics, measurement methodology, and decision criteria.

## Purpose

Metrics serve one goal: **Determine whether claude-knowledge provides real value**.

This is not about vanity metrics or proving we built something. It's about honest measurement to make informed decisions about whether to continue investing in this package.

## Metric Categories

### Quantitative Metrics

Automatically tracked via `context_metrics` and `graph_queries` tables.

| Metric               | Source            | What It Measures                    |
| -------------------- | ----------------- | ----------------------------------- |
| `files_read`         | Session hooks     | Files read during session           |
| `compacted`          | PreCompact hook   | Whether context compaction occurred |
| `duration_minutes`   | Session lifecycle | How long the session lasted         |
| `learnings_injected` | SessionStart      | Learnings provided at session start |
| `learnings_captured` | SessionEnd        | Learnings extracted from session    |
| `review_findings`    | Review phase      | Findings by severity level          |
| `query_type`         | Graph queries     | What type of query was run          |
| `result_count`       | Graph queries     | How many results were returned      |
| `duration_ms`        | Graph queries     | Query execution time                |

### Qualitative Metrics

Observed through usage patterns and self-reflection.

| Signal             | Positive                                    | Negative                            |
| ------------------ | ------------------------------------------- | ----------------------------------- |
| Natural usage      | Reaching for `knowledge.query()` unprompted | Forgetting the feature exists       |
| Trust in results   | Acting on retrieved learnings               | Ignoring or second-guessing results |
| Maintenance burden | Minimal effort to keep working              | Frequent debugging or fixes needed  |
| Value perception   | "This saved me time"                        | "This is just overhead"             |

## Measurement Methodology

### Automatic Capture

Metrics are captured automatically by session hooks:

```typescript
// SessionStart hook
const context = await hooks.onSessionStart({
  workingDir: process.cwd(),
  branch: getCurrentBranch(),
  modifiedFiles: getModifiedFiles(),
});
// Records: learnings_injected, session_id, start_time

// SessionEnd hook (PreCompact)
await hooks.onSessionEnd({
  commits: getSessionCommits(),
  modifiedFiles: getModifiedFiles(),
});
// Records: learnings_captured, duration, compacted=true
```

### Manual Review

After workflow completion, review metrics with:

```bash
# List all session metrics
bun run checkpoint metrics list

# Get summary statistics
bun run checkpoint metrics summary
```

### Baseline Period

**Weeks 1-2**: Establish baseline without active knowledge injection.

- Checkpoint recovery: active
- Knowledge injection: disabled (or minimal)
- Purpose: Understand normal behavior patterns

**Weeks 3-6**: Enable full knowledge system.

- Checkpoint recovery: active
- Knowledge injection: enabled
- Learning capture: enabled
- Purpose: Measure impact of knowledge graph

## Key Performance Indicators

### Primary KPIs

These directly measure the value proposition:

#### 1. Checkpoint Recovery Rate

**Definition**: Successful workflow resumes after context compaction.

**Target**: 2+ successful recoveries per week.

**Why**: This is the core value of checkpoint. If we're not recovering, the system isn't providing value.

**Measurement**:

```sql
SELECT COUNT(*) FROM actions
WHERE action = 'workflow_resumed'
AND created_at > datetime('now', '-7 days');
```

#### 2. Knowledge Query Hit Rate

**Definition**: Queries that return results / Total queries.

**Target**: >50% hit rate.

**Why**: If queries consistently return nothing, the knowledge graph is empty or poorly indexed.

**Measurement**:

```sql
SELECT
  COUNT(CASE WHEN result_count > 0 THEN 1 END) * 100.0 / COUNT(*) as hit_rate
FROM graph_queries
WHERE query_type IN ('knowledge', 'semantic');
```

#### 3. Learning Relevance Score

**Definition**: Learnings marked as useful / Learnings injected.

**Target**: >30% relevance.

**Why**: Injecting irrelevant learnings adds noise without value.

**Measurement**: Requires relevance tracking (#416) to be implemented.

### Secondary KPIs

These provide supporting evidence:

#### 4. File Reads per Issue

**Definition**: Average files read to complete an issue.

**Target**: 20% reduction from baseline.

**Why**: If knowledge is useful, agents should need to read fewer files.

**Measurement**:

```sql
SELECT
  AVG(files_read) as avg_files,
  issue_number
FROM context_metrics
WHERE issue_number IS NOT NULL
GROUP BY issue_number;
```

#### 5. Review Findings Trend

**Definition**: Average review findings per session over time.

**Target**: Decreasing trend.

**Why**: If we're learning from mistakes, we should make fewer of them.

**Measurement**:

```sql
SELECT
  strftime('%W', created_at) as week,
  AVG(json_extract(review_findings, '$.total')) as avg_findings
FROM context_metrics
WHERE review_findings LIKE '{%'
GROUP BY week
ORDER BY week;
```

#### 6. Session Duration

**Definition**: Average session length.

**Target**: No significant increase.

**Why**: Knowledge system shouldn't add overhead. If sessions get longer, something is wrong.

**Measurement**:

```sql
SELECT AVG(duration_minutes) FROM context_metrics
WHERE duration_minutes IS NOT NULL;
```

## Validation Timeline

### Week 1-2: Baseline

**Activities**:

- Normal development work
- Checkpoint recovery enabled
- Knowledge injection disabled or minimal
- Track all quantitative metrics

**Questions to Answer**:

- How many files do we typically read per issue?
- How often does context compaction occur?
- What's the typical session duration?

### Week 3-4: Enable Knowledge

**Activities**:

- Enable knowledge injection at session start
- Enable learning capture at session end
- Continue tracking metrics

**Questions to Answer**:

- Are learnings being captured?
- Are queries returning results?
- Any obvious friction?

### Week 5-6: Measure Impact

**Activities**:

- Compare metrics to baseline
- Note qualitative observations
- Document successes and failures

**Questions to Answer**:

- Did file reads decrease?
- Were checkpoint recoveries successful?
- Did we naturally use the knowledge system?

## Decision Criteria

### Continue If ANY True

- [ ] File reads reduced by 20%+ compared to baseline
- [ ] 2+ successful checkpoint recoveries that saved significant time
- [ ] Naturally reached for `knowledge.query()` at least weekly
- [ ] Retrieved learnings were relevant and actionable
- [ ] Positive qualitative sense that "this is helping"

### Deprecate Knowledge Graph If ALL True

- [ ] No measurable reduction in file reads
- [ ] Never used `knowledge.query()` outside of testing
- [ ] Learnings stored were never useful when retrieved
- [ ] Maintenance burden exceeded 1 hour per week
- [ ] Negative qualitative sense that "this is overhead"

### Deprecate Semantic Search If

- [ ] Knowledge graph itself isn't proving valuable
- [ ] Basic keyword search is sufficient for all queries
- [ ] Semantic matching never provided better results than keywords

### Deprecate Code Graph If

- [ ] Never invoked in real workflows
- [ ] Results weren't actionable when retrieved
- [ ] Parse time is problematic for codebase size

## Reporting

### CLI Commands

```bash
# View raw metrics
bun run checkpoint metrics list
bun run checkpoint metrics list --issue 123

# Aggregate summary
bun run checkpoint metrics summary

# Compare periods
bun run checkpoint metrics compare --baseline "2026-01-01" --current "2026-01-15"
```

### Weekly Review

Every Friday, review:

1. **Checkpoint recoveries**: How many? Were they successful?
2. **Learnings captured**: How many? What areas?
3. **Knowledge queries**: How many? Hit rate?
4. **Qualitative notes**: What worked? What didn't?

### Validation Report Template

```markdown
## Week N Validation Report

### Quantitative Summary

- Sessions: X
- Checkpoint recoveries: X (Y successful)
- Learnings captured: X
- Knowledge queries: X (Y% hit rate)
- Avg files read: X (vs Z baseline)

### Qualitative Observations

- [What went well]
- [What didn't work]
- [Surprises]

### Decisions

- [Continue/adjust/deprecate decisions]

### Next Week Focus

- [Specific things to track or improve]
```

## Data Retention

- **Session metrics**: Keep for 90 days
- **Learning entities**: Keep indefinitely (core value)
- **Graph query logs**: Keep for 30 days
- **Checkpoint data**: Delete on workflow completion

## Privacy Considerations

All metrics are local:

- No data leaves your machine
- No telemetry to external services
- Database is in `.claude/execution-state.db`
- User can delete at any time

## Related Documents

- [VISION.md](./VISION.md) - Success criteria context
- [FEATURE-ASSESSMENT.md](./FEATURE-ASSESSMENT.md) - Feature-specific recommendations
- [ROADMAP.md](./ROADMAP.md) - Validation as priority

---

_Last updated: 2026-01-13_
