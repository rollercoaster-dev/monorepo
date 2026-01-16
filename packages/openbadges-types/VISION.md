# openbadges-types Vision

**Status:** Draft
**Last Updated:** 2025-01-16

---

## Purpose

TypeScript type definitions for Open Badges 2.0 and 3.0 specifications. The foundation that makes the rest of the stack type-safe.

---

## Philosophy

### Spec Compliance So You Don't Have To

The Open Badges specifications are complex. JSON-LD contexts, W3C Verifiable Credentials, multiple versions with different structures. This package absorbs that complexity.

**You get:**

- Type-safe interfaces for every OB2 and OB3 object
- Runtime validation that matches the spec
- Version-agnostic utilities when you don't care which version

**You don't have to:**

- Read the full OB2/OB3 specifications
- Understand JSON-LD contexts
- Write your own validation logic
- Handle version differences manually

### Boring But Necessary

This package isn't exciting. It's plumbing. Good plumbing means you don't think about it - it just works.

- Types are accurate to the spec
- Validation catches real errors
- Errors are helpful and actionable
- Updates track spec changes

---

## What We Provide

### Version-Specific Types

```typescript
import { OB2, OB3, Shared } from "openbadges-types";

// OB2 - IMS Global standard (established)
const assertion: OB2.Assertion = { ... };
const badgeClass: OB2.BadgeClass = { ... };
const profile: OB2.Profile = { ... };

// OB3 - W3C Verifiable Credentials (modern)
const credential: OB3.VerifiableCredential = { ... };
const achievement: OB3.Achievement = { ... };

// Shared types
const dateTime: Shared.DateTime = "2025-01-16T12:00:00Z";
const iri: Shared.IRI = "https://example.org/badges/1";
```

### Runtime Validation

```typescript
import { validateBadge } from "openbadges-types";

const result = validateBadge(unknownObject);
if (result.isValid) {
  console.log("Version:", result.version); // "OB2" or "OB3"
} else {
  console.error("Errors:", result.errors);
}
```

### Version-Agnostic Access

```typescript
import { CompositeGuards, BadgeNormalizer } from "openbadges-types";

// Works with OB2 or OB3
const name = CompositeGuards.getBadgeName(badge);
const issuer = CompositeGuards.getBadgeIssuerName(badge);

// Normalize to common format
const normalized = BadgeNormalizer.normalizeBadge(badge);
// Access: normalized.name, normalized.issuerName, normalized.issuanceDate
```

### JSON-LD Contexts

```typescript
import { OB2_CONTEXT, OB3_CONTEXT } from "openbadges-types";

// Official JSON-LD context objects for tooling
```

---

## For Partners

```bash
bun add openbadges-types
```

Zero runtime dependencies. Just types and validation.

Works in:

- Node.js / Bun servers
- Vue / React frontends
- Any TypeScript project

---

## Current Focus

1. **Spec accuracy** - Types match OB2/OB3 specifications exactly
2. **Validation coverage** - All required fields and edge cases
3. **Helpful errors** - Validation failures explain what's wrong
4. **Test coverage** - Every type guard tested positive and negative

---

## Future Direction

- Track OB3 spec updates as they're finalized
- Add migration utilities (OB2 → OB3 conversion)
- Schema generation for other languages (if demand exists)

---

## Related

- [Open Badges 2.0 Spec](https://www.imsglobal.org/sites/default/files/Badges/OBv2p0Final/index.html)
- [Open Badges 3.0 Spec](https://www.imsglobal.org/spec/ob/v3p0/)
- [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model-2.0/)
- [Ecosystem Vision](../../apps/docs/vision/openbadges-ecosystem.md)
