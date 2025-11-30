# Backend Architecture

The openbadges-system backend is built with Hono framework running on Bun runtime, providing a fast, type-safe API layer for badge management.

## Technology Stack

| Technology      | Version | Purpose                     |
| --------------- | ------- | --------------------------- |
| Hono            | ^4.6    | Lightweight web framework   |
| Bun             | ^1.3    | JavaScript runtime          |
| Kysely          | ^0.27   | Type-safe SQL query builder |
| jose            | ^5.9    | JWT operations (RS256)      |
| @simplewebauthn | ^13.0   | WebAuthn authentication     |

## Directory Structure

```
src/server/
├── routes/              # API route handlers
│   ├── auth.ts         # Authentication endpoints
│   ├── public-auth.ts  # Public auth (registration)
│   ├── oauth.ts        # OAuth provider integration
│   ├── users.ts        # User management (admin)
│   └── badges.ts       # Badge operations
├── services/           # Business logic
│   ├── jwt.ts          # JWT token management
│   ├── oauth.ts        # OAuth service
│   ├── user.ts         # User service
│   └── userSync.ts     # Badge server sync
├── middleware/         # Request middleware
│   └── auth.ts         # Authentication middleware
├── utils/              # Utility functions
└── index.ts            # Server entry point
```

## API Structure

### Route Modules

Routes are organized by domain and mounted on the main Hono app:

```typescript
// src/server/index.ts
import { Hono } from 'hono'
import { authRoutes } from './routes/auth'
import { publicAuthRoutes } from './routes/public-auth'
import { oauthRoutes } from './routes/oauth'
import { userRoutes } from './routes/users'
import { badgeRoutes } from './routes/badges'

const app = new Hono()

// Mount routes
app.route('/api/auth', authRoutes)
app.route('/api/public', publicAuthRoutes)
app.route('/api/oauth', oauthRoutes)
app.route('/api/users', userRoutes)
app.route('/api/badges', badgeRoutes)
app.route('/api/bs', badgeServerProxy) // Badge server proxy
```

### Route Definitions

**Authentication Routes (`/api/auth`):**

| Method | Path                         | Description                  | Auth |
| ------ | ---------------------------- | ---------------------------- | ---- |
| POST   | `/login`                     | Login with WebAuthn          | No   |
| POST   | `/logout`                    | End session                  | Yes  |
| GET    | `/me`                        | Current user info            | Yes  |
| POST   | `/webauthn/register/options` | WebAuthn registration start  | Yes  |
| POST   | `/webauthn/register/verify`  | WebAuthn registration verify | Yes  |
| POST   | `/webauthn/login/options`    | WebAuthn login start         | No   |
| POST   | `/webauthn/login/verify`     | WebAuthn login verify        | No   |

**Public Auth Routes (`/api/public`):**

| Method | Path                 | Description          | Auth |
| ------ | -------------------- | -------------------- | ---- |
| POST   | `/register`          | User registration    | No   |
| GET    | `/user/:id`          | Public user info     | No   |
| GET    | `/user/email/:email` | User lookup by email | No   |

**OAuth Routes (`/api/oauth`):**

| Method | Path               | Description               | Auth |
| ------ | ------------------ | ------------------------- | ---- |
| GET    | `/providers`       | Available OAuth providers | No   |
| GET    | `/github`          | GitHub OAuth redirect     | No   |
| GET    | `/github/callback` | GitHub OAuth callback     | No   |
| POST   | `/link/:provider`  | Link OAuth to account     | Yes  |

**User Routes (`/api/users`):**

| Method | Path   | Description    | Auth       |
| ------ | ------ | -------------- | ---------- |
| GET    | `/`    | List all users | Admin      |
| GET    | `/:id` | Get user by ID | Self/Admin |
| PUT    | `/:id` | Update user    | Self/Admin |
| DELETE | `/:id` | Delete user    | Admin      |

**Badge Routes (`/api/badges`):**

| Method | Path          | Description  | Auth   |
| ------ | ------------- | ------------ | ------ |
| GET    | `/`           | List badges  | Yes    |
| POST   | `/`           | Create badge | Admin  |
| GET    | `/:id`        | Get badge    | Public |
| PUT    | `/:id`        | Update badge | Admin  |
| POST   | `/:id/issue`  | Issue badge  | Admin  |
| GET    | `/verify/:id` | Verify badge | Public |

## Middleware Stack

### Request Flow

```
Request
   │
   ▼
┌──────────────────┐
│  CORS Middleware │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Logger Middleware│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Auth Middleware │ (if protected route)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Route Handler    │
└────────┬─────────┘
         │
         ▼
Response
```

### Authentication Middleware

Three levels of authentication:

```typescript
// src/server/middleware/auth.ts

// Require any authenticated user
export const requireAuth = createMiddleware(async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const payload = await verifyJWT(token)
  c.set('user', payload)
  await next()
})

// Require admin role
export const requireAdmin = createMiddleware(async (c, next) => {
  const user = c.get('user')
  if (user.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403)
  }
  await next()
})

// Require self or admin (for user resources)
export const requireSelfOrAdminFromParam = (paramName = 'id') =>
  createMiddleware(async (c, next) => {
    const user = c.get('user')
    const resourceId = c.req.param(paramName)

    if (user.id !== resourceId && user.role !== 'admin') {
      return c.json({ error: 'Forbidden' }, 403)
    }
    await next()
  })
```

Usage in routes:

```typescript
// Protected route examples
app.get('/profile', requireAuth, getProfile)
app.get('/admin/users', requireAuth, requireAdmin, listUsers)
app.put('/users/:id', requireAuth, requireSelfOrAdminFromParam(), updateUser)
```

### CORS Middleware

```typescript
import { cors } from 'hono/cors'

app.use(
  '/*',
  cors({
    origin: ['http://localhost:7777'], // Vite dev server
    credentials: true,
  })
)
```

### Logger Middleware

```typescript
import { logger } from 'hono/logger'

app.use('/*', logger())
```

## Service Layer

### JWT Service

Handles token generation and verification using RS256:

```typescript
// src/server/services/jwt.ts
import { SignJWT, jwtVerify } from 'jose'

export async function generateJWT(user: User): Promise<string> {
  const privateKey = await importPKCS8(process.env.JWT_PRIVATE_KEY!, 'RS256')

  return new SignJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(privateKey)
}

export async function verifyJWT(token: string): Promise<JWTPayload> {
  const publicKey = await importSPKI(process.env.JWT_PUBLIC_KEY!, 'RS256')
  const { payload } = await jwtVerify(token, publicKey)
  return payload
}
```

### JWKS Endpoint

Public key discovery for external services:

```typescript
// /.well-known/jwks.json
app.get('/.well-known/jwks.json', async c => {
  const jwk = await exportJWK(publicKey)
  return c.json({
    keys: [{ ...jwk, kid: 'main', use: 'sig', alg: 'RS256' }],
  })
})
```

### OAuth Service

Manages OAuth provider integrations:

```typescript
// src/server/services/oauth.ts
export class OAuthService {
  async getAuthorizationUrl(provider: string): Promise<string> {
    switch (provider) {
      case 'github':
        return this.getGitHubAuthUrl()
      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  }

  async handleCallback(provider: string, code: string): Promise<User> {
    const tokens = await this.exchangeCode(provider, code)
    const profile = await this.fetchProfile(provider, tokens.access_token)
    return this.findOrCreateUser(provider, profile)
  }
}
```

### User Service

Business logic for user operations:

```typescript
// src/server/services/user.ts
export class UserService {
  constructor(private db: Database) {}

  async findById(id: string): Promise<User | null> {
    return this.db.selectFrom('users').where('id', '=', id).selectAll().executeTakeFirst()
  }

  async create(data: CreateUserData): Promise<User> {
    return this.db
      .insertInto('users')
      .values({
        id: generateId(),
        ...data,
        createdAt: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow()
  }
}
```

## Authentication Flow

### WebAuthn Registration

```
1. User initiates registration
   │
   ▼
2. Server generates registration options
   POST /api/auth/webauthn/register/options
   │
   ▼
3. Browser creates credential
   navigator.credentials.create()
   │
   ▼
4. Server verifies and stores credential
   POST /api/auth/webauthn/register/verify
   │
   ▼
5. User can now authenticate with passkey
```

### WebAuthn Login

```
1. User initiates login
   │
   ▼
2. Server generates authentication options
   POST /api/auth/webauthn/login/options
   │
   ▼
3. Browser authenticates with passkey
   navigator.credentials.get()
   │
   ▼
4. Server verifies and issues JWT
   POST /api/auth/webauthn/login/verify
   │
   ▼
5. Client stores JWT for API requests
```

### OAuth Flow (GitHub)

```
1. User clicks "Login with GitHub"
   │
   ▼
2. Redirect to GitHub authorization
   GET /api/oauth/github
   │
   ▼
3. User authorizes application
   │
   ▼
4. GitHub redirects with code
   GET /api/oauth/github/callback?code=xxx
   │
   ▼
5. Server exchanges code for tokens
   │
   ▼
6. Server fetches user profile
   │
   ▼
7. Create/link user, issue JWT
   │
   ▼
8. Redirect to frontend with JWT
```

## OpenBadges Integration

### Badge Server Proxy

The backend proxies requests to the external OpenBadges server:

```typescript
// Badge server proxy configuration
const BADGE_SERVER_URL = process.env.OPENBADGES_SERVER_URL
const AUTH_MODE = process.env.OPENBADGES_AUTH_MODE // 'docker' | 'oauth' | 'local'

app.all('/api/bs/*', async c => {
  const path = c.req.path.replace('/api/bs', '')
  const headers = await getBadgeServerHeaders(AUTH_MODE)

  const response = await fetch(`${BADGE_SERVER_URL}${path}`, {
    method: c.req.method,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: c.req.method !== 'GET' ? await c.req.text() : undefined,
  })

  return c.json(await response.json(), response.status)
})
```

### Auth Modes

| Mode     | Description                         | Use Case             |
| -------- | ----------------------------------- | -------------------- |
| `docker` | Basic Auth with service credentials | Docker Compose setup |
| `oauth`  | JWT with service-to-service auth    | Production OAuth     |
| `local`  | API key authentication              | Local development    |

### OB2 Validation Middleware

Validates badge data against Open Badges 2.0 specification:

```typescript
// Validates badge creation/update requests
export const validateOB2Badge = createMiddleware(async (c, next) => {
  const body = await c.req.json()

  if (!isValidBadgeClass(body)) {
    return c.json(
      {
        error: 'Invalid badge data',
        details: getValidationErrors(body),
      },
      422
    )
  }

  await next()
})
```

## Error Handling

### Structured Error Responses

```typescript
// Standard error response format
interface ErrorResponse {
  error: string
  message?: string
  details?: unknown
}

// Example error handler
app.onError((err, c) => {
  console.error(err)

  if (err instanceof ValidationError) {
    return c.json(
      {
        error: 'Validation Error',
        details: err.errors,
      },
      422
    )
  }

  if (err instanceof AuthError) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  return c.json({ error: 'Internal Server Error' }, 500)
})
```

### Not Found Handler

```typescript
app.notFound(c => {
  return c.json({ error: 'Not Found' }, 404)
})
```

## Development Server

### Hot Reload

Bun provides native hot reload during development:

```bash
# Start server with hot reload
bun run server

# Or with watch mode
bun --watch src/server/index.ts
```

### Environment Variables

```bash
# Server
PORT=8888
NODE_ENV=development

# Database
DB_TYPE=sqlite
SQLITE_FILE=./data/openbadges.db

# JWT (RS256 keys)
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----..."

# OAuth
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

# Badge Server
OPENBADGES_SERVER_URL=http://localhost:3000
OPENBADGES_AUTH_MODE=docker
```

## Best Practices

### 1. Use Type-Safe Context

```typescript
// Define context variables
type Variables = {
  user: JWTPayload
}

const app = new Hono<{ Variables: Variables }>()

// Type-safe access
app.get('/profile', requireAuth, c => {
  const user = c.get('user') // Typed as JWTPayload
  return c.json(user)
})
```

### 2. Validate Request Bodies

```typescript
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
})

app.post('/users', zValidator('json', createUserSchema), async c => {
  const data = c.req.valid('json') // Typed and validated
  // ...
})
```

### 3. Group Related Routes

```typescript
// routes/users.ts
const users = new Hono()

users.get('/', listUsers)
users.get('/:id', getUser)
users.post('/', createUser)
users.put('/:id', updateUser)
users.delete('/:id', deleteUser)

export { users as userRoutes }
```

### 4. Use Services for Business Logic

Keep route handlers thin, delegate to services:

```typescript
// Good: Route handler delegates to service
app.post('/users', async c => {
  const data = await c.req.json()
  const user = await userService.create(data)
  return c.json(user, 201)
})

// Bad: Business logic in route handler
app.post('/users', async c => {
  const data = await c.req.json()
  // Don't put all the logic here...
})
```

## Related Documentation

- [Architecture Overview](./overview.md)
- [Frontend Architecture](./frontend-architecture.md)
- [Integration Architecture](./integration-architecture.md)
- [Database Architecture](./database-architecture.md)
