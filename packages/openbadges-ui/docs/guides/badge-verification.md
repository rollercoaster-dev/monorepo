# Badge Verification Guide

This guide explains how to implement badge verification in your application using the OpenBadges UI library.

## Understanding Badge Verification

Badge verification is a crucial aspect of the Open Badges standard. It ensures that badges are authentic and have not been tampered with. The OpenBadges UI library supports verification for both Open Badges 2.0 (OB2) and Open Badges 3.0 (OB3) formats.

### Verification Methods

#### Hosted Verification (OB2)

In hosted verification, the badge assertion is hosted at a URL that matches the badge's ID. The verification process involves:
1. Retrieving the badge from its ID URL
2. Comparing it with the badge being verified
3. Checking if the issuer is authorized to issue the badge

#### Signed Verification (OB2)

In signed verification, the badge assertion includes a digital signature created by the issuer. The verification process involves:
1. Retrieving the issuer's public key
2. Verifying the signature using the public key
3. Checking if the issuer is authorized to issue the badge

#### Proof Verification (OB3)

OB3 badges use the W3C Verifiable Credentials model, which includes a proof property. The verification process involves:
1. Checking the proof type
2. Verifying the proof using the appropriate cryptographic method
3. Checking if the issuer is authorized to issue the badge

### Additional Checks

In addition to the verification method-specific checks, the library also performs:
- **Expiration Check**: Checks if the badge has expired
- **Revocation Check**: Checks if the badge has been revoked

## Using the BadgeVerification Component

The easiest way to add verification to your application is to use the `BadgeVerification` component.

### Basic Usage

```vue
<template>
  <BadgeVerification 
    :badge="badge" 
    @verified="handleVerified"
  />
</template>

<script setup>
import { BadgeVerification } from 'openbadges-ui';
import { ref } from 'vue';

const badge = ref({
  // Badge data
});

const handleVerified = (isValid) => {
  console.log('Badge verification result:', isValid);
};
</script>
```

### Auto-Verify

You can set the `auto-verify` prop to automatically verify the badge when the component is mounted:

```vue
<template>
  <BadgeVerification 
    :badge="badge" 
    :auto-verify="true"
    @verified="handleVerified"
  />
</template>
```

### Customizing the Display

You can customize what information is displayed using the following props:

```vue
<template>
  <BadgeVerification 
    :badge="badge" 
    :show-status="true"
    :show-details="true"
    :show-last-verified="true"
  />
</template>
```

### Integrating with BadgeDisplay

The `BadgeDisplay` component can include verification functionality:

```vue
<template>
  <BadgeDisplay 
    :badge="badge" 
    :show-verification="true"
    :auto-verify="false"
    @verified="handleVerified"
  />
</template>
```

## Using the useBadgeVerification Composable

For more control over the verification process, you can use the `useBadgeVerification` composable:

```vue
<script setup>
import { useBadgeVerification } from 'openbadges-ui';
import { ref } from 'vue';

const badge = ref({
  // Badge data
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

const handleVerify = async () => {
  const result = await verifyBadge(badge.value);
  console.log('Verification result:', result);
};
</script>

<template>
  <div>
    <button 
      @click="handleVerify" 
      :disabled="state.isVerifying"
    >
      {{ state.isVerifying ? 'Verifying...' : 'Verify Badge' }}
    </button>
    
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

## Using the BadgeVerificationService Directly

For advanced use cases, you can use the `BadgeVerificationService` directly:

```typescript
import { BadgeVerificationService } from 'openbadges-ui';
import type { OB2 } from 'openbadges-types';

const badge: OB2.Assertion = {
  // Badge data
};

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

## Handling Different Badge Formats

The verification functionality automatically detects the badge format (OB2 or OB3) and applies the appropriate verification method.

### OB2 Example

```typescript
const ob2Badge = {
  '@context': 'https://w3id.org/openbadges/v2',
  type: 'Assertion',
  id: 'https://example.org/assertions/123',
  verification: {
    type: 'hosted'
  },
  // ... other badge properties
};

const result = await BadgeVerificationService.verifyBadge(ob2Badge);
```

### OB3 Example

```typescript
const ob3Badge = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://purl.imsglobal.org/spec/ob/v3p0/context.json'
  ],
  id: 'https://example.org/credentials/123',
  type: ['VerifiableCredential', 'OpenBadgeCredential'],
  proof: {
    type: 'Ed25519Signature2020',
    // ... other proof properties
  },
  // ... other badge properties
};

const result = await BadgeVerificationService.verifyBadge(ob3Badge);
```

## Handling Verification Errors

The verification process can encounter various errors, such as:
- Missing verification information
- Invalid verification type
- Missing required properties
- Expired badges
- Revoked badges

You should handle these errors gracefully in your application:

```vue
<script setup>
import { useBadgeVerification } from 'openbadges-ui';

const { verifyBadge, isValid, errors, warnings } = useBadgeVerification();

const handleVerify = async () => {
  try {
    await verifyBadge(badge.value);
  } catch (error) {
    console.error('Verification failed:', error);
  }
};
</script>

<template>
  <button @click="handleVerify">Verify Badge</button>
  
  <div v-if="isValid" class="success">
    Badge is valid!
  </div>
  
  <div v-else-if="errors.length > 0" class="error">
    <h4>Verification Failed:</h4>
    <ul>
      <li v-for="(error, index) in errors" :key="index">{{ error }}</li>
    </ul>
  </div>
  
  <div v-if="warnings.length > 0" class="warning">
    <h4>Warnings:</h4>
    <ul>
      <li v-for="(warning, index) in warnings" :key="index">{{ warning }}</li>
    </ul>
  </div>
</template>
```

## Limitations and Considerations

### Network Access

Hosted verification requires network access to validate against the hosted assertion. In a browser environment, this may be subject to CORS restrictions.

### Cryptographic Verification

Full cryptographic verification of signed badges and OB3 credentials requires additional libraries and is complex. The current implementation provides warnings when full verification cannot be performed.

### Revocation Checking

Revocation checking for OB3 credentials is not fully implemented. In a production environment, this would require checking the credential status.

### Performance

Verification can be a resource-intensive process, especially for signed badges or when network requests are involved. Consider implementing caching or performing verification only when necessary.

## Best Practices

1. **Cache Verification Results**: Store verification results to avoid unnecessary re-verification.
2. **Handle Network Errors**: Implement proper error handling for network requests.
3. **Provide Clear Feedback**: Clearly communicate verification status to users.
4. **Consider Privacy**: Be mindful of privacy concerns when verifying badges, especially when making network requests.
5. **Implement Fallbacks**: Have fallback mechanisms in case verification cannot be completed.

## Next Steps

- Learn about [Working with OB2 and OB3 Formats](./ob-formats.md)
- Explore [Theming and Customization](./theming.md) to style verification components
- Check out [Integration with Backend Systems](./backend-integration.md) for server-side verification
