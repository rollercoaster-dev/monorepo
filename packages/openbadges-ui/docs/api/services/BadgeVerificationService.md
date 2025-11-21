# BadgeVerificationService

The `BadgeVerificationService` is a service for verifying badge authenticity. It provides methods for verifying both Open Badges 2.0 (OB2) and Open Badges 3.0 (OB3) badges, checking their verification information, expiration status, and revocation status.

## Methods

### verifyBadge(badge)

Verifies a badge assertion or verifiable credential.

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| `badge` | `OB2.Assertion \| OB3.VerifiableCredential` | The badge to verify. Can be either an Open Badges 2.0 Assertion or an Open Badges 3.0 Verifiable Credential. |

#### Returns

`Promise<VerificationResult>`: A promise that resolves to the verification result.

#### Throws

- Error if the verification process encounters an unexpected error.

#### Example

```typescript
import { BadgeVerificationService } from 'openbadges-ui';
import type { OB2 } from 'openbadges-types';

const badge: OB2.Assertion = {
  '@context': 'https://w3id.org/openbadges/v2',
  id: 'https://example.org/assertions/123',
  type: 'Assertion',
  recipient: {
    identity: 'alice@example.org',
    type: 'email',
    hashed: false
  },
  badge: {
    id: 'https://example.org/badges/1',
    type: 'BadgeClass',
    name: 'AI Ethics Fundamentals',
    description: 'Awarded for demonstrating understanding of core AI ethics principles.',
    image: 'https://example.org/badges/ai-ethics.png',
    issuer: {
      id: 'https://example.org/issuer',
      type: 'Profile',
      name: 'Academy'
    }
  },
  issuedOn: '2023-01-15T12:00:00Z',
  verification: {
    type: 'hosted'
  }
};

try {
  const result = await BadgeVerificationService.verifyBadge(badge);
  console.log('Verification result:', result);
} catch (error) {
  console.error('Verification error:', error);
}
```

## Types

### VerificationResult

```typescript
interface VerificationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  verificationMethod?: 'hosted' | 'signed';
  expirationStatus?: 'valid' | 'expired' | 'not-applicable';
  revocationStatus?: 'valid' | 'revoked' | 'unknown';
}
```

The verification result contains:
- `isValid`: Whether the badge is valid
- `errors`: Array of verification errors
- `warnings`: Array of verification warnings
- `verificationMethod`: Method used for verification
- `expirationStatus`: Badge expiration status
- `revocationStatus`: Badge revocation status

## Verification Process

The BadgeVerificationService performs the following checks when verifying a badge:

### For OB2 Badges

1. **Verification Information Check**
   - Checks if the badge has a verification object
   - Determines the verification type (hosted or signed)
   - Normalizes the verification type to handle aliases

2. **Verification Method-Specific Checks**
   - For hosted verification:
     - Checks if the badge has a valid HTTP ID URL
     - In a production environment, would fetch the badge from its ID URL and compare it with the current badge
   - For signed verification:
     - Checks if the badge has a creator property in its verification object
     - In a production environment, would verify the signature using the issuer's public key

3. **Expiration Check**
   - Checks if the badge has an expiration date
   - If it does, compares the expiration date with the current date
   - Sets the expiration status to 'valid', 'expired', or 'not-applicable'

4. **Revocation Check**
   - Checks if the badge has been revoked
   - For OB2 badges, checks the revoked property
   - Sets the revocation status to 'valid', 'revoked', or 'unknown'

### For OB3 Badges

1. **Proof Check**
   - Checks if the badge has a proof object
   - Determines the proof type

2. **Basic Property Checks**
   - Checks if the badge has an issuer
   - Checks if the badge has a credentialSubject

3. **Expiration Check**
   - Checks if the badge has an expirationDate
   - If it does, compares the expiration date with the current date
   - Sets the expiration status to 'valid', 'expired', or 'not-applicable'

4. **Revocation Check**
   - Currently, sets the revocation status to 'unknown' for OB3 badges
   - In a production environment, would check the credential status

## Examples

### Verifying an OB2 Badge

```typescript
import { BadgeVerificationService } from 'openbadges-ui';
import type { OB2 } from 'openbadges-types';

const ob2Badge: OB2.Assertion = {
  // OB2 badge data with hosted verification
  '@context': 'https://w3id.org/openbadges/v2',
  type: 'Assertion',
  id: 'https://example.org/assertions/123',
  verification: {
    type: 'hosted'
  },
  // ... other badge properties
};

const result = await BadgeVerificationService.verifyBadge(ob2Badge);
console.log('Is valid:', result.isValid);
console.log('Verification method:', result.verificationMethod);
console.log('Errors:', result.errors);
console.log('Warnings:', result.warnings);
```

### Verifying an OB3 Badge

```typescript
import { BadgeVerificationService } from 'openbadges-ui';
import type { OB3 } from 'openbadges-types';

const ob3Badge: OB3.VerifiableCredential = {
  // OB3 badge data with proof
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://purl.imsglobal.org/spec/ob/v3p0/context.json'
  ],
  id: 'https://example.org/credentials/123',
  type: ['VerifiableCredential', 'OpenBadgeCredential'],
  issuer: {
    id: 'https://example.org/issuers/1',
    type: 'Profile',
    name: 'Example Issuer'
  },
  issuanceDate: '2023-01-15T12:00:00Z',
  credentialSubject: {
    id: 'https://example.org/recipients/alice',
    type: 'AchievementSubject',
    achievement: {
      id: 'https://example.org/achievements/1',
      type: 'Achievement',
      name: 'Example Achievement',
      description: 'An example achievement',
      criteria: {
        narrative: 'The recipient demonstrated the required skills.'
      },
      image: {
        id: 'https://example.org/images/badge.png',
        type: 'Image'
      }
    }
  },
  proof: {
    type: 'Ed25519Signature2020',
    created: '2023-01-15T12:00:00Z',
    verificationMethod: 'https://example.org/issuers/1/keys/1',
    proofPurpose: 'assertionMethod',
    proofValue: 'z3JD4tQvcBwWkzs7Lhyz89t5dZ2q5fwTKxr7xB1rKDF2Za'
  }
};

const result = await BadgeVerificationService.verifyBadge(ob3Badge);
console.log('Is valid:', result.isValid);
console.log('Verification method:', result.verificationMethod);
console.log('Errors:', result.errors);
console.log('Warnings:', result.warnings);
```

### Handling Verification Errors

```typescript
import { BadgeVerificationService } from 'openbadges-ui';

try {
  const result = await BadgeVerificationService.verifyBadge(badge);
  
  if (result.isValid) {
    console.log('Badge is valid!');
  } else {
    console.log('Badge is invalid:');
    result.errors.forEach(error => console.log(`- ${error}`));
    result.warnings.forEach(warning => console.log(`- Warning: ${warning}`));
  }
} catch (error) {
  console.error('Verification failed:', error);
}
```

## Edge Cases and Limitations

- **Hosted Verification**: The current implementation does not actually fetch the badge from its ID URL. In a production environment, this would require network access.
- **Signed Verification**: The current implementation does not perform cryptographic verification of signatures. In a production environment, this would require additional cryptographic libraries.
- **OB3 Verification**: Full cryptographic verification of OB3 credentials is not yet implemented. In a production environment, this would require additional libraries and is complex.
- **Revocation Checking**: Revocation checking for OB3 credentials is not fully implemented. In a production environment, this would require checking the credential status.
- **Network Access**: The service does not currently handle network errors gracefully. In a production environment, this would need to be addressed.

## Related Services and Composables

- [BadgeService](./BadgeService.md) - Service for badge validation and processing
- [useBadgeVerification](../composables/useBadgeVerification.md) - Composable that uses this service for badge verification
