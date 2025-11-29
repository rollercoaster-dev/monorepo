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

// Export services
export { BadgeService } from "@services/BadgeService";
export { BadgeVerificationService } from "@services/BadgeVerificationService";

// Export plugin for Vue.use()
export { default as OpenBadgesUIPlugin } from "./plugin";
