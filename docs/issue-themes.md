# Issue Themes Analysis

Analysis of 70 issues in the "Next" column to identify priorities and clusters.

**Analysis Date:** 2026-01-15

---

## Theme Summary

| Theme                       | Count | Priority     | Dependencies                      |
| --------------------------- | ----- | ------------ | --------------------------------- |
| OB3 Compliance              | 21    | **Critical** | Foundation for all badge features |
| Badge Baking & Verification | 14    | High         | Depends on OB3 types              |
| rd-logger Integration       | 6     | Medium       | Independent                       |
| Documentation               | 11    | Medium       | Can parallel other work           |
| UI Components               | 10    | Medium       | Depends on OB3 types              |
| API Key Management          | 4     | Medium       | Depends on OB3 migration          |
| Infrastructure/Tech Debt    | 5     | Low          | Independent                       |
| Server Features             | 6     | Low          | Depends on OB3 + auth             |

---

## Theme 1: OB3 Compliance (21 issues)

**Why it matters:** The entire system is built on OB2, but OB3 is the current standard. This is the foundation everything else builds on.

### Server-side OB3 (#147-152, #167)

- #147: Use `validFrom` instead of `issuanceDate`
- #148: Align context URLs with VC Data Model 2.0
- #149: Standardize Achievement `type` as array
- #151: Use standard W3C Data Integrity cryptosuite names
- #152: Add OB3 spec compliance test coverage
- #167: Add API key management REST endpoints

### UI OB3 (#153-158)

- #153: Missing OB3 test coverage for validFrom/validUntil
- #154: BadgeClassCard doesn't handle OB3 Achievement arrays
- #155: Missing test coverage for OB3 VerifiableCredential rendering
- #156: Type guard typeIncludes() not exported
- #157: Add ARIA labels for OB3 credentialSubject
- #158: Missing validation for OB3 @context array format

### System OB3 (#159-163)

- #159: BadgeIssuerForm missing OB3 Achievement fields
- #160: Badge issuance uses OB2 'expires' instead of OB3 'validFrom/validUntil'
- #162: OB2 validation middleware missing OB3 support
- #163: Add test coverage for OB3 badge creation/issuance/verification

### Key Insight

OB3 work touches all three main packages (server, UI, system). Should be done in order:

1. Types (already done in openbadges-types)
2. Server (#147-152)
3. UI (#153-158)
4. System (#159-163)

---

## Theme 2: Badge Baking & Verification (14 issues)

**Why it matters:** Core badge functionality - embedding credentials in images and verifying them.

### Baking Pipeline (#115-120, #127)

- #115: Add PNG chunk utilities (foundation)
- #116: Implement PNG baking service (depends on #115)
- #117: Add SVG parsing utilities (foundation)
- #118: Implement SVG baking service (depends on #117)
- #119: Create unified baking service (depends on #116, #118)
- #120: Add bake credential endpoint (depends on #119)
- #127: Add baking E2E tests (depends on all above)

### Verification Pipeline (#122-126)

- #122: Implement proof verification (foundation)
- #123: Implement issuer verification (foundation)
- #124: Create unified verification service (depends on #122, #123)
- #125: Add verify credential endpoint (depends on #124)
- #126: Add verify baked image endpoint (depends on #124)

### Key Insight

Clear dependency chain already labeled. Both pipelines can be worked in parallel. These depend on OB3 types being stable.

---

## Theme 3: rd-logger Integration (6 issues)

**Why it matters:** Consistent logging across all packages. rd-logger is already published but not used everywhere.

### Issues (#218-223)

- #218: Integrate rd-logger in openbadges-system
- #219: Modernize rd-logger usage in server (full feature set)
- #220: Replace logger wrapper facade with direct rd-logger
- #221: Integrate honoLogger middleware for request/response
- #222: Replace QueryLoggerService with rd-logger QueryLogger
- #223: Implement SensitiveValue protection for credentials

### Key Insight

This is independent work that can happen in parallel with OB3. Clean technical debt that improves debugging.

---

## Theme 4: Documentation (11 issues)

**Why it matters:** Good docs reduce friction for contributors and users.

### Developer Docs

- #55: Add developer documentation
- #57: Create missing ADRs for technical decisions
- #203: Add TSDoc comments throughout codebase

### User/Reference Docs

- #54: Expand stub documentation files
- #56: Add user flow diagrams
- #128: Update API documentation
- #204: Create troubleshooting guides
- #207: Create unified API documentation site with TypeDoc
- #209: Create glossary for Open Badges terminology

### Infrastructure

- #24: Cross-link documentation and create glossary
- #25: Setup MkDocs and Obsidian configuration
- #26: Create MIGRATION.md audit trail

### Key Insight

Documentation can be done incrementally alongside feature work. TSDoc (#203) and glossary (#209) are good entry points.

---

## Theme 5: UI Components (10 issues)

**Why it matters:** Complete the component library for badge display, verification, and management.

### Badge Views (#62-65)

- #62: BadgeMetadataPanel.vue for reusable metadata display
- #63: BadgeDetailView.vue for detailed badge views
- #64: VerificationResultCard.vue for rich verification display
- #65: BadgeVerifyView.vue for standalone verification

### Backpack Components (#66-67)

- #66: BackpackToolbar.vue for badge collection actions
- #67: BackpackStats.vue for badge collection statistics

### Type Errors (#22, #49)

- #22: Document openbadges-ui design system
- #49: Self-host fonts instead of using CDNs

### Key Insight

UI work should wait until OB3 UI fixes (#153-158) are done. New components should be OB3-native.

---

## Theme 6: API Key Management (4 issues)

**Why it matters:** Security feature for production deployments.

### Issues (#164-167)

- #164: Implement SQLite API Key repository
- #165: Implement PostgreSQL API Key repository
- #166: Integrate ApiKeyRepository with ApiKeyAdapter
- #167: Add API key management REST endpoints

### Key Insight

Follows the existing multi-database pattern. Can be done after OB3 migration settles.

---

## Theme 7: Infrastructure/Tech Debt (5 issues)

**Why it matters:** Code quality and maintainability.

### Issues (#190-194, #242)

- #190: Enable strict TypeScript in openbadges-modular-server
- #191: Add modern exports field to openbadges-ui package.json
- #192: Standardize TypeScript/ESLint versions across packages
- #193: Add TypeScript project references to root tsconfig.json
- #194: Replace echo scripts in shared-config
- #242: Fix flaky integration tests (global JWT mocking)

### Key Insight

Small, independent tasks. Good for cleanup between major features. #242 (flaky tests) should be high priority if it blocks CI.

---

## Theme 8: Server Features (6 issues)

**Why it matters:** Production-ready server capabilities.

### Issues (#91-96, #113)

- #91: OpenBadges Conformance Suite Integration
- #92: Production Security Hardening and Performance
- #93: Credential Refresh Service
- #94: Service Discovery Document Enhancement
- #95: JSON Schema Validation Engine
- #96: OAuth 2.0 Authorization Server
- #113: Update issuer profile to use DID

### Key Insight

These are larger features that depend on OB3 migration and auth being stable. Lower priority for now.

---

## Dependency Graph

```
openbadges-types (DONE - OB3 types exist)
         │
         ├──► OB3 Server (#147-152)
         │           │
         │           ├──► Baking (#115-120)
         │           ├──► Verification (#122-126)
         │           └──► API Keys (#164-167)
         │
         ├──► OB3 UI (#153-158)
         │           │
         │           └──► New UI Components (#62-67)
         │
         └──► OB3 System (#159-163)

Independent tracks:
- rd-logger Integration (#218-223)
- Documentation (#54-57, #203-209)
- Infrastructure (#190-194)
```

---

## Recommended Priority Order

### Phase 1: Foundation (OB3 Core)

1. Server OB3 compliance (#147-152)
2. UI OB3 compliance (#153-158)
3. System OB3 compliance (#159-163)

### Phase 2: Core Features

1. Baking pipeline (#115-120)
2. Verification pipeline (#122-126)
3. API key management (#164-167)

### Phase 3: Polish

1. rd-logger integration (#218-223)
2. New UI components (#62-67)
3. Documentation improvements (#54-57, #203-209)

### Ongoing (any time)

- Infrastructure/tech debt (#190-194)
- Flaky test fixes (#242)

---

## Past Decision Patterns

Looking at labels and issue structure, past decisions show:

1. **Multi-database first**: Server was built with SQLite + PostgreSQL from start
2. **OB2 → OB3**: Started with OB2, now migrating to OB3
3. **Component library approach**: openbadges-ui as standalone package
4. **Logging standardization**: rd-logger created to unify logging
5. **Accessibility priority**: ARIA labels mentioned in OB3 issues

These patterns should continue in future work.
