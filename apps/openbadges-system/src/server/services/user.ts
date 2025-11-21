import { Database } from 'bun:sqlite'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

export interface User {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  avatar?: string
  isActive: boolean
  roles: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateUserData {
  username: string
  email: string
  firstName: string
  lastName: string
  avatar?: string
  isActive: boolean
  roles: string[]
}

export interface UpdateUserData {
  email?: string
  firstName?: string
  lastName?: string
  avatar?: string
  isActive?: boolean
  roles?: string[]
}

export interface UserCredential {
  id: string
  userId: string
  publicKey: string
  transports: string[]
  counter: number
  createdAt: string
  lastUsed: string
  name: string
  type: 'platform' | 'cross-platform'
}

export interface UserSearchFilters {
  role?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  credentials?: string
  lastLogin?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface OAuthProvider {
  id: string
  user_id: string
  provider: string
  provider_user_id: string
  access_token?: string
  refresh_token?: string
  token_expires_at?: string
  profile_data?: string
  created_at: string
  updated_at: string
}

interface UserRow {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  avatar?: string
  isActive: number
  roles: string
  createdAt: string
  updatedAt: string
}

interface UserCredentialRow {
  id: string
  userId: string
  publicKey: string
  transports: string
  counter: number
  createdAt: string
  lastUsed: string
  name: string
  type: string
}

export interface OAuthSession {
  id: string
  state: string
  code_verifier?: string
  redirect_uri?: string
  provider: string
  created_at: string
  expires_at: string
}

export class UserService {
  private db: Database | null = null
  private dbPath: string

  constructor() {
    // Create data directory if it doesn't exist
    const dataDir = join(process.cwd(), 'data')
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true })
    }

    this.dbPath = join(dataDir, 'users.sqlite')
  }

  private getDb(): Database {
    if (!this.db) {
      try {
        this.db = new Database(this.dbPath)
        // Enable foreign keys
        this.db.exec('PRAGMA foreign_keys = ON')
        this.initializeDatabase()
      } catch (error) {
        console.error('Failed to initialize database:', error)
        throw new Error('Database unavailable')
      }
    }
    return this.db
  }

  private initializeDatabase() {
    try {
      // Create users table
      this.getDb().exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          firstName TEXT NOT NULL,
          lastName TEXT NOT NULL,
          avatar TEXT,
          isActive BOOLEAN NOT NULL DEFAULT 1,
          roles TEXT NOT NULL DEFAULT '["USER"]',
          createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `)

      // Create user credentials table
      this.getDb().exec(`
        CREATE TABLE IF NOT EXISTS user_credentials (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          publicKey TEXT NOT NULL,
          transports TEXT NOT NULL DEFAULT '[]',
          counter INTEGER NOT NULL DEFAULT 0,
          createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          lastUsed TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('platform', 'cross-platform')),
          FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
        );
      `)

      // Create OAuth providers table
      this.getDb().exec(`
        CREATE TABLE IF NOT EXISTS oauth_providers (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          provider TEXT NOT NULL,
          provider_user_id TEXT NOT NULL,
          access_token TEXT,
          refresh_token TEXT,
          token_expires_at TEXT,
          profile_data TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
      `)

      // Create OAuth sessions table
      this.getDb().exec(`
        CREATE TABLE IF NOT EXISTS oauth_sessions (
          id TEXT PRIMARY KEY,
          state TEXT NOT NULL,
          code_verifier TEXT,
          redirect_uri TEXT,
          provider TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          expires_at TEXT NOT NULL
        );
      `)

      // Create indexes for better performance
      this.getDb().exec(`
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_credentials_userId ON user_credentials(userId);
        CREATE INDEX IF NOT EXISTS idx_oauth_providers_user_id ON oauth_providers(user_id);
        CREATE INDEX IF NOT EXISTS idx_oauth_providers_provider ON oauth_providers(provider);
        CREATE INDEX IF NOT EXISTS idx_oauth_sessions_state ON oauth_sessions(state);
      `)

      console.log('Database initialized successfully')
    } catch (error) {
      console.error('Error initializing database:', error)
      throw error
    }
  }

  private runQuery(sql: string, params: unknown[] = []): void {
    this.getDb().prepare(sql).run(params)
  }

  private getQuery(sql: string, params: unknown[] = []): unknown {
    return this.getDb().prepare(sql).get(params)
  }

  private allQuery(sql: string, params: unknown[] = []): unknown[] {
    return this.getDb().prepare(sql).all(params)
  }

  private generateId(): string {
    return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  private parseUser(row: unknown): User {
    const userRow = row as UserRow
    return {
      id: userRow.id,
      username: userRow.username,
      email: userRow.email,
      firstName: userRow.firstName,
      lastName: userRow.lastName,
      avatar: userRow.avatar,
      isActive: Boolean(userRow.isActive),
      roles: JSON.parse(userRow.roles),
      createdAt: userRow.createdAt,
      updatedAt: userRow.updatedAt,
    }
  }

  async createUser(userData: CreateUserData): Promise<User> {
    const id = this.generateId()
    const now = new Date().toISOString()

    const sql = `
      INSERT INTO users (id, username, email, firstName, lastName, avatar, isActive, roles, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    const params = [
      id,
      userData.username,
      userData.email,
      userData.firstName,
      userData.lastName,
      userData.avatar || null,
      userData.isActive ? 1 : 0,
      JSON.stringify(userData.roles),
      now,
      now,
    ]

    this.runQuery(sql, params)

    return this.getUserById(id) as Promise<User>
  }

  async getUserById(id: string): Promise<User | null> {
    const row = this.getQuery('SELECT * FROM users WHERE id = ?', [id])
    return row ? this.parseUser(row) : null
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const row = this.getQuery('SELECT * FROM users WHERE username = ?', [username])
    return row ? this.parseUser(row) : null
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const row = this.getQuery('SELECT * FROM users WHERE email = ?', [email])
    return row ? this.parseUser(row) : null
  }

  async getUsers(
    page: number = 1,
    limit: number = 10,
    search?: string,
    filters?: UserSearchFilters
  ): Promise<{ users: User[]; total: number }> {
    let whereClause = 'WHERE 1=1'
    let params: unknown[] = []

    // Add search filter
    if (search) {
      whereClause += ' AND (username LIKE ? OR email LIKE ? OR firstName LIKE ? OR lastName LIKE ?)'
      const searchTerm = `%${search}%`
      params.push(searchTerm, searchTerm, searchTerm, searchTerm)
    }

    // Add filters
    if (filters?.role) {
      whereClause += ' AND roles LIKE ?'
      params.push(`%"${filters.role}"%`)
    }

    if (filters?.status) {
      const isActive = filters.status === 'active' ? 1 : 0
      whereClause += ' AND isActive = ?'
      params.push(isActive)
    }

    if (filters?.dateFrom) {
      whereClause += ' AND createdAt >= ?'
      params.push(filters.dateFrom)
    }

    if (filters?.dateTo) {
      whereClause += ' AND createdAt <= ?'
      params.push(filters.dateTo)
    }

    // Get total count
    const totalResult = this.getQuery(`SELECT COUNT(*) as count FROM users ${whereClause}`, params)
    const total = (totalResult as { count: number }).count

    // Add sorting
    const sortBy = filters?.sortBy || 'createdAt'
    const sortOrder = filters?.sortOrder || 'desc'
    const orderClause = `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`

    // Add pagination
    const offset = (page - 1) * limit
    const paginationClause = `LIMIT ? OFFSET ?`
    params.push(limit, offset)

    // Get users
    const rows = this.allQuery(
      `SELECT * FROM users ${whereClause} ${orderClause} ${paginationClause}`,
      params
    )

    const users = rows.map(row => this.parseUser(row))

    return { users, total }
  }

  async updateUser(id: string, userData: UpdateUserData): Promise<User | null> {
    const updates: string[] = []
    const params: unknown[] = []

    if (userData.email !== undefined) {
      updates.push('email = ?')
      params.push(userData.email)
    }

    if (userData.firstName !== undefined) {
      updates.push('firstName = ?')
      params.push(userData.firstName)
    }

    if (userData.lastName !== undefined) {
      updates.push('lastName = ?')
      params.push(userData.lastName)
    }

    if (userData.avatar !== undefined) {
      updates.push('avatar = ?')
      params.push(userData.avatar)
    }

    if (userData.isActive !== undefined) {
      updates.push('isActive = ?')
      params.push(userData.isActive ? 1 : 0)
    }

    if (userData.roles !== undefined) {
      updates.push('roles = ?')
      params.push(JSON.stringify(userData.roles))
    }

    if (updates.length === 0) {
      return this.getUserById(id)
    }

    updates.push('updatedAt = ?')
    params.push(new Date().toISOString())
    params.push(id)

    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
    this.runQuery(sql, params)

    return this.getUserById(id)
  }

  async deleteUser(id: string): Promise<boolean> {
    this.runQuery('DELETE FROM users WHERE id = ?', [id])
    return true
  }

  // Credential management
  async addUserCredential(
    userId: string,
    credential: Omit<UserCredential, 'userId'>
  ): Promise<void> {
    const sql = `
      INSERT INTO user_credentials (id, userId, publicKey, transports, counter, createdAt, lastUsed, name, type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    const params = [
      credential.id,
      userId,
      credential.publicKey,
      JSON.stringify(credential.transports),
      credential.counter,
      credential.createdAt,
      credential.lastUsed,
      credential.name,
      credential.type,
    ]

    this.runQuery(sql, params)
  }

  async getUserCredentials(userId: string): Promise<UserCredential[]> {
    const rows = this.allQuery('SELECT * FROM user_credentials WHERE userId = ?', [userId])
    return rows.map(row => {
      const credRow = row as UserCredentialRow
      return {
        id: credRow.id,
        userId: credRow.userId,
        publicKey: credRow.publicKey,
        transports: JSON.parse(credRow.transports),
        counter: credRow.counter,
        createdAt: credRow.createdAt,
        lastUsed: credRow.lastUsed,
        name: credRow.name,
        type: credRow.type as 'platform' | 'cross-platform',
      }
    })
  }

  async removeUserCredential(userId: string, credentialId: string): Promise<boolean> {
    this.runQuery('DELETE FROM user_credentials WHERE id = ? AND userId = ?', [
      credentialId,
      userId,
    ])
    return true
  }

  async updateUserCredential(
    userId: string,
    credentialId: string,
    updates: Partial<UserCredential>
  ): Promise<boolean> {
    const updateFields: string[] = []
    const params: unknown[] = []

    if (updates.counter !== undefined) {
      updateFields.push('counter = ?')
      params.push(updates.counter)
    }

    if (updates.lastUsed !== undefined) {
      updateFields.push('lastUsed = ?')
      params.push(updates.lastUsed)
    }

    if (updates.name !== undefined) {
      updateFields.push('name = ?')
      params.push(updates.name)
    }

    if (updateFields.length === 0) {
      return false
    }

    params.push(credentialId, userId)

    const sql = `UPDATE user_credentials SET ${updateFields.join(', ')} WHERE id = ? AND userId = ?`
    this.runQuery(sql, params)

    return true
  }

  // OAuth provider management
  async createOAuthProvider(
    oauthProvider: Omit<OAuthProvider, 'id' | 'created_at' | 'updated_at'>
  ): Promise<OAuthProvider> {
    const id = this.generateId()
    const now = new Date().toISOString()

    const sql = `
      INSERT INTO oauth_providers (id, user_id, provider, provider_user_id, access_token, refresh_token, token_expires_at, profile_data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    const params = [
      id,
      oauthProvider.user_id,
      oauthProvider.provider,
      oauthProvider.provider_user_id,
      oauthProvider.access_token || null,
      oauthProvider.refresh_token || null,
      oauthProvider.token_expires_at || null,
      oauthProvider.profile_data || null,
      now,
      now,
    ]

    this.runQuery(sql, params)

    return {
      id,
      ...oauthProvider,
      created_at: now,
      updated_at: now,
    }
  }

  async getOAuthProvider(userId: string, provider: string): Promise<OAuthProvider | null> {
    const row = this.getQuery('SELECT * FROM oauth_providers WHERE user_id = ? AND provider = ?', [
      userId,
      provider,
    ])
    return row ? (row as OAuthProvider) : null
  }

  async getOAuthProviderByProviderId(
    provider: string,
    providerUserId: string
  ): Promise<OAuthProvider | null> {
    const row = this.getQuery(
      'SELECT * FROM oauth_providers WHERE provider = ? AND provider_user_id = ?',
      [provider, providerUserId]
    )
    return row ? (row as OAuthProvider) : null
  }

  async updateOAuthProvider(id: string, updates: Partial<OAuthProvider>): Promise<boolean> {
    const updateFields: string[] = []
    const params: unknown[] = []

    if (updates.access_token !== undefined) {
      updateFields.push('access_token = ?')
      params.push(updates.access_token)
    }

    if (updates.refresh_token !== undefined) {
      updateFields.push('refresh_token = ?')
      params.push(updates.refresh_token)
    }

    if (updates.token_expires_at !== undefined) {
      updateFields.push('token_expires_at = ?')
      params.push(updates.token_expires_at)
    }

    if (updates.profile_data !== undefined) {
      updateFields.push('profile_data = ?')
      params.push(updates.profile_data)
    }

    if (updateFields.length === 0) {
      return false
    }

    updateFields.push('updated_at = ?')
    params.push(new Date().toISOString())
    params.push(id)

    const sql = `UPDATE oauth_providers SET ${updateFields.join(', ')} WHERE id = ?`
    this.runQuery(sql, params)

    return true
  }

  async removeOAuthProvider(userId: string, provider: string): Promise<boolean> {
    this.runQuery('DELETE FROM oauth_providers WHERE user_id = ? AND provider = ?', [
      userId,
      provider,
    ])
    return true
  }

  async getOAuthProvidersByUser(userId: string): Promise<OAuthProvider[]> {
    const rows = this.allQuery('SELECT * FROM oauth_providers WHERE user_id = ?', [userId])
    return rows.map(row => row as OAuthProvider)
  }

  // OAuth session management
  async createOAuthSession(
    session: Omit<OAuthSession, 'id' | 'created_at'>
  ): Promise<OAuthSession> {
    const id = this.generateId()
    const now = new Date().toISOString()

    const sql = `
      INSERT INTO oauth_sessions (id, state, code_verifier, redirect_uri, provider, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `

    const params = [
      id,
      session.state,
      session.code_verifier || null,
      session.redirect_uri || null,
      session.provider,
      now,
      session.expires_at,
    ]

    this.runQuery(sql, params)

    return {
      id,
      ...session,
      created_at: now,
    }
  }

  async getOAuthSession(state: string): Promise<OAuthSession | null> {
    const row = this.getQuery('SELECT * FROM oauth_sessions WHERE state = ?', [state])
    return row ? (row as OAuthSession) : null
  }

  async removeOAuthSession(state: string): Promise<boolean> {
    this.runQuery('DELETE FROM oauth_sessions WHERE state = ?', [state])
    return true
  }

  async cleanupExpiredOAuthSessions(): Promise<void> {
    const now = new Date().toISOString()
    this.runQuery('DELETE FROM oauth_sessions WHERE expires_at < ?', [now])
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

// Create user service with error handling
let userService: UserService | null = null

try {
  userService = new UserService()
  console.log('User service initialized successfully')
} catch (error) {
  console.warn(
    'User service disabled due to database initialization error:',
    (error as Error).message
  )
  userService = null
}

export { userService }
