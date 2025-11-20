# BadgeDisplay

The `BadgeDisplay` component renders a single badge with its image, name, description, issuer information, and dates. It supports both Open Badges 2.0 (OB2) and Open Badges 3.0 (OB3) formats.

## Usage

```vue
<template>
  <BadgeDisplay 
    :badge="myBadge" 
    :show-description="true"
    :show-issued-date="true"
    :interactive="true"
    :show-verification="true"
    @click="handleBadgeClick"
    @verified="handleVerified"
  />
</template>

<script setup>
import { BadgeDisplay } from 'openbadges-ui';
import { ref } from 'vue';

// Example badge (OB2 format)
const myBadge = ref({
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
});

const handleBadgeClick = (badge) => {
  console.log('Badge clicked:', badge);
};

const handleVerified = (isValid) => {
  console.log('Badge verification result:', isValid);
};
</script>
```

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `badge` | `OB2.Assertion \| OB3.VerifiableCredential` | Required | The badge to display. Can be either an Open Badges 2.0 Assertion or an Open Badges 3.0 Verifiable Credential. |
| `showDescription` | `boolean` | `true` | Whether to show the badge description. |
| `showIssuedDate` | `boolean` | `true` | Whether to show the badge issue date. |
| `showExpiryDate` | `boolean` | `false` | Whether to show the badge expiry date (if available). |
| `interactive` | `boolean` | `false` | Whether the badge is clickable. When `true`, the badge will have hover and focus styles, and will emit a `click` event when clicked. |
| `showVerification` | `boolean` | `false` | Whether to show badge verification controls. When `true`, a button to toggle verification details will be displayed. |
| `autoVerify` | `boolean` | `false` | Whether to automatically verify the badge when the verification component is displayed. |

## Events

| Name | Payload | Description |
|------|---------|-------------|
| `click` | `OB2.Assertion \| OB3.VerifiableCredential` | Emitted when the badge is clicked (if `interactive` is `true`). The payload is the original badge object. |
| `verified` | `boolean` | Emitted when a badge has been verified, with the verification result (`true` if valid, `false` if invalid). |

## Slots

| Name | Description |
|------|-------------|
| `badge-actions` | Additional actions to display below the badge content. This slot can be used to add custom buttons or other interactive elements. |

## CSS Variables

The component uses CSS variables for styling, which can be overridden to customize its appearance:

| Name | Default | Description |
|------|---------|-------------|
| `--badge-border-color` | `#e2e8f0` | The color of the badge border. |
| `--badge-border-radius` | `8px` | The border radius of the badge. |
| `--badge-padding` | `16px` | The padding inside the badge. |
| `--badge-background` | `#ffffff` | The background color of the badge. |
| `--badge-shadow` | `0 2px 4px rgba(0, 0, 0, 0.1)` | The shadow effect of the badge. |
| `--badge-title-color` | `#1a202c` | The color of the badge title. |
| `--badge-text-color` | `#4a5568` | The color of the badge text. |
| `--badge-hover-shadow` | `0 4px 8px rgba(0, 0, 0, 0.15)` | The shadow effect when hovering over an interactive badge. |
| `--badge-focus-outline-color` | `#3182ce` | The outline color when an interactive badge is focused. |

## Accessibility

The BadgeDisplay component includes several accessibility features:

- When `interactive` is `true`, the component receives a `tabindex="0"` attribute to make it focusable.
- The component responds to both click and Enter key events when interactive.
- Badge images have descriptive alt text generated from the badge name.
- Dates are formatted in a readable format.
- The verification toggle button is a proper button element with clear text.
- Focus states are visually indicated with an outline.

## Examples

### Basic Example

```vue
<template>
  <BadgeDisplay :badge="badge" />
</template>
```

### Interactive Badge

```vue
<template>
  <BadgeDisplay 
    :badge="badge" 
    :interactive="true"
    @click="handleBadgeClick"
  />
</template>
```

### With Verification

```vue
<template>
  <BadgeDisplay 
    :badge="badge" 
    :show-verification="true"
    :auto-verify="true"
    @verified="handleVerified"
  />
</template>
```

### With Custom Actions

```vue
<template>
  <BadgeDisplay :badge="badge">
    <template #badge-actions>
      <button @click="downloadBadge">Download Badge</button>
      <button @click="shareBadge">Share Badge</button>
    </template>
  </BadgeDisplay>
</template>
```

### With Expiry Date

```vue
<template>
  <BadgeDisplay 
    :badge="badgeWithExpiry" 
    :show-expiry-date="true"
  />
</template>
```

## Edge Cases and Limitations

- If the badge image URL is invalid or the image fails to load, no fallback image is displayed.
- Long badge names or descriptions may be truncated in the UI depending on the container width.
- The component does not handle badge revocation status display directly; use the BadgeVerification component for that.
- Date formatting uses the browser's locale settings, which may vary across different environments.

## Related Components

- [BadgeList](./BadgeList.md) - Displays a collection of badges
- [BadgeVerification](./BadgeVerification.md) - Displays verification status and details for a badge
- [ProfileViewer](./ProfileViewer.md) - Shows a profile with associated badges
