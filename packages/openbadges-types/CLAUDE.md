# openbadges-types Context

Package-specific context for Claude Code when working in `packages/openbadges-types/`.

## Purpose

TypeScript type definitions for Open Badges 2.0 and 3.0 specifications with runtime validation.

## Key Patterns

### Version Imports

```typescript
import { OB2, OB3, Shared } from "openbadges-types";

// OB2 - Established IMS Global standard
const assertion: OB2.Assertion = { ... };

// OB3 - W3C Verifiable Credentials model
const credential: OB3.VerifiableCredential = { ... };
```

### Type Guards

```typescript
import { validateBadge, CompositeGuards } from "openbadges-types";

// Validate any badge (OB2 or OB3)
const result = validateBadge(badge);
if (result.isValid) {
  /* ... */
}

// Version-agnostic access
const name = CompositeGuards.getBadgeName(badge);
```

### Badge Normalization

```typescript
import { BadgeNormalizer } from "openbadges-types";
const normalized = BadgeNormalizer.normalizeBadge(badge);
// Access common properties: name, issuerName, issuanceDate
```

## Validation

- OB2: Custom spec-aligned validation in `src/validation.ts`
- OB3: AJV JSON Schema validation in `src/validateWithSchema.ts`

## Testing

Run `bun test` from this directory. Tests cover type guards, validation, and spec compliance.

## Conventions

- Use branded types (`IRI`, `DateTime`) for type safety
- Use `typeIncludes()` for checking type arrays (OB3 uses arrays)
- Handle both embedded and referenced objects (OB2 allows IRIs or objects)
