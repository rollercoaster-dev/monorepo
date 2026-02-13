# native-rd

React Native + Expo app for rollercoaster.dev. Uses TypeScript, Evolu (local-first DB), react-native-unistyles (theming).

## Commands

- `npx jest --no-coverage` — run tests (do NOT use `bun test`, it hangs)
- `npx tsc --noEmit` — type-check (no `type-check` script in package.json)
- `bun run lint` — lint
- `bun run build` — build

## Tests

- Use `test.each` instead of duplicating tests that follow the same pattern.
- Don't write tests that assert nothing beyond "it renders."
- Before deleting a test, grep the codebase to confirm something else covers that behavior.
- Never delete a11y contract tests or regression tests tied to bug fixes.

## Design System

Neo-brutalist visual language with hard shadows, bold borders, and confident typography.

- **Tokens from:** `@rollercoaster-dev/design-tokens` (npm package, lives in openbadges-monorepo)
- **Adapter layer:** `src/themes/adapter.ts` — the single import boundary from the package
- **Theme composition:** `src/themes/compose.ts` — 2 color modes × 7 variants = 14 themes
- **Shadows:** `src/styles/shadows.ts` — `shadowStyle(theme, key)` helper; hard shadows (`hardSm`/`hardMd`/`hardLg`) have radius: 0
- **Fonts:** Anybody (headlines), Instrument Sans (body), DM Mono (code), Lexend (dyslexia), Atkinson Hyperlegible (low vision)
- **Storybook:** `src/stories/design-system/` — Colors, Typography, Spacing reference stories

Theme names follow `{colorMode}-{variant}` pattern (e.g., `light-default`, `dark-highContrast`).

## ND Accessibility

Targets WCAG 2.1 AA. Six accessibility variants built as day-one requirements, not afterthoughts:

- **highContrast** — WCAG AAA (7:1), no shadows, strong borders
- **largeText** — 1.25× font scale
- **dyslexia** — Lexend font, cream bg, relaxed line height (1.7–1.9×)
- **lowVision** — max contrast + large text combined
- **autismFriendly** — muted/desaturated colors, no shadows, reduced visual noise
- **lowInfo** — reduced visual complexity

Key files: `src/utils/accessibility.ts` (contrast checker), `docs/accessibility-guidelines.md`, `src/__tests__/accessibility.test.tsx` (a11y contract tests), `src/themes/__tests__/contrast.test.ts`.

All interactive elements require: `accessibilityRole`, `accessibilityLabel`, 44×44pt minimum touch targets.

## OpenBadges Core

Badge logic comes from `openbadges-modular-server` in the [rollercoaster-dev monorepo](https://github.com/rollercoaster-dev/openbadges-monorepo). Being extracted into `@rollercoaster-dev/openbadges-core` as a shared package.

- **What native-rd uses:** credential building, Ed25519 signing, key pair generation, PNG baking
- **Key abstraction:** `KeyProvider` interface — server uses `FileSystemKeyProvider`, native app will use `SecureStoreKeyProvider` (Expo SecureStore)
- **RN concerns:** `jose` works as-is; Node `crypto` → `expo-crypto`; Node `zlib` → `pako`
- **Architecture doc:** `docs/architecture/openbadges-core.md`
- **Data model:** `src/db/schema.ts` (Evolu tables for goals, evidence, badges)

## Graph Flow (Issue Workflow)

Slash commands for the full issue-to-PR lifecycle:

| Command | What it does |
|---------|-------------|
| `/work-on-issue <#>` | Creates branch, sets up board, fetches issue |
| `/implement` | Implements code from a dev plan with atomic commits |
| `/review` | Runs code-reviewer, test-analyzer, silent-failure-hunter in parallel |
| `/finalize` | Pushes branch, creates PR, updates board |
| `/auto-issue` | Creates a new GitHub issue |
| `/board-status` | Shows project board state |
| `/issue-fetcher` | Fetches and analyzes issue details |
| `/milestone-status` | Shows milestone progress and blockers |
