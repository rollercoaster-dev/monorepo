/**
 * Development seed script — creates test users and prints an admin JWT.
 *
 * Usage:
 *   bun run scripts/seed-dev.ts          # seed + print token
 *   bun run scripts/seed-dev.ts --token  # only print a fresh token (no DB changes)
 *
 * The token is valid for 1 hour. Run again when it expires.
 *
 * To use in the browser:
 *   1. Open http://localhost:7777
 *   2. Open DevTools → Console
 *   3. Paste:  localStorage.setItem('auth_token', '<token>')
 *   4. Reload the page → navigate to /admin/users
 *
 * Or use the printed localStorage snippet directly.
 */

import { Database } from 'bun:sqlite'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { jwtService } from '../src/server/services/jwt'

const DATA_DIR = join(import.meta.dir, '..', 'data')
const DB_PATH = join(DATA_DIR, 'users.sqlite')

const SEED_USERS = [
  {
    id: 'user_seed_admin_001',
    username: 'admin_test',
    email: 'admin@test.dev',
    firstName: 'Admin',
    lastName: 'Tester',
    isActive: 1,
    roles: '["ADMIN"]',
  },
  {
    id: 'user_seed_user_001',
    username: 'alice_dev',
    email: 'alice@test.dev',
    firstName: 'Alice',
    lastName: 'Johnson',
    isActive: 1,
    roles: '["USER"]',
  },
  {
    id: 'user_seed_user_002',
    username: 'bob_smith',
    email: 'bob@test.dev',
    firstName: 'Bob',
    lastName: 'Smith',
    isActive: 1,
    roles: '["ADMIN"]',
  },
  {
    id: 'user_seed_user_003',
    username: 'carol_w',
    email: 'carol@test.dev',
    firstName: 'Carol',
    lastName: 'Williams',
    isActive: 0,
    roles: '["USER"]',
  },
  {
    id: 'user_seed_user_004',
    username: 'dave_brown',
    email: 'dave@test.dev',
    firstName: 'Dave',
    lastName: 'Brown',
    isActive: 1,
    roles: '["USER"]',
  },
  {
    id: 'user_seed_user_005',
    username: 'eve_davis',
    email: 'eve@test.dev',
    firstName: 'Eve',
    lastName: 'Davis',
    isActive: 1,
    roles: '["ADMIN"]',
  },
]

// Admin user to generate token for
const ADMIN_USER = {
  id: 'user_seed_admin_001',
  username: 'admin_test',
  email: 'admin@test.dev',
  firstName: 'Admin',
  lastName: 'Tester',
  isAdmin: true,
}

function seedDatabase() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }

  const db = new Database(DB_PATH)
  db.exec('PRAGMA foreign_keys = ON')

  // Create table if not exists (same schema as UserService)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      avatar TEXT,
      isActive INTEGER NOT NULL DEFAULT 1,
      roles TEXT NOT NULL DEFAULT '["USER"]',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      did TEXT,
      didMethod TEXT,
      didPublicKey TEXT,
      didPrivateKey TEXT,
      didDocument TEXT
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS user_credentials (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      publicKey TEXT NOT NULL,
      transports TEXT NOT NULL DEFAULT '[]',
      counter INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      lastUsed TEXT NOT NULL DEFAULT (datetime('now')),
      name TEXT NOT NULL DEFAULT 'Default Credential',
      type TEXT NOT NULL DEFAULT 'platform',
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  const insert = db.prepare(`
    INSERT OR IGNORE INTO users (id, username, email, firstName, lastName, isActive, roles, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '-' || abs(random() % 90) || ' days'), datetime('now'))
  `)

  let inserted = 0
  for (const u of SEED_USERS) {
    const result = insert.run(
      u.id,
      u.username,
      u.email,
      u.firstName,
      u.lastName,
      u.isActive,
      u.roles
    )
    if (result.changes > 0) inserted++
  }

  // Add a credential to one user for testing the credential UI
  db.exec(`
    INSERT OR IGNORE INTO user_credentials (id, userId, publicKey, transports, counter, name, type)
    VALUES ('cred_seed_001', 'user_seed_user_001', 'mock-public-key-base64', '["internal"]', 5, 'MacBook Touch ID', 'platform')
  `)

  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }
  db.close()

  console.log(`\n  Seed: ${inserted} new users inserted (${totalUsers.count} total in DB)`)
}

function generateToken(): string {
  return jwtService.generatePlatformToken(ADMIN_USER)
}

// --- Main ---
const tokenOnly = process.argv.includes('--token')

if (!tokenOnly) {
  seedDatabase()
}

const token = generateToken()

console.log(`
  ┌─────────────────────────────────────────────┐
  │  Dev Token (admin, 1h expiry)               │
  └─────────────────────────────────────────────┘

  Token:
  ${token}

  ┌─────────────────────────────────────────────┐
  │  Paste in browser console (DevTools → F12): │
  └─────────────────────────────────────────────┘

  localStorage.setItem('auth_token', '${token}'); location.reload();

  Then navigate to: http://localhost:7777/admin/users
`)
