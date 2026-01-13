# Feature Assessment: claude-knowledge

> Maturity evaluation, usage analysis, and recommendations for each feature.

## Assessment Methodology

Features are evaluated on four dimensions:

1. **Maturity**: Code quality, test coverage, API stability
2. **Usage**: How actively the feature is used in practice
3. **Value**: Does it deliver measurable benefit?
4. **Maintenance**: Ongoing effort required

### Maturity Scale

| Level        | Description                                          |
| ------------ | ---------------------------------------------------- |
| Experimental | Proof of concept, API may change, limited testing    |
| Beta         | Functional, good tests, API mostly stable            |
| Stable       | Production-ready, comprehensive tests, stable API    |
| Production   | Battle-tested in real workflows, actively maintained |

### Usage Scale

| Level    | Description                                    |
| -------- | ---------------------------------------------- |
| None     | Built but never used in practice               |
| Light    | Used occasionally or in limited contexts       |
| Active   | Regularly used in workflows                    |
| Critical | Workflows depend on it, would break without it |

## Feature Matrix

| Feature                 | Maturity     | Usage    | Value     | Recommendation                |
| ----------------------- | ------------ | -------- | --------- | ----------------------------- |
| Checkpoint (workflows)  | Production   | Critical | Proven    | Keep, maintain                |
| Checkpoint (milestones) | Stable       | Light    | Proven    | Keep, enhance                 |
| Knowledge store/query   | Beta         | None     | Unproven  | Validate via #387             |
| Semantic search         | Experimental | None     | Unproven  | Defer until base proves value |
| Code graph (ts-morph)   | Beta         | Light    | Potential | Promote with examples         |
| Session hooks           | Stable       | Active   | Proven    | Keep, maintain                |
| Context formatting      | Stable       | Active   | Proven    | Keep, maintain                |
| Workflow retrospective  | Experimental | None     | Unproven  | Deprecate if unused           |
| Context metrics         | Beta         | Light    | Potential | Expand for validation         |

## Detailed Assessments

### Checkpoint System (Workflows)

**Status**: Production | Critical | Proven

**Evidence**:

- Used in every `/auto-issue` and `/work-on-issue` workflow
- Successfully recovered from context compaction multiple times
- Actively used right now (workflow-455 tracking this issue)

**Test Coverage**: Excellent (~500 lines of tests)

**API Stability**: Stable, no breaking changes in 3+ months

**Recommendation**: This is the core value of the package. Continue maintaining and improving. No changes needed.

---

### Checkpoint System (Milestones)

**Status**: Stable | Light | Proven

**Evidence**:

- Used only in `/auto-milestone` workflows
- Successfully coordinated multi-issue milestones
- Less frequently used because milestones are less common

**Test Coverage**: Good (~200 lines of tests)

**API Stability**: Stable

**Recommendation**: Keep as-is. Usage is appropriate for the feature scope.

---

### Knowledge Graph (Store/Query)

**Status**: Beta | None | Unproven

**Evidence**:

- Implementation is complete and well-tested
- API is clean and documented
- **Zero actual usage**: No learnings stored, no queries run in practice
- Session hooks exist but knowledge capture hasn't been exercised

**Test Coverage**: Good (~400 lines of tests)

**API Stability**: Mostly stable (minor changes possible)

**Gap**: Built without validation. We don't know if:

- Learnings captured from sessions are actually useful
- Queries return relevant results for real work
- The learning/pattern/mistake model is the right abstraction

**Recommendation**: Critical validation needed via issue #387 (dogfooding). Until validated:

- Don't add more features
- Don't optimize performance
- Focus on getting real learnings into the system

---

### Semantic Search

**Status**: Experimental | None | Unproven

**Evidence**:

- TF-IDF implementation complete
- OpenAI embeddings integration available
- Good test coverage
- **Built on top of unvalidated base**: If knowledge graph has no learnings, semantic search has nothing to search

**Test Coverage**: Good (~300 lines of tests)

**Problem**: This feature was added before validating whether the base knowledge graph is useful. It's solving "how do we search better?" before answering "is there anything worth searching?"

**Recommendation**: Defer development. Do not invest more time until:

1. Knowledge graph has real learnings (from dogfooding)
2. Basic keyword search proves insufficient
3. There's evidence users would benefit from semantic matching

---

### Code Graph (ts-morph)

**Status**: Beta | Light | Potential

**Evidence**:

- Full TypeScript parsing with ts-morph
- Queries: what-calls, blast-radius, find, exports
- Available via `/graph-query` skill
- **Underutilized**: Rarely invoked despite being available
- Database is empty (no parsed entities stored)

**Test Coverage**: Good (~400 lines of tests)

**Gap**: The feature works but isn't being used because:

- No clear guidance on when to use it
- No automatic parsing (only on-demand)
- Results not integrated with other features

**Recommendation**: Promote with documentation and examples:

- Add "When to use code graph" section to docs
- Create example queries for common scenarios
- Consider auto-parsing key files on session start

---

### Session Hooks

**Status**: Stable | Active | Proven

**Evidence**:

- Configured in `.claude/settings.json`
- Runs on every `SessionStart` and `PreCompact` event
- Successfully detects running workflows and prompts for resume
- Outputs visible in session startup logs

**Test Coverage**: Good (~200 lines of tests)

**Recommendation**: Keep as-is. Working well for its purpose.

---

### Context Formatting

**Status**: Stable | Active | Proven

**Evidence**:

- `formatKnowledgeContext()` used by session hooks
- Token budgeting works correctly
- Prioritization logic produces sensible results
- Output format is clean markdown

**Test Coverage**: Excellent (~300 lines of tests)

**Recommendation**: Keep as-is. Ready for when knowledge graph has content.

---

### Workflow Retrospective

**Status**: Experimental | None | Unproven

**Evidence**:

- `analyzeWorkflow()` and `storeWorkflowLearning()` implemented
- Parses dev plans, compares to actual commits
- Extracts patterns and mistakes
- **Never invoked**: Not integrated into any workflow

**Test Coverage**: Fair (~150 lines of tests)

**Problem**: Built ahead of need. The feature assumes:

- Dev plans are consistently created (they often aren't)
- Commit comparison provides useful insights (unclear)
- Extracted patterns are actionable (unvalidated)

**Recommendation**: Deprecate if still unused after 2 months. The feature was speculative and may not provide real value.

---

### Context Metrics

**Status**: Beta | Light | Potential

**Evidence**:

- `context_metrics` table exists and is used
- Tracks: files_read, compacted, learnings_injected/captured
- CLI commands available: `metrics list`, `metrics summary`
- **Data is sparse**: Metrics exist but not systematically captured

**Test Coverage**: Good (~150 lines of tests)

**Gap**: Metrics infrastructure exists but:

- Not automatically populated in all scenarios
- No dashboard or reporting beyond CLI
- Not used to make decisions

**Recommendation**: Expand for validation. This is critical for proving whether the package provides value. Need to:

- Ensure metrics are captured in all sessions
- Create reporting that highlights trends
- Use metrics data to inform feature decisions

## Code Quality Assessment

### Test Coverage Summary

| Module           | Source Lines | Test Lines | Ratio |
| ---------------- | ------------ | ---------- | ----- |
| checkpoint/      | ~600         | ~700       | 1.2x  |
| knowledge/       | ~500         | ~700       | 1.4x  |
| graph/           | ~400         | ~400       | 1.0x  |
| embeddings/      | ~300         | ~300       | 1.0x  |
| hooks.ts         | ~200         | ~200       | 1.0x  |
| formatter.ts     | ~200         | ~300       | 1.5x  |
| retrospective.ts | ~200         | ~150       | 0.75x |
| **Total**        | ~2500        | ~3000      | 1.2x  |

**Assessment**: Test coverage is strong across the codebase. The 1.2x test-to-source ratio indicates healthy testing practices.

### Architecture Quality

**Strengths**:

- Clean module separation
- Types well-defined in `types.ts`
- Database abstraction in `sqlite.ts`
- Consistent error handling patterns

**Weaknesses**:

- Some modules have tight coupling (knowledge depends on embeddings)
- CLI commands duplicate some logic that could be shared
- No dependency injection (harder to test in isolation)

## Recommendations Summary

### Keep and Maintain

- Checkpoint (workflows) - Core proven value
- Checkpoint (milestones) - Working well for its scope
- Session hooks - Essential integration point
- Context formatting - Ready for use

### Validate Before Investing More

- Knowledge graph - Needs real usage data
- Code graph - Needs promotion and examples
- Context metrics - Needs systematic capture

### Defer or Deprecate

- Semantic search - Built on unvalidated foundation
- Workflow retrospective - Built ahead of need, unused

## Action Items

1. **Issue #387**: Dogfood knowledge graph with metrics tracking
2. **New Issue**: Create code graph usage examples and documentation
3. **New Issue**: Systematic metrics capture in all session hooks
4. **Review in 2 months**: Deprecate retrospective if still unused
5. **Review semantic search**: Only resume if knowledge graph proves useful

---

_Last updated: 2026-01-13_
_Related: [VISION.md](./VISION.md) | [ARCHITECTURE.md](./ARCHITECTURE.md) | [ROADMAP.md](./ROADMAP.md)_
