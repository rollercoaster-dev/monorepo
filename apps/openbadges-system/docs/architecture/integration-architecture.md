# Integration Architecture

This document describes how the frontend, backend, and external services communicate in the openbadges-system.

## System Integration Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Browser                                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    Vue 3 Frontend (SPA)                           │  │
│  │                                                                   │  │
│  │  Composables ──▶ fetch('/api/...') ──▶ JWT in Authorization       │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 │ HTTP/HTTPS
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Hono Backend                                     │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────────┐   │
│  │   Routes    │──▶│ Middleware  │──▶│        Services             │   │
│  │             │   │ (Auth/CORS) │   │ (JWT, OAuth, User, Badge)   │   │
│  └─────────────┘   └─────────────┘   └──────────────┬──────────────┘   │
│                                                      │                   │
│  ┌───────────────────────────────────────────────────┼───────────────┐  │
│  │                    Database Layer (Kysely)        │               │  │
│  │                    SQLite / PostgreSQL            │               │  │
│  └───────────────────────────────────────────────────┼───────────────┘  │
└──────────────────────────────────────────────────────┼──────────────────┘
                                                       │
                                                       │ HTTP (Proxy)
                                                       ▼
                              ┌─────────────────────────────────────────┐
                              │      OpenBadges Modular Server          │
                              │      (Badge Storage & Verification)     │
                              └─────────────────────────────────────────┘
```

## Development vs Production

### Development Mode

In development, the frontend and backend run as separate processes:

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  Vite Dev       │ proxy   │  Hono Server    │         │  Badge Server   │
│  Port 7777      │────────▶│  Port 8888      │────────▶│  Port 3000      │
│                 │ /api/*  │                 │ /api/bs │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
         │
         │ HMR WebSocket
         ▼
      Browser
```

**Vite Proxy Configuration:**

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 7777,
    proxy: {
      '/api': {
        target: 'http://localhost:8888',
        changeOrigin: true
      },
      '/.well-known': {
        target: 'http://localhost:8888',
        changeOrigin: true
      }
    }
  }
})
```

### Production Mode

In production, the Hono server serves both static files and API:

```
┌─────────────────────────────────────┐         ┌─────────────────┐
│         Hono Server                 │         │  Badge Server   │
│  ┌───────────────────────────────┐  │         │                 │
│  │ Static Files (dist/client)    │  │────────▶│                 │
│  │ /assets/*, /index.html        │  │ /api/bs │                 │
│  ├───────────────────────────────┤  │         └─────────────────┘
│  │ API Routes                    │  │
│  │ /api/*                        │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Static File Serving:**

```typescript
// Production server setup
import { serveStatic } from 'hono/bun'

// Serve static files from built frontend
app.use('/*', serveStatic({ root: './dist/client' }))

// Fallback to index.html for SPA routing
app.get('*', serveStatic({ path: './dist/client/index.html' }))
```

## Frontend-Backend Communication

### API Request Pattern

All API requests follow a consistent pattern:

```typescript
// composables/useApi.ts
export function useApi() {
  const { token } = useAuth()

  async function request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = new Headers(options.headers)

    if (token.value) {
      headers.set('Authorization', `Bearer ${token.value}`)
    }

    headers.set('Content-Type', 'application/json')

    const response = await fetch(`/api${path}`, {
      ...options,
      headers
    })

    if (!response.ok) {
      const error = await response.json()
      throw new ApiError(error.message, response.status)
    }

    return response.json()
  }

  return {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, data: unknown) =>
      request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
    put: <T>(path: string, data: unknown) =>
      request<T>(path, { method: 'PUT', body: JSON.stringify(data) }),
    delete: <T>(path: string) =>
      request<T>(path, { method: 'DELETE' })
  }
}
```

### Using the API in Components

```vue
<script setup lang="ts">
const { get, post } = useApi()
const badges = ref<Badge[]>([])
const loading = ref(false)

async function fetchBadges() {
  loading.value = true
  try {
    badges.value = await get<Badge[]>('/badges')
  } finally {
    loading.value = false
  }
}

async function createBadge(data: CreateBadgeData) {
  const badge = await post<Badge>('/badges', data)
  badges.value.push(badge)
}

onMounted(fetchBadges)
</script>
```

## Authentication Flow

### Complete Auth Flow (WebAuthn)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Browser │     │  Frontend│     │  Backend │     │ Database │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ Click Login    │                │                │
     │───────────────▶│                │                │
     │                │                │                │
     │                │ POST /api/auth/webauthn/login/options
     │                │───────────────▶│                │
     │                │                │                │
     │                │                │ Get user       │
     │                │                │───────────────▶│
     │                │                │◀───────────────│
     │                │                │                │
     │                │◀───────────────│                │
     │                │  Challenge     │                │
     │                │                │                │
     │◀───────────────│                │                │
     │ navigator.credentials.get()     │                │
     │                │                │                │
     │───────────────▶│                │                │
     │ Credential     │                │                │
     │                │ POST /api/auth/webauthn/login/verify
     │                │───────────────▶│                │
     │                │                │                │
     │                │                │ Verify & create session
     │                │                │───────────────▶│
     │                │                │◀───────────────│
     │                │                │                │
     │                │◀───────────────│                │
     │                │  JWT Token     │                │
     │                │                │                │
     │◀───────────────│                │                │
     │ Store token    │                │                │
     │ Redirect       │                │                │
     │                │                │                │
```

### JWT Token Management

```typescript
// Frontend: Token storage and refresh
export function useAuth() {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<User | null>(null)

  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  function clearToken() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
  }

  async function checkAuth() {
    if (!token.value) return

    try {
      user.value = await api.get('/auth/me')
    } catch {
      clearToken()
    }
  }

  return { token, user, setToken, clearToken, checkAuth }
}
```

### Backend Token Verification

```typescript
// Backend: JWT verification middleware
export const requireAuth = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing token' }, 401)
  }

  const token = authHeader.slice(7)

  try {
    const payload = await verifyJWT(token)
    c.set('user', payload)
    await next()
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})
```

## OpenBadges Server Integration

### Proxy Architecture

The backend acts as a proxy to the OpenBadges server, handling authentication:

```typescript
// Badge server proxy
app.all('/api/bs/*', async (c) => {
  const path = c.req.path.replace('/api/bs', '')
  const method = c.req.method

  // Get auth headers based on mode
  const authHeaders = await getBadgeServerAuth()

  // Forward request
  const response = await fetch(`${BADGE_SERVER_URL}${path}`, {
    method,
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json'
    },
    body: method !== 'GET' ? await c.req.text() : undefined
  })

  // Forward response
  const data = await response.json()
  return c.json(data, response.status)
})
```

### Authentication Modes

```typescript
async function getBadgeServerAuth(): Promise<Record<string, string>> {
  switch (process.env.OPENBADGES_AUTH_MODE) {
    case 'docker':
      // Basic auth for Docker Compose
      const credentials = btoa(`${DOCKER_USER}:${DOCKER_PASS}`)
      return { 'Authorization': `Basic ${credentials}` }

    case 'oauth':
      // JWT for service-to-service
      const token = await getServiceToken()
      return { 'Authorization': `Bearer ${token}` }

    case 'local':
      // API key for local dev
      return { 'X-API-Key': process.env.OPENBADGES_API_KEY! }

    default:
      return {}
  }
}
```

### Badge Operations Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Frontend│     │  Backend │     │  Badge   │     │  Badge   │
│          │     │  (Proxy) │     │  Server  │     │    DB    │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ POST /api/bs/badges             │                │
     │───────────────▶│                │                │
     │                │                │                │
     │                │ Add auth headers               │
     │                │ POST /badges   │                │
     │                │───────────────▶│                │
     │                │                │                │
     │                │                │ Store badge    │
     │                │                │───────────────▶│
     │                │                │◀───────────────│
     │                │                │                │
     │                │◀───────────────│                │
     │                │   Badge        │                │
     │◀───────────────│                │                │
     │   Badge        │                │                │
     │                │                │                │
```

## Error Handling

### Frontend Error Handling

```typescript
// composables/useApi.ts
class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message)
  }
}

// In components
async function handleSubmit() {
  try {
    await createBadge(formData)
    toast.success('Badge created!')
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        router.push('/auth/login')
      } else if (error.status === 422) {
        validationErrors.value = error.details
      } else {
        toast.error(error.message)
      }
    }
  }
}
```

### Backend Error Responses

```typescript
// Consistent error format
interface ApiError {
  error: string
  message?: string
  details?: unknown
}

// 400 Bad Request
c.json({ error: 'Bad Request', message: 'Invalid email format' }, 400)

// 401 Unauthorized
c.json({ error: 'Unauthorized' }, 401)

// 403 Forbidden
c.json({ error: 'Forbidden', message: 'Admin access required' }, 403)

// 404 Not Found
c.json({ error: 'Not Found', message: 'Badge not found' }, 404)

// 422 Validation Error
c.json({
  error: 'Validation Error',
  details: { email: 'Required', name: 'Too short' }
}, 422)

// 500 Internal Error
c.json({ error: 'Internal Server Error' }, 500)
```

### Error Propagation

```
Frontend Error ◀── API Response ◀── Backend Error ◀── Badge Server Error
       │                 │                │                    │
       ▼                 ▼                ▼                    ▼
   User Toast      Status + JSON     Log + Transform    Original Error
```

## Environment Configuration

### Frontend Environment

```typescript
// Accessed via import.meta.env
const config = {
  apiUrl: import.meta.env.VITE_API_URL || '/api',
  appName: import.meta.env.VITE_APP_NAME || 'OpenBadges System'
}
```

### Backend Environment

```bash
# .env
# Server
PORT=8888
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:7777

# Database
DB_TYPE=sqlite
SQLITE_FILE=./data/openbadges.db
# or for PostgreSQL:
# DB_TYPE=postgresql
# DATABASE_URL=postgresql://user:pass@localhost:5432/openbadges

# JWT Keys (RS256)
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----..."

# OAuth
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
GITHUB_CALLBACK_URL=http://localhost:8888/api/oauth/github/callback

# Badge Server
OPENBADGES_SERVER_URL=http://localhost:3000
OPENBADGES_AUTH_MODE=docker  # docker | oauth | local
OPENBADGES_DOCKER_USER=admin
OPENBADGES_DOCKER_PASS=secret
```

### Environment Loading

```typescript
// Backend loads env automatically with Bun
// Access via process.env or Bun.env

const port = process.env.PORT || 8888
const dbType = process.env.DB_TYPE || 'sqlite'
```

## Type Safety Across Layers

### Shared Types

```typescript
// types/api.ts - Shared between frontend and backend
export interface User {
  id: string
  email: string
  name: string
  role: 'user' | 'admin'
  createdAt: string
}

export interface Badge {
  id: string
  name: string
  description: string
  image: string
  criteria: string
  issuerId: string
}

export interface ApiResponse<T> {
  data: T
  meta?: {
    total: number
    page: number
    limit: number
  }
}
```

### Type Flow

```
Database Schema (Kysely)
         │
         ▼
   Backend Types
         │
         ▼
   API Response
         │
         ▼
  Frontend Types
         │
         ▼
   Vue Components
```

## Related Documentation

- [Architecture Overview](./overview.md)
- [Frontend Architecture](./frontend-architecture.md)
- [Backend Architecture](./backend-architecture.md)
- [Database Architecture](./database-architecture.md)
