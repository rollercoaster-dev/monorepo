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
