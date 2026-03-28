import { getDatabaseInstance } from '../factory'
import type { RefreshTokens } from '../schema'

export interface RefreshToken {
  id: string
  userId: string
  tokenHash: string
  expiresAt: string
  revokedAt: string | null
  revokedReason: RefreshTokenRevokeReason | null
  createdAt: string
}

export type RefreshTokenRevokeReason = 'rotated' | 'expired' | 'logout' | 'compromised'

function generateId(): string {
  return 'refresh_token_' + Date.now().toString(36) + Math.random().toString(36).substring(2)
}

function mapRow(row: RefreshTokens): RefreshToken {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    revokedReason: row.revoked_reason as RefreshTokenRevokeReason | null,
    createdAt: row.created_at,
  }
}

export class RefreshTokenRepository {
  async store(userId: string, tokenHash: string, expiresAt: string): Promise<RefreshToken> {
    const db = getDatabaseInstance()
    const id = generateId()
    const now = new Date().toISOString()

    await db
      .insertInto('refresh_tokens')
      .values({
        id,
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        revoked_at: null,
        revoked_reason: null,
        created_at: now,
      })
      .execute()

    return {
      id,
      userId,
      tokenHash,
      expiresAt,
      revokedAt: null,
      revokedReason: null,
      createdAt: now,
    }
  }

  async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    const db = getDatabaseInstance()
    const row = await db
      .selectFrom('refresh_tokens')
      .selectAll()
      .where('token_hash', '=', tokenHash)
      .executeTakeFirst()

    return row ? mapRow(row) : null
  }

  async consume(tokenHash: string, revokedReason: RefreshTokenRevokeReason): Promise<boolean> {
    const db = getDatabaseInstance()
    const now = new Date().toISOString()

    const result = await db
      .updateTable('refresh_tokens')
      .set({ revoked_at: now, revoked_reason: revokedReason })
      .where('token_hash', '=', tokenHash)
      .where('revoked_at', 'is', null)
      .returning('id')
      .executeTakeFirst()

    return Boolean(result)
  }

  async revoke(tokenHash: string, revokedReason: RefreshTokenRevokeReason): Promise<void> {
    const db = getDatabaseInstance()
    const now = new Date().toISOString()

    await db
      .updateTable('refresh_tokens')
      .set({ revoked_at: now, revoked_reason: revokedReason })
      .where('token_hash', '=', tokenHash)
      .where('revoked_at', 'is', null)
      .execute()
  }

  async revokeAllForUser(userId: string, revokedReason: RefreshTokenRevokeReason): Promise<void> {
    const db = getDatabaseInstance()
    const now = new Date().toISOString()

    await db
      .updateTable('refresh_tokens')
      .set({ revoked_at: now, revoked_reason: revokedReason })
      .where('user_id', '=', userId)
      .where('revoked_at', 'is', null)
      .execute()
  }

  async deleteExpired(): Promise<void> {
    const db = getDatabaseInstance()
    const now = new Date().toISOString()

    await db.deleteFrom('refresh_tokens').where('expires_at', '<', now).execute()
  }
}
