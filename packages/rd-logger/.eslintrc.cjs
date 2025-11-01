module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    node: true,
    jest: true,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'off', // We use 'any' in some places for flexibility
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }], // Allow namespace for declaration merging
    '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^_' }], // Allow variables starting with _ to be unused
  },
};
