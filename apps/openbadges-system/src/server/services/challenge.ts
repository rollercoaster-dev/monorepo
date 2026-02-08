import crypto from 'crypto'

interface StoredChallenge {
  challenge: string
  userId: string
  type: 'registration' | 'authentication'
  createdAt: number
}

const CHALLENGE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const challenges = new Map<string, StoredChallenge>()

function cleanExpired(): void {
  const now = Date.now()
  for (const [key, entry] of challenges) {
    if (now - entry.createdAt > CHALLENGE_TTL_MS) {
      challenges.delete(key)
    }
  }
}

export function generateChallenge(userId: string, type: 'registration' | 'authentication'): string {
  cleanExpired()
  const challenge = crypto.randomBytes(32).toString('base64url')
  challenges.set(challenge, { challenge, userId, type, createdAt: Date.now() })
  return challenge
}

export function consumeChallenge(
  challenge: string,
  userId: string,
  type: 'registration' | 'authentication'
): boolean {
  const entry = challenges.get(challenge)
  if (!entry) return false
  // Always delete so the challenge is single-use
  challenges.delete(challenge)
  if (Date.now() - entry.createdAt > CHALLENGE_TTL_MS) return false
  return entry.userId === userId && entry.type === type
}
