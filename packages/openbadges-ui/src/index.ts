// src/index.ts
// Main entry point for the library

// Import core styles (themes and accessibility) so consumers get defaults
import "./styles";

// Export types
export * from "@/types";

// Export composables
export * from "@composables/useBadgeIssuer";
export * from "@composables/useBadges";
export * from "@composables/useProfile";
export * from "@composables/useBadgeVerification";

// Export components - Badge Display & Verification
export { default as BadgeDisplay } from "@components/badges/BadgeDisplay.vue";
export { default as BadgeList } from "@components/badges/BadgeList.vue";
export { default as ProfileViewer } from "@components/badges/ProfileViewer.vue";
export { default as BadgeVerification } from "@components/badges/BadgeVerification.vue";

// Export components - Badge Class (definitions)
export { default as BadgeClassCard } from "@components/badges/BadgeClassCard.vue";
export { default as BadgeClassList } from "@components/badges/BadgeClassList.vue";

// Export components - Issuers
export { default as IssuerCard } from "@components/issuers/IssuerCard.vue";
export { default as IssuerList } from "@components/issuers/IssuerList.vue";

// Export components - Issuing
export { default as BadgeIssuerForm } from "@components/issuing/BadgeIssuerForm.vue";
export { default as IssuerDashboard } from "@components/issuing/IssuerDashboard.vue";

// Export components - Accessibility
export { default as AccessibilitySettings } from "@components/accessibility/AccessibilitySettings.vue";
export { default as ThemeSelector } from "@components/accessibility/ThemeSelector.vue";
export { default as FontSelector } from "@components/accessibility/FontSelector.vue";

// Export services
export { BadgeService } from "@services/BadgeService";
export { BadgeVerificationService } from "@services/BadgeVerificationService";
export { AccessibilityService } from "@services/AccessibilityService";

// Export utility functions
export {
  typeIncludes,
  validateOB3Context,
  isOB2Assertion,
  isOB3VerifiableCredential,
  createIRI,
  createDateTime,
  OB2Guards,
  OB3Guards,
} from "@/utils/type-helpers";

// Export plugin for Vue.use()
export { default as OpenBadgesUIPlugin } from "./plugin";
