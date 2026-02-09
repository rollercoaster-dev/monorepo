import crypto from 'crypto'
import { userService } from './user'
import { jwtService } from './jwt'
import { logger } from '../utils/logger'

const REFRESH_TOKEN_EXPIRY_DAYS = 7
const REFRESH_TOKEN_BYTES = 32

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
  if (!userService) {
    throw new Error('User service unavailable')
  }

  const accessToken = jwtService.generatePlatformToken(platformUser)
  const refreshToken = generateOpaqueToken()
  const tokenHash = hashToken(refreshToken)

  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()

  await userService.storeRefreshToken(platformUser.id, tokenHash, expiresAt)

  return { accessToken, refreshToken }
}

export async function rotateRefreshToken(oldRefreshToken: string): Promise<TokenPair | null> {
  if (!userService) {
    throw new Error('User service unavailable')
  }

  const oldHash = hashToken(oldRefreshToken)
  const stored = await userService.getRefreshTokenByHash(oldHash)

  if (!stored) {
    return null
  }

  // Revoked token was reused — potential token theft. Revoke all tokens for user.
  if (stored.revokedAt) {
    logger.warn('Revoked refresh token reused, revoking all tokens for user', {
      userId: stored.userId,
    })
    await userService.revokeAllUserRefreshTokens(stored.userId)
    return null
  }

  // Check expiry
  if (new Date(stored.expiresAt) < new Date()) {
    await userService.revokeRefreshToken(oldHash)
    return null
  }

  // Revoke the old token (rotation: each token is single-use)
  await userService.revokeRefreshToken(oldHash)

  // Look up user to build new access token
  const user = await userService.getUserById(stored.userId)
  if (!user) {
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
  if (!userService) return
  const tokenHash = hashToken(refreshToken)
  await userService.revokeRefreshToken(tokenHash)
}
