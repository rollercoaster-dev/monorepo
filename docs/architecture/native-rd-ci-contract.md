# native-rd: CI and Validation Contract

Follow-up to PR #882 (monorepo import) and PR #890 (Jest stabilization).
Resolves issue #888.

## Validation Environments

native-rd has a different toolchain from the rest of the monorepo:

- Test runner: Jest 30 + babel-jest (not bun test)
- Lint: eslint-config-expo + six local rules (not shared-config Vue/TS rules)
- Types: TypeScript strict, RN-aware tsconfig

For this reason it has its own dedicated CI workflow (`ci-native-rd.yml`) and
its own ESLint config (`apps/native-rd/eslint.config.js`).

## CI Workflow Boundary

| Check              | Root CI (`ci.yml`)                              | Native CI (`ci-native-rd.yml`) | E2E CI (`e2e-native-rd.yml`)      |
| ------------------ | ----------------------------------------------- | ------------------------------ | --------------------------------- |
| Lint (`expo lint`) | via `turbo lint` (scope-filtered, cached)       | Always (filter=native-rd)      | Not run                           |
| TypeScript         | via `turbo type-check` (scope-filtered, cached) | Always (filter=native-rd)      | Not run                           |
| Jest tests         | Not run                                         | Always (`jest --ci`)           | Not run                           |
| Prettier format    | via `format:check`                              | Not run (delegated to root)    | Not run                           |
| Build              | via `turbo build`                               | Not run (no build step)        | Not run                           |
| Maestro E2E flows  | Not run                                         | Not run                        | Always (self-hosted macOS runner) |

`ci.yml` triggers on ALL PRs; `ci-native-rd.yml` triggers only when `apps/native-rd/**`
or its workspace deps change. When both trigger on a native-rd PR the lint and type-check
for native-rd run twice (once in each workflow). Turbo caches per-package within a single
run, but there is no remote cache configured, so the two workflows do not share results.
The duplicated work is cheap (~seconds) because lint and type-check for a single package
are fast.

## Pre-commit Behavior

Root `lint-staged` configuration:

- `apps/native-rd/**/*.{ts,tsx,js,jsx}`: Prettier only (no root ESLint)
- All other TS/TSX/JS/JSX/Vue: root ESLint + Prettier
- JSON, YAML, MD, CSS: Prettier only

Root ESLint does NOT run on native-rd source files because:

- Root config uses Vue/TS rules incompatible with Expo/React-Native globals
- Root config does not load eslint-config-expo or the six local plugin rules
- Running root ESLint on native files can block commits for false positives

To lint native-rd files locally before committing, run:

```bash
cd apps/native-rd && bun run lint
```

## Test Contract

- Test runner: Jest 30 with `babel-jest` transform (not bun test)
- Test command for CI: `bun run test:ci` (`jest --ci`) from `apps/native-rd/`
- Test discovery: `src/**/__tests__/**/*.test.{ts,tsx}`
- The smoke command (`bun run test:ci:smoke` = `jest --listTests`) is retained as a
  debugging tool but is not used in CI.
- All tests run in Node via the React Native Jest environment
  (`react-native/jest/react-native-env.js`)

## E2E Workflow

`e2e-native-rd.yml` runs on `[self-hosted, macOS, e2e]` (Mac Mini). It requires:

- Maestro CLI installed on the runner
- A booted iOS Simulator with `com.joe.rd.native-rd` installed

Setup procedure: `docs/infrastructure/mac-mini-runner-setup.md`

The exit-0 fallback in `run-e2e.sh` remains in place until the self-hosted runner is
live. Once the runner is online, the fallback will be removed (tracked in epic #889).

## What Does NOT Apply to native-rd

The following root-level checks do not run for native-rd (by design):

- `bun test` / vitest — native-rd uses Jest, not bun's test runner
- Root ESLint (`eslint.config.mjs`) — native-rd uses `eslint.config.js` inside the app
- Root unit/integration/e2e turbo tasks — native-rd tests run via Jest in the native workflow
