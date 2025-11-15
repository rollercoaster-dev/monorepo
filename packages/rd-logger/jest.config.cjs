/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          // Disable isolatedModules for test compilation
          // ts-jest with module: "NodeNext" requires this to avoid TS151002 warnings
          // Production code still uses isolatedModules: true (inherited from shared-config)
          isolatedModules: false,
        },
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
