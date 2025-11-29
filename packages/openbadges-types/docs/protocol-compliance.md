# Open Badges Protocol Compliance

This document outlines how the OpenBadges Types package complies with the [Open Badges v2.0 Specification](https://www.imsglobal.org/sites/default/files/Badges/OBv2p0Final/index.html) and [Open Badges v3.0 Specification](https://www.imsglobal.org/spec/ob/v3p0/#profile).

## Type Definitions

Our type definitions strictly follow the data models defined in the Open Badges specification:

### Core Classes

- **Assertion**: Represents an awarded badge, following the [Assertion](https://www.imsglobal.org/sites/default/files/Badges/OBv2p0Final/index.html#Assertion) class in the specification
- **BadgeClass**: Represents a badge template, following the [BadgeClass](https://www.imsglobal.org/sites/default/files/Badges/OBv2p0Final/index.html#BadgeClass) class
- **Profile**: Represents an issuer or recipient, following the [Profile](https://www.imsglobal.org/sites/default/files/Badges/OBv2p0Final/index.html#Profile) class
- **OB3ImageObject**: Strictly models the Open Badges 3.0 image object, requiring `{ id: IRI, type: "Image" }` for full protocol compliance. Used in v3 `Issuer`, `Profile`, and `Achievement` types as `image?: IRI | OB3ImageObject`.

### Supporting Classes

- **IdentityObject**: Follows the [IdentityObject](https://www.imsglobal.org/sites/default/files/Badges/OBv2p0Final/index.html#IdentityObject) class
- **VerificationObject**: Follows the [VerificationObject](https://www.imsglobal.org/sites/default/files/Badges/OBv2p0Final/index.html#VerificationObject) class
- **Evidence**: Follows the [Evidence](https://www.imsglobal.org/sites/default/files/Badges/OBv2p0Final/index.html#Evidence) class
- **AlignmentObject**: Follows the [AlignmentObject](https://www.imsglobal.org/sites/default/files/Badges/OBv2p0Final/index.html#Alignment) class

## Data Types

We've implemented the primitive data types as specified in the [Open Badges specification](https://www.imsglobal.org/sites/default/files/Badges/OBv2p0Final/index.html#datatypes):

- **IRI**: Implemented as a branded string type for type safety
- **OB3ImageObject**: Used for image fields in OB3, requiring both `id` (IRI) and `type: "Image"`, with optional `caption` and `author`
- **DateTime**: Implemented as a branded string type that follows ISO 8601 format
- **IdentityHash**: Implemented as specified for hashed identities
- **MarkdownText**: Implemented as a string type that can contain Markdown formatting

## JSON-LD Compliance

Our implementation supports the JSON-LD requirements of the Open Badges specification:

- **Context**: We support the proper `@context` values for both OB2 and OB3
- **Types**: We enforce the correct `type` values for all badge objects
- **Validation**: Our type guards validate that objects have the required properties according to the specification

## Verification

Our implementation supports both verification methods specified in the Open Badges specification:

- **HostedBadge**: For badge assertions that are hosted at a stable URL
- **SignedBadge**: For badge assertions that are cryptographically signed

## Validation

Our implementation validates OB2 and OB3 objects at runtime:

- **OB2 (Open Badges 2.0):**
  - Uses custom, spec-aligned validation logic (see `src/validation.ts`).
  - Covers all required fields, types, and edge cases for Assertion, BadgeClass, Profile, and supporting types.
  - Comprehensive positive and negative test cases in `test/validation.test.ts` and `test/ob2-guards.test.ts`.
- **OB3 (Open Badges 3.0):**
  - Uses AJV for JSON Schema-based validation (see `src/validateWithSchema.ts`).
  - Validates VerifiableCredential and all nested types against the official OB3 JSON-LD context.
  - Comprehensive positive and negative test cases in `test/ob3-schema-validation.test.ts` and `test/ob3-guards.test.ts`.

See the test suite for evidence of conformance and edge case coverage.

## Type Guards

We've implemented comprehensive type guards and runtime validation that validate objects according to the Open Badges specification:

- **isJsonLdObject**: Validates that an object is a valid JSON-LD object with both `@context` and `type` properties
- **isAssertion**: Validates that an object is a valid Assertion according to the specification
- **isBadgeClass**: Validates that an object is a valid BadgeClass according to the specification
- **isProfile**: Validates that an object is a valid Profile according to the specification
- **validateBadge**: Validates OB2 and OB3 objects at runtime, returning detailed errors and version detection

See the test files for usage examples and edge case coverage.

## Example: OB3-compliant image field

```typescript
import { IRI, OB3ImageObject } from "openbadges-types/shared";

const issuerWithImage: OB3.Issuer = {
  id: createIRI("https://example.org/issuer"),
  type: ["Profile"],
  name: "Example Maker Society",
  url: createIRI("https://example.org"),
  image: {
    id: createIRI("https://example.org/logo.png"),
    type: "Image",
    caption: "Logo",
  },
};
```

## Examples

See the [examples](./examples.md) document for concrete examples of how to use the library in a way that complies with the Open Badges specification.
