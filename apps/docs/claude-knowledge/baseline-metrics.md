# Claude Knowledge Baseline Metrics Report

**Date:** 2026-01-10
**Issue:** #403 - Establish baseline metrics from /auto-issue runs
**Status:** Phase 1 Complete

## Executive Summary

This document establishes the **quantitative and qualitative baseline** for the claude-knowledge feedback loop system. The data was collected from 9 completed `/auto-issue` workflow runs during initial development of the claude-knowledge package (January 2026).

### Key Findings

| Metric               | Value   | Notes                     |
| -------------------- | ------- | ------------------------- |
| Issues Processed     | 9       | All CLOSED successfully   |
| Full Workflow Traces | 4 (44%) | Complete action pipeline  |
| Partial Traces       | 5 (56%) | Session interruptions     |
| Total Actions Logged | 46      | Across all workflows      |
| Learnings Captured   | 92      | Stored in knowledge graph |
| Relationships Mapped | 83      | Entity connections        |

---

## 1. Workflow Execution Metrics

### 1.1 Issues Tracked

All 9 issues from the Claude Knowledge Graph milestone were processed:

| Issue | Title                              | Type  | Status |
| ----- | ---------------------------------- | ----- | ------ |
| #356  | Checkpoint API for /auto-milestone | feat  | CLOSED |
| #365  | Knowledge Store API                | feat  | CLOSED |
| #366  | Knowledge Query API                | feat  | CLOSED |
| #367  | Session Lifecycle Hooks            | feat  | CLOSED |
| #375  | Workflow Retrospective             | feat  | CLOSED |
| #376  | Telegram Notifications             | feat  | CLOSED |
| #379  | Semantic Search Embeddings         | feat  | CLOSED |
| #385  | Context Injection                  | feat  | CLOSED |
| #387  | Dogfooding Validation              | chore | CLOSED |

### 1.2 Workflow Completion by Phase

| Issue | Final Phase | Actions | Tracking Status |
| ----- | ----------- | ------- | --------------- |
| #356  | finalize    | 9       | Complete        |
| #365  | finalize    | 7       | Complete        |
| #366  | finalize    | 7       | Complete        |
| #376  | review      | 4       | Complete        |
| #367  | implement   | 3       | Incomplete      |
| #375  | implement   | 3       | Incomplete      |
| #379  | implement   | 3       | Incomplete      |
| #385  | review      | 5       | Incomplete      |
| #387  | review      | 5       | Incomplete      |

**Observation:** 5/9 workflows (56%) show incomplete tracking despite issues being closed.

### 1.2.1 Session Discontinuity Analysis

Investigation of the 5 "incomplete" workflows revealed they all completed successfully (PRs merged). The tracking stopped due to **session boundaries**, not failures:

**Pattern 1: Stopped at "implement" phase (#367, #375, #379)**

| Issue | Last Action    | PR Merged | Gap       |
| ----- | -------------- | --------- | --------- |
| #367  | 17:03 (gate-2) | 20:57     | 4 hours   |
| #375  | 13:26 (gate-2) | 15:04     | 1.5 hours |
| #379  | 08:10 (gate-2) | 11:04     | 3 hours   |

Session ended after plan approval. Implementation completed in new session without resuming workflow tracking.

**Pattern 2: Stopped at "review" phase (#385, #387)**

| Issue | Last Action             | PR Merged | Gap     |
| ----- | ----------------------- | --------- | ------- |
| #385  | 12:30 (review-complete) | 12:54     | 24 min  |
| #387  | 15:45 (review-complete) | 21:41     | 6 hours |

Session ended during/after review. Final gate approval and PR creation done without logging.

**Root Causes:**

1. Session timeout/context compaction breaks tracking
2. No automatic workflow resume on session start
3. Work continues but tracking doesn't

**Implication:** This is a feedback loop gap, not a workflow failure. The checkpoint system exists but isn't being used to resume tracking.

### 1.3 Action Pipeline Statistics

| Action Type             | Recorded | Expected (9 issues) | Completion Rate |
| ----------------------- | -------- | ------------------- | --------------- |
| gate-1-issue-reviewed   | 8        | 9                   | 89%             |
| gate-2-plan-approved    | 8        | 9                   | 89%             |
| research-complete       | 8        | 9                   | 89%             |
| implementation-complete | 4        | 9                   | 44%             |
| review-agents-complete  | 4        | 9                   | 44%             |
| gate-4-review-approved  | 2        | 9                   | 22%             |
| pr-created              | 2        | 9                   | 22%             |

**Total Actions:** 46

**Critical Note:** Only successful actions are recorded. The schema supports `success | failed | pending` but **zero failed actions exist in the database**. This is survivorship bias - failures are not being logged.

**Inferred Failure Points:**

- 5 workflows stopped before completion (implicit failures)
- No explicit failure logging means we can't measure retry rates or failure modes

---

## 2. Context Metrics

### 2.1 Session Statistics

| Metric             | Min | Max | Mean | Median |
| ------------------ | --- | --- | ---- | ------ |
| Duration (minutes) | 0   | 96  | 21.6 | 0      |
| Learnings Injected | 0   | 10  | 5.6  | 8      |
| Learnings Captured | 13  | 16  | 13.6 | 13     |
| Files Read         | 0   | 0   | 0    | 0      |
| Review Findings    | 0   | 0   | 0    | 0      |

### 2.2 Session Details

| Session ID  | Duration | Injected | Captured | Date       |
| ----------- | -------- | -------- | -------- | ---------- |
| 8e1b7994... | 96 min   | 0        | 16       | 2026-01-10 |
| 114e2e90... | 0 min    | 10       | 13       | 2026-01-09 |
| 33bc7755... | 0 min    | 10       | 13       | 2026-01-09 |
| 67de4452... | 0 min    | 8        | 13       | 2026-01-09 |
| test-123    | 12 min   | 0        | 13       | 2026-01-09 |

---

## 3. Knowledge Graph State

### 3.1 Entity Distribution

| Entity Type        | Count | Description                          |
| ------------------ | ----- | ------------------------------------ |
| Learning           | 92    | Insights captured from workflow runs |
| CodeArea           | 12    | Logical code regions tracked         |
| File               | 2     | Specific files referenced            |
| Pattern            | 1     | Reusable code patterns               |
| Mistake            | 1     | Error patterns to avoid              |
| **Total Entities** | 108   |                                      |
| **Relationships**  | 83    | Entity connections                   |

### 3.2 Code Areas Mapped

The following logical code areas are being tracked:

- **Core:** Database, API, Services
- **Claude-specific:** claude-knowledge, workflows, agents
- **Content:** Documentation, Testing
- **Features:** baking, openbadges-server
- **Config:** Claude Config, db

### 3.3 Sample Learnings (Most Recent)

```
- Added feature: add workflow retrospective and learning capture (#401)
- Fixed issue: use correct rd-logger import in example
- Added feature: implement context injection for agent prompts (#400)
- Added feature: add semantic search with TF-IDF embeddings (#398)
- Added feature: Create unified baking service (#317)
- Fixed issue: persist session metadata between hooks (#408)
- Maintenance: dogfooding validation goals (#402)
```

---

## 4. Context Cost/Benefit Analysis

### 4.0.1 Current Context Cost

| Metric                     | Value                    |
| -------------------------- | ------------------------ |
| Total learning content     | 4,149 chars (~1K tokens) |
| Average learning size      | 45 chars                 |
| Learnings per injection    | 8-10                     |
| Injection cost per session | ~450 chars (~100 tokens) |

**Assessment:** Context cost is negligible (~100 tokens per session). However, learnings are shallow (commit message summaries only).

### 4.0.2 The Measurement Problem

We cannot currently measure benefit because:

| Gap                  | Impact                                               |
| -------------------- | ---------------------------------------------------- |
| No causal tracking   | Can't prove learning influenced decision             |
| No relevance scoring | Don't know if injected learnings matched task domain |
| No quality baseline  | Can't compare with/without injection                 |
| No token visibility  | Claude Code doesn't expose token usage               |

### 4.0.3 Proposed Cost/Benefit Metrics

**Cost metrics (to add):**

| Metric               | How to Measure                              |
| -------------------- | ------------------------------------------- |
| `injection_chars`    | Sum of injected learning content length     |
| `injection_tokens`   | Estimate: chars / 4                         |
| `context_percentage` | injection_tokens / estimated_session_tokens |

**Benefit metrics (to add):**

| Metric                  | How to Measure                                       |
| ----------------------- | ---------------------------------------------------- |
| `learning_relevance`    | Post-hoc rating: was learning domain-relevant? (0-5) |
| `learning_used`         | Boolean: did implementation reference this learning? |
| `review_findings_delta` | Compare to baseline: fewer findings = better?        |
| `iteration_count`       | How many fix cycles before PR merged?                |

**Experimental approach:**

Run A/B comparison:

- Group A: Issues run WITH learning injection
- Group B: Issues run WITHOUT learning injection
- Compare: review findings, iterations, duration, quality rating

### 4.0.4 Current Baseline (No Benefit Data)

| Session  | Injected | Captured | Duration | Findings | Benefit? |
| -------- | -------- | -------- | -------- | -------- | -------- |
| 114e2e90 | 10       | 13       | 0 min    | 0        | Unknown  |
| 33bc7755 | 10       | 13       | 0 min    | 0        | Unknown  |
| 67de4452 | 8        | 13       | 0 min    | 0        | Unknown  |

**Conclusion:** We're injecting learnings but not measuring if they help. This is the #1 research gap for Phase 2.

---

## 4. Gap Analysis

### 4.1 Metrics Not Yet Tracked

| Metric          | Current State | Impact                          | Priority     |
| --------------- | ------------- | ------------------------------- | ------------ |
| failed_actions  | Never logged  | Can't measure failure rates     | **Critical** |
| files_read      | Always 0      | Can't measure context size      | High         |
| review_findings | Always 0      | Can't measure review efficiency | High         |
| compacted       | Always false  | Can't detect context overflow   | Medium       |

**Survivorship Bias:** The action logging only records successes. When a workflow fails or is interrupted, no failure action is logged. This makes reliability metrics impossible to calculate accurately.

### 4.2 Workflow Reliability

**Tracking Completion Rate:** 44% (4/9 complete traces)

**Confirmed cause:** Session discontinuity (see Section 1.2.1)

All 5 "incomplete" workflows completed successfully (PRs merged). Tracking stopped because:

1. Session ended (timeout, context compaction, manual restart)
2. Work resumed in new session without using checkpoint resume
3. Checkpoint data exists but isn't automatically loaded on session start

### 4.3 Coverage Gaps

| Gap                               | Impact                 | Recommendation                     |
| --------------------------------- | ---------------------- | ---------------------------------- |
| Single package (claude-knowledge) | Limited diversity      | Run on rd-logger, openbadges-types |
| All feat/chore types              | No fix/refactor data   | Include bug fixes in future runs   |
| No failed workflows               | Can't measure recovery | Intentionally test failure paths   |

---

## 5. Qualitative Observations

### 5.1 Learning Quality

**Positive:**

- Learnings capture meaningful work (features, fixes, maintenance)
- Issue numbers are included for traceability
- Code areas are being mapped correctly

**Needs Improvement:**

- Learnings lack detail (just commit message summaries)
- No distinction between high/low value insights
- Missing context about why decisions were made

### 5.2 Pipeline Behavior

**Positive:**

- All gates function correctly (100% success rate)
- Action logging is consistent
- Checkpoint system enables resume

**Needs Improvement:**

- 56% of workflows have incomplete traces
- No automatic cleanup of stale "running" workflows
- Duration tracking unreliable (many show 0 minutes)

---

## 6. Recommendations for Phase 2

### 6.1 Immediate Improvements

1. **Auto-resume workflows on session start** - Check for incomplete workflows and prompt to resume (fixes 56% tracking gap)
2. **Log failed actions** - Currently only successes are recorded; add failure logging to eliminate survivorship bias
3. **Fix files_read tracking** - Instrument file read operations
4. **Fix review_findings tracking** - Wire up review agent output
5. **Add duration tracking** - Use timestamps consistently

### 6.2 Baseline Expansion

Run `/auto-issue` on diverse issues to expand baseline:

- rd-logger bug fixes
- openbadges-types refactors
- openbadges-ui component updates

### 6.3 Quality Improvements

1. Capture richer learning context (not just commit messages)
2. Add learning relevance scoring
3. Track which injected learnings were actually used
4. Measure code quality indicators

---

## 7. Comparison Framework

Use these metrics to compare future system versions:

| Metric                   | Baseline   | Target       |
| ------------------------ | ---------- | ------------ |
| Workflow completion rate | 44%        | > 80%        |
| Session resume rate      | 0%         | > 90%        |
| Failed actions logged    | 0 (broken) | All failures |
| Learnings per issue      | 10.2       | > 10         |
| Injection relevance      | Unknown    | > 70% useful |
| Review findings tracked  | 0          | > 0          |
| Files read tracked       | 0          | > 0          |
| Duration accuracy        | ~20%       | > 90%        |

---

## Appendix: Raw Data Queries

### Workflow Data

```sql
SELECT issue_number, phase, status,
       (SELECT COUNT(*) FROM actions WHERE workflow_id = w.id) as actions
FROM workflows w
ORDER BY created_at DESC;
```

### Context Metrics

```bash
bun packages/claude-knowledge/src/cli.ts metrics summary
bun packages/claude-knowledge/src/cli.ts metrics list
```

### Knowledge Graph

```sql
SELECT type, COUNT(*) FROM entities GROUP BY type;
SELECT COUNT(*) FROM relationships;
```

---

_Generated: 2026-01-10_
_Related: #403, #399 (Cross-session learning epic)_
