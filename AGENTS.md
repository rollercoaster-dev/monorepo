# AGENTS.md

## What This Project Is

rollercoaster.dev (native) — a personal learning and goal tracking app for neurodivergent users. React Native + Expo, local-first, Open Badges 3.0.

See `docs/vision/product-vision.md` for full context.

## Quick Reference

| Question | Where to look |
|---|---|
| What is this app? | `docs/vision/product-vision.md` |
| Design principles? | `docs/vision/design-principles.md` |
| User stories? | `docs/vision/user-stories.md` |
| Architecture decisions? | `docs/decisions/ADR-*.md` |
| Data model? | `docs/architecture/data-model.md` |
| Design language? | `docs/design/design-language.md` |
| Theme system? | `docs/design/nd-themes.md`, `docs/architecture/design-token-system.md` |
| Accessibility? | `docs/accessibility-guidelines.md` |

## Tech Stack

| Layer | Choice | Docs |
|---|---|---|
| Runtime | Expo / React Native | `app.json`, `metro.config.js` |
| UI styling | react-native-unistyles v3 | `docs/decisions/ADR-0002-ui-styling-library.md` |
| Local storage | Evolu (SQLite + CRDT) | `docs/decisions/ADR-0003-sync-layer-decision.md`, `src/db/` |
| Navigation | React Navigation | `src/navigation/` |
| Testing | Jest 30 + @testing-library/react-native v13 | `jest.config.js`, `src/__tests__/` |
| Design tokens | Unistyles themes (14 = 2 color modes x 7 variants) | `src/themes/` |

## Project Structure

```
src/
├── __tests__/       # Test suites (mirrors src/ structure)
├── components/      # Shared UI components (Button, Card, Input, etc.)
├── db/              # Evolu database schema and queries
├── hooks/           # Custom React hooks
├── navigation/      # React Navigation stacks and tabs
├── screens/         # Screen components (GoalsScreen, SettingsScreen, etc.)
├── stories/         # Storybook stories
├── styles/          # Shared style utilities
├── themes/          # Unistyles theme definitions, tokens, palette
└── utils/           # Utility functions
```

## Development Commands

| Command | Purpose |
|---|---|
| `bun run typecheck` | TypeScript type checking |
| `bun run lint` | ESLint |
| `bun test` | Run Jest test suite |
| `bun run test:ci` | CI test run |
| `npx expo run:ios` | Build and run on iOS (NEVER use `expo start`) |

## Architectural Rules

1. **Components don't import from screens.** Shared components are in `src/components/`, screens consume them.
2. **Theme tokens, not raw colors.** Use `theme.colors.*` from unistyles, never hardcoded hex values.
3. **Every component has:** `index.ts` (barrel export), `*.styles.ts` (unistyles stylesheet), test file, optional `.stories.tsx`.
4. **Local-first always.** No feature requires network connectivity. Sync is optional.
5. **Neurodivergent-first.** Design decisions are driven by ND needs. See `docs/vision/design-principles.md`.

## Documentation

Each `docs/` subdirectory has an `index.md` with a summary and links:

- `docs/vision/index.md` — Product vision, principles, user stories
- `docs/architecture/index.md` — Data model, sync, badges, design tokens
- `docs/design/index.md` — Design language, themes, user flows
- `docs/decisions/index.md` — Architecture Decision Records
- `docs/research/index.md` — Completed research (UI libraries, sync layers, Evolu prototype)
- `docs/plans/index.md` — Active and completed implementation plans

## Agent Workflow

- **Planning**: graph-flow planning stack (`mcp__graph-flow__p-*`)
- **Issue tracking**: GitHub Issues + GitHub Project board
- **Code review**: CodeRabbit + Claude review on every PR
- **Skills**: See `skills/` directory and `.agents/skills/`
- **Dev plans**: `.claude/dev-plans/` for issue-specific implementation plans
