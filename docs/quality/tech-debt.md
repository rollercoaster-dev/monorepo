# Tech Debt Tracker

Versioned record of known technical debt. Agents add entries when they discover debt; entries are updated when debt is resolved.

Last updated: 2026-02-28

## Active Debt

| ID | Area | Description | Severity | Status | Added | Updated |
|----|------|-------------|----------|--------|-------|---------|
| TD-001 | Components | BadgeCard missing behavioral tests | MEDIUM | OPEN | 2026-02-28 | 2026-02-28 |
| TD-002 | Components | CollapsibleSection missing behavioral tests | MEDIUM | OPEN | 2026-02-28 | 2026-02-28 |
| TD-003 | Components | Divider missing behavioral tests | MEDIUM | OPEN | 2026-02-28 | 2026-02-28 |
| TD-004 | Components | EmptyState missing behavioral tests | MEDIUM | OPEN | 2026-02-28 | 2026-02-28 |
| TD-005 | Components | GoalCard missing behavioral tests | MEDIUM | OPEN | 2026-02-28 | 2026-02-28 |
| TD-006 | Components | ProgressBar missing behavioral tests | MEDIUM | OPEN | 2026-02-28 | 2026-02-28 |
| TD-007 | Components | SettingsRow missing behavioral tests | MEDIUM | OPEN | 2026-02-28 | 2026-02-28 |
| TD-008 | Components | SettingsSection missing behavioral tests | MEDIUM | OPEN | 2026-02-28 | 2026-02-28 |
| TD-009 | Components | ThemeSwitcher missing behavioral tests | MEDIUM | OPEN | 2026-02-28 | 2026-02-28 |
| TD-010 | Screens | E2E coverage at ~12% (3/25 screens) — graded D | HIGH | OPEN | 2026-02-28 | 2026-02-28 |
| TD-011 | Components | Overall structural completeness ~75% — graded C | MEDIUM | OPEN | 2026-02-28 | 2026-02-28 |

## Resolved Debt

| ID | Area | Description | Severity | Resolved | Resolution |
|----|------|-------------|----------|----------|------------|
| _(none yet)_ | | | | | |

## How This File Is Updated

- **Agents add entries** when they discover debt (cleanup-agent, doc-gardener, quality-scorer)
- **Entries move to Resolved** when the debt is fixed (status → RESOLVED, add resolved date and resolution note)
- **The quality-scorer skill** references this file before opening regression issues to avoid duplicates
- **ID format**: `TD-NNN` — monotonically increasing, never reused

## Severity Levels

| Level | Meaning |
|-------|---------|
| CRITICAL | Blocks development or causes runtime failures |
| HIGH | Significant gap in quality, testing, or documentation |
| MEDIUM | Known shortcoming with workaround or low impact |
| LOW | Minor improvement opportunity |
