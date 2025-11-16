# Migration Guide: Open Badges 2.0 to 3.0

This guide helps developers migrate from Open Badges 2.0 to Open Badges 3.0 using the `openbadges-types` package.

> **Note:** In Open Badges 3.0, the `image` field for `Issuer`, `Profile`, and `Achievement` can be either a string IRI/URL or an object with `{ id, type: "Image" }`. The type `OB3ImageObject` enforces this structure for protocol compliance. Use `image?: IRI | OB3ImageObject` in your OB3 types.

## Table of Contents

- [Overview of Changes](#overview-of-changes)
- [Key Differences](#key-differences)
- [Migration Examples](#migration-examples)
- [Supporting Both Versions](#supporting-both-versions)
- [Best Practices](#best-practices)

## Overview of Changes

Open Badges 3.0 represents a significant evolution from version 2.0, adopting the W3C Verifiable Credentials Data Model. This alignment with broader digital credential standards enhances interoperability and security while maintaining the core concepts of Open Badges.

### Conceptual Shifts

1. **From Assertions to Verifiable Credentials**:
   - OB2: Uses `Assertion` as the primary credential type
   - OB3: Uses `VerifiableCredential` based on the W3C standard

2. **From BadgeClass to Achievement**:
   - OB2: Uses `BadgeClass` to define the achievement
   - OB3: Uses `Achievement` embedded within the `credentialSubject`

3. **Enhanced Verification**:
   - OB2: Uses `verification` property with limited options
   - OB3: Uses cryptographic `proof` with more robust verification methods

4. **Improved Internationalization**:
   - OB2: Limited language support
   - OB3: Comprehensive support for multiple languages via `MultiLanguageString`

## Key Differences

### JSON-LD Context

```typescript
// Open Badges 2.0
{
  "@context": "https://w3id.org/openbadges/v2"
}

// Open Badges 3.0
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://purl.imsglobal.org/spec/ob/v3p0/context.json"
  ]
}
```

### Core Structure

| Open Badges 2.0 | Open Badges 3.0 | Notes |
|-----------------|-----------------|-------|
| `Assertion` | `VerifiableCredential` | Top-level credential object |
| `BadgeClass` | `Achievement` | Description of the achievement |
| `recipient` | `credentialSubject` | Recipient information |
| `verification` | `proof` | Verification method |
| `issuedOn` | `issuanceDate` | Issue date |
| `expires` | `expirationDate` | Expiration date |

### Recipient Identification

```typescript
// Open Badges 2.0
{
  "recipient": {
    "type": "email",
    "identity": "alice@example.org",
    "hashed": false
  }
}

// Open Badges 3.0
{
  "credentialSubject": {
    "id": "did:example:ebfeb1f712ebc6f1c276e12ec21",
    "achievement": { ... }
  }
}
```

### Verification Methods

```typescript
// Open Badges 2.0
{
  "verification": {
    "type": "hosted"
  }
}

// Open Badges 3.0
{
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2023-06-15T12:05:00Z",
    "verificationMethod": "https://example.org/issuers/123#keys-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "z58DAdFfa9SkqZMVPxAQpic6FPCsJWa6SpsfDqwmUbHEVnWxeh"
  }
}
```

## Migration Examples

### Complete Example: OB2 to OB3

#### Open Badges 2.0 Assertion

```typescript
import { OB2 } from 'openbadges-types';

const badgeClass: OB2.BadgeClass = {
  '@context': 'https://w3id.org/openbadges/v2',
  id: 'https://example.org/badges/5',
  type: 'BadgeClass',
  name: '3-D Printmaster',
  description: 'This badge is awarded for passing the 3-D printing knowledge and safety test.',
  image: 'https://example.org/badges/5/image',
  criteria: {
    narrative: 'Students are tested on knowledge and safety, both through a paper test and a supervised performance evaluation on key skills.'
  },
  issuer: {
    id: 'https://example.org/issuer',
    type: 'Profile',
    name: 'Example Maker Society',
    url: 'https://example.org',
    email: 'contact@example.org'
  }
};

const assertion: OB2.Assertion = {
  '@context': 'https://w3id.org/openbadges/v2',
  id: 'https://example.org/assertions/123',
  type: 'Assertion',
  recipient: {
    type: 'email',
    identity: 'alice@example.org'
  },
  issuedOn: '2016-12-31T23:59:59+00:00',
  verification: {
    type: 'hosted'
  },
  badge: badgeClass
};
```

#### Equivalent Open Badges 3.0 Verifiable Credential

```typescript
import { OB3, IRI, OB3ImageObject } from 'openbadges-types';

const achievement: OB3.Achievement = {
  type: ['Achievement'],
  name: '3-D Printmaster',
  description: 'This badge is awarded for passing the 3-D printing knowledge and safety test.',
  criteria: {
    narrative: 'Students are tested on knowledge and safety, both through a paper test and a supervised performance evaluation on key skills.'
  },
  // image can be a string IRI or an object
  image: 'https://example.org/badges/5/image'
  // or
  // image: {
  //   id: 'https://example.org/badges/5/image',
  //   type: 'Image'
  // }
};

const credential: OB3.VerifiableCredential = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://purl.imsglobal.org/spec/ob/v3p0/context.json'
  ],
  id: 'https://example.org/assertions/123',
  type: ['VerifiableCredential'],
  issuer: {
    id: 'https://example.org/issuer',
    type: ['Profile'],
    name: 'Example Maker Society',
    url: 'https://example.org',
    email: 'contact@example.org',
    // image can be a string IRI or an object
    image: {
      id: 'https://example.org/logo.png',
      type: 'Image',
      caption: 'Logo'
    }
  },
  issuanceDate: '2016-12-31T23:59:59+00:00',
  credentialSubject: {
    id: 'did:example:ebfeb1f712ebc6f1c276e12ec21', // Modern identifier for Alice
    achievement: achievement
  },
  proof: {
    type: 'Ed25519Signature2020',
    created: '2016-12-31T23:59:59+00:00',
    verificationMethod: 'https://example.org/issuer#keys-1',
    proofPurpose: 'assertionMethod',
    proofValue: 'z58DAdFfa9SkqZMVPxAQpic6FPCsJWa6SpsfDqwmUbHEVnWxeh'
  }
};
```

### Conversion Function Example

```typescript
import { OB2, OB3, Shared } from 'openbadges-types';

/**
 * Converts an Open Badges 2.0 Assertion to an Open Badges 3.0 VerifiableCredential
 */
function convertOB2toOB3(assertion: OB2.Assertion): OB3.VerifiableCredential {
  // Extract the BadgeClass (either directly or by reference)
  const badgeClass = typeof assertion.badge === 'string' 
    ? { /* You would need to fetch the BadgeClass by its IRI */ } 
    : assertion.badge;
  
  // Create the Achievement from the BadgeClass
  const achievement: OB3.Achievement = {
    type: ['Achievement'],
    name: badgeClass.name,
    description: badgeClass.description,
    criteria: badgeClass.criteria,
    image: badgeClass.image
  };
  
  // Create the issuer from the BadgeClass issuer
  const issuer = typeof badgeClass.issuer === 'string'
    ? { id: badgeClass.issuer }
    : {
        id: badgeClass.issuer.id,
        type: Array.isArray(badgeClass.issuer.type) 
          ? badgeClass.issuer.type 
          : [badgeClass.issuer.type],
        name: badgeClass.issuer.name,
        url: badgeClass.issuer.url,
        email: badgeClass.issuer.email
      };
  
  // Convert recipient to credentialSubject
  // Note: In a real implementation, you might want to convert email identities to DIDs
  const recipientId = `did:example:${Buffer.from(assertion.recipient.identity).toString('hex')}`;
  
  // Create the VerifiableCredential
  const credential: OB3.VerifiableCredential = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://purl.imsglobal.org/spec/ob/v3p0/context.json'
    ],
    id: assertion.id,
    type: ['VerifiableCredential'],
    issuer: issuer,
    issuanceDate: assertion.issuedOn,
    expirationDate: assertion.expires,
    credentialSubject: {
      id: recipientId,
      achievement: achievement
    }
    // Note: You would need to generate a proper proof for a real implementation
  };
  
  // Copy over evidence if it exists
  if (assertion.evidence) {
    credential.evidence = assertion.evidence;
  }
  
  return credential;
}
```

## Supporting Both Versions

The `openbadges-types` package provides utilities to work with both versions simultaneously:

```typescript
import { OpenBadgesVersion, VersionedBadge, OB2, OB3 } from 'openbadges-types';

// Function that works with either version
function getBadgeName<T extends OpenBadgesVersion>(
  badge: VersionedBadge<T>,
  version: T
): string {
  if (version === OpenBadgesVersion.V2) {
    // badge is typed as OB2.Assertion
    const ob2Badge = badge as OB2.Assertion;
    const badgeClass = typeof ob2Badge.badge === 'string'
      ? { /* You would need to fetch the BadgeClass by its IRI */ }
      : ob2Badge.badge;
    return badgeClass.name;
  } else {
    // badge is typed as OB3.VerifiableCredential
    const ob3Badge = badge as OB3.VerifiableCredential;
    const achievement = ob3Badge.credentialSubject.achievement;
    
    if (Array.isArray(achievement)) {
      return typeof achievement[0].name === 'string'
        ? achievement[0].name
        : Object.values(achievement[0].name)[0]; // Get first language value
    } else {
      return typeof achievement.name === 'string'
        ? achievement.name
        : Object.values(achievement.name)[0]; // Get first language value
    }
  }
}

// Example usage
function processBadge(badgeData: unknown) {
  // Determine which version the badge is
  if (OB2.isAssertion(badgeData)) {
    return getBadgeName(badgeData, OpenBadgesVersion.V2);
  } else if (OB3.isVerifiableCredential(badgeData)) {
    return getBadgeName(badgeData, OpenBadgesVersion.V3);
  } else {
    throw new Error('Invalid badge format');
  }
}
```

## Best Practices

1. **Use Type Guards**: Always use the provided type guards to validate and narrow types at runtime.

2. **Handle Both Versions**: Design your application to handle both versions, using the `OpenBadgesVersion` enum.

3. **Prefer OB3 for New Development**: For new projects, prefer Open Badges 3.0 as it aligns with broader standards.

4. **Gradual Migration**: If you have an existing OB2 implementation, consider a gradual migration:
   - First, add support for reading OB3 credentials
   - Then, add support for issuing OB3 credentials
   - Finally, provide a migration path for existing OB2 credentials

5. **Maintain Backward Compatibility**: Continue to support OB2 for backward compatibility, especially if you have existing users.

6. **Use Branded Types**: Take advantage of the branded types (`IRI`, `DateTime`) for type safety.

7. **Internationalization**: Use the enhanced internationalization support in OB3 with `MultiLanguageString`.

8. **Verification**: Implement robust verification using the cryptographic proof mechanisms in OB3.
