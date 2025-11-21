declare module 'openbadges-ui' {
  import type { Component } from 'vue'

  export const BadgeList: Component
  export const BadgeDisplay: Component
  export const BadgeIssuerForm: Component
  export const ProfileViewer: Component
  export const BadgeVerification: Component
  export const IssuerDashboard: Component

  export function renderBadge(badge: unknown, options?: unknown): unknown
  export function validateBadge(badge: unknown): unknown

  const _default: unknown
  export default _default
}
