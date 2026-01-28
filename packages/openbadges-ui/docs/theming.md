# Theming OpenBadges UI

OpenBadges UI uses CSS custom properties (variables) for theming. This guide covers the token contract, how to create custom themes, and how to use the built-in neurodivergent-friendly themes.

## Token Architecture

Tokens are organized in three tiers:

```text
Foundational  →  raw values (palette, font stacks, spacing)
     ↓
Semantic      →  context tokens (--ob-background, --ob-primary, --ob-border…)
     ↓
Component     →  per-component overrides (--ob-badge-background, --ob-form-*)
```

**Override the semantic layer** to create custom themes. Component tokens inherit from semantic tokens automatically, so most customizations only need a handful of overrides.

## Public Tokens (Stable API)

These tokens are the stable theming contract. They are safe to override and will not change without a major version bump.

### Surfaces

| Token                     | Purpose                     | Default  |
| ------------------------- | --------------------------- | -------- |
| `--ob-background`         | Page background             | `white`  |
| `--ob-foreground`         | Primary text                | gray-800 |
| `--ob-card`               | Card/panel background       | `white`  |
| `--ob-card-foreground`    | Card text                   | gray-800 |
| `--ob-popover`            | Popover/dropdown background | `white`  |
| `--ob-popover-foreground` | Popover text                | gray-800 |
| `--ob-muted`              | Subtle background           | gray-50  |
| `--ob-muted-foreground`   | Secondary text              | gray-500 |

### Interactive States

| Token                       | Purpose                          | Default   |
| --------------------------- | -------------------------------- | --------- |
| `--ob-primary`              | Primary actions (buttons, links) | `#3182ce` |
| `--ob-primary-foreground`   | Text on primary background       | `white`   |
| `--ob-secondary`            | Secondary actions                | `#718096` |
| `--ob-secondary-foreground` | Text on secondary background     | gray-800  |
| `--ob-accent`               | Accent highlights                | gray-100  |
| `--ob-accent-foreground`    | Text on accent background        | gray-800  |

### Feedback States

| Token                         | Purpose                        | Default   |
| ----------------------------- | ------------------------------ | --------- |
| `--ob-destructive`            | Error / danger                 | `#e53e3e` |
| `--ob-destructive-foreground` | Text on destructive background | `white`   |
| `--ob-success`                | Success state                  | `#38a169` |
| `--ob-success-foreground`     | Text on success background     | `white`   |
| `--ob-warning`                | Warning state                  | `#d69e2e` |
| `--ob-warning-foreground`     | Text on warning background     | gray-800  |
| `--ob-info`                   | Informational state            | `#3182ce` |
| `--ob-info-foreground`        | Text on info background        | `white`   |

### Form Elements

| Token               | Purpose               | Default                          |
| ------------------- | --------------------- | -------------------------------- |
| `--ob-border`       | Default border colour | gray-200                         |
| `--ob-input`        | Input background      | gray-50                          |
| `--ob-ring`         | Focus ring colour     | `#3182ce`                        |
| `--ob-shadow-focus` | Focus ring shadow     | `0 0 0 3px rgba(49,130,206,0.4)` |

### Typography

| Token                 | Purpose                   | Default                 |
| --------------------- | ------------------------- | ----------------------- |
| `--ob-font-family`    | Default font stack        | system-ui stack         |
| `--ob-text-primary`   | Primary text colour       | `--ob-foreground`       |
| `--ob-text-secondary` | Secondary text colour     | `--ob-muted-foreground` |
| `--ob-text-disabled`  | Disabled text colour      | gray-400                |
| `--ob-text-inverse`   | Inverse text (on dark bg) | `white`                 |

## Creating a Custom Theme

### Basic Brand Override

Override semantic tokens on any CSS selector:

```css
/* my-brand-theme.css */
.my-brand {
  --ob-primary: #8b5cf6;
  --ob-primary-foreground: #ffffff;
  --ob-ring: #8b5cf6;
  --ob-accent: #ede9fe;
  --ob-accent-foreground: #4c1d95;
}
```

```html
<div class="my-brand">
  <!-- All openbadges-ui components inside inherit the brand colours -->
</div>
```

### Light / Dark Mode

```css
/* Light mode (default — no class needed) */

/* Dark mode */
.my-dark {
  --ob-background: #1a202c;
  --ob-foreground: #f7fafc;
  --ob-card: #2d3748;
  --ob-card-foreground: #f7fafc;
  --ob-muted: #2d3748;
  --ob-muted-foreground: #e2e8f0;
  --ob-border: #4a5568;
  --ob-input: #2d3748;
  --ob-accent: #4a5568;
  --ob-accent-foreground: #f7fafc;
}
```

### Per-Component Overrides

For fine-grained control, override component tokens directly:

```css
.my-brand {
  /* Only change badge appearance */
  --ob-badge-background: #f5f3ff;
  --ob-badge-title-color: #4c1d95;
  --ob-badge-border-color: #c4b5fd;
}
```

## Built-in Themes

### Standard Themes

| Class                     | Description              |
| ------------------------- | ------------------------ |
| _(none / `:root`)_        | Light mode defaults      |
| `.ob-dark-theme`          | Dark mode                |
| `.ob-high-contrast-theme` | WCAG AAA contrast ratios |

### Neurodivergent-Friendly Themes

| Class                         | Designed For                   | Key Changes                                            |
| ----------------------------- | ------------------------------ | ------------------------------------------------------ |
| `.ob-large-text-theme`        | Low vision, reading difficulty | Larger font sizes, relaxed line heights                |
| `.ob-dyslexia-friendly-theme` | Dyslexia                       | OpenDyslexic font, cream background, increased spacing |
| `.ob-low-vision-theme`        | Low vision                     | Atkinson Hyperlegible font, high contrast, large text  |
| `.ob-low-info-theme`          | Cognitive load reduction       | Atkinson Hyperlegible, simplified colour palette       |
| `.ob-autism-friendly-theme`   | Autism spectrum                | Predictable layouts, muted colours, no shadows         |

### Applying Themes

**Via CSS class:**

```html
<body class="ob-dark-theme">
  <!-- Components use dark theme tokens -->
</body>
```

**Via JavaScript:**

```typescript
import { AccessibilityService } from "openbadges-ui";
AccessibilityService.applyTheme("dark");
```

**Combining themes** — themes can be layered. The most specific selector wins:

```html
<body class="ob-dark-theme">
  <section class="ob-large-text-theme">
    <!-- Dark mode + large text -->
  </section>
</body>
```

## Creating a Custom ND Theme

To create a neurodivergent-friendly variant, override the relevant token categories:

```css
/* Custom sensory-friendly theme */
.my-sensory-friendly {
  /* Reduce visual noise */
  --ob-shadow-sm: none;
  --ob-shadow-md: none;
  --ob-shadow-lg: none;

  /* Muted palette */
  --ob-primary: #5a8fa8;
  --ob-primary-foreground: #ffffff;
  --ob-background: #f5f5f0;
  --ob-foreground: #3a3a3a;

  /* Accessible typography */
  --ob-font-family: var(--ob-font-atkinson);

  /* Clear boundaries */
  --ob-border: #c0c0c0;
  --ob-border-width: 2px;

  /* Calm focus indicator */
  --ob-ring: #5a8fa8;
  --ob-shadow-focus: 0 0 0 3px rgba(90, 143, 168, 0.4);
}
```

## Runtime Theme Switching

```typescript
function toggleDarkMode(enabled: boolean) {
  document.body.classList.toggle("ob-dark-theme", enabled);
}

// theme: short name without prefix/suffix, e.g. "large-text", "dyslexia-friendly"
function setNDTheme(theme: string | null) {
  // Remove all ND theme classes
  const ndClasses = [
    "ob-large-text-theme",
    "ob-dyslexia-friendly-theme",
    "ob-low-vision-theme",
    "ob-low-info-theme",
    "ob-autism-friendly-theme",
  ];
  document.body.classList.remove(...ndClasses);

  // Apply new theme
  if (theme) {
    document.body.classList.add(`ob-${theme}-theme`);
  }
}
```

## Accessibility Guidelines

- **Contrast**: Default tokens meet WCAG AA (4.5:1 for normal text, 3:1 for large text). The high-contrast theme targets WCAG AAA.
- **Focus visibility**: All interactive elements show a visible focus ring using `--ob-ring` and `--ob-shadow-focus`. Override these to match your brand while maintaining visibility.
- **Motion**: The `prefers-reduced-motion` media query is respected automatically. Transition tokens (`--ob-transition-fast`, etc.) are set to `0ms` when reduced motion is preferred.
- **Font choices**: ND themes use fonts designed for accessibility (Atkinson Hyperlegible, OpenDyslexic, Lexend). These are bundled with the library.

## Token File Reference

| File                           | Contents                                             |
| ------------------------------ | ---------------------------------------------------- |
| `src/styles/tokens.css`        | Token contract (foundational + semantic + component) |
| `src/styles/themes.css`        | Built-in theme class overrides                       |
| `src/styles/fonts.css`         | Font face definitions and font family variables      |
| `src/styles/accessibility.css` | Accessibility utility classes and media queries      |
| `src/styles/main.css`          | Base styles and CSS entry point                      |
