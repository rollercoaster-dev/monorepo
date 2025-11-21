# External Design System Integration Strategy

This document outlines the analysis of external design systems (specifically Fobizz) and proposes a strategy for integrating their styles with the `openbadges-ui` component library.

## 1. Analysis of Fobizz Styling (`https://app.fobizz.com/tools`)

Based on inspection of the publicly accessible Fobizz tools page:

*   **Framework:** The presence of `data-v-xxxxxx` attributes strongly indicates the use of Vue.js with scoped CSS.
*   **CSS Approach:** Class names suggest a BEM-like methodology (`element__block--modifier`) or framework-generated/scoped classes. There's no obvious use of a global utility-first framework like Tailwind in the primary component structure, although it might be used internally.
*   **Visual Identity:** Fobizz employs a distinct and consistent design language, including specific color palettes, typography, spacing rules, and component aesthetics.
*   **Limitations:** Analysis is based solely on the rendered HTML and public assets. Access to Fobizz's source code or specific style guides would allow for a more definitive understanding.

## 2. Analysis of `openbadges-ui` Theming System

The `openbadges-ui` library utilizes a flexible theming system based on CSS Custom Properties (variables):

*   **Core File:** `src/styles/themes.css` defines a comprehensive set of variables prefixed with `--ob-` (e.g., `--ob-primary`, `--ob-font-family`, `--ob-space-4`).
*   **Themes:**
    *   A default light theme is defined under `:root`.
    *   Specific themes like `.ob-dark-theme` and `.ob-adhd-friendly-theme` are included, demonstrating how to override the default variables for different contexts.
*   **Scope:** Variables cover global styles (colors, typography, spacing) and component-specific styles (e.g., `--ob-badge-border-color`).

## 3. Proposed Integration Strategy: CSS Variable Overrides

The recommended approach for integrating Fobizz's (or any external) styling is to leverage the existing CSS custom property system.

**Steps for Consumers (e.g., Fobizz):**

1.  **Identify Design Tokens:** Extract Fobizz's core design tokens (primary/secondary colors, font families, font sizes, spacing units, border radii, etc.).
2.  **Create a Theme File:** Create a dedicated CSS file (e.g., `fobizz-theme.css`) within the consuming application.
3.  **Map and Override Variables:** In `fobizz-theme.css`, define a CSS rule targeting a specific class (e.g., `.fobizz-theme`) or `:root`. Inside this rule, override the relevant `--ob-*` variables with Fobizz's corresponding design token values.

    ```css
    /* Example: fobizz-theme.css */
    .fobizz-theme {
      /* --- Fobizz Color Palette --- */
      --ob-primary: #YOUR_FOBIZZ_PRIMARY_COLOR; /* e.g., #007bff */
      --ob-secondary: #YOUR_FOBIZZ_SECONDARY_COLOR; /* e.g., #6c757d */
      --ob-error: #YOUR_FOBIZZ_ERROR_COLOR; /* e.g., #dc3545 */
      /* ... override other colors ... */

      /* --- Fobizz Neutral Colors --- */
      --ob-gray-100: #YOUR_FOBIZZ_LIGHT_GRAY;
      --ob-gray-800: #YOUR_FOBIZZ_DARK_GRAY;
      /* ... override other grays ... */

      /* --- Fobizz Text Colors --- */
      --ob-text-primary: #YOUR_FOBIZZ_PRIMARY_TEXT;
      --ob-text-secondary: #YOUR_FOBIZZ_SECONDARY_TEXT;

      /* --- Fobizz Background Colors --- */
      --ob-bg-primary: #YOUR_FOBIZZ_PRIMARY_BG;
      --ob-bg-secondary: #YOUR_FOBIZZ_SECONDARY_BG;

      /* --- Fobizz Typography --- */
      --ob-font-family: "YOUR_FOBIZZ_FONT", sans-serif;
      --ob-font-size-md: 1rem; /* Adjust if needed */
      /* ... override other font sizes/weights ... */

      /* --- Fobizz Spacing --- */
      --ob-space-4: 1rem; /* Map Fobizz spacing scale */
      /* ... override other spacing units ... */

      /* --- Fobizz Borders --- */
      --ob-border-radius-md: 0.25rem; /* Map Fobizz border radius */
      --ob-border-color: #YOUR_FOBIZZ_BORDER_COLOR;
      /* ... override other border properties ... */

      /* --- Fobizz Shadows --- */
      --ob-shadow-md: 0 4px 8px rgba(0,0,0, YOUR_FOBIZZ_SHADOW_ALPHA);
      /* ... override other shadows ... */

      /* --- Component Specifics (Optional Fine-tuning) --- */
      --ob-badge-background: var(--ob-bg-secondary);
      --ob-badge-border-radius: var(--ob-border-radius-lg);
      /* ... potentially override component specifics ... */
    }
    ```

4.  **Apply Theme:** Import `fobizz-theme.css` into the Fobizz application *after* the base `openbadges-ui` styles. Apply the theme class (e.g., `.fobizz-theme`) to a parent element containing the `openbadges-ui` components.

    ```html
    <!-- Example in Fobizz Vue App -->
    <div id="app" class="fobizz-theme">
      <!-- ... Fobizz application structure ... -->
      <BadgeDisplay :badge="someBadge" />
      <BadgeList :badges="badgeList" />
      <!-- ... other openbadges-ui components ... -->
    </div>
    ```

**Advantages:**

*   Leverages the library's built-in theming mechanism.
*   Low complexity for the library maintainers.
*   Provides clear separation between base styles and application-specific themes.
*   Consumers only need to override the variables relevant to their design system.

## 4. Future Considerations

*   **Configuration File:** For a more structured approach (similar to Tailwind), a future enhancement could involve a JavaScript/TypeScript configuration file. This file would define theme values, and a build step or utility function could generate the necessary CSS variable overrides. This adds complexity but might be preferable for applications with sophisticated design token systems.
*   **Refining Variables:** As the library evolves, we may need to add or adjust CSS variables to provide finer-grained control over component styling.
*   **Utility Classes:** While not the primary approach, selectively adding optional utility classes for common layout/spacing tasks could be considered if CSS variables prove insufficient for certain use cases, but this should be done cautiously to avoid bloating the library.

## 5. Next Steps

*   Refine the Fobizz design token mapping in the example above by extracting computed styles from key elements on `app.fobizz.com`.
*   Share this document with Fobizz developers for feedback.
*   Create a clear documentation page explaining how consumers can theme the library using CSS variable overrides.
