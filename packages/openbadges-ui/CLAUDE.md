# openbadges-ui Context

Package-specific context for Claude Code when working in `packages/openbadges-ui/`.

**npm**: `openbadges-ui`

## Purpose

Vue 3 component library for Open Badges with accessibility-first design and neurodivergent-friendly themes.

## Key Patterns

### Components

- **BadgeDisplay**: Single badge with image, name, description, issuer
- **BadgeList**: Collection with filtering and sorting
- **ProfileViewer**: Issuer/recipient profile with badges
- **BadgeVerification**: Verification status display
- **BadgeIssuerForm**: Badge creation form

### Composables

```typescript
import { useBadges, useBadgeVerification } from "openbadges-ui";
const { badges, filterBadges, sortBadges } = useBadges();
```

### Accessibility Themes

```typescript
import { AccessibilityService } from "openbadges-ui";
AccessibilityService.applyTheme("dark"); // or: high-contrast, large-text, dyslexia, adhd, autism
```

## Development

```bash
bun run story:dev  # Histoire component playground
bun run test       # Vitest tests (NOT bun test - Bun doesn't support .vue files)
```

## Conventions

- PrimeVue in unstyled mode for maximum flexibility
- CSS variables for theming (prefix: `ob-`)
- All components support keyboard navigation and screen readers
- Test with `bun run test` (Vitest), not `bun test` (Bun native)
