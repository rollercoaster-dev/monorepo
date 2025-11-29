# Open Badges Types Package Structure

## Directory Structure

```
openbadges-types/
├── src/
│   ├── v2/                 # Open Badges 2.0 types
│   │   ├── assertion.ts    # Assertion related types
│   │   ├── badgeClass.ts   # BadgeClass related types
│   │   ├── profile.ts      # Profile/Issuer related types
│   │   ├── verification.ts # Verification related types
│   │   ├── identity.ts     # IdentityObject related types
│   │   ├── evidence.ts     # Evidence related types
│   │   ├── alignment.ts    # AlignmentObject related types
│   │   ├── image.ts        # Image related types
│   │   ├── criteria.ts     # Criteria related types
│   │   ├── revocation.ts   # Revocation related types
│   │   ├── extensions.ts   # Extensions related types
│   │   └── index.ts        # Exports all v2 types
│   │
│   ├── v3/                 # Open Badges 3.0 types
│   │   ├── credential.ts   # Verifiable Credential types
│   │   ├── achievement.ts  # Achievement related types
│   │   ├── issuer.ts       # Issuer related types
│   │   ├── proof.ts        # Proof related types
│   │   ├── recipient.ts    # Recipient related types
│   │   ├── evidence.ts     # Evidence related types
│   │   ├── results.ts      # Results related types
│   │   ├── alignment.ts    # Alignment related types
│   │   ├── extensions.ts   # Extensions related types
│   │   └── index.ts        # Exports all v3 types
│   │
│   ├── shared/             # Shared types between versions
│   │   ├── common.ts       # Common utility types
│   │   ├── jsonld.ts       # JSON-LD related types
│   │   ├── datetime.ts     # DateTime handling
│   │   └── index.ts        # Exports all shared types
│   │
│   └── index.ts            # Main entry point, exports all types
│
├── package.json            # Package configuration
├── tsconfig.json           # TypeScript configuration
├── README.md               # Package documentation
└── LICENSE                 # License file
```

## Type Hierarchy

### Open Badges 2.0

- Base types:
  - `JsonLdContext` (shared)
  - `IRI` (shared)
  - `DateTime` (shared)
- Core types:
  - `Assertion`
  - `BadgeClass`
  - `Profile` / `Issuer`
  - `VerificationObject`
  - `IdentityObject`
- Supporting types:
  - `Evidence`
  - `AlignmentObject`
  - `Image`
  - `Criteria`
  - `RevocationList`
  - `CryptographicKey`
  - `Extension`

### Open Badges 3.0

- Base types:
  - `JsonLdContext` (shared)
  - `IRI` (shared)
  - `DateTime` (shared)
- Core types:
  - `VerifiableCredential`
  - `Achievement`
  - `Issuer`
  - `Proof`
- Supporting types:
  - `Recipient`
  - `Evidence`
  - `Results`
  - `ResultDescriptions`
  - `Alignment`
  - `Extension`

### Shared Types

- `IRI` - URI/URL type
- `JsonLdContext` - JSON-LD context type
- `DateTime` - ISO 8601 date format
- `LanguageMap` - Internationalization support
- `ImageObject` - Common image properties
- Utility types for type guards and validation

## Module Organization

- Each file should export related types
- Index files should re-export all types from their directory
- Main index.ts should provide a clean API for importing types
- Version-specific namespaces to avoid naming conflicts
