---
name: publish
description: Build, create changeset, and open a version PR for publishable packages. Usage - /publish [package-name] [--bump patch|minor|major]
allowed-tools: Bash, Read, Glob, Grep, Write, Edit, AskUserQuestion, Skill
---

# Publish Skill

Automates the publish workflow: detect changes, build, create changeset, commit, and open a PR.

## Contract

### Input (from args)

| Field     | Type   | Required | Description                                                                           |
| --------- | ------ | -------- | ------------------------------------------------------------------------------------- |
| `package` | string | No       | Package name or shorthand (e.g. `design-tokens`, `rd-logger`). Auto-detects if empty. |
| `--bump`  | string | No       | Version bump: `patch`, `minor`, or `major`. Prompts if not provided.                  |

### Publishable Packages

| Shorthand          | Full Name                            | Path                        |
| ------------------ | ------------------------------------ | --------------------------- |
| `design-tokens`    | `@rollercoaster-dev/design-tokens`   | `packages/design-tokens`    |
| `openbadges-core`  | `@rollercoaster-dev/openbadges-core` | `packages/openbadges-core`  |
| `openbadges-types` | `openbadges-types`                   | `packages/openbadges-types` |
| `openbadges-ui`    | `openbadges-ui`                      | `packages/openbadges-ui`    |
| `rd-logger`        | `@rollercoaster-dev/rd-logger`       | `packages/rd-logger`        |

## Workflow

### Step 1: Identify Target Package(s)

If `package` argument provided:

- Match against shorthand or full name from the table above
- If no match: STOP with error listing available packages

If no argument:

- Detect which publishable packages have commits since their last version bump:

```bash
# For each publishable package, check for changes since last changeset release
git log $(git log --oneline --all --grep="Version Packages" --max-count=1 --format=%H)..HEAD --oneline -- packages/<dir>/
```

- If no packages changed: STOP, tell user "No publishable packages have changed since last release."
- If multiple packages changed: list them and ask user which to publish (or "all")

### Step 2: Build

For each target package, run build from the package directory:

```bash
cd packages/<dir> && bun run build
```

Note: `bun --filter` does not reliably resolve scoped package names in this monorepo. Always use `cd` + direct `bun run build`.

**If build fails:** STOP with error. Do not create changeset for a broken build.

### Step 3: Generate Changelog Summary

Get commits since last release for the package:

```bash
git log $(git log --oneline --all --grep="Version Packages" --max-count=1 --format=%H)..HEAD --oneline -- packages/<dir>/
```

Summarize the commits into a concise changelog entry (1-3 sentences). Focus on user-facing changes, not internal details.

### Step 4: Determine Bump Type

If `--bump` was provided, use that.

Otherwise, auto-detect from commit prefixes:

- Any `feat(` commits → suggest `minor`
- Only `fix(` or `chore(` → suggest `patch`
- Any `BREAKING CHANGE` or `!:` → suggest `major`

Present the suggestion to the user via AskUserQuestion and let them confirm or override.

### Step 5: Create Changeset File

Write a changeset file:

```bash
# Generate a short random name
```

Write to `.changeset/<package-shorthand>-<random>.md`:

```markdown
---
"<full-package-name>": <bump-type>
---

<changelog summary from Step 3>
```

### Step 6: Create Branch, Commit, and PR

**6a. Create branch (if on main):**

```bash
git checkout -b chore/publish-<package-shorthand>
```

If already on a feature branch, stay on it.

**6b. Stage and commit:**

```bash
git add .changeset/
git commit -m "chore(<scope>): add changeset for <full-package-name> <bump-type> release"
```

**6c. Push and create PR:**

```bash
git push -u origin HEAD
```

```bash
gh pr create --title "chore(<scope>): publish <full-package-name> <bump-type>" --body "$(cat <<'PRBODY'
## Summary

Changeset for `<full-package-name>` <bump-type> release.

### Changes included

<changelog summary>

## What happens next

1. Merge this PR → Changesets bot creates "Version Packages" PR
2. Merge "Version Packages" PR → Package published to npm via OIDC

---

Generated with [Claude Code](https://claude.ai/code)
PRBODY
)"
```

### Step 7: Report

```
PUBLISH INITIATED

Package: <full-package-name>
Bump: <bump-type> (<current-version> → <next-version>)
PR: <pr-url>

Next steps:
1. Merge this PR
2. Merge the "Version Packages" PR that Changesets creates
3. Package will be published to npm automatically
```

## Error Handling

| Condition             | Behavior                               |
| --------------------- | -------------------------------------- |
| Unknown package name  | List available packages, stop          |
| No changes detected   | Inform user, stop                      |
| Build fails           | Show error output, stop                |
| Already has changeset | Warn user, ask to continue or stop     |
| Push/PR fails         | Show error, changeset is still on disk |

## Examples

**Simple:**

```
/publish design-tokens
```

**With bump type:**

```
/publish design-tokens --bump minor
```

**Auto-detect:**

```
/publish
```

→ Scans all publishable packages, finds which have changes, prompts for selection.
