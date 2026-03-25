# Architecture Overview

Rollercoaster.dev is a Bun + Turborepo monorepo for Open Badges credentialing. This document maps every package and app, their roles, dependency directions, and data flow.

## Package Map

### Foundation Layer (no workspace dependencies)

| Package         | npm Name                           | Role                                                                                            |
| --------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| `shared-config` | `@rollercoaster-dev/shared-config` | ESLint, TypeScript, Prettier configs shared across all packages. Internal only (not published). |
| `design-tokens` | `@rollercoaster-dev/design-tokens` | Design tokens (CSS, JS, Tailwind, Tamagui). Defines colors, spacing, typography, shadows.       |

### Core Layer

| Package            | npm Name                             | Role                                                                                                                         |
| ------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `openbadges-types` | `openbadges-types`                   | TypeScript type definitions for Open Badges 2.0 and 3.0 specifications.                                                      |
| `rd-logger`        | `@rollercoaster-dev/rd-logger`       | Structured logging with neurodivergent-friendly formatting.                                                                  |
| `openbadges-core`  | `@rollercoaster-dev/openbadges-core` | Shared core library for Open Badges functionality (cryptography, validation). Depends on `rd-logger` and `openbadges-types`. |

### UI Layer

| Package         | npm Name        | Role                                                                      |
| --------------- | --------------- | ------------------------------------------------------------------------- |
| `openbadges-ui` | `openbadges-ui` | Vue 3 component library for badge display, verification, and interaction. |

### Application Layer

| App                         | Role                                                                     |
| --------------------------- | ------------------------------------------------------------------------ |
| `openbadges-modular-server` | OB 2.0/3.0 API server (Bun/Hono). Badge issuing, verification, hosting.  |
| `openbadges-system`         | Full-stack app (Vue 3 + Bun/Hono). Badge management UI, backpack, admin. |

## Dependency Directions

Arrows show "depends on" (runtime). Dev-only dependencies (`shared-config`) omitted for clarity.

```text
                    ┌─────────────┐     ┌───────────────┐
                    │design-tokens│     │openbadges-types│
                    └──────┬──────┘     └───────┬────────┘
                           │                    │
                    ┌──────▼──────┐             │
                    │openbadges-ui├─────────────┘
                    └──────┬──────┘
                           │
  ┌────────────────────────┼──────────────────────────────────┐
  │                        │                                  │
  │              ┌─────────┴──────────┐                       │
  │              │   openbadges-core  │                       │
  │              │(rd-logger + types) │                       │
  │              └────────────────────┘                       │
  │                                                           │
  ▼                     ▼                                     ▼
┌─────────────────┐  ┌───────────┐  ┌──────────────────────────┐
│openbadges-system│  │ rd-logger │  │openbadges-modular-server │
│  (uses all 4)   │  └───────────┘  │  (rd-logger + types)     │
└─────────────────┘                 └──────────────────────────┘
```

### Full Dependency Table

Every dependency on monorepo packages, verified from `package.json` files. Some packages use published npm versions rather than `workspace:*` protocol.

| Package                     | Runtime Dependencies                                              | Dev Dependencies |
| --------------------------- | ----------------------------------------------------------------- | ---------------- |
| `shared-config`             | —                                                                 | —                |
| `design-tokens`             | —                                                                 | —                |
| `openbadges-types`          | —                                                                 | `shared-config`  |
| `rd-logger`                 | —                                                                 | `shared-config`  |
| `openbadges-core`           | `rd-logger`, `openbadges-types`                                   | `shared-config`  |
| `openbadges-ui`             | `design-tokens`, `openbadges-types`                               | `shared-config`  |
| `openbadges-modular-server` | `rd-logger`, `openbadges-types`                                   | `shared-config`  |
| `openbadges-system`         | `rd-logger`, `openbadges-types`, `openbadges-ui`, `design-tokens` | `shared-config`  |

## Prohibited Import Directions

These constraints maintain layering. Enforcement is tracked in issue #869.

| Rule                                                          | Rationale                                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `packages/*` must not import from `apps/*`                    | Packages are reusable libraries; depending on apps creates circular deps. |
| `shared-config` must not import from any workspace package    | It is the foundation — no upward deps allowed.                            |
| `design-tokens` must not import from any workspace package    | Pure token output — no logic deps.                                        |
| `openbadges-types` must not import from any workspace package | Type definitions must remain dependency-free for all consumers.           |

## Cross-Cutting Concerns

### Logging

`rd-logger` provides structured logging across the monorepo. It enters at the application layer (`openbadges-system`, `openbadges-modular-server`) and can be used in any package that adds it as a dependency. All application logging must use `rd-logger` — never `console.*` directly. See [Golden Principles](../golden-principles.md).

### Types

`openbadges-types` defines the OB 2.0/3.0 type system. It is consumed by `openbadges-core`, `openbadges-ui`, `openbadges-modular-server`, and `openbadges-system`. Any package that handles badge data should depend on `openbadges-types` for type safety.

### Design Tokens

`design-tokens` provides the visual language (colors, spacing, shadows, typography). It is consumed by `openbadges-ui` and `openbadges-system`. All visual styling should reference tokens — never hardcoded values.

### Authentication

Auth enters at the `openbadges-system` server layer via WebAuthn passkeys. The `useAuth()` composable manages client-side auth state. There is no global router guard — individual pages check auth status. Auth endpoints must be rate-limited (see [Golden Principles](../golden-principles.md)).

## Data Flow

```text
Browser
  │
  ▼
openbadges-system (Vue 3 client)
  │  Components from openbadges-ui
  │  Styles from design-tokens
  │
  │  /api/* requests
  ▼
openbadges-system (Hono server, port 8888)
  │  Proxied by Vite dev server (port 7777)
  │  Uses rd-logger for request/error logging
  │  Uses openbadges-types for request/response shapes
  │
  ▼
Database (SQLite/Drizzle)


Badge Issuer / Verifier
  │
  ▼
openbadges-modular-server (Hono, standalone)
  │  Uses rd-logger for structured logging
  │  Uses openbadges-types for OB 2.0/3.0 shapes
  │
  ▼
Database (SQLite/Drizzle)
```
