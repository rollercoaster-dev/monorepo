# Roadmap

Structured path from current state to product. Based on [issue themes analysis](./issue-themes.md).

**Last updated:** 2026-01-15

---

## Milestone Overview

| #   | Milestone              | Open | Closed | Status       |
| --- | ---------------------- | ---- | ------ | ------------ |
| 01  | OB3 Phase 1: Core Spec | 0    | 24     | **Complete** |
| 02  | Badge Generator        | 5    | 18     | In Progress  |
| 03  | Self-Signed Badges     | 4    | 0      | Not Started  |
| 04  | Badge Backpack         | 7    | 1      | Not Started  |
| 05  | Core Services          | 12   | 0      | Not Started  |
| 06  | Developer Experience   | 13   | 0      | Not Started  |
| 07  | OB3 Phase 2: UI Layer  | 7    | 0      | **Next**     |
| 08  | OB3 Phase 3: Quality   | 3    | 0      | Not Started  |
| 09  | UI Components          | 15   | 0      | Not Started  |
| 10  | Infrastructure         | 14   | 10     | In Progress  |
| 11  | Documentation          | 8    | 6      | In Progress  |
| -   | Claude Knowledge Graph | 19   | 25     | Active       |

---

## Current Focus

### Priority 1: OB3 Phase 2 - UI Layer (#07)

The server-side OB3 work (Phase 1) is complete. Now the UI needs to catch up.

**Issues:**

- #153-158: UI OB3 compliance fixes
- #159-163: System OB3 integration

**Why now:** OB3 types exist, server is compliant. UI/System need to use them.

### Priority 2: Badge Generator (#02)

Mostly complete (18/23 done). Finish remaining 5 issues.

### Priority 3: Core Services (#05)

Baking and verification pipelines. Depends on OB3 UI being stable.

---

## Phase 1: Complete OB3 Migration (Current)

### Milestone 07: OB3 Phase 2 - UI Layer

| Issue | Title                                      | Priority |
| ----- | ------------------------------------------ | -------- |
| #153  | OB3 test coverage for validFrom/validUntil | Medium   |
| #154  | BadgeClassCard OB3 Achievement arrays      | High     |
| #155  | OB3 VerifiableCredential test coverage     | Medium   |
| #156  | Export typeIncludes() type guard           | Low      |
| #157  | ARIA labels for OB3 credentialSubject      | Medium   |
| #158  | Validate OB3 @context array format         | High     |

### Milestone 08: OB3 Phase 3 - Quality

| Issue | Title                                      | Priority |
| ----- | ------------------------------------------ | -------- |
| #159  | BadgeIssuerForm OB3 Achievement fields     | High     |
| #160  | OB3 validFrom/validUntil in badge issuance | High     |
| #162  | OB3 support in validation middleware       | High     |

**Completion criteria:** All packages handle OB3 credentials natively.

---

## Phase 2: Core Features

### Milestone 05: Core Services

Baking and verification - the core badge operations.

**Baking Pipeline:**

- #115: PNG chunk utilities
- #116: PNG baking service
- #117: SVG parsing utilities
- #118: SVG baking service
- #119: Unified baking service
- #120: Bake credential endpoint

**Verification Pipeline:**

- #122: Proof verification
- #123: Issuer verification
- #124: Unified verification service
- #125: Verify credential endpoint
- #126: Verify baked image endpoint

**Completion criteria:** Can embed and extract credentials from images.

### Milestone 02: Badge Generator (In Progress)

Simple tool to create badges. 18/23 issues done.

### Milestone 03: Self-Signed Badges

The differentiating feature. Issue badges without server.

- Client-side cryptographic signing
- Offline-capable badge creation
- Export with embedded verification

### Milestone 04: Badge Backpack

Personal badge collection interface.

- Badge import/export
- Collection display
- Sharing capabilities

---

## Phase 3: Developer Experience

### Milestone 06: Developer Experience

**rd-logger Integration:**

- #218-223: Consistent logging across all packages

**API Key Management:**

- #164-167: SQLite/PostgreSQL API key repositories

### Milestone 10: Infrastructure (In Progress)

- #190-194: TypeScript strictness, package config cleanup
- #242: Fix flaky integration tests

**Completion criteria:** Clean CI, consistent tooling.

---

## Phase 4: Polish

### Milestone 09: UI Components

Complete the component library:

- Badge metadata panel
- Badge detail view
- Verification result card
- Backpack toolbar and stats

### Milestone 11: Documentation (In Progress)

- Developer guides
- API documentation
- Glossary
- Troubleshooting

---

## Claude Tooling

### Claude Knowledge Graph (Active)

Separate track for Claude Code integration:

- Session continuity (#479)
- Knowledge graph search
- Workflow automation

This supports development velocity but doesn't block product features.

---

## Working on Issues

```bash
# Supervised workflow (with approval gates)
/work-on-issue 154

# Autonomous workflow (no gates)
/auto-issue 154

# Batch milestone execution
/auto-milestone "07 - OB3 Phase 2: UI Layer"
```

**Before starting:** Check issue dependencies. Don't start blocked issues.

---

## Recommended Order

For new contributors or when unsure what to pick:

1. **High impact, low dependency:** Infrastructure fixes (#190-194)
2. **Current milestone:** OB3 Phase 2 issues (#153-158)
3. **Documentation:** Always welcome (#203, #209)
4. **Bug fixes:** Flaky tests (#242)

Avoid starting Core Services (#05) until OB3 Phases 2-3 are done.

---

## Updating This Document

When milestones change:

1. Run `/board-status` to get current counts
2. Update the overview table
3. Move issues between phases if priorities shift
4. Keep [issue-themes.md](./issue-themes.md) in sync
