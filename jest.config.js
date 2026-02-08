module.exports = {
  transform: {
    '^.+\\.tsx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@evolu/common$': '<rootDir>/src/db/__tests__/mocks/evolu-common.ts',
    '../shims/rd-logger': '<rootDir>/src/db/__tests__/mocks/rd-logger.ts',
    '^react-native-reanimated$': '<rootDir>/src/__tests__/mocks/reanimated.ts',
  },
  setupFiles: ['./src/db/__tests__/setup.ts'],
  testMatch: ['**/src/**/__tests__/**/*.test.ts'],
};
