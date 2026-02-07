# BadgeDisplay

The `BadgeDisplay` component renders a single badge with its image, name, description, issuer information, and dates.

## When To Use

- When you need to display a single badge with its details
- When you want to show badge information in a consistent format
- When you need to display badges from different formats (OB2 and OB3)

## Examples

Use the controls in the right panel to customize the component behavior.

### Basic Usage

```vue
<BadgeDisplay :badge="myBadge" />
```

### Interactive Badge

```vue
<BadgeDisplay :badge="myBadge" :interactive="true" @click="handleBadgeClick" />
```

### With Verification

```vue
<BadgeDisplay
  :badge="myBadge"
  :show-verification="true"
  :auto-verify="true"
  @verified="handleVerified"
/>
```

### Custom Display Options

```vue
<BadgeDisplay
  :badge="myBadge"
  :show-description="true"
  :show-issued-date="true"
  :show-expiry-date="true"
/>
```

## Props

| Name               | Type                                        | Default  | Description                                 |
| ------------------ | ------------------------------------------- | -------- | ------------------------------------------- |
| `badge`            | `OB2.Assertion \| OB3.VerifiableCredential` | Required | The badge to display                        |
| `showDescription`  | `boolean`                                   | `true`   | Whether to show the badge description       |
| `showIssuedDate`   | `boolean`                                   | `true`   | Whether to show the badge issue date        |
| `showExpiryDate`   | `boolean`                                   | `false`  | Whether to show the badge expiry date       |
| `interactive`      | `boolean`                                   | `false`  | Whether the badge is clickable              |
| `showVerification` | `boolean`                                   | `false`  | Whether to show badge verification controls |
| `autoVerify`       | `boolean`                                   | `false`  | Whether to automatically verify the badge   |

## Events

| Name       | Payload                                     | Description                                                |
| ---------- | ------------------------------------------- | ---------------------------------------------------------- |
| `click`    | `OB2.Assertion \| OB3.VerifiableCredential` | Emitted when the badge is clicked (if interactive is true) |
| `verified` | `boolean`                                   | Emitted when a badge has been verified                     |

## Slots

| Name            | Description                                           |
| --------------- | ----------------------------------------------------- |
| `badge-actions` | Additional actions to display below the badge content |

## Design Tokens

This component follows the neo-brutalist design language using `@rollercoaster-dev/design-tokens`. Key visual traits:

- **2px borders** via `--ob-border-width-medium`
- **Hard offset shadows** via `--ob-shadow-hard-md` (hover: `--ob-shadow-hard-lg`)
- **Anybody font** for titles via `--ob-font-headline`
- **Theme-adaptive radii** via `--ob-border-radius-sm`
- **Focus ring** via `--ob-shadow-focus` (keyboard only)

All 8 accessibility themes are supported. Use Histoire's theme switcher to preview each theme.

## Accessibility

The component includes several accessibility features:

- When interactive, the component receives a `tabindex="0"` attribute
- The component responds to both click and Enter key events when interactive
- Badge images have descriptive alt text
- Dates are formatted in a readable format
- Focus states use `:focus-visible` (keyboard only, not mouse clicks)
