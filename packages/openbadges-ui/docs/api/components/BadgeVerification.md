# BadgeVerification

The `BadgeVerification` component displays verification status and details for a badge, including verification method, expiration status, and revocation status. It supports both Open Badges 2.0 (OB2) and Open Badges 3.0 (OB3) formats.

## Usage

```vue
<template>
  <BadgeVerification
    :badge="myBadge"
    :show-status="true"
    :show-details="true"
    :show-last-verified="true"
    :auto-verify="true"
    @verified="handleVerified"
  />
</template>

<script setup>
import { BadgeVerification } from "openbadges-ui";
import { ref } from "vue";

// Example badge (OB2 format)
const myBadge = ref({
  "@context": "https://w3id.org/openbadges/v2",
  id: "https://example.org/assertions/123",
  type: "Assertion",
  recipient: {
    identity: "alice@example.org",
    type: "email",
    hashed: false,
  },
  badge: {
    id: "https://example.org/badges/1",
    type: "BadgeClass",
    name: "AI Ethics Fundamentals",
    description:
      "Awarded for demonstrating understanding of core AI ethics principles.",
    image: "https://example.org/badges/ai-ethics.png",
    issuer: {
      id: "https://example.org/issuer",
      type: "Profile",
      name: "Academy",
    },
  },
  issuedOn: "2023-01-15T12:00:00Z",
  verification: {
    type: "hosted",
  },
});

const handleVerified = (isValid) => {
  console.log("Badge verification result:", isValid);
};
</script>
```

## Props

| Name               | Type                                        | Default  | Description                                                                                                                      |
| ------------------ | ------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `badge`            | `OB2.Assertion \| OB3.VerifiableCredential` | Required | The badge to verify. Can be either an Open Badges 2.0 Assertion or an Open Badges 3.0 Verifiable Credential.                     |
| `showStatus`       | `boolean`                                   | `true`   | Whether to show verification status, including the verification button and result.                                               |
| `showDetails`      | `boolean`                                   | `true`   | Whether to show verification details, including verification method, expiration status, revocation status, errors, and warnings. |
| `showLastVerified` | `boolean`                                   | `true`   | Whether to show when the badge was last verified.                                                                                |
| `autoVerify`       | `boolean`                                   | `false`  | Whether to automatically verify the badge when the component is mounted.                                                         |

## Events

| Name       | Payload   | Description                                                                                                |
| ---------- | --------- | ---------------------------------------------------------------------------------------------------------- |
| `verified` | `boolean` | Emitted when verification is complete, with the verification result (`true` if valid, `false` if invalid). |

## CSS Variables

The component uses CSS variables for styling, which can be overridden to customize its appearance:

| Name                                | Default   | Description                                               |
| ----------------------------------- | --------- | --------------------------------------------------------- |
| `--verification-border-color`       | `#e2e8f0` | The color of the verification container border.           |
| `--verification-background`         | `#f7fafc` | The background color of the verification container.       |
| `--verification-text-color`         | `#4a5568` | The color of the verification text.                       |
| `--verification-valid-color`        | `#38a169` | The color used for valid status indicators.               |
| `--verification-invalid-color`      | `#e53e3e` | The color used for invalid status indicators.             |
| `--verification-warning-color`      | `#dd6b20` | The color used for warning messages.                      |
| `--verification-button-bg`          | `#4299e1` | The background color of the verification button.          |
| `--verification-button-color`       | `#ffffff` | The text color of the verification button.                |
| `--verification-button-hover-bg`    | `#3182ce` | The background color of the verification button on hover. |
| `--verification-button-disabled-bg` | `#a0aec0` | The background color of the disabled verification button. |
| `--verification-label-color`        | `#718096` | The color of the verification detail labels.              |

## Accessibility

The BadgeVerification component includes several accessibility features:

- The verification button is a proper button element with clear text.
- The loading spinner has a `role="status"` attribute.
- The loading spinner includes a visually hidden text "Verifying badge..." for screen readers.
- Status changes are clearly indicated through both text and visual cues.
- Color is not the only indicator of status (icons are also used).
- The component supports different themes, including high contrast.
- Headings are used for section titles to provide structure.
- Lists are used for errors and warnings to improve navigation.

## Examples

### Basic Example

```vue
<template>
  <BadgeVerification :badge="badge" />
</template>
```

### Auto-Verify Example

```vue
<template>
  <BadgeVerification
    :badge="badge"
    :auto-verify="true"
    @verified="handleVerified"
  />
</template>
```

### Status-Only Example

```vue
<template>
  <BadgeVerification :badge="badge" :show-status="true" :show-details="false" />
</template>
```

### Expired Badge Example

```vue
<template>
  <BadgeVerification :badge="expiredBadge" />
</template>

<script setup>
import { BadgeVerification } from "openbadges-ui";

// Create a badge with expiration
const expiredBadge = {
  // ... badge data
  expires: "2020-01-01T00:00:00Z", // Past date
};
</script>
```

### Revoked Badge Example

```vue
<template>
  <BadgeVerification :badge="revokedBadge" />
</template>

<script setup>
import { BadgeVerification } from "openbadges-ui";

// Create a badge with revocation
const revokedBadge = {
  // ... badge data
  revoked: true,
  revocationReason: "Badge was issued in error",
};
</script>
```

## Verification Process

The BadgeVerification component uses the BadgeVerificationService to verify badges. The verification process includes:

1. Checking if the badge has valid verification information
2. Determining the verification method (hosted or signed)
3. Verifying the badge based on its verification method
4. Checking expiration status
5. Checking revocation status
6. Reporting any errors or warnings

The verification result includes:

- Whether the badge is valid
- The verification method used
- Expiration status
- Revocation status
- Any errors or warnings encountered during verification

## Edge Cases and Limitations

- Full cryptographic verification of signed badges may require additional libraries.
- Hosted verification requires network access to validate against the hosted assertion.
- Revocation checking for OB3 credentials is not fully implemented.
- The component does not handle network errors gracefully in the current implementation.
- The verification process is asynchronous, so there may be a delay before results are displayed.

## Related Components

- [BadgeDisplay](./BadgeDisplay.md) - Displays a single badge with its details
- [BadgeList](./BadgeList.md) - Displays a collection of badges
