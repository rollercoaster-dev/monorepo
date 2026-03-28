import crypto from 'crypto'
import { getDatabaseInstance } from '../factory'
import type { OAuthLoginExchanges } from '../schema'

export interface OAuthLoginExchange {
  id: string
  code: string
  accessToken: string
  refreshToken: string
  userData: string
  redirectUri: string | null
  createdAt: string
  expiresAt: string
  consumedAt: string | null
}

function generateId(): string {
  return 'oauth_exchange_' + Date.now().toString(36) + Math.random().toString(36).substring(2)
}

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex')
}

function mapRow(row: OAuthLoginExchanges, code: string): OAuthLoginExchange {
  return {
    id: row.id,
    code,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    userData: row.user_data,
    redirectUri: row.redirect_uri,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at,
  }
}

export class OAuthLoginExchangeRepository {
  async create(
    data: Omit<OAuthLoginExchange, 'id' | 'createdAt' | 'consumedAt'>
  ): Promise<OAuthLoginExchange> {
    const db = getDatabaseInstance()
    const id = generateId()
    const now = new Date().toISOString()

    await db
      .insertInto('oauth_login_exchanges')
      .values({
        id,
        code_hash: hashCode(data.code),
        access_token: data.accessToken,
        refresh_token: data.refreshToken,
        user_data: data.userData,
        redirect_uri: data.redirectUri,
        created_at: now,
        expires_at: data.expiresAt,
        consumed_at: null,
      })
      .execute()

    return {
      id,
      ...data,
      createdAt: now,
      consumedAt: null,
    }
  }

  async consume(code: string): Promise<OAuthLoginExchange | null> {
    const db = getDatabaseInstance()
    const now = new Date().toISOString()

    const row = await db
      .updateTable('oauth_login_exchanges')
      .set({ consumed_at: now })
      .where('code_hash', '=', hashCode(code))
      .where('consumed_at', 'is', null)
      .where('expires_at', '>=', now)
      .returningAll()
      .executeTakeFirst()

    return row ? mapRow(row, code) : null
  }

  async deleteExpired(): Promise<void> {
    const db = getDatabaseInstance()
    const now = new Date().toISOString()

    await db.deleteFrom('oauth_login_exchanges').where('expires_at', '<', now).execute()
  }
}
