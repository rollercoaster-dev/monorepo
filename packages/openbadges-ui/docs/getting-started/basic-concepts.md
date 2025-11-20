# Basic Concepts

This guide introduces the core concepts of the OpenBadges UI library and the Open Badges standard.

## What are Open Badges?

Open Badges are digital credentials that represent achievements, skills, or qualifications. They are designed to be verifiable, portable, and meaningful. The Open Badges standard provides a way to issue, display, and verify these digital credentials.

### Key Components of Open Badges

1. **Assertion**: The actual badge instance that has been awarded to a recipient. It contains information about who received the badge, when it was issued, and links to the badge class and issuer.

2. **BadgeClass**: The definition of the achievement the badge represents. It includes the name, description, criteria, and image for the badge.

3. **Issuer**: The organization or entity that created and awarded the badge. It includes information about who is making the claim about the recipient's achievement.

## Open Badges Versions

The OpenBadges UI library supports two versions of the Open Badges standard:

### Open Badges 2.0 (OB2)

OB2 is a widely adopted standard that uses JSON-LD for badge data. In OB2, badges consist of three linked JSON objects:
- Assertion
- BadgeClass
- Issuer

### Open Badges 3.0 (OB3)

OB3 is based on the W3C Verifiable Credentials standard. It uses a more flexible structure that can accommodate a wider range of credential types. OB3 credentials include:
- Verifiable Credential
- Credential Subject
- Issuer
- Proof

## Core Components in OpenBadges UI

The OpenBadges UI library provides several components for working with Open Badges:

### Badge Display Components

- **BadgeDisplay**: Renders a single badge with its image, name, description, and issuer information.
- **BadgeList**: Displays a collection of badges with filtering and sorting capabilities.
- **ProfileViewer**: Shows a profile (issuer or recipient) along with their badges.
- **BadgeVerification**: Displays verification status and details for a badge.

### Badge Issuing Components

- **BadgeIssuerForm**: Form for creating and issuing new badges.
- **IssuerDashboard**: Dashboard interface for managing badge issuance.

## Core Composables

The library also provides composables for managing badge data:

- **useBadges**: Manages a collection of badges with filtering, sorting, and normalization.
- **useBadgeIssuer**: Provides functionality for creating and issuing badges.
- **useProfile**: Handles profile data for issuers and recipients.
- **useBadgeVerification**: Provides functionality for verifying badge authenticity.

## Services

The library includes services for working with badges:

- **BadgeService**: Core service for badge validation and processing.
- **BadgeVerificationService**: Service for verifying badge authenticity.
- **AccessibilityService**: Service for managing accessibility features.

## Badge Verification

Badge verification is a crucial aspect of the Open Badges standard. It ensures that badges are authentic and have not been tampered with. The OpenBadges UI library supports two verification methods:

### Hosted Verification

In hosted verification, the badge assertion is hosted at a URL that matches the badge's ID. The verification process involves:
1. Retrieving the badge from its ID URL
2. Comparing it with the badge being verified
3. Checking if the issuer is authorized to issue the badge

### Signed Verification

In signed verification, the badge assertion includes a digital signature created by the issuer. The verification process involves:
1. Retrieving the issuer's public key
2. Verifying the signature using the public key
3. Checking if the issuer is authorized to issue the badge

## Accessibility

The OpenBadges UI library is designed with accessibility in mind. It includes features such as:

- Keyboard navigation
- Screen reader support
- High contrast mode
- Reduced motion options
- Support for neurodivergent users

## Theming

The library uses CSS variables for theming, making it easy to customize the appearance of components. It includes several built-in themes:

- Default theme
- Dark theme
- High contrast theme
- Large text theme
- Dyslexia-friendly theme

## Next Steps

Now that you understand the basic concepts, you can:

- Follow the [Quick Start Guide](./quick-start.md) to create a simple badge display application
- Explore the [API Documentation](../api/index.md) to learn about all available components and features
- Check out the [Examples](../examples.md) for more advanced usage scenarios
