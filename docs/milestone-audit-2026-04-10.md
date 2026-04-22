# Milestone Audit Report — 2026-04-10

Audit of all 162 open issues across 15 milestones, cross-referenced against current codebase state.

---

## Executive Summary

| Milestone                   | Open | Done  | Partial | Not Started | Stale/Dup   |
| --------------------------- | ---- | ----- | ------- | ----------- | ----------- |
| 01 - OB3 Phase 1            | 1    | 0     | 1       | 0           | 0           |
| 02 - Badge Generator        | 5    | **5** | 0       | 0           | **5 ghost** |
| 03 - Infrastructure         | 8    | 1     | 3       | 3           | 1           |
| 05 - OB3 Phase 3            | 0    | —     | —       | —           | —           |
| 06 - Issuer Model UI        | 15   | 1     | 1       | 11          | 2           |
| 07 - UI Components          | 17   | 1     | 5       | 11          | 0           |
| 08 - Badge Backpack         | 7    | 0     | 2       | 5           | 0           |
| 09 - Core Services          | 16   | 7     | 3       | 4           | 2           |
| 10 - Self-Signed Badges     | 3    | 0     | 2       | 1           | 0           |
| 11-i - Developer Experience | 20   | 2     | 6       | 12          | 0           |
| 12-i - Documentation        | 10   | 0     | 3       | 7           | 0           |
| 13 - openbadges-core        | 13   | 1     | 3       | 9           | 0           |
| 15 - Platform Integration   | 42   | 0     | 0       | **42**      | 0           |
| Claude Knowledge Graph      | 1    | 0     | 0       | 0           | **1 stale** |
| Harness Engineering         | 4    | 0     | 0       | 4           | 0           |

**Key numbers:**

- **17 issues appear done** but are still open (should be closed or verified)
- **5 ghost issues** in Milestone 14 — ROADMAP says complete, GitHub says open
- **3 duplicate pairs** across milestones
- **42 issues (Milestone 27)** have zero code written
- **~110 issues** genuinely not started

---

## Finding 1: Ghost Issues — Milestone 14 (Badge Generator)

**Severity: Bookkeeping**

The ROADMAP.md declares Milestone 02 (Badge Generator) as "✅ COMPLETE — All 27 issues closed." Yet GitHub shows **5 issues still open**: #100, #101, #102, #103, #104. No badge generator code exists in the repo (`apps/badge-generator-lite` and `packages/badge-generator-core` both missing).

**Possible explanations:**

- Work was done in a separate repo that was later archived
- Issues were re-opened after ROADMAP was updated
- Issues were moved to this milestone from elsewhere

**Recommendation:** Verify whether these 5 issues are truly done. If so, close them. If not, update ROADMAP.md.

---

## Finding 2: Duplicate Issues Across Milestones

### Pair A: API Key Management

| Issue    | Milestone                 | Title                             |
| -------- | ------------------------- | --------------------------------- |
| **#167** | 09 - Core Services        | API key management REST endpoints |
| **#835** | 15 - Platform Integration | API key management REST endpoints |

#835 explicitly states "This supersedes #167 from Milestone 09." **#167 should be closed as superseded.**

### Pair B: ApiKeyRepository ↔ ApiKeyAdapter Integration

| Issue    | Milestone                 | Title                                         |
| -------- | ------------------------- | --------------------------------------------- |
| **#166** | 09 - Core Services        | Integrate ApiKeyRepository with ApiKeyAdapter |
| **#836** | 15 - Platform Integration | Integrate ApiKeyRepository with ApiKeyAdapter |

#836 explicitly states "This supersedes #166 from Milestone 09." **#166 should be closed as superseded.** Note: #166's work (repository implementation) IS done — the adapter wiring (#836) is not.

### Pair C: BadgeDesigner Component

| Issue    | Milestone                 | Title                       |
| -------- | ------------------------- | --------------------------- |
| **#526** | 06 - Issuer Model UI      | BadgeDesigner component     |
| **#842** | 15 - Platform Integration | Vue BadgeDesigner component |

Both describe the same Vue component. #842 is part of the Wave 3 demo app epic. **One should reference the other or be closed.**

---

## Finding 3: Issues Where Code Already Exists (Should Be Closed or Verified)

These open issues describe work that appears **complete** in the codebase:

| #        | Milestone            | Issue                            | Evidence                                                                           |
| -------- | -------------------- | -------------------------------- | ---------------------------------------------------------------------------------- |
| **#596** | 07 - UI              | Tailwind preset for consumers    | `design-tokens/build/tailwind/tailwind.config.js` exists, exported in package.json |
| **#251** | 09 - Core Services   | Fix detectBadgeVersion           | Logic correct in `openbadges-core/src/credentials/version.ts`                      |
| **#535** | 09 - Core Services   | Unbake endpoint                  | `/v3/verify/baked` endpoint implemented                                            |
| **#166** | 09 - Core Services   | ApiKeyRepository integration     | Repository + adapter both implemented with tests                                   |
| **#94**  | 09 - Core Services   | Service Discovery Document       | `.well-known/jwks.json` endpoint + E2E test                                        |
| **#88**  | 09 - Core Services   | OB2 verification service         | Full verification service at `src/services/verification/`                          |
| **#58**  | 09 - Core Services   | OB Protocol Conformance          | Full OB 2.0/3.0 endpoints implemented                                              |
| **#59**  | 09 - Core Services   | Enhanced Runtime Type Info       | Comprehensive types exported                                                       |
| **#60**  | 09 - Core Services   | Conversion Utilities             | Version detection + conversion in core                                             |
| **#884** | 03 - Infrastructure  | design-tokens unistyles export   | `/build/unistyles/` fully built, exported                                          |
| **#186** | 11-i - DX            | test:integration naming mismatch | Scripts properly named now                                                         |
| **#730** | 13 - openbadges-core | SecureStoreKeyProvider           | Implemented at `native-rd/src/crypto/SecureStoreKeyProvider.ts`                    |
| **#905** | 06 - Issuer Model UI | Wire asset upload endpoint       | `/v1/assets` POST fully implemented                                                |

**Recommendation:** Verify each against its acceptance criteria and close if met.

---

## Finding 4: Stale Issue — #646 (wave-orchestrator)

**Milestone:** Claude Knowledge Graph (SQLite)

Issue describes "wave-orchestrator log files empty due to buffered writes." No `wave-orchestrator` code exists anywhere in the repository. This code likely lived in a separate repo or was removed.

**Recommendation:** Close as stale or move to the correct repository.

---

## Finding 5: Milestone 27 — 42 Issues, Zero Code

**Milestone 15 - Platform Integration** has 42 open issues organized into 7 waves (epics #825, #834, #841, #847, #852, #857, #863). None of these features have any code in the repository:

- No platform registration endpoints
- No badge-designer-core package
- No organization issuer model
- No white-label theming
- No webhook system
- No batch assertion endpoint

This is the single largest milestone by issue count. All issues are correctly "not started" — no staleness problem, just a large backlog.

**Note:** Some Wave 2 issues (#835, #836) duplicate existing Milestone 09 issues (#167, #166) as noted in Finding 2.

---

## Finding 6: Architectural Drift — Component Naming (Milestones 8 + 10)

Issues #66–#74 (Milestone 8) and #62–#73 (Milestone 10) specify individual Vue components by exact name:

- `BackpackToolbar.vue`, `BackpackStats.vue`, `BackpackFilters.vue`
- `BadgeMetadataPanel.vue`, `BatchOperationsBar.vue`, `IssuedBadgesFilters.vue`

**None of these exist as named.** Instead, backpack functionality was built as a single comprehensive page (`apps/openbadges-system/src/client/pages/backpack.vue`) with inline filtering, stats, and toolbar functionality. Similarly, verification and detail views are page-level, not reusable components.

**This is not a problem if intentional** — the monolith-page approach may be correct for the current app. But the open issues imply a component-library architecture that was never followed.

**Recommendation:** Either:

- Close these issues as "won't do" (functionality exists, just not as separate components)
- Rewrite them to reflect actual extraction needs from the page into `openbadges-ui`

---

## Finding 7: #903 Supersedes Multiple Issues

Issue #903 ("real server-backed badge authoring and credential issuance flow") describes a comprehensive end-to-end flow that overlaps with:

- **#87** (Milestone 10) — Multi-step wizard for badge creation
- **#534** (Milestone 23) — Deprecate BadgeIssuerForm (can't deprecate until replacement exists)
- **#522–#529** (Milestone 23) — UI primitives (IssuerSelector, EvidenceSettings, etc.)

#903 is the system-integration issue; #522–#529 are the component-level breakdowns. These aren't duplicates but form a dependency chain: #903 depends on #522–#529 being built first. The milestone doesn't make this explicit.

**Recommendation:** Add dependency labels or a checklist in #903 referencing the component issues.

---

## Finding 8: Partially Done Work at Risk of Drift

These issues have significant partial implementation that could become stale:

| #        | Issue                         | What Exists                                                   | What's Missing                                                                      |
| -------- | ----------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **#885** | Native-safe entrypoint        | Platform detection in `openbadges-core/src/platform.ts`       | `jose` is still direct-imported in `jwt-proof.ts`, not conditional for React Native |
| **#906** | CRUD permissions              | RBAC middleware exists with `requireAuth()`, `requireRoles()` | Needs audit that ALL CRUD endpoints consistently enforce permissions                |
| **#445** | E2E tests / SQLite migrations | E2E test suite exists                                         | May need verification that migration issue is resolved                              |
| **#593** | Token-first theming epic      | 8 themes, full token architecture                             | Docs (#597, #598) not written; Tailwind preset (#596) done                          |
| **#89**  | Basic badge backpack          | Backend complete, UI page exists                              | Share/download/export marked TODO in code                                           |

---

## Finding 9: Testing Milestone Fragmentation (Milestone 21)

Milestone 21 has a testing epic (#266) with 7 sub-issues (#268–#279, #186). Current state is confused:

- **Two test runners coexist**: openbadges-system uses both Bun (`.bun.test.ts`) and Vitest (`.test.ts`) — #273 tracks this conflict but it's unresolved
- **rd-logger tests empty**: Test directory contains only `.gitkeep` despite #276 asking for Jest→Bun migration
- **No shared test utilities package** (#268): Each app has its own test helpers
- **Coverage at 35%**: Config exists but thresholds are minimal

The epic (#266) should be treated as blocking before individual issues can be completed coherently.

---

## Finding 10: Documentation Milestone Stalled (Milestone 12)

10 issues open, most not started:

| Status      | Issues                                                                                                            |
| ----------- | ----------------------------------------------------------------------------------------------------------------- |
| Not started | #210 (benchmarks), #57 (ADRs), #56 (user flows), #25 (MkDocs), #24 (glossary), #54 (stubs), #26 (migration trail) |
| Partial     | #205 (server doc consolidation), #55 (dev docs), #22 (design system docs)                                         |

No ADR directory exists. No MkDocs config. No glossary. The design system has a `DESIGN_LANGUAGE.md` but it's from Feb 2026.

---

## Finding 11: Infrastructure Milestone — Maestro E2E In Progress

Milestone 03 has an active Maestro E2E epic (#889) with sub-issues #895–#899. Current state:

- **Flow files exist**: `apps/native-rd/e2e/flows/` has YAML test flows
- **CI not wired**: No Maestro job in `ci-native-rd.yml`
- **Self-hosted runner not set up**: #895 not started
- **Current branch** (`codex/native-rd-goal-lifecycle-e2e`) has active work on goal lifecycle flow

This is the most actively in-progress work in the infrastructure milestone.

---

## Cross-Milestone Dependency Issues

1. **#534 (deprecate BadgeIssuerForm) blocks on #522–#529** (replacement components) — neither started
2. **#903 (server-backed authoring) blocks on #904** (public read endpoints) — #904 partial (all endpoints require auth)
3. **#885 (native-safe core) blocks on #682** (Phase 1 epic) — partial, jose still direct-imported
4. **#596 (Tailwind preset) is done** but parent epic #593 is still open waiting on #597, #598 (docs)

---

## Recommendations Summary

| Priority       | Action                               | Issues Affected                                                         |
| -------------- | ------------------------------------ | ----------------------------------------------------------------------- |
| **Quick wins** | Close 13 issues with completed code  | #596, #251, #535, #166, #94, #88, #58, #59, #60, #884, #186, #730, #905 |
| **Quick wins** | Close 2 superseded issues            | #167, #166 (superseded by #835, #836)                                   |
| **Quick wins** | Close or move stale issue            | #646 (wave-orchestrator not in repo)                                    |
| **Verify**     | Check 5 ghost issues in Milestone 14 | #100–#104                                                               |
| **Resolve**    | Deduplicate BadgeDesigner            | #526 vs #842                                                            |
| **Decide**     | Close or rewrite component issues    | #62–#74 (architectural drift)                                           |
| **Add deps**   | Link #903 to #522–#529               | Dependency chain not explicit                                           |
| **Track risk** | Monitor partial work for drift       | #885, #906, #445, #89                                                   |

---

## Appendix A: openbadges-system Architecture Audit

### Overall Grade: B — Solid foundation, not a rewrite candidate

#### What's Good

- **Clean client/server separation** — Vue 3 frontend on :7777, Hono backend on :8888, properly decoupled
- **Comprehensive page coverage** — 22 routes covering badges, issuers, backpack, admin, verification, auth
- **Security-conscious** — WebAuthn passkeys, RS256 JWT, JWKS endpoint, DID support
- **OB2/OB3 compliance** — Zod validation, credential signing, proper spec handling
- **Modern stack** — Composition API, TypeScript strict, file-based routing, auto-imports

#### What Needs Work (Refactor, Not Rewrite)

**High priority:**

1. **Database schema mismatch** — `database/schema.ts` has unused blog tables. Actual DB uses raw `bun:sqlite` while Kysely sits in package.json unused. Pick one and clean up.
2. **Monolithic useAuth** (40KB+) — God composable mixing auth state, WebAuthn, OAuth, token refresh. Should be 4-5 smaller composables.
3. **Pinia installed but never used** — State lives entirely in module-level refs inside composables. Either adopt Pinia or remove it.

**Medium priority:** 4. 100+ line proxy handler in badges.ts — should be extracted to middleware 5. Duplicated `safeJsonResponse()` utility copy-pasted across files 6. Minimal test coverage — Server tests decent, client almost untested (1 composable test, 2 page tests, no E2E)

**Low priority:** 7. TODOs in backpack code (export/share/download stubs) 8. Type duplication between client and server 9. Hardcoded config values

#### Page Inventory (22 routes)

| Route                  | Auth   | Purpose                                |
| ---------------------- | ------ | -------------------------------------- |
| `/`                    | Any    | Landing/Dashboard                      |
| `/auth/login`          | No     | GitHub OAuth login                     |
| `/auth/register`       | No     | Self-registration                      |
| `/auth/profile`        | Yes    | User profile management                |
| `/badges`              | Any    | Badge directory                        |
| `/badges/create`       | Admin  | Create badge                           |
| `/badges/[id]`         | Any    | Badge details                          |
| `/badges/[id]/edit`    | Admin  | Edit badge                             |
| `/badges/[id]/issue`   | Auth   | Issue badge                            |
| `/badges/issued`       | Auth   | View issued badges                     |
| `/issuers`             | Any    | Issuer directory                       |
| `/issuers/create`      | Admin  | Create issuer                          |
| `/issuers/[id]`        | Any    | Issuer details                         |
| `/issuers/[id]/edit`   | Admin  | Edit issuer                            |
| `/issuers/[id]/badges` | Any    | Issuer's badges                        |
| `/backpack`            | Auth   | User's badge backpack                  |
| `/backpack/[id]`       | Auth   | Badge detail in backpack               |
| `/admin/*`             | Admin  | Admin dashboard, badges, users, system |
| `/verify/[id]`         | Public | Verify credential                      |

#### Composables

| Composable          | Purpose                               | Quality                      | Size |
| ------------------- | ------------------------------------- | ---------------------------- | ---- |
| `useAuth`           | Auth state, tokens, WebAuthn, OAuth   | Monolithic — needs splitting | 40KB |
| `useBadges`         | Badge CRUD, search, OB2/OB3 detection | Excellent type-safety        | 25KB |
| `useFormValidation` | Form validation helpers               | Simple, focused              | 5KB  |
| `useImageUpload`    | Image upload with preview             | Basic, functional            | 5KB  |
| `useNavigation`     | Router integration                    | Minimal, focused             | 4KB  |
| `useOAuth`          | OAuth flow handling                   | Functional                   | 6KB  |
| `useTheme`          | Theme toggle                          | Simple                       | 3KB  |
| `useUsers`          | User listing, management              | Functional                   | 12KB |

#### Verdict

Not a rewrite. Issues are refactoring-level (database cleanup, composable splitting, test coverage). The architecture patterns are professional. Main risk areas: backpack extraction will require componentizing a 500+ line page, and badge designer is greenfield regardless.
