// This file is used to set up the Histoire environment
// Import the full style stack (fonts → tokens → themes → accessibility)
import "./src/styles/fonts.css";
import "./src/styles/tokens.css";
import "./src/styles/themes.css";
import "./src/styles/accessibility.css";

export function setupVue3(): object {
  // This function will be called by Histoire to set up the Vue 3 app
  return {
    // You can return an object to configure the Vue app
    // For example, you can register global components, directives, etc.
  };
}
