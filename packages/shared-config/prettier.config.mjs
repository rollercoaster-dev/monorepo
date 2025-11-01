/**
 * Shared Prettier configuration for Rollercoaster.dev monorepo
 *
 * @type {import('prettier').Config}
 */
export default {
  // Line width
  printWidth: 100,

  // Indentation
  tabWidth: 2,
  useTabs: false,

  // Semicolons
  semi: true,

  // Quotes
  singleQuote: true,
  quoteProps: 'as-needed',

  // Trailing commas
  trailingComma: 'es5',

  // Brackets
  bracketSpacing: true,
  bracketSameLine: false,

  // Arrow functions
  arrowParens: 'always',

  // Line endings
  endOfLine: 'lf',

  // Vue
  vueIndentScriptAndStyle: false,

  // Markdown
  proseWrap: 'preserve',
};
