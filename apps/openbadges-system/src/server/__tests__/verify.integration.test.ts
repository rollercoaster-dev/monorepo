import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ExecutionContext } from 'hono'
import { postVerify } from './helpers/verify'

// Mock fetch for downstream calls
// Cast to unknown first to avoid Bun's fetch.preconnect type requirement
global.fetch = vi.fn() as unknown as typeof fetch

describe('Verification helper integration', () => {
  let app: {
    fetch: (
      request: Request,
      env?: unknown,
      executionCtx?: ExecutionContext | undefined
    ) => Response | Promise<Response>
  }
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    mockFetch = vi.mocked(fetch)
    const serverModule = await import('../index')
    app = { fetch: serverModule.default.fetch }
  })

  it('posts to /api/badges/verify and returns verification data', async () => {
    const verificationResponse = {
      valid: true,
      issuerVerified: true,
      signatureValid: true,
      errors: [],
      warnings: [],
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(verificationResponse),
    })

    const res = await postVerify(app, {
      assertion: { id: 'https://example.org/assertions/1' },
      badgeClass: { id: 'https://example.org/badges/1' },
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual(verificationResponse)
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/verify',
      expect.objectContaining({ method: 'POST' })
    )
  })
})
