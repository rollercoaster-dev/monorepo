/**
 * Application entry point
 * Order matters: crypto → polyfills → unistyles → app
 *
 * Using require() instead of import to guarantee execution order —
 * Babel's commonjs transform hoists import-converted-requires above
 * interleaved statements.
 */

// 1. Install crypto globals before anything else
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { install } = require('react-native-quick-crypto');
install();

// 2. Hermes polyfills (Set methods, AbortSignal, Promise.withResolvers)
require('./polyfills');

// 3. Unistyles theme configuration
require('./unistyles');

// 4. Register the app
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { registerRootComponent } = require('expo');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { App } = require('./App');

registerRootComponent(App);
