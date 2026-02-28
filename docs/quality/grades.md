# Quality Grade Dashboard

Last updated: 2026-02-28
Updated by: manual baseline (initial seed)

| Domain       | Grade | Details                    | Trend |
| ------------ | ----- | -------------------------- | ----- |
| Components   | C     | ~75% with full structure   | --    |
| Tests        | C     | ~80% behavioral coverage   | --    |
| Lint         | A     | 0 errors, 0 warnings       | --    |
| Type Safety  | A     | 0 typecheck errors         | --    |
| Accessibility| A     | All a11y contract tests pass | --  |
| Screens      | D     | ~12% E2E coverage (3/25)   | --    |

## How This File Is Updated

This file is maintained by the `quality-scorer` skill. After each PR cycle, the skill re-evaluates all domains and overwrites the table above.

When a grade drops, the skill opens a GitHub issue labeled `type: tech-debt` to flag the regression.

See `.claude/skills/quality-scorer/SKILL.md` for grading criteria.
