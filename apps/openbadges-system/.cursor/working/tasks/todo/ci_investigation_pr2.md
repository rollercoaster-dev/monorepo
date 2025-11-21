# CI Investigation — PR #2: feat(workflow): GitHub Workflow Integration System for OpenBadges

PR: https://github.com/rollercoaster-dev/openbadges-system/pull/2

## Failing checks (from `gh pr list`)

- PR Validation
  - validate: FAILURE
  - validate-openbadges-compliance: FAILURE
  - security-scan: FAILURE
- Security Scan workflow
  - dependency-scan: FAILURE
  - secret-scan: FAILURE
- Issue Management
  - handle-pr-events: FAILURE

## Likely causes (from CodeRabbit and lint tools)

- YAML trailing spaces across templates and workflows cause yamllint failures
  - Files: `.github/ISSUE_TEMPLATE/{feature.yml,task.yml,bug.yml}`
  - Workflows: `.github/workflows/{pr-validation.yml,issue-management.yml,security-scan.yml,task-sync.yml}`
- actionlint error
  - `.github/workflows/issue-management.yml`: invalid `pull_request` activity type: `merged` (not allowed)
- Security scan job misconfiguration
  - PR Validation job `security-scan`: not checking out repo before scanning; missing pnpm install; paths may be invalid
- Dependency/secret scans
  - dependency-scan and secret-scan failure: need reproducible steps or use platform scanning; ensure checkout + install
- Markdownlint issues
  - Missing language specifiers in fenced code blocks
  - Using emphasis instead of headings in docs
- Custom GitHub Actions metadata
  - Missing `branding`, `permissions`; add defaults for inputs
  - Package metadata: set `private: true`, `license`, `engines.node`
- Shellcheck warnings (non-blocking)
  - `scripts/setup-github-project.sh`: unused vars `PROJECT_DESCRIPTION`, `PROJECT_NUMBER`

## CodeRabbit key comments to address

- Add `private`, `license`, `engines` to custom actions `package.json`
- Add `branding` and minimal `permissions` in actions `action.yml`
- Provide default for optional `pr-files` input
- Improve error formatting in `check-task-link/index.js`
- Consider logging invalid JSON in `validate-openbadges-compliance/index.js`
- Clean trailing spaces in YAML templates and workflows
- Fix actionlint invalid event type in `issue-management.yml`
- Security scan job: add repo checkout, pnpm setup, install; ensure file reads after checkout
- Markdown: add language to fenced blocks; convert emphasized headings to `####`
- Shell: either use or remove unused variables in `scripts/setup-github-project.sh`

## Action plan (branches)

- chore/ci-yamllint-fixes
  - Remove trailing whitespace across YAML templates and workflows
- fix/actionlint-events
  - Replace invalid `pull_request` activity `merged` with supported events
- ci/security-scan-job-fix
  - Add checkout, pnpm setup, `pnpm install`, and correct file paths
- docs/markdownlint-fixes
  - Add language specifiers to fenced blocks; convert bold headings to proper headings
- chore/actions-metadata
  - Add `branding`, `permissions` to actions; defaults for inputs; package `private`, `license`, `engines`
- chore/scripts-shellcheck
  - Use or remove unused variables; pass `PROJECT_DESCRIPTION` into `gh project create`

## Quick verification steps

- Run local linters
  - `pnpm lint` (eslint), markdownlint if configured
  - `actionlint` locally (if available)
  - `yamllint` locally (or use CI container)
- Re-run CI on PR #2 after each branch merge into `feature/github-workflow-integration`

## Notes

- CodeRabbit review shows overall structure is good; issues are mostly lint/format and minor workflow misconfig.
