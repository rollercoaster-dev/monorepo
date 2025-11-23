# Badge Baking Implementation - Sprint Plan

Trunk-based development plan with small, atomic PRs (~500 lines max).

## Principles

- **One PR = One Issue = One Thing Changed**
- **Max ~500 lines per PR** (excluding tests)
- **Atomic commits** - Each commit is deployable
- **Feature flags** for incomplete features
- **Tests included** in each PR

---

## Phase 6A: Key Management Foundation

These PRs establish the cryptographic foundation needed for signing and verification.

### PR 1: Add key management types and interfaces
**Lines: ~100**

```
Changes:
- src/services/key-management/types.ts
  - KeyPair interface
  - JWK interface
  - JWKS interface
  - KeyRotationConfig interface
```

**Atomic commits:**
1. `feat(keys): add key management type definitions`

---

### PR 2: Implement key generation service
**Lines: ~150**

```
Changes:
- src/services/key-management/key-generator.ts
  - generateRSAKeyPair()
  - generateEdDSAKeyPair()
  - keyPairToJWK()
- tests/services/key-management/key-generator.test.ts
```

**Atomic commits:**
1. `feat(keys): add RSA key pair generation`
2. `feat(keys): add EdDSA key pair generation`
3. `test(keys): add key generator tests`

---

### PR 3: Implement key storage service
**Lines: ~200**

```
Changes:
- src/services/key-management/key-storage.ts
  - loadKeyPair()
  - saveKeyPair()
  - getActiveKey()
  - Environment variable loading (KEY_PRIVATE, KEY_PUBLIC)
- tests/services/key-management/key-storage.test.ts
```

**Atomic commits:**
1. `feat(keys): add key loading from environment`
2. `feat(keys): add key file storage`
3. `test(keys): add key storage tests`

---

### PR 4: Add JWKS endpoint
**Lines: ~150**

```
Changes:
- src/api/controllers/well-known.controller.ts
  - GET /.well-known/jwks.json
- src/api/routes/well-known.routes.ts
- tests/api/well-known.test.ts
```

**Atomic commits:**
1. `feat(api): add well-known controller`
2. `feat(api): implement JWKS endpoint`
3. `test(api): add JWKS endpoint tests`

---

### PR 5: Add DID:web document endpoint
**Lines: ~150**

```
Changes:
- src/api/controllers/well-known.controller.ts
  - GET /.well-known/did.json
- tests/api/well-known-did.test.ts
```

**Atomic commits:**
1. `feat(api): implement DID:web document endpoint`
2. `test(api): add DID document tests`

---

### PR 6: Update issuer profile to use DID
**Lines: ~100**

```
Changes:
- src/domains/issuer/issuer.entity.ts
  - Add did field generation
- src/api/controllers/issuer.controller.ts
  - Return DID in profile
```

**Atomic commits:**
1. `feat(issuer): add DID field to issuer entity`
2. `feat(issuer): include DID in API responses`

---

## Phase 4A: PNG Baking Service

### PR 7: Add baking service types and interfaces
**Lines: ~80**

```
Changes:
- src/services/baking/types.ts
  - BakingService interface
  - BakedImage type
  - UnbakeResult type
```

**Atomic commits:**
1. `feat(baking): add baking service type definitions`

---

### PR 8: Add PNG chunk utilities
**Lines: ~150**

```
Changes:
- src/services/baking/png/chunk-utils.ts
  - extractChunks()
  - encodeChunks()
  - createiTXtChunk()
  - findiTXtChunk()
- package.json (add png-chunks-extract, png-chunks-encode)
- tests/services/baking/png/chunk-utils.test.ts
```

**Atomic commits:**
1. `chore(deps): add png chunk manipulation libraries`
2. `feat(baking): add PNG chunk extraction utilities`
3. `feat(baking): add iTXt chunk creation utility`
4. `test(baking): add PNG chunk utility tests`

---

### PR 9: Implement PNG baking service
**Lines: ~200**

```
Changes:
- src/services/baking/png/png-baking.service.ts
  - bakePNG()
  - unbakePNG()
- tests/services/baking/png/png-baking.service.test.ts
- tests/fixtures/test-badge.png
```

**Atomic commits:**
1. `feat(baking): implement PNG baking (embed credential)`
2. `feat(baking): implement PNG unbaking (extract credential)`
3. `test(baking): add PNG baking service tests`

---

## Phase 4B: SVG Baking Service

### PR 10: Add SVG parsing utilities
**Lines: ~100**

```
Changes:
- src/services/baking/svg/svg-utils.ts
  - parseSVG()
  - serializeSVG()
  - addNamespace()
- package.json (add @xmldom/xmldom if needed)
```

**Atomic commits:**
1. `chore(deps): add XML DOM library for SVG parsing`
2. `feat(baking): add SVG parsing utilities`

---

### PR 11: Implement SVG baking service
**Lines: ~200**

```
Changes:
- src/services/baking/svg/svg-baking.service.ts
  - bakeSVG()
  - unbakeSVG()
- tests/services/baking/svg/svg-baking.service.test.ts
- tests/fixtures/test-badge.svg
```

**Atomic commits:**
1. `feat(baking): implement SVG baking (embed credential)`
2. `feat(baking): implement SVG unbaking (extract credential)`
3. `test(baking): add SVG baking service tests`

---

### PR 12: Create unified baking service
**Lines: ~100**

```
Changes:
- src/services/baking/baking.service.ts
  - Combines PNG and SVG baking
  - Auto-detects format
  - Exports unified interface
- src/services/baking/index.ts
```

**Atomic commits:**
1. `feat(baking): create unified baking service facade`
2. `feat(baking): add format auto-detection`

---

## Phase 4C: Baking API Endpoints

### PR 13: Add bake credential endpoint
**Lines: ~200**

```
Changes:
- src/api/controllers/credentials.controller.ts
  - POST /v3/credentials/:id/bake
- src/api/dto/bake-request.dto.ts
- tests/api/credentials-bake.test.ts
```

**Atomic commits:**
1. `feat(api): add bake request DTO`
2. `feat(api): implement bake credential endpoint`
3. `test(api): add bake endpoint tests`

---

## Phase 6B: Verification Service

### PR 14: Add verification service types
**Lines: ~80**

```
Changes:
- src/services/verification/types.ts
  - VerificationResult interface
  - VerificationChecks interface
  - VerificationOptions interface
```

**Atomic commits:**
1. `feat(verify): add verification service type definitions`

---

### PR 15: Implement proof verification
**Lines: ~250**

```
Changes:
- src/services/verification/proof-verifier.ts
  - verifyJWTProof()
  - verifyLinkedDataProof()
  - resolveVerificationMethod()
- tests/services/verification/proof-verifier.test.ts
```

**Atomic commits:**
1. `feat(verify): implement JWT proof verification`
2. `feat(verify): implement verification method resolution`
3. `test(verify): add proof verification tests`

---

### PR 16: Implement issuer verification
**Lines: ~150**

```
Changes:
- src/services/verification/issuer-verifier.ts
  - verifyIssuer()
  - resolveIssuerDID()
  - fetchIssuerJWKS()
- tests/services/verification/issuer-verifier.test.ts
```

**Atomic commits:**
1. `feat(verify): implement issuer DID resolution`
2. `feat(verify): implement issuer JWKS fetching`
3. `test(verify): add issuer verification tests`

---

### PR 17: Create unified verification service
**Lines: ~150**

```
Changes:
- src/services/verification/verification.service.ts
  - verify() - main entry point
  - Combines proof + issuer + expiration checks
- src/services/verification/index.ts
```

**Atomic commits:**
1. `feat(verify): create unified verification service`
2. `feat(verify): add expiration checking`

---

### PR 18: Add verify credential endpoint
**Lines: ~150**

```
Changes:
- src/api/controllers/verification.controller.ts
  - POST /v3/verify
- src/api/dto/verify-request.dto.ts
- tests/api/verify.test.ts
```

**Atomic commits:**
1. `feat(api): add verify request DTO`
2. `feat(api): implement verify credential endpoint`
3. `test(api): add verify endpoint tests`

---

### PR 19: Add verify baked image endpoint
**Lines: ~200**

```
Changes:
- src/api/controllers/verification.controller.ts
  - POST /v3/verify/baked
- tests/api/verify-baked.test.ts
```

**Atomic commits:**
1. `feat(api): implement verify baked image endpoint`
2. `test(api): add verify baked endpoint tests`

---

## Phase 4D: E2E Tests & Documentation

### PR 20: Add baking E2E tests
**Lines: ~300**

```
Changes:
- tests/e2e/baking.e2e.test.ts
  - Full flow: create issuer → badge class → credential → bake → verify
  - PNG baking E2E
  - SVG baking E2E
  - Tamper detection test
```

**Atomic commits:**
1. `test(e2e): add PNG baking end-to-end test`
2. `test(e2e): add SVG baking end-to-end test`
3. `test(e2e): add tamper detection test`

---

### PR 21: Update API documentation
**Lines: ~200**

```
Changes:
- docs/api-documentation.md
  - JWKS endpoint docs
  - DID document docs
  - Bake endpoint docs
  - Verify endpoints docs
- Update OpenAPI spec
```

**Atomic commits:**
1. `docs(api): add well-known endpoints documentation`
2. `docs(api): add baking endpoint documentation`
3. `docs(api): add verification endpoints documentation`

---

## Summary

| Phase | PRs | Est. Lines | Description |
|-------|-----|------------|-------------|
| 6A | 1-6 | ~750 | Key management & JWKS/DID |
| 4A | 7-9 | ~430 | PNG baking service |
| 4B | 10-12 | ~400 | SVG baking service |
| 4C | 13 | ~200 | Bake API endpoint |
| 6B | 14-19 | ~980 | Verification service & API |
| 4D | 20-21 | ~500 | E2E tests & docs |

**Total: 21 PRs, ~3,260 lines**

---

## Dependency Graph

```
PR 1 (types) ─────────────────────────────────────────┐
     │                                                 │
     ▼                                                 │
PR 2 (key gen) ──► PR 3 (key storage) ──► PR 4 (JWKS) │
                                              │       │
                                              ▼       │
                                         PR 5 (DID)   │
                                              │       │
                                              ▼       │
                                         PR 6 (issuer)│
                                                      │
PR 7 (baking types) ◄─────────────────────────────────┘
     │
     ├──► PR 8 (PNG utils) ──► PR 9 (PNG baking)  ─┐
     │                                              │
     └──► PR 10 (SVG utils) ──► PR 11 (SVG baking)─┼──► PR 12 (unified)
                                                   │         │
                                                   │         ▼
                                                   │    PR 13 (bake API)
                                                   │
PR 14 (verify types) ◄─────────────────────────────┘
     │
     ├──► PR 15 (proof verify)  ─┐
     │                           │
     └──► PR 16 (issuer verify) ─┼──► PR 17 (unified) ──► PR 18 (verify API)
                                 │                              │
                                 │                              ▼
                                 │                        PR 19 (verify baked)
                                 │                              │
                                 └──────────────────────────────┼──► PR 20 (E2E)
                                                                │
                                                                ▼
                                                          PR 21 (docs)
```

---

## Parallel Work Opportunities

These PRs can be worked on simultaneously:

**Parallel Track A (Keys):** PR 1 → PR 2 → PR 3 → PR 4 → PR 5 → PR 6

**Parallel Track B (PNG):** PR 7 → PR 8 → PR 9

**Parallel Track C (SVG):** PR 7 → PR 10 → PR 11

After PR 9 and PR 11 complete: PR 12 → PR 13

**Parallel Track D (Verification):** PR 14 → PR 15/PR 16 → PR 17 → PR 18 → PR 19

---

## Feature Flag Strategy

Until all PRs are merged, use feature flags:

```typescript
// src/config/feature-flags.ts
export const features = {
  BAKING_ENABLED: process.env.FEATURE_BAKING === 'true',
  VERIFICATION_ENABLED: process.env.FEATURE_VERIFICATION === 'true',
};
```

Endpoints return 501 Not Implemented if flag is disabled:

```typescript
if (!features.BAKING_ENABLED) {
  return c.json({ error: 'Baking not yet available' }, 501);
}
```

---

## Merge Order (Recommended)

1. PR 1 (types) - No deps
2. PR 7 (baking types) - No deps
3. PR 14 (verify types) - No deps
4. PR 2 (key gen) - Needs PR 1
5. PR 8 (PNG utils) - Needs PR 7
6. PR 10 (SVG utils) - Needs PR 7
7. PR 3 (key storage) - Needs PR 2
8. PR 9 (PNG baking) - Needs PR 8
9. PR 11 (SVG baking) - Needs PR 10
10. PR 4 (JWKS) - Needs PR 3
11. PR 12 (unified baking) - Needs PR 9, PR 11
12. PR 5 (DID) - Needs PR 4
13. PR 13 (bake API) - Needs PR 12
14. PR 15 (proof verify) - Needs PR 14, PR 4
15. PR 16 (issuer verify) - Needs PR 14, PR 4
16. PR 6 (issuer DID) - Needs PR 5
17. PR 17 (unified verify) - Needs PR 15, PR 16
18. PR 18 (verify API) - Needs PR 17
19. PR 19 (verify baked) - Needs PR 18, PR 12
20. PR 20 (E2E) - Needs PR 13, PR 19
21. PR 21 (docs) - Needs all above

---

## Approval Checklist

Before creating issues, please confirm:

- [ ] PR size (~500 lines) is acceptable
- [ ] Dependency order makes sense
- [ ] Feature flag approach is acceptable
- [ ] Parallel track strategy is clear
- [ ] Any PRs should be combined or split further?

---

*Plan Version: 1.0*
*Date: November 2025*
