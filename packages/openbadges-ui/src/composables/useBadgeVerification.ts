// src/composables/useBadgeVerification.ts
import { ref, computed } from "vue";
import type { Ref, ComputedRef } from "vue";
import type { OB2, OB3 } from "@/types";
import {
  BadgeVerificationService,
  type VerificationResult,
} from "@services/BadgeVerificationService";

/**
 * State for badge verification
 */
export interface BadgeVerificationState {
  isVerifying: boolean;
  lastVerified: Date | null;
  result: VerificationResult | null;
  badge: OB2.Assertion | OB3.VerifiableCredential | null;
}

interface UseBadgeVerificationReturn {
  state: Ref<BadgeVerificationState>;
  isValid: ComputedRef<boolean>;
  errors: ComputedRef<string[]>;
  warnings: ComputedRef<string[]>;
  verificationMethod: ComputedRef<string | undefined>;
  expirationStatus: ComputedRef<string | undefined>;
  revocationStatus: ComputedRef<string | undefined>;
  hasBeenVerified: ComputedRef<boolean>;
  verifyBadge: (
    badge: OB2.Assertion | OB3.VerifiableCredential,
  ) => Promise<VerificationResult>;
  clearVerification: () => void;
}

/**
 * Composable for badge verification functionality
 * Provides reactive state and methods for verifying badges
 */
export function useBadgeVerification(): UseBadgeVerificationReturn {
  // Initialize state
  const state = ref<BadgeVerificationState>({
    isVerifying: false,
    lastVerified: null,
    result: null,
    badge: null,
  });

  // Computed properties
  const isValid = computed(() => state.value.result?.isValid ?? false);
  const errors = computed(() => state.value.result?.errors ?? []);
  const warnings = computed(() => state.value.result?.warnings ?? []);
  const verificationMethod = computed(
    () => state.value.result?.verificationMethod,
  );
  const expirationStatus = computed(() => state.value.result?.expirationStatus);
  const revocationStatus = computed(() => state.value.result?.revocationStatus);
  const hasBeenVerified = computed(() => state.value.lastVerified !== null);

  /**
   * Verifies a badge
   * @param badge The badge to verify
   * @returns Verification result
   */
  const verifyBadge = async (
    badge: OB2.Assertion | OB3.VerifiableCredential,
  ): Promise<VerificationResult> => {
    state.value.isVerifying = true;
    state.value.badge = badge;

    try {
      const result = await BadgeVerificationService.verifyBadge(badge);
      state.value.result = result;
      state.value.lastVerified = new Date();
      return result;
    } catch (error) {
      const errorMessage = `Verification failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
      const errorResult: VerificationResult = {
        isValid: false,
        errors: [errorMessage],
        warnings: [],
        structureValidation: {
          isValid: false,
          errors: [errorMessage],
          warnings: [],
        },
        contentValidation: {
          isValid: false,
          errors: [errorMessage],
          warnings: [],
        },
      };
      state.value.result = errorResult;
      state.value.lastVerified = new Date(); // Mark as verified even on error so UI shows the error state
      return errorResult;
    } finally {
      state.value.isVerifying = false;
    }
  };

  /**
   * Clears the verification state
   */
  const clearVerification = () => {
    state.value = {
      isVerifying: false,
      lastVerified: null,
      result: null,
      badge: null,
    };
  };

  return {
    // State
    state,

    // Computed
    isValid,
    errors,
    warnings,
    verificationMethod,
    expirationStatus,
    revocationStatus,
    hasBeenVerified,

    // Methods
    verifyBadge,
    clearVerification,
  };
}
