# Open Badges Types Examples

This document provides examples of how to use the OpenBadges Types package in a way that complies with the Open Badges specification.

## Creating a Valid OB2 Assertion

```typescript
import { OB2, Shared } from "openbadges-types";

// Create a valid OB2 Assertion
const assertion: OB2.Assertion = {
  "@context": "https://w3id.org/openbadges/v2",
  id: Shared.createIRI("https://example.org/assertions/123"),
  type: "Assertion",
  recipient: {
    type: "email",
    identity: "alice@example.org",
  },
  issuedOn: Shared.createDateTime("2023-06-15T12:00:00Z"),
  verification: {
    type: "hosted",
  },
  badge: {
    id: Shared.createIRI("https://example.org/badges/5"),
    type: "BadgeClass",
    name: "3-D Printmaster",
    description:
      "This badge is awarded for passing the 3-D printing knowledge and safety test.",
    image: Shared.createIRI("https://example.org/badges/5/image"),
    criteria: {
      narrative:
        "Students are tested on knowledge and safety, both through a paper test and a supervised performance evaluation on key skills.",
    },
    issuer: {
      id: Shared.createIRI("https://example.org/issuer"),
      type: "Profile",
      name: "Example Maker Society",
      url: Shared.createIRI("https://example.org"),
      email: "contact@example.org",
      verification: {
        type: "hosted",
        allowedOrigins: "example.org",
      },
    },
  },
};

// Validate the assertion using type guards
if (OB2.isAssertion(assertion)) {
  console.log("Assertion is valid according to the OB2 specification");
}
```

## Creating a Valid OB3 VerifiableCredential

```typescript
import { OB3, Shared } from "openbadges-types";

// Create a valid OB3 VerifiableCredential
const credential: OB3.VerifiableCredential = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://purl.imsglobal.org/spec/ob/v3p0/context.json",
  ],
  id: Shared.createIRI("https://example.org/credentials/3732"),
  type: ["VerifiableCredential", "OpenBadgeCredential"],
  issuer: {
    id: Shared.createIRI("https://example.org/issuers/123"),
    type: "Profile",
    name: "Example Issuer",
    url: Shared.createIRI("https://example.org"),
    email: "contact@example.org",
  },
  issuanceDate: Shared.createDateTime("2023-06-15T12:00:00Z"),
  credentialSubject: {
    id: Shared.createIRI("did:example:ebfeb1f712ebc6f1c276e12ec21"),
    type: "AchievementSubject",
    achievement: {
      id: Shared.createIRI("https://example.org/achievements/5"),
      type: "Achievement",
      name: "Example Achievement",
      description: "This is an example achievement",
      criteria: {
        narrative: "The requirements for this achievement are...",
      },
      image: {
        id: Shared.createIRI("https://example.org/achievements/5/image"),
        type: "Image",
      },
    },
  },
  proof: {
    type: "Ed25519Signature2020",
    created: Shared.createDateTime("2023-06-15T12:05:00Z"),
    verificationMethod: Shared.createIRI(
      "https://example.org/issuers/123#keys-1",
    ),
    proofPurpose: "assertionMethod",
    proofValue: "z58DAdFfa9SkqZMVPxAQpic6FPCsJWa6SpsfDqwmUbHEVnWxeh",
  },
};

// Validate the credential using type guards
if (OB3.isVerifiableCredential(credential)) {
  console.log(
    "VerifiableCredential is valid according to the OB3 specification",
  );
}
```

## Using Type Guards for Validation

```typescript
import { OB2, OB3, Shared } from "openbadges-types";

// Function to validate an Open Badge (either OB2 or OB3)
function validateBadge(badge: unknown): boolean {
  // Check if it's an OB2 Assertion
  if (OB2.isAssertion(badge)) {
    console.log("Valid OB2 Assertion");
    return true;
  }

  // Check if it's an OB3 VerifiableCredential
  if (OB3.isVerifiableCredential(badge)) {
    console.log("Valid OB3 VerifiableCredential");
    return true;
  }

  console.log("Invalid badge");
  return false;
}

// Function to validate an IRI
function validateIRI(iri: unknown): boolean {
  if (Shared.isIRI(iri)) {
    console.log("Valid IRI");
    return true;
  }

  console.log("Invalid IRI");
  return false;
}

// Function to validate a DateTime
function validateDateTime(dateTime: unknown): boolean {
  if (Shared.isDateTime(dateTime)) {
    console.log("Valid DateTime");
    return true;
  }

  console.log("Invalid DateTime");
  return false;
}
```

## Using Branded Types for Type Safety

```typescript
import { Shared } from "openbadges-types";

// Function that requires an IRI
function processIRI(iri: Shared.IRI): void {
  console.log(`Processing IRI: ${iri}`);
}

// Function that requires a DateTime
function processDateTime(dateTime: Shared.DateTime): void {
  console.log(`Processing DateTime: ${dateTime}`);
}

// This will compile because we're using the createIRI function
const validIRI = Shared.createIRI("https://example.org/badges/5");
processIRI(validIRI);

// This will NOT compile because we're not using the createIRI function
// processIRI('https://example.org/badges/5'); // Type error!

// This will compile because we're using the createDateTime function
const validDateTime = Shared.createDateTime("2023-06-15T12:00:00Z");
processDateTime(validDateTime);

// This will NOT compile because we're not using the createDateTime function
// processDateTime('2023-06-15T12:00:00Z'); // Type error!
```
