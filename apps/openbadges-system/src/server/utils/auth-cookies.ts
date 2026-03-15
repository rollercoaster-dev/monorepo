import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

const REFRESH_TOKEN_COOKIE_NAME = 'obs_refresh_token'
const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

function isSecureRequest(c: Context): boolean {
  const forwardedProto = c.req.header('x-forwarded-proto')
  if (forwardedProto) {
    return forwardedProto.split(',')[0]?.trim() === 'https'
  }

  return new URL(c.req.url).protocol === 'https:'
}

export function getRefreshTokenCookie(c: Context): string | undefined {
  return getCookie(c, REFRESH_TOKEN_COOKIE_NAME)
}

export function setRefreshTokenCookie(c: Context, refreshToken: string): void {
  setCookie(c, REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: isSecureRequest(c),
    path: '/',
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
  })
}

export function clearRefreshTokenCookie(c: Context): void {
  deleteCookie(c, REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: isSecureRequest(c),
    path: '/',
  })
}
