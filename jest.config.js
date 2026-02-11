module.exports = {
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  testEnvironment: 'react-native/jest/react-native-env.js',
  resolver: './jest.resolver.js',
  haste: {
    defaultPlatform: 'ios',
    platforms: ['android', 'ios', 'native'],
  },
  moduleNameMapper: {
    '^@evolu/common$': '<rootDir>/src/db/__tests__/mocks/evolu-common.ts',
    '^@evolu/react$': '<rootDir>/src/__tests__/mocks/evolu-react.ts',
    '^@evolu/react-native/expo-sqlite$': '<rootDir>/src/__tests__/mocks/evolu-react-native.ts',
    '../shims/rd-logger': '<rootDir>/src/db/__tests__/mocks/rd-logger.ts',
    '^react-native-reanimated$': '<rootDir>/src/__tests__/mocks/reanimated.ts',
    '^react-native-unistyles$': '<rootDir>/src/__tests__/mocks/unistyles.ts',
    '^react-native-safe-area-context$': '<rootDir>/src/__tests__/mocks/safe-area-context.ts',
    '^expo-audio$': '<rootDir>/src/__tests__/mocks/expo-audio.ts',
    '^@react-navigation/native$': '<rootDir>/src/__tests__/mocks/navigation.ts',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@rollercoaster-dev/design-tokens|@testing-library/react-native|react-native|@react-native)/)',
  ],
  setupFiles: ['./node_modules/react-native/jest/setup.js', './src/db/__tests__/setup.ts'],
  testMatch: ['**/src/**/__tests__/**/*.test.{ts,tsx}'],
};
