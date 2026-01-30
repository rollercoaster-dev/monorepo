# @rollercoaster-dev/claude-knowledge

## Unreleased

### Added

- **Enhanced /plan status with plan progress** (#639): Enhanced `planning_stack_status` MCP tool to show step-level progress when active Goal has a Plan:
  - Added `computePlanProgress` helper for computing progress metrics (done count, percentage, current wave, next steps)
  - Progress includes total, done, in-progress, not-started, and blocked step counts
  - Identifies current wave (first wave with non-done steps)
  - Recommends up to 3 next actionable steps (non-done, dependencies met, in current wave)
  - Updated `/plan status` skill to display enhanced progress output
  - Added comprehensive unit tests for progress computation
- **Plan CRUD MCP tools** (#637): Added 4 new MCP tools for managing Plans and PlanSteps:
  - `planning_plan_create`: Create a Plan linked to a Goal
  - `planning_plan_add_steps`: Add multiple PlanSteps to a Plan in batch
  - `planning_plan_get`: Retrieve a Plan with all its steps
  - `planning_plan_list_steps`: List PlanSteps with optional wave filtering
- Comprehensive unit tests for all Plan CRUD operations
- Support for wave-based parallelization and dependency tracking in PlanSteps
