// This file is used to set up the Histoire environment
// Import the full style stack (fonts → tokens → themes → accessibility)
import "./src/styles/fonts.css";
import "./src/styles/tokens.css";
import "./src/styles/themes.css";
import "./src/styles/accessibility.css";

// Import design-tokens CSS (target design system for migration)
import "@rollercoaster-dev/design-tokens/css";
import "@rollercoaster-dev/design-tokens/css/themes";

// Force-load design fonts so they're available in story iframes.
// Without this, @font-face rules in the parent document don't trigger
// font downloads for usage inside same-origin iframes.
if (typeof document !== "undefined" && document.fonts) {
  const fontsToLoad = [
    "400 16px 'Instrument Sans'",
    "500 16px 'Instrument Sans'",
    "600 16px 'Instrument Sans'",
    "700 16px 'Instrument Sans'",
    "400 16px 'Anybody'",
    "700 16px 'Anybody'",
    "900 16px 'Anybody'",
    "400 16px 'DM Mono'",
    "500 16px 'DM Mono'",
    "400 16px 'Atkinson Hyperlegible'",
    "700 16px 'Atkinson Hyperlegible'",
    "400 16px 'Lexend'",
    "500 16px 'Lexend'",
    "600 16px 'Lexend'",
    "700 16px 'Lexend'",
    "400 16px 'OpenDyslexic'",
    "700 16px 'OpenDyslexic'",
  ];
  fontsToLoad.forEach((spec) => document.fonts.load(spec));
}

export function setupVue3(): object {
  // This function will be called by Histoire to set up the Vue 3 app
  return {
    // You can return an object to configure the Vue app
    // For example, you can register global components, directives, etc.
  };
}
