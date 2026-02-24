# Claude Code Instructions — native-rd

## Hard Rules

- **NEVER run interactive CLI commands** (auth flows, prompts, `git rebase -i`, etc.) — they hang.
- **Always use native builds** — run `npx expo run:ios` (not `npx expo start`). This is a dev client app, not Expo Go.
- **Always check PR review comments before merging** — even when CI is green. Run the full review cycle every time.

## Project Context

This is the native rollercoaster.dev app — a personal learning/goal tracker for neurodivergent users. See `AGENTS.md` for the full map.

## Development

| Task | Command |
|---|---|
| Typecheck | `bun run typecheck` |
| Lint | `bun run lint` |
| Test | `bun test` or `bun test --testPathPatterns <pattern>` |
| CI test | `bun run test:ci` |
| Build iOS | `npx expo run:ios` |

### Test Infrastructure

- Jest 30, `@testing-library/react-native` v13, ~253 tests
- Use `--testPathPatterns` (plural, not `--testPathPattern`)
- Test files live in `src/__tests__/` mirroring `src/` structure

### Styling

- **react-native-unistyles v3** with Babel plugin (ADR-0002)
- `StyleSheet.create((theme) => ...)` IS reactive to theme changes via `setTheme()`
- 14 themes = 2 color modes x 7 variants
- Use theme tokens, never hardcoded colors

## Workflow

- **Query graph-flow knowledge before acting** — run `k-query` for relevant area/topic at session start
- **Planning stack**: use `p-stack`, `p-goal`, `p-plan` etc. for tracking work
- **Issue workflow**: graph-flow skills (`setup`, `implement`, `finalize`)
- **Code review**: CodeRabbit CLI at `~/.local/bin/coderabbit` — use `coderabbit review --plain`

## After Making Changes

| Changed | Run |
|---|---|
| React Native code | `npx expo run:ios` (native build) |
| Test files | `bun test --testPathPatterns <pattern>` |
| Theme/style files | Build + visually verify on device |
