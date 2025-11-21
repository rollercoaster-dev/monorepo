# OAuth Integration Implementation Plan

## Project Overview

This document tracks the implementation of OAuth authentication integration for the OpenBadges system, including GitHub OAuth support and connection to the badge server.

## Current State Analysis

### ✅ Current App (openbadges-system) - ANALYZED

- **Authentication**: WebAuthn-only passwordless authentication
- **Frontend**: Vue 3 with TypeScript, using composables pattern
- **Backend**: Hono server with SQLite database
- **Database**: Users table with WebAuthn credentials (data/users.sqlite)
- **Key Files**:
  - `src/client/composables/useAuth.ts` - Main auth composable
  - `src/client/utils/webauthn.ts` - WebAuthn utilities
  - `src/server/routes/auth.ts` - Auth routes (JWT token generation)
  - `src/server/services/user.ts` - User service with SQLite
  - `src/client/components/Auth/LoginForm.vue` - Login UI

### ✅ Badge Server (openbadges-modular-server) - ANALYZED

- **Authentication**: Multi-provider system with adapters
- **Existing OAuth**: Has OAuth2 adapter with JWKS/introspection support
- **Traditional Auth**: Username/password, API keys, Basic auth
- **RBAC**: Role-based access control with permissions
- **JWT**: Comprehensive JWT token system
- **Key Files**:
  - `src/auth/adapters/oauth2.adapter.ts` - OAuth2 implementation
  - `src/auth/auth.controller.ts` - Auth controller
  - `src/config/config.ts` - Configuration including OAuth settings
  - `docs/authentication.md` - Authentication documentation

## Implementation Plan

### Phase 1: Backend OAuth Infrastructure ✅ COMPLETED

- [x] **1.1 Install OAuth Dependencies**
  - [x] Add `@hono/oauth-providers` for OAuth client support
  - [x] Add `nanoid` for secure ID generation
  - [x] Add GitHub OAuth provider support
  - [x] Add session management dependencies

- [x] **1.2 Database Schema Updates**
  - [x] Create migration script for OAuth tables
  - [x] Add `oauth_providers` table for OAuth account linking
  - [x] Add `oauth_sessions` table for OAuth flow state
  - [x] Update `users` table to support OAuth users
  - [x] Add indexes for OAuth lookups

- [x] **1.3 OAuth Service Layer**
  - [x] Create `OAuthService` class for provider management
  - [x] Implement GitHub provider class
  - [x] Add token validation and refresh logic
  - [x] Create user account linking/creation logic
  - [x] Add OAuth configuration management

- [x] **1.4 OAuth Routes**
  - [x] Create `/api/oauth/github` - GitHub OAuth initiation
  - [x] Create `/api/oauth/github/callback` - GitHub OAuth callback handler
  - [x] Create `/api/oauth/providers` - List available OAuth providers
  - [x] Create OAuth provider unlinking endpoint
  - [x] Add OAuth session cleanup endpoint

### Phase 2: Frontend OAuth Integration ✅ COMPLETED

- [x] **2.1 OAuth UI Components**
  - [x] Create `OAuthProviderButton.vue` component
  - [x] Update `LoginForm.vue` to include OAuth options
  - [x] Add provider selection UI
  - [x] Add account linking interface
  - [x] Style OAuth buttons with provider branding

- [x] **2.2 OAuth Composables**
  - [x] Extend `useAuth` composable with OAuth methods
  - [x] Create `useOAuth` composable for provider-specific logic
  - [x] Handle OAuth callback processing
  - [x] Manage OAuth token storage
  - [x] Add OAuth error handling

- [x] **2.3 Route Updates**
  - [x] Add OAuth callback route handler
  - [x] Update login flow to support multiple auth methods
  - [x] Add provider selection page if needed
  - [x] Update navigation to show OAuth options

### Phase 3: Badge Server Connection ✅ COMPLETED

- [x] **3.1 API Client Updates**
  - [x] Update OpenBadges API client to use OAuth tokens
  - [x] Implement token refresh logic
  - [x] Add badge server authentication headers
  - [x] Handle badge server API errors

- [x] **3.2 User Synchronization**
  - [x] Sync user data between systems
  - [x] Handle badge server user creation
  - [x] Manage permission mapping
  - [x] Add user profile synchronization

- [ ] **3.3 JWT Token Integration**
  - [ ] Use badge server JWT tokens for API calls
  - [ ] Implement token validation
  - [ ] Add token refresh mechanisms
  - [ ] Handle token expiration

### Phase 4: GitHub OAuth Implementation

- [ ] **4.1 GitHub App Setup**
  - [ ] Create GitHub OAuth app
  - [ ] Configure callback URLs
  - [ ] Set required scopes (user:email, read:user)
  - [ ] Document GitHub app configuration

- [ ] **4.2 GitHub Provider**
  - [ ] Implement GitHub OAuth flow
  - [ ] Handle GitHub API integration
  - [ ] Extract user profile data
  - [ ] Map GitHub permissions to app roles

- [ ] **4.3 User Experience**
  - [ ] Add "Sign in with GitHub" button
  - [ ] GitHub profile integration
  - [ ] Account linking for existing users
  - [ ] Handle GitHub logout

### Phase 5: Testing & Security

- [ ] **5.1 Unit Tests**
  - [ ] Test OAuth service layer
  - [ ] Test GitHub provider implementation
  - [ ] Test token validation logic
  - [ ] Test user linking functionality

- [ ] **5.2 Integration Tests**
  - [ ] Test OAuth flows end-to-end
  - [ ] Test badge server integration
  - [ ] Test token refresh mechanisms
  - [ ] Test error handling

- [ ] **5.3 Security Review**
  - [ ] PKCE (Proof Key for Code Exchange) implementation
  - [ ] CSRF protection for OAuth callbacks
  - [ ] Rate limiting for OAuth endpoints
  - [ ] Secure token storage review

## Technical Specifications

### Database Schema Changes

```sql
-- OAuth providers table
CREATE TABLE oauth_providers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TEXT,
  profile_data TEXT, -- JSON storage for provider profile
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- OAuth sessions table for flow state
CREATE TABLE oauth_sessions (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  code_verifier TEXT,
  redirect_uri TEXT,
  provider TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_oauth_providers_user_id ON oauth_providers(user_id);
CREATE INDEX idx_oauth_providers_provider ON oauth_providers(provider);
CREATE INDEX idx_oauth_sessions_state ON oauth_sessions(state);
```

### Environment Variables

```bash
# OAuth Configuration
OAUTH_GITHUB_CLIENT_ID=your_github_client_id
OAUTH_GITHUB_CLIENT_SECRET=your_github_client_secret
OAUTH_GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# Badge Server Integration
BADGE_SERVER_URL=http://localhost:3000
BADGE_SERVER_API_KEY=your_badge_server_api_key
BADGE_SERVER_JWT_SECRET=shared_jwt_secret

# Security
OAUTH_SESSION_SECRET=secure_session_secret
OAUTH_CSRF_SECRET=csrf_protection_secret
```

### Configuration Updates

```typescript
// Add to existing config
export const config = {
  oauth: {
    enabled: process.env.OAUTH_ENABLED !== 'false',
    providers: {
      github: {
        enabled: process.env.OAUTH_GITHUB_ENABLED !== 'false',
        clientId: process.env.OAUTH_GITHUB_CLIENT_ID,
        clientSecret: process.env.OAUTH_GITHUB_CLIENT_SECRET,
        callbackUrl:
          process.env.OAUTH_GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback',
        scope: ['user:email', 'read:user'],
      },
    },
    session: {
      secret: process.env.OAUTH_SESSION_SECRET || 'change-in-production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  },
  badgeServer: {
    url: process.env.BADGE_SERVER_URL || 'http://localhost:3000',
    apiKey: process.env.BADGE_SERVER_API_KEY,
    jwtSecret: process.env.BADGE_SERVER_JWT_SECRET,
  },
}
```

## Security Considerations

### OAuth Security Best Practices

- [ ] **PKCE Implementation**: Use PKCE for OAuth flows to prevent code interception
- [ ] **State Parameter**: Use cryptographically secure state parameter for CSRF protection
- [ ] **Token Storage**: Store tokens securely with encryption at rest
- [ ] **Token Expiration**: Implement proper token refresh and expiration handling
- [ ] **Scope Limitation**: Request minimal OAuth scopes necessary
- [ ] **Rate Limiting**: Implement rate limiting on OAuth endpoints
- [ ] **Input Validation**: Validate all OAuth callback parameters
- [ ] **HTTPS Only**: Ensure all OAuth flows use HTTPS in production

### Data Protection

- [ ] **Sensitive Data**: Never log or expose OAuth tokens
- [ ] **User Data**: Minimize stored user data from OAuth providers
- [ ] **Access Control**: Implement proper authorization checks
- [ ] **Audit Logging**: Log OAuth authentication events for security monitoring

## Testing Strategy

### Unit Tests

- [ ] OAuth service methods
- [ ] GitHub provider implementation
- [ ] Token validation logic
- [ ] User account linking
- [ ] Error handling scenarios

### Integration Tests

- [ ] Complete OAuth flow with mocked providers
- [ ] Badge server API integration
- [ ] Token refresh mechanisms
- [ ] Database operations

### E2E Tests

- [ ] User registration via GitHub OAuth
- [ ] Login via GitHub OAuth
- [ ] Account linking flow
- [ ] Logout and cleanup
- [ ] Error scenarios (network failures, invalid tokens)

### Manual Testing Checklist

- [ ] GitHub OAuth app configuration
- [ ] OAuth flow in development environment
- [ ] Token refresh behavior
- [ ] Badge server integration
- [ ] Error handling and user feedback
- [ ] Security headers and CSRF protection

## Badge Server Integration Details

### API Authentication

```typescript
// Example API client with OAuth token
const apiClient = {
  async request(endpoint: string, options = {}) {
    const token = await getOAuthToken()
    return fetch(`${BADGE_SERVER_URL}/api${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
  },
}
```

### User Synchronization

- [ ] Create user in badge server on first OAuth login
- [ ] Sync user profile data periodically
- [ ] Handle user role mapping between systems
- [ ] Manage badge server permissions

## GitHub OAuth Setup Instructions

### GitHub App Configuration

1. [ ] Go to GitHub Developer Settings
2. [ ] Create new OAuth App
3. [ ] Set Authorization callback URL: `http://localhost:3000/auth/github/callback`
4. [ ] Note Client ID and Client Secret
5. [ ] Configure webhook URL if needed

### Required Scopes

- `user:email` - Access user's email address
- `read:user` - Access user's profile information

## Progress Tracking

### Completed Tasks

**Phase 1 - Backend OAuth Infrastructure (2025-07-16)**

- ✅ Database issues resolved - switched to Bun's native SQLite
- ✅ OAuth dependencies installed (@hono/oauth-providers, nanoid)
- ✅ OAuth database schema created (oauth_providers, oauth_sessions tables)
- ✅ OAuth service layer implemented with GitHub provider support
- ✅ OAuth routes created (/api/oauth/github, /api/oauth/github/callback, etc.)
- ✅ OAuth configuration system implemented
- ✅ PKCE security implemented for OAuth flows
- ✅ User account linking and creation from OAuth profiles

### Current Status

- **Phase**: Phase 3 Complete - Ready for Phase 4
- **Next Steps**: Set up GitHub OAuth app credentials and test the integration
- **Blockers**: Need GitHub OAuth app credentials (OAUTH_GITHUB_CLIENT_ID, OAUTH_GITHUB_CLIENT_SECRET)

### Notes and Decisions

- **2025-07-16**: Database issues resolved - switched from `better-sqlite3` to Bun's native SQLite due to ABI version incompatibility
- **2025-07-16**: Database connection confirmed working, 1 existing user found in system
- **2025-07-16**: Phase 1 (Backend OAuth Infrastructure) completed successfully
- **2025-07-16**: OAuth service layer implemented with PKCE security and GitHub provider support
- **2025-07-16**: All OAuth routes created and mounted on `/api/oauth/*`
- **2025-07-16**: Phase 2 (Frontend OAuth Integration) completed successfully
- **2025-07-16**: OAuth UI components created: `OAuthProviderButton.vue`, updated `LoginForm.vue`
- **2025-07-16**: OAuth composables implemented: `useOAuth.ts`, extended `useAuth.ts`
- **2025-07-16**: OAuth callback route created: `/auth/oauth/callback`
- **2025-07-16**: Environment configuration updated with OAuth variables
- **2025-07-17**: Phase 3 (Badge Server Connection) completed successfully
- **2025-07-17**: OAuth token management implemented for badge server API calls
- **2025-07-17**: User synchronization service created for badge server integration
- **2025-07-17**: Enhanced error handling for badge server API responses
- **2025-07-17**: Automatic user sync on OAuth authentication

---

## Quick Reference

### Key Files to Modify

- `src/server/routes/auth.ts` - Add OAuth routes
- `src/client/composables/useAuth.ts` - Add OAuth methods
- `src/client/components/Auth/LoginForm.vue` - Add OAuth UI
- `src/server/services/user.ts` - Add OAuth user handling

### Key Dependencies to Add

- `@hono/oauth-providers` - OAuth client support
- `jose` - JWT handling (if not already present)
- `nanoid` - Secure ID generation

### Environment Setup

1. Install dependencies
2. Set up GitHub OAuth app
3. Configure environment variables
4. Run database migrations
5. Test OAuth flow

---

_Last updated: [Date] | Status: In Progress_
