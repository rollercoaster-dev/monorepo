<script setup lang="ts">
import { ref } from "vue";
import FontSelector from "./FontSelector.vue";
import ThemeSelector from "./ThemeSelector.vue";
import AccessibilitySettings from "./AccessibilitySettings.vue";

/**
 * # Accessibility Guide
 *
 * This guide provides an overview of the accessibility features available in the OpenBadges UI library.
 * It includes information about accessible fonts, themes, and components designed to improve the user experience
 * for people with different abilities and preferences.
 *
 * ## Features
 *
 * - Accessible fonts for different user needs
 * - Accessibility-focused themes
 * - Motion reduction options
 * - Focus mode for reduced distractions
 * - Text spacing and size adjustments
 * - High contrast support
 * - Keyboard navigation
 * - Screen reader compatibility
 */

const selectedFont = ref("system");
const selectedTheme = ref("default");
const isOpen = ref(true);
</script>

<template>
  <Story
    title="Guides/Accessibility"
    :layout="{ type: 'single', iframe: true, iframeHeight: 800 }"
  >
    <Variant title="Introduction">
      <div class="guide-container">
        <h1>Accessibility Features Guide</h1>

        <p>
          The OpenBadges UI library includes a comprehensive set of
          accessibility features designed to make the components usable by as
          many people as possible, regardless of ability or circumstance.
        </p>

        <h2>Key Accessibility Features</h2>

        <ul>
          <li>
            <strong>Accessible Fonts</strong>: Multiple font options including
            dyslexia-friendly and low vision fonts
          </li>
          <li>
            <strong>Theme Options</strong>: Themes designed for various
            accessibility needs including dyslexia, low vision, and autism
          </li>
          <li>
            <strong>Motion Controls</strong>: Options to reduce or eliminate
            animations and transitions
          </li>
          <li>
            <strong>Focus Mode</strong>: Reduces visual distractions to help
            maintain focus
          </li>
          <li>
            <strong>Text Spacing</strong>: Adjustable letter spacing, word
            spacing, and line height
          </li>
          <li>
            <strong>Font Size Controls</strong>: Easy adjustment of text size
          </li>
          <li>
            <strong>High Contrast Support</strong>: Compatible with high
            contrast mode
          </li>
          <li>
            <strong>Keyboard Navigation</strong>: Full keyboard accessibility
          </li>
          <li>
            <strong>Screen Reader Support</strong>: Proper ARIA attributes and
            semantic HTML
          </li>
        </ul>

        <p>
          This guide demonstrates how to use these features in your application.
        </p>
      </div>
    </Variant>

    <Variant title="Accessible Fonts">
      <div class="guide-container">
        <h1>Accessible Fonts</h1>

        <p>
          The OpenBadges UI library includes several accessible font options
          designed to improve readability for users with different needs:
        </p>

        <ul>
          <li>
            <strong>Atkinson Hyperlegible</strong>: Designed specifically for
            low vision readers by the Braille Institute. It features distinct
            letterforms that are easy to differentiate.
          </li>
          <li>
            <strong>OpenDyslexic</strong>: A typeface specifically designed for
            readers with dyslexia. It features weighted bottoms to the letters,
            which helps prevent them from flipping and swapping in the reader's
            mind.
          </li>
          <li>
            <strong>Lexend</strong>: Designed to reduce visual stress and
            improve reading fluency. It features carefully adjusted letter
            spacing and shapes.
          </li>
          <li>
            <strong>Inter</strong>: A modern, highly legible sans-serif font
            designed for computer screens. It features a tall x-height and open
            forms, making it highly readable at small sizes.
          </li>
        </ul>

        <h2>Font Selector Component</h2>

        <p>
          The <code>FontSelector</code> component allows users to choose their
          preferred font, adjust font size, and enable enhanced text spacing:
        </p>

        <div class="component-demo">
          <FontSelector v-model="selectedFont" />
        </div>

        <h2>Using Font Utility Classes</h2>

        <p>You can also apply these fonts directly using utility classes:</p>

        <div class="font-examples">
          <div class="font-example ob-font-system">
            <h3>System Font</h3>
            <p>The quick brown fox jumps over the lazy dog. 1234567890</p>
          </div>

          <div class="font-example ob-font-accessible">
            <h3>Atkinson Hyperlegible</h3>
            <p>The quick brown fox jumps over the lazy dog. 1234567890</p>
          </div>

          <div class="font-example ob-font-dyslexic">
            <h3>OpenDyslexic</h3>
            <p>The quick brown fox jumps over the lazy dog. 1234567890</p>
          </div>

          <div class="font-example ob-font-readable">
            <h3>Lexend</h3>
            <p>The quick brown fox jumps over the lazy dog. 1234567890</p>
          </div>

          <div class="font-example ob-font-standard">
            <h3>Inter</h3>
            <p>The quick brown fox jumps over the lazy dog. 1234567890</p>
          </div>
        </div>
      </div>
    </Variant>

    <Variant title="Accessible Themes">
      <div class="guide-container">
        <h1>Accessible Themes</h1>

        <p>
          The OpenBadges UI library includes several themes designed to address
          specific accessibility needs:
        </p>

        <ul>
          <li>
            <strong>Default Theme</strong>: A balanced theme with good contrast
            and readability.
          </li>
          <li>
            <strong>Dyslexia-Friendly Theme</strong>: Optimized for readers with
            dyslexia, featuring the OpenDyslexic font, increased spacing, and a
            cream background to reduce visual stress.
          </li>
          <li>
            <strong>Low Vision Theme</strong>: Features the Atkinson
            Hyperlegible font, larger text sizes, and high contrast colors for
            better visibility.
          </li>
          <li>
            <strong>Low Information Density Theme</strong>: Reduces visual
            complexity for easier focus, helpful for users with cognitive
            disabilities or ADHD.
          </li>
          <li>
            <strong>Autism-Friendly Theme</strong>: Features predictable layouts
            with reduced sensory stimulation.
          </li>
          <li>
            <strong>Dark Theme</strong>: Reduces light emission for comfortable
            viewing in low light and for users with light sensitivity.
          </li>
          <li>
            <strong>High Contrast Theme</strong>: Maximizes contrast for better
            visibility, helpful for users with low vision.
          </li>
        </ul>

        <h2>Theme Selector Component</h2>

        <p>
          The <code>ThemeSelector</code> component allows users to choose their
          preferred theme:
        </p>

        <div class="component-demo">
          <ThemeSelector v-model="selectedTheme" />
        </div>
      </div>
    </Variant>

    <Variant title="Accessibility Settings">
      <div class="guide-container">
        <h1>Accessibility Settings Component</h1>

        <p>
          The <code>AccessibilitySettings</code> component combines font
          selection, theme selection, and additional accessibility options into
          a single, user-friendly interface:
        </p>

        <div
          class="component-demo"
          style="display: flex; justify-content: flex-end"
        >
          <AccessibilitySettings
            v-model:theme="selectedTheme"
            v-model:font="selectedFont"
            v-model:open="isOpen"
          />
        </div>

        <h2>Features</h2>

        <ul>
          <li>
            <strong>Theme Selection</strong>: Choose from various
            accessibility-focused themes
          </li>
          <li>
            <strong>Font Selection</strong>: Choose from accessible font options
          </li>
          <li>
            <strong>Font Size Adjustment</strong>: Increase text size for better
            readability
          </li>
          <li>
            <strong>Text Spacing</strong>: Enable enhanced spacing for easier
            reading
          </li>
          <li>
            <strong>Motion Reduction</strong>: Minimize animations and
            transitions
          </li>
          <li><strong>Focus Mode</strong>: Reduce visual distractions</li>
          <li><strong>Reset Option</strong>: Return to default settings</li>
        </ul>

        <h2>Recommended Implementation</h2>

        <p>For the best user experience, we recommend:</p>

        <ol>
          <li>
            Placing the <code>AccessibilitySettings</code> component in a
            consistent location across your application, such as in the header
            or footer.
          </li>
          <li>
            Persisting user preferences using localStorage or a similar
            mechanism.
          </li>
          <li>
            Applying the selected theme and font to the entire application.
          </li>
          <li>
            Ensuring that all custom components respect the theme variables.
          </li>
        </ol>
      </div>
    </Variant>

    <Variant title="Best Practices">
      <div class="guide-container">
        <h1>Accessibility Best Practices</h1>

        <p>
          When implementing the OpenBadges UI components in your application,
          follow these best practices to ensure maximum accessibility:
        </p>

        <h2>General Guidelines</h2>

        <ul>
          <li>
            <strong>Semantic HTML</strong>: Use appropriate HTML elements for
            their intended purpose.
          </li>
          <li>
            <strong>Keyboard Navigation</strong>: Ensure all interactive
            elements are keyboard accessible.
          </li>
          <li>
            <strong>Focus Management</strong>: Maintain a logical tab order and
            visible focus indicators.
          </li>
          <li>
            <strong>Screen Reader Support</strong>: Use appropriate ARIA
            attributes and ensure meaningful text alternatives.
          </li>
          <li>
            <strong>Color Contrast</strong>: Maintain sufficient contrast
            between text and background colors.
          </li>
          <li>
            <strong>Text Resizing</strong>: Ensure the interface remains usable
            when text is resized up to 200%.
          </li>
          <li>
            <strong>Responsive Design</strong>: Ensure the interface adapts to
            different screen sizes and orientations.
          </li>
        </ul>

        <h2>Font and Typography</h2>

        <ul>
          <li>
            Offer users a choice of fonts, including dyslexia-friendly options.
          </li>
          <li>Use a minimum font size of 16px (1rem) for body text.</li>
          <li>Maintain a line height of at least 1.5 for body text.</li>
          <li>
            Avoid justified text, which can create uneven spacing and "rivers"
            of white space.
          </li>
          <li>
            Limit line length to 80 characters or less for optimal readability.
          </li>
          <li>Use sufficient spacing between paragraphs.</li>
        </ul>

        <h2>Color and Contrast</h2>

        <ul>
          <li>
            Ensure text has a contrast ratio of at least 4.5:1 against its
            background (WCAG AA).
          </li>
          <li>Don't rely on color alone to convey information.</li>
          <li>Provide high contrast themes for users with low vision.</li>
          <li>
            Consider offering a dark theme for users with light sensitivity.
          </li>
          <li>Test your interface in high contrast mode.</li>
        </ul>

        <h2>Motion and Animation</h2>

        <ul>
          <li>
            Respect the user's motion preferences (<code
              >prefers-reduced-motion</code
            >
            media query).
          </li>
          <li>Provide options to reduce or disable animations.</li>
          <li>Avoid content that flashes more than three times per second.</li>
          <li>Ensure animations are subtle and purposeful.</li>
        </ul>

        <h2>Forms and Interactive Elements</h2>

        <ul>
          <li>Use clear, descriptive labels for form fields.</li>
          <li>
            Provide helpful error messages that suggest how to fix the problem.
          </li>
          <li>
            Ensure form fields have sufficient size for touch interaction
            (minimum 44x44 pixels).
          </li>
          <li>Group related form fields using fieldset and legend.</li>
          <li>Provide clear focus states for all interactive elements.</li>
        </ul>

        <h2>Resources</h2>

        <ul>
          <li>
            <a
              href="https://www.w3.org/WAI/standards-guidelines/wcag/"
              target="_blank"
              >Web Content Accessibility Guidelines (WCAG)</a
            >
          </li>
          <li>
            <a href="https://www.w3.org/WAI/ARIA/apg/" target="_blank"
              >ARIA Authoring Practices Guide</a
            >
          </li>
          <li>
            <a href="https://webaim.org/" target="_blank">WebAIM</a>
          </li>
          <li>
            <a href="https://www.a11yproject.com/" target="_blank"
              >The A11Y Project</a
            >
          </li>
          <li>
            <a
              href="https://www.bdadyslexia.org.uk/advice/employers/creating-a-dyslexia-friendly-workplace/dyslexia-friendly-style-guide"
              target="_blank"
              >British Dyslexia Association Style Guide</a
            >
          </li>
        </ul>
      </div>
    </Variant>
  </Story>
</template>

<style scoped>
.guide-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    "Helvetica Neue",
    Arial,
    sans-serif;
}

h1 {
  font-size: 2rem;
  margin-bottom: 1.5rem;
}

h2 {
  font-size: 1.5rem;
  margin: 2rem 0 1rem;
}

p {
  line-height: 1.6;
  margin-bottom: 1rem;
}

ul,
ol {
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

li {
  margin-bottom: 0.5rem;
}

a {
  color: #3182ce;
  text-decoration: underline;
}

a:hover {
  color: #2c5282;
}

.component-demo {
  margin: 2rem 0;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
}

.font-examples {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin: 2rem 0;
}

.font-example {
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.font-example h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
}

.font-example p {
  margin: 0;
}

code {
  font-family: monospace;
  background-color: #f8f9fa;
  padding: 0.2em 0.4em;
  border-radius: 3px;
}

pre {
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
}

pre code {
  background-color: transparent;
  padding: 0;
}
</style>
