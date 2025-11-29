# BadgeVerification

The `BadgeVerification` component displays verification status and details for a badge, including verification method, expiration status, and revocation status.

## When To Use

- When you need to verify the authenticity of a badge
- When you want to display verification status to users
- When you need to check if a badge has expired or been revoked

## Examples

Use the controls in the right panel to customize the component behavior.

### Basic Usage

```vue
<BadgeVerification :badge="myBadge" @verified="handleVerified" />
```

### Auto-Verify

```vue
<BadgeVerification
  :badge="myBadge"
  :auto-verify="true"
  @verified="handleVerified"
/>
```

### Custom Display Options

```vue
<BadgeVerification
  :badge="myBadge"
  :show-status="true"
  :show-details="true"
  :show-last-verified="false"
  @verified="handleVerified"
/>
```

## Props

| Name               | Type                                        | Default  | Description                                            |
| ------------------ | ------------------------------------------- | -------- | ------------------------------------------------------ |
| `badge`            | `OB2.Assertion \| OB3.VerifiableCredential` | Required | The badge to verify                                    |
| `showStatus`       | `boolean`                                   | `true`   | Whether to show verification status                    |
| `showDetails`      | `boolean`                                   | `true`   | Whether to show verification details                   |
| `showLastVerified` | `boolean`                                   | `true`   | Whether to show when the badge was last verified       |
| `autoVerify`       | `boolean`                                   | `false`  | Whether to automatically verify the badge when mounted |

## Events

| Name       | Payload   | Description                                                         |
| ---------- | --------- | ------------------------------------------------------------------- |
| `verified` | `boolean` | Emitted when verification is complete, with the verification result |

## Verification Process

The verification process includes:

1. Checking if the badge has valid verification information
2. Determining the verification method (hosted or signed)
3. Verifying the badge based on its verification method
4. Checking expiration status
5. Checking revocation status
6. Reporting any errors or warnings

## Accessibility

The component includes several accessibility features:

- The verification button is a proper button element with clear text
- The loading spinner has a `role="status"` attribute
- The loading spinner includes visually hidden text for screen readers
- Status changes are clearly indicated through both text and visual cues
- Color is not the only indicator of status (icons are also used)
- The component supports different themes, including high contrast
