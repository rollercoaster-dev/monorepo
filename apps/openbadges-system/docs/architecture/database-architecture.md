# Database Architecture

The openbadges-system uses Kysely as a type-safe SQL query builder with support for both SQLite (development) and PostgreSQL (production).

## Technology Stack

| Technology     | Purpose                     |
| -------------- | --------------------------- |
| Kysely         | Type-safe SQL query builder |
| SQLite         | Development database        |
| PostgreSQL     | Production database         |
| better-sqlite3 | SQLite driver               |
| pg             | PostgreSQL driver           |

## Directory Structure

```
database/
├── schema.ts           # TypeScript type definitions
├── factory.ts          # Database connection factory
├── transaction.ts      # Transaction helpers
├── migrations/
│   ├── migrator.ts     # Migration runner
│   ├── 001_initial.sql # Initial schema
│   └── 002_oauth.sql   # OAuth tables
└── seeds/              # Optional seed data
```

## Database Schema

### Entity Relationship Diagram

```
┌──────────────────┐       ┌──────────────────┐
│      users       │       │  user_sessions   │
├──────────────────┤       ├──────────────────┤
│ id (PK)          │──┐    │ id (PK)          │
│ email            │  │    │ user_id (FK)     │──┐
│ name             │  │    │ token            │  │
│ role             │  │    │ expires_at       │  │
│ webauthn_id      │  │    │ created_at       │  │
│ webauthn_key     │  │    └──────────────────┘  │
│ created_at       │  │                          │
│ updated_at       │  │    ┌──────────────────┐  │
└──────────────────┘  │    │ oauth_providers  │  │
                      │    ├──────────────────┤  │
                      └───▶│ id (PK)          │  │
                           │ user_id (FK)     │◀─┘
                           │ provider         │
                           │ provider_id      │
                           │ access_token     │
                           │ refresh_token    │
                           │ created_at       │
                           └──────────────────┘

┌──────────────────┐
│  oauth_sessions  │
├──────────────────┤
│ id (PK)          │
│ state            │
│ redirect_uri     │
│ created_at       │
│ expires_at       │
└──────────────────┘
```

### Schema Definition

```typescript
// database/schema.ts
export interface Database {
  users: UsersTable
  user_sessions: UserSessionsTable
  oauth_providers: OAuthProvidersTable
  oauth_sessions: OAuthSessionsTable
}

export interface UsersTable {
  id: string
  email: string
  name: string
  role: 'user' | 'admin'
  webauthn_id: string | null
  webauthn_public_key: string | null
  webauthn_counter: number | null
  created_at: Date
  updated_at: Date
}

export interface UserSessionsTable {
  id: string
  user_id: string
  token: string
  expires_at: Date
  created_at: Date
}

export interface OAuthProvidersTable {
  id: string
  user_id: string
  provider: string // 'github', 'google', etc.
  provider_id: string
  access_token: string | null
  refresh_token: string | null
  created_at: Date
}

export interface OAuthSessionsTable {
  id: string
  state: string
  redirect_uri: string
  created_at: Date
  expires_at: Date
}
```

## Database Factory

### Dual-Database Support

```typescript
// database/factory.ts
import { Kysely, SqliteDialect, PostgresDialect } from 'kysely'
import Database from 'better-sqlite3'
import { Pool } from 'pg'
import type { Database as DB } from './schema'

export function createDatabase(): Kysely<DB> {
  const dbType = process.env.DB_TYPE || 'sqlite'

  if (dbType === 'postgresql') {
    return new Kysely<DB>({
      dialect: new PostgresDialect({
        pool: new Pool({
          connectionString: process.env.DATABASE_URL,
        }),
      }),
    })
  }

  // Default to SQLite
  return new Kysely<DB>({
    dialect: new SqliteDialect({
      database: new Database(process.env.SQLITE_FILE || './data/app.db'),
    }),
  })
}

// Singleton instance
let db: Kysely<DB> | null = null

export function getDatabase(): Kysely<DB> {
  if (!db) {
    db = createDatabase()
  }
  return db
}
```

### Database Compatibility

| Feature           | SQLite        | PostgreSQL      |
| ----------------- | ------------- | --------------- |
| Setup             | Zero-config   | Requires server |
| Concurrent writes | Limited       | Full support    |
| JSON columns      | Text + parse  | Native JSONB    |
| Full-text search  | FTS5          | tsvector        |
| Array columns     | Not supported | Native arrays   |

## Query Patterns

### Basic CRUD Operations

```typescript
// Select
const user = await db.selectFrom('users').where('id', '=', userId).selectAll().executeTakeFirst()

// Select with joins
const userWithSessions = await db
  .selectFrom('users')
  .leftJoin('user_sessions', 'users.id', 'user_sessions.user_id')
  .where('users.id', '=', userId)
  .select(['users.id', 'users.email', 'user_sessions.token'])
  .execute()

// Insert
const newUser = await db
  .insertInto('users')
  .values({
    id: generateId(),
    email: 'user@example.com',
    name: 'New User',
    role: 'user',
    created_at: new Date(),
    updated_at: new Date(),
  })
  .returningAll()
  .executeTakeFirstOrThrow()

// Update
await db
  .updateTable('users')
  .set({
    name: 'Updated Name',
    updated_at: new Date(),
  })
  .where('id', '=', userId)
  .execute()

// Delete
await db.deleteFrom('users').where('id', '=', userId).execute()
```

### Complex Queries

```typescript
// Pagination
const users = await db
  .selectFrom('users')
  .orderBy('created_at', 'desc')
  .limit(10)
  .offset(page * 10)
  .selectAll()
  .execute()

// Count
const { count } = await db
  .selectFrom('users')
  .select(db.fn.count('id').as('count'))
  .executeTakeFirstOrThrow()

// Conditional queries
let query = db.selectFrom('users').selectAll()

if (role) {
  query = query.where('role', '=', role)
}

if (search) {
  query = query.where('name', 'like', `%${search}%`)
}

const results = await query.execute()
```

### Type-Safe Queries

Kysely provides full type safety:

```typescript
// ✅ Type-safe: Column exists
const user = await db.selectFrom('users').select(['id', 'email', 'name']).executeTakeFirst()
// user is typed as { id: string, email: string, name: string } | undefined

// ❌ Type error: Column doesn't exist
const user = await db
  .selectFrom('users')
  .select(['id', 'invalid_column']) // TypeScript error!
  .executeTakeFirst()

// ✅ Type-safe: Insert values match schema
await db.insertInto('users').values({
  id: '123',
  email: 'test@example.com',
  name: 'Test',
  role: 'user',
  created_at: new Date(),
  updated_at: new Date(),
})

// ❌ Type error: Missing required field
await db.insertInto('users').values({
  id: '123',
  email: 'test@example.com',
  // TypeScript error: missing 'name', 'role', etc.
})
```

## Transaction Management

### Basic Transactions

```typescript
// database/transaction.ts
import type { Kysely, Transaction } from 'kysely'
import type { Database } from './schema'

export async function withTransaction<T>(
  db: Kysely<Database>,
  callback: (trx: Transaction<Database>) => Promise<T>
): Promise<T> {
  return db.transaction().execute(callback)
}
```

### Transaction Usage

```typescript
// Create user with initial session
const { user, session } = await withTransaction(db, async trx => {
  const user = await trx
    .insertInto('users')
    .values({
      id: generateId(),
      email: 'user@example.com',
      name: 'New User',
      role: 'user',
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  const session = await trx
    .insertInto('user_sessions')
    .values({
      id: generateId(),
      user_id: user.id,
      token: generateToken(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      created_at: new Date(),
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  return { user, session }
})
```

### Rollback on Error

```typescript
try {
  await withTransaction(db, async trx => {
    await trx.insertInto('users').values(userData).execute()

    // If this fails, the user insert is rolled back
    await trx.insertInto('oauth_providers').values(oauthData).execute()
  })
} catch (error) {
  console.error('Transaction failed, all changes rolled back:', error)
}
```

## Migration System

### Migration File Format

```sql
-- database/migrations/001_initial.sql
-- Up migration
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  webauthn_id TEXT,
  webauthn_public_key TEXT,
  webauthn_counter INTEGER,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token);
```

### Migration Runner

```typescript
// database/migrations/migrator.ts
import { Migrator, FileMigrationProvider } from 'kysely'
import { promises as fs } from 'fs'
import path from 'path'

export async function runMigrations(db: Kysely<Database>) {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, 'migrations'),
    }),
  })

  const { results, error } = await migrator.migrateToLatest()

  if (error) {
    console.error('Migration failed:', error)
    throw error
  }

  for (const result of results ?? []) {
    if (result.status === 'Success') {
      console.log(`Migration "${result.migrationName}" completed`)
    } else if (result.status === 'Error') {
      console.error(`Migration "${result.migrationName}" failed`)
    }
  }
}
```

### Running Migrations

```bash
# Run migrations on startup
bun run migrate

# Or programmatically
import { getDatabase } from './database/factory'
import { runMigrations } from './database/migrations/migrator'

const db = getDatabase()
await runMigrations(db)
```

## Development vs Production

### SQLite (Development)

```bash
# .env
DB_TYPE=sqlite
SQLITE_FILE=./data/openbadges.db
```

**Advantages:**

- Zero configuration
- Single file database
- Fast for development
- No external dependencies

**Limitations:**

- Single writer at a time
- No native JSON/Array types
- Limited concurrent access

### PostgreSQL (Production)

```bash
# .env
DB_TYPE=postgresql
DATABASE_URL=postgresql://user:pass@localhost:5432/openbadges
```

**Advantages:**

- Full ACID compliance
- Concurrent writes
- Advanced features (JSONB, arrays, full-text search)
- Connection pooling

**Configuration:**

```typescript
// PostgreSQL with connection pool
new Kysely<DB>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20, // Max connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }),
  }),
})
```

## Best Practices

### 1. Always Use Transactions for Multiple Operations

```typescript
// Good: Atomic operation
await withTransaction(db, async trx => {
  await trx.deleteFrom('user_sessions').where('user_id', '=', userId).execute()
  await trx.deleteFrom('oauth_providers').where('user_id', '=', userId).execute()
  await trx.deleteFrom('users').where('id', '=', userId).execute()
})

// Bad: Non-atomic, partial failure possible
await db.deleteFrom('user_sessions').where('user_id', '=', userId).execute()
await db.deleteFrom('oauth_providers').where('user_id', '=', userId).execute()
await db.deleteFrom('users').where('id', '=', userId).execute()
```

### 2. Use Parameterized Queries (Automatic with Kysely)

```typescript
// Kysely automatically parameterizes values - safe from SQL injection
const user = await db
  .selectFrom('users')
  .where('email', '=', userInput) // Parameterized
  .selectAll()
  .executeTakeFirst()
```

### 3. Index Frequently Queried Columns

```sql
-- Add indexes for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_sessions_token ON user_sessions(token);
CREATE INDEX idx_oauth_providers_user_id ON oauth_providers(user_id);
```

### 4. Handle Both Database Types

```typescript
// Write queries that work on both databases
const users = await db
  .selectFrom('users')
  .where('created_at', '>', new Date(Date.now() - 24 * 60 * 60 * 1000))
  .selectAll()
  .execute()

// Avoid database-specific syntax when possible
```

### 5. Clean Up Expired Data

```typescript
// Scheduled cleanup for expired sessions
async function cleanupExpiredSessions() {
  await db.deleteFrom('user_sessions').where('expires_at', '<', new Date()).execute()

  await db.deleteFrom('oauth_sessions').where('expires_at', '<', new Date()).execute()
}
```

## Debugging

### Query Logging

```typescript
// Enable query logging
const db = new Kysely<DB>({
  dialect: createDialect(),
  log(event) {
    if (event.level === 'query') {
      console.log('Query:', event.query.sql)
      console.log('Parameters:', event.query.parameters)
      console.log('Duration:', event.queryDurationMillis, 'ms')
    }
  },
})
```

### Explain Queries

```typescript
// Analyze query performance
const explanation = await db
  .selectFrom('users')
  .where('email', '=', 'test@example.com')
  .selectAll()
  .explain()

console.log(explanation)
```

## Related Documentation

- [Architecture Overview](./overview.md)
- [Backend Architecture](./backend-architecture.md)
- [Production Deployment](../deployment/production-deployment.md)
