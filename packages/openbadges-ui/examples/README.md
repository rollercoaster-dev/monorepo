# OpenBadges UI Examples

This directory contains example applications demonstrating how to use the OpenBadges UI library.

## Examples

### Simple Badge Display

A basic example showing how to display individual badges and badge lists using the OpenBadges UI components.

**Features demonstrated:**
- Displaying individual badges (OB2 and OB3 formats)
- Displaying a list of badges in a grid layout
- Handling badge click events
- Customizing badge display options

**To run this example:**

1. Build the OpenBadges UI library:
   ```
   npm run build
   ```

2. Serve the example using a local server:
   ```
   npx vite serve examples/simple-badge-display
   ```

3. Open your browser and navigate to the URL shown in the terminal (typically http://localhost:5173).

### Profile Viewer

A more comprehensive example demonstrating the ProfileViewer component with theme selection and customization options.

**Features demonstrated:**
- Displaying a user profile with badges
- Switching between different themes for accessibility
- Customizing display options (layout, description, URL)
- Handling badge click events
- Displaying code examples based on current settings

**To run this example:**

1. Build the OpenBadges UI library:
   ```
   npm run build
   ```

2. Serve the example using a local server:
   ```
   npx vite serve examples/profile-viewer
   ```

3. Open your browser and navigate to the URL shown in the terminal (typically http://localhost:5173).

## Creating Your Own Examples

Feel free to create additional examples to demonstrate different aspects of the OpenBadges UI library. To create a new example:

1. Create a new directory under `examples/`
2. Add your HTML, JavaScript, and CSS files
3. Import the OpenBadges UI components from the built library:
   ```js
   import { OpenBadgesUIPlugin, BadgeDisplay, BadgeList } from '../../dist/openbadges-ui.es.js';
   import '../../dist/style.css';
   ```

4. Use the components in your application

## Notes

- Examples assume you have built the library first (`npm run build`)
- The examples use ES modules, so they need to be served from a web server that supports ES modules
- You can use any server to serve the examples, but `vite` is recommended for its simplicity and speed
