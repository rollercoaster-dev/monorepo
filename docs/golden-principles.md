# Golden Principles

Mechanical, enforceable rules drawn from patterns corrected 2+ times in PR reviews. Each rule is concrete — "always do X" not "consider X."

## Rules

### 1. Use `rd-logger` for all application logging

**DO:** Import and use `rd-logger` for all log output in apps and packages.

```typescript
import { createLogger } from "@rollercoaster-dev/rd-logger";
const logger = createLogger("MyModule");
logger.info("Server started", { port: 8888 });
```

**DON'T:** Use `console.log` or other `console.*` methods for application logging. (`console.warn` and `console.error` are currently allowed by ESLint but should still prefer `rd-logger` for consistency.)

```typescript
// WRONG
console.log("Server started on port", port);
```

**Rationale:** Structured logging enables consistent formatting, log levels, and machine-parseable output. `console.*` produces unstructured text that is hard to filter in production.

**Status:** lint-enforced (`no-console: error` in shared-config, PR #869)

---

### 2. Use Changesets for version management

**DO:** Run `bunx changeset` to create a changeset file before or after your PR.

**DON'T:** Manually edit `version` in any `package.json`.

**Rationale:** Changesets coordinate version bumps across workspace packages, generate changelogs, and prevent version conflicts between collaborators. Manual bumps bypass changelog generation and can conflict with other in-flight PRs.

**Status:** doc-only (enforced by Changesets CI check and human review)

---

### 3. Use `:focus-visible` not `:focus` on interactive elements

**DO:** Style focus states with `:focus-visible` to show focus rings only for keyboard navigation.

```css
button:focus-visible {
  outline: 2px solid var(--ob-color-focus);
  outline-offset: 2px;
}
```

**DON'T:** Use `:focus` (shows ring on mouse clicks too) or omit focus styles entirely.

```css
/* WRONG — shows ring on every click */
button:focus {
  outline: 2px solid blue;
}

/* WRONG — all:unset removes focus ring with no replacement */
button {
  all: unset;
}
```

**Rationale:** `all: unset` on buttons destroys the browser's default focus ring. `:focus` shows the ring on mouse clicks, which is visually noisy. `:focus-visible` only activates for keyboard users, meeting WCAG requirements without degrading mouse UX.

**Status:** doc-only

---

### 4. Rate-limit every public auth endpoint

**DO:** Apply rate limiting to all authentication endpoints (`/login`, `/register`, `/refresh`, `/verify`).

**DON'T:** Add rate limiting to some auth endpoints but forget others (e.g., `/refresh`).

**Rationale:** Auth endpoints are high-value targets for brute force and credential stuffing. Missing rate limits on even one endpoint (like token refresh) creates an exploitable gap.

**Status:** doc-only

---

### 5. Respect package dependency directions

**DO:** Only import from packages at the same layer or below (see [Architecture Overview](architecture/overview.md)).

**DON'T:** Import from `apps/*` in any package under `packages/*`. Don't add workspace dependencies that violate the layer hierarchy.

**Rationale:** Packages are published independently and must not depend on application code. Upward dependencies create circular imports and break the publish pipeline.

**Status:** lint-enforced (`no-restricted-imports` in package ESLint configs, PR #869)

---

### 6. Add database indexes for query filter columns

**DO:** Add indexes on columns used in `WHERE` clauses, especially foreign keys and timestamp fields like `expiresAt`.

**DON'T:** Add tables with filter/join columns that lack indexes.

**Rationale:** Missing indexes on frequently queried columns (foreign keys, expiry timestamps) cause full table scans that degrade as data grows. Adding indexes later requires a migration.

**Status:** doc-only

---

### 7. Use `substring` not `substr`

**DO:** Use `String.prototype.substring()` for extracting parts of strings.

```typescript
const part = value.substring(0, 10);
```

**DON'T:** Use `String.prototype.substr()` — it is deprecated.

```typescript
// WRONG — deprecated method
const part = value.substr(0, 10);
```

**Rationale:** `substr` is deprecated in the ECMAScript specification. `substring` is the standard replacement with equivalent functionality.

**Status:** doc-only (lint rule could be added via `no-restricted-properties`)

---

### 8. PascalCase for Vue component files

**DO:** Name Vue component files in PascalCase (e.g., `BadgeCard.vue`, `ProfileViewer.vue`).

**DON'T:** Use kebab-case or camelCase for component files in `components/` directories.

**Rationale:** PascalCase matches the component name used in templates and imports. Consistent naming makes components easy to find via file search.

**Status:** lint-enforced (`vue/match-component-file-name` in shared-config, PR #869)

---

### 9. Track docs freshness in docs/index.md

**DO:** Add new key documentation files to `docs/index.md` with a verification date. Update the date when you verify a doc is still accurate.

**DON'T:** Let docs go stale without review. The CI `docs-freshness` job warns when any tracked doc has not been verified in 90+ days.

**Rationale:** Documentation drifts from reality over time. Periodic verification ensures docs remain useful and accurate. The 90-day threshold is configurable.

**Status:** ci-enforced (`docs-freshness.yml` workflow, PR #869)

## Escalation Path

### Proposing a new rule

1. Observe the same review comment on 2+ separate PRs.
2. Open a PR adding the rule to this file with: DO, DON'T, rationale, status.
3. Set status to `doc-only`.

### Promoting doc-only to lint-enforced

1. Create an issue in the monorepo referencing this rule.
2. Add the lint rule to `packages/shared-config` (ESLint config or custom rule).
3. Update the rule's status in this file to `lint-enforced` with the issue/PR number.
4. Verify CI catches violations across all packages.
