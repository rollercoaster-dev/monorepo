# @rollercoaster-dev/claude-knowledge

## Unreleased

### Added

- **Plan CRUD MCP tools** (#637): Added 4 new MCP tools for managing Plans and PlanSteps:
  - `planning_plan_create`: Create a Plan linked to a Goal
  - `planning_plan_add_steps`: Add multiple PlanSteps to a Plan in batch
  - `planning_plan_get`: Retrieve a Plan with all its steps
  - `planning_plan_list_steps`: List PlanSteps with optional wave filtering
- Comprehensive unit tests for all Plan CRUD operations
- Support for wave-based parallelization and dependency tracking in PlanSteps
