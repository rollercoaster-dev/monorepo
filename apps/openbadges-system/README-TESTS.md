# Test Suite Documentation

This document describes the comprehensive test suite for the OpenBadges authentication system.

## Test Coverage

### 1. Unit Tests

#### `src/client/composables/__tests__/useAuth.test.ts`
Tests for the main authentication composable:
- **Initial state**: Validates correct initial state
- **User storage**: Tests localStorage persistence and retrieval
- **Authentication state persistence**: Tests restoration from localStorage
- **WebAuthn Registration**: Tests user registration flow
- **WebAuthn Authentication**: Tests user login flow
- **Logout**: Tests logout functionality
- **OpenBadges Integration**: Tests badge management operations
- **Credential Management**: Tests adding/removing WebAuthn credentials
- **Error Handling**: Tests error scenarios
- **Profile Management**: Tests user profile updates

#### `src/client/services/__tests__/openbadges.test.ts`
Tests for the OpenBadges service:
- **Platform token generation**: Tests JWT token creation
- **API client creation**: Tests client configuration
- **User backpack operations**: Tests badge retrieval and management
- **Badge class operations**: Tests badge class creation and retrieval
- **Badge issuance**: Tests badge issuing functionality
- **Error handling**: Tests API error scenarios

#### `src/server/services/__tests__/jwt.test.ts`
Tests for the JWT service:
- **Token generation**: Tests JWT creation for platform authentication
- **Token verification**: Tests JWT validation
- **API client creation**: Tests OpenBadges API client setup
- **Error handling**: Tests JWT operation failures

#### `src/server/__tests__/endpoints.test.ts`
Tests for server endpoints:
- **Health endpoint**: Tests basic server health check
- **Platform token endpoint**: Tests JWT token generation API
- **OpenBadges proxy**: Tests badge API proxying with authentication
- **Legacy proxy**: Tests backward compatibility
- **CORS handling**: Tests cross-origin request handling
- **Error scenarios**: Tests various error conditions

### 2. Integration Tests

#### `src/test/integration/auth-flow.test.ts`
End-to-end tests for authentication flows:
- **Complete registration and authentication flow**: Tests full user journey
- **Data persistence**: Tests state persistence across page reloads
- **OpenBadges integration**: Tests badge operations with authentication
- **Error handling**: Tests graceful error handling
- **Multiple user scenarios**: Tests multiple user management
- **Admin user scenarios**: Tests admin-specific functionality

## Test Setup

### Dependencies
- **Vitest**: Test framework
- **@vue/test-utils**: Vue component testing utilities
- **jsdom**: DOM environment for testing
- **happy-dom**: Alternative DOM environment

### Configuration
- **vitest.config.ts**: Test configuration
- **src/test/setup.ts**: Test setup and mocks

### Mocks
- **localStorage**: Mocked for state persistence tests
- **WebAuthn API**: Mocked for authentication tests
- **fetch**: Mocked for API communication tests
- **vue-router**: Mocked for navigation tests

## Running Tests

```bash
# Run all tests
bun run test

# Run tests with UI
bun run test:ui

# Run tests once
bun run test:run

# Run tests with coverage
bun run test:coverage
```

## Test Structure

### Arrange-Act-Assert Pattern
All tests follow the AAA pattern:
1. **Arrange**: Set up test data and mocks
2. **Act**: Execute the code under test
3. **Assert**: Verify expected outcomes

### Mock Strategy
- **Unit tests**: Mock all external dependencies
- **Integration tests**: Mock only external services (OpenBadges server)
- **End-to-end tests**: Minimal mocking for realistic scenarios

## Key Test Scenarios

### Authentication Flow
1. User registration with WebAuthn
2. User login with WebAuthn
3. State persistence across page reloads
4. Logout functionality
5. Error handling for invalid credentials

### OpenBadges Integration
1. Platform token generation
2. Badge backpack management
3. Badge class operations
4. Badge issuance
5. API error handling

### Security Testing
1. Authentication token validation
2. Authorization checks
3. CORS policy enforcement
4. Input validation
5. Error message sanitization

## Test Quality Metrics

- **Coverage**: Comprehensive coverage of all major functions
- **Reliability**: Tests are deterministic and repeatable
- **Maintainability**: Clear test structure and descriptive names
- **Performance**: Fast execution with appropriate mocking
- **Isolation**: Each test is independent and can run in any order

## Future Improvements

1. **Visual regression testing**: Add screenshot comparisons
2. **Performance testing**: Add load testing for authentication
3. **Accessibility testing**: Add a11y validation
4. **End-to-end testing**: Add full browser automation tests
5. **Security testing**: Add penetration testing scenarios