import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { generateChallenge, consumeChallenge, _resetForTesting } from '../challenge'

describe('Challenge Service', () => {
  beforeEach(() => {
    _resetForTesting()
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('generateChallenge', () => {
    it('returns a non-empty base64url string', () => {
      const challenge = generateChallenge('user-1', 'authentication')
      expect(challenge).toBeTruthy()
      expect(typeof challenge).toBe('string')
      // base64url: alphanumeric, -, _
      expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it('returns unique values on each call', () => {
      const c1 = generateChallenge('user-1', 'authentication')
      const c2 = generateChallenge('user-1', 'authentication')
      expect(c1).not.toBe(c2)
    })
  })

  describe('consumeChallenge', () => {
    it('returns valid for a fresh challenge with correct userId and type', () => {
      const challenge = generateChallenge('user-1', 'authentication')
      const result = consumeChallenge(challenge, 'user-1', 'authentication')
      expect(result).toEqual({ valid: true })
    })

    it('returns not_found for a non-existent challenge', () => {
      const result = consumeChallenge('does-not-exist', 'user-1', 'authentication')
      expect(result).toEqual({ valid: false, reason: 'not_found' })
    })

    it('is single-use: second consumption returns not_found', () => {
      const challenge = generateChallenge('user-1', 'authentication')

      const first = consumeChallenge(challenge, 'user-1', 'authentication')
      expect(first).toEqual({ valid: true })

      const second = consumeChallenge(challenge, 'user-1', 'authentication')
      expect(second).toEqual({ valid: false, reason: 'not_found' })
    })

    it('returns user_mismatch when userId does not match', () => {
      const challenge = generateChallenge('user-1', 'authentication')
      const result = consumeChallenge(challenge, 'user-2', 'authentication')
      expect(result).toEqual({ valid: false, reason: 'user_mismatch' })
    })

    it('returns type_mismatch when type does not match', () => {
      const challenge = generateChallenge('user-1', 'registration')
      const result = consumeChallenge(challenge, 'user-1', 'authentication')
      expect(result).toEqual({ valid: false, reason: 'type_mismatch' })
    })

    it('returns expired for a challenge older than 5 minutes', () => {
      vi.useFakeTimers()

      const challenge = generateChallenge('user-1', 'authentication')

      // Advance time past the 5-minute TTL
      vi.advanceTimersByTime(5 * 60 * 1000 + 1)

      const result = consumeChallenge(challenge, 'user-1', 'authentication')
      expect(result).toEqual({ valid: false, reason: 'expired' })
    })

    it('accepts a challenge just under the 5-minute TTL', () => {
      vi.useFakeTimers()

      const challenge = generateChallenge('user-1', 'authentication')

      // Advance time to just under the TTL
      vi.advanceTimersByTime(5 * 60 * 1000 - 100)

      const result = consumeChallenge(challenge, 'user-1', 'authentication')
      expect(result).toEqual({ valid: true })
    })

    it('deletes the challenge even on mismatch (prevents retry attacks)', () => {
      const challenge = generateChallenge('user-1', 'authentication')

      // Wrong userId — challenge is consumed and deleted
      consumeChallenge(challenge, 'user-2', 'authentication')

      // Retry with correct userId — challenge is gone
      const result = consumeChallenge(challenge, 'user-1', 'authentication')
      expect(result).toEqual({ valid: false, reason: 'not_found' })
    })
  })

  describe('cleanExpired (via generateChallenge)', () => {
    it('cleans expired entries when generating a new challenge', () => {
      vi.useFakeTimers()

      const old = generateChallenge('user-1', 'authentication')

      // Advance past TTL
      vi.advanceTimersByTime(5 * 60 * 1000 + 1)

      // Generating a new challenge triggers cleanup
      generateChallenge('user-2', 'authentication')

      // Old challenge should be gone
      const result = consumeChallenge(old, 'user-1', 'authentication')
      expect(result).toEqual({ valid: false, reason: 'not_found' })
    })
  })
})
