/**
 * Type declarations for openbadges-ui package
 *
 * These declarations augment the package types because the published
 * .d.ts files use unresolved path aliases (@components/, @composables/, etc.)
 * See: https://github.com/rollercoaster-dev/monorepo/issues/224
 */
declare module 'openbadges-ui' {
  import type { Component } from 'vue'

  // Badge components
  export const BadgeDisplay: Component
  export const BadgeList: Component
  export const BadgeClassCard: Component
  export const BadgeClassList: Component
  export const ProfileViewer: Component
  export const BadgeVerification: Component

  // Issuer components
  export const IssuerCard: Component
  export const IssuerList: Component

  // Issuing components
  export const BadgeIssuerForm: Component
  export const IssuerDashboard: Component

  // Services
  export class BadgeService {
    static instance: BadgeService
    getBadge(id: string): Promise<unknown>
    listBadges(): Promise<unknown[]>
  }

  export class BadgeVerificationService {
    static instance: BadgeVerificationService
    verify(assertion: unknown): Promise<unknown>
  }

  // Plugin
  export const OpenBadgesUIPlugin: {
    install: (app: unknown) => void
  }

  // Re-export types from openbadges-types
  export * from 'openbadges-types'
}
