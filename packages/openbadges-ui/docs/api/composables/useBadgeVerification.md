# useBadgeVerification

The `useBadgeVerification` composable provides functionality for verifying badge authenticity. It manages the verification state and provides methods for verifying badges of both Open Badges 2.0 (OB2) and Open Badges 3.0 (OB3) formats.

## Usage

```vue
<script setup>
import { useBadgeVerification } from 'openbadges-ui';
import { ref } from 'vue';

const badge = ref({
  '@context': 'https://w3id.org/openbadges/v2',
  id: 'https://example.org/assertions/123',
  type: 'Assertion',
  // ... other badge properties
  verification: {
    type: 'hosted'
  }
});

const {
  state,
  isValid,
  errors,
  warnings,
  verificationMethod,
  expirationStatus,
  revocationStatus,
  hasBeenVerified,
  verifyBadge,
  clearVerification
} = useBadgeVerification();

// Verify the badge
const handleVerify = async () => {
  const result = await verifyBadge(badge.value);
  console.log('Verification result:', result);
};
</script>

<template>
  <div>
    <button @click="handleVerify" :disabled="state.isVerifying">
      {{ state.isVerifying ? 'Verifying...' : 'Verify Badge' }}
    </button>
    
    <div v-if="hasBeenVerified">
      <p>Valid: {{ isValid ? 'Yes' : 'No' }}</p>
      
      <div v-if="verificationMethod">
        <p>Method: {{ verificationMethod }}</p>
      </div>
      
      <div v-if="errors.length > 0">
        <h4>Errors:</h4>
        <ul>
          <li v-for="(error, index) in errors" :key="index">{{ error }}</li>
        </ul>
      </div>
      
      <div v-if="warnings.length > 0">
        <h4>Warnings:</h4>
        <ul>
          <li v-for="(warning, index) in warnings" :key="index">{{ warning }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>
```

## Parameters

The `useBadgeVerification` composable does not take any parameters.

## Returns

| Name | Type | Description |
|------|------|-------------|
| `state` | `Ref<BadgeVerificationState>` | Reactive state object containing verification data and status. |
| `isValid` | `ComputedRef<boolean>` | Whether the badge is valid. Returns `false` if no verification has been performed. |
| `errors` | `ComputedRef<string[]>` | Array of verification errors. Empty if no errors or no verification has been performed. |
| `warnings` | `ComputedRef<string[]>` | Array of verification warnings. Empty if no warnings or no verification has been performed. |
| `verificationMethod` | `ComputedRef<'hosted' \| 'signed' \| undefined>` | Method used for verification. `undefined` if no verification has been performed. |
| `expirationStatus` | `ComputedRef<'valid' \| 'expired' \| 'not-applicable' \| undefined>` | Badge expiration status. `undefined` if no verification has been performed. |
| `revocationStatus` | `ComputedRef<'valid' \| 'revoked' \| 'unknown' \| undefined>` | Badge revocation status. `undefined` if no verification has been performed. |
| `hasBeenVerified` | `ComputedRef<boolean>` | Whether the badge has been verified. |
| `verifyBadge` | `(badge: OB2.Assertion \| OB3.VerifiableCredential) => Promise<VerificationResult>` | Function to verify a badge. Returns a promise that resolves to the verification result. |
| `clearVerification` | `() => void` | Function to clear verification state. |

## State Structure

```typescript
interface BadgeVerificationState {
  isVerifying: boolean;
  lastVerified: Date | null;
  result: VerificationResult | null;
  badge: OB2.Assertion | OB3.VerifiableCredential | null;
}
```

The state object contains:
- `isVerifying`: Whether a verification is currently in progress
- `lastVerified`: Timestamp of the last verification, or `null` if no verification has been performed
- `result`: The result of the last verification, or `null` if no verification has been performed
- `badge`: The badge that was last verified, or `null` if no verification has been performed

## Verification Result Structure

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

## Methods

### verifyBadge(badge)

Verifies a badge and updates the verification state.

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| `badge` | `OB2.Assertion \| OB3.VerifiableCredential` | The badge to verify. Can be either an Open Badges 2.0 Assertion or an Open Badges 3.0 Verifiable Credential. |

#### Returns

`Promise<VerificationResult>`: A promise that resolves to the verification result.

#### Example

```javascript
const badge = {
  '@context': 'https://w3id.org/openbadges/v2',
  id: 'https://example.org/assertions/123',
  type: 'Assertion',
  // ... other badge properties
  verification: {
    type: 'hosted'
  }
};

const result = await verifyBadge(badge);
console.log('Is valid:', result.isValid);
console.log('Errors:', result.errors);
console.log('Warnings:', result.warnings);
```

### clearVerification()

Clears the verification state, resetting it to its initial values.

#### Example

```javascript
// After verification
console.log(hasBeenVerified.value); // true

// Clear verification state
clearVerification();

// State is reset
console.log(hasBeenVerified.value); // false
console.log(isValid.value); // false
console.log(errors.value); // []
```

## Examples

### Basic Verification

```vue
<script setup>
import { useBadgeVerification } from 'openbadges-ui';
import { ref } from 'vue';

const badge = ref({
  // Badge data
});

const { verifyBadge, isValid, errors } = useBadgeVerification();

const handleVerify = async () => {
  await verifyBadge(badge.value);
};
</script>

<template>
  <button @click="handleVerify">Verify Badge</button>
  <p v-if="isValid">Badge is valid!</p>
  <p v-else-if="errors.length > 0">Badge is invalid: {{ errors[0] }}</p>
</template>
```

### Displaying Verification Details

```vue
<script setup>
import { useBadgeVerification } from 'openbadges-ui';
import { ref } from 'vue';

const badge = ref({
  // Badge data
});

const {
  verifyBadge,
  isValid,
  verificationMethod,
  expirationStatus,
  revocationStatus,
  hasBeenVerified
} = useBadgeVerification();

const handleVerify = async () => {
  await verifyBadge(badge.value);
};
</script>

<template>
  <button @click="handleVerify">Verify Badge</button>
  
  <div v-if="hasBeenVerified">
    <h3>Verification Result</h3>
    <p>Valid: {{ isValid ? 'Yes' : 'No' }}</p>
    
    <div v-if="verificationMethod">
      <p>Method: {{ verificationMethod }}</p>
    </div>
    
    <div v-if="expirationStatus !== 'not-applicable'">
      <p>Expiration: {{ expirationStatus === 'valid' ? 'Valid' : 'Expired' }}</p>
    </div>
    
    <div v-if="revocationStatus !== 'unknown'">
      <p>Revocation: {{ revocationStatus === 'valid' ? 'Valid' : 'Revoked' }}</p>
    </div>
  </div>
</template>
```

### Handling Verification Errors

```vue
<script setup>
import { useBadgeVerification } from 'openbadges-ui';
import { ref } from 'vue';

const badge = ref({
  // Badge data
});

const {
  state,
  verifyBadge,
  errors,
  warnings,
  hasBeenVerified
} = useBadgeVerification();

const handleVerify = async () => {
  try {
    await verifyBadge(badge.value);
  } catch (error) {
    console.error('Verification failed:', error);
  }
};
</script>

<template>
  <button 
    @click="handleVerify" 
    :disabled="state.isVerifying"
  >
    {{ state.isVerifying ? 'Verifying...' : 'Verify Badge' }}
  </button>
  
  <div v-if="hasBeenVerified">
    <div v-if="errors.length > 0" class="errors">
      <h4>Errors:</h4>
      <ul>
        <li v-for="(error, index) in errors" :key="index">{{ error }}</li>
      </ul>
    </div>
    
    <div v-if="warnings.length > 0" class="warnings">
      <h4>Warnings:</h4>
      <ul>
        <li v-for="(warning, index) in warnings" :key="index">{{ warning }}</li>
      </ul>
    </div>
  </div>
</template>
```

## Edge Cases and Limitations

- The verification process is asynchronous, so there may be a delay before results are displayed.
- Full cryptographic verification of signed badges may require additional libraries.
- Hosted verification requires network access to validate against the hosted assertion.
- Revocation checking for OB3 credentials is not fully implemented.
- The composable does not handle network errors gracefully in the current implementation.

## Related Composables and Services

- [BadgeVerificationService](../services/BadgeVerificationService.md) - Service used by the composable to perform badge verification
- [useBadges](./useBadges.md) - Composable for managing a collection of badges
