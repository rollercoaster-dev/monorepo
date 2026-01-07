#!/usr/bin/env bash
# Test suite for workflow-logger.sh
# Simple validation tests for workflow logging functions

# Declare and assign separately to avoid masking return values (shellcheck SC2155)
CLAUDE_PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)" || {
  echo "Failed to determine CLAUDE_PROJECT_DIR" >&2
  exit 1
}
export CLAUDE_PROJECT_DIR
cd "$CLAUDE_PROJECT_DIR" || exit 1

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Workflow Logger Test Suite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Cleanup function
cleanup() {
  rm -rf .claude/workflow-state/auto-issue-test-* 2>/dev/null || true
  rm -rf .claude/workflow-state/auto-milestone-test-* 2>/dev/null || true
  rm -rf .claude/workflow-state/archive/auto-issue-test-* 2>/dev/null || true
}

cleanup

# Test 1: Script can be sourced without errors
((TESTS_RUN++))
echo "Test 1: Sourcing workflow-logger.sh..."
if bash -c "source scripts/workflow-logger.sh && echo 'sourced'" >/dev/null 2>&1; then
  echo "✓ PASS"
  ((TESTS_PASSED++))
else
  echo "✗ FAIL: Script cannot be sourced"
  ((TESTS_FAILED++))
fi

# Test 2: init_workflow creates directory structure
((TESTS_RUN++))
echo "Test 2: init_workflow creates correct structure..."
bash -c "source scripts/workflow-logger.sh && init_workflow 'auto-issue' 'test-123'" >/dev/null 2>&1
if [[ -d ".claude/workflow-state/auto-issue-test-123" ]] && \
   [[ -f ".claude/workflow-state/auto-issue-test-123/state.json" ]] && \
   [[ -f ".claude/workflow-state/auto-issue-test-123/audit.jsonl" ]]; then
  echo "✓ PASS"
  ((TESTS_PASSED++))
else
  echo "✗ FAIL: Directory structure not created"
  ((TESTS_FAILED++))
fi

# Test 3: state.json contains valid JSON
((TESTS_RUN++))
echo "Test 3: state.json is valid JSON..."
if jq empty .claude/workflow-state/auto-issue-test-123/state.json 2>/dev/null; then
  echo "✓ PASS"
  ((TESTS_PASSED++))
else
  echo "✗ FAIL: Invalid JSON in state.json"
  ((TESTS_FAILED++))
fi

# Test 4: audit.jsonl contains workflow.start event
((TESTS_RUN++))
echo "Test 4: audit.jsonl contains workflow.start..."
if grep -q "workflow.start" .claude/workflow-state/auto-issue-test-123/audit.jsonl 2>/dev/null; then
  echo "✓ PASS"
  ((TESTS_PASSED++))
else
  echo "✗ FAIL: workflow.start event not found"
  ((TESTS_FAILED++))
fi

# Test 5: Required fields in state.json
((TESTS_RUN++))
echo "Test 5: state.json has required fields..."
required_count=$(jq 'has("workflow") and has("workflow_id") and has("startedAt") and has("resumable")' \
  .claude/workflow-state/auto-issue-test-123/state.json 2>/dev/null)
if [[ "$required_count" == "true" ]]; then
  echo "✓ PASS"
  ((TESTS_PASSED++))
else
  echo "✗ FAIL: Missing required fields"
  ((TESTS_FAILED++))
fi

# Test 6: log_event appends to audit log
((TESTS_RUN++))
echo "Test 6: log_event appends to audit log..."
bash -c "source scripts/workflow-logger.sh && log_event 'auto-issue-test-123' 'test.event' '{\"test\":true}'" >/dev/null 2>&1
if grep -q "test.event" .claude/workflow-state/auto-issue-test-123/audit.jsonl 2>/dev/null; then
  echo "✓ PASS"
  ((TESTS_PASSED++))
else
  echo "✗ FAIL: Event not logged"
  ((TESTS_FAILED++))
fi

# Test 7: list_workflows function exists and runs
((TESTS_RUN++))
echo "Test 7: list_workflows function works..."
if bash -c "source scripts/workflow-logger.sh && list_workflows" | grep -q "auto-issue-test-123" 2>/dev/null; then
  echo "✓ PASS"
  ((TESTS_PASSED++))
else
  echo "✗ FAIL: list_workflows did not find workflow"
  ((TESTS_FAILED++))
fi

# Test 8: archive_workflow moves to archive
((TESTS_RUN++))
echo "Test 8: archive_workflow moves to archive..."
bash -c "source scripts/workflow-logger.sh && archive_workflow 'auto-issue-test-123'" >/dev/null 2>&1
if [[ -d ".claude/workflow-state/archive/auto-issue-test-123" ]] && \
   [[ ! -d ".claude/workflow-state/auto-issue-test-123" ]]; then
  echo "✓ PASS"
  ((TESTS_PASSED++))
else
  echo "✗ FAIL: Workflow not archived"
  ((TESTS_FAILED++))
fi

cleanup

# Report results
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test Results"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Tests run:    $TESTS_RUN"
echo "Tests passed: $TESTS_PASSED"
echo "Tests failed: $TESTS_FAILED"
echo ""

if [[ $TESTS_FAILED -gt 0 ]]; then
  echo "FAILURE - Some tests did not pass"
  exit 1
else
  echo "SUCCESS - All tests passed!"
  exit 0
fi
