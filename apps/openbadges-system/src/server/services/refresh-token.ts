import crypto from 'crypto'
import { RefreshTokenRepository } from '../../../database/repositories'
import { userService } from './user'
import { jwtService } from './jwt'
import { logger } from '../utils/logger'

const REFRESH_TOKEN_EXPIRY_DAYS = 7
const REFRESH_TOKEN_BYTES = 32
const ROTATED_TOKEN_REUSE_GRACE_MS = 5 * 1000

const refreshTokenRepository = new RefreshTokenRepository()

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function generateOpaqueToken(): string {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('base64url')
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export async function issueTokenPair(platformUser: {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  isAdmin: boolean
}): Promise<TokenPair> {
  const accessToken = jwtService.generatePlatformToken(platformUser)
  const refreshToken = generateOpaqueToken()
  const tokenHash = hashToken(refreshToken)

  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()

  // Best-effort cleanup — should not block token issuance
  try {
    await refreshTokenRepository.deleteExpired()
  } catch (error) {
    logger.warn('Failed to clean up expired refresh tokens', { error })
  }

  await refreshTokenRepository.store(platformUser.id, tokenHash, expiresAt)

  return { accessToken, refreshToken }
}

export async function rotateRefreshToken(oldRefreshToken: string): Promise<TokenPair | null> {
  const oldHash = hashToken(oldRefreshToken)
  const stored = await refreshTokenRepository.findByHash(oldHash)

  if (!stored) {
    return null
  }

  if (new Date(stored.expiresAt) < new Date()) {
    await refreshTokenRepository.revoke(oldHash, 'expired')
    return null
  }

  if (stored.revokedAt) {
    const revokedAtMs = Date.parse(stored.revokedAt)
    const withinRotationGraceWindow =
      stored.revokedReason === 'rotated' &&
      !Number.isNaN(revokedAtMs) &&
      Date.now() - revokedAtMs <= ROTATED_TOKEN_REUSE_GRACE_MS

    if (!withinRotationGraceWindow) {
      await refreshTokenRepository.revokeAllForUser(stored.userId, 'compromised')
    }

    logger.info('Refresh token reuse rejected after prior revocation', {
      userId: stored.userId,
      revokedReason: stored.revokedReason,
      revokedAllTokens: !withinRotationGraceWindow,
    })
    return null
  }

  // Look up user before consuming the token — if the user service is unavailable
  // or the user was deleted, we must not destroy a valid token we cannot replace.
  if (!userService) {
    logger.error('Cannot rotate refresh token: user service is unavailable')
    return null
  }
  const user = await userService.getUserById(stored.userId)
  if (!user) {
    return null
  }

  const consumed = await refreshTokenRepository.consume(oldHash, 'rotated')
  if (!consumed) {
    logger.info('Refresh token rotation skipped because token was already consumed', {
      userId: stored.userId,
    })
    return null
  }

  const platformUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isAdmin: user.roles.includes('ADMIN'),
  }

  return issueTokenPair(platformUser)
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  // Best-effort: logout should still succeed even if persistence is unavailable.
  try {
    const tokenHash = hashToken(refreshToken)
    await refreshTokenRepository.revoke(tokenHash, 'logout')
  } catch (error) {
    logger.warn('Failed to revoke refresh token during logout', { error })
  }
}
