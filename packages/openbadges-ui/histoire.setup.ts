// This file is used to set up the Histoire environment
// Import the full style stack (fonts → tokens → themes → accessibility)
import "./src/styles/fonts.css";
import "./src/styles/tokens.css";
import "./src/styles/themes.css";
import "./src/styles/accessibility.css";

// Import design-tokens CSS (target design system for migration)
import "@rollercoaster-dev/design-tokens/css";
import "@rollercoaster-dev/design-tokens/css/themes";

// Preload all @font-face variants so they're available in story iframes.
// Keep this list in sync with the @font-face declarations in fonts.css.
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
    "400 16px 'Inter'",
    "500 16px 'Inter'",
    "600 16px 'Inter'",
    "700 16px 'Inter'",
    "400 16px 'Atkinson Hyperlegible'",
    "700 16px 'Atkinson Hyperlegible'",
    "400 16px 'Lexend'",
    "500 16px 'Lexend'",
    "600 16px 'Lexend'",
    "700 16px 'Lexend'",
    "400 16px 'OpenDyslexic'",
    "700 16px 'OpenDyslexic'",
  ];
  Promise.allSettled(fontsToLoad.map((spec) => document.fonts.load(spec))).then(
    (results) => {
      const failures = results
        .map((r, i) => (r.status === "rejected" ? fontsToLoad[i] : null))
        .filter(Boolean);
      if (failures.length > 0) {
        console.warn(
          `[histoire.setup] Failed to load ${failures.length} font(s):`,
          failures,
        );
      }
    },
  );
}

export function setupVue3(): object {
  // This function will be called by Histoire to set up the Vue 3 app
  return {
    // You can return an object to configure the Vue app
    // For example, you can register global components, directives, etc.
  };
}
