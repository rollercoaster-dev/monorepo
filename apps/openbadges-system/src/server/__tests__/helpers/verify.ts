import type { ExecutionContext } from 'hono'

export type AppLike = {
  fetch: (
    request: Request,
    env?: unknown,
    executionCtx?: ExecutionContext | undefined
  ) => Response | Promise<Response>
}

export interface VerifyBody {
  assertion: Record<string, unknown>
  badgeClass: Record<string, unknown>
}

export async function postVerify(app: AppLike, body: VerifyBody): Promise<Response> {
  const req = new Request('http://localhost/api/badges/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return await app.fetch(req)
}
