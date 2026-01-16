# openbadges-ui Vision

**Status:** Draft
**Last Updated:** 2025-01-16

---

## Purpose

Vue 3 component library for displaying and interacting with Open Badges. Built neurodivergent-first, not accessible-as-afterthought.

---

## Philosophy

From [DESIGN_PHILOSOPHY.md](docs/DESIGN_PHILOSOPHY.md):

### 1. Neurodiversity-First Design

Accessibility is the bedrock, not an afterthought. We explicitly prioritize neurodivergent users (ADHD, Autism, Dyslexia, and others).

- Clear typography with legible fonts
- Reduced clutter and ample whitespace
- Predictable interactions with clear feedback
- Sensory considerations (no jarring animations or patterns)

### 2. Joyful & Empowering Interaction

Minimize friction and anxiety. Make badges intuitive and even enjoyable.

- Intuitive layouts with clear visual hierarchy
- Subtle micro-interactions that guide without distracting
- Modern, professional, approachable aesthetics

### 3. Deep Customization as Necessity

User needs vary significantly. Extensive customization is a fundamental accessibility feature, not a nice-to-have.

- Flexible CSS variable theming system
- Pre-defined themes as starting points
- Font choice overrides for specific needs (OpenDyslexic, etc.)

### 4. Adaptive Aesthetics

The interface should adapt to the user's context, mood, or specific needs.

- Calming or invigorating palettes available
- Components respect theme variables consistently

---

## What We Provide

### Components

**Badge Display:**

- `BadgeDisplay` - Single badge with image, name, description, issuer
- `BadgeList` - Collection with filtering and sorting
- `BadgeClassCard` / `BadgeClassList` - Badge class management
- `ProfileViewer` - Issuer or recipient profile with badges
- `BadgeVerification` - Verification status display

**Badge Issuing:**

- `BadgeIssuerForm` - Badge creation form
- `IssuerDashboard` - Dashboard for managing issuance
- `IssuerCard` / `IssuerList` - Issuer management

**Accessibility:**

- `AccessibilitySettings` - User preference controls
- `ThemeSelector` - Theme switching
- `FontSelector` - Font preference

### Composables

- `useBadges` - Filtering, sorting, displaying badges
- `useBadgeVerification` - Verification logic
- `useBadgeIssuer` - Badge creation and issuance
- `useProfile` - Profile data handling

### Accessibility Service

```typescript
import { AccessibilityService } from "openbadges-ui";

// Themes
AccessibilityService.applyTheme("dyslexia-friendly");

// Content density
AccessibilityService.setContentDensity("spacious");

// Focus mode (ADHD)
AccessibilityService.setFocusMode(true);

// Animation control
AccessibilityService.setAnimationLevel("minimal");

// Reading modes
AccessibilityService.setReadingMode("bionic");

// Text simplification
AccessibilityService.simplifyText(text, 2);

// Number formatting (dyscalculia)
AccessibilityService.formatNumber(12345, { highlightDigits: true });
```

---

## For Partners

Drop components into existing Vue 3 frontends:

```bash
bun add openbadges-ui openbadges-types
```

```typescript
import { OpenBadgesUIPlugin } from "openbadges-ui";
import "openbadges-ui/dist/style.css";

app.use(OpenBadgesUIPlugin);
```

Full theming support via CSS variables. Override anything.

---

## Current Focus

1. **Component polish** - Ensure all components work well together
2. **Theme completeness** - All accessibility themes fully implemented
3. **Documentation** - Histoire stories for every component
4. **Testing** - 100% test coverage maintained

---

## Future Direction

- More reading assistance modes
- Enhanced screen reader support
- Component variants for different use cases
- React adapter (if demand exists)

---

## Related

- [Design Philosophy](docs/DESIGN_PHILOSOPHY.md)
- [Neurodiversity Guide](docs/neurodiversity.md)
- [Live Documentation](https://rollercoaster-dev.github.io/openbadges-ui/)
- [Ecosystem Vision](../../apps/docs/vision/openbadges-ecosystem.md)
