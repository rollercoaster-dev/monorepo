# Roadmap

Structured path from current state to product. Based on [issue themes analysis](./issue-themes.md).

**Last updated:** 2026-01-16

---

## Milestone Overview

Milestones are numbered by dependency order. The `-i` suffix indicates independent tracks that can run in parallel.

| #    | Milestone              | Open | Closed | Status              |
| ---- | ---------------------- | ---- | ------ | ------------------- |
| 01   | OB3 Phase 1: Core Spec | 0    | 24     | **Complete**        |
| 02   | Badge Generator        | 0    | 27     | **Complete**        |
| 03   | Infrastructure         | 17   | 10     | **Next** (blocking) |
| 04   | OB3 Phase 2: UI Layer  | 6    | 1      | Next                |
| 05   | OB3 Phase 3: Quality   | 3    | 0      | Not Started         |
| 06   | Issuer Model UI        | 13   | 0      | Not Started         |
| 07   | UI Components          | 15   | 0      | Not Started         |
| 08   | Badge Backpack         | 7    | 1      | Not Started         |
| 09   | Core Services          | 13   | 0      | Not Started         |
| 10-i | Self-Signed Badges     | 4    | 0      | Independent         |
| 11-i | Developer Experience   | 13   | 0      | Independent         |
| 12-i | Documentation          | 8    | 6      | Independent         |
| -    | Claude Knowledge Graph | 18   | 26     | Active              |

---

## Current Focus

### Priority 1: Infrastructure (#03) - BLOCKING

Build and type errors in openbadges-ui that block all UI work.

**Issues:**

- #224: Path alias resolution in type declarations
- #227: Type errors in Vue components
- #228: Type errors in test files

**Why now:** These bugs block any new openbadges-ui component work.

### Priority 2: OB3 Phase 2 - UI Layer (#04)

The server-side OB3 work (Phase 1) is complete. Now the UI needs to catch up.

**Issues:**

- #153-158: UI OB3 compliance fixes
- #160-163: System OB3 integration

**Why now:** OB3 types exist, server is compliant. UI/System need to use them.

### Priority 3: Issuer Model UI (#06)

UI primitives for badge creation. Depends on OB3 Phase 2. Enables Badge Generator UI.

### Priority 4: UI Components (#07)

Display components for badge viewing. After OB3 Phase 2 for OB3-native components.

---

## Phase 1: Complete OB3 Migration (Current)

### Milestone 04: OB3 Phase 2 - UI Layer

| Issue | Title                                      | Priority |
| ----- | ------------------------------------------ | -------- |
| #153  | OB3 test coverage for validFrom/validUntil | Medium   |
| #154  | BadgeClassCard OB3 Achievement arrays      | High     |
| #155  | OB3 VerifiableCredential test coverage     | Medium   |
| #156  | Export typeIncludes() type guard           | Low      |
| #157  | ARIA labels for OB3 credentialSubject      | Medium   |
| #158  | Validate OB3 @context array format         | High     |

### Milestone 05: OB3 Phase 3 - Quality

| Issue | Title                                      | Priority |
| ----- | ------------------------------------------ | -------- |
| #160  | OB3 validFrom/validUntil in badge issuance | High     |
| #162  | OB3 support in validation middleware       | High     |
| #163  | OB3 badge creation/issuance tests          | High     |

**Completion criteria:** All packages handle OB3 credentials natively.

Note: #159 (BadgeIssuerForm OB3 fields) was closed - form is being deprecated via #534.

---

## Phase 2: Core Features

### Milestone 06: Issuer Model UI

UI primitives for badge creation and management. Enables the issuer model (personal/org issuers, evidence, approval workflows).

**Design References:**

- Mockup: `docs/mockups/openbadges-system-ui.html`
- Design: `docs/design/issuer-model.md`

**Form Primitives:**

- #522: IssuerSelector - Personal/org picker
- #523: EvidenceSettings - Evidence requirement config
- #524: ApprovalMethodPicker - Self/review/claim code

**Badge Designer:**

- #525: BadgePreviewCard - Clickable preview thumbnail
- #526: BadgeDesigner - Main designer component
- #527: ShapeSelector - Template shape grid
- #528: ColorPicker - Color swatch picker
- #529: ImageUploader - Drag/drop upload

**Review & Management:**

- #530: ApplicationCard - Review queue item
- #531: MembersTable - Org member management
- #532-533: RoleBadge, StatusBadge - Status indicators
- #534: Deprecate BadgeIssuerForm

**Dependencies:** OB3 Phase 2 (#04) should complete first for OB3-native components.

**Completion criteria:** Can build Create Badge and Review Applications pages from primitives.

### Milestone 09: Core Services

API key management and remaining infrastructure.

**Baking Pipeline:** ✅ COMPLETE (#115-120 all closed)

**Verification Pipeline:**

- #122: Proof verification
- #123: Issuer verification
- #124: Unified verification service
- #125: Verify credential endpoint
- #126: Verify baked image endpoint

**API Key Management:**

- #164-167: SQLite/PostgreSQL repositories and endpoints

**Completion criteria:** Full API key management, verification endpoints complete.

### Milestone 02: Badge Generator ✅ COMPLETE

Simple tool to create badges. All 27 issues closed.

### Milestone 10-i: Self-Signed Badges (Independent Track)

The differentiating feature. Issue badges without server.

- Client-side cryptographic signing
- Offline-capable badge creation
- Export with embedded verification

### Milestone 08: Badge Backpack

Personal badge collection interface. Backend is complete - UI components needed.

- Badge import/export
- Collection display (BackpackToolbar, BackpackStats, BackpackFilters)
- Sharing capabilities

---

## Phase 3: Developer Experience

### Milestone 03: Infrastructure - BLOCKING

Must fix before UI work can proceed.

- #224, #227, #228: openbadges-ui build/type errors
- #190-194: TypeScript strictness, package config cleanup
- #242: Fix flaky integration tests

**Completion criteria:** Clean CI, openbadges-ui builds without errors.

### Milestone 11-i: Developer Experience (Independent Track)

**rd-logger Integration:**

- #218-223: Consistent logging across all packages

**Completion criteria:** Consistent logging, clean tooling.

---

## Phase 4: Polish

### Milestone 07: UI Components

Complete the display component library:

- Badge metadata panel
- Badge detail view
- Verification result card
- Backpack toolbar and stats

### Milestone 12-i: Documentation (Independent Track)

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

1. **BLOCKING:** Infrastructure bugs (#224, #227, #228) - Fix first
2. **Current milestone:** OB3 Phase 2 issues (#153-158)
3. **After OB3 Phase 2:** Issuer Model UI (#522-534)
4. **Documentation:** Always welcome (#203, #209) - Independent track
5. **Bug fixes:** Flaky tests (#242)

**Dependency chain:** Infrastructure (#03) → OB3 Phase 2 (#04) → Issuer Model UI (#06) → UI Components (#07) → Badge Backpack (#08)

**Independent tracks:** Self-Signed (#10-i), Developer Experience (#11-i), Documentation (#12-i)

---

## Updating This Document

When milestones change:

1. Run `/board-status` to get current counts
2. Update the overview table
3. Move issues between phases if priorities shift
4. Keep [issue-themes.md](./issue-themes.md) in sync
