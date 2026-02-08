module.exports = {
  transform: {
    '^.+\\.tsx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@evolu/common$': '<rootDir>/src/db/__tests__/mocks/evolu-common.ts',
    '../shims/rd-logger': '<rootDir>/src/db/__tests__/mocks/rd-logger.ts',
  },
  setupFiles: ['./src/db/__tests__/setup.ts'],
  testMatch: ['**/src/db/__tests__/**/*.test.ts'],
};
